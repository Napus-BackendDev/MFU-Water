import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Droplets,
  Database,
  ArrowLeft,
  List,
  MapPin,
  Camera,
  Calendar,
  Download,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Flame,
  RotateCcw,
  Clock,
  Filter
} from 'lucide-react';
import WaterWatchMap from './WaterWatchMap';
import WaterWatchForm from './WaterWatchForm';
import WaterWatchSampleDetail from './WaterWatchSampleDetail';
import StationDetailModal from './StationDetailModal';
import { 
  getStoredSubmissions, 
  saveNewSubmission, 
  INITIAL_SUBMISSIONS,
  resetStoredSubmissions,
  normalizeSubmission
} from '../../data/waterWatchData';
import { 
  fetchSamplesFromSupabase, 
  deleteSampleFromSupabase,
  subscribeToNewSamples,
  getSupabaseCredentials, 
  isSupabaseConfigured 
} from '../../lib/supabase';

// ตัวเลือกช่วงเวลาสำหรับฟิลเตอร์ขนาดใหญ่
const TIME_FILTER_OPTIONS = [
  { id: 'all', label: 'ทั้งหมด', fullLabel: 'ทุกช่วงเวลา (ทั้งหมด)', desc: 'แสดงจุดตรวจวัดทั้งหมดทุกช่วงเวลา', group: 'all' },
  { id: 'today', label: 'วันนี้ (24 ชม.)', fullLabel: 'วันนี้ (24 ชม. ล่าสุด)', desc: 'ผลตรวจย้อนหลังไม่เกิน 24 ชั่วโมง', group: 'daily' },
  { id: '7days', label: '7 วันล่าสุด', fullLabel: '7 วันล่าสุด (รายสัปดาห์)', desc: 'ผลตรวจในรอบ 7 วันที่ผ่านมา', group: 'daily' },
  { id: 'month', label: 'เดือนนี้ (30 วัน)', fullLabel: 'เดือนนี้ (30 วันล่าสุด)', desc: 'ผลตรวจในรอบ 30 วันที่ผ่านมา', group: 'monthly' },
  { id: '3months', label: '3 เดือนล่าสุด', fullLabel: '3 เดือนล่าสุด (ไตรมาส)', desc: 'ผลตรวจในรอบ 90 วันที่ผ่านมา', group: 'monthly' },
  { id: 'year', label: 'ปีนี้ (2026)', fullLabel: 'ปีนี้ (2026)', desc: 'ข้อมูลที่บันทึกในปี 2026', group: 'yearly' },
  { id: '1year', label: 'ย้อนหลัง 1 ปี', fullLabel: 'ย้อนหลัง 1 ปี (365 วัน)', desc: 'ผลตรวจย้อนหลัง 1 ปีเต็ม', group: 'yearly' },
  { id: 'custom', label: 'กำหนดวันเอง', fullLabel: 'กำหนดช่วงวันเอง (Custom)', desc: 'ระบุวันเริ่มต้นและสิ้นสุดตามต้องการ', group: 'custom' }
];

// ตรวจสอบว่า collection_time ของแต่ละรายการอยู่ในช่วงเวลาที่กำหนดหรือไม่
function isWithinTimeRange(dateStr, filter, customStart, customEnd, allSubmissions = []) {
  try {
    if (!filter || filter === 'all') return true;
    if (!dateStr) return true;
    const targetDate = new Date(dateStr);
    const targetTime = targetDate.getTime();
    if (isNaN(targetTime)) return true;

    // หา Reference Time: วันที่บันทึกล่าสุดในชุดข้อมูล หรือเวลาปัจจุบัน
    let maxDataTime = Date.now();
    if (Array.isArray(allSubmissions)) {
      for (const s of allSubmissions) {
        if (s && s.collection_time) {
          const t = new Date(s.collection_time).getTime();
          if (!isNaN(t) && t > maxDataTime) maxDataTime = t;
        }
      }
    }
    const refTime = maxDataTime;
    const refDate = new Date(refTime);

    const ONE_HOUR = 3600 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;

    switch (filter) {
      case 'today': {
        const isSameDay = 
          targetDate.getFullYear() === refDate.getFullYear() &&
          targetDate.getMonth() === refDate.getMonth() &&
          targetDate.getDate() === refDate.getDate();
        return isSameDay || targetTime >= (refTime - ONE_DAY);
      }
      case '7days':
        return targetTime >= (refTime - 7 * ONE_DAY);
      case 'month': {
        const isSameMonth = 
          targetDate.getFullYear() === refDate.getFullYear() &&
          targetDate.getMonth() === refDate.getMonth();
        return isSameMonth || targetTime >= (refTime - 30 * ONE_DAY);
      }
      case '3months':
        return targetTime >= (refTime - 90 * ONE_DAY);
      case 'year': {
        const refYear = refDate.getFullYear();
        const targetYear = targetDate.getFullYear();
        return targetYear === refYear;
      }
      case '1year':
        return targetTime >= (refTime - 365 * ONE_DAY);
      case 'custom': {
        let valid = true;
        if (customStart) {
          const startT = new Date(customStart + 'T00:00:00').getTime();
          if (!isNaN(startT) && targetTime < startT) valid = false;
        }
        if (customEnd) {
          const endT = new Date(customEnd + 'T23:59:59.999').getTime();
          if (!isNaN(endT) && targetTime > endT) valid = false;
        }
        return valid;
      }
      default:
        return true;
    }
  } catch (err) {
    console.warn('isWithinTimeRange error:', err);
    return true;
  }
}

