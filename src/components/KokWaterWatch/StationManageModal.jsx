import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Cpu,
  Droplets,
  Save,
  Trash2,
  Crosshair,
  Compass,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function StationManageModal({
  isOpen,
  station = null, // If null, mode is 'add', otherwise 'edit'
  onClose,
  onSave,
  onDelete,
  onStartPickOnMap,
  pickedCoords = null
}) {
  const isEditMode = !!station;

  // Presets พิกัดสำคัญริมแม่น้ำกก อ.แม่อาย จ.เชียงใหม่
  const KOK_PRESETS = [
    { name: 'สะพานท่าตอน (จุดศูนย์กลาง)', lat: 20.0610, lng: 99.3615 },
    { name: 'ต้นน้ำกกเหนือสะพาน', lat: 20.0655, lng: 99.3585 },
    { name: 'จุดโค้งน้ำท่าตอน (สูบน้ำชลประทาน)', lat: 20.0535, lng: 99.3850 },
    { name: 'ตลิ่งบ้านร่มเย็น', lat: 20.0450, lng: 99.4050 },
    { name: 'บ้านใหม่หมอกจ๋าม (ปลายน้ำ)', lat: 20.0320, lng: 99.4350 }
  ];

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    stationType: 'pump', // 'pump' | 'sensor' | 'monitoring'
    latitude: '20.0600',
    longitude: '99.3650',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    deviceCode: '',
    deviceModel: '',
    deviceSerial: '',
    lastCalibrated: new Date().toISOString().slice(0, 10),
    description: '',
    status: 'active'
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState('');

  // ซิงค์ข้อมูลฟอร์มเมื่อเปิด Modal หรือเมื่อเลือกสถานี
  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        code: station.code || station.id || '',
        stationType: station.stationType || (station.name?.includes('สูบ') || station.name?.includes('ดูด') ? 'pump' : 'sensor'),
        latitude: station.coordinates?.[1] ? String(station.coordinates[1]) : '20.0600',
        longitude: station.coordinates?.[0] ? String(station.coordinates[0]) : '99.3650',
        subdistrict: station.subdistrict || 'ตำบลท่าตอน',
        district: station.district || 'อำเภอแม่อาย',
        province: station.province || 'เชียงใหม่',
        deviceCode: station.device?.code || '',
        deviceModel: station.device?.model || (station.stationType === 'pump' ? 'เครื่องดูดน้ำเพื่อการชลประทาน 15HP' : 'IoT Water Quality Node'),
        deviceSerial: station.device?.serial || '',
        lastCalibrated: station.device?.lastCalibrated || new Date().toISOString().slice(0, 10),
        description: station.description || '',
        status: station.status || 'active'
      });
    } else {
      // โหมดเพิ่มสถานีใหม่
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setFormData({
        name: 'สถานีจุดตั้งเครื่องดูดน้ำท่าตอน',
        code: `PUMP-0${Math.floor(1 + Math.random() * 9)}`,
        stationType: 'pump',
        latitude: '20.0590',
        longitude: '99.3680',
        subdistrict: 'ตำบลท่าตอน',
        district: 'อำเภอแม่อาย',
        province: 'เชียงใหม่',
        deviceCode: `PUMP-DEV-${randomSuffix}`,
        deviceModel: 'เครื่องดูดน้ำพลังงานไฟฟ้า/ดีเซล 15HP',
        deviceSerial: `SN-2026-P${randomSuffix}`,
        lastCalibrated: new Date().toISOString().slice(0, 10),
        description: 'จุดตั้งเครื่องดูดน้ำเพื่อการเกษตรและการเฝ้าระวังคุณภาพน้ำริมแม่น้ำกก',
        status: 'active'
      });
    }
    setErrorMsg('');
    setGpsSuccessMsg('');
  }, [station, isOpen]);

  // ซิงค์พิกัดเมื่อกลับมาจากการจิ้มเลือกบนแผนที่
  useEffect(() => {
    if (pickedCoords && Array.isArray(pickedCoords) && pickedCoords.length === 2) {
      setFormData(prev => ({
        ...prev,
        longitude: Number(pickedCoords[0]).toFixed(6),
        latitude: Number(pickedCoords[1]).toFixed(6)
      }));
      setGpsSuccessMsg(`📍 อัปเดตพิกัดจากแผนที่สำเร็จ: ${Number(pickedCoords[1]).toFixed(4)}, ${Number(pickedCoords[0]).toFixed(4)}`);
    }
  }, [pickedCoords]);

  if (!isOpen) return null;

  // ฟังก์ชันดึงพิกัดจาก GPS ในอุปกรณ์จริง
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingGps(true);
    setErrorMsg('');
    setGpsSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6)
        }));
        setGpsSuccessMsg(`ดึงพิกัด GPS สำเร็จ (ความแม่นยำ ±${pos.coords.accuracy.toFixed(1)} ม.)`);
      },
      (err) => {
        setIsGettingGps(false);
        setErrorMsg(`ไม่สามารถดึง GPS ได้: ${err.message || 'โปรดตรวจสอบการอนุญาตเข้าถึงตำแหน่ง'}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ตรวจสอบความถูกต้องและบันทึก
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('กรุณากรอกพิกัดละติจูดและลองจิจูดให้ถูกต้อง');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('พิกัดอยู่นอกช่วงพิกัดทางภูมิศาสตร์ที่ถูกต้อง');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg('กรุณาระบุชื่อสถานี / จุดตั้งเครื่อง');
      return;
    }

    const stationPayload = {
      ...(station || {}),
      id: station ? station.id : `ST-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      code: formData.code.trim() || `KM-${Math.floor(10 + Math.random() * 90)}`,
      stationType: formData.stationType,
      coordinates: [lng, lat],
      subdistrict: formData.subdistrict.trim(),
      district: formData.district.trim(),
      province: formData.province.trim(),
      description: formData.description.trim(),
      status: formData.status,
      image: station?.image || (formData.stationType === 'pump' 
        ? 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80'),
      device: {
        ...(station?.device || {}),
        code: formData.deviceCode.trim() || `DEV-${formData.code}`,
        model: formData.deviceModel.trim() || 'เครื่องดูดน้ำ / ตรวจวัดประจำจุด',
        serial: formData.deviceSerial.trim() || `SN-${new Date().getFullYear()}`,
        lastCalibrated: formData.lastCalibrated,
        type: formData.stationType
      }
    };

    onSave(stationPayload);
    onClose();
  };

  const handleDelete = () => {
    if (!station) return;
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบจุดตั้งเครื่อง "${station.name}" (${station.code}) ออกจากระบบ?`)) {
      onDelete(station.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#A6192E] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              {formData.stationType === 'pump' ? (
                <Droplets className="w-5 h-5" />
              ) : (
                <Cpu className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                {isEditMode ? 'แก้ไขพิกัดและข้อมูลจุดตั้งเครื่อง' : 'เพิ่มจุดตั้งเครื่องดูดน้ำ / ตรวจวัดใหม่'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {isEditMode ? formData.name || 'แก้ไขข้อมูลสถานี' : 'กำหนดพิกัดและรายละเอียดจุดตั้งเครื่อง'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {gpsSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gpsSuccessMsg}</span>
            </div>
          )}

          {/* 1. ประเภทจุดตั้งเครื่อง */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ประเภทจุดติดตั้งเครื่อง <span className="text-[#A6192E]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stationType: 'pump' })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  formData.stationType === 'pump'
                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/30 text-sky-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span className="text-xs">เครื่องดูดน้ำ / สูบน้ำ</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">จุดสูบน้ำชุมชน / การเกษตร</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, stationType: 'sensor' })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  formData.stationType === 'sensor'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/30 text-purple-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span className="text-xs">เครื่องตรวจวัดน้ำ IoT</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Sonde Sensor คุณภาพน้ำ</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, stationType: 'monitoring' })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 col-span-2 sm:col-span-1 ${
                  formData.stationType === 'monitoring'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/30 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">จุดเฝ้าระวังทั่วไป</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">ตรวจวัดภาคสนามประจำจุด</span>
              </button>
            </div>
          </div>

          {/* 2. ชื่อและรหัสจุดตั้งเครื่อง */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อสถานี / จุดตั้งเครื่อง <span className="text-[#A6192E]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น สถานีจุดตั้งเครื่องดูดน้ำสะพานท่าตอน"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสจุดตั้งเครื่อง <span className="text-[#A6192E]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="เช่น PUMP-01 หรือ KM-05"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-900 font-mono font-bold"
              />
            </div>
          </div>

          {/* 3. พิกัดตำแหน่งบนแม่น้ำ (จุดสำคัญที่สุด) */}
          <div className="p-3.5 bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-2xl border border-amber-300/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#A6192E]" />
                <span className="text-xs font-bold text-slate-900">พิกัดทางภูมิศาสตร์ของเครื่อง (GPS Coordinates)</span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium bg-amber-100/80 px-2 py-0.5 rounded-md">
                กำหนดตำแหน่งบนแม่น้ำกก
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ละติจูด (Latitude - พิกัด N) <span className="text-[#A6192E]">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="เช่น 20.0610"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ลองจิจูด (Longitude - พิกัด E) <span className="text-[#A6192E]">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="เช่น 99.3615"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-900 font-mono font-bold"
                />
              </div>
            </div>

            {/* ปุ่มเครื่องมือช่วยเลือกพิกัด */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const currentLat = parseFloat(formData.latitude) || 20.0600;
                  const currentLng = parseFloat(formData.longitude) || 99.3650;
                  if (onStartPickOnMap) {
                    onStartPickOnMap([currentLng, currentLat]);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Crosshair className="w-3.5 h-3.5 text-slate-900" />
                <span>📍 จิ้มเลือกพิกัดบนแผนที่</span>
              </button>

              <button
                type="button"
                disabled={isGettingGps}
                onClick={handleGetCurrentGps}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Compass className={`w-3.5 h-3.5 text-sky-600 ${isGettingGps ? 'animate-spin' : ''}`} />
                <span>{isGettingGps ? 'กำลังจับสัญญาณ GPS...' : '🛰️ ใช้ GPS ปัจจุบัน'}</span>
              </button>
            </div>

            {/* Quick Presets จุดสำคัญริมแม่น้ำกก */}
            <div>
              <span className="text-[10px] text-slate-500 font-medium block mb-1">
                หรือเลือกพิกัดด่วนตามจุดสำคัญของแม่น้ำกก:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {KOK_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: p.lat.toFixed(4),
                        longitude: p.lng.toFixed(4)
                      }));
                      setGpsSuccessMsg(`เลือกพิกัด: ${p.name}`);
                    }}
                    className="px-2 py-1 rounded-lg bg-white/90 hover:bg-white border border-amber-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer hover:border-amber-400"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. ข้อมูลเครื่องประจำจุด / เครื่องดูดน้ำ */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-xs font-bold text-slate-800">ข้อมูลเครื่องประจำจุด (Hardware / Pump Node)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  รหัสเครื่อง (Device Code)
                </label>
                <input
                  type="text"
                  value={formData.deviceCode}
                  onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })}
                  placeholder="เช่น PUMP-KOK-01"
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  รุ่นเครื่อง / สเปกเครื่องดูดน้ำ
                </label>
                <input
                  type="text"
                  value={formData.deviceModel}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  placeholder="เช่น เครื่องดูดน้ำแรงดันสูง 15HP"
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  หมายเลขซีเรียล (Serial No.)
                </label>
                <input
                  type="text"
                  value={formData.deviceSerial}
                  onChange={(e) => setFormData({ ...formData, deviceSerial: e.target.value })}
                  placeholder="เช่น SN-2026-P01"
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                วันที่ติดตั้ง / ตรวจสอบระบบล่าสุด
              </label>
              <input
                type="date"
                value={formData.lastCalibrated}
                onChange={(e) => setFormData({ ...formData, lastCalibrated: e.target.value })}
                className="w-full sm:w-1/2 text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* 5. พื้นที่และรายละเอียดเพิ่มเติม */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ตำบล</label>
              <input
                type="text"
                value={formData.subdistrict}
                onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">อำเภอ</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">จังหวัด</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              รายละเอียดจุดตั้งเครื่อง / ข้อสังเกตสภาพแวดล้อม
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="เช่น จุดดูดน้ำชุมชนบริเวณตลิ่งขวา ลึก 2.5 เมตร มีท่อส่งน้ำไปยังแปลงเกษตร"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            <div>
              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="ลบจุดตั้งเครื่องนี้ออกจากระบบ"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>ลบจุดนี้</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-md border border-[#B4975A] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{isEditMode ? 'บันทึกการแก้ไขพิกัด' : 'บันทึกจุดตั้งเครื่องใหม่'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
