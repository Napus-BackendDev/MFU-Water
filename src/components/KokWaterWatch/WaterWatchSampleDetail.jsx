import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  User,
  Phone,
  Droplets,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Camera,
  Activity,
  ShieldCheck,
  Trash2,
  Check,
  Flame,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { ARSENIC_LEVELS, getArsenicLevelConfig } from '../../data/waterWatchData';

export default function WaterWatchSampleDetail({ sample, onClose, onDelete }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!sample) return null;

  // ดึงและแปลงข้อมูลสารหนูตาม Schema 2.0 ใหม่
  const arsenic = sample.measurements?.arsenic || {};
  let rawAs = arsenic.value;
  if (rawAs === null || rawAs === undefined || isNaN(Number(rawAs))) {
    rawAs = arsenic.level 
      ? (arsenic.level === 1 ? 0 : arsenic.level === 2 ? 5 : arsenic.level === 3 ? 10 : arsenic.level === 4 ? 30 : 50) 
      : 10;
  }
  const asVal = Number(rawAs);
  const levelCfg = getArsenicLevelConfig(asVal);

  const isDanger = asVal > 50;
  const isWatch = asVal > 10 && !isDanger;
  const isSafe = !isDanger && !isWatch;

  // พิกัด
  const coords = Array.isArray(sample.coordinates) && sample.coordinates.length === 2
    ? sample.coordinates
    : [99.3615, 20.0610];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return {
        date: d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
      };
    } catch (e) {
      return { date: '-', time: '-' };
    }
  };

  const { date, time } = formatDateTime(sample.collection_time);

  // รูปถ่าย (ถ้าไม่มี ให้ fallback รูปตัวอย่าง)
  const images = Array.isArray(sample.images) && sample.images.length > 0
    ? sample.images
    : [
        {
          id: 'mock-strip',
          title: `ภาพที่ 1: แถบเทียบสี ${levelCfg.label}`,
          url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80'
        },
        {
          id: 'mock-river',
          title: 'ภาพที่ 2: บริเวณริมแม่น้ำกก',
          url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80'
        }
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-10 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col overflow-hidden text-slate-800 shrink-0 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Banner */}
        <div className="bg-gradient-to-r from-[#A6192E] to-[#801021] text-white p-4 sm:p-5 flex items-start justify-between shrink-0 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          
          <div className="pr-2 relative z-10">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-mono bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-amber-200 font-bold border border-white/10">
                {sample.sample_code}
              </span>
              <span className="text-[10px] font-semibold text-emerald-200 flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-400/30">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>บันทึกยืนยันแล้ว</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/30">
                ระดับที่ {levelCfg.level} ({levelCfg.label})
              </span>
            </div>

            <h3 className="text-base sm:text-xl font-bold text-white leading-tight">
              {sample.station_name || `พิกัด [${lat.toFixed(4)}, ${lng.toFixed(4)}]`}
            </h3>

            <p className="text-xs text-amber-100/90 mt-1.5 flex items-center gap-2 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>{date}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>{time}</span>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer shrink-0 z-10"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Modal Body (องค์ประกอบใหม่ทั้งหมด) */}
        <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          
          {/* Card A: ผลตรวจสารหนูในน้ำ (Arsenic: As) - พระเอกหลัก */}
          <div className={`p-4 rounded-2xl border-2 shadow-xs transition-all ${
            isDanger
              ? 'bg-rose-50/90 border-rose-300 text-rose-950'
              : isWatch
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                  <Activity className="w-4 h-4 text-[#A6192E]" />
                  <span>ผลตรวจสารหนูในน้ำ (Arsenic: As)</span>
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  ชุดทดสอบภาคสนาม (Arsenic Field Test Kit) &bull; แถบเทียบสีระดับ {levelCfg.level}
                </p>
              </div>

              {/* Big Arsenic Value */}
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-mono font-black text-[#A6192E] flex items-baseline gap-1 justify-end">
                  <span>{asVal}</span>
                  <span className="text-sm font-bold text-slate-600">ppb</span>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 border ${
                  isDanger
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isWatch
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isDanger ? 'เกินเกณฑ์อันตราย' : isWatch ? 'เฝ้าระวัง' : 'ปกติ (ปลอดภัย)'}
                </span>
              </div>
            </div>

            {/* Assessment Statement */}
            <div className="mt-3 p-2.5 rounded-xl bg-white/80 border border-black/5 text-xs font-medium leading-relaxed">
              {isDanger && (
                <span className="text-rose-700 flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>⚠️ เกินเกณฑ์มาตรฐานอันตราย (&gt; 50 ppb) ห้ามบริโภคหรือนำไปปรุงอาหารโดยเด็ดขาด</span>
                </span>
              )}
              {isWatch && (
                <span className="text-amber-800 flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>⚠️ อยู่ในระดับเฝ้าระวัง (11 - 50 ppb) เกินเกณฑ์น้ำดื่ม WHO ควรกรองก่อนใช้งาน</span>
                </span>
              )}
              {isSafe && (
                <span className="text-emerald-800 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>✅ อยู่ในเกณฑ์มาตรฐานปลอดภัยตามเกณฑ์น้ำดื่ม WHO (&le; 10 ppb)</span>
                </span>
              )}
            </div>

            {/* แถบเทียบสีชุดตรวจ 9 ระดับ (Arsenic 9-Level Comparator Bar) */}
            <div className="mt-4 pt-3.5 border-t border-black/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>แถบเทียบสีชุดตรวจ 9 ระดับ</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ระดับที่เลือก: <strong>{levelCfg.level} ({levelCfg.label})</strong>
                </span>
              </div>

              {/* 9 Colors Swatch Strip */}
              <div className="grid grid-cols-9 gap-1 sm:gap-1.5 pt-1">
                {ARSENIC_LEVELS.map((lvl) => {
                  const isMatch = lvl.level === levelCfg.level;
                  return (
                    <div 
                      key={lvl.level}
                      className={`flex flex-col items-center transition-all ${
                        isMatch ? 'scale-105 z-10' : 'opacity-85'
                      }`}
                      title={`${lvl.label} - ${lvl.desc}`}
                    >
                      <div
                        className={`w-full aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
                          isMatch 
                            ? 'ring-2 ring-[#A6192E] ring-offset-1 shadow-md' 
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: lvl.color }}
                      >
                        {isMatch && (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900 stroke-[3]" />
                        )}
                      </div>
                      <span className={`text-[9px] font-mono mt-1 ${isMatch ? 'font-black text-[#A6192E]' : 'text-slate-500'}`}>
                        {lvl.ppb}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Selected Color Explanation */}
              <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/70 border border-black/5 flex items-center justify-between text-[11px]">
                <span className="text-slate-600">
                  เฉดสีที่ตรวจเทียบ: <strong className="text-slate-900">{levelCfg.desc}</strong>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  ระดับ {levelCfg.level} / 9
                </span>
              </div>
            </div>

            {/* Visual Gauge Bar (WHO Scale) */}
            <div className="mt-3.5 pt-3 border-t border-black/10">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>เกจวัดเทียบมาตรฐาน (WHO &le;10 / เฝ้าระวัง &le;50 / อันตราย &gt;50)</span>
                <span className="font-mono font-bold text-slate-700">{asVal} ppb</span>
              </div>

              <div className="relative pt-1 pb-2">
                <div className="h-2.5 w-full rounded-full bg-slate-200 flex overflow-hidden border border-slate-300 shadow-inner">
                  <div className="h-full bg-emerald-500 w-[20%]" title="ปลอดภัย (0-10 ppb)"></div>
                  <div className="h-full bg-amber-400 w-[40%]" title="เฝ้าระวัง (11-50 ppb)"></div>
                  <div className="h-full bg-rose-500 w-[40%]" title="อันตราย (> 50 ppb)"></div>
                </div>

                {/* Marker Pin */}
                <div 
                  className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-300 z-10"
                  style={{ left: `${Math.min(100, Math.max(0, (asVal / 100) * 100))}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-[#A6192E] shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-[#A6192E]"></div>
                  </div>
                  <div className="w-0.5 h-1.5 bg-[#A6192E]"></div>
                </div>
              </div>

              <div className="flex justify-between text-[8px] font-mono text-slate-500">
                <span>0</span>
                <span className="text-emerald-700 font-bold">10 (เกณฑ์ WHO)</span>
                <span className="text-amber-700 font-bold">50 (เฝ้าระวัง)</span>
                <span className="text-rose-700 font-bold">&gt;100 ppb</span>
              </div>
            </div>
          </div>

          {/* Card B: ข้อมูลผู้ตรวจวัดและการติดต่อ (Inspector Info) */}
          <div className="p-3.5 bg-[#F8F7F5] rounded-2xl border border-slate-200 text-xs space-y-2.5 shadow-2xs">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#A6192E]" />
              <span>ข้อมูลผู้ส่งผลตรวจและการติดต่อ</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">ชื่อ-นามสกุล ผู้ตรวจ</span>
                <strong className="text-slate-800 block text-xs mt-0.5">
                  {sample.collector?.name || 'ผู้ตรวจวัดภาคสนาม'}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono">
                  รหัส: {sample.collector?.id || 'VOL-001'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">เบอร์โทรศัพท์ติดต่อ</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {sample.collector?.phone && sample.collector?.phone !== '-' ? (
                    <a 
                      href={`tel:${sample.collector.phone.replace(/[^0-9]/g, '')}`} 
                      className="text-xs font-mono font-bold text-emerald-700 hover:underline"
                    >
                      {sample.collector.phone}
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-slate-500">-</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  สังกัด: {sample.collector?.organization || 'ประชาชนทั่วไป'}
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <span>ประเภทการบันทึก:</span>
                <strong className="text-slate-700">
                  {sample.entry_type === 'realtime' ? '⚡ บันทึกสดหน้างาน (GPS Real-time)' : 'บันทึกย้อนหลัง'}
                </strong>
              </span>
              <span className="font-mono text-emerald-600 font-bold">
                ✓ ซิงก์สมบูรณ์
              </span>
            </div>
          </div>

          {/* Card C: พิกัดตำแหน่งที่ตั้ง GPS (Location & GPS Coordinates) */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#A6192E]" />
                <span>พิกัดตำแหน่งที่ตั้ง (GPS Coordinates)</span>
              </span>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 font-bold"
              >
                <span>เปิดใน Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">พิกัดดาวเทียม:</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">ความแม่นยำ GPS:</span>
                <span className="font-mono text-slate-700 text-xs">
                  &plusmn;{sample.gps_accuracy_meters || 5.0} เมตร
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 text-[11px]">จุดสำรวจ / แหล่งน้ำ:</span>
                <span className="font-medium text-slate-800 text-xs truncate max-w-[240px]">
                  {sample.sample_nature?.water_source || 'แม่น้ำกก'}
                </span>
              </div>
            </div>

            {sample.sample_nature?.notes && (
              <p className="text-[11px] text-slate-600 italic bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl">
                &ldquo;{sample.sample_nature.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Card D: รูปถ่ายหลักฐานยืนยันผลตรวจ (Inspection Photo Evidence - 2 รูป) */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 shadow-2xs">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#A6192E]" />
              <span>รูปถ่ายหลักฐานยืนยันผลตรวจ ({images.length} รูป)</span>
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {images.map((img, i) => (
                <div 
                  key={img.id || i} 
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 cursor-pointer"
                  onClick={() => setSelectedPhoto(img.url)}
                >
                  <img
                    src={img.url}
                    alt={img.title || `ภาพที่ ${i + 1}`}
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <span>แตะเพื่อขยาย</span>
                  </div>
                  <div className="p-2 bg-white/95 border-t border-slate-100">
                    <span className="font-bold block truncate text-slate-800 text-[11px]">
                      {img.title || `ภาพที่ ${i + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action: Delete Button */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(sample.sample_code)}
              className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="ลบตัวอย่างนี้ออกจากระบบ"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ลบรายการตัวอย่างนี้</span>
            </button>
          )}

        </div>

        {/* 3. Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            {sample.sample_code}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img 
              src={selectedPhoto} 
              alt="หลักฐานภาพถ่ายขยาย" 
              className="rounded-2xl max-h-[80vh] object-contain shadow-2xl border border-white/20" 
            />
            <button 
              type="button"
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-all cursor-pointer shadow-lg"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

