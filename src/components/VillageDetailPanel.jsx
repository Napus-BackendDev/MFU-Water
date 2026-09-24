import React from 'react';
import { X, Droplets, MapPin, AlertTriangle, ShieldCheck, Calendar, Info, Beaker } from 'lucide-react';
import { ARSENIC_STANDARDS, getArsenicStatus } from '../data/riverAndVillagesData';

export default function VillageDetailPanel({ village, onClose }) {
  if (!village) return null;

  const status = getArsenicStatus(village.arsenicValue);
  const levelInfo = ARSENIC_STANDARDS.levels[status];
  const standardLimit = ARSENIC_STANDARDS.safeLimit;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 w-full max-w-sm text-slate-100 space-y-3.5 border-sky-500/40 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium mb-0.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{village.district}, {village.provinceName}</span>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight">
            {village.name}
          </h3>
          <span className="text-xs text-slate-400">{village.moo} {village.subdistrict}</span>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Arsenic Measurement Box */}
      <div className={`p-3.5 rounded-xl border ${levelInfo.badgeClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-950/60 flex items-center justify-center">
            <Beaker className="w-5 h-5 text-current" />
          </div>
          <div>
            <div className="text-[11px] font-medium opacity-80">ระดับสารหนูในน้ำ (Arsenic - As)</div>
            <div className="text-xl font-bold leading-none mt-0.5">
              {village.arsenicValue} <span className="text-xs font-normal">µg/L</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold">{levelInfo.label.split(' ')[0]}</div>
          <div className="text-[10px] opacity-75">เกณฑ์ &le; 10 µg/L</div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Droplets className="w-3 h-3 text-cyan-400" />
            ประเภทแหล่งน้ำ
          </span>
          <span className="font-medium text-slate-200 mt-1 block leading-tight">
            {village.waterSourceType}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-400" />
            วันที่เก็บตัวอย่าง
          </span>
          <span className="font-medium text-slate-200 mt-1 block">
            {village.sampleDate}
          </span>
        </div>
      </div>

      {/* Monitoring Station Name */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-xs text-slate-300">
        <div className="text-[11px] text-slate-400 mb-0.5">สถานีตรวจวัด / จุดสังเกตการณ์:</div>
        <div className="font-medium text-white">{village.stationName}</div>
      </div>

      {/* Advisory Notes */}
      <div className="text-xs leading-relaxed text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mb-1">
          <Info className="w-3.5 h-3.5" />
          ข้อสังเกตและคำแนะนำ:
        </div>
        <p className="text-[11px] text-slate-300 leading-normal">{village.notes}</p>
      </div>

      {/* Coordinates footer */}
      <div className="text-[10px] text-slate-500 font-mono text-center">
        พิกัด GPS: {village.coordinates[1].toFixed(4)}°N, {village.coordinates[0].toFixed(4)}°E
      </div>
    </div>
  );
}
