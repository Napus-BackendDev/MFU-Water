import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
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
  Waves,
  LocateFixed,
  Map,
  Mountain,
  Crosshair,
  Grid2X2,
  MapPinCheck,
  User
} from 'lucide-react';
import { checkPublicAdminSession } from '../../lib/publicSamples.js';
import { publicPseudonym } from '../../lib/publicPseudonym.js';
import { loadBoundary, loadAreaBoundaries } from './boundaryLoader.js';
import { startPublishedPolling } from '../../lib/publishedPolling.js';
import { getTimeReference, isWithinTimeRange } from './timeFilters.js';
import WaterWatchMap from './WaterWatchMap';
const WaterWatchForm = lazy(() => import('./WaterWatchForm'));
const WaterWatchSampleDetail = lazy(() => import('./WaterWatchSampleDetail'));
const StationDetailModal = lazy(() => import('./StationDetailModal'));
import { downloadWaterWatchCSV } from './waterWatchExport';
import { summarizeWaterWatch } from './waterWatchSummary';
const WaterHealthChart = lazy(() => import('./WaterHealthChart'));
import MapAreaSidebar from './MapAreaSidebar';
import { countPublishedByArea, filterSampleLevel } from './areaSampleCounts.js';
import { submittedSampleVisibility } from './submittedSampleVisibility.js';
import { filterSubmissionsByArea, INITIAL_MAP_AREA, isSelectableCountry, provincesForRegion, regionForProvince } from './mapAreaNavigation.js';
import './kokWaterWatchModern.css';
import { 
  fetchSamplesFromSupabase, 
  downloadPublishedExport
} from '../../lib/publicSamples.js';

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

