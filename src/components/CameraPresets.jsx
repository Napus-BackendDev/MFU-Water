import React from 'react';
import { Compass, GraduationCap, Building2, Dam, Eye } from 'lucide-react';
import { CAMERA_PRESETS } from '../data/landmarks';

export default function CameraPresets({ onSelectPreset, currentPresetId }) {
  const getIcon = (id) => {
    switch (id) {
      case 'overview':
        return <Compass className="w-4 h-4 text-sky-400" />;
      case 'mfu_campus':
        return <GraduationCap className="w-4 h-4 text-amber-400" />;
      case 'chiangrai_city':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'weir_gate':
        return <Dam className="w-4 h-4 text-cyan-400" />;
      case 'bird_eye':
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <Compass className="w-4 h-4" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4 w-full max-w-md text-slate-100 space-y-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-700/60">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-sky-400" />
          มุมมอง 3D (Camera Presets)
        </h4>
        <span className="text-[11px] text-slate-400">บินชมจุดสำคัญ</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {CAMERA_PRESETS.map((preset) => {
          const isActive = currentPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-sky-500/20 border-sky-400/80 shadow-md shadow-sky-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              } active:scale-95`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {getIcon(preset.id)}
                <span className={`text-xs font-medium ${isActive ? 'text-sky-300 font-semibold' : 'text-slate-200'}`}>
                  {preset.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 line-clamp-1">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
