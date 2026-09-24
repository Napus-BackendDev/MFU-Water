import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Database,
  ArrowLeft,
  List,
  MapPin,
  Camera,
  Activity,
  Calendar,
  Download,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Flame,
  RotateCcw
} from 'lucide-react';
import WaterWatchMap from './WaterWatchMap';
import WaterWatchForm from './WaterWatchForm';
import WaterWatchSampleDetail from './WaterWatchSampleDetail';
import StationDetailModal from './StationDetailModal';
import { 
  getStoredSubmissions, 
  saveNewSubmission, 
  INITIAL_SUBMISSIONS,
  clusterSubmissions,
  resetStoredSubmissions
} from '../../data/waterWatchData';
import { 
  fetchSamplesFromSupabase, 
  deleteSampleFromSupabase,
  subscribeToNewSamples,
  getSupabaseCredentials, 
  isSupabaseConfigured 
} from '../../lib/supabase';

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
          const realCodes = new Set(data.map(d => d.sample_code));
          const merged = [...data, ...INITIAL_SUBMISSIONS.filter(init => !realCodes.has(init.sample_code))];
          setSubmissions(merged);
        }
        setIsSyncing(false);
      }
    }
    loadRemoteSamples();
  }, [spConnected]);

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
    if (!submissions || !submissions.length) {
      alert('ยังไม่มีข้อมูลสำหรับส่งออก');
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

    const rows = submissions.map(s => [
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
    link.setAttribute('download', `KOK_Water_Watch_${new Date().toISOString().slice(0, 10)}.csv`);
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

  // Spatial clustering calculation
  const { clusters, singlePoints } = clusterSubmissions(submissions, 250);
  const totalHotspots = clusters.length;
  const totalSinglePoints = singlePoints.length;
  const totalSamples = submissions.length;
  const samplesWithPhotos = submissions.filter(s => s.images && s.images.length > 0).length;

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const code = (sub.sample_code || '').toLowerCase();
    const st = (sub.station_name || '').toLowerCase();
    const collector = (sub.collector?.name || '').toLowerCase();
    return code.includes(q) || st.includes(q) || collector.includes(q);
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F8F7F5] font-['Prompt',sans-serif] text-[#242424]">
      {/* 1. Top Navigation Bar (ขาว 80% • แดง 20% • แต่งขอบทอง) */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[#B4975A]/40 shadow-sm px-4 py-2.5 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#A6192E] flex items-center justify-center text-white shadow-md border border-[#B4975A]">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  KOK Water Watch
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                ระบบเก็บข้อมูลและเฝ้าระวังคุณภาพน้ำแม่น้ำกก &bull; ทีมทดลองภาคสนาม
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Stats Badges (Hotspot, Single Points, Total) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-1 bg-rose-50 rounded-xl border border-rose-200 text-xs flex items-center gap-1.5 font-bold text-rose-800 shadow-2xs">
            <span className="text-xs">🔥</span>
            <span>จุด Hotspot: <strong>{totalHotspots} ก้อน</strong></span>
          </div>
          <div className="px-3 py-1 bg-sky-50 rounded-xl border border-sky-200 text-xs flex items-center gap-1.5 font-bold text-sky-800 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <span>จุดตรวจเดี่ยว: <strong>{totalSinglePoints} จุด</strong></span>
          </div>
          <div className="px-3 py-1 bg-[#F8F7F5] rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 font-medium text-slate-700">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>ผลตรวจทั้งหมด: <strong>{totalSamples} รายการ</strong></span>
          </div>
          <div className="px-3 py-1 bg-[#F8F7F5] rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 font-medium text-slate-700">
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>มีรูปถ่ายแนบ: <strong>{samplesWithPhotos} จุด</strong></span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleExportCSV}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-xs"
            title="ส่งออกข้อมูลเป็นไฟล์ Excel (.csv)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">ส่งออก Excel</span>
          </button>

          <button
            onClick={() => setIsListDrawerOpen(!isListDrawerOpen)}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5"
            title="เปิดดูรายการตัวอย่างที่บันทึกไว้"
          >
            <List className="w-4 h-4 text-[#A6192E]" />
            <span className="hidden sm:inline">รายการ ({totalSamples})</span>
          </button>
        </div>
      </header>

      {/* 2. Interactive Map (Full Screen) */}
      <div className="absolute inset-0 pt-14 z-0">
        <WaterWatchMap
          submissions={submissions}
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
                  {totalSamples} รายการ
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
          submissions={submissions}
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
