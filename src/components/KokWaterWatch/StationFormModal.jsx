import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Camera,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

const RIVER_PRESETS = [
  { name: 'สะพานท่าตอน', lat: 20.0610, lng: 99.3615, sub: 'ตำบลท่าตอน', dist: 'อำเภอแม่อาย' },
  { name: 'คุ้งน้ำวังมัจฉา', lat: 20.0590, lng: 99.3720, sub: 'ตำบลท่าตอน', dist: 'อำเภอแม่อาย' },
  { name: 'สะพานข้ามลำน้ำแม่ใจ', lat: 20.0535, lng: 99.3850, sub: 'ตำบลท่าตอน', dist: 'อำเภอแม่อาย' },
  { name: 'ตลิ่งบ้านร่มเย็น', lat: 20.0420, lng: 99.4100, sub: 'ตำบลท่าตอน', dist: 'อำเภอแม่อาย' },
  { name: 'ท่าเรือบ้านใหม่หมอกจ๋าม', lat: 20.0320, lng: 99.4350, sub: 'ตำบลท่าตอน', dist: 'อำเภอแม่อาย' }
];

const PHOTO_PRESETS = [
  { label: 'แท่นตรวจสะพาน', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
  { label: 'แม่น้ำตอนบน', url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80' },
  { label: 'จุดตรวจคุ้งน้ำ', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80' },
  { label: 'แท่นปลายน้ำ', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80' }
];

export default function StationFormModal({
  isOpen,
  station = null, // If provided, edit mode; otherwise, create mode
  existingStations = [],
  onClose,
  onSave,
  onDelete
}) {
  const isEdit = !!station;

  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    latitude: 20.0610,
    longitude: 99.3615,
    radiusMeters: 250,
    status: 'active',
    image: PHOTO_PRESETS[0].url,
    deviceCode: '',
    deviceModel: 'Aqualab Field Station v2',
    deviceSerial: '',
    lastCalibrated: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [isGettingGps, setIsGettingGps] = useState(false);

  // Synchronize when modal opens or station prop changes
  useEffect(() => {
    if (station) {
      setFormData({
        id: station.id,
        code: station.code || station.id,
        name: station.name || '',
        subdistrict: station.subdistrict || 'ตำบลท่าตอน',
        district: station.district || 'อำเภอแม่อาย',
        province: station.province || 'เชียงใหม่',
        latitude: station.coordinates ? station.coordinates[1] : 20.0610,
        longitude: station.coordinates ? station.coordinates[0] : 99.3615,
        radiusMeters: station.radiusMeters || 250,
        status: station.status || 'active',
        image: station.image || PHOTO_PRESETS[0].url,
        deviceCode: station.device?.code || `DEV-KOK-${station.code?.replace(/\D/g, '') || '01'}`,
        deviceModel: station.device?.model || 'Aqualab Field Station v2',
        deviceSerial: station.device?.serial || `SN-2026-AQ${station.code?.replace(/\D/g, '') || '01'}`,
        lastCalibrated: station.device?.lastCalibrated || new Date().toISOString().split('T')[0],
        description: station.description || ''
      });
    } else {
      const nextNum = existingStations.length + 1;
      const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      setFormData({
        id: `ST-${numStr}`,
        code: `KM-${numStr}`,
        name: `สถานีแม่น้ำกก จุดที่ ${nextNum}`,
        subdistrict: 'ตำบลท่าตอน',
        district: 'อำเภอแม่อาย',
        province: 'เชียงใหม่',
        latitude: 20.0580,
        longitude: 99.3800,
        radiusMeters: 250,
        status: 'active',
        image: PHOTO_PRESETS[nextNum % PHOTO_PRESETS.length].url,
        deviceCode: `DEV-KOK-${numStr}`,
        deviceModel: 'Aqualab Field Station v2',
        deviceSerial: `SN-2026-AQ${numStr}`,
        lastCalibrated: new Date().toISOString().split('T')[0],
        description: 'จุดติดตั้งเครื่องตรวจวัดคุณภาพน้ำอัตโนมัติประจำลุ่มน้ำกก'
      });
    }
  }, [station, existingStations, isOpen]);

  if (!isOpen) return null;

  // Handle GPS location
  const handleGetLiveGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        setFormData(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        }));
      },
      (err) => {
        setIsGettingGps(false);
        alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงตำแหน่ง หรือกรอกพิกัดด้วยตนเอง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('กรุณาระบุชื่อสถานี / จุดติดตั้ง');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('กรุณาระบุพิกัดละติจูดและลองจิจูดที่ถูกต้อง');
      return;
    }

    const stationPayload = {
      id: formData.id || `ST-${Date.now()}`,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      subdistrict: formData.subdistrict.trim() || 'ตำบลท่าตอน',
      district: formData.district.trim() || 'อำเภอแม่อาย',
      province: formData.province.trim() || 'เชียงใหม่',
      coordinates: [lng, lat],
      radiusMeters: Number(formData.radiusMeters) || 250,
      status: formData.status,
      image: formData.image,
      device: {
        code: formData.deviceCode.trim().toUpperCase() || 'DEV-NODE',
        model: formData.deviceModel.trim() || 'Field Station',
        serial: formData.deviceSerial.trim().toUpperCase() || 'SN-2026',
        lastCalibrated: formData.lastCalibrated
      },
      description: formData.description.trim() || 'จุดตรวจวัดคุณภาพน้ำแม่น้ำกก'
    };

    onSave(stationPayload);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#A6192E] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-black uppercase">
                  {isEdit ? `แก้ไข: ${formData.code}` : 'เพิ่มสถานีใหม่'}
                </span>
                <span className="text-[11px] text-amber-200 font-mono">
                  {formData.deviceCode || 'DEV-KOK'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold leading-tight mt-0.5">
                {isEdit ? 'แก้ไขพิกัดและข้อมูลเครื่องดูน้ำ' : 'เพิ่มจุดติดตั้งเครื่องตรวจวัดน้ำ (เครื่องดูน้ำ)'}
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
          {/* Section 1: พิกัดตำแหน่งเครื่องตรวจวัด (Core Feature) */}
          <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-amber-100/50 rounded-2xl border border-amber-300/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-[#A6192E]" />
                <span>พิกัดตำแหน่งเครื่องดูน้ำ (Coordinates)</span>
                <span className="text-[#A6192E]">*</span>
              </span>
              <button
                type="button"
                onClick={handleGetLiveGPS}
                disabled={isGettingGps}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#B4975A] text-[#A6192E] hover:bg-[#A6192E] hover:text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                <span>{isGettingGps ? 'กำลังจับ GPS...' : 'ดึงพิกัด GPS ปัจจุบัน'}</span>
              </button>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              💡 พิกัดนี้จะใช้ปักหมุดแท่นเครื่องดูดน้ำถาวรบนแผนที่ รองรับการเลื่อนไปดูจุดเครื่องและแสดงกราฟแนวโน้มคุณภาพน้ำ
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  ละติจูด (Latitude - เหนือ) <span className="text-[#A6192E]">*</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-hidden"
                  placeholder="20.061000"
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  ลองจิจูด (Longitude - ตะวันออก) <span className="text-[#A6192E]">*</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-hidden"
                  placeholder="99.361500"
                />
              </div>
            </div>

            {/* Quick River Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 block mb-1">
                หรือเลือกพิกัดทางลัดริมน้ำกก:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RIVER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      name: isEdit ? prev.name : `สถานี${preset.name}`,
                      latitude: preset.lat,
                      longitude: preset.lng,
                      subdistrict: preset.sub,
                      district: preset.dist
                    }))}
                    className="px-2 py-0.8 rounded-lg bg-white border border-amber-200 hover:border-[#A6192E] hover:bg-[#A6192E] hover:text-white text-slate-700 text-[10px] font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    📍 {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: ข้อมูลชื่อสถานีและรหัส */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                รหัสสถานี <span className="text-[#A6192E]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="KM-05"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase focus:border-[#A6192E] bg-white text-slate-800"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-bold mb-1">
                ชื่อสถานี / จุดติดตั้งเครื่อง <span className="text-[#A6192E]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น สถานีสะพานมิตรภาพท่าตอน"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:border-[#A6192E] bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Section 3: ข้อมูลอุปกรณ์และเครื่องดูน้ำ (Device Hardware) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#A6192E]" />
              <span>ข้อมูลเครื่องตรวจวัด (Device Hardware Info)</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                  รหัสเครื่อง (Device Code)
                </label>
                <input
                  type="text"
                  value={formData.deviceCode}
                  onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })}
                  placeholder="DEV-KOK-05"
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs uppercase bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                  รุ่นเครื่อง (Model)
                </label>
                <input
                  type="text"
                  value={formData.deviceModel}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  placeholder="Aqualab Field Station"
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.deviceSerial}
                  onChange={(e) => setFormData({ ...formData, deviceSerial: e.target.value })}
                  placeholder="SN-2026-AQ05"
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs uppercase bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                  วันที่สอบเทียบล่าสุด (Calibration)
                </label>
                <input
                  type="date"
                  value={formData.lastCalibrated}
                  onChange={(e) => setFormData({ ...formData, lastCalibrated: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">
                  สถานะการทำงาน
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="active">🟢 ออนไลน์ / ประจำการ (Active)</option>
                  <option value="maintenance">🟡 อยู่ระหว่างบำรุงรักษา (Maintenance)</option>
                  <option value="standby">⚪ พร้อมสแตนด์บาย (Standby)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: ที่อยู่และคำอธิบายจุดติดตั้ง */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-0.5">ตำบล</label>
              <input
                type="text"
                value={formData.subdistrict}
                onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-0.5">อำเภอ</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-0.5">จังหวัด</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              คำอธิบายจุดติดตั้ง / ลักษณะทางกายภาพ
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="เช่น จุดตรวจวัดกลางชุมชน บริเวณท่าเรือท่องเที่ยวและสะพานข้ามแม่น้ำกก"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#A6192E] bg-white text-slate-800"
            />
          </div>

          {/* Section 5: ภาพถ่ายประจำสถานี */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold">
              ภาพถ่ายประจำสถานี (แสดงในการ์ด Trend และ Popup)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PHOTO_PRESETS.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setFormData({ ...formData, image: photo.url })}
                  className={`relative rounded-xl overflow-hidden h-16 border-2 cursor-pointer transition-all ${
                    formData.image === photo.url ? 'border-[#A6192E] ring-2 ring-[#A6192E]/30 scale-102' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 truncate">
                    {photo.label}
                  </span>
                </div>
              ))}
            </div>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="หรือใส่ลิงก์รูปภาพ URL https://..."
              className="w-full p-2 rounded-lg border border-slate-300 text-[11px] bg-white text-slate-800 mt-1 font-mono"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`ต้องการลบจุดตั้งเครื่อง [${formData.code}] ${formData.name} หรือไม่?`)) {
                    onDelete(formData.id);
                  }
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบจุดติดตั้งนี้</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-md shadow-[#A6192E]/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>{isEdit ? 'บันทึกการแก้ไขพิกัด' : 'ยืนยันเพิ่มจุดตั้งเครื่อง'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
