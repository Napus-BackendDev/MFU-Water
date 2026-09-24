import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Droplets,
  Eye,
  Camera,
  Activity,
  Flame,
  Search,
  Filter,
  RotateCcw
} from 'lucide-react';
import PPBTrendChart from './PPBTrendChart';

export default function StationDetailModal({
  hotspot,
  station, // Backward compatibility
  submissions = [],
  onClose,
  onSelectSample
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'safe' | 'watch' | 'danger'
  const [photoOnly, setPhotoOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days' | '3months' | '1year' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Normalize hotspot / cluster object
  const currentHotspot = hotspot || station;
  if (!currentHotspot) return null;

  const isCluster = currentHotspot.count >= 2 || currentHotspot.isHotspot;
  const items = currentHotspot.items || (currentHotspot.sample ? [currentHotspot.sample] : []);
  const photos = currentHotspot.photos || items.flatMap(it => it.images || []);

  const maxAs = currentHotspot.maxAs ?? 0;
  const avgAs = currentHotspot.avgAs ?? 0;
  const minAs = currentHotspot.minAs ?? 0;
  const isDanger = currentHotspot.isDanger ?? (maxAs > 50);
  const isWatch = currentHotspot.isWatch ?? (maxAs > 10 && !isDanger);
  const isSafe = !isDanger && !isWatch;

  // Filter items in this hotspot
  const filteredItems = items.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (item.collector?.name || '').toLowerCase();
      const code = (item.sample_code || '').toLowerCase();
      const org = (item.collector?.organization || '').toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !org.includes(q)) return false;
    }

    const asVal = item.measurements?.arsenic?.value;
    if (riskFilter === 'safe') {
      if (asVal === null || asVal > 10) return false;
    } else if (riskFilter === 'watch') {
      if (asVal === null || asVal <= 10 || asVal > 50) return false;
    } else if (riskFilter === 'danger') {
      if (asVal === null || asVal <= 50) return false;
    }

    if (photoOnly && (!item.images || item.images.length === 0)) return false;

    // ตัวกรองช่วงเวลา (Time Filter: เรทวัน + Quick Filter)
    if (startDate || endDate) {
      const itemDate = new Date(item.collection_time || 0);
      const itemTime = itemDate.getTime();
      if (!itemTime || isNaN(itemTime)) return false;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (itemTime < start.getTime()) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemTime > end.getTime()) return false;
      }
    } else if (timeFilter !== 'all') {
      const itemDate = new Date(item.collection_time || 0);
      const itemTime = itemDate.getTime();
      const now = Date.now();
      if (!itemTime || isNaN(itemTime)) return false;

      const diffMs = now - itemTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (timeFilter === 'today') {
        const today = new Date();
        const isSameDay = itemDate.getFullYear() === today.getFullYear() &&
                          itemDate.getMonth() === today.getMonth() &&
                          itemDate.getDate() === today.getDate();
        if (!isSameDay && diffHours > 24) return false;
      } else if (timeFilter === '7days') {
        if (diffDays > 7) return false;
      } else if (timeFilter === '30days' || timeFilter === '1month') {
        if (diffDays > 30) return false;
      } else if (timeFilter === '3months' || timeFilter === '2months') {
        if (diffDays > 90) return false;
      } else if (timeFilter === '1year') {
        if (diffDays > 365) return false;
      }
    }

    return true;
  });

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-5 pt-8 sm:pt-12 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden text-slate-800 shrink-0 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Hotspot Theme: Red & Gold) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#A6192E] to-[#801424] text-white flex items-start justify-between shrink-0 shadow-md">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isDanger 
                ? 'bg-rose-500/30 border border-rose-300 text-rose-200' 
                : isWatch 
                ? 'bg-amber-500/30 border border-amber-300 text-amber-200' 
                : 'bg-emerald-500/30 border border-emerald-300 text-emerald-200'
            }`}>
              {isCluster ? (
                <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
              ) : (
                <MapPin className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                  isCluster 
                    ? 'bg-amber-400 text-slate-900 shadow-sm' 
                    : 'bg-white/20 text-white'
                }`}>
                  {isCluster ? (
                    <>
                      <span>🔥 HOTSPOT CLUSTER</span>
                      <span className="bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full font-mono text-[9px]">
                        {currentHotspot.count} รายงาน
                      </span>
                    </>
                  ) : (
                    <span>📍 รายงานผลตรวจเดี่ยว (SINGLE POINT)</span>
                  )}
                </span>
                <span className="text-[11px] text-amber-200/90 font-mono">
                  รัศมีรวมกลุ่ม ~250 ม.
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold leading-tight mt-1 text-white">
                {currentHotspot.title || currentHotspot.locationName || 'ก้อนพิกัดตรวจวัดคุณภาพน้ำ'}
              </h3>
              <p className="text-xs text-rose-100/90 mt-0.5 flex items-center gap-1.5 font-mono">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  จุดกึ่งกลาง: {currentHotspot.coordinates ? `${Number(currentHotspot.coordinates[1]).toFixed(5)}, ${Number(currentHotspot.coordinates[0]).toFixed(5)}` : '-'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 ml-2"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[75vh]">
          {/* Section A: Aggregated Arsenic Metrics (ppb) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F7F5] border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#A6192E]" />
                ผลรวมการตรวจวัดสารหนูในก้อนนี้ (As หน่วย ppb)
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isDanger 
                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                  : isWatch 
                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {isDanger ? '⚠️ เกินเกณฑ์อันตราย (> 50 ppb)' : isWatch ? '⚠️ ระดับเฝ้าระวัง (11-50 ppb)' : '✅ ปลอดภัย (≤ 10 ppb)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={`p-3.5 rounded-2xl border ${
                isDanger 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : isWatch 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <span className="text-xs sm:text-sm block opacity-85 font-semibold">ค่าสูงสุด (Max)</span>
                <span className="text-2xl sm:text-3xl font-black font-mono">
                  {maxAs} <span className="text-sm font-sans font-bold">ppb</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700">
                <span className="text-xs sm:text-sm text-slate-500 block font-semibold">ค่าเฉลี่ย (Avg)</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800">
                  {avgAs} <span className="text-sm font-sans font-bold text-slate-500">ppb</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700">
                <span className="text-xs sm:text-sm text-slate-500 block font-semibold">ค่าต่ำสุด (Min)</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800">
                  {minAs} <span className="text-sm font-sans font-bold text-slate-500">ppb</span>
                </span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-[#A6192E]" />
                <span>ช่วงเวลาที่ตรวจวัด:</span>
              </span>
              <span className="font-mono text-slate-800 font-bold">
                {currentHotspot.timeRange?.start ? `${formatDateTime(currentHotspot.timeRange.start)} - ${formatDateTime(currentHotspot.timeRange.end)}` : '-'}
              </span>
            </div>
          </div>

          {/* กราฟข้อมูลทั้งหมดในช่วงเวลานั้นแบบขึ้นลงของค่า PPB */}
          <PPBTrendChart
            items={filteredItems}
            title="กราฟแนวโน้มขึ้น-ลงของค่าสารหนู (PPB) ในช่วงเวลานี้"
            isCompact={false}
          />

          {/* Section B: Attached Photos Gallery across all reports in this cluster */}
          {photos && photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#A6192E]" />
                  <span>ภาพถ่ายหลักฐานในก้อนนี้ ({photos.length} ภาพ)</span>
                </span>
                <span className="text-[10px] text-slate-400">คลิกที่ภาพเพื่อดูขนาดใหญ่</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((img, idx) => (
                  <div 
                    key={img.id || idx}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-2xs aspect-square bg-slate-100 cursor-pointer hover:border-[#A6192E] transition-all"
                    onClick={() => setSelectedPhoto(img.url)}
                  >
                    <img
                      src={img.url}
                      alt={img.title || 'หลักฐานภาพถ่าย'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Contributors & Submissions List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-[#A6192E]" />
                <span>
                  รายการผลตรวจที่รวบรวมในบริเวณนี้ {filteredItems.length !== items.length ? `(${filteredItems.length} จาก ${items.length} รายการ)` : `(${items.length} รายการ)`}
                </span>
              </h4>
              <span className="text-[10px] text-slate-400">
                เรียงตามเวลาบันทึกล่าสุด
              </span>
            </div>

            {/* Filter Chips for Submissions: เกณฑ์คุณภาพ + Quick Filter + เรทวัน */}
            {items.length > 0 && (
              <div className="space-y-3 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/90 text-sm">
                {/* แถวที่ 1: ตัวกรองเกณฑ์สารหนู */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 mr-1 flex items-center gap-1.5 shrink-0">
                    <Filter className="w-4 h-4 text-[#A6192E]" />
                    <span>เกณฑ์คุณภาพ:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRiskFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      riskFilter === 'all'
                        ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ทั้งหมด ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiskFilter('safe')}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      riskFilter === 'safe'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    ปลอดภัย (≤10 ppb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiskFilter('watch')}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      riskFilter === 'watch'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    เฝ้าระวัง (11-50 ppb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiskFilter('danger')}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      riskFilter === 'danger'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    เกินเกณฑ์ (&gt; 50 ppb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoOnly(p => !p)}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      photoOnly
                        ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    📷 มีรูปถ่าย
                  </button>
                </div>

                {/* แถวที่ 2: Quick Filter ช่วงเวลา */}
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/70">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 mr-1 flex items-center gap-1.5 shrink-0">
                    <Clock className="w-4 h-4 text-[#B4975A]" />
                    <span>Quick Filter:</span>
                  </span>
                  {[
                    { id: 'all', label: 'ทุกช่วงเวลา' },
                    { id: 'today', label: 'ในวันนี้' },
                    { id: '7days', label: '7 วัน' },
                    { id: '30days', label: '30 วัน (1 เดือน)' },
                    { id: '3months', label: '3 เดือน' },
                    { id: '1year', label: '1 ปี' }
                  ].map(qf => (
                    <button
                      key={qf.id}
                      type="button"
                      onClick={() => {
                        setTimeFilter(qf.id);
                        setStartDate('');
                        setEndDate('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                        timeFilter === qf.id && !startDate && !endDate
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {qf.label}
                    </button>
                  ))}
                </div>

                {/* แถวที่ 3: เรทวัน (Custom Date Range Picker) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/70">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-4 h-4 text-[#A6192E]" />
                      <span>เรทวัน (กำหนดช่วงวันเอง):</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">จาก:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setTimeFilter('custom');
                        }}
                        className="px-2.5 py-1 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-[#A6192E] shadow-2xs cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">ถึง:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setTimeFilter('custom');
                        }}
                        className="px-2.5 py-1 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-[#A6192E] shadow-2xs cursor-pointer"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setTimeFilter('all');
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        ล้างช่วงวัน
                      </button>
                    )}
                  </div>

                  {(riskFilter !== 'all' || photoOnly || timeFilter !== 'all' || startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRiskFilter('all');
                        setPhotoOnly(false);
                        setTimeFilter('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-xs sm:text-sm text-[#A6192E] hover:underline font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ล้างตัวกรองทั้งหมด</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List of submissions */}
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">ไม่พบรายงานที่ตรงกับช่วงเวลาหรือเกณฑ์ที่เลือก</p>
                <p className="text-[11px] text-slate-500">ลองสลับช่วงเวลาเป็น "ทุกช่วงเวลา" หรือปรับเกณฑ์คุณภาพน้ำ</p>
                <button
                  type="button"
                  onClick={() => {
                    setRiskFilter('all');
                    setPhotoOnly(false);
                    setTimeFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-1 px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#A6192E] hover:bg-slate-100 shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างตัวกรองทั้งหมด</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
              {filteredItems.map((item, idx) => {
                const asVal = item.measurements?.arsenic?.value;
                const itemDanger = asVal !== null && asVal > 50;
                const itemWatch = asVal !== null && asVal > 10 && asVal <= 50;
                const hasItemPhotos = item.images && item.images.length > 0;

                return (
                  <div
                    key={item.record_id || item.sample_code || idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#B4975A] hover:shadow-md transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                            {item.sample_code}
                          </span>
                          <span className="text-xs text-slate-400 font-mono font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 mt-1 font-bold">
                          <User className="w-4 h-4 text-[#A6192E] shrink-0" />
                          <span>{item.collector?.name || 'ไม่ระบุชื่อผู้เก็บ'}</span>
                          {item.collector?.organization && (
                            <span className="text-xs text-slate-400 font-normal">({item.collector.organization})</span>
                          )}
                        </div>
                      </div>

                      {/* Arsenic Badge in ppb */}
                      <div className={`px-3 py-1.5 rounded-xl text-sm sm:text-base font-mono font-black shrink-0 border shadow-2xs ${
                        itemDanger
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : itemWatch
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        As: {asVal !== null ? `${asVal} ppb` : '-'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 font-mono text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.coordinates ? `${item.coordinates[1].toFixed(4)}, ${item.coordinates[0].toFixed(4)}` : '-'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#A6192E]" />
                        <span>{formatDateTime(item.collection_time)}</span>
                      </div>
                    </div>

                    {item.sample_nature?.notes && (
                      <p className="text-xs sm:text-sm text-slate-700 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 font-medium">
                        &ldquo;{item.sample_nature.notes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {hasItemPhotos ? (
                          item.images.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt="รูปตรวจวัด"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 cursor-pointer hover:opacity-85 hover:scale-105 transition-all shadow-2xs"
                              onClick={() => setSelectedPhoto(img.url)}
                            />
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">ไม่มีรูปถ่ายแนบ</span>
                        )}
                      </div>

                      {onSelectSample && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSample(item);
                            onClose();
                          }}
                          className="text-[11px] text-[#A6192E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูรายละเอียดผลตรวจ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Photo */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img src={selectedPhoto} alt="หลักฐานภาพถ่าย" className="rounded-2xl max-h-[80vh] object-contain shadow-2xl" />
            <button 
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
