import React, { useState, useRef } from 'react';
import {
  MapPin,
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import { uploadSampleImage, saveSampleToSupabase } from '../../lib/supabase';
import { ARSENIC_LEVELS, parseCoordinate } from '../../data/waterWatchData';

export { ARSENIC_LEVELS };

export default function WaterWatchForm({
  onCancel,
  onSubmitSuccess
}) {
  // Local Storage pre-fill for collector information
  const [collectorInfo] = useState(() => {
    let saved = {
      name: '',
      phone: '',
      org: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.',
      id: `VOL-${Math.floor(1000 + Math.random() * 9000)}`
    };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('kok_saved_collector');
        if (raw) saved = { ...saved, ...JSON.parse(raw) };
      } catch (e) {}
    }
    return saved;
  });

  // Form Fields State
  const [fullName, setFullName] = useState(collectorInfo.name || '');
  const [phone, setPhone] = useState(collectorInfo.phone || '');
  const [selectedLevel, setSelectedLevel] = useState(null);

  // Location State
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Photos State (จำกัด 2 รูปตาม Mockup)
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // GPS Handler
  const handleGetLiveGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณาระบุพิกัดในช่องละติจูดและลองจิจูด');
      return;
    }
    setIsGettingGps(true);
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy || 10);
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(acc);
      },
      (err) => {
        setIsGettingGps(false);
        console.warn('Geolocation error:', err);
        alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ หรือกรอกพิกัดด้วยตนเอง');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Photo handlers
  const handleFileSelect = (e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพใหญ่เกิน 10MB กรุณาเลือกภาพที่มีขนาดเล็กลง');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const photoObj = {
        id: 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        url: reader.result,
        rawFile: file
      };
      if (slot === 1) setPhoto1(photoObj);
      else setPhoto2(photoObj);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (slot) => {
    if (slot === 1) {
      setPhoto1(null);
      if (fileInputRef1.current) fileInputRef1.current.value = '';
    } else {
      setPhoto2(null);
      if (fileInputRef2.current) fileInputRef2.current.value = '';
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    setErrorMessage('');

    // Validation 1: Arsenic Level is required
    if (!selectedLevel) {
      setErrorMessage('โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level)');
      return;
    }

    // Validation 2: Coordinates required and must be valid numbers
    const parsedLat = parseCoordinate(latitude);
    const parsedLng = parseCoordinate(longitude);

    if (
      latitude === '' ||
      longitude === '' ||
      latitude === null ||
      longitude === null ||
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setErrorMessage('กรุณาระบุพิกัดที่ตั้ง (ละติจูดและลองจิจูด) ให้ถูกต้อง โดยกดปุ่มดึงพิกัด GPS หรือพิมพ์ตัวเลขพิกัด');
      return;
    }

    setIsSubmitting(true);

    try {
      const sampleCode = `KOK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const recordId = 'rec-' + Date.now();

      // บันทึกข้อมูลผู้เก็บตัวอย่างลง LocalStorage
      try {
        localStorage.setItem(
          'kok_saved_collector',
          JSON.stringify({
            name: fullName.trim(),
            phone: phone.trim(),
            org: 'ประชาชนทั่วไป',
            id: collectorInfo.id
          })
        );
      } catch (e) {}

      // Stage 1: Upload images (รองรับ Supabase Storage พร้อม fallback Base64 อัตโนมัติ)
      const photos = [photo1, photo2].filter(Boolean);
      const uploadedImages = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoTitle = i === 0 ? 'แถบเทียบสีผลตรวจ' : 'สภาพแวดล้อม/จุดเก็บน้ำ';
        if (photo.rawFile) {
          const uploadRes = await uploadSampleImage(photo.rawFile, sampleCode, i);
          uploadedImages.push({
            id: uploadRes.id,
            title: photoTitle,
            url: uploadRes.url,
            drive_file_id: uploadRes.path || `SP_${sampleCode}_${i + 1}`,
            size_kb: uploadRes.size_kb,
            storage_type: uploadRes.storage_type
          });
        } else if (photo.url) {
          uploadedImages.push({
            id: photo.id,
            title: photoTitle,
            url: photo.url,
            drive_file_id: `LOCAL_${sampleCode}_${i + 1}`,
            size_kb: photo.sizeKb || 0
          });
        }
      }

      // Stage 2: Coordinate & Location naming
      const locationLabel = `พิกัด [${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}]`;

      const newRecord = {
        record_id: recordId,
        sample_code: sampleCode,
        schema_version: '2.0',
        station_id: 'COORDINATE-POINT',
        station_name: locationLabel,
        coordinates: [parsedLng, parsedLat],
        gps_coordinates: [parsedLng, parsedLat],
        is_off_station: true,
        collection_time: new Date().toISOString(),
        gps_accuracy_meters: gpsAccuracy || 5.0,
        entry_type: 'realtime',
        collector: {
          id: collectorInfo.id,
          name: fullName.trim() || 'ผู้ตรวจวัดภาคสนาม',
          phone: phone.trim() || '-',
          organization: 'ประชาชนทั่วไป',
          notes: ''
        },
        sample_nature: {
          water_source: `จุดตรวจวัดพิกัดริมแม่น้ำกก (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`,
          notes: `บันทึกผ่านแถบเทียบสีระดับ ${selectedLevel.level} (${selectedLevel.label} - ${selectedLevel.desc})`
        },
        measurements: {
          arsenic: {
            value: selectedLevel.ppb,
            unit: 'ppb',
            status: selectedLevel.ppb > 10 ? 'danger' : selectedLevel.ppb >= 5 ? 'watch' : 'normal',
            method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
            instrument: `แถบเทียบสีระดับ ${selectedLevel.level} (${selectedLevel.label})`,
            level: selectedLevel.level,
            label: selectedLevel.label,
            desc: selectedLevel.desc,
            color: selectedLevel.color
          },
          ph: {
            value: null,
            status: 'normal',
            method: null,
            instrument: null
          },
          turbidity: {
            value: null,
            unit: 'NTU',
            status: 'normal',
            method: null,
            instrument: null
          },
          temperature: {
            value: null,
            unit: '°C',
            status: 'normal',
            method: null,
            instrument: null
          }
        },
        images: uploadedImages,
        status: 'COMPLETED',
        sync_stage: 'INDEXED'
      };

      // บันทึกลง Supabase Database (ถ้ามีการตั้งค่า)
      try {
        await saveSampleToSupabase(newRecord);
      } catch (spErr) {
        console.warn('Supabase save warning (fallback to local):', spErr);
      }

      setIsSubmitting(false);

      if (onSubmitSuccess) {
        onSubmitSuccess(newRecord);
      }
    } catch (err) {
      console.error('Error submitting water watch form:', err);
      setIsSubmitting(false);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-[680px] sm:max-w-2xl lg:max-w-3xl mx-auto relative flex flex-col max-h-[92vh] overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 shrink-0 bg-[#F8F7F5]">
        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="text-xl">📝</span>
          <span>บันทึกผลการตรวจสอบคุณภาพน้ำ</span>
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          title="ปิดแบบฟอร์ม"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content - Spacious, Large Fonts for Elderly Volunteers */}
      <div className="p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5 overflow-y-auto">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 1 & 2. ชื่อและเบอร์โทร (Grid 2 คอลัมน์) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-bold text-slate-800">
              ชื่อ-นามสกุล / Name:
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              placeholder="ระบุชื่อ-นามสกุล"
              className="w-full text-xs sm:text-sm h-11 sm:h-12 px-3.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100 font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs sm:text-sm font-bold text-slate-800">
              เบอร์โทรศัพท์ / Phone:
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              placeholder="เช่น 08X-XXX-XXXX"
              className="w-full text-xs sm:text-sm h-11 sm:h-12 px-3.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100 font-medium font-mono"
            />
          </div>
        </div>

        {/* 3. Arsenic Level (9 ระดับสี สวยงาม กดง่าย ไม่เบียด ไม่ซ้อนทับ) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>เลือกสีผลตรวจ (ระดับสารหนู)</span>
              <span className="text-red-500 font-semibold">*ต้องระบุ</span>
            </label>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
              หน่วย ppb
            </span>
          </div>

          <div className="grid grid-cols-9 gap-1 sm:gap-2">
            {ARSENIC_LEVELS.map((item) => {
              const isSelected = selectedLevel?.level === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedLevel(item)}
                  className={`p-1 sm:p-1.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer h-[70px] sm:h-[82px] select-none ${
                    isSelected
                      ? 'border-[#A6192E] bg-red-50/95 ring-2 ring-[#A6192E]/50 shadow-md scale-[1.03] z-10'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-black text-slate-800 leading-none">
                    {item.level}
                  </span>
                  <span
                    className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full border shadow-xs my-0.5 shrink-0 flex items-center justify-center transition-transform ${
                      isSelected ? 'ring-2 ring-[#A6192E]' : ''
                    }`}
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.borderColor
                    }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] ${
                          item.level >= 6 ? 'text-white' : 'text-slate-800'
                        }`}
                      />
                    )}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-none truncate max-w-full">
                    {item.ppb}
                    <span className="hidden sm:inline text-[9px] font-normal text-slate-400 ml-0.5">ppb</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* สรุปสถานะผลตรวจที่เลือก (อ่านง่าย ชัดเจน ไม่ต้องเพ่ง) */}
          {selectedLevel ? (
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border shadow-xs shrink-0"
                  style={{ backgroundColor: selectedLevel.color, borderColor: selectedLevel.borderColor }}
                />
                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  ระดับ {selectedLevel.level} • {selectedLevel.ppb} ppb ({selectedLevel.desc})
                </div>
              </div>
              <div>
                {selectedLevel.ppb < 5 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                    ปกติ (&lt; 5 ppb) ไม่ยืนยันว่าน้ำดื่มได้
                  </span>
                ) : selectedLevel.ppb <= 10 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                    เฝ้าระวัง (5-10 ppb)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                    เกินเกณฑ์ (&gt; 10 ppb)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] sm:text-xs text-slate-400 text-center py-0.5">
              แตะเลือกระดับสี 1-9 ตามแถบสีของชุดทดสอบภาคสนาม
            </div>
          )}
        </div>

        {/* 4. Location Section (ดึงพิกัด + ช่องละติจูด/ลองจิจูด แยกเป็น 2 แถว กว้าง โปร่ง อ่านง่าย) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>ระบุพิกัดที่ตั้ง (Location)</span>
              <span className="text-red-500 font-semibold">*ต้องระบุ</span>
            </label>
            {gpsAccuracy && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono border border-emerald-200">
                ความแม่นยำ: ±{gpsAccuracy} ม.
              </span>
            )}
          </div>

          {/* แถวที่ 1: ปุ่มแตะดึง GPS แบบเต็มความกว้าง (Full Width) */}
          <button
            type="button"
            onClick={handleGetLiveGPS}
            disabled={isGettingGps || isSubmitting}
            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-gradient-to-r from-[#E59832] to-[#DF8A20] hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            <MapPin className={`w-4 h-4 shrink-0 ${isGettingGps ? 'animate-bounce' : ''}`} />
            <span>
              {isGettingGps ? 'กำลังดึงพิกัด GPS จากอุปกรณ์...' : '📍 แตะเพื่อดึงพิกัด GPS อัตโนมัติ ณ จุดตรวจวัด'}
            </span>
          </button>

          {/* แถวที่ 2: ช่องกรอกละติจูดและลองจิจูดแบบ 2 คอลัมน์เต็มพื้นที่ ไม่ถูกบีบอัด */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 block">
                ละติจูด (Latitude)
              </span>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                disabled={isSubmitting}
                placeholder="เช่น 19.910482"
                className="w-full h-11 bg-[#F8F9FA] border border-slate-300 rounded-xl px-3 text-center text-xs sm:text-sm font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 outline-none transition-all disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 block">
                ลองจิจูด (Longitude)
              </span>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                disabled={isSubmitting}
                placeholder="เช่น 99.840517"
                className="w-full h-11 bg-[#F8F9FA] border border-slate-300 rounded-xl px-3 text-center text-xs sm:text-sm font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 outline-none transition-all disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* 5. แนบรูปถ่ายหลักฐานยืนยันผลตรวจ (ไม่แสดงคำว่า ภาพที่ 1 / ภาพที่ 2) */}
        <div className="bg-[#F8F9FA] rounded-2xl border border-slate-200/90 p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-600" />
              <span>แนบรูปถ่ายหลักฐานผลตรวจ (2 ช่อง)</span>
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-normal">
              แถบสีตรวจ / จุดเก็บตัวอย่าง
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Slot 1: แถบเทียบสีผลตรวจ */}
            <div className="relative">
              <div
                onClick={() => !isSubmitting && fileInputRef1.current?.click()}
                className="border border-dashed border-slate-300 hover:border-[#A6192E] rounded-xl p-2.5 flex items-center justify-center h-20 sm:h-22 bg-white cursor-pointer transition-all hover:bg-slate-50 group overflow-hidden"
              >
                {photo1 ? (
                  <div className="relative w-full h-full flex items-center gap-3">
                    <img
                      src={photo1.url}
                      alt="แถบเทียบสีผลตรวจ"
                      className="w-16 sm:w-20 h-full object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">แถบเทียบสีผลตรวจ</div>
                      <div className="text-[11px] text-slate-400 truncate">แตะเพื่อเปลี่ยนรูป</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-[#A6192E] transition-colors">
                    <Camera className="w-6 h-6 shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="text-xs sm:text-sm font-bold text-slate-700 block">แถบเทียบสีผลตรวจ</span>
                      <span className="text-[11px] text-slate-400 block">Arsenic Strip เทียบกับแถบสี</span>
                    </div>
                  </div>
                )}
              </div>
              {photo1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(1);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer shadow-xs"
                  title="ลบรูปภาพนี้"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                ref={fileInputRef1}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 1)}
                className="hidden"
              />
            </div>

            {/* Slot 2: สภาพแวดล้อม / จุดเก็บน้ำ */}
            <div className="relative">
              <div
                onClick={() => !isSubmitting && fileInputRef2.current?.click()}
                className="border border-dashed border-slate-300 hover:border-[#A6192E] rounded-xl p-2.5 flex items-center justify-center h-20 sm:h-22 bg-white cursor-pointer transition-all hover:bg-slate-50 group overflow-hidden"
              >
                {photo2 ? (
                  <div className="relative w-full h-full flex items-center gap-3">
                    <img
                      src={photo2.url}
                      alt="สภาพแวดล้อม / จุดเก็บน้ำ"
                      className="w-16 sm:w-20 h-full object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">สภาพแวดล้อม / จุดเก็บน้ำ</div>
                      <div className="text-[11px] text-slate-400 truncate">แตะเพื่อเปลี่ยนรูป</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-slate-400 group-hover:text-[#A6192E] transition-colors">
                    <Camera className="w-6 h-6 shrink-0" />
                    <div className="text-left leading-tight">
                      <span className="text-xs sm:text-sm font-bold text-slate-700 block">สภาพแวดล้อม / จุดเก็บน้ำ</span>
                      <span className="text-[11px] text-slate-400 block">บริเวณริมน้ำหรือจุดเก็บตัวอย่าง</span>
                    </div>
                  </div>
                )}
              </div>
              {photo2 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(2);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer shadow-xs"
                  title="ลบรูปภาพนี้"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                ref={fileInputRef2}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 2)}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-28 sm:w-36 py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-5 rounded-xl bg-[#A6192E] hover:bg-[#851424] active:scale-[0.99] text-white font-bold text-xs sm:text-sm md:text-base shadow-lg shadow-[#A6192E]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งข้อมูล...</span>
              </>
            ) : (
              <span>ส่งข้อมูลบันทึกผลการตรวจสอบ</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
