import React from 'react';
import { X, Navigation, MapPin, Mountain, AlertCircle } from 'lucide-react';

export default function LandmarkCard({ landmark, onClose, onFlyTo }) {
  if (!landmark) return null;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 w-full max-w-sm text-slate-100 space-y-3 border-sky-500/40 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 mb-1">
            {landmark.category === 'education' ? '🎓 มหาวิทยาลัย' : landmark.category === 'critical_bridge' ? '🌉 สะพานสายหลัก' : landmark.category === 'infrastructure' ? '⚡ โครงสร้างชลประทาน' : landmark.category === 'recreation' ? '🏖️ พื้นที่ริมน้ำ' : '📍 จุดสังเกตการณ์'}
          </div>
          <h3 className="text-base font-bold text-white leading-tight">
            {landmark.name}
          </h3>
          <p className="text-xs text-slate-400">{landmark.nameEn}</p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            ระดับความสูงพื้นที่
          </span>
          <span className="font-semibold text-white mt-0.5 block">{landmark.elevation}</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            ระดับความเสี่ยงน้ำท่วม
          </span>
          <span className={`font-semibold mt-0.5 block capitalize ${
            landmark.riskLevel === 'low' ? 'text-emerald-400' :
            landmark.riskLevel === 'medium' ? 'text-amber-400' :
            landmark.riskLevel === 'high' ? 'text-orange-400' : 'text-rose-400'
          }`}>
            {landmark.riskLevel === 'low' ? 'ต่ำ (ปลอดภัย)' : landmark.riskLevel === 'medium' ? 'ปานกลาง' : landmark.riskLevel === 'high' ? 'สูง' : 'วิกฤตสูงสุด'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
        {landmark.description}
      </p>

      {/* Coordinates & Fly-To button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400 font-mono">
          {landmark.coordinates[1].toFixed(4)}°N, {landmark.coordinates[0].toFixed(4)}°E
        </span>

        <button
          onClick={() => onFlyTo(landmark)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-md shadow-sky-500/20 active:scale-95 transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
          บินชม 3D
        </button>
      </div>
    </div>
  );
}
