import React from 'react';
import { Layers, ShieldCheck, AlertTriangle, AlertCircle, Satellite, Mountain, Map as MapIcon, Globe, Sparkles } from 'lucide-react';
import { ARSENIC_STANDARDS } from '../data/riverAndVillagesData';

export default function ArsenicLegend({
  mapStyle,
  setMapStyle,
  geeLayer,
  setGeeLayer,
  geeConnected
}) {
  const styles = [
    { id: 'satellite', label: 'ดาวเทียม', icon: Satellite },
    { id: 'topo', label: 'ภูมิประเทศ', icon: Mountain },
    { id: 'street', label: 'แผนที่ถนน', icon: MapIcon }
  ];

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4 text-slate-100 space-y-3 w-full max-w-xs shadow-xl">
      {/* Legend Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/60">
        <h4 className="text-xs font-semibold text-slate-200">
          เกณฑ์มาตรฐานสารหนูในน้ำ (WHO)
        </h4>
      </div>

      {/* Legend Color Items */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-slate-200 text-[11px]">ปลอดภัย</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">&le; 10.0 µg/L</span>
        </div>

        <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span className="text-slate-200 text-[11px]">เฝ้าระวัง</span>
          </div>
          <span className="font-mono text-[10px] text-amber-400">10.1 - 20.0 µg/L</span>
        </div>

        <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span className="text-slate-200 text-[11px]">เกินเกณฑ์อันตราย</span>
          </div>
          <span className="font-mono text-[10px] text-rose-400">&gt; 20.0 µg/L</span>
        </div>
      </div>

      {/* Google Earth Engine API Section */}
      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            Google Earth Engine API
          </span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
            geeConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
          }`}>
            {geeConnected ? '● เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => setGeeLayer(geeLayer === 'sentinel' ? 'none' : 'sentinel')}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-medium border text-center transition-all ${
              geeLayer === 'sentinel'
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            🛰️ GEE Sentinel-2
          </button>

          <button
            onClick={() => setGeeLayer(geeLayer === 'ndwi' ? 'none' : 'ndwi')}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-medium border text-center transition-all ${
              geeLayer === 'ndwi'
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            💧 GEE ดัชนีผิวน้ำ
          </button>
        </div>
      </div>

      {/* Map Layer Switcher */}
      <div className="pt-2 border-t border-slate-800/80">
        <span className="text-[10px] text-slate-400 font-medium block mb-1.5">แผนที่พื้นฐาน:</span>
        <div className="grid grid-cols-3 gap-1">
          {styles.map((item) => {
            const Icon = item.icon;
            const isActive = mapStyle === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMapStyle(item.id)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mb-0.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
