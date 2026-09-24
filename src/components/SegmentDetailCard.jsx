import React from 'react';
import { X, Route, MapPin, Globe, Compass, Beaker, ArrowRight } from 'lucide-react';
import { ARSENIC_STANDARDS, getArsenicStatus } from '../data/riverAndVillagesData';

export default function SegmentDetailCard({ segment, onClose }) {
  if (!segment) return null;

  const status = getArsenicStatus(segment.arsenicAvg);
  const levelInfo = ARSENIC_STANDARDS.levels[status];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 w-full max-w-sm text-slate-100 space-y-3.5 border-sky-400/50 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {segment.countryName.split(' ')[0]}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {segment.provinceName}
            </span>
          </div>
          <h3 className="text-base font-bold text-white leading-tight mt-1">
            {segment.name}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Start -> End Stretch Badge */}
      <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-200">
        <div className="flex items-center gap-1.5 font-medium text-sky-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{segment.villageStart}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500" />
        <div className="flex items-center gap-1.5 font-medium text-sky-300">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>{segment.villageEnd}</span>
        </div>
      </div>

      {/* Stats Grid: Length & Arsenic */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Route className="w-3 h-3 text-cyan-400" />
            ระยะทางช่วงนี้
          </span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {segment.lengthKm} <span className="text-xs font-normal text-slate-400">กม.</span>
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border ${levelInfo.badgeClass}`}>
          <span className="text-[11px] opacity-80 flex items-center gap-1">
            <Beaker className="w-3 h-3 text-current" />
            สารหนูเฉลี่ย (As)
          </span>
          <span className="text-base font-bold mt-0.5 block">
            {segment.arsenicAvg} <span className="text-xs font-normal">µg/L</span>
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
        {segment.description}
      </p>
    </div>
  );
}
