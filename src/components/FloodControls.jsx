import React from 'react';
import { Waves, AlertTriangle, ShieldCheck, Flame, Droplets, Gauge } from 'lucide-react';

export default function FloodControls({ waterLevel, setWaterLevel, riskInfo }) {
  const quickPresets = [
    { label: 'ปกติ', level: 0.8, color: 'hover:border-emerald-500' },
    { label: 'เฝ้าระวัง', level: 2.2, color: 'hover:border-amber-500' },
    { label: 'ล้นตลิ่ง', level: 4.2, color: 'hover:border-orange-500' },
    { label: 'วิกฤต', level: 6.5, color: 'hover:border-rose-500' }
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 w-full max-w-md text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Waves className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base tracking-wide text-white">
              แบบจำลองระดับน้ำท่วม (3D)
            </h3>
            <p className="text-xs text-slate-400">ลุ่มน้ำแม่กก - เมืองเชียงราย</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${riskInfo.badgeClass}`}>
          {riskInfo.status === 'normal' && <ShieldCheck className="w-3.5 h-3.5" />}
          {riskInfo.status === 'watch' && <AlertTriangle className="w-3.5 h-3.5" />}
          {riskInfo.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
          {riskInfo.status === 'critical' && <Flame className="w-3.5 h-3.5 animate-bounce" />}
          {riskInfo.levelText}
        </div>
      </div>

      {/* Main Slider */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            ระดับน้ำจำลองเหนือระดับปกติ
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight" style={{ color: riskInfo.color }}>
              +{waterLevel.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">เมตร</span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="8"
          step="0.1"
          value={waterLevel}
          onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
        />

        <div className="flex justify-between text-[11px] text-slate-400">
          <span>0.0 m (ปกติ)</span>
          <span>3.0 m (ตลิ่งกก)</span>
          <span>5.0 m (วิกฤต 67)</span>
          <span>8.0 m (สูงสุด)</span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-xs text-slate-400 mr-1">ระดับด่วน:</span>
        {quickPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setWaterLevel(preset.level)}
            className={`flex-1 py-1 px-2 text-xs rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 transition-all ${preset.color} hover:bg-slate-700/60 active:scale-95`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Dynamic Key Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            ระดับจากระดับน้ำทะเล (รทก.)
          </div>
          <div className="text-sm font-semibold text-white mt-1">
            {(390.0 + waterLevel).toFixed(1)} <span className="text-[11px] font-normal text-slate-400">ม. (MSL)</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">อัตราการไหลประมาณการ</div>
          <div className="text-sm font-semibold text-white mt-1">
            {riskInfo.flowRateCms.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">m³/s</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">พื้นที่ท่วมคาดการณ์</div>
          <div className="text-sm font-semibold text-white mt-1">
            ~{riskInfo.floodAreaSqKm} <span className="text-[11px] font-normal text-slate-400">ตร.กม.</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">ประชากรในพื้นที่เสี่ยง</div>
          <div className="text-sm font-semibold text-white mt-1">
            ~{riskInfo.affectedPopulation.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">คน</span>
          </div>
        </div>
      </div>

      {/* Description & Advice */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5">
        <p className="text-slate-300 leading-relaxed">
          <strong className="text-white">สถานการณ์: </strong>
          {riskInfo.description}
        </p>
        <p className="text-slate-400 leading-relaxed border-t border-slate-800/60 pt-1.5">
          <strong className="text-amber-400">คำแนะนำ: </strong>
          {riskInfo.warningAdvice}
        </p>
      </div>
    </div>
  );
}
