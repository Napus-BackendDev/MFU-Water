import React, { useState, useRef } from 'react';
import {
  MapPin,
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import { WATER_WATCH_STATIONS, findNearestStation } from '../../data/waterWatchData';
import { uploadSampleImage, saveSampleToSupabase } from '../../lib/supabase';

// 9 ระดับสีสารหนู (Arsenic Level 1 - 9 ตามภาพอ้างอิงและมาตรฐานชุดตรวจสารหนู)
export const ARSENIC_LEVELS = [
  { level: 1, ppb: 0, label: '0 ppb', color: '#FBF9F2', borderColor: '#D1D5DB', desc: 'สีขาวครีม' },
  { level: 2, ppb: 5, label: '5 ppb', color: '#FEF3A9', borderColor: '#E5D66E', desc: 'สีเหลืองอ่อน' },
  { level: 3, ppb: 10, label: '10 ppb', color: '#F7E752', borderColor: '#DAC82A', desc: 'สีเหลืองมะนาว' },
  { level: 4, ppb: 30, label: '30 ppb', color: '#E8BE36', borderColor: '#C89F19', desc: 'สีเหลืองทอง' },
  { level: 5, ppb: 50, label: '50 ppb', color: '#DE9922', borderColor: '#B87A11', desc: 'สีเหลืองสด' },
  { level: 6, ppb: 100, label: '100 ppb', color: '#C07128', borderColor: '#9A5214', desc: 'สีน้ำตาลอ่อน/ส้ม' },
  { level: 7, ppb: 200, label: '200 ppb', color: '#974E22', borderColor: '#753713', desc: 'สีน้ำตาล' },
  { level: 8, ppb: 300, label: '300 ppb', color: '#683115', borderColor: '#4F210A', desc: 'สีน้ำตาลเข้ม' },
  { level: 9, ppb: 500, label: '500 ppb', color: '#31170D', borderColor: '#1F0C06', desc: 'สีน้ำตาลไหม้/ดำ' },
];

export default function WaterWatchForm({
  onCancel,
  onSubmitSuccess,
  lockedStation = null,
  stations = WATER_WATCH_STATIONS
}) {
  const activeStations = stations && stations.length > 0 ? stations : WATER_WATCH_STATIONS;

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
  const [latitude, setLatitude] = useState(
    lockedStation?.coordinates?.[1] ? lockedStation.coordinates[1].toString() : ''
  );
  const [longitude, setLongitude] = useState(
    lockedStation?.coordinates?.[0] ? lockedStation.coordinates[0].toString() : ''
  );
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(lockedStation?.id || '');

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
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

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
            org: collectorInfo.org || 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.',
            id: collectorInfo.id
          })
        );
      } catch (e) {}

      // Stage 1: Upload images (รองรับ Supabase Storage พร้อม fallback Base64 อัตโนมัติ)
      const photos = [photo1, photo2].filter(Boolean);
      const uploadedImages = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.rawFile) {
          const uploadRes = await uploadSampleImage(photo.rawFile, sampleCode, i);
          uploadedImages.push({
            id: uploadRes.id,
            title: `ภาพที่ ${i + 1}`,
            url: uploadRes.url,
            drive_file_id: uploadRes.path || `SP_${sampleCode}_${i + 1}`,
            size_kb: uploadRes.size_kb,
            storage_type: uploadRes.storage_type
          });
        } else if (photo.url) {
          uploadedImages.push({
            id: photo.id,
            title: `ภาพที่ ${i + 1}`,
            url: photo.url,
            drive_file_id: `LOCAL_${sampleCode}_${i + 1}`,
            size_kb: photo.sizeKb || 0
          });
        }
      }

      // Stage 2: Station matching
      let targetStationId;
      let targetStationName;
      let isOffStation = true;

      if (lockedStation) {
        targetStationId = lockedStation.id;
        targetStationName = lockedStation.name;
        isOffStation = false;
      } else if (selectedStationId) {
        const matched = activeStations.find((s) => s.id === selectedStationId);
        targetStationId = matched ? matched.id : 'OFF-STATION';
        targetStationName = matched ? matched.name : 'จุดสำรวจภาคสนาม';
        isOffStation = !matched;
      } else {
        const nearest = findNearestStation(parsedLat, parsedLng, activeStations);
        if (nearest && nearest.distanceMeters && nearest.distanceMeters <= (nearest.radiusMeters || 300)) {
          targetStationId = nearest.id;
          targetStationName = nearest.name;
          isOffStation = false;
        } else {
          targetStationId = 'OFF-STATION';
          targetStationName = nearest ? `จุดตรวจใกล้ ${nearest.name}` : 'จุดสำรวจภาคสนาม (GPS)';
          isOffStation = true;
        }
      }

      const newRecord = {
        record_id: recordId,
        sample_code: sampleCode,
        schema_version: '1.0',
        station_id: targetStationId,
        station_name: targetStationName,
        coordinates: [parsedLng, parsedLat],
        gps_coordinates: [parsedLng, parsedLat],
        is_off_station: isOffStation,
        collection_time: new Date().toISOString(),
        gps_accuracy_meters: gpsAccuracy || 5.0,
        entry_type: 'realtime',
        collector: {
          id: collectorInfo.id,
          name: fullName.trim() || 'ผู้ตรวจวัดภาคสนาม',
          phone: phone.trim() || '-',
          organization: collectorInfo.org,
          notes: ''
        },
        sample_nature: {
          water_source: isOffStation ? 'จุดสำรวจภาคสนามริมแม่น้ำกก' : targetStationName,
          water_appearance: 'ปกติ',
          odor: 'ไม่พบกลิ่นผิดปกติ',
          rain_last_24h: 'ไม่มีฝนตก',
          notes: `บันทึกผ่านแถบเทียบสีระดับ ${selectedLevel.level} (${selectedLevel.label})`
        },
        measurements: {
          arsenic: {
            value: selectedLevel.ppb,
            unit: 'µg/L',
            status: selectedLevel.ppb > 20 ? 'danger' : selectedLevel.ppb > 10 ? 'watch' : 'normal',
            method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
            instrument: `แถบเทียบสีระดับ ${selectedLevel.level} (${selectedLevel.label})`,
            level: selectedLevel.level,
            color: selectedLevel.color
          },
          ph: {
            value: 7.2,
            status: 'normal',
            method: 'ค่ามาตรฐานภาคสนาม',
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
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg mx-auto relative flex flex-col max-h-[92vh] overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Close Button (X) */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer disabled:opacity-50"
        title="ปิดแบบฟอร์ม"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Scrollable Form Content */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
        {/* Title */}
        <div className="text-center pt-1 pb-0.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
            <span>📝</span>
            <span>บันทึกผลการตรวจสอบ</span>
          </h2>
          {lockedStation && (
            <p className="text-[11px] text-[#A6192E] font-medium mt-0.5">
              จุดตรวจ: {lockedStation.name}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. ชื่อ-นามสกุล / Full Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            ชื่อ-นามสกุล / Full Name:
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            placeholder="ระบุชื่อ-นามสกุลของคุณ"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100"
          />
        </div>

        {/* 2. เบอร์โทรศัพท์ / Phone Number */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            เบอร์โทรศัพท์ / Phone Number:
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
            placeholder="เช่น 08X-XXX-XXXX"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100"
          />
        </div>

        {/* 3. Arsenic Level (9 ระดับสีเรียงตามภาพอ้างอิง) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">
              โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level){' '}
              <span className="text-red-500 font-semibold">*ต้องระบุ:</span>
            </label>
            {selectedLevel && (
              <span className="text-[11px] font-bold text-[#A6192E] animate-in fade-in">
                (ระดับ {selectedLevel.level} - {selectedLevel.label})
              </span>
            )}
          </div>

          {/* 9 Colors Row */}
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="grid grid-cols-9 gap-1 sm:gap-1.5 min-w-[340px]">
              {ARSENIC_LEVELS.map((item) => {
                const isSelected = selectedLevel?.level === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedLevel(item)}
                    className={`p-1 sm:p-1.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[76px] sm:min-h-[82px] select-none ${
                      isSelected
                        ? 'border-[#A6192E] bg-red-50/80 ring-2 ring-[#A6192E]/30 shadow-xs scale-[1.02] z-10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700 leading-none">
                      {item.level}
                    </span>
                    <span
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border shadow-2xs my-1 shrink-0 flex items-center justify-center transition-transform ${
                        isSelected ? 'ring-2 ring-[#A6192E]' : ''
                      }`}
                      style={{
                        backgroundColor: item.color,
                        borderColor: item.borderColor
                      }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[3] ${
                            item.level >= 6 ? 'text-white' : 'text-slate-800'
                          }`}
                        />
                      )}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-medium text-slate-600 whitespace-nowrap leading-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Location Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            ระบุพิกัดที่ตั้ง (Location):{' '}
            <span className="text-red-500 font-semibold">*ต้องระบุพิกัดที่ตั้ง</span>
          </label>

          {/* Large GPS Button (สีส้ม/ทองตามภาพอ้างอิง) */}
          <button
            type="button"
            onClick={handleGetLiveGPS}
            disabled={isGettingGps || isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E59832] to-[#DF8A20] hover:brightness-105 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            <MapPin className={`w-4 h-4 ${isGettingGps ? 'animate-bounce' : ''}`} />
            <span>
              {isGettingGps ? 'กำลังดึงพิกัด GPS ปัจจุบัน...' : '📍 กดปุ่มเพื่อดึงพิกัด GPS ปัจจุบัน'}
            </span>
          </button>

          {/* Latitude & Longitude Input/Display Boxes */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                disabled={isSubmitting}
                placeholder="ละติจูด (ยังไม่ได้ระบุ)"
                className="w-full bg-[#F3F4F6] border border-slate-200/90 rounded-xl py-2 px-3 text-center text-xs font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:bg-white focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E]/20 outline-none transition-all disabled:opacity-60"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                disabled={isSubmitting}
                placeholder="ลองจิจูด (ยังไม่ได้ระบุ)"
                className="w-full bg-[#F3F4F6] border border-slate-200/90 rounded-xl py-2 px-3 text-center text-xs font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:bg-white focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E]/20 outline-none transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Station preset option & GPS accuracy info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5 flex-1 mr-2">
              <span className="shrink-0 text-slate-400">หรือเลือกสถานี:</span>
              <select
                value={selectedStationId}
                onChange={(e) => {
                  const stId = e.target.value;
                  setSelectedStationId(stId);
                  const st = activeStations.find((s) => s.id === stId);
                  if (st) {
                    setLatitude(st.coordinates[1].toFixed(6));
                    setLongitude(st.coordinates[0].toFixed(6));
                  }
                }}
                disabled={isSubmitting}
                className="text-[11px] py-0.5 px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 outline-none max-w-[210px] truncate cursor-pointer"
              >
                <option value="">-- พิกัดอิสระจาก GPS --</option>
                {activeStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    [{st.code}] {st.name}
                  </option>
                ))}
              </select>
            </div>
            {gpsAccuracy && (
              <span className="text-[10px] text-slate-400 shrink-0">
                ±{gpsAccuracy} ม.
              </span>
            )}
          </div>
        </div>

        {/* 5. แนบรูปถ่ายหลักฐานยืนยันผลตรวจ (2 รูปตาม Mockup) */}
        <div className="bg-[#F8F9FA] rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <span>📷</span>
            <span>แนบรูปถ่ายหลักฐานยืนยันผลตรวจ</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Slot 1: ภาพที่ 1 ในการ์ดสีขาวตาม Mockup */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-2">
              <div className="text-center text-xs text-slate-600 font-medium">ภาพที่ 1</div>
              <div
                onClick={() => !isSubmitting && fileInputRef1.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#A6192E] rounded-lg p-2.5 flex flex-col items-center justify-center min-h-[96px] bg-slate-50/50 cursor-pointer transition-all hover:bg-slate-50 relative group"
              >
                {photo1 ? (
                  <div className="relative w-full h-24">
                    <img
                      src={photo1.url}
                      alt="ภาพที่ 1"
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white text-[11px] font-medium">
                      คลิกเพื่อเปลี่ยนรูป
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-[#A6192E] transition-colors" />
                    <span className="text-[11px] text-slate-500 text-center mt-1.5 leading-tight">
                      คลิกเพื่อเลือกภาพหรือถ่ายรูป
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef1}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 1)}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(1)}
                disabled={isSubmitting}
                className="w-full text-center text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer pt-0.5 transition-colors disabled:opacity-50"
              >
                ลบรูปภาพนี้
              </button>
            </div>

            {/* Slot 2: ภาพที่ 2 ในการ์ดสีขาวตาม Mockup */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-2">
              <div className="text-center text-xs text-slate-600 font-medium">ภาพที่ 2</div>
              <div
                onClick={() => !isSubmitting && fileInputRef2.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#A6192E] rounded-lg p-2.5 flex flex-col items-center justify-center min-h-[96px] bg-slate-50/50 cursor-pointer transition-all hover:bg-slate-50 relative group"
              >
                {photo2 ? (
                  <div className="relative w-full h-24">
                    <img
                      src={photo2.url}
                      alt="ภาพที่ 2"
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white text-[11px] font-medium">
                      คลิกเพื่อเปลี่ยนรูป
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-[#A6192E] transition-colors" />
                    <span className="text-[11px] text-slate-500 text-center mt-1.5 leading-tight">
                      คลิกเพื่อเลือกภาพหรือถ่ายรูป
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 2)}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(2)}
                disabled={isSubmitting}
                className="w-full text-center text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer pt-0.5 transition-colors disabled:opacity-50"
              >
                ลบรูปภาพนี้
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-32 sm:w-36 py-2.5 px-4 rounded-xl bg-[#8E9CAE] hover:bg-slate-500 active:scale-[0.99] text-white font-semibold text-sm transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-6 rounded-xl bg-[#A6192E] hover:bg-[#851424] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#A6192E]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งข้อมูลบันทึก...</span>
              </>
            ) : (
              <span>ส่งข้อมูลบันทึก</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
