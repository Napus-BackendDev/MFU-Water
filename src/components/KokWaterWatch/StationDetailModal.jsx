import React, { useState } from 'react';
import {
  X,
  MapPin,
  Cpu,
  Clock,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Droplets,
  Plus,
  Eye,
  CheckCircle2,
  Activity,
  FileText,
  Search,
  Filter,
  RotateCcw
} from 'lucide-react';

export default function StationDetailModal({
  station,
  submissions = [],
  onClose,
  onRecordForStation,
  onSelectSample
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'safe' | 'watch' | 'danger'
  const [photoOnly, setPhotoOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  if (!station) return null;

  // Filter logs belonging to this station
  const stationLogs = submissions.filter(sub => {
    if (sub.station_id === station.id || sub.station_id === station.code) return true;
    if (sub.station_name && sub.station_name.includes(station.name)) return true;
    // Or if within 300m
    if (sub.coordinates && station.coordinates) {
      const [lng, lat] = sub.coordinates;
      const [sLng, sLat] = station.coordinates;
      const diff = Math.abs(lng - sLng) + Math.abs(lat - sLat);
      return diff < 0.005;
    }
    return false;
  }).sort((a, b) => new Date(b.collection_time || 0) - new Date(a.collection_time || 0));

  // Applied Filters
  const filteredLogs = stationLogs.filter(log => {
    // Search by collector name, sample code, or org
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (log.collector?.name || '').toLowerCase();
      const code = (log.sample_code || '').toLowerCase();
      const org = (log.collector?.organization || '').toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !org.includes(q)) return false;
    }

    // Risk Filter
    const asVal = log.measurements?.arsenic?.value;
    if (riskFilter === 'safe') {
      if (asVal === null || asVal > 10) return false;
    } else if (riskFilter === 'watch') {
      if (asVal === null || asVal <= 10 || asVal > 20) return false;
    } else if (riskFilter === 'danger') {
      if (asVal === null || asVal <= 20) return false;
    }

    // Photo Only
    if (photoOnly && (!log.images || log.images.length === 0)) return false;

    return true;
  }).sort((a, b) => {
    const timeA = new Date(a.collection_time || 0).getTime();
    const timeB = new Date(b.collection_time || 0).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const latestLog = stationLogs[0] || null;
  const latestAs = latestLog?.measurements?.arsenic?.value ?? null;
  const isDanger = latestAs !== null && latestAs > 20;
  const isWatch = latestAs !== null && latestAs > 10 && latestAs <= 20;
  const isSafe = latestAs !== null && latestAs <= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div className="p-4 sm:p-5 bg-[#A6192E] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-black tracking-wider uppercase">
                  {station.code || station.id}
                </span>
                <span className="text-[11px] text-amber-200 font-mono">
                  {station.device?.code || 'DEVICE-NODE'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold leading-tight mt-0.5">
                {station.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Station & Device Hardware Specs Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#A6192E]" />
                ข้อมูลเครื่องตรวจวัดประจำสถานี (Assigned Device)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ออนไลน์ / ประจำการ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-medium">รุ่นอุปกรณ์ / Model</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block" title={station.device?.model}>
                  {station.device?.model || 'WaterSonde X1'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-medium">Serial No.</span>
                <span className="font-mono text-slate-700 text-[11px] font-semibold">
                  {station.device?.serial || 'SN-2026-0000'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-medium">พิกัดสถานีแม่น้ำ</span>
                <span className="font-mono text-slate-700 text-[10px] truncate block">
                  {station.coordinates ? `${station.coordinates[1].toFixed(4)}, ${station.coordinates[0].toFixed(4)}` : '-'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-medium">Calibrated ล่าสุด</span>
                <span className="text-slate-700 text-[11px] font-semibold">
                  {station.device?.lastCalibrated || '2026-09-20'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              📍 <span className="font-medium text-slate-700">{station.description}</span> ({station.subdistrict} {station.district} {station.province})
            </p>
          </div>

          {/* Quick Metrics of Latest Reading */}
          {latestLog ? (
            <div className="p-3.5 rounded-2xl bg-white border border-[#B4975A]/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#B4975A]" />
                  ผลการตรวจวัดล่าสุดของเครื่องนี้
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(latestLog.collection_time).toLocaleDateString('th-TH')} {new Date(latestLog.collection_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className={`p-2 rounded-xl border ${
                  isDanger ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  isWatch ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span className="text-[10px] block opacity-80 font-medium">สารหนู (As)</span>
                  <span className="text-sm font-black font-mono">
                    {latestAs !== null ? `${latestAs} µg/L` : '-'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">ค่า pH</span>
                  <span className="text-sm font-bold font-mono">
                    {latestLog.measurements?.ph?.value ?? '-'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">ความขุ่น</span>
                  <span className="text-sm font-bold font-mono">
                    {latestLog.measurements?.turbidity?.value ? `${latestLog.measurements.turbidity.value} NTU` : '-'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">อุณหภูมิน้ำ</span>
                  <span className="text-sm font-bold font-mono">
                    {latestLog.measurements?.temperature?.value ? `${latestLog.measurements.temperature.value} °C` : '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ยังไม่มีประวัติการบันทึกตรวจวัดสำหรับสถานีนี้ สามารถกดปุ่มบันทึกข้อมูลเพื่อเริ่มบันทึกครั้งแรกได้</span>
            </div>
          )}

          {/* Locked Station Audit Log Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#A6192E]" />
                ประวัติการกรอกข้อมูล (Station Submission Logs — {stationLogs.length} รายการ)
              </h4>
              <span className="text-[10px] text-slate-400">
                บันทึกประวัติแบบล็อคเครื่อง
              </span>
            </div>

            {/* Filter & Search Bar */}
            {stationLogs.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อผู้ตรวจวัด / รหัสตัวอย่าง / สังกัด..."
                      className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#A6192E] text-slate-800 placeholder-slate-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <span className="text-[10px] text-slate-500 font-medium">เรียง:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-hidden focus:border-[#A6192E]"
                    >
                      <option value="newest">ล่าสุดก่อน</option>
                      <option value="oldest">เก่าสุดก่อน</option>
                    </select>
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                    ตัวกรอง:
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setRiskFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      riskFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ทั้งหมด ({stationLogs.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskFilter('safe')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      riskFilter === 'safe'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    ปลอดภัย (&le; 10 µg)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskFilter('watch')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      riskFilter === 'watch'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    เฝ้าระวัง (10.1-20 µg)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRiskFilter('danger')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      riskFilter === 'danger'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    เกินเกณฑ์ (&gt; 20 µg)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoOnly(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      photoOnly
                        ? 'bg-[#B4975A] text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>📷 มีรูปถ่าย</span>
                  </button>
                </div>

                {/* Active filters reset bar */}
                {(searchQuery || riskFilter !== 'all' || photoOnly) && (
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-200">
                    <span>พบ <strong>{filteredLogs.length}</strong> จาก {stationLogs.length} รายการ</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setRiskFilter('all');
                        setPhotoOnly(false);
                      }}
                      className="text-[#A6192E] hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            )}

            {stationLogs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">ยังไม่มีข้อมูลที่บันทึกผ่านสถานีนี้</p>
                <p className="text-[11px] text-slate-400 mt-0.5">กดปุ่มด้านล่างเพื่อบันทึกข้อมูลคุณภาพน้ำเข้าสถานีนี้</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Filter className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600 font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขตัวกรอง</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRiskFilter('all');
                    setPhotoOnly(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-[#A6192E] font-bold hover:bg-slate-50 transition-all shadow-2xs"
                >
                  ล้างตัวกรองเพื่อดูทั้งหมด
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log, idx) => {
                  const asVal = log.measurements?.arsenic?.value;
                  const logDanger = asVal !== null && asVal > 20;
                  const logWatch = asVal !== null && asVal > 10 && asVal <= 20;

                  return (
                    <div 
                      key={log.record_id || idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-[#B4975A] hover:shadow-md transition-all space-y-2.5"
                    >
                      {/* Top Row: Code & Collector Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {log.sample_code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-medium">
                            <User className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                            <span>{log.collector?.name || 'ไม่ระบุชื่อผู้เก็บ'}</span>
                            {log.collector?.organization && (
                              <span className="text-[10px] text-slate-400">({log.collector.organization})</span>
                            )}
                          </div>
                        </div>

                        {/* Arsenic Badge */}
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                          logDanger ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          logWatch ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          As: {asVal !== null ? `${asVal} µg/L` : '-'}
                        </div>
                      </div>

                      {/* Middle: Measurements details & Notes */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span>pH: <strong className="text-slate-700">{log.measurements?.ph?.value ?? '-'}</strong></span>
                          <span>ความขุ่น: <strong className="text-slate-700">{log.measurements?.turbidity?.value ?? '-'} NTU</strong></span>
                          <span>อุณหภูมิ: <strong className="text-slate-700">{log.measurements?.temperature?.value ?? '-'} °C</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.collection_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                        </div>
                      </div>

                      {log.sample_nature?.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                          &ldquo;{log.sample_nature.notes}&rdquo;
                        </p>
                      )}

                      {/* Bottom Row: Images thumbnails & Inspect button */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {log.images && log.images.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt={img.title || 'รูปตรวจวัด'}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedPhoto(img.url)}
                            />
                          ))}
                        </div>

                        {onSelectSample && (
                          <button
                            onClick={() => {
                              onSelectSample(log);
                              onClose();
                            }}
                            className="text-[11px] text-[#A6192E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            ดูรายละเอียดเต็ม
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            ปิด
          </button>

          <button
            type="button"
            onClick={() => {
              if (onRecordForStation) onRecordForStation(station);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs sm:text-sm border border-[#B4975A] shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300 stroke-[2.5]" />
            บันทึกข้อมูลน้ำสำหรับสถานีนี้
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
