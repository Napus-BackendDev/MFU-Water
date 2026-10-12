import React, { useState, useRef, useEffect } from 'react';
import { Compass, MapPin, Layers, ChevronRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { KOK_STUDY_AREAS, INITIAL_STUDY_AREA } from './mapAreaNavigation.js';

export function countSamplesForStudyArea(areaId, submissions = []) {
  if (!Array.isArray(submissions)) return 0;
  if (areaId === 'all') return submissions.length;
  const area = KOK_STUDY_AREAS.find(a => a.id === areaId);
  if (!area) return 0;
  const [targetLng, targetLat] = area.center;
  return submissions.filter(s => {
    const coords = s?.coordinates || [s?.longitude, s?.latitude];
    if (!coords || !Number.isFinite(Number(coords[0])) || !Number.isFinite(Number(coords[1]))) return false;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    const dLat = (lat - targetLat) * 111;
    const dLng = (lng - targetLng) * 111 * Math.cos(targetLat * Math.PI / 180);
    return Math.hypot(dLat, dLng) <= 18;
  }).length;
}

export default function MapAreaSidebar({
  area,
  onSelect,
  submissions = [],
  loading,
  error,
  resultCount,
  samplesError,
  samplesLoading,
  onRetrySamples,
  retryingSamples
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef(null);

  // Close dropdown on mobile when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const getBadge = (count) => {
    if (count == null || count === undefined || count === 0) return null;
    return (
      <span className="map-area-count" aria-label={`${count} รายการผลสำรวจ`}>
        {count}
      </span>
    );
  };

  const currentAreaId = area?.id || 'all';
  const activeArea = KOK_STUDY_AREAS.find(a => a.id === currentAreaId);
  const activeLabel = currentAreaId === 'all' ? 'ภาพรวม 4 เขตศึกษา' : (activeArea?.name || area?.label || '4 เขตพื้นที่ศึกษา');

  const handleSelectArea = (targetArea) => {
    onSelect(targetArea);
    setIsExpanded(false);
  };

  return (
    <aside
      ref={sidebarRef}
      className={`map-area-sidebar ${!isExpanded ? 'is-collapsed' : 'is-expanded'}`}
      aria-label="เลือกพื้นที่ศึกษาแม่น้ำกก"
    >
      <header
        onClick={() => setIsExpanded(prev => !prev)}
        className="map-area-sidebar-header cursor-pointer select-none"
        title={isExpanded ? 'ยุบเมนูพื้นที่' : 'แตะเพื่อเปลี่ยนพื้นที่ศึกษา'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(prev => !prev);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Compass size={17} className="text-emerald-600 shrink-0" />
          <div className="flex flex-col min-w-0 text-left">
            <strong className="map-area-desktop-title hidden md:inline truncate font-bold text-slate-800">
              4 เขตพื้นที่ศึกษา
            </strong>
            <strong className="map-area-mobile-title md:hidden truncate font-bold text-slate-900 text-[12px] leading-tight">
              {activeLabel}
            </strong>
            <span className="md:hidden text-[9.5px] text-slate-500 truncate leading-tight">
              {samplesLoading || resultCount == null ? 'กำลังโหลด…' : `${resultCount} จุดตรวจ · แตะเพื่อเปลี่ยน`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline text-[11px] text-slate-500 font-medium">
            {samplesLoading || resultCount == null
              ? 'กำลังโหลด…'
              : `${resultCount} จุดตรวจ`}
          </span>
          <div className="map-area-chevron md:hidden p-0.5 text-slate-400">
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </header>

      {samplesError && (
        <div className="map-area-error" role="alert">
          {typeof samplesError === 'string' ? samplesError : 'โหลดผลสำรวจไม่สำเร็จ'}
          <button type="button" onClick={onRetrySamples} disabled={retryingSamples}>
            {retryingSamples ? 'กำลังลองใหม่…' : 'ลองโหลดใหม่'}
          </button>
        </div>
      )}

      <div className="map-area-options">
        <span className="map-area-section-title">เลือกพื้นที่ติดตามคุณภาพน้ำ</span>

        {/* ปุ่มภาพรวมทั้ง 4 เขต */}
        <button
          type="button"
          className={`study-area-btn ${currentAreaId === 'all' ? 'is-active' : ''}`}
          onClick={() => handleSelectArea(INITIAL_STUDY_AREA)}
        >
          <Layers size={16} className="text-emerald-600 shrink-0" />
          <div className="study-area-info">
            <span className="study-area-title">ภาพรวม 4 เขตศึกษา</span>
            <small className="study-area-sub">ครอบคลุมลุ่มน้ำกกทั้งหมด</small>
          </div>
          {getBadge(submissions?.length ?? resultCount)}
          {currentAreaId === 'all' ? <Check size={14} className="text-emerald-600 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        </button>

        {/* รายการ 4 เขตพื้นที่ */}
        {KOK_STUDY_AREAS.map(item => {
          const isActive = currentAreaId === item.id;
          const count = countSamplesForStudyArea(item.id, submissions);
          return (
            <button
              type="button"
              key={item.id}
              className={`study-area-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectArea({ level: 'study-area', ...item })}
            >
              <MapPin size={16} className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              <div className="study-area-info">
                <span className="study-area-title">{item.label}</span>
                <small className="study-area-sub">{item.subtext}</small>
              </div>
              {getBadge(count)}
              {isActive ? <Check size={14} className="text-emerald-600 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
