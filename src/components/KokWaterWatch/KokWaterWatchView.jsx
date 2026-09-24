import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Droplets,
  Database,
  ArrowLeft,
  List,
  MapPin,
  Camera,
  Calendar,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Download,
  Check,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Flame,
  RotateCcw,
  Clock,
  Filter,
  Settings,
  Waves
} from 'lucide-react';
import WaterWatchMap from './WaterWatchMap';
import WaterWatchForm from './WaterWatchForm';
import WaterWatchSampleDetail from './WaterWatchSampleDetail';
import StationDetailModal from './StationDetailModal';
import './kokWaterWatchModern.css';
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
        let startT = customStart ? new Date(customStart + 'T00:00:00').getTime() : null;
        let endT = customEnd ? new Date(customEnd + 'T23:59:59.999').getTime() : null;
        if (startT && isNaN(startT)) startT = null;
        if (endT && isNaN(endT)) endT = null;

        // หากผู้ใช้เลือกวันเริ่มต้นมากกว่าวันสิ้นสุด ให้สลับอัตโนมัติ ไม่ให้ผลลัพธ์เป็น 0 จุด
        if (startT && endT && startT > endT) {
          const temp = startT;
          startT = endT;
          endT = temp;
        }

        if (startT && targetTime < startT) return false;
        if (endT && targetTime > endT) return false;
        return true;
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

  // Modern UI Reference States (ตรงตามรูปภาพอ้างอิง)
  const [guideOpen, setGuideOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [mapType, setMapType] = useState('satellite');
  const [showLabels, setShowLabels] = useState(false);
  const [filterLevel, setFilterLevel] = useState('all');
  const mapController = useRef(null);

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
    setActionFeedback(`ส่งออกผลตรวจ ${timeFilteredSubmissions.length} จุดแล้ว`);
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
    if (timeFilter === 'custom') {
      let label = 'กำหนดวันเอง';
      if (customStartDate && customEndDate) {
        label = `${customStartDate} ถึง ${customEndDate}`;
      } else if (customStartDate) {
        label = `ตั้งแต่ ${customStartDate}`;
      } else if (customEndDate) {
        label = `ถึง ${customEndDate}`;
      }
      return {
        id: 'custom',
        label,
        fullLabel: `กำหนดช่วงวันเอง (${label})`
      };
    }
    return TIME_FILTER_OPTIONS.find(o => o.id === timeFilter) || TIME_FILTER_OPTIONS[0] || {
      id: 'all',
      label: 'ทั้งหมด',
      fullLabel: 'ทุกช่วงเวลา (ทั้งหมด)'
    };
  }, [timeFilter, customStartDate, customEndDate]);

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

  // กรองตามระดับความเสี่ยงเพิ่มเติมเมื่อเลือกในตั้งค่า
  const levelFilteredSubmissions = useMemo(() => {
    if (filterLevel === 'all') return timeFilteredSubmissions;
    return timeFilteredSubmissions.filter((s) => {
      const val = Number(s?.measurements?.arsenic?.value ?? s?.arsenic_ppb ?? s?.arsenic_level_ppb ?? 0);
      if (filterLevel === 'critical') return val > 10;
      if (filterLevel === 'watch') return val >= 5 && val <= 10;
      if (filterLevel === 'normal') return val < 5;
      return true;
    });
  }, [timeFilteredSubmissions, filterLevel]);

  // สถิติสถานการณ์ลุ่มน้ำวันนี้ (หรือชุดข้อมูลปัจจุบัน)
  const todayStatus = useMemo(() => {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let critical = 0;
    let watch = 0;
    let normal = 0;

    const list = Array.isArray(submissions) ? submissions : [];
    const todayItems = list.filter((s) => {
      if (!s || !s.collection_time) return false;
      const t = new Date(s.collection_time).getTime();
      return !isNaN(t) && (now - t <= ONE_DAY || new Date(s.collection_time).toDateString() === new Date().toDateString());
    });

    const dataset = todayItems.length > 0 ? todayItems : (Array.isArray(timeFilteredSubmissions) ? timeFilteredSubmissions : []);
    dataset.forEach((s) => {
      const val = Number(s?.measurements?.arsenic?.value ?? s?.arsenic_ppb ?? s?.arsenic_level_ppb ?? 0);
      if (val > 10) critical++;
      else if (val >= 5) watch++;
      else normal++;
    });

    return {
      total: dataset.length,
      critical,
      watch,
      normal,
      hasTodayData: todayItems.length > 0
    };
  }, [submissions, timeFilteredSubmissions]);

  return (
    <div className="kok-modern-app">
      <div className="kok-modern-canvas">
        {/* Fullscreen Map Canvas */}
        <div className="absolute inset-0 z-0">
          <WaterWatchMap
            submissions={levelFilteredSubmissions}
            selectedSample={selectedSample}
            onSelectSample={(s) => setSelectedSample(s)}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={(hs) => setSelectedHotspot(hs)}
            focusCoords={focusCoords}
            onPopupChange={(hs) => setIsMapPopupActive(!!hs)}
            controllerRef={mapController}
            hideDefaultControls={true}
          />
        </div>

        {/* 1. สถานการณ์ลุ่มน้ำวันนี้ (บนซ้าย - สไตล์เดียวกับตัวอ้างอิง) */}
        <section className="basin-status-card" aria-labelledby="basin-status-title">
          <h1 id="basin-status-title">สถานการณ์ลุ่มน้ำวันนี้</h1>
          {submissions.length > 0 && todayStatus.total > 0 ? (
            <>
              <div
                className="basin-status-bar"
                role="img"
                aria-label={`สัดส่วนสถานะ: วิกฤต ${todayStatus.critical}, เฝ้าระวัง ${todayStatus.watch}, ปกติ ${todayStatus.normal}`}
              >
                <span
                  className="status-critical"
                  style={{ width: `${(todayStatus.critical / todayStatus.total) * 100}%` }}
                />
                <span
                  className="status-watch"
                  style={{ width: `${(todayStatus.watch / todayStatus.total) * 100}%` }}
                />
                <span
                  className="status-normal"
                  style={{ width: `${(todayStatus.normal / todayStatus.total) * 100}%` }}
                />
              </div>
              <p className="basin-status-counts">
                <span className="basin-status-count">
                  <span>วิกฤต: {todayStatus.critical}</span>
                </span>
                <i>|</i>
                <span className="basin-status-count">
                  <span>เฝ้าระวัง: {todayStatus.watch}</span>
                </span>
                <i>|</i>
                <span className="basin-status-count">
                  <span>ปกติ: {todayStatus.normal}</span>
                </span>
              </p>
            </>
          ) : (
            <p className="basin-status-unavailable" role="status">
              ยังไม่เชื่อมต่อฐานข้อมูลผลตรวจ
            </p>
          )}
        </section>

        {/* 2. เกณฑ์สารหนูในน้ำแม่น้ำ (บนซ้าย ใต้สถานการณ์ลุ่มน้ำ) */}
        <section className="water-criteria-card" aria-labelledby="water-criteria-title">
          <h2 id="water-criteria-title">
            เกณฑ์สารหนูในน้ำแม่น้ำ <span>As · ppb</span>
          </h2>
          <div className="criteria-levels">
            <div className="criteria-level level-green">
              <i />
              <span>ปกติ</span>
              <strong>&lt; 5</strong>
            </div>
            <div className="criteria-level level-yellow">
              <i />
              <span>เฝ้าระวัง</span>
              <strong>5–10</strong>
            </div>
            <div className="criteria-level level-red">
              <i />
              <span>เกินเกณฑ์</span>
              <strong>&gt; 10</strong>
            </div>
          </div>
          <p>เกณฑ์ คพ. น้ำผิวดินประเภท 2: ไม่เกิน 10 ppb · 5 ppb เป็นเชิงเตือนระวัง ไม่ใช่เกณฑ์กฎหมาย</p>
          <a href="https://epo01.pcd.go.th/th/news/detail/181868" target="_blank" rel="noreferrer">
            แหล่งอ้างอิง: กรมควบคุมมลพิษ ↗
          </a>
        </section>

        {/* 3. TIME RANGE Pill (ล่างกลาง) */}
        <section className="time-range-card" aria-label="ช่วงเวลา">
          <span className="time-range-label">TIME RANGE</span>
          <button
            className="time-range-option"
            type="button"
            onClick={() => setIsTimeFilterOpen(true)}
            aria-label={`เลือกช่วงเวลา (${activeFilterOption.label})`}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span>{activeFilterOption.label}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </section>

        {/* 4. Map Floating Controls (บนขวา แนวตั้ง) */}
        <div className="map-controls" aria-label="เครื่องมือแผนที่">
          <div className="map-actions" aria-label="เมนูหลัก">
            <button
              className="round-control"
              type="button"
              aria-label="คู่มือ"
              title="คู่มือการใช้งาน"
              onClick={() => {
                setGuideOpen(prev => !prev);
                setSummaryOpen(false);
                setSettingsOpen(false);
                setIsSearchOpen(false);
              }}
            >
              <CircleHelp size={20} />
            </button>
            <button
              className="round-control"
              type="button"
              aria-label="สรุปรายวัน"
              title="สรุปผลตรวจวันนี้"
              onClick={() => {
                setSummaryOpen(prev => !prev);
                setGuideOpen(false);
                setSettingsOpen(false);
                setIsSearchOpen(false);
              }}
            >
              <CalendarDays size={19} />
            </button>
            <button
              className="round-control"
              type="button"
              aria-label="ตั้งค่า"
              title="ตั้งค่าแผนที่และชั้นข้อมูล"
              onClick={() => {
                setSettingsOpen(prev => !prev);
                setGuideOpen(false);
                setSummaryOpen(false);
                setIsSearchOpen(false);
              }}
            >
              <Settings size={20} />
            </button>
            <button
              className="round-control"
              type="button"
              aria-label="Export ข้อมูล"
              title="ส่งออกผลตรวจเป็นไฟล์ CSV"
              onClick={handleExportCSV}
            >
              <Download size={19} />
            </button>
            <button
              className="round-control"
              type="button"
              aria-label="ค้นหา"
              title="ค้นหาจุดตรวจวัด"
              onClick={() => {
                setIsSearchOpen(prev => !prev);
                setGuideOpen(false);
                setSummaryOpen(false);
                setSettingsOpen(false);
              }}
            >
              <Search size={19} />
            </button>
          </div>

          {/* Zoom Control Capsule */}
          <div className="zoom-control" aria-label="ควบคุมการซูม">
            <button
              type="button"
              aria-label="ซูมเข้า"
              title="ซูมเข้า"
              onClick={() => mapController.current?.zoomIn?.()}
            >
              <Plus size={20} />
            </button>
            <span />
            <button
              type="button"
              aria-label="ซูมออก"
              title="ซูมออก"
              onClick={() => mapController.current?.zoomOut?.()}
            >
              <Minus size={20} />
            </button>
          </div>
        </div>

        {/* 5. Utility Popups */}
        {guideOpen && (
          <section className="map-utility-panel" role="region" aria-label="คู่มือการใช้งาน">
            <button
              type="button"
              className="map-utility-close"
              aria-label="ปิดคู่มือ"
              onClick={() => setGuideOpen(false)}
            >
              <X size={16} />
            </button>
            <h2>คู่มือการใช้งาน</h2>
            <p>
              ซูมแผนที่เพื่อดูพื้นที่ · แตะหมุดก้อน Hotspot หรือจุดตรวจเพื่อดูค่าสารหนู ผลตรวจล่าสุด และภาพถ่ายหลักฐาน
            </p>
            <p>
              เปิดตั้งค่า (⚙) เพื่อปรับชั้นข้อมูลแผนที่ (ดาวเทียม/ถนน) หรือเลือกดูตามระดับเตือนภัย · กดปุ่มทำแบบสำรวจเพื่อบันทึกผลตรวจสารหนูและพิกัด GPS ลงระบบ
            </p>
          </section>
        )}

        {summaryOpen && (
          <section className="map-utility-panel" role="region" aria-label="สรุปรายวัน">
            <button
              type="button"
              className="map-utility-close"
              aria-label="ปิดสรุปรายวัน"
              onClick={() => setSummaryOpen(false)}
            >
              <X size={16} />
            </button>
            <h2>สรุปผลตรวจคุณภาพน้ำ</h2>
            <p className="font-semibold text-slate-700">
              ชุดข้อมูลปัจจุบัน ({activeFilterOption.label}): ทั้งหมด {timeFilteredSubmissions.length} จุด
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
              <div className="p-2 rounded-xl bg-red-50 text-red-700">
                <div className="text-lg font-bold">{filterCounts.critical || todayStatus.critical}</div>
                <div className="text-[10px]">วิกฤต (&gt;10)</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <div className="text-lg font-bold">{filterCounts.watch || todayStatus.watch}</div>
                <div className="text-[10px]">เฝ้าระวัง (5-10)</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <div className="text-lg font-bold">{filterCounts.normal || todayStatus.normal}</div>
                <div className="text-[10px]">ปกติ (&lt;5)</div>
              </div>
            </div>
          </section>
        )}

        {settingsOpen && (
          <section className="map-settings-panel" id="map-settings-panel" aria-label="ตั้งค่าแผนที่">
            <header className="map-settings-header">
              <div>
                <span className="map-settings-icon"><Waves size={17} /></span>
                <div>
                  <strong>ชั้นข้อมูลและตัวกรอง</strong>
                  <small>ปรับมุมมองลุ่มน้ำแม่น้ำกก</small>
                </div>
              </div>
              <button
                type="button"
                className="map-settings-close"
                aria-label="ปิดตั้งค่าแผนที่"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="map-settings-section">
              <div className="map-settings-section-title">
                <span>รูปแบบแผนที่</span>
                <small>Map Style</small>
              </div>
              <div className="map-settings-tabs">
                <button
                  type="button"
                  className={mapType === 'satellite' ? 'is-active' : ''}
                  onClick={() => {
                    setMapType('satellite');
                    mapController.current?.setMapType?.('satellite');
                  }}
                >
                  ดาวเทียม
                </button>
                <button
                  type="button"
                  className={mapType === 'streets' ? 'is-active' : ''}
                  onClick={() => {
                    setMapType('streets');
                    mapController.current?.setMapType?.('streets');
                  }}
                >
                  ถนน/แผนที่
                </button>
                <button
                  type="button"
                  className={mapType === 'terrain' ? 'is-active' : ''}
                  onClick={() => {
                    setMapType('terrain');
                    mapController.current?.setMapType?.('terrain');
                  }}
                >
                  ภูมิประเทศ
                </button>
              </div>
              <label className="map-settings-check">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => {
                    setShowLabels(e.target.checked);
                    mapController.current?.setShowLabels?.(e.target.checked);
                  }}
                />
                <div>
                  <strong>แสดงชื่อสถานที่และถนน</strong>
                  <small>ป้ายชื่อภาษาไทยและรหัสทางหลวง</small>
                </div>
              </label>
            </div>

            <div className="map-settings-section">
              <div className="map-settings-section-title">
                <span>กรองระดับสารหนู</span>
                <small>Filter</small>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterLevel(prev => prev === 'normal' ? 'all' : 'normal')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    filterLevel === 'normal'
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  เฉพาะปกติ
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLevel(prev => prev === 'watch' ? 'all' : 'watch')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    filterLevel === 'watch'
                      ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  เฉพาะเฝ้าระวัง
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLevel(prev => prev === 'critical' ? 'all' : 'critical')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    filterLevel === 'critical'
                      ? 'bg-red-100 border-red-500 text-red-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  เฉพาะวิกฤต
                </button>
              </div>
            </div>

            <div className="map-settings-section">
              <div className="map-settings-section-title">
                <span>การจัดการข้อมูล</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  mapController.current?.locateUser?.();
                  setSettingsOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MapPin size={14} className="text-[#A6192E]" />
                <span>ค้นหาตำแหน่งปัจจุบันของเครื่อง (GPS)</span>
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                className="w-full py-2 px-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/60 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw size={14} />
                <span>รีเซ็ตชุดข้อมูลตัวอย่างเริ่มต้น</span>
              </button>
            </div>
          </section>
        )}

        {isSearchOpen && (
          <section className="map-utility-panel" role="region" aria-label="ค้นหาข้อมูล">
            <button
              type="button"
              className="map-utility-close"
              aria-label="ปิดการค้นหา"
              onClick={() => setIsSearchOpen(false)}
            >
              <X size={16} />
            </button>
            <h2>ค้นหาจุดตรวจวัด</h2>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อหมู่บ้าน, รหัสตัวอย่าง, ผู้ตรวจ..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#176756]"
                autoFocus
              />
            </div>
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                {filteredSubmissions.slice(0, 5).map((sub) => (
                  <div
                    key={sub.record_id || sub.sample_code}
                    onClick={() => {
                      setFocusCoords(sub.coordinates);
                      setSelectedSample(sub);
                      setIsSearchOpen(false);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-semibold text-slate-700 truncate mr-2">{sub.station_name || sub.sample_code}</span>
                    <span className="font-mono text-[11px] font-bold text-[#A6192E] shrink-0">
                      {sub.measurements?.arsenic?.value ?? sub.arsenic_ppb ?? sub.arsenic_level_ppb} ppb
                    </span>
                  </div>
                ))}
                {filteredSubmissions.length === 0 && (
                  <p className="text-xs text-slate-400 py-2 text-center">ไม่พบผลการค้นหา</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* 6. Buttons (ล่างขวา) */}
        {/* App Switcher Button (Blue Wave) */}
        <button
          type="button"
          onClick={onBackToFloodSim}
          className="app-switch-button"
          title="สลับไปหน้าแบบจำลองน้ำท่วมแม่น้ำกก 3D"
        >
          <Waves size={24} className="text-white drop-shadow" />
        </button>

        {/* Survey Button (ทำแบบสำรวจ) */}
        <button
          className="survey-button"
          type="button"
          aria-label="ทำแบบสำรวจ"
          onClick={() => {
            setSelectedSample(null);
            setSelectedHotspot(null);
            setIsFormOpen(true);
          }}
        >
          <ClipboardList size={19} />
          <span>ทำแบบสำรวจ</span>
        </button>

        {/* Feedback Toast */}
        {actionFeedback && (
          <p
            className="map-action-feedback"
            role="status"
            onAnimationEnd={() => setActionFeedback('')}
          >
            {actionFeedback}
          </p>
        )}
      </div>

      {/* Large Time Filter Modal (Bottom Sheet on Mobile / Centered Card Modal on Desktop with Backdrop Blur) */}
      {isTimeFilterOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none"
          onClick={() => setIsTimeFilterOpen(false)}
        >
          {/* Modal Card / Bottom Sheet Container */}
          <div 
            className="w-full max-h-[88vh] sm:max-h-[85vh] sm:w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-[#B4975A]/60 flex flex-col p-4 sm:p-5 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 sm:slide-in-from-top-0 duration-200 text-left font-['Prompt',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Bar Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#A6192E] to-[#801424] text-white flex items-center justify-center shadow-md shadow-[#A6192E]/25 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>ตัวกรองช่วงเวลาตรวจวัด</span>
                    {timeFilter !== 'all' && (
                      <span className="w-2 h-2 rounded-full bg-[#A6192E] animate-pulse" />
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    กรองจุดตรวจและกลุ่ม Hotspot บนแผนที่ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="ปิดหน้าต่างตัวกรอง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Options Grouped (Scrollable Area) */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              {/* Quick Select: All */}
              <div>
                <button
                  type="button"
                  onClick={() => handleSelectTimeFilter('all')}
                  className={`w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between border cursor-pointer ${
                    timeFilter === 'all'
                      ? 'bg-gradient-to-r from-[#A6192E] to-[#851424] text-white border-[#A6192E] shadow-md shadow-[#A6192E]/20 scale-[1.01]'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🌐</span>
                    <div>
                      <div className="text-xs sm:text-sm font-bold leading-tight">ทุกช่วงเวลา (ทั้งหมด)</div>
                      <div className={`text-[10px] sm:text-[11px] ${timeFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>
                        แสดงจุดตรวจวัดทั้งหมดในระบบ
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold ${
                    timeFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {filterCounts.all || totalSamples} จุด
                  </span>
                </button>
              </div>

              {/* 1. รายวัน (Daily) */}
              <div className="space-y-1.5">
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                  <span>☀️ รายวัน / ล่าสุด (DAILY)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_FILTER_OPTIONS.filter(o => o.group === 'daily').map((opt) => {
                    const isSelected = timeFilter === opt.id;
                    const count = filterCounts[opt.id] || 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectTimeFilter(opt.id)}
                        className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#A6192E] to-[#851424] text-white border-[#A6192E] shadow-md shadow-[#A6192E]/20 scale-[1.01]'
                            : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold truncate">{opt.label}</div>
                        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px]">
                          <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                            {opt.id === 'today' ? '24 ชม.' : '7 วัน'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
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
              <div className="space-y-1.5">
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                  <span>🗓️ รายเดือน / ไตรมาส (MONTHLY)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_FILTER_OPTIONS.filter(o => o.group === 'monthly').map((opt) => {
                    const isSelected = timeFilter === opt.id;
                    const count = filterCounts[opt.id] || 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectTimeFilter(opt.id)}
                        className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#A6192E] to-[#851424] text-white border-[#A6192E] shadow-md shadow-[#A6192E]/20 scale-[1.01]'
                            : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold truncate">{opt.label}</div>
                        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px]">
                          <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                            {opt.id === 'month' ? '30 วัน' : '90 วัน'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
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
              <div className="space-y-1.5">
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1">
                  <span>📅 รายปี (YEARLY)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_FILTER_OPTIONS.filter(o => o.group === 'yearly').map((opt) => {
                    const isSelected = timeFilter === opt.id;
                    const count = filterCounts[opt.id] || 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectTimeFilter(opt.id)}
                        className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#A6192E] to-[#851424] text-white border-[#A6192E] shadow-md shadow-[#A6192E]/20 scale-[1.01]'
                            : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold truncate">{opt.label}</div>
                        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px]">
                          <span className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                            {opt.id === 'year' ? 'ปีนี้' : '365 วัน'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
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
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>กำหนดช่วงวันเอง</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {timeFilter === 'custom' && (
                      <span className="text-[10px] text-[#A6192E] font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                        ใช้งานอยู่ ({timeFilteredSubmissions.length} จุด)
                      </span>
                    )}
                    {(customStartDate || customEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStartDate('');
                          setCustomEndDate('');
                          if (timeFilter === 'custom') setTimeFilter('all');
                        }}
                        className="text-[11px] text-slate-500 hover:text-[#A6192E] underline cursor-pointer"
                      >
                        ล้างวันที่
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-medium">วันที่เริ่มต้น</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#A6192E] shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-medium">วันที่สิ้นสุด</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#A6192E] shadow-2xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTimeFilter('custom')}
                  className="w-full py-2.5 bg-gradient-to-r from-[#A6192E] to-[#801424] hover:brightness-110 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#A6192E]/25 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ใช้งานช่วงวันที่กำหนด ({filterCounts.custom || 0} จุด)</span>
                </button>
              </div>
            </div>

            {/* Footer Info & Reset */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 shrink-0 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  แสดงผล <strong className="text-[#A6192E] text-sm">{timeFilteredSubmissions.length}</strong> จาก {totalSamples} จุด
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
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>อัปเดตตอบสนองแผนที่แบบเรียลไทม์</span>
                <button
                  type="button"
                  onClick={handleResetAllData}
                  className="text-slate-400 hover:text-[#A6192E] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นชุดเริ่มต้นล่าสุด"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>รีเซ็ตชุดข้อมูลตัวอย่าง</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map and modern controls are rendered in kok-modern-canvas */}

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
