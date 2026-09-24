import React from 'react';
import {
  Compass,
  Layers,
  Calendar,
  Droplets,
  Palette,
  Crosshair,
  FileText,
  Activity,
  Sparkles,
  Sliders,
  Eye,
  Info
} from 'lucide-react';

export default function MapControlSidebar({
  is3DMode,
  setIs3DMode,
  isHudOpen,
  setIsHudOpen,
  isTimelineOpen,
  setIsTimelineOpen,
  showMndwiWater,
  setShowMndwiWater,
  waterColorMode,
  setWaterColorMode,
  onFocusThaton,
  onOpenAnalysisModal,
  onOpenWaterWatch
}) {
  const tools = [
    {
      id: 'perspective',
      icon: Compass,
      isActive: is3DMode,
      onClick: () => setIs3DMode(!is3DMode),
      label: 'มุมมอง 3 มิติ (3D Terrain)',
      status: is3DMode ? 'เปิดใช้งาน (ภูมิประเทศ 3 มิติ)' : 'คลิกเพื่อสลับ 3 มิติ / 2 มิติ',
      badge: is3DMode ? '3D' : '2D',
      group: 'map'
    },
    {
      id: 'reset-camera',
      icon: Crosshair,
      isActive: false,
      onClick: onFocusThaton,
      label: 'รีเซ็ตมุมมองกึ่งกลาง',
      status: 'จัดกึ่งกลาง ต.ท่าตอน - แม่น้ำกก',
      badge: 'ท่าตอน',
      group: 'map'
    },
    {
      id: 'divider-1',
      isDivider: true
    },
    {
      id: 'timeline',
      icon: Calendar,
      isActive: isTimelineOpen,
      onClick: () => setIsTimelineOpen(!isTimelineOpen),
      label: 'ไทม์ไลน์ภาพดาวเทียม 31 วัน',
      status: isTimelineOpen ? 'กำลังเปิดแผงไทม์ไลน์' : '5 ก.ย. - 5 ต.ค. 2567',
      badge: '31 วัน',
      group: 'analysis'
    },
    {
      id: 'analysis-hud',
      icon: Layers,
      isActive: isHudOpen,
      onClick: () => setIsHudOpen(!isHudOpen),
      label: 'วิเคราะห์ดาวเทียม Sentinel-2',
      status: isHudOpen ? 'กำลังเปิดแผงสถิติ GEE' : 'จำแนก 4 โซน (Z1 - Z4)',
      badge: 'GEE',
      group: 'analysis'
    },
    {
      id: 'mndwi-water',
      icon: Droplets,
      isActive: showMndwiWater,
      onClick: () => setShowMndwiWater(!showMndwiWater),
      label: 'เลเยอร์จำแนกน้ำท่วม GEE',
      status: showMndwiWater ? 'แสดงผลผืนน้ำหลาก (+310 ไร่)' : 'MNDWI > 0.10',
      badge: showMndwiWater ? 'ON' : 'OFF',
      group: 'analysis'
    },
    {
      id: 'color-mode',
      icon: Palette,
      isActive: waterColorMode === 'mndwi',
      onClick: () => setWaterColorMode(waterColorMode === 'standard' ? 'mndwi' : 'standard'),
      label: 'โหมดสีภาพวิเคราะห์ดัชนี',
      status: waterColorMode === 'mndwi' ? 'ดัชนีผิวน้ำ (MNDWI Alert)' : 'สีจริงธรรมชาติ (True-Color)',
      badge: waterColorMode === 'mndwi' ? 'MNDWI' : 'RGB',
      group: 'analysis'
    },
    {
      id: 'divider-2',
      isDivider: true
    },
    {
      id: 'analysis-modal',
      icon: FileText,
      isActive: false,
      onClick: onOpenAnalysisModal,
      label: 'บทวิเคราะห์น้ำท่วม 2567',
      status: 'รายงานวิชาการ Sentinel-2 ฉบับเต็ม',
      badge: 'รายงาน',
      group: 'reports'
    },
    {
      id: 'water-watch',
      icon: Activity,
      isActive: false,
      onClick: onOpenWaterWatch,
      label: 'ระบบ KOK Water Watch',
      status: 'บันทึกและตรวจวัดคุณภาพน้ำ',
      badge: 'Water Watch',
      group: 'reports'
    }
  ];

  return (
    <aside
      aria-label="แผงเครื่องมือควบคุมการทำงานและวิเคราะห์ภาพถ่ายดาวเทียม"
      className="glass-panel-light p-1.5 md:p-2 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/90 backdrop-blur-md flex flex-col items-center gap-1 pointer-events-auto select-none"
    >
      {tools.map((tool) => {
        if (tool.isDivider) {
          return (
            <div
              key={tool.id}
              className="w-5 h-px bg-slate-200/80 my-1"
            />
          );
        }

        const Icon = tool.icon;
        const isActive = tool.isActive;

        return (
          <div key={tool.id} className="relative group">
            <button
              onClick={tool.onClick}
              aria-label={tool.label}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 relative ${
                isActive
                  ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/30 scale-105 ring-2 ring-sky-400/50'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-slate-100/90'
              }`}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />

              {/* จุด Active Dot เล็กๆ ที่มุมไอคอน */}
              {isActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Hover Tooltip Popout: เลื่อนลอยออกมาทางขวาเมื่อ Hover เมาส์ */}
            <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out z-50 whitespace-nowrap">
              <div className="relative bg-slate-900/95 text-white p-2.5 px-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
                
                {/* ลูกศรสามเหลี่ยมชี้กลับไปที่ไอคอน */}
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 border-l border-b border-slate-700/80 rotate-45" />

                <div className="relative z-10 flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {tool.label}
                      </span>
                      {tool.badge && (
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                      {tool.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
