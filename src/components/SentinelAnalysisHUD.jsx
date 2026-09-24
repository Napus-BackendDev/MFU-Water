import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Eye
} from 'lucide-react';
import {
  SENTINEL_METRICS,
  SENTINEL_ZONES,
  SENTINEL_COMMUNITIES
} from '../data/sentinelFloodAnalysisData';

export default function SentinelAnalysisHUD({
  isOpen: controlledIsOpen,
  setIsOpen: setControlledIsOpen,
  floodStage,
  setFloodStage,
  activeZone,
  setActiveZone,
  activeCommunity,
  setActiveCommunity,
  waterColorMode,
  setWaterColorMode,
  onFlyToLocation
}) {
  const [internalOpen, setInternalOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setIsOpen = setControlledIsOpen || setInternalOpen;
  const [showMethods, setShowMethods] = useState(false);

  return (
    <div className="pointer-events-auto">
      {/* ถ้าปิดอยู่ ให้แสดงปุ่มลอยสำหรับเปิด HUD */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="glass-panel-light p-2 px-3 md:px-3.5 md:py-2 rounded-2xl shadow-xl border border-sky-400/40 text-slate-800 hover:text-sky-600 transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer active:scale-95 animate-in fade-in duration-200"
          title="เปิดแผงข้อมูลวิเคราะห์ดาวเทียม Sentinel-2 และ GEE"
        >
          <span className="text-sm">🛰️</span>
          <span className="text-xs font-bold hidden sm:inline">ข้อมูลวิเคราะห์ดาวเทียม (Sentinel-2)</span>
          <span className="text-xs font-bold sm:hidden">วิเคราะห์ดาวเทียม</span>
          <span className="text-[10px] bg-sky-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
            GEE
          </span>
        </button>
      )}

      {/* แผง HUD แบบเต็ม ซ้อนอยู่บนฉาก 3 มิติ */}
      {isOpen && (
        <div className="glass-panel-light p-3.5 md:p-4 rounded-3xl shadow-2xl border border-slate-200/90 w-[calc(100vw-1.5rem)] max-w-sm sm:w-80 md:w-96 text-slate-800 space-y-3 md:space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-140px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <span className="text-sm">🛰️</span>
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight">
                  วิเคราะห์ดาวเทียม Sentinel-2
                </h3>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span>Google Earth Engine</span>
                  <span>&bull;</span>
                  <span className="text-sky-600 font-semibold">ก.ย. 2567</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                title="ย่อแผงข้อมูล"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 1. สถิติสำคัญทางวิทยาศาสตร์ (Core Metrics) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] text-amber-900 font-semibold block">น้ำท่วมเพิ่มตรวจพบจริง</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-rose-600 font-mono">{SENTINEL_METRICS.addedWaterKm2}</span>
                <span className="text-[10px] text-amber-800">ตร.กม.</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">~{SENTINEL_METRICS.addedWaterRai} ไร่</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-sky-50/80 border border-sky-200/70 shadow-2xs">
              <span className="text-[10px] text-sky-900 font-semibold block">พื้นที่วิเคราะห์ได้จริง</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-sky-700 font-mono">{SENTINEL_METRICS.comparablePercentage}%</span>
                <span className="text-[10px] text-sky-600">ไร้เมฆ</span>
              </div>
              <span className="text-[10px] text-sky-600/80 font-medium">ร่องน้ำเดิม {SENTINEL_METRICS.baselineWaterKm2} ตร.กม.</span>
            </div>
          </div>

          {/* 2. สลับเปรียบเทียบก่อน-หลัง (5 ก.ย. 67 vs 15 ก.ย. 67) */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>เปรียบเทียบ ก่อน ↔ หลัง (2567)</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {floodStage === 0 ? '5 ก.ย. (ปกติ)' : floodStage === 100 ? '15 ก.ย. (ท่วมสูงสุด)' : `${floodStage}%`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setFloodStage(0)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                  floodStage === 0
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                5 ก.ย. (ก่อนท่วม)
              </button>
              <button
                onClick={() => setFloodStage(100)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                  floodStage === 100
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                15 ก.ย. (หลังท่วม +310 ไร่)
              </button>
            </div>

            {/* สลับสีผิวน้ำ (MNDWI vs 3D Water) */}
            <div className="pt-1 flex items-center justify-between text-[10px] border-t border-slate-200/70">
              <span className="text-slate-500 font-medium">รูปแบบสีผิวน้ำ 3D:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWaterColorMode('standard')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    waterColorMode === 'standard'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ภาพดาวเทียมจริง (คลีน)
                </button>
                <button
                  onClick={() => setWaterColorMode('mndwi')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    waterColorMode === 'mndwi'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                  title="สีส้ม-แดงเน้นพื้นที่น้ำหลากใหม่ตามดัชนี MNDWI ดาวเทียมจริง"
                >
                  สีเตือนภัย MNDWI
                </button>
              </div>
            </div>
          </div>

          {/* 3. การกระจายตัวตามโซน Z1 - Z4 (คลิกแล้วบินไปส่อง 3D ทันที) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-sky-600" />
                <span>จำแนกพื้นที่น้ำท่วมตามโซน (Z1 - Z4)</span>
              </span>
              {activeZone && (
                <button
                  onClick={() => setActiveZone(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                >
                  ล้างการเลือก
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {SENTINEL_ZONES.map(z => {
                const isSelected = activeZone === z.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => {
                      if (isSelected) {
                        setActiveZone(null);
                      } else {
                        setActiveZone(z.id);
                        if (onFlyToLocation) onFlyToLocation(z.center, 15.0);
                      }
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : z.id === 'Z3'
                        ? 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/70'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{z.id}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : z.id === 'Z3'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {z.pct}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-sky-100' : 'text-slate-600'}`}>
                      {z.id === 'Z3' ? 'โค้งน้ำกก-บ้านท่าดอย' : z.id === 'Z2' ? 'สะพานท่าตอน' : z.id === 'Z1' ? 'แนวดอยท่าตอน' : 'ด้านตะวันออก'}
                    </div>
                    <div className={`text-[10px] font-mono font-bold mt-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {z.addedKm2 > 0 ? `+${z.addedRai} ไร่` : '0 ไร่'}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 italic">
              * โซน Z3 (บ้านท่าดอย) ได้รับผลกระทบหนักสุด 51.2% ของน้ำท่วมทั้งหมด
            </p>
          </div>

          {/* 4. ระดับชุมชน (รัศมี 500 ม. รอบจุดอ้างอิง) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>ผลกระทบรัศมี 500 ม. รอบชุมชน</span>
              </span>
              {activeCommunity && (
                <button
                  onClick={() => setActiveCommunity(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                >
                  ล้าง
                </button>
              )}
            </div>

            <div className="space-y-1">
              {SENTINEL_COMMUNITIES.map(c => {
                const isSelected = activeCommunity === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (isSelected) {
                        setActiveCommunity(null);
                      } else {
                        setActiveCommunity(c.id);
                        if (onFlyToLocation) onFlyToLocation(c.center, 15.8);
                      }
                    }}
                    className={`w-full p-2 rounded-xl text-left border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{c.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {c.note.split(' · ')[1] || c.note}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {c.addedKm2 > 0 ? `+${c.addedRai} ไร่` : '0 ไร่'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. สรุปวิธีวิเคราะห์ทางวิทยาศาสตร์ (ย่อ/ขยายได้) */}
          <div className="pt-1 border-t border-slate-100">
            <button
              onClick={() => setShowMethods(!showMethods)}
              className="w-full flex items-center justify-between text-[10px] text-slate-500 hover:text-slate-800 font-semibold py-1"
            >
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-sky-500" />
                <span>เกณฑ์วิทยาศาสตร์ (MNDWI & Cloud Score+)</span>
              </span>
              {showMethods ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMethods && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1 animate-in fade-in duration-150">
                <p>
                  <strong>เกณฑ์ตรวจจับน้ำ:</strong> MNDWI &gt; 0.10 และ NDVI &lt; 0.20 เพื่อแยกผิวน้ำหลากออกจากเงาต้นไม้และพืชพรรณ
                </p>
                <p>
                  <strong>การคัดกรองเมฆ:</strong> ใช้ Cloud Score+ และ SCL เปรียบเทียบเฉพาะพิกเซลที่ผ่านเกณฑ์ทั้งสองวัน
                </p>
                <p>
                  <strong>ขนาดกริด:</strong> 10 &times; 10 ม. (100 ตร.ม./พิกเซล) พิกัด UTM 47N
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
