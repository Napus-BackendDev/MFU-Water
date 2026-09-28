import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import { requestContactRemoval, saveSampleToSupabase } from '../../lib/supabase';
import { ARSENIC_LEVELS, parseCoordinate } from '../../data/waterWatchData';
import { compressEvidencePhoto } from '../../lib/evidencePhotos';

export { ARSENIC_LEVELS };

export default function WaterWatchForm({
  onCancel,
  onSubmitSuccess,
  onPendingAttemptChange
}) {
  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
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
  const [removalSampleCode, setRemovalSampleCode] = useState('');
  const [removalReason, setRemovalReason] = useState('');
  const [removalStatus, setRemovalStatus] = useState('');
  const idempotencyKey = useRef('');
  const pendingAttempt = useRef(null);
  const submitting = useRef(false);
  const [retryPending, setRetryPending] = useState(false);
  const formLocked = isSubmitting || retryPending;
  useEffect(() => () => { if (photo1?.url) URL.revokeObjectURL(photo1.url); }, [photo1]);
  useEffect(() => () => { if (photo2?.url) URL.revokeObjectURL(photo2.url); }, [photo2]);

  // GPS Handler
  const handleGetLiveGPS = () => {
    if (submitting.current || pendingAttempt.current) return;
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณาระบุพิกัดในช่องละติจูดและลองจิจูด');
      return;
    }
    setIsGettingGps(true);
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        if (submitting.current || pendingAttempt.current) return;
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
    if (submitting.current || pendingAttempt.current) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพใหญ่เกิน 10MB กรุณาเลือกภาพที่มีขนาดเล็กลง');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('รองรับเฉพาะภาพ JPEG, PNG หรือ WebP');
      return;
    }
    const photoObj = {
      id: 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
      url: URL.createObjectURL(file),
      rawFile: file
    };
    if (slot === 1) setPhoto1(photoObj);
    else setPhoto2(photoObj);
  };

  const removePhoto = (slot) => {
    if (submitting.current || pendingAttempt.current) return;
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
    if (submitting.current) return;
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

    submitting.current = true;
    setIsSubmitting(true);

    try {
      const photos = [photo1, photo2].filter(Boolean);
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      const locationLabel = `พิกัด [${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}]`;

      const newRecord = {
        schema_version: '2.0',
        station_id: 'COORDINATE-POINT',
        station_name: locationLabel,
        coordinates: [parsedLng, parsedLat],
        gps_coordinates: [parsedLng, parsedLat],
        is_off_station: true,
        collection_time: new Date().toISOString(),
        gps_accuracy_meters: gpsAccuracy || 5.0,
        entry_type: 'realtime',
        collector: { name: fullName.trim(), phone: phone.trim() },
        sample_nature: {
          water_source: `จุดตรวจวัดพิกัดริมแม่น้ำกก (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`,
          water_appearance: ''
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
        images: []
      };

      if (!pendingAttempt.current) {
        const evidence = [];
        // Sequential processing avoids decoding both full-resolution photos together.
        for (const photo of photos) evidence.push(await compressEvidencePhoto(photo.rawFile));
        pendingAttempt.current = { record: newRecord, evidence, key: idempotencyKey.current };
        onPendingAttemptChange?.(true);
      }
      // An ambiguous network failure must retry the exact same payload and key.
      const attempt = pendingAttempt.current;
      const result = await saveSampleToSupabase(attempt.record, attempt.evidence, attempt.key);
      idempotencyKey.current = '';
      pendingAttempt.current = null;
      onPendingAttemptChange?.(false);
      setRetryPending(false);

      setIsSubmitting(false);

      if (onSubmitSuccess) {
        onSubmitSuccess({ ...attempt.record, sample_code: result.data.sample_code, publication_status: result.data.status });
      }
      setFullName('');
      setPhone('');
    } catch (err) {
      console.error('Error submitting water watch form:', err);
      setIsSubmitting(false);
      setRetryPending(Boolean(pendingAttempt.current));
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      submitting.current = false;
    }
  };

  const handleContactRemovalRequest = async () => {
    setRemovalStatus('');
    try {
      await requestContactRemoval({ sampleCode: removalSampleCode.trim(), reason: removalReason.trim() });
      setRemovalStatus('ส่งคำขอแล้ว แอดมินจะตรวจและลบเฉพาะข้อมูลติดต่อ โดยไม่ลบผลตรวจ');
      setRemovalSampleCode('');
      setRemovalReason('');
    } catch (error) {
      setRemovalStatus(error.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่');
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
        {retryPending && <p role="status" className="text-xs text-amber-800">ยังยืนยันผลการส่งไม่ได้ กดส่งข้อมูลเดิมอีกครั้ง ข้อมูลและรูปถูกล็อกเพื่อป้องกันการส่งซ้ำคนละรายการ ปิดไว้ก่อนแล้วเปิดฟอร์มใหม่ในหน้าเดิมได้ ข้อมูลยังอยู่ในหน่วยความจำ กรุณาอย่ารีเฟรชหรือเปลี่ยนหน้าจนยืนยันผลสำเร็จ</p>}

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
              disabled={formLocked}
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
              disabled={formLocked}
              placeholder="เช่น 08X-XXX-XXXX"
              className="w-full text-xs sm:text-sm h-11 sm:h-12 px-3.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-2 focus:ring-[#A6192E]/20 bg-white text-slate-800 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100 font-medium font-mono"
            />
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-[11px] leading-relaxed text-slate-600">
          <p>การกรอกชื่อและเบอร์เป็นทางเลือก ข้อมูลติดต่อแยกเก็บและไม่แสดงต่อสาธารณะ โดยเก็บไว้ไม่มีกำหนดในรุ่นนี้ รูปอาจมีใบหน้าหรือข้อมูลส่วนบุคคล โปรดตรวจภาพก่อนแนบ ระบบลบ metadata/EXIF และชื่อไฟล์ต้นฉบับ</p>
          <details className="pt-1">
            <summary className="cursor-pointer font-semibold text-slate-700">ขอลบข้อมูลติดต่อที่เคยส่ง</summary>
            <div className="mt-2 grid gap-2">
              <input value={removalSampleCode} onChange={event => setRemovalSampleCode(event.target.value)} maxLength={80} placeholder="รหัสตัวอย่าง" aria-label="รหัสตัวอย่างสำหรับคำขอลบข้อมูลติดต่อ" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs" />
              <textarea value={removalReason} onChange={event => setRemovalReason(event.target.value)} maxLength={500} placeholder="เหตุผล (อย่าใส่ชื่อ เบอร์ หรือข้อมูลส่วนตัว)" aria-label="เหตุผลขอลบข้อมูลติดต่อ" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs" rows={2} />
              <button type="button" onClick={handleContactRemovalRequest} disabled={!removalSampleCode.trim() || removalReason.trim().length < 3} className="justify-self-start rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">ส่งคำขอลบเฉพาะข้อมูลติดต่อ</button>
              {removalStatus && <p role="status" className="text-xs">{removalStatus}</p>}
            </div>
          </details>
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
                  disabled={formLocked}
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
            disabled={isGettingGps || formLocked}
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
                disabled={formLocked}
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
                disabled={formLocked}
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

          <p className="text-xs text-slate-500">ระบบลดขนาดรูปก่อนส่งเป็น JPEG ไม่เกิน 1.5 MiB ต่อรูป ด้านยาวไม่เกิน 2,048 px รูปที่ส่งอาจมีคุณภาพลดลง ภาพตัวอย่างเป็นรูปต้นฉบับ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Slot 1: แถบเทียบสีผลตรวจ */}
            <div className="relative">
              <div
                onClick={() => !formLocked && fileInputRef1.current?.click()}
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
                  disabled={formLocked}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                ref={fileInputRef1}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect(e, 1)}
                className="hidden"
              />
            </div>

            {/* Slot 2: สภาพแวดล้อม / จุดเก็บน้ำ */}
            <div className="relative">
              <div
                onClick={() => !formLocked && fileInputRef2.current?.click()}
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
                  disabled={formLocked}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <input
                ref={fileInputRef2}
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
            {retryPending ? 'ปิดไว้ก่อน' : 'ยกเลิก'}
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
                <span>กำลังลดขนาดรูปและส่งข้อมูล...</span>
              </>
            ) : (
              <span>{retryPending ? 'ลองส่งข้อมูลเดิมอีกครั้ง' : 'ส่งข้อมูลบันทึกผลการตรวจสอบ'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
