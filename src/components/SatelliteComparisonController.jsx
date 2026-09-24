import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  FileText,
  Compass,
  Eye,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets
} from 'lucide-react';

export default function SatelliteComparisonController({
  isExpanded: controlledIsExpanded,
  setIsExpanded: setControlledIsExpanded,
  comparisonBlend, // 0 (100% Before) to 100 (100% After)
  setComparisonBlend,
  comparisonMode, // 'before' | 'after' | 'blend'
  setComparisonMode,
  showMndwiWater,
  setShowMndwiWater,
  is3DMode,
  setIs3DMode,
  onOpenAnalysisModal,
  onFocusThaton,
  onOpenWaterWatch
}) {
  const [internalExpanded, setInternalExpanded] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalExpanded;
  const setIsExpanded = setControlledIsExpanded || setInternalExpanded;
  const [isAutoFading, setIsAutoFading] = useState(false);

  // แอนิเมชันเลื่อนสไลเดอร์เปรียบเทียบ ก่อน ↔ หลัง อัตโนมัติ
  useEffect(() => {
    if (!isAutoFading) return;

    let direction = 1;
    const interval = setInterval(() => {
      setComparisonBlend(prev => {
        if (prev >= 100) {
          direction = -1;
          return 95;
        }
        if (prev <= 0) {
          direction = 1;
          return 5;
        }
        return prev + direction * 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isAutoFading, setComparisonBlend]);

  // เมื่ออยู่ในสถานะย่อ (Collapsed state): แสดงแถบปุ่มลอยกะทัดรัด พร้อมปุ่มกดขยาย
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="glass-panel-light p-2 px-3 md:p-3 md:px-4 rounded-2xl shadow-xl border border-sky-400/50 hover:border-sky-500 text-slate-800 hover:text-sky-700 transition-all flex items-center gap-2 md:gap-3 cursor-pointer active:scale-95 group pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
        title="คลิกเพื่อขยายแผงควบคุมเปรียบเทียบภาพดาวเทียม ก่อน-หลัง"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
          <Sliders className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors hidden sm:inline">
              เปรียบเทียบภาพดาวเทียม ก่อน ↔ หลัง
            </span>
            <span className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors sm:hidden">
              เปรียบเทียบภาพ
            </span>
            <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              comparisonBlend === 0
                ? 'bg-emerald-100 text-emerald-800'
                : comparisonBlend === 100
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-sky-100 text-sky-800'
            }`}>
              {comparisonBlend === 0 ? '5 ก.ย.' : comparisonBlend === 100 ? '15 ก.ย.' : `${comparisonBlend}%`}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span>คลิกเพื่อขยาย</span>
            <ChevronUp className="w-3 h-3 text-sky-500 group-hover:-translate-y-0.5 transition-transform" />
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="glass-panel-light p-3.5 md:p-4 rounded-3xl shadow-2xl border border-slate-200/90 w-[calc(100vw-1.5rem)] max-w-sm md:max-w-md text-slate-800 space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight">
              เปรียบเทียบภาพดาวเทียม ก่อน ↔ หลัง (2567)
            </h3>
            <p className="text-[11px] text-slate-500">
              Sentinel-2 & Earth Engine · ต.ท่าตอน - บ้านท่าดอย
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 3D Perspective Toggle Button */}
          {/* 2D / 3D Perspective Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setIs3DMode(false)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !is3DMode
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="มุมมอง 2 มิติ (แบนราบ Top-down)"
            >
              2D
            </button>
            <button
              onClick={() => setIs3DMode(true)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                is3DMode
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="มุมมอง 3 มิติ (ภูมิประเทศ 3D Terrain)"
            >
              <Compass className="w-3 h-3" />
              <span>3D</span>
            </button>
          </div>

          {/* ปุ่มย่อ/หดแผงควบคุม (Collapse Button) */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="ย่อแผงควบคุม (หดหน้าต่าง)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Selector Buttons: ก่อนท่วม vs หลังท่วม */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setComparisonMode('before');
            setComparisonBlend(0);
            setIsAutoFading(false);
          }}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            comparisonBlend === 0
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm ring-2 ring-emerald-500/30'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              ภาพก่อนน้ำท่วม
            </span>
            {comparisonBlend === 0 && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </div>
          <div className="font-bold text-xs mt-1.5">5 ก.ย. 2567</div>
          <p className="text-[10px] text-slate-500 mt-0.5">ร่องน้ำปกติ (ผิวน้ำ 0.308 ตร.กม.)</p>
        </button>

        <button
          onClick={() => {
            setComparisonMode('after');
            setComparisonBlend(100);
            setIsAutoFading(false);
          }}
          className={`p-2.5 rounded-2xl border text-left transition-all ${
            comparisonBlend === 100
              ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-sm ring-2 ring-rose-500/30'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
              ภาพหลังน้ำท่วม
            </span>
            {comparisonBlend === 100 && <Check className="w-3.5 h-3.5 text-rose-600" />}
          </div>
          <div className="font-bold text-xs mt-1.5">15 ก.ย. 2567</div>
          <p className="text-[10px] text-slate-500 mt-0.5">มวลน้ำหลากท่วม (+310.94 ไร่)</p>
        </button>
      </div>

      {/* Fade / Blend Slider (สไลด์เปรียบเทียบภาพดาวเทียมแบบเรียลไทม์) */}
      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>สไลด์ผสมภาพ ก่อน ↔ หลัง</span>
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200">
            {comparisonBlend === 0 ? 'ก่อนท่วม (0%)' : comparisonBlend === 100 ? 'หลังท่วม (100%)' : `เปลี่ยนผ่าน ${comparisonBlend}%`}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="2"
          value={comparisonBlend}
          onChange={(e) => {
            const val = Number(e.target.value);
            setComparisonBlend(val);
            setComparisonMode('blend');
            setIsAutoFading(false);
          }}
          className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 transition-all"
        />

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>5 ก.ย. (ปกติ)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAutoFading(!isAutoFading)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1 shadow-2xs"
            >
              {isAutoFading ? <Pause className="w-3 h-3 text-rose-500" /> : <Play className="w-3 h-3 fill-current text-sky-600" />}
              <span>{isAutoFading ? 'หยุดวน' : 'สลับวนอัตโนมัติ'}</span>
            </button>
            <button
              onClick={() => {
                setComparisonBlend(50);
                setIsAutoFading(false);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
            >
              50/50
            </button>
          </div>
          <span>15 ก.ย. (ท่วม)</span>
        </div>
      </div>

      {/* MNDWI Flood Layer Toggle */}
      <div className="flex items-center justify-between px-1 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showMndwiWater}
            onChange={(e) => setShowMndwiWater(e.target.checked)}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
          />
          <span className="text-[11px] font-bold text-slate-700">
            แสดงเลเยอร์จำแนกน้ำท่วม GEE (MNDWI &gt; 0.10)
          </span>
        </label>
        <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md">
          +310 ไร่
        </span>
      </div>

      {/* Read Full Article Modal Button */}
      <button
        onClick={onOpenAnalysisModal}
        className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 border border-indigo-500/30"
      >
        <FileText className="w-4 h-4 text-amber-300" />
        <span>📖 อ่านบทวิเคราะห์สถานการณ์น้ำท่วม 2567 (ฉบับเต็ม)</span>
      </button>

      {/* Open KOK Water Watch */}
      {onOpenWaterWatch && (
        <button
          onClick={onOpenWaterWatch}
          className="w-full py-2 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-[#A6192E] border border-rose-200/80 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
          title="เปิดระบบแบบฟอร์มบันทึกข้อมูล KOK Water Watch"
        >
          <Droplets className="w-3.5 h-3.5 text-[#A6192E]" />
          <span>📋 บันทึกข้อมูลคุณภาพน้ำ (KOK Water Watch)</span>
        </button>
      )}

      {/* Focus Tha Ton */}
      <button
        onClick={onFocusThaton}
        className="w-full py-1.5 px-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
      >
        <Eye className="w-3.5 h-3.5 text-sky-500" />
        <span>รีเซ็ตมุมมองกึ่งกลาง ต.ท่าตอน - บ้านท่าดอย</span>
      </button>
    </div>
  );
}
