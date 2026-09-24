import React from 'react';
import { Map, Compass, AlertCircle, ShieldCheck, Droplets, CheckCircle2, Globe, Layers, Navigation } from 'lucide-react';
import { PROVINCES_DATA, VILLAGE_POINTS, getArsenicStatus } from '../data/riverAndVillagesData';
import { RIVER_HIERARCHY_MODES, COUNTRY_COLORS, PROVINCE_COLORS } from '../data/riverSegmentsData';

export default function ProvinceSelector({
  selectedProvinceId,
  onSelectProvince,
  activeHierarchyMode,
  setActiveHierarchyMode
}) {
  const filteredVillages = selectedProvinceId === 'all'
    ? VILLAGE_POINTS
    : VILLAGE_POINTS.filter(v => v.provinceId === selectedProvinceId);

  const safeCount = filteredVillages.filter(v => getArsenicStatus(v.arsenicValue) === 'safe').length;
  const watchCount = filteredVillages.filter(v => getArsenicStatus(v.arsenicValue) === 'warning').length;
  const dangerCount = filteredVillages.filter(v => getArsenicStatus(v.arsenicValue) === 'danger').length;

  const avgArsenic = filteredVillages.length > 0
    ? (filteredVillages.reduce((sum, v) => sum + v.arsenicValue, 0) / filteredVillages.length).toFixed(1)
    : 0;

  const currentProvince = PROVINCES_DATA.find(p => p.id === selectedProvinceId) || PROVINCES_DATA[0];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 w-full max-w-sm text-slate-100 space-y-4 shadow-2xl">
      {/* 1. River Hierarchy Mode Selector (ประเทศ / จังหวัด / หมู่บ้าน) */}
      <div className="space-y-1.5 pb-2 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            การแยกเส้นทางสายน้ำ (Hierarchy)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          {RIVER_HIERARCHY_MODES.map((mode) => {
            const isActive = activeHierarchyMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveHierarchyMode(mode.id)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Legend color bar for current mode */}
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80 text-[11px] space-y-1 text-slate-300">
          {activeHierarchyMode === 'country' && (
            <div className="flex items-center justify-around">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: COUNTRY_COLORS.myanmar }}></span>
                🇲🇲 เมียนมา (ต้นน้ำ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: COUNTRY_COLORS.thailand }}></span>
                🇹🇭 ประเทศไทย
              </span>
            </div>
          )}

          {activeHierarchyMode === 'province' && (
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: PROVINCE_COLORS.myanmar }}></span>
                พม่า
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: PROVINCE_COLORS.chiangmai }}></span>
                จ.เชียงใหม่
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: PROVINCE_COLORS.chiangrai }}></span>
                จ.เชียงราย
              </span>
            </div>
          )}

          {activeHierarchyMode === 'village' && (
            <div className="text-center text-slate-400 text-[10px]">
              ✨ เส้นสายน้ำถูกแบ่งเป็น 14 ช่วงหมู่บ้าน (คลิกที่เส้นบนแผนที่เพื่อดูข้อมูล)
            </div>
          )}
        </div>
      </div>

      {/* 2. Province Filter Selector */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          ซูมตามพื้นที่จังหวัด
        </span>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {PROVINCES_DATA.map((prov) => {
            const isActive = selectedProvinceId === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => onSelectProvince(prov.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {prov.id === 'all' ? '🌐 ภาพรวม' : prov.name.replace('จังหวัด', 'จ.')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Province Summary Details */}
      <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sky-300">{currentProvince.name}</span>
          {currentProvince.section && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {currentProvince.section}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          {currentProvince.summary}
        </p>
        {currentProvince.districts && (
          <p className="text-slate-300 text-[11px] pt-1 border-t border-slate-800/60">
            <strong>อำเภอที่ผ่าน:</strong> {currentProvince.districts}
          </p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-400">
          สถิติการตรวจสารหนูในพื้นที่ ({filteredVillages.length} จุดตรวจ):
        </span>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2">
            <div className="text-emerald-400 font-bold text-sm sm:text-base">{safeCount}</div>
            <div className="text-[10px] text-emerald-300/80">ปลอดภัย</div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2">
            <div className="text-amber-400 font-bold text-sm sm:text-base">{watchCount}</div>
            <div className="text-[10px] text-amber-300/80">เฝ้าระวัง</div>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-2">
            <div className="text-rose-400 font-bold text-sm sm:text-base">{dangerCount}</div>
            <div className="text-[10px] text-rose-300/80">เกินเกณฑ์</div>
          </div>

          <div className="bg-sky-950/30 border border-sky-500/30 rounded-lg p-2">
            <div className="text-sky-400 font-bold text-sm sm:text-base">{avgArsenic}</div>
            <div className="text-[10px] text-sky-300/80">เฉลี่ย µg/L</div>
          </div>
        </div>
      </div>
    </div>
  );
}
