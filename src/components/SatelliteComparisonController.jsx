import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Droplets,
  FastForward,
  AlertTriangle
} from 'lucide-react';
import {
  FLOOD_TIMELINE_DATA,
  KEY_MILESTONES,
  getTimelineDayByIndex
} from '../data/timelineFloodData';

export default function SatelliteComparisonController({
  isExpanded: controlledIsExpanded,
  setIsExpanded: setControlledIsExpanded,
  comparisonBlend, // 0 to 100
  setComparisonBlend,
  comparisonMode,
  setComparisonMode,
  showMndwiWater,
  setShowMndwiWater,
  is3DMode,
  setIs3DMode,
  onOpenAnalysisModal,
  onFocusThaton,
  onOpenWaterWatch,
  currentDayIndex = 0,
  setCurrentDayIndex
}) {
  const [internalExpanded, setInternalExpanded] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalExpanded;
  const setIsExpanded = setControlledIsExpanded || setInternalExpanded;

  // Internal day index if parent doesn't provide
  const [internalDayIndex, setInternalDayIndex] = useState(0);
  const activeDayIndex = currentDayIndex !== undefined ? currentDayIndex : internalDayIndex;
  const setActiveDayIndex = (idx) => {
    const nextIdx = typeof idx === 'function' ? idx(activeDayIndex) : idx;
    const safeIdx = Math.max(0, Math.min(FLOOD_TIMELINE_DATA.length - 1, nextIdx));
    if (setCurrentDayIndex) setCurrentDayIndex(safeIdx);
    setInternalDayIndex(safeIdx);

    const dayData = getTimelineDayByIndex(safeIdx);
    if (setComparisonBlend) {
      setComparisonBlend(dayData.satelliteBlend);
    }
  };

  // Time-Lapse Player state
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x or 2x
  const timerRef = useRef(null);

  const currentDay = getTimelineDayByIndex(activeDayIndex);

  // Time-Lapse loop
  useEffect(() => {
    if (!isPlayingTimeline) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = playSpeed === 1 ? 900 : 450;
    timerRef.current = setInterval(() => {
      setActiveDayIndex((prev) => {
        if (prev >= FLOOD_TIMELINE_DATA.length - 1) {
          return 0; // Loop back to day 0
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlayingTimeline, playSpeed]);

  // Jump to specific milestone
  const handleSelectMilestone = (idx) => {
    setIsPlayingTimeline(false);
    setActiveDayIndex(idx);
  };

  // Step -1 / +1 day
  const handleStepDay = (step) => {
    setIsPlayingTimeline(false);
    setActiveDayIndex(activeDayIndex + step);
  };

  // เมื่ออยู่ในสถานะย่อ (Collapsed state): แสดงแถบปุ่มลอยกะทัดรัด พร้อมปุ่มกดขยาย
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="glass-panel-light p-2 px-2.5 md:p-3 md:px-4 rounded-2xl shadow-xl border border-sky-400/50 hover:border-sky-500 text-slate-800 hover:text-sky-700 transition-all flex items-center gap-2 md:gap-3 cursor-pointer active:scale-95 group pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[calc(100vw-145px)] md:max-w-none text-left"
        title="คลิกเพื่อขยายไทม์ไลน์ภาพดาวเทียม 5 ก.ย. - 5 ต.ค. 2567"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
        </div>
        <div className="truncate">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
              {currentDay.displayDate}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${currentDay.badgeColor}`}>
              {currentDay.affectedAreaRai > 0 ? `+${currentDay.affectedAreaRai} ไร่` : 'ปกติ'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <span className="truncate">{currentDay.phaseLabel}</span>
            <ChevronUp className="w-3 h-3 text-sky-500 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="glass-panel-light p-3 md:p-4 rounded-3xl shadow-2xl border border-slate-200/90 w-[calc(100vw-1.5rem)] max-w-sm md:max-w-md text-slate-800 space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[82vh] overflow-y-auto">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight">
              ไทม์ไลน์ภาพดาวเทียม (5 ก.ย. - 5 ต.ค. 2567)
            </h3>
            <p className="text-[10px] md:text-[11px] text-slate-500">
              Sentinel-2 & Earth Engine · ต.ท่าตอน - บ้านท่าดอย (31 วัน)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 2D / 3D Perspective Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setIs3DMode(false)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                !is3DMode
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="มุมมอง 2 มิติ (Top-down)"
            >
              2D
            </button>
            <button
              onClick={() => setIs3DMode(true)}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
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

          {/* ปุ่มย่อ/หดแผงควบคุม */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="ย่อแผงควบคุม"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Hero Date Status Banner */}
      <div className={`p-3 rounded-2xl border transition-all ${
        currentDay.phase === 'peak'
          ? 'bg-rose-50/90 border-rose-200'
          : currentDay.phase === 'onset'
            ? 'bg-amber-50/90 border-amber-200'
            : currentDay.phase === 'receding'
              ? 'bg-sky-50/90 border-sky-200'
              : 'bg-emerald-50/90 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm md:text-base text-slate-900">
              {currentDay.displayDate}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              (วันที่ {activeDayIndex + 1}/31)
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentDay.badgeColor}`}>
            {currentDay.phaseLabel}
          </span>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 block font-medium">ผิวน้ำท่วมขัง</span>
            <span className="text-[11px] font-bold text-rose-700">
              {currentDay.affectedAreaRai > 0 ? `+${currentDay.affectedAreaRai} ไร่` : 'ปกติ (0 ไร่)'}
            </span>
          </div>
          <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 block font-medium">ระดับน้ำแม่กก</span>
            <span className="text-[10px] font-bold text-sky-800 truncate block" title={currentDay.waterLevelDiff}>
              {currentDay.waterLevelDiff.split(' ')[0]}
            </span>
          </div>
          <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100 text-center">
            <span className="text-[9px] text-slate-400 block font-medium">ภาพดาวเทียม</span>
            <span className="text-[10px] font-bold text-slate-700">
              {activeDayIndex <= 10 ? 'น้ำเพิ่ม' : activeDayIndex <= 20 ? 'น้ำลด' : 'ฟื้นฟู'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
          {currentDay.summary}
        </p>
      </div>

      {/* 3. 5 Key Milestones Quick-Pick Buttons */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-0.5">
          <span>จุดสังเกตเหตุการณ์สำคัญ (5 ช่วงเวลา):</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {KEY_MILESTONES.map((m) => {
            const isSelected = activeDayIndex === m.index;
            return (
              <button
                key={m.index}
                onClick={() => handleSelectMilestone(m.index)}
                className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-sky-400/40 scale-102'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`text-[10px] font-extrabold ${isSelected ? 'text-amber-300' : 'text-slate-900'}`}>
                  {m.day}
                </div>
                <div className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive 31-Day Timeline Scrubber */}
      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>เลื่อนดูการเปลี่ยนแปลง 31 วัน</span>
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-sky-700">
            {currentDay.displayDate}
          </span>
        </div>

        {/* Stepper + Slider Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStepDay(-1)}
            disabled={activeDayIndex <= 0}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs flex-shrink-0 cursor-pointer"
            title="ย้อนกลับ 1 วัน"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={activeDayIndex}
            onChange={(e) => {
              setIsPlayingTimeline(false);
              setActiveDayIndex(Number(e.target.value));
            }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 transition-all"
          />

          <button
            onClick={() => handleStepDay(1)}
            disabled={activeDayIndex >= FLOOD_TIMELINE_DATA.length - 1}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs flex-shrink-0 cursor-pointer"
            title="ไปข้างหน้า 1 วัน"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Bottom Controls: Play/Pause Time-Lapse & Speed */}
        <div className="flex items-center justify-between pt-1 text-[10px]">
          <button
            onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              isPlayingTimeline
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-500 hover:to-indigo-500'
            }`}
          >
            {isPlayingTimeline ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>หยุดเล่น</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>เล่น Time-Lapse (31 วัน)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPlaySpeed(playSpeed === 1 ? 2 : 1)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
              title="สลับความเร็วเล่นแอนิเมชัน"
            >
              {playSpeed}x
            </button>
            <button
              onClick={() => {
                setIsPlayingTimeline(false);
                setActiveDayIndex(0);
              }}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-0.5"
              title="รีเซ็ตกลับไปวันที่ 5 ก.ย."
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. MNDWI Flood Layer Toggle */}
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
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
          currentDay.affectedAreaRai > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {currentDay.affectedAreaRai > 0 ? `+${currentDay.affectedAreaRai} ไร่` : '0 ไร่'}
        </span>
      </div>

      {/* 6. Read Full Article Modal Button */}
      <button
        onClick={onOpenAnalysisModal}
        className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 border border-indigo-500/30"
      >
        <FileText className="w-3.5 h-3.5 text-amber-300" />
        <span>📖 อ่านบทวิเคราะห์สถานการณ์น้ำท่วม 2567 (ฉบับเต็ม)</span>
      </button>

      {/* 7. Open KOK Water Watch */}
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

      {/* 8. Focus Tha Ton */}
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
