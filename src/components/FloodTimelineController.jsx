import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Waves,
  AlertTriangle,
  Compass,
  Eye
} from 'lucide-react';
import { THATON_FLOOD_STAGES } from '../data/thatonFloodData';

export default function FloodTimelineController({
  floodStage,
  setFloodStage,
  isPlaying,
  setIsPlaying,
  is3DMode,
  setIs3DMode,
  onFocusThaton
}) {
  // หาข้อมูล stage ปัจจุบัน
  const currentInfo = THATON_FLOOD_STAGES.reduce((prev, curr) => {
    return Math.abs(curr.stage - floodStage) < Math.abs(prev.stage - floodStage) ? curr : prev;
  });

  return (
    <div className="glass-panel-light p-4 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-slate-800 space-y-3 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-sm">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              จำลองอาณาเขตน้ำท่วมแม่น้ำกก
            </h3>
            <p className="text-[11px] text-slate-500">
              ต.ท่าตอน &bull; บ้านท่าดอย อ.แม่อาย จ.เชียงใหม่
            </p>
          </div>
        </div>

        {/* 2D / 3D Toggle Button */}
        <button
          onClick={() => setIs3DMode(!is3DMode)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
            is3DMode
              ? 'bg-sky-600 text-white shadow-sky-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="สลับมุมมอง 3 มิติ / 2 มิติ"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{is3DMode ? '3D เปิดอยู่' : 'สลับ 3D'}</span>
        </button>
      </div>

      {/* Current Stage Indicator Banner */}
      <div className={`p-3 rounded-xl border transition-all ${
        floodStage === 0
          ? 'bg-sky-50 border-sky-200 text-sky-900'
          : floodStage < 75
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs flex items-center gap-1.5">
            {floodStage >= 50 && <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />}
            {currentInfo.label}
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border shadow-2xs">
            {floodStage}%
          </span>
        </div>
        <div className="text-[11px] text-slate-600 mt-1">
          {currentInfo.sublabel}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-xs text-center">
          <div className="bg-white/70 p-2 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-500 block">ระดับน้ำเพิ่มขึ้น:</span>
            <span className="font-bold text-slate-800 font-mono text-[11px]">{currentInfo.waterLevel}</span>
          </div>
          <div className="bg-white/70 p-2 rounded-xl border border-slate-200/60">
            <span className="text-[10px] text-slate-500 block">พื้นที่กินอาณาเขต:</span>
            <span className="font-bold text-slate-800 font-mono text-[11px]">
              {currentInfo.affectedAreaRai > 0 ? `~${currentInfo.affectedAreaRai} ไร่` : 'ในร่องน้ำปกติ'}
            </span>
          </div>
        </div>
      </div>


      {/* Timeline Slider & Play Controls */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>สภาพน้ำปกติ (0%)</span>
          <span className="font-semibold text-slate-700">ลำดับการเอ่อล้น</span>
          <span className="text-rose-600 font-semibold">น้ำท่วมสูงสุด (100%)</span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max="100"
          step="25"
          value={floodStage}
          onChange={(e) => {
            setFloodStage(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 transition-all"
        />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>หยุด</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>เล่นแอนิเมชัน</span>
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                setFloodStage(0);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all"
              title="รีเซ็ตกลับสู่สภาพน้ำปกติ"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump Buttons: ปกติ vs ท่วมสุด */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setFloodStage(0);
                setIsPlaying(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                floodStage === 0 ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              น้ำปกติ
            </button>
            <button
              onClick={() => {
                setFloodStage(100);
                setIsPlaying(false);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                floodStage === 100 ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ท่วมสูงสุด
            </button>
          </div>
        </div>
      </div>

      {/* Focus on Tha Ton / Tha Doi Button */}
      <button
        onClick={onFocusThaton}
        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
      >
        <Eye className="w-4 h-4 text-sky-400" />
        <span>ซูมเข้าสู่ ต.ท่าตอน &bull; บ้านท่าดอย (มุมมอง 3 มิติ)</span>
      </button>
    </div>
  );
}