export default function KokWaterWatchView({ onBackToFloodSim }) {
  const [submissions, setSubmissions] = useState(getStoredSubmissions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isMapPopupActive, setIsMapPopupActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Time Filter State (ตัวกรองระยะเวลาขนาดใหญ่)
  const [timeFilter, setTimeFilter] = useState('all');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const timeFilterContainerRef = useRef(null);

  // Close search and time filter dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
      if (timeFilterContainerRef.current && !timeFilterContainerRef.current.contains(event.target)) {
        setIsTimeFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Supabase Config State
  const initialCreds = getSupabaseCredentials();
  const [spUrl, setSpUrl] = useState(initialCreds.url);
  const [spAnonKey, setSpAnonKey] = useState(initialCreds.anonKey);
  const [spConnected, setSpConnected] = useState(isSupabaseConfigured());
  const [isSyncing, setIsSyncing] = useState(false);

  // โหลดข้อมูลล่าสุดจาก Supabase เมื่อเริ่มต้น
  useEffect(() => {
    async function loadRemoteSamples() {
      if (isSupabaseConfigured()) {
        setIsSyncing(true);
        const data = await fetchSamplesFromSupabase();
        if (data && Array.isArray(data)) {
          const normalizedData = data.map(d => normalizeSubmission(d)).filter(Boolean);
          const realCodes = new Set(normalizedData.map(d => d.sample_code));
          const merged = [...normalizedData, ...INITIAL_SUBMISSIONS.filter(init => !realCodes.has(init.sample_code))];
          setSubmissions(merged);
        }
        setIsSyncing(false);
      }
    }
    loadRemoteSamples();
  }, [spConnected]);

  // ฟังก์ชันสลับตัวกรองช่วงเวลา พร้อมล้างสถานะหมุดที่เลือกค้างไว้
  const handleSelectTimeFilter = (filterId) => {
    setTimeFilter(filterId);
    setSelectedSample(null);
    setSelectedHotspot(null);
    setIsTimeFilterOpen(false);
  };

  // รีเซ็ตข้อมูลตัวอย่างทั้งหมดกลับเป็นชุดเริ่มต้นล่าสุด
  const handleResetAllData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างคุณภาพน้ำกลับเป็นชุดเริ่มต้นล่าสุด 16 จุดหรือไม่?')) {
      const fresh = resetStoredSubmissions();
      setSubmissions(fresh);
      setTimeFilter('all');
      setCustomStartDate('');
      setCustomEndDate('');
      setSelectedSample(null);
      setSelectedHotspot(null);
      setIsTimeFilterOpen(false);
    }
  };

  // Realtime Listener สำหรับดักจับข้อมูลใหม่ที่อาสาสมัครกรอกเข้ามาแบบสดๆ
  useEffect(() => {
    const unsubscribe = subscribeToNewSamples((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const row = payload.new;
        const newRecord = {
          record_id: row.id || row.sample_code,
          sample_code: row.sample_code,
          schema_version: '1.0',
          station_id: row.station_id || 'COORDINATE-POINT',
          station_name: row.station_name,
          coordinates: [row.longitude, row.latitude],
          collection_time: row.collection_time,
          gps_accuracy_meters: row.gps_accuracy_meters,
          entry_type: row.entry_type,
          collector: row.collector,
          sample_nature: row.sample_nature,
          measurements: row.measurements,
          images: row.images || [],
          status: row.status,
          sync_stage: row.sync_stage
        };
        setSubmissions(prev => {
          if (prev.some(s => s.sample_code === newRecord.sample_code)) return prev;
          return [newRecord, ...prev];
        });
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setSubmissions(prev => prev.filter(s => s.record_id !== payload.old.id && s.sample_code !== payload.old.sample_code));
      }
    });

    return () => unsubscribe();
  }, [spConnected]);

  const handleDeleteSample = async (sampleCode) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบตัวอย่าง "${sampleCode}" ออกจากระบบ?`)) {
      await deleteSampleFromSupabase(sampleCode);
      setSubmissions(prev => prev.filter(s => s.sample_code !== sampleCode));
      setSelectedSample(null);
    }
  };

  const handleSaveSupabaseConfig = async () => {
    localStorage.setItem('kok_supabase_url', spUrl.trim());
    localStorage.setItem('kok_supabase_anon_key', spAnonKey.trim());
    const configured = isSupabaseConfigured();
    setSpConnected(configured);
    if (configured) {
      setIsSyncing(true);
      const data = await fetchSamplesFromSupabase();
      if (data && data.length > 0) {
        setSubmissions(data);
      }
      setIsSyncing(false);
      alert('เชื่อมต่อ Supabase สำเร็จ! โหลดข้อมูลล่าสุดเรียบร้อย');
    } else {
      alert('บันทึกการตั้งค่าแล้ว (ยังไม่ได้เปิดใช้ Supabase โหมดสมบูรณ์)');
    }
  };

  const handleExportCSV = () => {
    if (!timeFilteredSubmissions || !timeFilteredSubmissions.length) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออกในช่วงเวลาที่เลือก');
      return;
    }
    const headers = [
      'รหัสตัวอย่าง (sample_code)',
      'ชื่อจุดตรวจ/พิกัด (location_name)',
      'ละติจูด (latitude)',
      'ลองจิจูด (longitude)',
      'วันเวลาที่เก็บ (collection_time)',
      'ผู้เก็บตัวอย่าง (collector_name)',
      'หน่วยงาน (organization)',
      'แหล่งน้ำ (water_source)',
      'ลักษณะน้ำ (appearance)',
      'สารหนู_ppb (arsenic)',
      'ค่า_pH (ph)',
      'ความขุ่น_NTU (turbidity)',
      'อุณหภูมิ_C (temperature)',
      'จำนวนรูปถ่าย (photo_count)',
      'ลิงก์ภาพถ่าย (photo_urls)'
    ];

    const rows = timeFilteredSubmissions.map(s => [
      `"${s.sample_code}"`,
      `"${(s.station_name || '').replace(/"/g, '""')}"`,
      s.coordinates?.[1] || '',
      s.coordinates?.[0] || '',
      `"${s.collection_time || ''}"`,
      `"${(s.collector?.name || '').replace(/"/g, '""')}"`,
      `"${(s.collector?.organization || '').replace(/"/g, '""')}"`,
      `"${(s.sample_nature?.water_source || '').replace(/"/g, '""')}"`,
      `"${(s.sample_nature?.water_appearance || '').replace(/"/g, '""')}"`,
      s.measurements?.arsenic?.value ?? '',
      s.measurements?.ph?.value ?? '',
      s.measurements?.turbidity?.value ?? '',
      s.measurements?.temperature?.value ?? '',
      s.images?.length || 0,
      `"${(s.images || []).map(img => img.url).join(' | ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KOK_Water_Watch_${timeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateNewSample = (newSample) => {
    const updated = saveNewSubmission(newSample);
    setSubmissions(updated);
    setIsFormOpen(false);
    setSelectedHotspot(null);
    setSelectedSample(newSample);
    if (newSample.coordinates) {
      setFocusCoords(newSample.coordinates);
    }
  };

  const totalSamples = Array.isArray(submissions) ? submissions.length : 0;

  // คำนวณจำนวนจุดตรวจวัดที่ตรงกับแต่ละ Filter Option เพื่อแสดงในเมนู Dropdown
  const filterCounts = useMemo(() => {
    try {
      const counts = {};
      const list = Array.isArray(submissions) ? submissions : [];
      for (const opt of TIME_FILTER_OPTIONS) {
        if (opt.id === 'all') {
          counts[opt.id] = list.length;
        } else {
          counts[opt.id] = list.filter(s => 
            s && isWithinTimeRange(s.collection_time, opt.id, customStartDate, customEndDate, list)
          ).length;
        }
      }
      return counts;
    } catch (err) {
      console.warn('filterCounts error:', err);
      return {};
    }
  }, [submissions, customStartDate, customEndDate]);

  // จุดตรวจที่ผ่านการกรองช่วงเวลา (Time Filtered Submissions)
  const timeFilteredSubmissions = useMemo(() => {
    try {
      const list = Array.isArray(submissions) ? submissions : [];
      if (!timeFilter || timeFilter === 'all') return list;
      return list.filter(sub => 
        sub && isWithinTimeRange(sub.collection_time, timeFilter, customStartDate, customEndDate, list)
      );
    } catch (err) {
      console.warn('timeFilteredSubmissions error:', err);
      return Array.isArray(submissions) ? submissions : [];
    }
  }, [submissions, timeFilter, customStartDate, customEndDate]);

  // หาตัวเลือกฟิลเตอร์ปัจจุบัน
  const activeFilterOption = useMemo(() => {
    return TIME_FILTER_OPTIONS.find(o => o.id === timeFilter) || TIME_FILTER_OPTIONS[0] || {
      id: 'all',
      label: 'ทั้งหมด',
      fullLabel: 'ทุกช่วงเวลา (ทั้งหมด)'
    };
  }, [timeFilter]);

  // ค้นหาเฉพาะในชุดที่ผ่านการกรองช่วงเวลาแล้ว
  const filteredSubmissions = useMemo(() => {
    try {
      const list = Array.isArray(timeFilteredSubmissions) ? timeFilteredSubmissions : [];
      return list.filter(sub => {
        if (!sub) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const code = (sub.sample_code || '').toLowerCase();
        const st = (sub.station_name || '').toLowerCase();
        const collector = (sub.collector?.name || '').toLowerCase();
        const waterSource = (sub.sample_nature?.water_source || '').toLowerCase();
        const asVal = sub.measurements?.arsenic?.value !== undefined ? String(sub.measurements?.arsenic?.value) : '';
        return code.includes(q) || st.includes(q) || collector.includes(q) || waterSource.includes(q) || asVal.includes(q);
      });
    } catch (err) {
      console.warn('filteredSubmissions error:', err);
      return Array.isArray(timeFilteredSubmissions) ? timeFilteredSubmissions : [];
    }
  }, [timeFilteredSubmissions, searchQuery]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F8F7F5] font-['Prompt',sans-serif] text-[#242424]">
      {/* 1. Top Navigation Bar (ขาว 80% • แดง 20% • แต่งขอบทอง) */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[#B4975A]/40 shadow-sm px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#A6192E] flex items-center justify-center text-white shadow-md border border-[#B4975A] shrink-0">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                  KOK Water Watch
                </h1>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden xl:block whitespace-nowrap">
                ระบบเก็บข้อมูลและเฝ้าระวังคุณภาพน้ำแม่น้ำกก &bull; ทีมทดลองภาคสนาม
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search Bar & Large Time Range Filter (อยู่ข้างๆ กัน) */}
        <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-sm sm:max-w-xl md:max-w-2xl min-w-0">
          {/* Search Bar */}
          <div ref={searchContainerRef} className="flex-1 max-w-[150px] sm:max-w-xs md:max-w-sm relative min-w-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาจุดตรวจ, รหัส KOK..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white rounded-full sm:rounded-xl border border-slate-200 focus:border-[#A6192E] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#A6192E]/20 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchDropdownOpen(false);
                  }}
                  className="absolute right-2 sm:right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearchDropdownOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>ผลการค้นหา ({filteredSubmissions.length})</span>
                  <span className="text-[10px]">แตะเพื่อไปยังจุดตรวจ</span>
                </div>
                {filteredSubmissions.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    ไม่พบจุดตรวจที่ตรงกับ "{searchQuery}"
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {filteredSubmissions.slice(0, 6).map((sub) => {
                        const asVal = sub.measurements?.arsenic?.value;
                        const asColor = sub.measurements?.arsenic?.color || '#DE9922';
                        return (
                          <div
                            key={sub.record_id || sub.sample_code}
                            onClick={() => {
                              setSelectedHotspot(null);
                              setSelectedSample(sub);
                              setFocusCoords(sub.coordinates);
                              setIsSearchDropdownOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-rose-50/60 cursor-pointer transition-colors flex items-center justify-between gap-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                  style={{ backgroundColor: asColor }}
                                />
                                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                  {sub.station_name || sub.sample_code}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                รหัส: {sub.sample_code} &bull; ผู้ตรวจ: {sub.collector?.name || '-'}
                              </div>
                            </div>
                            {asVal !== null && asVal !== undefined && (
                              <div className="shrink-0 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
                                  asVal > 50 ? 'bg-red-100 text-red-700' : asVal > 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {asVal} ppb
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {filteredSubmissions.length > 6 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          setIsListDrawerOpen(true);
                        }}
                        className="w-full py-2 text-center text-xs font-bold text-[#A6192E] hover:bg-red-50/80 transition-colors border-t border-slate-100 cursor-pointer"
                      >
                        ดูผลการค้นหาทั้งหมด ({filteredSubmissions.length} จุด) &rarr;
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Large Time Range Filter Selector (ตัวกรองระยะเวลาขนาดใหญ่ข้าง Search) */}
          <div ref={timeFilterContainerRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full sm:rounded-xl border transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs select-none ${
                timeFilter !== 'all'
                  ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-[#A6192E] text-[#A6192E] ring-2 ring-[#A6192E]/20 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200/90 border-slate-200 text-slate-700 font-medium'
              }`}
              title="ฟิลเตอร์ระยะเวลาข้อมูลจุดตรวจวัดบนแผนที่ (วัน/เดือน/ปี/กำหนดเอง)"
            >
              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${timeFilter !== 'all' ? 'text-[#A6192E]' : 'text-slate-500'}`} />
              
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <span className="hidden lg:inline text-slate-400 font-normal">ช่วงเวลา:</span>
                <span className="font-bold truncate max-w-[85px] sm:max-w-[125px] md:max-w-none">
                  {activeFilterOption.label}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] sm:text-[11px] font-bold ${
                  timeFilter !== 'all' ? 'bg-[#A6192E] text-white shadow-2xs' : 'bg-slate-200 text-slate-700'
                }`}>
                  {timeFilteredSubmissions.length} จุด
                </span>
              </div>

              {timeFilter !== 'all' ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimeFilter('all');
                  }}
                  className="p-0.5 rounded-full hover:bg-rose-200/80 text-[#A6192E] transition-colors ml-0.5"
                  title="ล้างตัวกรองช่วงเวลา"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              ) : (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isTimeFilterOpen ? 'rotate-180 text-[#A6192E]' : ''
                }`} />
              )}
            </button>

            {/* Large Time Filter Dropdown / Popover Modal */}
            {isTimeFilterOpen && (
              <div className="absolute top-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-1.5 w-80 sm:w-96 max-w-[95vw] bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-[#B4975A]/50 py-3 px-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left font-['Prompt',sans-serif]">
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#A6192E]/10 flex items-center justify-center text-[#A6192E]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        ตัวกรองช่วงเวลาตรวจวัด
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        กรองจุดบนแผนที่และกลุ่ม Hotspot ทันที
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTimeFilterOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Options Grouped */}
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
                  {/* Quick Select: All */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSelectTimeFilter('all')}
                      className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between border cursor-pointer ${
                        timeFilter === 'all'
                          ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌐</span>
                        <div>
                          <div className="text-xs font-bold leading-tight">ทุกช่วงเวลา (ทั้งหมด)</div>
                          <div className={`text-[10px] ${timeFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>
                            แสดงจุดตรวจวัดทั้งหมดในระบบ
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        timeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {filterCounts.all || totalSamples} จุด
                      </span>
                    </button>
                  </div>

                  {/* 1. รายวัน (Daily) */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                      <span>☀️ รายวัน / ล่าสุด (Daily)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_FILTER_OPTIONS.filter(o => o.group === 'daily').map((opt) => {
                        const isSelected = timeFilter === opt.id;
                        const count = filterCounts[opt.id] || 0;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectTimeFilter(opt.id)}
                            className={`p-2 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                                : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="text-xs font-bold truncate">{opt.label}</div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                                {opt.id === 'today' ? '24 ชม.' : '7 วัน'}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded-md font-mono font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {count} จุด
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. รายเดือน (Monthly) */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                      <span>🗓️ รายเดือน / ไตรมาส (Monthly)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_FILTER_OPTIONS.filter(o => o.group === 'monthly').map((opt) => {
                        const isSelected = timeFilter === opt.id;
                        const count = filterCounts[opt.id] || 0;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectTimeFilter(opt.id)}
                            className={`p-2 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                                : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="text-xs font-bold truncate">{opt.label}</div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                                {opt.id === 'month' ? '30 วัน' : '90 วัน'}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded-md font-mono font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {count} จุด
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. รายปี (Yearly) */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                      <span>📅 รายปี (Yearly)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_FILTER_OPTIONS.filter(o => o.group === 'yearly').map((opt) => {
                        const isSelected = timeFilter === opt.id;
                        const count = filterCounts[opt.id] || 0;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectTimeFilter(opt.id)}
                            className={`p-2 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                                : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="text-xs font-bold truncate">{opt.label}</div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                                {opt.id === 'year' ? 'ปีนี้' : '365 วัน'}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded-md font-mono font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {count} จุด
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. กำหนดช่วงวันเอง (Custom Date Range) */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span>⚙️</span>
                        <span>กำหนดช่วงวันเอง</span>
                      </span>
                      {timeFilter === 'custom' && (
                        <span className="text-[10px] text-[#A6192E] font-bold bg-rose-100 px-2 py-0.2 rounded-full">
                          ใช้งานอยู่ ({filterCounts.custom || 0} จุด)
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">วันที่เริ่มต้น</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#A6192E]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">วันที่สิ้นสุด</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#A6192E]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectTimeFilter('custom')}
                      className="w-full py-1.5 bg-[#A6192E] hover:bg-[#851424] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ใช้งานช่วงวันที่กำหนด</span>
                    </button>
                  </div>
                </div>

                {/* Footer Info & Reset */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      แสดงผล <strong className="text-[#A6192E]">{timeFilteredSubmissions.length}</strong> จาก {totalSamples} จุด
                    </span>
                    {timeFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTimeFilter('all');
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="text-xs text-[#A6192E] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>รีเซ็ตเป็นทั้งหมด</span>
                      </button>
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>ข้อมูลอัปเดตตอบสนองแผนที่ทันที</span>
                    <button
                      type="button"
                      onClick={handleResetAllData}
                      className="text-slate-400 hover:text-[#A6192E] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นชุดเริ่มต้นล่าสุด"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>รีเซ็ตข้อมูลตัวอย่างทั้งหมด</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="ส่งออกข้อมูลเป็นไฟล์ Excel (.csv)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">ส่งออก Excel</span>
          </button>

          <button
            onClick={() => setIsListDrawerOpen(!isListDrawerOpen)}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
            title="เปิดดูรายการตัวอย่างที่บันทึกไว้"
          >
            <List className="w-4 h-4 text-[#A6192E]" />
            <span className="hidden sm:inline">
              รายการ ({timeFilteredSubmissions.length}{timeFilter !== 'all' ? `/${totalSamples}` : ''})
            </span>
          </button>
        </div>
      </header>

      {/* 2. Interactive Map (Full Screen) */}
      <div className="absolute inset-0 pt-14 z-0">
        <WaterWatchMap
          submissions={timeFilteredSubmissions}
          selectedSample={selectedSample}
          onSelectSample={(s) => setSelectedSample(s)}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={(hs) => setSelectedHotspot(hs)}
          focusCoords={focusCoords}
          onPopupChange={(hs) => setIsMapPopupActive(!!hs)}
        />
      </div>

      {/* 3. Floating Navigation & Legend (ซ้ายล่าง) */}
      <div className={`absolute bottom-6 left-5 sm:bottom-6 sm:left-6 z-40 pointer-events-auto flex flex-col items-start gap-2.5 max-w-[260px] sm:max-w-xs transition-all duration-200 ${
        isMapPopupActive 
          ? 'opacity-0 pointer-events-none translate-y-3 sm:opacity-100 sm:pointer-events-auto sm:translate-y-0' 
          : 'opacity-100 translate-y-0'
      }`}>
        {/* ปุ่มกลับหน้าหลักจำลองน้ำท่วม 3D */}
        <button
          type="button"
          onClick={onBackToFloodSim}
          className="group px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-300 shadow-lg text-xs font-bold text-slate-700 hover:bg-[#A6192E] hover:text-white hover:border-[#A6192E] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          title="สลับกลับไปหน้าแบบจำลองน้ำท่วมแม่น้ำกก 3D"
        >
          <ArrowLeft className="w-4 h-4 text-[#A6192E] group-hover:text-white transition-colors" />
          <span>หน้าหลักจำลองน้ำท่วม 3D</span>
        </button>

        {/* Floating Legend & River Info (เกณฑ์คุณภาพน้ำ) */}
        <div className="w-full bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl shadow-xl border border-[#B4975A]/40 text-xs space-y-1.5 sm:space-y-2">
          <div 
            className="flex items-center justify-between border-b pb-1 cursor-pointer sm:cursor-default"
            onClick={() => setIsLegendOpen(prev => !prev)}
          >
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Droplets className="w-4 h-4 text-[#A6192E]" />
              เกณฑ์คุณภาพน้ำ
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 hidden sm:inline">เกณฑ์ WHO</span>
              <button type="button" className="sm:hidden text-slate-500 hover:text-slate-800 p-0.5">
                {isLegendOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className={`${isLegendOpen ? 'block' : 'hidden sm:block'} space-y-1.5 sm:space-y-2`}>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                  <span>ปกติ (&le; 10 ppb)</span>
                </span>
                <span className="font-mono text-emerald-700 font-bold">ปลอดภัย</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>เฝ้าระวัง (11 - 50 ppb)</span>
                </span>
                <span className="font-mono text-amber-700 font-bold">ควรกรอง</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
                  <span>เกินเกณฑ์ (&gt; 50 ppb)</span>
                </span>
                <span className="font-mono text-rose-700 font-bold">ห้ามดื่ม</span>
              </div>
            </div>
            <div className="pt-1 border-t text-[10px] text-slate-500 flex items-center justify-between">
              <span>แตะหมุด Hotspot หรือจุดตรวจเพื่อดูรายละเอียด</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Button: บันทึกข้อมูลน้ำใหม่ (ขวาล่าง ย่อขนาดและปรับตำแหน่งให้เหมาะสมกับมือถือ) */}
      <div className={`absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-20 pointer-events-auto transition-all duration-200 flex items-center gap-2.5 ${
        isFormOpen || isMapPopupActive 
          ? 'opacity-0 pointer-events-none translate-y-3 sm:opacity-100 sm:pointer-events-auto sm:translate-y-0' 
          : 'opacity-100 translate-y-0'
      }`}>
        <button
          type="button"
          onClick={() => {
            setSelectedSample(null);
            setSelectedHotspot(null);
            setIsFormOpen(true);
          }}
          className="w-11 h-11 sm:w-auto sm:h-auto p-0 sm:px-5 sm:py-3 rounded-full sm:rounded-2xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold border-2 border-[#B4975A] shadow-xl shadow-[#A6192E]/40 active:scale-90 hover:scale-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="บันทึกข้อมูลน้ำใหม่"
        >
          <Plus className="w-5 h-5 text-amber-300 stroke-[2.5]" />
          <span className="hidden sm:inline text-xs sm:text-sm">
            บันทึกข้อมูลน้ำใหม่
          </span>
        </button>
      </div>

      {/* 5. Submissions List Sidebar */}
      <div 
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isListDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsListDrawerOpen(false)}
      />

      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isListDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 bg-[#A6192E] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-xl">
              <List className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>รายการตัวอย่างน้ำ</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono text-amber-200">
                  {filteredSubmissions.length}{timeFilter !== 'all' ? ` / ${totalSamples}` : ''} รายการ
                </span>
              </h3>
              <p className="text-[11px] text-rose-100">แตะเพื่อดูตำแหน่งและผลตรวจบนแผนที่</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsListDrawerOpen(false)}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="ปิดแถบด้านข้าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Filter Active Notice in Sidebar */}
        {timeFilter !== 'all' && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold truncate">
              <Calendar className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
              <span className="truncate">ช่วงเวลา: {activeFilterOption.fullLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className="text-[11px] text-[#A6192E] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

        {/* Search bar inside sidebar */}
        <div className="p-3 border-b border-slate-200 bg-[#F8F7F5]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาตามรหัส หรือชื่อจุดตรวจ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E]"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Samples List Content */}
        <div className="p-3 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              ไม่พบรายการตัวอย่างที่ตรงกับคำค้นหา
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const asVal = sub.measurements?.arsenic?.value;
              const hasPhotos = sub.images && sub.images.length > 0;
              const isSelected = selectedSample?.record_id === sub.record_id || selectedSample?.sample_code === sub.sample_code;
              return (
                <div
                  key={sub.record_id || sub.sample_code}
                  onClick={() => {
                    setSelectedHotspot(null);
                    setSelectedSample(sub);
                    setFocusCoords(sub.coordinates);
                    setIsListDrawerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all hover:border-[#A6192E] hover:shadow-md ${
                    isSelected
                      ? 'bg-rose-50/70 border-[#A6192E] ring-1 ring-[#A6192E]'
                      : 'bg-white border-slate-200 hover:bg-[#F8F7F5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-[#A6192E] text-xs">
                      {sub.sample_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asVal > 50
                        ? 'bg-rose-100 text-rose-800'
                        : asVal > 10
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      As: {asVal !== null && asVal !== undefined ? `${asVal} ppb` : 'ไม่ได้วัด'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-1">
                    {sub.station_name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(sub.collection_time).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {hasPhotos && (
                      <span className="text-sky-600 font-bold flex items-center gap-1 text-[10px]">
                        <Camera className="w-3 h-3" />
                        {sub.images.length} ภาพ
                      </span>
                    )}
                  </div>
                  {sub.collector?.name && (
                    <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-400 truncate">
                      ผู้เก็บ: {sub.collector.name}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2 px-3 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>ส่งออก Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setIsListDrawerOpen(false)}
            className="py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-all text-xs cursor-pointer"
          >
            ปิดแถบ
          </button>
        </div>
      </div>

      {/* 6. Hotspot Detail Modal (เมื่อคลิกเลือกก้อน Hotspot หรือจุดตรวจเดี่ยวบนแผนที่) */}
      {selectedHotspot && !isFormOpen && (
        <StationDetailModal
          hotspot={selectedHotspot}
          submissions={timeFilteredSubmissions}
          onClose={() => setSelectedHotspot(null)}
          onSelectSample={(sample) => {
            setSelectedHotspot(null);
            setSelectedSample(sample);
          }}
        />
      )}

      {/* 7. Sample Detail Modal (เมื่อคลิกเลือกผลตรวจแต่ละรายการเพื่อดูผลเชิงลึก) */}
      {selectedSample && !isFormOpen && !selectedHotspot && (
        <WaterWatchSampleDetail
          sample={selectedSample}
          onClose={() => setSelectedSample(null)}
          onDelete={handleDeleteSample}
        />
      )}

      {/* 8. Form Modal (หน้าต่างกรอกบันทึกผลการตรวจพิกัด GPS) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <WaterWatchForm
            onCancel={() => setIsFormOpen(false)}
            onSubmitSuccess={(newSample) => handleCreateNewSample(newSample)}
          />
        </div>
      )}

      {/* 9. Settings Modal (Supabase & Data Pipeline Config) */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#A6192E]" />
                <h3 className="font-bold text-base text-slate-900">
                  ตั้งค่าเชื่อมต่อ Supabase & คลังข้อมูล
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Status indicator */}
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              spConnected 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${spConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span>{spConnected ? 'เชื่อมต่อ Supabase Cloud สำเร็จ' : 'โหมดแคช LocalStorage สำรอง'}</span>
              </div>
              {isSyncing && <span className="text-[10px] text-slate-500">กำลังซิงค์...</span>}
            </div>

            {/* Supabase Connection Form */}
            <div className="space-y-3 bg-[#F8F7F5] p-3.5 rounded-xl border border-slate-200 text-xs">
              <label className="block font-bold text-[#A6192E] uppercase tracking-wide">
                ⚡ กำหนดค่าเชื่อมต่อ Supabase
              </label>

              <div>
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">Project URL</span>
                <input
                  type="text"
                  placeholder="https://xxxxxxxx.supabase.co"
                  value={spUrl}
                  onChange={(e) => setSpUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-hidden focus:border-[#A6192E]"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">Public Anon Key</span>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={spAnonKey}
                  onChange={(e) => setSpAnonKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-hidden focus:border-[#A6192E]"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveSupabaseConfig}
                className="w-full py-2 bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกและเชื่อมต่อ</span>
              </button>
            </div>

            {/* Excel Export & Quick Tools */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                📊 เครื่องมือจัดการข้อมูล
              </label>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>ส่งออกข้อมูลทั้งหมดเป็น Excel (.csv)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดตัวอย่างใหม่ล่าสุด (Schema 2.0 สารหนู 9 ระดับ) หรือไม่?')) {
                    const fresh = resetStoredSubmissions();
                    setSubmissions(fresh);
                    setSelectedSample(null);
                    setSelectedHotspot(null);
                    alert('รีเซ็ตข้อมูลตัวอย่างเป็นชุดใหม่เรียบร้อยแล้ว');
                  }
                }}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>รีเซ็ตข้อมูลตัวอย่างเป็นชุดใหม่ (Schema 2.0)</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 space-y-1">
              <p>• รูปภาพจัดเก็บลง Supabase Storage Bucket: <code>water-watch-photos</code></p>
              <p>• ข้อมูลจัดเก็บลง Table: <code>kok_water_samples</code> (สคริปต์ SQL ดูได้ที่โฟลเดอร์ <code>supabase/schema.sql</code>)</p>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
