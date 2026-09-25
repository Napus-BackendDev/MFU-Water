import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './KokWaterWatch/kokWaterWatchModern.css';
import './GeeWaterTimeline.css';
import {
  Code2,
  Copy,
  Crosshair,
  Droplets,
  Grid2X2,
  LoaderCircle,
  Map as MapIcon,
  Minus,
  Mountain,
  PanelLeft,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Satellite,
  Settings,
  Waves,
  X
} from 'lucide-react';
import { THATON_CENTER } from '../data/thatonFloodData';
import { thaiBoundaryLabelExpression } from './KokWaterWatch/boundaryThaiLabels';
import { readGeeApiResponse } from '../utils/geeApiResponse';
import { compatibleAfterFrames, selectDefaultPair } from '../utils/thaTonTimeline';

const MODES = [
  { id: 's2-rgb', label: 'ภาพสีจริง', detail: 'Sentinel-2 · สีธรรมชาติ' },
  { id: 'ndwi', label: 'NDWI', detail: 'แยกน้ำจากแสงเขียว/ใกล้อินฟราเรด' },
  { id: 'mndwi', label: 'MNDWI', detail: 'เน้นน้ำขุ่นและพื้นที่เมือง' },
  { id: 's1-water', label: 'เรดาร์ SAR', detail: 'Sentinel-1 · ดูได้แม้มีเมฆ' },
  { id: 's1-change', label: 'น้ำเพิ่มใหม่', detail: 'เปรียบเทียบเรดาร์ก่อน/หลัง' },
  { id: 'occurrence', label: 'น้ำในอดีต', detail: 'JRC · ความถี่ผิวน้ำ 1984–2021' }
];

const DEFAULT_TIMELINE = { start: '2024-09-05', end: '2024-10-05' };
const sceneDate = (frame) => frame ? new Date(frame.acquiredAt).toLocaleDateString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok'
}) : '—';

