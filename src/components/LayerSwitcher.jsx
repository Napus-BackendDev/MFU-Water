import React from 'react';
import { Layers, Mountain, MapPin, Eye, Satellite, Map as MapIcon, Route } from 'lucide-react';

export default function LayerSwitcher({
  activeLayer,
  setActiveLayer,
  terrainEnabled,
  setTerrainEnabled,
  showLandmarks,
  setShowLandmarks,
  showRiver,
  setShowRiver
}) {
  const baseLayers = [
    { id: 'satellite', label: 'ภาพถ่ายดาวเทียม', icon: Satellite, sub: 'ESRI HD' },
    { id: 'topo', label: 'แผนที่ภูมิประเทศ', icon: Mountain, sub: 'Topographic' },
    { id: 'street', label: 'แผนที่ถนน', icon: MapIcon, sub: 'OpenStreetMap' }
  ];

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4 w-full max-w-xs text-slate-100 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-700/60">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-sky-400" />
          เลเยอร์แผนที่ & การแสดงผล
        </h4>
      </div>

      {/* Base Layer Selection */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-400 font-medium">รูปแบบแผนที่พื้นฐาน (ฟรี 100%):</span>
        <div className="grid grid-cols-3 gap-1.5">
          {baseLayers.map((layer) => {
            const Icon = layer.icon;
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-medium leading-tight">{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-medium">องค์ประกอบ 3D:</span>

        {/* 3D Terrain Toggle */}
        <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:bg-slate-800/50">
          <span className="text-xs text-slate-300 flex items-center gap-2">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            มิติความสูง 3D Terrain
          </span>
          <input
            type="checkbox"
            checked={terrainEnabled}
            onChange={(e) => setTerrainEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-sky-500 focus:ring-0 accent-sky-400 cursor-pointer"
          />
        </label>

        {/* Landmarks Toggle */}
        <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:bg-slate-800/50">
          <span className="text-xs text-slate-300 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            จุดสำคัญ / ม.แม่ฟ้าหลวง
          </span>
          <input
            type="checkbox"
            checked={showLandmarks}
            onChange={(e) => setShowLandmarks(e.target.checked)}
            className="w-4 h-4 rounded text-sky-500 focus:ring-0 accent-sky-400 cursor-pointer"
          />
        </label>

        {/* River Toggle */}
        <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:bg-slate-800/50">
          <span className="text-xs text-slate-300 flex items-center gap-2">
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            เส้นทางสายน้ำแม่กก & กรณ์
          </span>
          <input
            type="checkbox"
            checked={showRiver}
            onChange={(e) => setShowRiver(e.target.checked)}
            className="w-4 h-4 rounded text-sky-500 focus:ring-0 accent-sky-400 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
