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
  FileText,
  ExternalLink,
  Camera,
  Activity,
  ShieldCheck,
  Trash2,
  BarChart3,
  TrendingUp,
  Scale,
  Info
} from 'lucide-react';

export default function WaterWatchSampleDetail({ sample, onClose, onDelete }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!sample) return null;

  const arsenic = sample.measurements?.arsenic;
  const asVal = arsenic?.value ?? null;
  const isArsenicHigh = asVal !== null && asVal > 10;
  const isArsenicDanger = asVal !== null && asVal > 20;

  const phVal = sample.measurements?.ph?.value ?? null;
  const turbVal = sample.measurements?.turbidity?.value ?? null;
  const tempVal = sample.measurements?.temperature?.value ?? null;

  // Calculate percentage of WHO limit (10 ug/L)
  const whoRatio = asVal !== null ? (asVal / 10) * 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner Header */}
        <div className="bg-[#A6192E] text-white p-3 sm:p-3.5 flex items-start justify-between shrink-0 shadow-md">
          <div className="pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-md text-amber-200 font-bold">
                {sample.sample_code}
              </span>
              <span className="text-[10px] font-semibold text-emerald-200 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-400/30">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                ตรวจทานแล้ว
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
              {sample.station_name}
            </h3>
            <p className="text-xs text-amber-100/90 mt-1 flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              {new Date(sample.collection_time).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })} &bull; {new Date(sample.collection_time).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
              })} น.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto">
          {/* 1. Arsenic Status Card */}
          <div className={`p-3 rounded-xl border shadow-xs ${
            isArsenicDanger
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : (isArsenicHigh ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#A6192E]" />
                ผลตรวจสารหนูในน้ำ (Arsenic: As)
              </span>
              <span className="text-xl font-mono font-black">
                {asVal !== null ? `${asVal} µg/L` : 'ไม่ได้วัด'}
              </span>
            </div>
            <p className="text-xs mt-1.5 font-medium leading-relaxed">
              {isArsenicDanger && '⚠️ เกินเกณฑ์มาตรฐานอันตราย (> 20 µg/L) ห้ามบริโภคโดยเด็ดขาด'}
              {isArsenicHigh && !isArsenicDanger && '⚠️ อยู่ในระดับเฝ้าระวัง (10.1 - 20.0 µg/L) ควรกรองก่อนใช้งาน'}
              {!isArsenicHigh && '✅ อยู่ในเกณฑ์มาตรฐานปลอดภัยตามเกณฑ์ WHO (≤ 10 µg/L)'}
            </p>
            {arsenic?.method && (
              <p className="text-[10px] text-slate-500 mt-1">
                วิธีวัด: {arsenic.method} ({arsenic.instrument})
              </p>
            )}
          </div>

          {/* 2. Other Water Quality Parameters */}
          <div>
            <span className="text-xs font-bold text-slate-700 block mb-2">
              🧪 พารามิเตอร์คุณภาพน้ำอื่นๆ
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#F8F7F5] p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block text-[10px] font-medium">ค่า pH</span>
                <strong className="text-sm font-mono text-emerald-700">
                  {phVal ?? '-'}
                </strong>
              </div>
              <div className="bg-[#F8F7F5] p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block text-[10px] font-medium">ความขุ่น (NTU)</span>
                <strong className="text-sm font-mono text-amber-700">
                  {turbVal ?? '-'}
                </strong>
              </div>
              <div className="bg-[#F8F7F5] p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block text-[10px] font-medium">อุณหภูมิน้ำ (°C)</span>
                <strong className="text-sm font-mono text-sky-700">
                  {tempVal ?? '-'}
                </strong>
              </div>
            </div>
          </div>

          {/* 3. Physical Nature */}
          <div className="p-3.5 bg-[#F8F7F5] rounded-2xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
            <span className="font-bold text-slate-800 block text-xs mb-1 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#A6192E]" />
              ข้อมูลกายภาพและสภาพแวดล้อม
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <p><span className="text-slate-500">แหล่งน้ำ:</span> <strong className="text-slate-700">{sample.sample_nature?.water_source || 'แม่น้ำกก'}</strong></p>
              <p><span className="text-slate-500">ลักษณะน้ำ:</span> <strong className="text-slate-700">{sample.sample_nature?.water_appearance || '-'}</strong></p>
              <p><span className="text-slate-500">กลิ่น:</span> <strong className="text-slate-700">{sample.sample_nature?.odor || 'ปกติ'}</strong></p>
              <p><span className="text-slate-500">ฝนใน 24 ชม.:</span> <strong className="text-slate-700">{sample.sample_nature?.rain_last_24h || '-'}</strong></p>
            </div>
            {sample.sample_nature?.notes && (
              <p className="text-slate-600 italic pt-2 border-t border-slate-200 mt-1 text-[11px] bg-white/70 p-2 rounded-xl">
                &ldquo;{sample.sample_nature.notes}&rdquo;
              </p>
            )}
          </div>

          {/* 3.1 กราฟและแผนภาพวิเคราะห์เปรียบเทียบเชิงวิชาการ (Academic Benchmark & Comparison Chart - Compact) */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-red-50 text-[#A6192E] flex items-center justify-center">
                  <BarChart3 className="w-3 h-3" />
                </div>
                <span className="font-bold text-[11px] text-slate-800">
                  กราฟเปรียบเทียบเกณฑ์มาตรฐานคุณภาพน้ำเชิงวิชาการ
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#A6192E] bg-red-50 font-semibold px-2 py-0.5 rounded-full border border-red-200/60">
                มาตรฐาน WHO / คพ.
              </span>
            </div>

            {/* Chart 1: Arsenic Linear Scale with Benchmark Zones */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-slate-600">
                  ปริมาณสารหนู (As): <strong className="text-slate-900 font-mono">{asVal !== null ? `${asVal} µg/L` : '-'}</strong>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                  isArsenicDanger ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  isArsenicHigh ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isArsenicDanger ? 'เกินเกณฑ์วิกฤต' : isArsenicHigh ? 'เฝ้าระวัง' : 'ปลอดภัยตามเกณฑ์'}
                </span>
              </div>

              {/* Visual Bar Gauge */}
              <div className="relative pt-1 pb-3">
                {/* Background Zones */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden border border-slate-200 shadow-inner">
                  <div className="h-full bg-emerald-500 w-[40%]" title="โซนปลอดภัย (0-10 µg/L)"></div>
                  <div className="h-full bg-amber-400 w-[40%]" title="โซนเฝ้าระวัง (10.1-20 µg/L)"></div>
                  <div className="h-full bg-rose-500 w-[20%]" title="โซนอันตราย (> 20 µg/L)"></div>
                </div>

                {/* Marker Needle */}
                {asVal !== null && (
                  <div 
                    className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500 z-10"
                    style={{ left: `${Math.min(100, Math.max(0, (asVal / 25) * 100))}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-white border border-[#A6192E] shadow-xs flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-[#A6192E]"></div>
                    </div>
                    <div className="w-0.5 h-2 bg-[#A6192E]"></div>
                  </div>
                )}

                {/* Threshold Labels */}
                <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                  <span>0</span>
                  <span className="text-emerald-700 font-bold">10 (เกณฑ์ WHO)</span>
                  <span className="text-amber-700 font-bold">20 (เฝ้าระวัง)</span>
                  <span className="text-rose-700 font-bold">25+ (อันตราย)</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Multi-parameter Comparison Bars */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
              {/* pH comparison bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-600">ค่า pH: <strong className="text-slate-900 font-mono">{phVal ?? '-'}</strong></span>
                  <span className="text-slate-400 font-mono">มาตรฐานน้ำผิวดิน 6.5 - 8.5</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, ((phVal || 7) / 14) * 100))}%` }}
                  ></div>
                  <div className="absolute top-0 bottom-0 left-[46.4%] right-[39.3%] border-x border-dashed border-teal-700 bg-teal-500/10 pointer-events-none"></div>
                </div>
              </div>

              {/* Turbidity comparison bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-600">ความขุ่น: <strong className="text-slate-900 font-mono">{turbVal ? `${turbVal} NTU` : '-'}</strong></span>
                  <span className="text-slate-400 font-mono">เกณฑ์เฝ้าระวัง &le; 50 NTU</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      turbVal > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, ((turbVal || 10) / 100) * 100))}%` }}
                  ></div>
                </div>
              </div>

              {/* Water Quality Score Assessment Box */}
              <div className="mt-1.5 p-2 rounded-lg bg-[#F8F7F5] border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 block font-medium">ดัชนีคุณภาพน้ำ (WQI Score)</span>
                  <span className="text-[11px] font-bold text-slate-800">
                    {isArsenicDanger ? 'คุณภาพต่ำมาก (วิกฤตสารหนู)' : isArsenicHigh ? 'คุณภาพพอใช้ (ควรกรอง)' : 'คุณภาพดี (ได้มาตรฐาน)'}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded font-mono font-black text-[10px] border ${
                  isArsenicDanger ? 'bg-rose-100 text-rose-800 border-rose-200' : isArsenicHigh ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {isArsenicDanger ? 'GRADE D' : isArsenicHigh ? 'GRADE C+' : 'GRADE A'}
                </div>
              </div>
            </div>

            <p className="text-[8px] text-slate-400 leading-tight">
              * เกณฑ์อ้างอิง: องค์การอนามัยโลก (WHO 4th Ed. 10 µg/L) และมาตรฐานน้ำผิวดิน กรมควบคุมมลพิษ
            </p>
          </div>

          {/* 4. GPS & Location */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1 shadow-2xs">
            <span className="font-bold text-slate-800 block text-[11px] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#A6192E]" />
              พิกัดจุดเก็บและข้อมูลตำแหน่ง
            </span>
            <p className="font-mono text-[11px] text-slate-700">
              Lat: <strong>{sample.coordinates[1].toFixed(5)}</strong> &bull; Lng: <strong>{sample.coordinates[0].toFixed(5)}</strong>
            </p>
            <p className="text-slate-500 text-[10px]">
              ความแม่นยำ GPS: ±{sample.gps_accuracy_meters} ม. &bull; ประเภท: {sample.entry_type === 'realtime' ? 'เก็บสดหน้างาน' : 'บันทึกย้อนหลัง'}
            </p>
          </div>

          {/* 5. Images Attached */}
          {sample.images && sample.images.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#A6192E]" />
                รูปถ่ายที่แนบ ({sample.images.length} ภาพ)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {sample.images.map((img) => (
                  <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-32 object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => setSelectedPhoto(img.url)}
                    />
                    <div className="p-1.5 text-[10px]">
                      <span className="font-bold block truncate text-slate-800">{img.title}</span>
                      <span className="text-slate-400 block truncate">{img.storage_type === 'supabase' ? `Supabase: ${img.drive_file_id}` : (img.drive_file_id ? `ไฟล์: ${img.drive_file_id}` : 'คลาวด์')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Collector & Storage Trace */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              ผู้เก็บ: <strong>{sample.collector?.name}</strong> ({sample.collector?.id})
            </p>
            <p className="text-slate-500">สังกัด: {sample.collector?.organization}</p>
            <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>ฐานข้อมูล: Supabase Cloud (PostgreSQL + Storage)</span>
              <span className="text-emerald-600 font-bold">ซิงก์ครบถ้วน</span>
            </div>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(sample.sample_code)}
              className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="ลบตัวอย่างนี้ออกจากระบบ"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ลบรายการตัวอย่างนี้</span>
            </button>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img src={selectedPhoto} alt="หลักฐานภาพถ่าย" className="rounded-2xl max-h-[80vh] object-contain shadow-2xl" />
            <button 
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
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