export default function GeeWaterAnalysisView({ onOpenWaterWatch }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const requestRef = useRef(null);
  const frameRequestRef = useRef(null);
  const compareRequestRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [frames, setFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameDetail, setFrameDetail] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [frameLoading, setFrameLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [timelineStart, setTimelineStart] = useState(DEFAULT_TIMELINE.start);
  const [timelineEnd, setTimelineEnd] = useState(DEFAULT_TIMELINE.end);
  const [appliedPeriod, setAppliedPeriod] = useState(DEFAULT_TIMELINE);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [beforeIndex, setBeforeIndex] = useState(-1);
  const [afterIndex, setAfterIndex] = useState(-1);
  const [compareMode, setCompareMode] = useState('timeline');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Map Background and Boundary Layer States (ตรงตามมาตรฐานระบบ)
  const [mapType, setMapType] = useState('satellite');
  const [showLabels, setShowLabels] = useState(false);
  const [boundarySettings, setBoundarySettings] = useState({
    province: true,
    locality: true
  });
  const [showBoundaryLabels, setShowBoundaryLabels] = useState(true);

  // GEE Parameters
  const [mode, setMode] = useState('s2-rgb');
  const [start, setStart] = useState(DEFAULT_TIMELINE.start);
  const [end, setEnd] = useState('2024-10-05');
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

  // Initialize MapLibre with Google Basemap and GeoJSON Boundaries
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const styleDefinition = {
      version: 8,
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      sources: {
        googleStreet: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        },
        googleSatellite: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        },
        googleStreetNoLabels: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=m&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=m&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=m&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=m&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        },
        googleSatelliteNoLabels: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        },
        googleTerrain: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        },
        googleTerrainNoLabels: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        }
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#111b25' } },
        { id: 'google-street-layer', type: 'raster', source: 'googleStreet', minzoom: 0, maxzoom: 21, layout: { visibility: 'none' } },
        { id: 'google-street-no-labels-layer', type: 'raster', source: 'googleStreetNoLabels', minzoom: 0, maxzoom: 21, layout: { visibility: 'none' } },
        { id: 'google-satellite-layer', type: 'raster', source: 'googleSatellite', minzoom: 0, maxzoom: 21, layout: { visibility: 'none' } },
        { id: 'google-satellite-no-labels-layer', type: 'raster', source: 'googleSatelliteNoLabels', minzoom: 0, maxzoom: 21, layout: { visibility: 'visible' } },
        { id: 'google-terrain-layer', type: 'raster', source: 'googleTerrain', minzoom: 0, maxzoom: 21, layout: { visibility: 'none' } },
        { id: 'google-terrain-no-labels-layer', type: 'raster', source: 'googleTerrainNoLabels', minzoom: 0, maxzoom: 21, layout: { visibility: 'none' } }
      ]
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleDefinition,
      center: THATON_CENTER,
      zoom: 11.4,
      minZoom: 7,
      maxZoom: 18,
      attributionControl: true
    });
    mapRef.current = map;
    let locationMarker = null;

    map.on('load', async () => {
      // 1. เส้นพรมแดนประเทศ (Country)
      map.addSource('bnd-country-src', {
        type: 'geojson',
        data: '/data/boundaries/thailand-adm0.geojson'
      });
      map.addSource('bnd-country-label-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', properties: { shapeName: 'Thailand' }, geometry: { type: 'Point', coordinates: [99.72, 20.01] } }]
        }
      });
      map.addLayer({
        id: 'bnd-country-layer',
        type: 'line',
        source: 'bnd-country-src',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-opacity': 0.86,
          'line-dasharray': [3, 2]
        }
      });
      map.addLayer({
        id: 'bnd-country-labels',
        type: 'symbol',
        source: 'bnd-country-label-src',
        layout: {
          visibility: 'visible',
          'symbol-placement': 'point',
          'text-field': thaiBoundaryLabelExpression('country'),
          'text-size': 16,
          'text-font': ['Noto Sans Thai Bold'],
          'text-offset': [0, -1.5],
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#b91c1c',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      // 2. เส้นแบ่งเขตจังหวัด (Province)
      map.addSource('bnd-province-src', {
        type: 'geojson',
        data: '/data/boundaries/chiangrai-region-adm1.geojson'
      });
      map.addLayer({
        id: 'bnd-province-layer',
        type: 'line',
        source: 'bnd-province-src',
        filter: ['==', ['get', 'shapeName'], 'Chiang Mai Province'],
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 2.5,
          'line-opacity': 0.86,
          'line-dasharray': [2, 2]
        }
      });
      map.addLayer({
        id: 'bnd-province-labels',
        type: 'symbol',
        source: 'bnd-province-src',
        filter: ['==', ['get', 'shapeName'], 'Chiang Mai Province'],
        layout: {
          visibility: 'visible',
          'symbol-placement': 'point',
          'text-field': thaiBoundaryLabelExpression('province'),
          'text-size': 13,
          'text-font': ['Noto Sans Thai Bold'],
          'text-offset': [0, 1.2],
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#6d28d9',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      // 3. ขอบเขตอำเภอ (Locality)
      map.addSource('bnd-locality-src', {
        type: 'geojson',
        data: '/data/boundaries/kok-region-adm2.geojson'
      });
      map.addLayer({
        id: 'bnd-locality-layer',
        type: 'line',
        source: 'bnd-locality-src',
        filter: ['==', ['get', 'shapeName'], 'Mae Ai'],
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-opacity': 0.86,
          'line-dasharray': [3, 1.5]
        }
      });
      map.addLayer({
        id: 'bnd-locality-labels',
        type: 'symbol',
        source: 'bnd-locality-src',
        filter: ['==', ['get', 'shapeName'], 'Mae Ai'],
        layout: {
          visibility: 'visible',
          'symbol-placement': 'point',
          'text-field': thaiBoundaryLabelExpression('locality'),
          'text-size': 11,
          'text-font': ['Noto Sans Thai Bold'],
          'text-offset': [0, 0],
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#1d4ed8',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });

      try {
        const response = await fetch('/data/boundaries/tha-ton-adm3.geojson');
        if (!response.ok) throw new Error('โหลดขอบเขตท่าตอนไม่สำเร็จ');
        const geojson = await response.json();
        const coordinates = geojson.features?.[0]?.geometry?.coordinates?.[0];
        if (!coordinates?.length || String(geojson.features[0].properties.TAM_CODE) !== '501005') {
          throw new Error('ข้อมูลขอบเขตตำบลท่าตอนไม่ถูกต้อง');
        }
        map.addSource('tha-ton-boundary', { type: 'geojson', data: geojson, attribution: 'ขอบเขตตำบล: DPM MapDX' });
        map.addLayer({ id: 'tha-ton-fill', type: 'fill', source: 'tha-ton-boundary', paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.06 } });
        map.addLayer({ id: 'tha-ton-outline', type: 'line', source: 'tha-ton-boundary', paint: { 'line-color': '#06b6d4', 'line-width': 2.5, 'line-opacity': 0.9 } });
        map.addSource('tha-ton-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: THATON_CENTER }, properties: { label: 'ตำบลท่าตอน · อำเภอแม่อาย · จังหวัดเชียงใหม่' } }
        ] } });
        map.addLayer({ id: 'tha-ton-name-labels', type: 'symbol', source: 'tha-ton-labels', layout: {
          'text-field': ['get', 'label'], 'text-size': 15, 'text-font': ['Noto Sans Thai Bold'], 'text-allow-overlap': true
        }, paint: { 'text-color': '#0e7490', 'text-halo-color': '#fff', 'text-halo-width': 2 } });
        const label = document.createElement('div');
        label.className = 'gee-location-label';
        label.textContent = 'จ.เชียงใหม่ · อ.แม่อาย · ต.ท่าตอน';
        locationMarker = new maplibregl.Marker({ element: label, anchor: 'bottom' })
          .setLngLat(THATON_CENTER).addTo(map);
        const bounds = coordinates.reduce((acc, [lng, lat]) => {
          acc[0][0] = Math.min(acc[0][0], lng);
          acc[0][1] = Math.min(acc[0][1], lat);
          acc[1][0] = Math.max(acc[1][0], lng);
          acc[1][1] = Math.max(acc[1][1], lat);
          return acc;
        }, [[Infinity, Infinity], [-Infinity, -Infinity]]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 11.4, duration: 0 });
      } catch (caught) {
        setTimelineError(caught.message);
      }
      setMapReady(true);
    });

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
      frameRequestRef.current?.abort();
      compareRequestRef.current?.abort();
      locationMarker?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // สลับการแสดงผลระหว่าง แผนที่สถานที่ & พื้นที่ดาวเทียม & ภูมิประเทศ
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    if (map.getLayer('google-street-layer')) {
      map.setLayoutProperty('google-street-layer', 'visibility', (mapType === 'street' && showLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-street-no-labels-layer')) {
      map.setLayoutProperty('google-street-no-labels-layer', 'visibility', (mapType === 'street' && !showLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-satellite-layer')) {
      map.setLayoutProperty('google-satellite-layer', 'visibility', (mapType === 'satellite' && showLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-satellite-no-labels-layer')) {
      map.setLayoutProperty('google-satellite-no-labels-layer', 'visibility', (mapType === 'satellite' && !showLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-terrain-layer')) {
      map.setLayoutProperty('google-terrain-layer', 'visibility', (mapType === 'terrain' && showLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-terrain-no-labels-layer')) {
      map.setLayoutProperty('google-terrain-no-labels-layer', 'visibility', (mapType === 'terrain' && !showLabels) ? 'visible' : 'none');
    }
  }, [mapType, showLabels, mapReady]);

  // ควบคุมการแสดงผล/ซ่อนเส้นแบ่งเขตการปกครอง
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const setVis = (layerId, isVis) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVis ? 'visible' : 'none');
      }
    };
    const setEmphasis = (layerId, active, width) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        map.setPaintProperty(layerId, 'line-opacity', active ? 0.86 : 0.17);
        map.setPaintProperty(layerId, 'line-width', active ? width : 1);
      }
    };

    setVis('bnd-country-layer', false);
    setVis('bnd-country-labels', false);
    setEmphasis('bnd-province-layer', !!boundarySettings.province, 2.5);
    setVis('bnd-province-labels', !!boundarySettings.province && showBoundaryLabels);
    setEmphasis('bnd-locality-layer', !!boundarySettings.locality, 2);
    setVis('bnd-locality-labels', !!boundarySettings.locality && showBoundaryLabels);
  }, [boundarySettings, showBoundaryLabels, mapReady]);

  useEffect(() => {
    if (!mapReady) return undefined;
    const controller = new AbortController();
    setPlaying(false);
    setFrames([]);
    setFrameIndex(0);
    setFrameDetail(null);
    setComparisonResult(null);
    setComparisonOpen(false);
    setCompareMode('timeline');
    setTimelineError('');
    setTimelineLoading(true);
    const params = new URLSearchParams(appliedPeriod);
    fetch(`/api/gee/tha-ton-timeline?${params}`, { signal: controller.signal })
      .then((response) => readGeeApiResponse(response, 'รายการภาพท่าตอน'))
      .then((data) => {
        const nextFrames = data.frames || [];
        setFrames(nextFrames);
        const pair = selectDefaultPair(nextFrames);
        setBeforeIndex(pair?.beforeIndex ?? (nextFrames.length ? 0 : -1));
        setAfterIndex(pair?.afterIndex ?? -1);
        if (!nextFrames.length) setTimelineError('ไม่พบภาพ Sentinel-1 ในช่วงวันที่เลือก');
      })
      .catch((caught) => { if (caught.name !== 'AbortError') setTimelineError(caught.message); })
      .finally(() => { if (!controller.signal.aborted) setTimelineLoading(false); });
    return () => controller.abort();
  }, [mapReady, appliedPeriod]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !frames[frameIndex] || !map) return undefined;
    frameRequestRef.current?.abort();
    const controller = new AbortController();
    frameRequestRef.current = controller;
    setFrameLoading(true);
    setFrameDetail(null);
    setTimelineError('');
    const params = new URLSearchParams(appliedPeriod);
    fetch(`/api/gee/tha-ton-timeline/frame/${frameIndex}?${params}`, { signal: controller.signal })
      .then((response) => readGeeApiResponse(response, 'ภาพท่าตอน'))
      .then((data) => {
        if (controller.signal.aborted) return;
        if (map.getLayer('tha-ton-water-frame')) map.removeLayer('tha-ton-water-frame');
        if (map.getSource('tha-ton-water-source')) map.removeSource('tha-ton-water-source');
        if (map.getLayer('tha-ton-sar-frame')) map.removeLayer('tha-ton-sar-frame');
        if (map.getSource('tha-ton-sar-source')) map.removeSource('tha-ton-sar-source');
        map.addSource('tha-ton-sar-source', { type: 'raster', tiles: [data.baseTileUrl], tileSize: 256,
          attribution: 'Google Earth Engine · Copernicus Sentinel-1' });
        map.addLayer({ id: 'tha-ton-sar-frame', type: 'raster', source: 'tha-ton-sar-source',
          paint: { 'raster-opacity': 0.55, 'raster-fade-duration': 0 } },
        map.getLayer('tha-ton-outline') ? 'tha-ton-outline' : undefined);
        map.addSource('tha-ton-water-source', { type: 'raster', tiles: [data.tileUrl], tileSize: 256,
          attribution: 'Google Earth Engine · Copernicus Sentinel-1' });
        map.addLayer({ id: 'tha-ton-water-frame', type: 'raster', source: 'tha-ton-water-source',
          layout: { visibility: compareMode === 'change' ? 'none' : 'visible' },
          paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 0 } },
        map.getLayer('tha-ton-outline') ? 'tha-ton-outline' : undefined);
        setFrameDetail(data);
      })
      .catch((caught) => { if (caught.name !== 'AbortError') { setTimelineError(caught.message); setPlaying(false); } })
      .finally(() => { if (!controller.signal.aborted) setFrameLoading(false); });
    return () => controller.abort();
  }, [mapReady, frames, frameIndex, appliedPeriod]);

  useEffect(() => {
    if (!playing || compareMode !== 'timeline' || frameLoading || frames.length < 2) return undefined;
    const timer = window.setTimeout(() => setFrameIndex((index) => (index + 1) % frames.length), 1800);
    return () => window.clearTimeout(timer);
  }, [playing, compareMode, frameLoading, frameIndex, frames.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return undefined;
    for (const id of ['tha-ton-added', 'tha-ton-receded']) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(`${id}-source`)) map.removeSource(`${id}-source`);
    }
    if (!comparisonResult) return undefined;
    for (const [id, tileUrl] of [
      ['tha-ton-added', comparisonResult.addedTileUrl],
      ['tha-ton-receded', comparisonResult.recededTileUrl]
    ]) {
      map.addSource(`${id}-source`, { type: 'raster', tiles: [tileUrl], tileSize: 256,
        attribution: 'Google Earth Engine · Copernicus Sentinel-1' });
      map.addLayer({ id, type: 'raster', source: `${id}-source`,
        layout: { visibility: compareMode === 'change' ? 'visible' : 'none' },
        paint: { 'raster-opacity': 0.8, 'raster-fade-duration': 0 } },
      map.getLayer('tha-ton-outline') ? 'tha-ton-outline' : undefined);
    }
    return undefined;
  }, [comparisonResult, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    for (const id of ['tha-ton-added', 'tha-ton-receded']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', compareMode === 'change' ? 'visible' : 'none');
    }
    if (map.getLayer('tha-ton-water-frame')) {
      map.setLayoutProperty('tha-ton-water-frame', 'visibility', compareMode === 'change' ? 'none' : 'visible');
    }
  }, [compareMode, comparisonResult, frameDetail, mapReady]);

  // รันการคำนวณจาก GEE
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
    const params = new URLSearchParams({ mode, region: 'tha-ton', bbox, start, end, baselineStart, baselineEnd, threshold: String(threshold), cloud: String(cloud), orbit });

    try {
      const statusResponse = await fetch('/api/status', { signal: controller.signal });
      const status = await readGeeApiResponse(statusResponse, 'สถานะ GEE');
      if (!status.geeConnected) throw new Error('Google Earth Engine ยังไม่เชื่อมต่อ ตรวจ service account ของเซิร์ฟเวอร์');
      const response = await fetch(`/api/gee/analyze?${params}`, { signal: controller.signal });
      const data = await readGeeApiResponse(response, 'การวิเคราะห์ GEE');
      if (controller.signal.aborted) return;

      const beforeLayerId = map.getLayer('bnd-country-layer') ? 'bnd-country-layer' : undefined;

      if (data.baseTileUrl) {
        map.addSource('gee-base-source', {
          type: 'raster',
          tiles: [data.baseTileUrl],
          tileSize: 256,
          attribution: 'Google Earth Engine · Copernicus Sentinel-2'
        });
        map.addLayer(
          { id: 'gee-base-raster', type: 'raster', source: 'gee-base-source' },
          beforeLayerId
        );
      }

      map.addSource('gee-source', {
        type: 'raster',
        tiles: [data.tileUrl],
        tileSize: 256,
        attribution: 'Google Earth Engine · Copernicus / JRC'
      });
      map.addLayer(
        {
          id: 'gee-raster',
          type: 'raster',
          source: 'gee-source',
          paint: {
            'raster-opacity': mode === 's2-rgb' ? 1 : opacity / 100,
            'raster-fade-duration': 0
          }
        },
        beforeLayerId
      );

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

  const availableAfter = compatibleAfterFrames(frames, beforeIndex);
  const pairReady = beforeIndex >= 0 && availableAfter.some((frame) => frame.index === afterIndex);
  const comparisonParams = new URLSearchParams({
    ...appliedPeriod, before: String(beforeIndex), after: String(afterIndex)
  });
  const exampleCode = `// วางใน Console ของหน้าเว็บนี้: API เซิร์ฟเวอร์เรียก Earth Engine ให้\nconst dates = new URLSearchParams({ start: '${appliedPeriod.start}', end: '${appliedPeriod.end}' });\nconst scenes = await fetch('/api/gee/tha-ton-timeline?' + dates).then(r => r.json());\nconsole.table(scenes.frames.map(f => ({ date: f.acquiredAt, orbit: f.orbitPass })));\n\nconst pair = new URLSearchParams({ ...Object.fromEntries(dates), before: '${beforeIndex}', after: '${afterIndex}' });\nconst result = await fetch('/api/gee/tha-ton-compare?' + pair).then(r => r.json());\nconsole.log(result.metrics, result.method, result.limitation);`;

  const applyTimelinePeriod = () => {
    const first = new Date(`${timelineStart}T00:00:00Z`);
    const last = new Date(`${timelineEnd}T00:00:00Z`);
    const days = (last - first) / 86400000;
    if (!Number.isFinite(days) || days < 1 || days > 45 || !timelineStart.startsWith('2024-') || !timelineEnd.startsWith('2024-')) {
      setTimelineError('เลือกช่วง 2–46 วันภายในปี 2024');
      return;
    }
    frameRequestRef.current?.abort();
    compareRequestRef.current?.abort();
    setPlaying(false);
    setFrames([]);
    setFrameDetail(null);
    setComparisonResult(null);
    setCompareMode('timeline');
    const map = mapRef.current;
    for (const id of ['tha-ton-water-frame', 'tha-ton-sar-frame', 'tha-ton-added', 'tha-ton-receded']) {
      if (map?.getLayer(id)) map.removeLayer(id);
      if (map?.getSource(`${id}-source`)) map.removeSource(`${id}-source`);
    }
    for (const source of ['tha-ton-water-source', 'tha-ton-sar-source']) {
      if (map?.getSource(source)) map.removeSource(source);
    }
    setStart(timelineStart);
    setEnd(timelineEnd);
    setAppliedPeriod({ start: timelineStart, end: timelineEnd });
  };

  const runComparison = async () => {
    if (!pairReady) { setComparisonError('เลือกคู่ภาพที่ถ่ายจากวงโคจรเดียวกัน'); return; }
    compareRequestRef.current?.abort();
    const controller = new AbortController();
    compareRequestRef.current = controller;
    setComparisonLoading(true);
    setComparisonError('');
    setComparisonResult(null);
    setPlaying(false);
    try {
      const response = await fetch(`/api/gee/tha-ton-compare?${comparisonParams}`, { signal: controller.signal });
      const data = await readGeeApiResponse(response, 'เปรียบเทียบ Before–After');
      if (controller.signal.aborted) return;
      setComparisonResult(data);
      setFrameIndex(afterIndex);
      setCompareMode('change');
    } catch (caught) {
      if (caught.name !== 'AbortError') setComparisonError(caught.message);
    } finally {
      if (compareRequestRef.current === controller) setComparisonLoading(false);
    }
  };

  const showComparisonMode = (nextMode) => {
    setPlaying(false);
    setCompareMode(nextMode);
    if (nextMode === 'before') setFrameIndex(beforeIndex);
    else if (nextMode === 'after' || nextMode === 'change') setFrameIndex(afterIndex);
  };

  const copyExampleCode = async () => {
    try {
      await navigator.clipboard.writeText(exampleCode);
      setCodeCopied(true);
      setCodeError('');
    } catch {
      setCodeError('คัดลอกไม่ได้ กรุณาเลือกข้อความในช่องโค้ดแล้วคัดลอกเอง');
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#111b25] font-['Prompt',sans-serif] text-slate-900">
      {/* MapLibre Canvas Viewport */}
      <div id="tha-ton-map" ref={containerRef} className="absolute inset-0" aria-label="แผนที่ตำบลท่าตอนและชั้นภาพจาก Google Earth Engine" />

      {/* Top-Left: Header Badge */}
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur pointer-events-auto">
        <div className="rounded-xl bg-sky-600 p-2 text-white shadow-sm flex-shrink-0">
          <Waves size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold sm:text-base text-slate-800">น้ำท่วมตำบลท่าตอน</h1>
          <a href="#tha-ton-map" className="block text-[11px] text-sky-700 underline underline-offset-2"
            onClick={() => mapRef.current?.flyTo({ center: THATON_CENTER, zoom: 11.4, duration: 900 })}>
            ต.ท่าตอน · อ.แม่อาย · จ.เชียงใหม่ ↗
          </a>
        </div>
      </div>

      <aside className={`gee-left-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="แถบด้านซ้าย">
        <div className="gee-left-sidebar-header">
          <span><PanelLeft size={18} /> แถบด้านซ้าย</span>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="ยุบแถบด้านซ้าย"><X size={17} /></button>
        </div>
        <div className="gee-left-sidebar-blank" aria-label="พื้นที่สำหรับเครื่องมือในอนาคต" />
      </aside>
      {!sidebarOpen && <button className="gee-sidebar-open" type="button" onClick={() => setSidebarOpen(true)} aria-label="เปิดแถบด้านซ้าย"><PanelLeft size={20} /></button>}

      <section className="gee-timeline-player" aria-label="คลิปภาพน้ำท่วมตำบลท่าตอน">
        <div className="gee-timeline-title">
          <span>ภาพน้ำท่วมจาก Earth Engine</span>
          <small>{appliedPeriod.start} ถึง {appliedPeriod.end} · Sentinel-1</small>
        </div>
        <div className="gee-period-controls">
          <label>เริ่ม <input type="date" value={timelineStart} min="2024-01-01" max="2024-12-31" onChange={(event) => setTimelineStart(event.target.value)} /></label>
          <label>สิ้นสุด <input type="date" value={timelineEnd} min="2024-01-01" max="2024-12-31" onChange={(event) => setTimelineEnd(event.target.value)} /></label>
          <button type="button" onClick={applyTimelinePeriod}>โหลดช่วงนี้</button>
        </div>
        <div className="gee-timeline-controls">
          <button type="button" className="gee-timeline-play" aria-label={playing ? 'หยุดคลิป' : 'เล่นคลิป'}
            disabled={frames.length < 2 || timelineLoading}
            onClick={() => { setCompareMode('timeline'); setPlaying((value) => !value); }}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <input type="range" min="0" max={Math.max(0, frames.length - 1)} step="1" value={frameIndex}
            disabled={!frames.length} aria-label="เลือกภาพตามวันที่ถ่ายจริง"
            onChange={(event) => { setPlaying(false); setCompareMode('timeline'); setFrameIndex(Number(event.target.value)); }} />
          <strong>{sceneDate(frames[frameIndex])}</strong>
        </div>
        <p className="gee-timeline-meta" aria-live="polite">
          {timelineLoading ? 'กำลังค้นหาภาพถ่ายจริง…' : frameLoading ? 'กำลังโหลดภาพ…' : frameDetail?.waterAreaKm2 !== null && frameDetail?.waterAreaKm2 !== undefined ? `ผิวน้ำเข้าข่าย ${frameDetail.waterAreaKm2} กม.² · ฉาก ${frameIndex + 1}/${frames.length} · ${frameDetail.orbitPass === 'ASCENDING' ? 'วงโคจรขาขึ้น' : 'วงโคจรขาลง'}` : `${frames.length} ฉากจริง · ไม่มีข้อมูลพื้นที่`}
        </p>
        <div className="gee-timeline-footer">
          <p className="gee-timeline-caveat">มีภาพเฉพาะวันที่ดาวเทียมถ่าย · พื้นที่น้ำไม่ใช่ความลึกน้ำ</p>
          <button type="button" onClick={() => { setPlaying(false); setComparisonOpen((value) => !value); setAnalysisOpen(false); setSettingsOpen(false); }}>
            {comparisonOpen ? 'ปิด Before–After' : 'เปิด Before–After'}
          </button>
        </div>
        {timelineError && <p className="gee-timeline-error" role="alert">{timelineError}</p>}
      </section>

      {comparisonOpen && <section className="gee-compare-panel" aria-label="เปรียบเทียบพื้นที่น้ำก่อนและหลัง">
        <div className="gee-compare-header"><strong>Before–After · ตำบลท่าตอน</strong><button type="button" onClick={() => setComparisonOpen(false)} aria-label="ปิด Before–After"><X size={17} /></button></div>
        <p>เลือกภาพจริงที่วงโคจรตรงกัน ก่อนและหลังเหตุการณ์ 11 ก.ย. 2024</p>
        <label>ภาพก่อน
          <select value={beforeIndex} onChange={(event) => {
            const index = Number(event.target.value);
            setBeforeIndex(index);
            setAfterIndex(compatibleAfterFrames(frames, index)[0]?.index ?? -1);
            setComparisonResult(null);
            setCompareMode('timeline');
          }}>
            {frames.map((frame) => <option key={frame.index} value={frame.index}>{sceneDate(frame)} · {frame.orbitPass === 'ASCENDING' ? 'ขึ้น' : 'ลง'} · วง {frame.relativeOrbit}</option>)}
          </select>
        </label>
        <label>ภาพหลัง · วงโคจรเดียวกัน
          <select value={afterIndex} onChange={(event) => { setAfterIndex(Number(event.target.value)); setComparisonResult(null); setCompareMode('timeline'); }}>
            {!availableAfter.length && <option value={-1}>ไม่มีภาพคู่ที่เข้ากัน</option>}
            {availableAfter.map((frame) => <option key={frame.index} value={frame.index}>{sceneDate(frame)} · วง {frame.relativeOrbit}</option>)}
          </select>
        </label>
        {frames[beforeIndex] && frames[beforeIndex].acquiredAt.slice(0, 10) >= '2024-09-11' &&
          <p className="gee-compare-warning">ภาพ “ก่อน” ที่เลือกถ่ายหลัง 11 ก.ย. จึงใช้ดูการเปลี่ยนแปลงระหว่างวันได้ แต่ไม่ใช่ฐานก่อนเหตุการณ์</p>}
        <button type="button" className="gee-compare-run" disabled={!pairReady || comparisonLoading} onClick={runComparison}>
          {comparisonLoading ? 'Earth Engine กำลังคำนวณ…' : 'คำนวณพื้นที่น้ำเพิ่ม/ลด'}
        </button>
        {comparisonError && <p className="gee-timeline-error" role="alert">{comparisonError}</p>}
        {comparisonResult && <>
          <div className="gee-compare-tabs" role="group" aria-label="มุมมอง Before–After">
            {[['before', 'ก่อน'], ['after', 'หลัง'], ['change', 'น้ำเพิ่ม/ลด']].map(([id, label]) =>
              <button key={id} type="button" aria-pressed={compareMode === id} onClick={() => showComparisonMode(id)}>{label}</button>)}
          </div>
          <div className="gee-compare-metrics">
            <span>ก่อน <b>{comparisonResult.before.waterAreaKm2 ?? '—'}</b> กม.²</span>
            <span>หลัง <b>{comparisonResult.after.waterAreaKm2 ?? '—'}</b> กม.²</span>
            <span className="added">น้ำเพิ่ม <b>{comparisonResult.metrics?.addedKm2 ?? '—'}</b> กม.²</span>
            <span className="receded">น้ำลด <b>{comparisonResult.metrics?.recededKm2 ?? '—'}</b> กม.²</span>
          </div>
          <p>สีส้ม: น้ำเพิ่ม · สีเขียว: น้ำลด · เทียบเฉพาะพื้นที่ที่ทั้งสองภาพมองเห็น</p>
          <p className="gee-compare-warning">ความลึกน้ำ: วัดไม่ได้จาก Sentinel-1 เพียงอย่างเดียว ต้องมีระดับน้ำภาคสนามและ DEM ที่เหมาะสม</p>
        </>}
      </section>}

      {/* Floating Vertical Toolbar (บนขวา แนวตั้ง สไตล์มินิมอลโมเดิร์นตามภาพที่ 1) */}
      <div className="map-controls" aria-label="เครื่องมือแผนที่">
        <div className="map-actions" aria-label="เมนูควบคุม">
          {/* ปุ่มสลับเปิด-ปิด เครื่องมือวิเคราะห์น้ำ GEE */}
          <button
            className={`round-control ${analysisOpen ? 'is-active' : ''}`}
            type="button"
            aria-label="เครื่องมือวิเคราะห์น้ำ"
            title="เครื่องมือวิเคราะห์น้ำ Google Earth Engine"
            onClick={() => {
              setAnalysisOpen(prev => !prev);
              setSettingsOpen(false);
            }}
          >
            <Satellite size={20} />
          </button>

          {/* ปุ่มสลับเปิด-ปิด ตั้งค่าแผนที่และเลเยอร์ */}
          <button
            className={`round-control ${settingsOpen ? 'is-active' : ''}`}
            type="button"
            aria-label="ตั้งค่าแผนที่"
            title="ตั้งค่าแผนที่และขอบเขตการปกครอง"
            onClick={() => {
              setSettingsOpen(prev => !prev);
              setAnalysisOpen(false);
            }}
          >
            <Settings size={20} />
          </button>

          {/* ปุ่มรีเซ็ตมุมมองไปที่ท่าตอน */}
          <button
            className="round-control"
            type="button"
            aria-label="พิกัดท่าตอน"
            title="ไปยังศูนย์กลางลุ่มน้ำท่าตอน"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo({ center: THATON_CENTER, zoom: 11.4, duration: 1200 });
              }
            }}
          >
            <Crosshair size={19} />
          </button>
        </div>

        {/* ปุ่มซูมเข้า / ซูมออก */}
        <div className="zoom-control" aria-label="ควบคุมการซูม">
          <button
            type="button"
            aria-label="ซูมเข้า"
            title="ซูมเข้า"
            onClick={() => mapRef.current?.zoomIn()}
          >
            <Plus size={20} />
          </button>
          <span />
          <button
            type="button"
            aria-label="ซูมออก"
            title="ซูมออก"
            onClick={() => mapRef.current?.zoomOut()}
          >
            <Minus size={20} />
          </button>
        </div>
      </div>

      {/* แผงที่ 1: เครื่องมือวิเคราะห์น้ำ (เปิด-ปิด แบบมินิมอลทางขวาบน) */}
      {analysisOpen && (
        <section
          aria-label="เครื่องมือวิเคราะห์ทางน้ำ"
          className="map-settings-panel"
          style={{ width: 'min(380px, calc(100vw - 80px))', maxHeight: 'min(85svh, 720px)', padding: '16px 18px 24px' }}
        >
          {/* Header */}
          <div className="map-settings-header-minimal">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Satellite size={18} />
              </div>
              <div>
                <span className="map-settings-title-minimal text-slate-800">เครื่องมือวิเคราะห์น้ำ</span>
                <p className="text-[11px] text-slate-500 font-normal">เลือกวิธีและช่วงเวลา แล้ววิเคราะห์พื้นที่บนจอ</p>
              </div>
            </div>
            <button
              type="button"
              className="map-settings-close-minimal"
              aria-label="ปิดเครื่องมือวิเคราะห์"
              onClick={() => setAnalysisOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Mode Selection Chips (6 โหมดการวิเคราะห์) */}
          <div className="map-settings-title-minimal mb-2 mt-2">รูปแบบการวิเคราะห์</div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="รูปแบบการวิเคราะห์">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseMode(item.id)}
                aria-pressed={mode === item.id}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === item.id
                    ? 'border-sky-500 bg-sky-50/80 ring-1 ring-sky-500 text-sky-950 font-bold'
                    : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <strong className="block text-xs leading-tight">{item.label}</strong>
                <span className="mt-1 block text-[10px] leading-tight text-slate-500 font-normal">{item.detail}</span>
              </button>
            ))}
          </div>

          {/* Date Range Selection */}
          {mode !== 'occurrence' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">เริ่มวิเคราะห์</label>
                <input
                  aria-label="วันที่เริ่มวิเคราะห์"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">สิ้นสุด (รวมวันนี้)</label>
                <input
                  aria-label="วันที่สิ้นสุดวิเคราะห์"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* SAR Change Baseline */}
          {mode === 's1-change' && (
            <div className="mt-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3">
              <p className="mb-2 text-[11px] font-bold text-amber-900">ช่วงก่อนเหตุการณ์สำหรับเปรียบเทียบ</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-amber-800 block mb-1">เริ่ม</label>
                  <input
                    aria-label="วันที่เริ่มช่วงก่อนเหตุการณ์"
                    type="date"
                    value={baselineStart}
                    onChange={(e) => setBaselineStart(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-amber-800 block mb-1">สิ้นสุด</label>
                  <input
                    aria-label="วันที่สิ้นสุดช่วงก่อนเหตุการณ์"
                    type="date"
                    value={baselineEnd}
                    onChange={(e) => setBaselineEnd(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sliders and Thresholds */}
          {(mode === 'ndwi' || mode === 'mndwi') && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>เกณฑ์แยกน้ำ</span>
                <span className="font-mono text-sky-600 font-bold">{Number(threshold).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.1"
                max="0.5"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
          )}

          {(mode === 's2-rgb' || mode === 'ndwi' || mode === 'mndwi') && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>ยอมรับเมฆระดับฉาก</span>
                <span className="font-mono text-sky-600 font-bold">≤ {cloud}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={cloud}
                onChange={(e) => setCloud(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
          )}

          {(mode === 's1-water' || mode === 's1-change') && (
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">ทิศทางวงโคจร</label>
              <select
                aria-label="ทิศทางวงโคจร"
                value={orbit}
                onChange={(e) => setOrbit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              >
                <option value="DESCENDING">Descending (ลง)</option>
                <option value="ASCENDING">Ascending (ขึ้น)</option>
              </select>
            </div>
          )}

          {mode !== 's2-rgb' && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>ความเข้มชั้นภาพ</span>
                <span className="font-mono text-sky-600 font-bold">{opacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="button"
            disabled={!mapReady || loading}
            onClick={runAnalysis}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {loading ? 'GEE กำลังประมวลผล…' : 'วิเคราะห์พื้นที่ที่มองเห็น'}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            วิเคราะห์เฉพาะขอบเขตตำบลท่าตอน · ซูม {zoom.toFixed(1)}
          </p>

          {viewChanged && result && (
            <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200/80 leading-relaxed">
              เลื่อนแผนที่แล้ว กดวิเคราะห์อีกครั้งเพื่ออัปเดตพื้นที่และตัวเลข
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </p>
          )}

          {/* GEE Calculation Result Metrics Card */}
          {result && (
            <div className="mt-3 space-y-2 rounded-2xl border border-sky-100 bg-sky-50/80 p-3.5" aria-live="polite">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-slate-800">ผลจาก GEE</strong>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  คำนวณจาก GEE
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                ชุดข้อมูล: <code className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">{result.provenance.dataset}</code>
              </p>
              {result.provenance.imageCount !== null && (
                <p className="text-[11px] text-slate-600">
                  ภาพที่ใช้: <strong>{result.provenance.imageCount}</strong> ฉาก
                  {result.provenance.baselineImageCount !== null ? ` · ก่อนเหตุการณ์ ${result.provenance.baselineImageCount} ฉาก` : ''}
                </p>
              )}
              {result.metrics && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-sm">
                    <span className="block text-[10px] text-slate-500">
                      {mode === 'occurrence' ? 'พื้นที่มีประวัติน้ำ' : 'พื้นที่ภาพใช้วิเคราะห์'}
                    </span>
                    <strong className="text-sm font-bold text-slate-800">
                      {result.metrics.observedAreaKm2} กม.²
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-sm">
                    <span className="block text-[10px] text-slate-500">
                      {mode === 's1-change' ? 'น้ำเพิ่มที่เข้าข่าย' : mode === 'occurrence' ? 'น้ำถาวร ≥ 50%' : 'พื้นที่เข้าข่ายน้ำ'}
                    </span>
                    <strong className="text-sm font-bold text-sky-700">
                      {result.metrics.waterAreaKm2 === null ? '—' : `${result.metrics.waterAreaKm2} กม.²`}
                    </strong>
                  </div>
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-slate-500 pt-1">
                วิธี: {result.provenance.method}
              </p>
            </div>
          )}
        </section>
      )}

      {/* แผงที่ 2: ตั้งค่าแผนที่ (เปิด-ปิด แบบมินิมอลทางขวาบน ตามภาพอ้างอิง) */}
      {settingsOpen && (
        <section
          className="map-settings-panel"
          aria-label="ตั้งค่าแผนที่และขอบเขต"
          style={{ width: '310px', maxHeight: 'min(85svh, 720px)', padding: '16px 18px 24px' }}
        >
          {/* Header */}
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

          {/* รูปแบบพื้นหลัง (Satellite, Street, Terrain) */}
          <div className="map-settings-title-minimal mb-2">รูปแบบพื้นหลัง</div>
          <div className="map-styles-grid">
            {[
              ['satellite', 'ภาพดาวเทียม', Crosshair],
              ['street', 'ถนนและสถานที่', MapIcon],
              ['terrain', 'ภูมิประเทศ', Mountain]
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mapType === id}
                className={`map-style-card ${mapType === id ? 'is-active' : ''}`}
                onClick={() => setMapType(id)}
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
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            แสดงชื่อสถานที่บนแผนที่พื้นหลัง
          </label>

          <div className="map-settings-divider" />

          {/* ขอบเขตการปกครอง (Country, Province, Locality) */}
          <div className="map-settings-title-minimal mb-2">ขอบเขตการปกครอง</div>
          <div className="space-y-1">
            {[
              ['province', 'เขตจังหวัด', Grid2X2],
              ['locality', 'เขตอำเภอ', Grid2X2]
            ].map(([id, label, Icon]) => (
              <div className="layer-toggle-row" key={id}>
                <div className="layer-toggle-label">
                  <Icon className="layer-toggle-icon" />
                  <span>{label}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={`เปิดปิดเลเยอร์${label}`}
                  aria-checked={boundarySettings[id] !== false}
                  className={`ios-toggle ${boundarySettings[id] !== false ? 'is-on' : 'is-off'}`}
                  onClick={() =>
                    setBoundarySettings((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                >
                  <span className="ios-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="gee-code-dock">
        {codeOpen && <section className="gee-code-panel" aria-label="ตัวอย่างโค้ดเรียก Earth Engine ผ่าน API">
          <div className="gee-code-header"><strong>ตัวอย่างโค้ด API</strong><button type="button" onClick={() => setCodeOpen(false)} aria-label="ปิดตัวอย่างโค้ด"><X size={17} /></button></div>
          <p>วางใน Console ของหน้าเว็บนี้ เซิร์ฟเวอร์จะส่งคำขอไป Google Earth Engine แล้วคืนวันที่ ภาพไทล์ และพื้นที่คำนวณกลับมา ไม่ต้องนำ service account ไปไว้ในเบราว์เซอร์</p>
          <pre><code>{exampleCode}</code></pre>
          <div className="gee-code-actions">
            <button type="button" onClick={copyExampleCode}><Copy size={15} />{codeCopied ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</button>
            <a href={`/api/gee/tha-ton-timeline?${new URLSearchParams(appliedPeriod)}`} target="_blank" rel="noreferrer">เปิดรายการภาพ JSON ↗</a>
            {pairReady && <a href={`/api/gee/tha-ton-compare?${comparisonParams}`} target="_blank" rel="noreferrer">เปิดผล Before–After JSON ↗</a>}
          </div>
          {codeError && <p className="gee-timeline-error" role="alert">{codeError}</p>}
        </section>}
        <button type="button" className="gee-code-toggle" onClick={() => setCodeOpen((value) => !value)} aria-label="เปิดตัวอย่างโค้ด"><Code2 size={17} /> ดูตัวอย่างโค้ด</button>
      </div>

      {/* Bottom-Right: KOK Water Watch Switcher */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenWaterWatch}
          className="flex items-center gap-2 rounded-2xl bg-[#A6192E] hover:bg-[#8b1527] active:scale-95 px-4 py-2.5 text-xs font-bold text-white shadow-xl transition-all cursor-pointer"
        >
          <Droplets size={16} />
          <span>KOK Water Watch</span>
        </button>
      </div>
    </main>
  );
}
