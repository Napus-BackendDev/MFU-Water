import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Droplets, Layers, LoaderCircle, RefreshCw, Satellite, Waves, X } from 'lucide-react';
import { THATON_CENTER } from '../data/thatonFloodData';
import { readGeeApiResponse } from '../utils/geeApiResponse';

const MODES = [
  { id: 's2-rgb', label: 'ภาพสีจริง', detail: 'Sentinel-2 · สีธรรมชาติ' },
  { id: 'ndwi', label: 'NDWI', detail: 'แยกน้ำจากแสงเขียว/ใกล้อินฟราเรด' },
  { id: 'mndwi', label: 'MNDWI', detail: 'เน้นน้ำขุ่นและพื้นที่เมือง' },
  { id: 's1-water', label: 'เรดาร์ SAR', detail: 'Sentinel-1 · ดูได้แม้มีเมฆ' },
  { id: 's1-change', label: 'น้ำเพิ่มใหม่', detail: 'เปรียบเทียบเรดาร์ก่อน/หลัง' },
  { id: 'occurrence', label: 'น้ำในอดีต', detail: 'JRC · ความถี่ผิวน้ำ 1984–2021' }
];

const localDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
};

export default function GeeWaterAnalysisView({ onOpenWaterWatch }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const requestRef = useRef(null);
  const initialRunRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mode, setMode] = useState('s2-rgb');
  const [start, setStart] = useState(() => daysAgo(95));
  const [end, setEnd] = useState(() => daysAgo(5));
  const [baselineStart, setBaselineStart] = useState('2024-08-01');
  const [baselineEnd, setBaselineEnd] = useState('2024-08-31');
  const [threshold, setThreshold] = useState(0.1);
  const [cloud, setCloud] = useState(70);
  const [orbit, setOrbit] = useState('DESCENDING');
  const [opacity, setOpacity] = useState(85);
  const [viewChanged, setViewChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [zoom, setZoom] = useState(11.4);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#111b25' } }]
      },
      center: THATON_CENTER,
      zoom: 11.4,
      minZoom: 7,
      maxZoom: 18,
      attributionControl: true
    });
    mapRef.current = map;
    map.on('load', () => setMapReady(true));
    map.on('moveend', () => {
      setZoom(map.getZoom());
      setViewChanged(true);
    });
    map.on('error', (event) => {
      if (event?.error?.message && map.getLayer('gee-raster')) {
        setError(`โหลดชั้นภาพ GEE ไม่สำเร็จ: ${event.error.message}`);
      }
    });
    return () => {
      requestRef.current?.abort();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    const map = mapRef.current;
    if (!map?.loaded()) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    if (map.getLayer('gee-raster')) map.removeLayer('gee-raster');
    if (map.getSource('gee-source')) map.removeSource('gee-source');
    if (map.getLayer('gee-base-raster')) map.removeLayer('gee-base-raster');
    if (map.getSource('gee-base-source')) map.removeSource('gee-base-source');

    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].map((n) => n.toFixed(5)).join(',');
    const params = new URLSearchParams({ mode, bbox, start, end, baselineStart, baselineEnd, threshold: String(threshold), cloud: String(cloud), orbit });
    try {
      const statusResponse = await fetch('/api/status', { signal: controller.signal });
      const status = await readGeeApiResponse(statusResponse, 'สถานะ GEE');
      if (!status.geeConnected) throw new Error('Google Earth Engine ยังไม่เชื่อมต่อ ตรวจ service account ของเซิร์ฟเวอร์');
      const response = await fetch(`/api/gee/analyze?${params}`, { signal: controller.signal });
      const data = await readGeeApiResponse(response, 'การวิเคราะห์ GEE');
      if (controller.signal.aborted) return;
      if (data.baseTileUrl) {
        map.addSource('gee-base-source', {
          type: 'raster', tiles: [data.baseTileUrl], tileSize: 256,
          attribution: 'Google Earth Engine · Copernicus Sentinel-2'
        });
        map.addLayer({ id: 'gee-base-raster', type: 'raster', source: 'gee-base-source' });
      }
      map.addSource('gee-source', {
        type: 'raster', tiles: [data.tileUrl], tileSize: 256,
        attribution: 'Google Earth Engine · Copernicus / JRC'
      });
      map.addLayer({
        id: 'gee-raster', type: 'raster', source: 'gee-source',
        paint: { 'raster-opacity': mode === 's2-rgb' ? 1 : opacity / 100, 'raster-fade-duration': 0 }
      });
      setResult(data);
      setViewChanged(false);
    } catch (caught) {
      if (caught.name !== 'AbortError') {
        setError(caught instanceof TypeError ? 'เชื่อมต่อ API GEE ไม่ได้ กรุณารีสตาร์ต npm run dev' : caught.message || 'วิเคราะห์ไม่สำเร็จ');
      }
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, [mode, start, end, baselineStart, baselineEnd, threshold, cloud, orbit, opacity]);

  useEffect(() => {
    if (mapReady && !initialRunRef.current) {
      initialRunRef.current = true;
      runAnalysis();
    }
  }, [mapReady, runAnalysis]);

  useEffect(() => {
    requestRef.current?.abort();
    setLoading(false);
    setError('');
    setResult(null);
    const map = mapRef.current;
    if (map?.getLayer('gee-raster')) map.removeLayer('gee-raster');
    if (map?.getSource('gee-source')) map.removeSource('gee-source');
    if (map?.getLayer('gee-base-raster')) map.removeLayer('gee-base-raster');
    if (map?.getSource('gee-base-source')) map.removeSource('gee-base-source');
  }, [mode, start, end, baselineStart, baselineEnd, threshold, cloud, orbit]);

  useEffect(() => {
    const map = mapRef.current;
    if (mapReady && map?.getLayer('gee-raster')) {
      map.setPaintProperty('gee-raster', 'raster-opacity', mode === 's2-rgb' ? 1 : opacity / 100);
    }
  }, [opacity, mode, mapReady]);

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 's1-change') {
      setStart('2024-09-10');
      setEnd('2024-09-25');
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#111b25] font-['Prompt',sans-serif] text-slate-900">
      <div ref={containerRef} className="absolute inset-0" aria-label="แผนที่ชั้นภาพจาก Google Earth Engine" />

      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
        <div className="rounded-xl bg-sky-600 p-2 text-white"><Waves size={20} /></div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold sm:text-base">วิเคราะห์ผิวน้ำลุ่มน้ำกก</h1>
          <p className="truncate text-[11px] text-slate-500">ภาพและผลคำนวณจาก Google Earth Engine เท่านั้น</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="ซูมเข้า" className="rounded-xl bg-white px-3 py-2 font-bold shadow-lg">+</button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="ซูมออก" className="rounded-xl bg-white px-3 py-2 font-bold shadow-lg">−</button>
        <button type="button" onClick={() => mapRef.current?.flyTo({ center: THATON_CENTER, zoom: 11.4 })} className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold shadow-lg"><Crosshair size={15} /> ท่าตอน</button>
      </div>

      <div className="absolute bottom-4 right-4 z-10">
        <button type="button" onClick={onOpenWaterWatch} className="flex items-center gap-2 rounded-xl bg-[#A6192E] px-4 py-2.5 text-xs font-bold text-white shadow-lg"><Droplets size={16} /> KOK Water Watch</button>
      </div>

      {!panelOpen ? (
        <button type="button" onClick={() => setPanelOpen(true)} className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-xl"><Layers size={18} /> เครื่องมือวิเคราะห์ GEE</button>
      ) : (
        <section aria-label="เครื่องมือวิเคราะห์ทางน้ำ" className="absolute right-4 top-4 z-20 w-[min(390px,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2"><Satellite className="text-sky-600" size={20} /><div><h2 className="text-sm font-bold">เครื่องมือวิเคราะห์น้ำ</h2><p className="text-[11px] text-slate-500">เลือกวิธีและช่วงเวลา แล้ววิเคราะห์พื้นที่บนจอ</p></div></div>
            <button type="button" aria-label="ย่อเครื่องมือวิเคราะห์" onClick={() => setPanelOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="รูปแบบการวิเคราะห์">
            {MODES.map((item) => (
              <button key={item.id} type="button" onClick={() => chooseMode(item.id)} aria-pressed={mode === item.id} className={`rounded-xl border p-2 text-left transition ${mode === item.id ? 'border-sky-600 bg-sky-50 ring-1 ring-sky-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                <strong className="block text-xs">{item.label}</strong><span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{item.detail}</span>
              </button>
            ))}
          </div>

          {mode !== 'occurrence' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold">เริ่มวิเคราะห์<input aria-label="วันที่เริ่มวิเคราะห์" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" /></label>
              <label className="text-[11px] font-semibold">สิ้นสุด (รวมวันนี้)<input aria-label="วันที่สิ้นสุดวิเคราะห์" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" /></label>
            </div>
          )}

          {mode === 's1-change' && (
            <div className="mt-3 rounded-xl bg-amber-50 p-2.5">
              <p className="mb-2 text-[11px] font-bold text-amber-900">ช่วงก่อนเหตุการณ์สำหรับเปรียบเทียบ</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px]">เริ่ม<input aria-label="วันที่เริ่มช่วงก่อนเหตุการณ์" type="date" value={baselineStart} onChange={(e) => setBaselineStart(e.target.value)} className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2 text-xs" /></label>
                <label className="text-[11px]">สิ้นสุด<input aria-label="วันที่สิ้นสุดช่วงก่อนเหตุการณ์" type="date" value={baselineEnd} onChange={(e) => setBaselineEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2 text-xs" /></label>
              </div>
            </div>
          )}

          {(mode === 'ndwi' || mode === 'mndwi') && (
            <label className="mt-3 block text-[11px] font-semibold">เกณฑ์แยกน้ำ {Number(threshold).toFixed(2)}<input aria-label="เกณฑ์แยกน้ำ" type="range" min="-0.1" max="0.5" step="0.05" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-1 w-full accent-sky-600" /></label>
          )}
          {(mode === 's2-rgb' || mode === 'ndwi' || mode === 'mndwi') && (
            <label className="mt-3 block text-[11px] font-semibold">ยอมรับเมฆระดับฉาก ≤ {cloud}%<input aria-label="เกณฑ์เมฆ" type="range" min="10" max="100" step="10" value={cloud} onChange={(e) => setCloud(Number(e.target.value))} className="mt-1 w-full accent-sky-600" /></label>
          )}
          {(mode === 's1-water' || mode === 's1-change') && (
            <label className="mt-3 block text-[11px] font-semibold">ทิศทางวงโคจร<select aria-label="ทิศทางวงโคจร" value={orbit} onChange={(e) => setOrbit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"><option value="DESCENDING">Descending</option><option value="ASCENDING">Ascending</option></select></label>
          )}
          {mode !== 's2-rgb' && <label className="mt-3 block text-[11px] font-semibold">ความเข้มชั้นภาพ {opacity}%<input aria-label="ความเข้มชั้นภาพ" type="range" min="20" max="100" step="5" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-1 w-full accent-sky-600" /></label>}

          <button type="button" disabled={!mapReady || loading} onClick={runAnalysis} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            {loading ? 'GEE กำลังประมวลผล…' : 'วิเคราะห์พื้นที่ที่มองเห็น'}
          </button>
          <p className="mt-1.5 text-[10px] text-slate-500">ภาพครอบคลุม viewport ทั้งจอ ไม่มีกรอบ JPEG · ซูม {zoom.toFixed(1)}</p>
          {viewChanged && result && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">เลื่อนแผนที่แล้ว กดวิเคราะห์อีกครั้งเพื่ออัปเดตพื้นที่และตัวเลข</p>}
          {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}

          {result && (
            <div className="mt-3 space-y-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3" aria-live="polite">
              <div className="flex items-center justify-between"><strong className="text-xs">ผลจาก GEE</strong><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">คำนวณจาก GEE</span></div>
              <p className="text-[11px] text-slate-700">ชุดข้อมูล: <code>{result.provenance.dataset}</code></p>
              {result.provenance.imageCount !== null && <p className="text-[11px] text-slate-700">ภาพที่ใช้: {result.provenance.imageCount} ฉาก{result.provenance.baselineImageCount !== null ? ` · ก่อนเหตุการณ์ ${result.provenance.baselineImageCount} ฉาก` : ''}</p>}
              {result.metrics && <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-slate-500">{mode === 'occurrence' ? 'พื้นที่มีประวัติน้ำ' : 'พื้นที่ภาพใช้วิเคราะห์'}</span><strong className="text-sm">{result.metrics.observedAreaKm2} กม.²</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-[10px] text-slate-500">{mode === 's1-change' ? 'น้ำเพิ่มที่เข้าข่าย' : mode === 'occurrence' ? 'น้ำถาวร ≥ 50%' : 'พื้นที่เข้าข่ายน้ำ'}</span><strong className="text-sm">{result.metrics.waterAreaKm2 === null ? '—' : `${result.metrics.waterAreaKm2} กม.²`}</strong></div></div>}
              {result.metricError && <p className="text-[11px] text-amber-800">{result.metricError}</p>}
              {mode !== 's2-rgb' && <p className="text-[10px] text-slate-600">ชั้นพื้นหลัง: {result.baseTileUrl ? 'ภาพสีจริง Sentinel-2 จาก GEE' : 'ไม่พบภาพสีจริงในช่วงนี้'}</p>}
              {(mode === 's1-water' || mode === 's1-change') && <p className="text-[10px] text-slate-600">{mode === 's1-change' ? 'สีส้ม' : 'สีฟ้า'} = พื้นที่เข้าข่ายน้ำ · พื้นที่อื่นเป็นภาพพื้นหลัง</p>}
              <p className="text-[10px] leading-relaxed text-slate-600">วิธี: {result.provenance.method}</p>
              <p className="text-[10px] text-slate-500">ผลดัชนี/เรดาร์เป็นการคัดกรอง ต้องตรวจสอบภาคสนามก่อนใช้ตัดสินใจ</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