export default function KokWaterWatchView({ onOpenAdmin }) {
  const [sessionUser, setSessionUser] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [hasPendingForm, setHasPendingForm] = useState(false);
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
  const [mapType, setMapType] = useState(() => {
    const saved = localStorage.getItem('kok_water_watch_map_type');
    return saved === 'street' || saved === 'streets' ? 'street' : saved === 'terrain' ? 'terrain' : 'satellite';
  });
  const [showLabels, setShowLabels] = useState(() => localStorage.getItem('kok_water_watch_show_labels') === 'true');
  const [filterLevel, setFilterLevel] = useState('all');
  const [isLocating, setIsLocating] = useState(false);
  const mapController = useRef(null);
  const settingsPanelRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const [serverReadOnly, setServerReadOnly] = useState(false);

  useEffect(() => {
    let active = true;
    checkPublicAdminSession().then(session => {
      if (active) { setSessionUser(Boolean(session?.user)); setServerReadOnly(session?.readOnly === true); }
    });
    return () => { active = false; };
  }, []);

  // สถานะเปิด-ปิดของเลเยอร์ (iOS Toggle) ตามภาพที่ 1
  const [layerSettings, setLayerSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('kok_layer_settings');
      if (saved) return {
        country: true, province: true, locality: true, river: true,
        focusThailand: false, rain24h: false, researchReports: true,
        ...JSON.parse(saved)
      };
    } catch {}
    return {
      country: true,        // เขตประเทศ
      province: true,       // เขตจังหวัด
      locality: true,       // เขตอำเภอ
      river: true,          // เส้นแม่น้ำ
      focusThailand: false, // โฟกัสไทย
      rain24h: false,       // ฝนสะสม 24 ชม.
      researchReports: true // จุดตรวจวัดบนแผนที่ (คง key เดิมเพื่อไม่ให้ค่าเก่าหาย)
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('kok_layer_settings', JSON.stringify(layerSettings));
    } catch {}
  }, [layerSettings]);

  const [showBoundaryLabels, setShowBoundaryLabels] = useState(true);
  const [selectedArea, setSelectedArea] = useState(INITIAL_MAP_AREA);
  const selectedAreaRef = useRef(selectedArea);
  selectedAreaRef.current = selectedArea;
  const [boundaryData, setBoundaryData] = useState(null);
  const [boundaryLoading, setBoundaryLoading] = useState(true);
  const [boundaryError, setBoundaryError] = useState(false);
  const [boundaryRetry, setBoundaryRetry] = useState(0);
  const [districtCache, setDistrictCache] = useState({});
  const areaFeature = useMemo(() => {
    if (selectedArea.level === 'country') return boundaryData?.countries?.features.find(f => f.properties.shapeISO === 'THA') || null;
    if (selectedArea.level === 'region') return boundaryData?.regions?.features.find(f => f.properties.regionId === selectedArea.regionId) || null;
    if (selectedArea.level === 'province') return boundaryData?.provinces?.features.find(f => f.properties.shapeISO === selectedArea.provinceIso) || null;
    return boundaryData?.districts?.features.find(f => f.properties.provinceCode === selectedArea.provinceIso && f.properties.districtCode === selectedArea.districtCode) || null;
  }, [boundaryData?.countries, boundaryData?.regions, boundaryData?.provinces, boundaryData?.districts, selectedArea]);

  useEffect(() => {
    let active = true;
    setBoundaryLoading(true);
    setBoundaryError(false);
    loadAreaBoundaries(selectedArea)
      .then(data => {
        if (!active) return;
        setBoundaryData(previous => ({ ...previous, ...data, countries: previous?.countries?.features.some(f => f.properties.shapeISO !== 'THA') ? previous.countries : data.countries }));
        if (data.districts) setDistrictCache(previous => ({ ...previous, [selectedArea.provinceIso]: data.districts }));
      }).catch(() => { if (active) setBoundaryError(true); })
      .finally(() => { if (active) setBoundaryLoading(false); });
    const idle = setTimeout(() => loadBoundary('countries').then(countries => {
      if (active) setBoundaryData(previous => ({ ...previous, countries }));
    }).catch(() => {}), 1500);
    return () => { active = false; clearTimeout(idle); };
  }, [boundaryRetry, selectedArea.level, selectedArea.regionId, selectedArea.provinceIso, selectedArea.districtCode]);

  const selectArea = (selection, clickedFeature = null) => {
    if (!selection || selection.level === 'world') return;
    const next = { ...selection };
    if (next.level === 'region' && !next.regionId) next.regionId = next.id;
    if (next.iso && !next.countryIso && next.iso.length === 3) next.countryIso = next.iso;
    if (next.iso?.startsWith('TH-')) next.provinceIso = next.iso;
    if (next.level === 'country' && !isSelectableCountry(next.countryIso)) return;
    if (next.provinceIso) next.regionId = regionForProvince(next.provinceIso);
    if (next.level === 'district' && (!/^TH\d{4}$/.test(next.districtCode || '') || !next.districtCode.startsWith(next.provinceIso?.replace('TH-', 'TH')))) return;
    if (next.provinceIso !== selectedArea.provinceIso) setBoundaryData(previous => ({ ...previous, districts: null }));
    if (next.regionId !== selectedArea.regionId) setBoundaryData(previous => ({ ...previous, provinces: null, districts: null }));
    setSelectedArea(next);
    setSelectedSample(null);
    setSelectedHotspot(null);
  };

  // Close search, time filter dropdown, and settings panel on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
      if (timeFilterContainerRef.current && !timeFilterContainerRef.current.contains(event.target)) {
        setIsTimeFilterOpen(false);
      }
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(event.target) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target)
      ) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [samplesError, setSamplesError] = useState(false);
  const [samplesLoaded, setSamplesLoaded] = useState(false);

  const pollingRef = useRef(null);
  const [referenceClock, setReferenceClock] = useState(Date.now);
  useEffect(() => {
    const poller = startPublishedPolling({
      load: fetchSamplesFromSupabase,
      onData: data => {
        setSamplesLoaded(true);
        setSamplesError(false);
        setSubmissions(previous => JSON.stringify(previous) === JSON.stringify(data) ? previous : data);
        setReferenceClock(Date.now());
      },
      onError: error => {
        const message = error?.code === 'API_NOT_JSON' || /loopback|ไม่ได้ตั้งค่า Supabase|API ส่งข้อมูลไม่ถูกต้อง/.test(error?.message || '')
          ? error.message : 'โหลดข้อมูลที่เผยแพร่ไม่สำเร็จ กรุณาลองใหม่';
        setSamplesError(message);
        setSamplesLoaded(false);
        setSubmissions([]);
        setActionFeedback(message);
      },
      onLoading: setIsSyncing
    });
    pollingRef.current = poller;
    return () => { poller.stop(); pollingRef.current = null; };
  }, []);

  useEffect(() => {
    setSelectedSample(previous => previous ? submissions.find(sample => sample.sample_code === previous.sample_code && sample.revision === previous.revision) || null : null);
    setSelectedHotspot(null);
  }, [submissions]);

  const allAreaSubmissions = useMemo(() => !boundaryLoading && !boundaryError && areaFeature ? filterSubmissionsByArea(submissions, areaFeature) : [], [submissions, areaFeature, boundaryLoading, boundaryError]);
  const referenceTime = useMemo(() => getTimeReference(submissions, referenceClock), [submissions, referenceClock]);
  const selectSample = useCallback(sample => setSelectedSample(sample), []);
  const selectHotspot = useCallback(hotspot => setSelectedHotspot(hotspot), []);

  // ฟังก์ชันสลับตัวกรองช่วงเวลา พร้อมล้างสถานะหมุดที่เลือกค้างไว้
  const handleSelectTimeFilter = (filterId) => {
    setTimeFilter(filterId);
    setSelectedSample(null);
    setSelectedHotspot(null);
    setIsTimeFilterOpen(false);
  };

  const handleExportCSV = async () => {
    if (!areaFilteredSubmissions || !areaFilteredSubmissions.length) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออกในช่วงเวลาที่เลือก');
      return;
    }
    try {
      const filename = timeFilter === 'all' && selectedArea.level === 'world'
        ? await downloadPublishedExport()
        : downloadWaterWatchCSV(areaFilteredSubmissions, timeFilter);
      setActionFeedback(`เริ่มดาวน์โหลด ${filename} (${areaFilteredSubmissions.length} จุด)`);
    } catch (error) {
      console.error('CSV download failed:', error);
      setActionFeedback('เริ่มดาวน์โหลดไม่ได้ กรุณาลองอีกครั้ง');
    }
  };

  const handleCreateNewSample = async (newSample) => {
    setIsFormOpen(false);
    setSelectedHotspot(null);
    setSelectedSample(null);
    const published = await pollingRef.current?.refresh();
    const presentation = submittedSampleVisibility(newSample, published, selectedArea, areaFeature, boundaryData?.regions);
    if (presentation.selection) selectArea(presentation.selection);
    if (presentation.resetFilters) { setTimeFilter('all'); setFilterLevel('all'); }
    setActionFeedback(presentation.message);
  };

  const totalSamples = Array.isArray(submissions) ? submissions.length : 0;

  // คำนวณจำนวนจุดตรวจวัดที่ตรงกับแต่ละ Filter Option เพื่อแสดงในเมนู Dropdown
  const filterCounts = useMemo(() => {
    try {
      const counts = {};
      const list = Array.isArray(submissions) ? submissions : [];
      for (const opt of TIME_FILTER_OPTIONS) {
        if (opt.id === 'all') {
          counts[opt.id] = allAreaSubmissions.length;
        } else {
          counts[opt.id] = allAreaSubmissions.filter(s =>
            s && isWithinTimeRange(s.collection_time, opt.id, customStartDate, customEndDate, referenceTime)
          ).length;
        }
      }
      return counts;
    } catch (err) {
      console.warn('filterCounts error:', err);
      return {};
    }
  }, [allAreaSubmissions, referenceTime, customStartDate, customEndDate]);

  // จุดตรวจที่ผ่านการกรองช่วงเวลา (Time Filtered Submissions)
  const timeFilteredSubmissions = useMemo(() => {
    try {
      const list = allAreaSubmissions;
      if (!timeFilter || timeFilter === 'all') return list;
      return list.filter(sub => 
        sub && isWithinTimeRange(sub.collection_time, timeFilter, customStartDate, customEndDate, referenceTime)
      );
    } catch (err) {
      console.warn('timeFilteredSubmissions error:', err);
      return [];
    }
  }, [allAreaSubmissions, referenceTime, timeFilter, customStartDate, customEndDate]);

  const areaFilteredSubmissions = timeFilteredSubmissions;
  const areaCounts = useMemo(() => {
    if (samplesError || !boundaryData?.regions || boundaryLoading) return {};
    const visible = filterSampleLevel((submissions || []).filter(s => !timeFilter || timeFilter === 'all' || isWithinTimeRange(s.collection_time, timeFilter, customStartDate, customEndDate, referenceTime)), filterLevel);
    return countPublishedByArea(visible, boundaryData, districtCache);
  }, [submissions, samplesError, boundaryData, boundaryLoading, districtCache, timeFilter, filterLevel, customStartDate, customEndDate, referenceTime]);

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
      const list = Array.isArray(areaFilteredSubmissions) ? areaFilteredSubmissions : [];
      return list.filter(sub => {
        if (!sub) return false;
        if (!searchQuery.trim()) return true;
        const q = String(searchQuery).toLowerCase().trim();
        const code = typeof sub.sample_code === 'object' && sub.sample_code !== null
          ? String(sub.sample_code.code || sub.sample_code.id || '').toLowerCase()
          : String(sub.sample_code ?? '').toLowerCase();
        const st = typeof sub.station_name === 'object' && sub.station_name !== null
          ? String(sub.station_name.name || sub.station_name.th || sub.station_name.label || '').toLowerCase()
          : String(sub.station_name ?? '').toLowerCase();
        const waterSource = String(sub.sample_nature?.water_source || '').toLowerCase();
        const asVal = sub.measurements?.arsenic?.value !== undefined ? String(sub.measurements?.arsenic?.value) : '';
        return code.includes(q) || st.includes(q) || waterSource.includes(q) || asVal.includes(q);
      });
    } catch (err) {
      console.warn('filteredSubmissions error:', err);
      return Array.isArray(areaFilteredSubmissions) ? areaFilteredSubmissions : [];
    }
  }, [areaFilteredSubmissions, searchQuery]);

  // กรองตามระดับความเสี่ยงเพิ่มเติมเมื่อเลือกในตั้งค่า
  const levelFilteredSubmissions = useMemo(() => {
    if (filterLevel === 'all') return areaFilteredSubmissions;
    return areaFilteredSubmissions.filter((s) => {
      const val = Number(s?.measurements?.arsenic?.value ?? s?.arsenic_ppb ?? s?.arsenic_level_ppb ?? 0);
      if (filterLevel === 'critical') return val > 10;
      if (filterLevel === 'watch') return val >= 5 && val <= 10;
      if (filterLevel === 'normal') return val < 5;
      return true;
    });
  }, [areaFilteredSubmissions, filterLevel]);

  const summaryData = useMemo(
    () => summarizeWaterWatch(areaFilteredSubmissions),
    [areaFilteredSubmissions]
  );

  // การ์ดมุมซ้ายแสดงข้อมูลที่เก็บใน 24 ชั่วโมงล่าสุดจากทุกช่วงเวลา
  const todayStatus = useMemo(() => {
    const recent = summarizeWaterWatch(allAreaSubmissions).recent;
    return { ...recent, hasTodayData: recent.total > 0 };
  }, [allAreaSubmissions]);

  return (
    <div className="kok-modern-app">
      <div className="kok-modern-canvas">
        {/* Fullscreen Map Canvas */}
        <div className="absolute inset-0 z-0">
          <WaterWatchMap
            submissions={layerSettings.researchReports ? levelFilteredSubmissions : []}
            selectedSample={selectedSample}
            onSelectSample={selectSample}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={selectHotspot}
            focusCoords={focusCoords}
            onPopupChange={(hs) => setIsMapPopupActive(!!hs)}
            controllerRef={mapController}
            hideDefaultControls={true}
            mapType={mapType}
            showLabels={showLabels}
            showBoundaryLabels={showBoundaryLabels}
            selectedArea={selectedArea}
            selectedAreaFeature={areaFeature}
            provinceFeatures={boundaryData?.provinces?.features}
            boundaryData={boundaryData}
            onAreaSelect={selectArea}
            riverVisible={layerSettings.river}
            boundaryVisibility={{
              country: layerSettings.country,
              province: layerSettings.province,
              locality: layerSettings.locality
            }}
          />
        </div>

        <MapAreaSidebar
          area={selectedArea}
          onSelect={selectArea}
          countries={boundaryData?.countries}
          provinces={boundaryData?.provinces}
          districts={boundaryData?.districts}
          loading={boundaryLoading}
          error={boundaryError}
          samplesError={samplesError}
          samplesLoading={!samplesLoaded && !samplesError}
          onRetrySamples={() => pollingRef.current?.refresh()}
          retryingSamples={isSyncing}
          areaCounts={areaCounts}
          onRetry={() => setBoundaryRetry(value => value + 1)}
          resultCount={samplesLoaded && !samplesError ? levelFilteredSubmissions.length : null}
        />

        {/* 1. สถานการณ์ลุ่มน้ำวันนี้ (บนซ้าย - สไตล์เดียวกับตัวอ้างอิง) */}
        <section className="basin-status-card" aria-labelledby="basin-status-title">
          <h1 id="basin-status-title">ผลตรวจ 24 ชั่วโมงล่าสุด</h1>
          {submissions.length > 0 && todayStatus.total > 0 ? (
            <>
              <div
                className="basin-status-bar"
                role="img"
                aria-label={`สัดส่วนสถานะ: เกินเกณฑ์ ${todayStatus.critical}, เฝ้าระวัง ${todayStatus.watch}, ปกติ ${todayStatus.normal}, ไม่มีค่า ${todayStatus.unknown}`}
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
                <span
                  className="status-unknown"
                  style={{ width: `${(todayStatus.unknown / todayStatus.total) * 100}%` }}
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
                {todayStatus.unknown > 0 && <span className="basin-status-count">| ไม่มีค่า: {todayStatus.unknown}</span>}
              </p>
            </>
          ) : (
            <p className="basin-status-unavailable" role="status">
              {samplesError ? 'ยังโหลดผลตรวจไม่สำเร็จ' : !samplesLoaded ? 'กำลังโหลดผลตรวจ…' : 'ยังไม่มีผลตรวจใน 24 ชั่วโมงล่าสุด'}
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

        {/* 3. TIME RANGE Capsule (ล่างกลาง ดีไซน์โมเดิร์น กระจกใสพรีเมียม) */}
        <section
          className={`time-range-capsule ${timeFilter !== 'all' ? 'is-filtered' : ''}`}
          aria-label="ตัวกรองช่วงเวลา"
        >
          <button
            type="button"
            className="time-range-capsule-btn group"
            onClick={() => setIsTimeFilterOpen(true)}
            aria-label={`เลือกช่วงเวลาข้อมูล (${activeFilterOption.label})`}
            title="คลิกเพื่อเลือกช่วงเวลาตรวจวัดสารหนูบนแผนที่"
          >
            {/* Calendar Icon Badge */}
            <div className={`time-range-icon-badge ${timeFilter !== 'all' ? 'is-active' : ''}`}>
              <CalendarDays size={16} />
              {timeFilter !== 'all' && (
                <span className="time-range-pulse-dot" />
              )}
            </div>

            {/* Typography Labels */}
            <div className="time-range-text-block">
              <span className="time-range-micro-tag">TIME RANGE</span>
              <div className="time-range-main-row">
                <span className="time-range-active-title">{activeFilterOption.label}</span>
                <span className="time-range-points-badge">
                  {samplesError ? 'โหลดไม่สำเร็จ' : !samplesLoaded ? 'กำลังโหลด…' : `${filterCounts[timeFilter] !== undefined ? filterCounts[timeFilter] : filteredSubmissions.length} จุด`}
                </span>
              </div>
            </div>

            {/* Divider Line */}
            <div className="time-range-v-divider" />

            {/* Dropdown Chevron Indicator */}
            <div className="time-range-chevron-wrap">
              <ChevronDown size={14} className="time-range-chevron" />
            </div>
          </button>
        </section>

        {/* 4. Map Floating Controls (บนขวา แนวตั้ง) */}
        <div className="map-controls" aria-label="เครื่องมือแผนที่">
          <div className="map-actions" aria-label="เมนูหลัก">
            {/* ปุ่มเข้าสู่ระบบผู้ดูแลระบบ (User / Admin Login) บนขวา */}
            <button
              className={`round-control user-admin-btn ${sessionUser ? 'is-active' : ''}`}
              type="button"
              aria-label="เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)"
              disabled={serverReadOnly}
              title={sessionUser ? "ผู้ดูแลระบบ (คลิกเพื่อเข้าระบบหลังบ้าน)" : "เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)"}
              onClick={() => {
                if (onOpenAdmin) onOpenAdmin();
                else window.location.hash = '#admin';
              }}
            >
              <User size={20} className={sessionUser ? "text-[#A6192E]" : "text-slate-700"} />
            </button>

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
              ref={settingsButtonRef}
              className={`round-control ${settingsOpen ? 'is-active' : ''}`}
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
              aria-label="พิกัด GPS ปัจจุบัน"
              title="ไปยังตำแหน่งพิกัด GPS ปัจจุบันของเครื่อง"
              disabled={isLocating}
              onClick={() => {
                setIsLocating(true);
                mapController.current?.locateUser?.();
                setTimeout(() => setIsLocating(false), 2500);
              }}
            >
              <LocateFixed
                size={19}
                className={isLocating ? 'text-sky-500 animate-spin' : 'text-[#176756] hover:text-[#0e483b] transition-colors'}
              />
            </button>
          </div>

          {/* Zoom Control Capsule (เฉพาะ + และ -) */}
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
          <section className="map-utility-panel map-utility-panel--detail" role="region" aria-labelledby="water-guide-title">
            <header className="utility-detail-header">
              <div>
                <span className="utility-detail-kicker">KOK WATER WATCH</span>
                <h2 id="water-guide-title">คู่มือการใช้งานแผนที่และผลตรวจ</h2>
                <p>อ่านข้อมูลตามช่วงเวลา ดูตำแหน่งตัวอย่าง และตรวจความหมายของค่าสารหนูก่อนนำไปใช้</p>
              </div>
              <button type="button" className="map-utility-close" aria-label="ปิดคู่มือ" onClick={() => setGuideOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="utility-detail-body">
              <ol className="water-guide-grid">
                <li>
                  <strong>1. เลือกช่วงเวลาที่ต้องการดู</strong>
                  <p>กด TIME RANGE ด้านล่างแผนที่ เลือก 24 ชั่วโมงล่าสุด, 7 วัน, 30 วัน, 90 วัน, 1 ปี หรือระบุวันเอง แผนที่ รายการผลตรวจ สรุปผล และไฟล์ CSV จะอิงช่วงเวลาที่เลือก</p>
                </li>
                <li>
                  <strong>2. อ่านจุดตรวจบนแผนที่</strong>
                  <p>ซูมเข้าเพื่อแยกจุดตรวจ แตะหมุดหรือก้อน Hotspot เพื่อดูชื่อพื้นที่ จำนวนตัวอย่าง ค่าสารหนู และรายละเอียดที่บันทึกไว้ รวมถึงภาพถ่ายเมื่อรายการนั้นมีภาพ</p>
                </li>
                <li>
                  <strong>3. แปลผลค่าสารหนู</strong>
                  <p>หน่วยเป็น ppb: ต่ำกว่า 5 = ปกติ, 5–10 = เฝ้าระวังในระบบ, มากกว่า 10 = เกินเกณฑ์ที่แสดงบนแผนที่ ระดับ 5 ppb เป็นเกณฑ์เตือนของระบบ ไม่ใช่เกณฑ์กฎหมาย</p>
                </li>
                <li>
                  <strong>4. ดูเส้นทางน้ำและขอบเขต</strong>
                  <p>กดตั้งค่าเพื่อสลับภาพดาวเทียม ถนน หรือภูมิประเทศ ดูแนวแม่น้ำกกสีฟ้าทั้งสาย และเน้นขอบเขตประเทศ จังหวัด หรือพื้นที่ย่อย</p>
                </li>
                <li>
                  <strong>5. ตรวจแนวโน้มสุขภาพน้ำ</strong>
                  <p>กดปุ่มปฏิทินด้านขวา สรุปจะแสดงยอดตามช่วงเวลาที่เลือก สลับกราฟรายวันหรือรายเดือน แล้วกดแท่งกราฟเพื่อดูจำนวนปกติ เฝ้าระวัง เกินเกณฑ์ และรายการที่ไม่มีค่าตรวจ</p>
                </li>
                <li>
                  <strong>6. บันทึกและส่งออก</strong>
                  <p>กด “ทำแบบสำรวจ” เพื่อเพิ่มผลตรวจพร้อมพิกัด กดดาวน์โหลดเพื่อส่งออก CSV เฉพาะช่วงเวลาที่เลือก ตรวจวันเวลาและแหล่งที่มาของแต่ละรายการก่อนใช้ประกอบการตัดสินใจ</p>
                </li>
              </ol>
              <div className="utility-detail-note">จำนวนในสรุปหมายถึง “รายการผลตรวจ” ไม่ใช่จำนวนสถานีที่ไม่ซ้ำ และข้อมูลบนแผนที่ไม่ใช่การวัดแบบเรียลไทม์</div>
            </div>
          </section>
        )}

        {summaryOpen && (
          <section className="map-utility-panel map-utility-panel--detail" role="region" aria-labelledby="water-summary-title">
            <header className="utility-detail-header">
              <div>
                <span className="utility-detail-kicker">WATER QUALITY</span>
                <h2 id="water-summary-title">สรุปผลตรวจคุณภาพน้ำ</h2>
                <p>ช่วงเวลาที่เลือก: {activeFilterOption.fullLabel} · นับตามวันเก็บตัวอย่าง เวลาไทย</p>
              </div>
              <button type="button" className="map-utility-close" aria-label="ปิดสรุปผลตรวจ" onClick={() => setSummaryOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="utility-detail-body">
              <div className="water-summary-intro">
                <div><span>ในช่วงที่เลือก</span><strong>{summaryData.overall.total}</strong><small>รายการผลตรวจ</small></div>
                <div><span>24 ชั่วโมงล่าสุด</span><strong>{todayStatus.total}</strong><small>รายการจากข้อมูลทั้งหมด</small></div>
                <div><span>ค่าเฉลี่ยสารหนู</span><strong>{summaryData.overall.average === null ? '—' : summaryData.overall.average.toFixed(1)}</strong><small>ppb · เฉพาะรายการที่มีค่า</small></div>
              </div>
              <div className="water-summary-status" aria-label="จำนวนผลตรวจตามระดับสารหนู">
                <div className="is-critical"><strong>{summaryData.overall.critical}</strong><span>เกินเกณฑ์<br />มากกว่า 10 ppb</span></div>
                <div className="is-watch"><strong>{summaryData.overall.watch}</strong><span>เฝ้าระวัง<br />5–10 ppb</span></div>
                <div className="is-normal"><strong>{summaryData.overall.normal}</strong><span>ปกติ<br />ต่ำกว่า 5 ppb</span></div>
                <div className="is-unknown"><strong>{summaryData.overall.unknown}</strong><span>ไม่มีค่าตรวจ<br />ยังจัดระดับไม่ได้</span></div>
              </div>
              <Suspense fallback={<div role="status">กำลังโหลดกราฟ…</div>}><WaterHealthChart summary={summaryData} /></Suspense>
              {summaryData.undated > 0 && <p className="water-summary-caveat">อีก {summaryData.undated} รายการไม่มีวันเวลาที่ใช้ได้ จึงรวมในยอดช่วงที่เลือกแต่ไม่อยู่ในกราฟ</p>}
              <div className="utility-detail-note">ผลสรุปเป็นจำนวนรายการ ไม่ใช่จำนวนสถานีที่ไม่ซ้ำ · 5 ppb เป็นระดับเตือนของระบบ ไม่ใช่เกณฑ์กฎหมาย · ค่าที่หายไม่ถูกนับเป็น “ปกติ”</div>
            </div>
          </section>
        )}

        {settingsOpen && (
          <section
            ref={settingsPanelRef}
            className="map-settings-panel"
            id="map-settings-panel"
            aria-label="ตั้งค่าแผนที่และเลเยอร์"
          >
            {/* ตัวเลือกเฉพาะที่เปลี่ยนแผนที่ได้จริง */}
            <div className="map-settings-header-minimal">
              <span className="map-settings-title-minimal">ตั้งค่าแผนที่</span>
              <button
                type="button"
                className="map-settings-close-minimal"
                aria-label="ปิดตั้งค่า"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="map-settings-title-minimal mb-2">รูปแบบพื้นหลัง</div>
            <div className="map-styles-grid">
              {[
                ['satellite', 'ภาพดาวเทียม', Crosshair],
                ['street', 'ถนนและสถานที่', Map],
                ['terrain', 'ภูมิประเทศ', Mountain]
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mapType === id}
                  className={`map-style-card ${mapType === id ? 'is-active' : ''}`}
                  onClick={() => {
                    setMapType(id);
                    mapController.current?.setMapType?.(id);
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <label className="river-boundary-label-toggle">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(event) => {
                  setShowLabels(event.target.checked);
                  mapController.current?.setShowLabels?.(event.target.checked);
                }}
              />
              แสดงชื่อสถานที่บนแผนที่พื้นหลัง
            </label>

            <div className="map-settings-divider" />

            <div className="map-settings-title-minimal mb-2">ขอบเขตการปกครอง</div>

            {/* รายการเลเยอร์ พร้อมสวิตช์เปิด-ปิด (iOS Toggle) ตามภาพที่ 1 */}
            <div className="space-y-1">
              {/* 1. เขตประเทศ */}
              <div className="layer-toggle-row">
                <div className="layer-toggle-label">
                  <Grid2X2 className="layer-toggle-icon" />
                  <span>เขตประเทศ</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="เปิดปิดเลเยอร์เขตประเทศ"
                  aria-checked={layerSettings.country}
                  className={`ios-toggle ${layerSettings.country ? 'is-on' : 'is-off'}`}
                  onClick={() => {
                    const nextVal = !layerSettings.country;
                    setLayerSettings(prev => ({ ...prev, country: nextVal }));
                  }}
                >
                  <span className="ios-toggle-knob" />
                </button>
              </div>

              {[
                ['province', 'เขตจังหวัด'],
                ['locality', 'เขตพื้นที่']
              ].map(([id, label]) => (
                <div className="layer-toggle-row" key={id}>
                  <div className="layer-toggle-label">
                    <Grid2X2 className="layer-toggle-icon" />
                    <span>{label}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={`เปิดปิดเลเยอร์${label}`}
                    aria-checked={layerSettings[id] !== false}
                    className={`ios-toggle ${layerSettings[id] !== false ? 'is-on' : 'is-off'}`}
                    onClick={() => {
                      setLayerSettings(prev => ({ ...prev, [id]: prev[id] === false }));
                    }}
                  >
                    <span className="ios-toggle-knob" />
                  </button>
                </div>
              ))}

              <div className="map-settings-divider" />
              <div className="river-flow-overview">
                <strong>เส้นทางแม่น้ำกก</strong>
                <span>เมียนมา · แม่อาย · เชียงราย · เชียงแสน · แม่น้ำโขง</span>
                <button type="button" onClick={() => mapController.current?.fitRiverOverview?.()}>
                  <Waves size={15} /> ดูทั้งสาย
                </button>
                <small><a href="https://waterwaymap.org/river/%E0%B9%81%E0%B8%A1%E0%B9%88%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%81%E0%B8%81%20000312531234/" target="_blank" rel="noopener noreferrer">แนวแม่น้ำ: OpenStreetMap / WaterwayMap</a> · ODbL · <a href="/kok-river-source.geojson" download>ดาวน์โหลดข้อมูลต้นฉบับ</a></small>
              </div>

              {/* 2. เส้นแม่น้ำ */}
              <div className="layer-toggle-row">
                <div className="layer-toggle-label">
                  <Waves className="layer-toggle-icon" />
                  <span>เส้นแม่น้ำ</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="เปิดปิดเลเยอร์เส้นแม่น้ำ"
                  aria-checked={layerSettings.river}
                  className={`ios-toggle ${layerSettings.river ? 'is-on' : 'is-off'}`}
                  onClick={() => {
                    setLayerSettings(prev => ({ ...prev, river: !prev.river }));
                  }}
                >
                  <span className="ios-toggle-knob" />
                </button>
              </div>

              <div className="map-settings-divider" />
              <div className="map-settings-title-minimal mb-2">ข้อมูลตรวจวัด</div>
              <div className="layer-toggle-row">
                <div className="layer-toggle-label">
                  <MapPinCheck className="layer-toggle-icon" />
                  <span>จุดตรวจวัดสารหนู</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="เปิดปิดจุดตรวจวัดสารหนูบนแผนที่"
                  aria-checked={layerSettings.researchReports}
                  className={`ios-toggle ${layerSettings.researchReports ? 'is-on' : 'is-off'}`}
                  onClick={() => {
                    setLayerSettings(prev => ({ ...prev, researchReports: !prev.researchReports }));
                  }}
                >
                  <span className="ios-toggle-knob" />
                </button>
              </div>
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

        {/* Survey FAB Button (ทำแบบสำรวจ / แบบทดสอบ - วงกลม ล่างขวา) */}
        <div className="kok-bottom-right-action">
          <button
            className="survey-button"
            type="button"
            aria-label="ทำแบบสำรวจ"
            disabled={serverReadOnly}
            title={serverReadOnly ? 'โหมดอ่านอย่างเดียว ยังไม่เปิดรับผลตรวจ' : 'ทำแบบสำรวจ / บันทึกผลตรวจวัดสารหนู'}
            onClick={() => {
              setSelectedSample(null);
              setSelectedHotspot(null);
              setIsFormOpen(true);
            }}
          >
            <ClipboardList size={20} className="text-white" />
            <span className="kok-fab-tooltip kok-fab-tooltip-left">ทำแบบสำรวจ</span>
          </button>
        </div>
        {serverReadOnly && <div role="status" className="fixed bottom-20 right-4 z-40 bg-white px-3 py-2 rounded-xl shadow text-sm">โหมดอ่านอย่างเดียว · แสดงเฉพาะผลตรวจที่เผยแพร่</div>}

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
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>ตัวกรองช่วงเวลาตรวจวัด</span>
                    {timeFilter !== 'all' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-900/20 scale-[1.01]'
                      : 'bg-slate-50 hover:bg-emerald-50/40 hover:border-emerald-200 border-slate-200 text-slate-800'
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
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-900/20 scale-[1.01]'
                            : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-200 border-slate-200 text-slate-800'
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
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-900/20 scale-[1.01]'
                            : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-200 border-slate-200 text-slate-800'
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
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-900/20 scale-[1.01]'
                            : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-200 border-slate-200 text-slate-800'
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
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        ใช้งานอยู่ ({areaFilteredSubmissions.length} จุด)
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
                        className="text-[11px] text-slate-500 hover:text-emerald-700 underline cursor-pointer"
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
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1 font-medium">วันที่สิ้นสุด</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTimeFilter('custom')}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-900/25 cursor-pointer flex items-center justify-center gap-1.5"
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
                  แสดงผล <strong className="text-emerald-700 text-sm font-bold">{areaFilteredSubmissions.length}</strong> จาก {totalSamples} จุด
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
                <span>โหลดเฉพาะข้อมูลเผยแพร่ · รีเฟรชทุก 30 วินาที {isSyncing ? '· กำลังโหลด…' : ''}</span>
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
                      asVal > 10
                        ? 'bg-rose-100 text-rose-800'
                        : asVal >= 5
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
                  <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-400 truncate">ชื่อสมมติ: {publicPseudonym(sub.sample_code)}</div>
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
            <span>ส่งออก CSV</span>
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

      <Suspense fallback={<div className="fixed bottom-4 left-4 z-50 bg-white p-3 rounded-xl" role="status">กำลังโหลดรายละเอียด…</div>}>
      {/* 6. Hotspot Detail Modal (เมื่อคลิกเลือกก้อน Hotspot หรือจุดตรวจเดี่ยวบนแผนที่) */}
      {selectedHotspot && !isFormOpen && (
        <StationDetailModal
          hotspot={selectedHotspot}
          submissions={areaFilteredSubmissions}
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
        />
      )}

      {/* 8. Form Modal (หน้าต่างกรอกบันทึกผลการตรวจพิกัด GPS) */}
      {(isFormOpen || hasPendingForm) && (
        <div aria-hidden={!isFormOpen} style={{ display: isFormOpen ? undefined : 'none' }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <WaterWatchForm
            onCancel={() => setIsFormOpen(false)}
            onPendingAttemptChange={setHasPendingForm}
            onSubmitSuccess={(newSample) => handleCreateNewSample(newSample)}
          />
        </div>
      )}

      </Suspense>
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

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs leading-relaxed text-emerald-900">
              ฐานข้อมูลและ Storage เชื่อมผ่าน Express API เท่านั้น คีย์ privileged ไม่อยู่ใน browser และไม่สามารถตั้ง project URL/key จากหน้าสาธารณะได้
              <button type="button" onClick={() => pollingRef.current?.refresh()} className="block mt-3 px-3 py-2 rounded-lg bg-emerald-800 text-white font-bold">{isSyncing ? 'กำลังโหลด…' : 'ทดสอบโหลดข้อมูลที่เผยแพร่'}</button>
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

            </div>

            <div className="pt-2 text-[11px] text-slate-500 space-y-1">
              <p>• รูปภาพจัดเก็บลง Supabase Storage Bucket: <code>water-watch-photos</code></p>
              <p>• ผลคิวรออนุมัติและข้อมูลติดต่อไม่ถูกส่งมายังหน้า public</p>
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
