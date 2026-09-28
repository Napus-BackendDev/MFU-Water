import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import { publicPseudonym } from '../../lib/publicPseudonym.js';
import PublicEvidencePhotos from './PublicEvidencePhotos.jsx';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  TrendingUp, 
  Map, 
  Globe, 
  Layers, 
  Flame, 
  Clock, 
  Calendar, 
  Camera, 
  Users,
  User,
  ZoomIn,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Minus,
  Home,
  Landmark,
  Building2,
  SlidersHorizontal,
  Check,
  Download,
  Droplets,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { clusterSubmissions } from '../../data/waterWatchData';
const PPBTrendChart = lazy(() => import('./PPBTrendChart'));
import { RIVER_BOUNDS, RIVER_GEOMETRY } from './riverFlow';
import { regionFillExpression, regionForProvince, provinceForCoordinates, boundsForGeometry, shouldShowAreaSamples } from './mapAreaNavigation.js';
import { provinceLabelsForArea, districtLabelsForArea } from './provinceLabels.js';
import { applySoftMapPalette, applyNaturalFeatureVisibility } from './softMapPalette.js';

const EMPTY_PROVINCE_FEATURES = Object.freeze([]);
const EMPTY_BOUNDARY = Object.freeze({ type: 'FeatureCollection', features: [] });

// ฟังก์ชันสร้าง GeoJSON Polygon วงกลมเพื่อแสดงรัศมีความแม่นยำของ GPS อุปกรณ์
function createGeoJSONCircle(center, radiusInMeters, points = 48) {
  const [lng, lat] = center;
  const coords = { latitude: lat, longitude: lng };
  const km = (radiusInMeters || 30) / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    },
    properties: {}
  };
}

// คอมโพเนนต์แสดงรูปภาพถ่ายหลักฐานของการตรวจล่าสุด พร้อมระบบสลับรูปและ Loading Skeleton
function EvidencePhotoBox({ 
  photos = [], 
  activeIdx = 0, 
  onSelectIdx, 
  onExpand 
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentPhoto = photos[activeIdx] || photos[0];

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [currentPhoto?.url]);

  if (!currentPhoto?.url) {
    return (
      <div className="mx-3 mt-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-400 text-[11px] shrink-0">
        <Camera className="w-4 h-4 text-slate-300 shrink-0" />
        <span>ไม่มีภาพถ่ายแนบในการตรวจวัดล่าสุด</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col shrink-0">
      <div
        className="relative w-full h-28 sm:h-36 bg-slate-900 overflow-hidden group cursor-pointer"
        onClick={() => onExpand(activeIdx)}
        title="คลิกเพื่อขยายภาพถ่ายหลักฐานล่าสุด"
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
            <Camera className="w-8 h-8 text-slate-600 animate-pulse" />
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center flex-col text-slate-400 gap-1.5 p-3">
            <Camera className="w-7 h-7 text-slate-500" />
            <span className="text-xs">ไม่สามารถโหลดรูปภาพได้</span>
          </div>
        ) : (
          <img
            key={currentPhoto.url}
            src={currentPhoto.url}
            alt={currentPhoto.title || 'ภาพถ่ายหลักฐานการตรวจล่าสุด'}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}

        {/* Overlay Badge: ภาพถ่ายหลักฐานล่าสุด */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[11px] font-semibold text-white shadow-sm pointer-events-none z-10">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span>ภาพถ่ายหลักฐานล่าสุด</span>
        </div>

        {/* Zoom In Cue on Hover */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
          <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-xs text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <ZoomIn className="w-4 h-4 text-amber-300" />
            <span>แตะเพื่อขยายรูป</span>
          </span>
        </div>

        {/* Arrows for multi-photo navigation directly on photo (No text labels) */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectIdx((activeIdx - 1 + photos.length) % photos.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer z-20 hover:scale-110 active:scale-95"
              title="ภาพก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectIdx((activeIdx + 1) % photos.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer z-20 hover:scale-110 active:scale-95"
              title="ภาพถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination dots & counter (No text 'ภาพทั้งหมด' or 'ภาพที่ 1') */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full z-20 pointer-events-none">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    activeIdx === i ? 'bg-amber-400 w-4' : 'bg-white/60 w-2'
                  }`}
                />
              ))}
              <span className="text-[11px] text-white/90 font-mono ml-1 font-bold">
                {activeIdx + 1}/{photos.length}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// แปลงวันที่เป็นรูปแบบสั้น เช่น 21/3/2569
function getThaiShortDate(isoStr) {
  if (!isoStr) return '24/9/2569';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '24/9/2569';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const yearBE = d.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
  } catch {
    return '24/9/2569';
  }
}

// แปลงวันที่เป็นรูปแบบสั้นภาษาไทยสำหรับแกนกราฟ เช่น "15 ก.ย.", "20 พ.ย. 68"
function getThaiDayMonth(isoStr) {
  if (!isoStr) return 'วันนี้';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'วันนี้';
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const yr = d.getFullYear();
    if (yr < 2026) {
      const beYearShort = (yr + 543) % 100;
      return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${beYearShort}`;
    }
    return `${d.getDate()} ${thaiMonths[d.getMonth()]}`;
  } catch {
    return 'วันนี้';
  }
}

// กราฟแสดงความสัมพันธ์ระหว่าง "วัน (วันที่ตรวจวัด)" กับ "สารที่วัดได้ในวันนั้น (As ppb)" เทียบเกณฑ์มาตรฐาน คพ. 10 ppb
function MiniAsChart({ items = [], latestAs = 0, latestTime = null, count = 1 }) {
  const rawList = items && items.length > 0 ? items : [{
    collection_time: latestTime,
    created_at: latestTime,
    measurements: { arsenic: { value: latestAs } }
  }];

  const getTime = (it) => {
    if (!it) return 0;
    const t = it.collection_time || it.created_at || it.timestamp || it.date;
    if (t) {
      if (typeof t === 'number' && !isNaN(t) && t > 0) return t;
      const d = new Date(t).getTime();
      if (!isNaN(d) && d > 0) return d;
    }
    return 0;
  };

  // จัดเรียงข้อมูลตามเวลาจากอดีต -> ปัจจุบัน (ซ้ายไปขวา)
  const sorted = [...rawList].sort((a, b) => getTime(a) - getTime(b));

  // แสดงผลไม่เกิน 5 ตัวล่าสุด ตามคำขอผู้ใช้ เพื่อป้องกันตัวเลขและวันที่ซ้อนทับกัน
  const displayList = sorted.length > 5 ? sorted.slice(-5) : sorted;

  const pointsData = displayList.map((it, idx) => {
    let as = it.measurements?.arsenic?.value ?? it.arsenic_ppb ?? it.as;
    if (as === undefined || as === null || isNaN(Number(as))) {
      as = latestAs || 0;
    } else {
      as = Number(as);
    }
    const t = it.collection_time || it.created_at || it.timestamp || it.date || latestTime;
    const dateLabel = getThaiDayMonth(t);
    return {
      as,
      dateLabel,
      round: sorted.length > 5 ? (sorted.length - 5 + idx + 1) : (idx + 1),
      rawTime: t
    };
  });

  const chartWidth = 260;
  const chartHeight = 54;
  const topMargin = 14;
  const baselineY = 38;
  const standardPpb = 10;

  // ปรับสเกลแกน Y ให้มองเห็นจุดและเส้นมาตรฐาน 10 ppb ชัดเจนเสมอ
  const maxVal = Math.max(...pointsData.map(p => p.as), 15);
  const stdY = baselineY - (standardPpb / maxVal) * (baselineY - topMargin);

  const totalPoints = pointsData.length;
  const points = pointsData.map((p, idx) => {
    const x = totalPoints === 1 ? chartWidth / 2 : 30 + (idx / (totalPoints - 1)) * (chartWidth - 60);
    const clampedAs = Math.max(0, p.as);
    const y = baselineY - (clampedAs / maxVal) * (baselineY - topMargin);
    return {
      ...p,
      x,
      y: Math.max(topMargin, Math.min(baselineY, y))
    };
  });

  return (
    <div className="w-full h-14 flex items-center justify-center relative my-1">
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <defs>
          <linearGradient id="miniAsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* เส้นประเกณฑ์มาตรฐาน คพ. 10 ppb */}
        <line
          x1="16"
          y1={stdY}
          x2={chartWidth - 16}
          y2={stdY}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.8"
        />

        {/* เส้นแกน Baseline วันที่ตรวจวัด */}
        <line
          x1="16"
          y1={baselineY}
          x2={chartWidth - 16}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* พื้นที่สีจางใต้เส้นกราฟแนวโน้ม */}
        {points.length > 1 && (
          <path
            d={`M ${points[0].x} ${baselineY} L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${baselineY} Z`}
            fill="url(#miniAsAreaGradient)"
          />
        )}

        {/* เส้นกราฟแนวโน้มสารหนูตามวัน */}
        {points.length > 1 && (
          <path
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* จุดตรวจวัดในแต่ละวัน พร้อมค่าที่วัดได้ (ppb) */}
        {points.map((p, idx) => {
          const isDanger = p.as > 10;
          const isWatch = p.as >= 5 && p.as <= 10;
          const dotColor = isDanger ? '#ef4444' : isWatch ? '#f59e0b' : '#10b981';
          const isLatest = idx === points.length - 1;

          return (
            <g key={idx} className="transition-all">
              {/* วงแหวนเน้นจุดรอบล่าสุด */}
              {isLatest && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6.5"
                  fill={dotColor}
                  opacity="0.25"
                />
              )}

              {/* จุดตรวจวัด */}
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill={dotColor}
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* สารที่วัดได้ในวันนั้น (ค่า ppb) เหนือจุด */}
              <text
                x={p.x}
                y={p.y - 5}
                textAnchor="middle"
                fontSize="9"
                fill={isDanger ? '#dc2626' : isWatch ? '#d97706' : '#059669'}
                fontFamily="system-ui, sans-serif"
                fontWeight="800"
              >
                {p.as} ppb
              </text>

              {/* วันที่ตรวจวัดใต้จุด */}
              <text
                x={p.x}
                y={baselineY + 11}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {p.dateLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function WaterWatchMap({
  submissions = [],
  selectedSample = null,
  onSelectSample = null,
  selectedHotspot = null,
  onSelectHotspot = null,
  focusCoords = null,
  onPopupChange = null,
  controllerRef = null,
  hideDefaultControls = false,
  riverVisible = true,
  boundaryVisibility = null,
  mapType: propMapType,
  showLabels: propShowLabels,
  showBoundaryLabels: propShowBoundaryLabels,
  selectedArea = { level: 'world' },
  selectedAreaFeature = null,
  provinceFeatures = EMPTY_PROVINCE_FEATURES,
  boundaryData = null,
  onAreaSelect = null
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markerEntriesRef = useRef(new globalThis.Map());
  const boundaryDataRef = useRef(boundaryData);
  const sourceDataRef = useRef({});
  boundaryDataRef.current = boundaryData;
  const areaLabelMarkersRef = useRef([]);
  const selectedAreaRef = useRef(selectedArea);
  const onAreaSelectRef = useRef(onAreaSelect);
  selectedAreaRef.current = selectedArea;
  onAreaSelectRef.current = onAreaSelect;

  // โหมดแสดงผลแผนที่: ค่าเริ่มต้นเป็น 'satellite' (พื้นที่ดาวเทียม) และ ซ่อนตัวอักษร (showLabels = false)
  const [mapType, setMapType] = useState(() => {
    if (propMapType) return propMapType;
    try {
      const saved = localStorage.getItem('kok_water_watch_map_type');
      return saved === 'street' || saved === 'streets' ? 'street' : saved === 'terrain' ? 'terrain' : 'satellite';
    } catch {
      return 'satellite';
    }
  });
  const [showLabels, setShowLabels] = useState(() => {
    if (typeof propShowLabels === 'boolean') return propShowLabels;
    try {
      const saved = localStorage.getItem('kok_water_watch_show_labels');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kok_water_watch_map_type', mapType);
    } catch {}
  }, [mapType]);

  useEffect(() => {
    try {
      localStorage.setItem('kok_water_watch_show_labels', String(showLabels));
    } catch {}
  }, [showLabels]);

  const [showBoundaryLabels, setShowBoundaryLabels] = useState(() => {
    if (typeof propShowBoundaryLabels === 'boolean') return propShowBoundaryLabels;
    try {
      const saved = localStorage.getItem('kok_water_watch_show_boundary_labels');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kok_water_watch_show_boundary_labels', String(showBoundaryLabels));
    } catch {}
  }, [showBoundaryLabels]);

  useEffect(() => {
    if (propMapType && propMapType !== mapType) {
      setMapType(propMapType);
    }
  }, [propMapType]);

  useEffect(() => {
    if (typeof propShowLabels === 'boolean' && propShowLabels !== showLabels) {
      setShowLabels(propShowLabels);
    }
  }, [propShowLabels]);

  useEffect(() => {
    if (typeof propShowBoundaryLabels === 'boolean' && propShowBoundaryLabels !== showBoundaryLabels) {
      setShowBoundaryLabels(propShowBoundaryLabels);
    }
  }, [propShowBoundaryLabels]);

  // ขอบเขตการปกครองจาก geometry จริงของประเทศไทย
  // Source: geoBoundaries (OpenStreetMap / official administrative sources)
  // MapLibre ใช้ URL GeoJSON โดยตรง เพื่อไม่ฝัง polygon ที่วาดมือใน source code
  const BOUNDARY_ITEMS = [
    {
      id: 'country',
      shortLabel: 'ประเทศ',
      fullLabel: 'Country (ประเทศ)',
      desc: 'เส้นพรมแดนระหว่างประเทศ',
      icon: Globe,
      color: '#ef4444',
      activeColor: '#ef4444'
    },
    {
      id: 'province',
      shortLabel: 'จังหวัด',
      fullLabel: 'Province (จังหวัด / รัฐ)',
      desc: 'เส้นแบ่งเขตการปกครองระดับที่ 1',
      icon: Landmark,
      color: '#8b5cf6',
      activeColor: '#8b5cf6'
    },
    {
      id: 'locality',
      shortLabel: 'พื้นที่',
      fullLabel: 'Locality (เขต / เมือง)',
      desc: 'ขอบเขตของเทศบาล เมือง หรือเขตพื้นที่',
      icon: Building2,
      color: '#2563eb',
      activeColor: '#2563eb'
    }
  ];

  const DEFAULT_BOUNDARY_FILTERS = {
    country: true,
    province: true,
    locality: true
  };

  const [boundaryFilters, setBoundaryFilters] = useState(() => {
    if (boundaryVisibility) return boundaryVisibility;
    try {
      const saved = localStorage.getItem('kok_boundary_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.fromEntries(
          Object.keys(DEFAULT_BOUNDARY_FILTERS).map((key) => [key, parsed[key] !== false])
        );
      }
    } catch {}
    return DEFAULT_BOUNDARY_FILTERS;
  });

  const [isBoundaryFilterOpen, setIsBoundaryFilterOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const boundaryFiltersRef = useRef(boundaryFilters);

  useEffect(() => {
    boundaryFiltersRef.current = boundaryFilters;
  }, [boundaryFilters]);

  useEffect(() => {
    if (boundaryVisibility) {
      setBoundaryFilters({
        country: boundaryVisibility.country !== false,
        province: boundaryVisibility.province !== false,
        locality: boundaryVisibility.locality !== false
      });
    }
  }, [boundaryVisibility?.country, boundaryVisibility?.province, boundaryVisibility?.locality]);

  useEffect(() => {
    try {
      localStorage.setItem('kok_boundary_filters', JSON.stringify(boundaryFilters));
    } catch {}
  }, [boundaryFilters]);

  const applyBoundaryVisibility = (filters) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const area = selectedAreaRef.current || { level: 'world' };
    const provinceDetailVisible = ['region', 'province', 'district'].includes(area.level);
    const localityDetailVisible = ['province', 'district'].includes(area.level);
    const regionPickerVisible = area.level === 'world' || (area.level === 'country' && area.countryIso === 'THA') || area.level === 'region';

    const setVisibility = (layerId, isVisible) => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        }
      } catch (err) {
        console.warn('Failed to set boundary visibility:', layerId, err);
      }
    };

    const setLineEmphasis = (layerId, active, activeWidth, stageVisible = true) => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', stageVisible ? 'visible' : 'none');
          map.setPaintProperty(layerId, 'line-opacity', active ? 0.86 : 0.17);
          map.setPaintProperty(layerId, 'line-width', active ? activeWidth : 1);
        }
      } catch (err) {
        console.warn('Failed to set boundary emphasis:', layerId, err);
      }
    };

    // Keep OSM administrative borders as the basemap-aligned reference, and
    // draw province borders from the very same GeoJSON used for region fill
    // when the user drills into Thailand. This fallback remains available
    // even when the remote vector tiles omit Thai admin_level=4 boundaries.
    const countryBoundaryVisible = !!filters.country;
    for (const id of ['boundary-country:outline', 'boundary-country']) {
      setVisibility(id, countryBoundaryVisible);
    }
    for (const id of ['boundary-state:outline', 'boundary-state']) {
      // One canonical province geometry, not a second vintage of tile boundaries.
      setVisibility(id, false);
    }
    setVisibility('bnd-province-region-fill', regionPickerVisible);
    setVisibility('bnd-region-fill', area.level === 'country' && area.countryIso === 'THA');
    setVisibility('bnd-province-outline', !!filters.province && provinceDetailVisible);
    setVisibility('bnd-province-outline-halo', !!filters.province && provinceDetailVisible);
    setVisibility('bnd-locality-hit', area.level === 'province');
    setVisibility('bnd-locality-fill', !!filters.locality && localityDetailVisible);
    setLineEmphasis('bnd-locality-layer', !!filters.locality, 1, localityDetailVisible);
    setVisibility('bnd-locality-halo', !!filters.locality && localityDetailVisible);
  };

  const toggleBoundary = (id) => {
    setBoundaryFilters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // State สำหรับ Hover / Click Hotspot Popup Card
  const [popupHotspot, setPopupHotspot] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State สำหรับกู้คืน WebGL Context Loss และความล้มเหลวของ GPU
  const [webglError, setWebglError] = useState(null);
  const [mapReloadKey, setMapReloadKey] = useState(0);

  // State สำหรับปุ่มควบคุมทางขวา (Zoom In/Out, Current Location)
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // { type: 'loading' | 'success' | 'error', message: string }
  const locationStatusTimeoutRef = useRef(null);
  const userLocationMarkerRef = useRef(null);

  const showLocationStatus = (type, message, autoHideMs = 4500) => {
    if (locationStatusTimeoutRef.current) clearTimeout(locationStatusTimeoutRef.current);
    setLocationStatus({ type, message });
    if (autoHideMs) {
      locationStatusTimeoutRef.current = setTimeout(() => {
        setLocationStatus(null);
      }, autoHideMs);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut({ duration: 300 });
    }
  };

  // ดึงตำแหน่งพิกัด GPS ปัจจุบันของเครื่องหรืออุปกรณ์ของผู้ใช้
  const handleGoToCurrentLocation = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    setIsLocating(true);

    // วางหมุดตำแหน่งอุปกรณ์และวาดรัศมีความแม่นยำลงบนแผนที่
    const placeUserLocationMarker = (longitude, latitude, accuracy, isEstimated = false) => {
      setIsLocating(false);
      setLocationStatus(null);

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      // วาดวงกลมรัศมีความแม่นยำของอุปกรณ์
      const circleRadius = Math.max(15, Math.min(accuracy || 30, 2000));
      const circleGeoJSON = createGeoJSONCircle([longitude, latitude], circleRadius);

      try {
        if (map.getSource('user-accuracy-source')) {
          map.getSource('user-accuracy-source').setData(circleGeoJSON);
        } else {
          map.addSource('user-accuracy-source', {
            type: 'geojson',
            data: circleGeoJSON
          });
          map.addLayer({
            id: 'user-accuracy-fill',
            type: 'fill',
            source: 'user-accuracy-source',
            paint: {
              'fill-color': '#0284c7',
              'fill-opacity': 0.15
            }
          });
          map.addLayer({
            id: 'user-accuracy-line',
            type: 'line',
            source: 'user-accuracy-source',
            paint: {
              'line-color': '#0284c7',
              'line-width': 1.5,
              'line-dasharray': [2, 2]
            }
          });
        }
      } catch (e) {
        console.warn('Accuracy circle render notice:', e);
      }

      // หมุดพิกัดที่ตั้งปัจจุบันของอุปกรณ์ (ไอคอนจุดสีฟ้าเคลื่อนไหว ไม่แสดงป๊อปอัปข้อความตามคำขอ)
      const el = document.createElement('div');
      el.className = 'current-location-marker relative flex items-center justify-center cursor-pointer select-none';
      el.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-sky-500/35 animate-ping absolute pointer-events-none"></div>
        <div class="w-6 h-6 rounded-full bg-sky-600 border-2 border-white shadow-2xl flex items-center justify-center relative z-10 transition-transform hover:scale-115">
          <div class="w-2.5 h-2.5 rounded-full bg-white shadow-xs"></div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map);

      userLocationMarkerRef.current = marker;

      map.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 15),
        pitch: 0,
        essential: true,
        duration: 1200
      });
    };

    // Fallback: ดึงตำแหน่งจาก IP ในกรณีเครื่องไม่มีฮาร์ดแวร์ GPS หรือบล็อกสิทธิ์
    const tryIPFallback = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            placeUserLocationMarker(Number(data.longitude), Number(data.latitude), 2000, true);
            return;
          }
        }
      } catch (e) {
        console.warn('IP fallback failed:', e);
      }

      setIsLocating(false);
      showLocationStatus(
        'error', 
        'ไม่สามารถระบุตำแหน่งของเครื่องได้ กรุณาเปิดสิทธิ์ GPS หรือ Wi-Fi บนอุปกรณ์ของคุณ', 
        5000
      );
    };

    if (!navigator.geolocation) {
      tryIPFallback();
      return;
    }

    // เรียก Geolocation ด้วย High Accuracy ก่อน
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude, accuracy } = pos.coords;
        placeUserLocationMarker(longitude, latitude, accuracy, false);
      },
      (err) => {
        console.warn('High-accuracy geolocation failed, attempting low-accuracy fallback:', err);
        // หาก High accuracy ล้มเหลว (เช่น timeout บนเดสก์ท็อป) ให้ลองแบบ Low Accuracy (Cell/Wi-Fi)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { longitude, latitude, accuracy } = pos.coords;
            placeUserLocationMarker(longitude, latitude, accuracy, false);
          },
          (err2) => {
            console.warn('Low-accuracy geolocation failed, trying IP fallback:', err2);
            if (err2.code === 1) { // PERMISSION_DENIED
              setIsLocating(false);
              showLocationStatus(
                'error', 
                '⚠️ เบราว์เซอร์ถูกบล็อกสิทธิ์ตำแหน่ง กรุณากดอนุญาตสิทธิ์ Location ในแถบที่อยู่เว็บ (URL)', 
                6000
              );
            } else {
              tryIPFallback();
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  };

  const hoverTimeoutRef = useRef(null);
  const isHoveringPopupRef = useRef(false);
  const isPinnedRef = useRef(false);
  const previewImageRef = useRef(null);
  const popupHotspotRef = useRef(null);
  const onPopupChangeRef = useRef(onPopupChange);

  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = {
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        locateUser: handleGoToCurrentLocation,
        setMapType: (t) => setMapType(t),
        setShowLabels: (s) => setShowLabels(s),
        setBoundaryFilter: (id, visible) => {
          if (id === 'country' || id === 'province' || id === 'locality') {
            setBoundaryFilters(prev => ({ ...prev, [id]: !!visible }));
          }
        },
        setBoundaryLabels: (visible) => setShowBoundaryLabels(!!visible),
        fitArea: (area, feature) => {
          if (area?.level === 'country' && area.countryIso === 'THA') {
            const bounds = boundsForGeometry(feature);
            if (bounds) mapRef.current?.fitBounds(bounds, {
              padding: { top: 75, right: 100, bottom: 90, left: Math.min(430, window.innerWidth * 0.35) },
              duration: 850,
              maxZoom: 6.4
            });
            return;
          }
          const bounds = boundsForGeometry(feature);
          if (bounds) mapRef.current?.fitBounds(bounds, {
            padding: { top: 100, right: 90, bottom: 90, left: Math.min(430, window.innerWidth * 0.35) },
            duration: 850,
            maxZoom: area?.level === 'district' ? 13 : area?.level === 'province' ? 10.5 : area?.level === 'region' ? 8.5 : 7
          });
          else if (area?.level === 'world') mapRef.current?.fitBounds([[92, 4], [112, 29]], { padding: { top: 65, right: 100, bottom: 90, left: 370 }, duration: 850, maxZoom: 5 });
        },
        fitRiverOverview: () => {
          mapRef.current?.fitBounds(RIVER_BOUNDS, {
            padding: { top: 110, right: 100, bottom: 100, left: 100 },
            duration: 900,
            maxZoom: 11
          });
        },
        setCountryBoundaryVisible: (visible) => {
          setBoundaryFilters(prev => {
            const next = { ...prev, country: !!visible };
            applyBoundaryVisibility(next);
            return next;
          });
        },
        flyToKokCenter: () => {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [99.3800, 20.0550],
              zoom: 13.2,
              essential: true,
              duration: 1200
            });
          }
        },
        mapType,
        showLabels
      };
    }
  }, [controllerRef, mapType, showLabels]);

  useEffect(() => {
    isPinnedRef.current = isPinned;
  }, [isPinned]);

  useEffect(() => {
    previewImageRef.current = previewImage;
  }, [previewImage]);

  useEffect(() => {
    popupHotspotRef.current = popupHotspot;
    setActivePhotoIdx(0);
  }, [popupHotspot]);

  useEffect(() => {
    onPopupChangeRef.current = onPopupChange;
  }, [onPopupChange]);

  const updatePopupHotspot = (hs) => {
    setPopupHotspot(hs);
    popupHotspotRef.current = hs;
    if (!hs) {
      document.querySelectorAll('.hotspot-marker.is-selected, .single-point-marker.is-selected').forEach(m => m.classList.remove('is-selected'));
    }
    onPopupChangeRef.current?.(hs);
  };

  // ปิด Lightbox หรือ Popup Card เมื่อกดปุ่ม Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (popupHotspot) {
          setIsPinned(false);
          updatePopupHotspot(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, popupHotspot]);

  // Street mode uses native OSM boundaries; imagery and terrain retain Google tiles.
  useEffect(() => {
    if (mapRef.current) return;
    if (!mapContainer.current) return;

    let map = null;
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: '/data/boundaries/shortbread-colorful.style.json',
        center: [101.8, 17.2],
        zoom: 4.2,
        pitch: 0,
        maxPitch: 0,
        bearing: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: true
      });
    } catch (err) {
      console.error('[WaterWatchMap] Failed to initialize maplibregl.Map:', err);
      setWebglError(err.message || 'Failed to initialize WebGL');
      return;
    }

    map.setMaxPitch(0);
    map.setPitch(0);
    map.setBearing(0);
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    // Listen to MapLibre's context events; detach before remove() triggers an intentional context loss.
    const handleContextLost = () => setWebglError('WebGL context lost');
    const handleContextRestored = () => {
      setWebglError(null);
      map.triggerRepaint();
    };
    map.on('webglcontextlost', handleContextLost);
    map.on('webglcontextrestored', handleContextRestored);

    map.on('style.load', () => {
      // Keep OSM's vector boundaries/roads, but remove its built-in place,
      // province, street and POI labels. Thai area labels are added separately.
      for (const layer of map.getStyle().layers || []) {
        if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
      map.addSource('googleSatellite', {
        type: 'raster', tileSize: 256,
        tiles: ['https://mt0.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', 'https://mt2.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', 'https://mt3.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}']
      });
      map.addSource('googleSatelliteNoLabels', {
        type: 'raster', tileSize: 256,
        tiles: ['https://mt0.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}', 'https://mt2.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}', 'https://mt3.google.com/vt/lyrs=s&hl=th&x={x}&y={y}&z={z}']
      });
      map.addSource('googleTerrain', {
        type: 'raster', tileSize: 256,
        tiles: ['https://mt0.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}', 'https://mt2.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}', 'https://mt3.google.com/vt/lyrs=p&hl=th&x={x}&y={y}&z={z}']
      });
      map.addSource('googleTerrainNoLabels', {
        type: 'raster', tileSize: 256,
        tiles: ['https://mt0.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}', 'https://mt2.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}', 'https://mt3.google.com/vt/lyrs=p&hl=th&apistyle=s.t%3A0%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff&x={x}&y={y}&z={z}']
      });
      for (const [id, source, visibility] of [
        ['google-satellite-layer', 'googleSatellite', 'none'],
        ['google-satellite-no-labels-layer', 'googleSatelliteNoLabels', 'visible'],
        ['google-terrain-layer', 'googleTerrain', 'none'],
        ['google-terrain-no-labels-layer', 'googleTerrainNoLabels', 'none']
      ]) {
        map.addLayer({ id, type: 'raster', source, minzoom: 0, maxzoom: 21, layout: { visibility } }, 'boundary-country:outline');
      }

      // Street natural features keep their styling; imagery modes hide them below.
      const naturalFeatureLayers = [
        ['land-forest', 'fill', 0.56],
        ['land-grass', 'fill', 0.34],
        ['land-wetland', 'fill', 0.48],
        ['land-park', 'fill', 0.32],
        ['water-area', 'fill', 0.76],
        ['water-area-river', 'fill', 0.76],
        ['water-area-small', 'fill', 0.76],
        ['water-river', 'line', null],
        ['water-canal', 'line', null],
        ['water-stream', 'line', null]
      ];
      for (const [id, type, opacity] of naturalFeatureLayers) {
        if (!map.getLayer(id)) continue;
        if (type === 'fill') {
          map.setPaintProperty(id, 'fill-opacity', opacity);
        } else {
          map.setPaintProperty(id, 'line-color', '#bdd6e3');
          map.setPaintProperty(id, 'line-opacity', 0.9);
          const width = id === 'water-river'
            ? ['interpolate', ['linear'], ['zoom'], 3, 0.7, 6, 1.1, 10, 3, 15, 5]
            : id === 'water-canal'
              ? ['interpolate', ['linear'], ['zoom'], 5, 0.45, 8, 0.8, 12, 1.8]
              : ['interpolate', ['linear'], ['zoom'], 8, 0.35, 12, 0.7, 15, 1.5];
          map.setPaintProperty(id, 'line-width', width);
        }
        map.moveLayer(id, 'boundary-country:outline');
      }

      // Administrative lines stay above satellite/terrain imagery while all
      // provider-generated place and city labels remain hidden.
      for (const [id, color, opacity, width] of [
        ['boundary-country:outline', '#ffffff', 0.72, 2.2],
        ['boundary-country', '#334155', 0.9, 1.15],
        ['boundary-state:outline', '#ffffff', 0.6, 1.7],
        ['boundary-state', '#475569', 0.78, 0.85]
      ]) {
        if (map.getLayer(id)) {
          map.setPaintProperty(id, 'line-color', color);
          map.setPaintProperty(id, 'line-opacity', opacity);
          map.setPaintProperty(id, 'line-width', width);
        }
      }
      // Apply after natural-feature paint setup, so those writes cannot override
      // the street palette. Imagery modes restore the original provider colours.
      applySoftMapPalette(map, mapType);
      applyNaturalFeatureVisibility(map, mapType);
    });

    map.on('load', () => {
      const curFilters = boundaryFiltersRef.current || {};

      map.addSource('kok-river-route', {
        type: 'geojson',
        tolerance: 0,
        attribution: 'River: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors (ODbL)</a> / <a href="https://waterwaymap.org/" target="_blank" rel="noopener noreferrer">WaterwayMap</a>',
        data: {
          type: 'Feature',
          properties: { name: 'แม่น้ำกก' },
          geometry: RIVER_GEOMETRY
        }
      });
      map.addLayer({
        id: 'kok-river-route-halo',
        type: 'line',
        source: 'kok-river-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-opacity': 0.95, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5, 8, 7, 13, 9] }
      });
      map.addLayer({
        id: 'kok-river-route-line',
        type: 'line',
        source: 'kok-river-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0EA5E9', 'line-opacity': 1, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 4.5, 13, 6] }
      });

      // 1. เส้นพรมแดนประเทศ (Country)
      map.addSource('bnd-country-src', {
        type: 'geojson',
        data: boundaryDataRef.current?.countries || EMPTY_BOUNDARY
      });
      // Label anchors keep names visible near the Kok basin; boundary geometry stays untouched.
      map.addLayer({
        id: 'bnd-country-hit', type: 'fill', source: 'bnd-country-src',
        filter: ['==', ['get', 'shapeISO'], 'THA'],
        paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.015 }
      });
      // 2. เส้นแบ่งเขตจังหวัด (Province)
      // Keep canonical coordinates for selection/counts; use sub-pixel tile tolerance
      // for drawing so very large dissolved polygons do not overflow fill indices.
      map.addSource('bnd-region-src', { type: 'geojson', tolerance: 0.375, data: boundaryDataRef.current?.regions || EMPTY_BOUNDARY });
      map.addLayer({ id: 'bnd-region-fill', type: 'fill', source: 'bnd-region-src', paint: {
        'fill-color': ['match', ['get', 'regionId'], 'north', '#2563eb', 'northeast', '#7c3aed', 'south', '#0891b2', '#16a34a'],
        'fill-opacity': 0.52
      } }, 'boundary-country:outline');
      map.on('click', 'bnd-region-fill', event => {
        const feature = event.features?.[0];
        if (selectedAreaRef.current?.level === 'country' && feature?.properties.regionId) onAreaSelectRef.current?.({ level: 'region', countryIso: 'THA', regionId: feature.properties.regionId }, feature);
      });
      map.addSource('bnd-province-src', {
        type: 'geojson',
        tolerance: 0,
        attribution: '<a href="https://data.humdata.org/dataset/cod-ab-tha" target="_blank" rel="noopener">Thailand COD-AB / OCHA ROAP (CC BY-IGO)</a>',
        data: boundaryDataRef.current?.provinces || EMPTY_BOUNDARY
      });
      map.addLayer({
        id: 'bnd-province-region-fill', type: 'fill', source: 'bnd-province-src',
        paint: {
          'fill-color': ['match', regionFillExpression(), 'north', '#2563eb', 'northeast', '#7c3aed', 'south', '#0891b2', '#16a34a'],
          'fill-opacity': selectedAreaRef.current?.level === 'country' && selectedAreaRef.current?.countryIso === 'THA' ? 0.52 : 0
        }
      }, 'boundary-country:outline');
      map.addLayer({
        id: 'bnd-province-outline-halo', type: 'line', source: 'bnd-province-src',
        layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-opacity': 0.85,
          'line-width': 4 }
      });
      map.addLayer({
        id: 'bnd-province-outline',
        type: 'line',
        source: 'bnd-province-src',
        layout: {
          visibility: 'none',
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#0284C7',
          'line-opacity': 0.9,
          'line-width': 2
        }
      });

      // 3. ขอบเขตอำเภอ (Locality)
      map.addSource('bnd-locality-src', {
        type: 'geojson',
        tolerance: 0,
        data: boundaryDataRef.current?.districts || EMPTY_BOUNDARY
      });
      for (const [key, source] of [['countries', 'bnd-country-src'], ['regions', 'bnd-region-src'], ['provinces', 'bnd-province-src'], ['districts', 'bnd-locality-src']]) {
        sourceDataRef.current[key] = { source: map.getSource(source), data: boundaryDataRef.current?.[key] || EMPTY_BOUNDARY };
      }
      const initialDistrictFilter = ['all', ['==', ['get', 'provinceCode'], selectedAreaRef.current?.provinceIso || ''], ...(selectedAreaRef.current?.level === 'district' ? [['==', ['get', 'districtCode'], selectedAreaRef.current.districtCode || '']] : [])];
      map.addLayer({ id: 'bnd-locality-hit', type: 'fill', source: 'bnd-locality-src', filter: initialDistrictFilter, paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.05 } });
      map.addLayer({
        id: 'bnd-locality-fill',
        type: 'fill',
        source: 'bnd-locality-src',
        filter: initialDistrictFilter,
        layout: {
          visibility: ['province', 'district'].includes(selectedAreaRef.current?.level) ? 'visible' : 'none'
        },
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': ['province', 'district'].includes(selectedAreaRef.current?.level) ? 0.05 : 0
        }
      });

      map.on('click', 'bnd-country-hit', event => {
        const feature = event.features?.[0];
        if (selectedAreaRef.current?.level !== 'world') return;
        if (!feature || feature.properties.shapeISO !== 'THA') return;
        onAreaSelectRef.current?.({ level: 'country', countryIso: feature.properties.shapeISO }, feature);
      });
      map.on('click', 'bnd-province-region-fill', event => {
        const feature = event.features?.[0];
        if (!feature) return;
        const area = selectedAreaRef.current || { level: 'world' };
        if (area.level === 'country' && area.countryIso === 'THA') {
          onAreaSelectRef.current?.({ level: 'region', countryIso: 'THA', regionId: regionForProvince(feature.properties.shapeISO) });
        } else if (area.level === 'region' && regionForProvince(feature.properties.shapeISO) === area.regionId) {
          onAreaSelectRef.current?.({ level: 'province', countryIso: 'THA', regionId: area.regionId, provinceIso: feature.properties.shapeISO }, feature);
        }
      });
      map.on('click', 'bnd-locality-hit', event => {
        const area = selectedAreaRef.current || {};
        const feature = event.features?.[0];
        if (area.level === 'province' && feature?.properties.provinceCode === area.provinceIso) {
          onAreaSelectRef.current?.({ level: 'district', countryIso: 'THA', regionId: area.regionId, provinceIso: area.provinceIso, districtCode: feature.properties.districtCode, districtName: feature.properties.shapeName, label: feature.properties.nameTh }, feature);
        }
      });
      map.addLayer({ id: 'bnd-locality-halo', type: 'line', source: 'bnd-locality-src', filter: initialDistrictFilter, layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 3, 'line-opacity': 0.85 } });
      map.addLayer({
        id: 'bnd-locality-layer',
        type: 'line',
        source: 'bnd-locality-src',
        filter: initialDistrictFilter,
        layout: {
          visibility: curFilters.locality && ['province', 'district'].includes(selectedAreaRef.current?.level) ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#0284C7',
          'line-width': 1,
          'line-opacity': curFilters.locality ? 0.86 : 0.17
        }
      });

      // Keep the channel above administrative fills; HTML labels stay above the map.
      map.moveLayer('kok-river-route-halo');
      map.moveLayer('kok-river-route-line');
      setIsMapLoaded(true);
      applyBoundaryVisibility(curFilters);
      map.fitBounds([[97, 5], [106, 21]], {
        padding: { top: 65, right: 100, bottom: 90, left: 370 },
        duration: 0,
        maxZoom: 6.4
      });
    });

    map.on('click', () => {
      setIsPinned(false);
      updatePopupHotspot(null);
      document.querySelectorAll('.hotspot-marker.is-selected, .single-point-marker.is-selected').forEach(m => m.classList.remove('is-selected'));
    });

    mapRef.current = map;

    return () => {
      map.off('webglcontextlost', handleContextLost);
      map.off('webglcontextrestored', handleContextRestored);
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      markerEntriesRef.current.clear();
      areaLabelMarkersRef.current.forEach(marker => marker.remove());
      areaLabelMarkersRef.current = [];
      if (userLocationMarkerRef.current) {
        try { userLocationMarkerRef.current.remove(); } catch (e) {}
      }
      if (locationStatusTimeoutRef.current) {
        clearTimeout(locationStatusTimeoutRef.current);
      }
      if (map) {
        try {
          map.remove();
        } catch (e) {
          console.warn('[WaterWatchMap] Cleanup map.remove error:', e);
        }
      }
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [mapReloadKey]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    for (const [key, source] of [['countries', 'bnd-country-src'], ['regions', 'bnd-region-src'], ['provinces', 'bnd-province-src'], ['districts', 'bnd-locality-src']]) {
      const currentSource = mapRef.current.getSource(source);
      const data = boundaryData?.[key] || EMPTY_BOUNDARY;
      if (currentSource && (sourceDataRef.current[key]?.source !== currentSource || sourceDataRef.current[key]?.data !== data)) {
        currentSource.setData(data);
        sourceDataRef.current[key] = { source: currentSource, data };
      }
    }
  }, [isMapLoaded, boundaryData?.countries, boundaryData?.regions, boundaryData?.provinces, boundaryData?.districts]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !selectedAreaFeature) return;
    const map = mapRef.current;
    const bounds = boundsForGeometry(selectedAreaFeature);
    if (!bounds) return;
    const fit = () => map.fitBounds(bounds, {
      padding: window.innerWidth < 768
        ? { top: 65, right: 55, bottom: Math.min(440, window.innerHeight * 0.52), left: 20 }
        : { top: 100, right: 90, bottom: 90, left: Math.min(430, window.innerWidth * 0.35) },
      duration: 850,
      maxZoom: selectedArea?.level === 'district' ? 13 : selectedArea?.level === 'province' ? 10.5 : selectedArea?.level === 'region' ? 8.5 : 6.4
    });
    fit();
    map.on('resize', fit);
    return () => map.off('resize', fit);
  }, [isMapLoaded, selectedAreaFeature, selectedArea?.level]);

  useEffect(() => {
    const map = mapRef.current;
    areaLabelMarkersRef.current.forEach(marker => marker.remove());
    areaLabelMarkersRef.current = [];
    if (!isMapLoaded || !map) return;

    const showOverview = selectedArea?.level === 'country' && selectedArea?.countryIso === 'THA';
    const showThaiRegions = showOverview && boundaryFilters.province;
    const labels = [];
    const showNeighborCountries = showOverview;
    if (showNeighborCountries && boundaryFilters.country && showBoundaryLabels) {
      labels.push(
        { id: 'myanmar', text: 'พม่า', coordinates: [96.5, 20.5], kind: 'country' },
        { id: 'laos', text: 'ลาว', coordinates: [103.2, 19.7], kind: 'country' },
        { id: 'cambodia', text: 'กัมพูชา', coordinates: [104.9, 12.6], kind: 'country' },
        { id: 'vietnam', text: 'เวียดนาม', coordinates: [108.0, 18.1], kind: 'country' },
        { id: 'malaysia', text: 'มาเลเซีย', coordinates: [102.3, 6.2], kind: 'country' }
      );
    }
    if (showThaiRegions) {
      labels.push(
        { id: 'north', text: 'ภาคเหนือ', coordinates: [99.5, 18.2], kind: 'region', color: '#1d4ed8' },
        { id: 'central', text: 'ภาคกลาง', coordinates: [100.4, 15.1], kind: 'region', color: '#166534' },
        { id: 'northeast', text: 'ภาคอีสาน', coordinates: [103.4, 16.1], kind: 'region', color: '#6b21a8' },
        { id: 'south', text: 'ภาคใต้', coordinates: [99.7, 8.8], kind: 'region', color: '#0e7490' }
      );
    }
    // Province labels are navigation, independent of optional basemap labels/glyphs.
    labels.push(...provinceLabelsForArea(provinceFeatures, selectedArea));
    labels.push(...districtLabelsForArea(boundaryData?.districts?.features, selectedArea));

    areaLabelMarkersRef.current = labels.map(label => {
      const element = document.createElement(['province', 'district'].includes(label.kind) ? 'button' : 'div');
      element.className = `water-area-label water-area-label--${label.kind}`;
      element.dataset.areaLabel = label.id;
      element.textContent = label.kind === 'province' ? label.text.replace(/^จังหวัด/, '') : label.text;
      element.setAttribute('aria-label', label.text);
      element.style.pointerEvents = 'none';
      element.style.whiteSpace = 'nowrap';
      element.style.fontFamily = '"Noto Sans Thai", Tahoma, sans-serif';
      element.style.fontWeight = '800';
      if (['province', 'district'].includes(label.kind)) {
        element.type = 'button';
        element.style.pointerEvents = 'auto';
        element.style.cursor = 'pointer';
        element.style.color = '#1e293b';
        element.style.fontSize = '13px';
        element.style.padding = '3px 6px';
        element.style.borderRadius = '6px';
        element.style.border = '1px solid rgba(71,85,105,0.3)';
        element.style.background = 'rgba(255,255,255,0.9)';
        element.addEventListener('click', event => {
          event.stopPropagation();
          onAreaSelectRef.current?.(label.kind === 'province'
            ? { level: 'province', countryIso: 'THA', regionId: regionForProvince(label.id), provinceIso: label.id }
            : { level: 'district', countryIso: 'THA', regionId: selectedArea.regionId, provinceIso: label.feature.properties.provinceCode, districtCode: label.id, districtName: label.feature.properties.shapeName, label: label.text });
        });
      } else if (label.kind === 'region') {
        element.style.color = label.color;
        element.style.fontSize = '18px';
        element.style.letterSpacing = '0.01em';
        element.style.padding = '4px 12px';
        element.style.borderRadius = '999px';
        element.style.background = 'rgba(255,255,255,0.82)';
        element.style.border = `1px solid ${label.color}66`;
        element.style.boxShadow = '0 2px 8px rgba(15,23,42,0.2)';
      } else {
        element.style.color = '#111827';
        element.style.fontSize = '16px';
        element.style.textShadow = '0 0 3px #fff, 0 0 7px #fff, 0 1px 1px #fff';
      }
      const marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(label.coordinates).addTo(map);
      // MapLibre initializes custom marker accessibility with "Map marker".
      element.setAttribute('aria-label', label.text);
      return marker;
    });

    return () => {
      areaLabelMarkersRef.current.forEach(marker => marker.remove());
      areaLabelMarkersRef.current = [];
    };
  }, [isMapLoaded, selectedArea?.level, selectedArea?.countryIso, selectedArea?.regionId, selectedArea?.provinceIso, selectedArea?.districtCode, provinceFeatures, boundaryData?.districts, showBoundaryLabels, boundaryFilters.country, boundaryFilters.province, boundaryFilters.locality]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isMapLoaded || !map) return;
    const provinceFilter = selectedArea?.level === 'region'
      ? ['in', ['get', 'shapeISO'], ['literal', provinceFeatures.filter(f => regionForProvince(f.properties.shapeISO) === selectedArea.regionId).map(f => f.properties.shapeISO)]]
      : ['province', 'district'].includes(selectedArea?.level)
        ? ['==', ['get', 'shapeISO'], selectedArea.provinceIso || ''] : null;
    for (const id of ['bnd-province-region-fill', 'bnd-province-outline-halo', 'bnd-province-outline']) {
      if (map.getLayer(id)) map.setFilter(id, provinceFilter);
    }
    const isThailandOverview = selectedArea?.level === 'country' && selectedArea?.countryIso === 'THA';
    const isProvinceDetail = ['province', 'district'].includes(selectedArea?.level);
    if (map.getLayer('bnd-province-region-fill')) map.setPaintProperty('bnd-province-region-fill', 'fill-opacity', isThailandOverview && boundaryFilters.province ? 0.52 : 0);
    if (map.getLayer('bnd-locality-fill')) map.setPaintProperty('bnd-locality-fill', 'fill-opacity', isProvinceDetail && boundaryFilters.locality ? 0.08 : 0);
    if (map.getLayer('bnd-province-region-fill')) map.setLayoutProperty('bnd-province-region-fill', 'visibility', (isThailandOverview || selectedArea?.level === 'region') ? 'visible' : 'none');
    if (map.getLayer('bnd-locality-hit')) map.setLayoutProperty('bnd-locality-hit', 'visibility', selectedArea?.level === 'province' ? 'visible' : 'none');
    const localityFilter = selectedArea?.level === 'district'
      ? ['all', ['==', ['get', 'provinceCode'], selectedArea.provinceIso || ''], ['==', ['get', 'districtCode'], selectedArea.districtCode || '']]
      : ['==', ['get', 'provinceCode'], selectedArea?.provinceIso || ''];
    for (const id of ['bnd-locality-hit', 'bnd-locality-fill', 'bnd-locality-layer', 'bnd-locality-halo']) {
      if (map.getLayer(id)) map.setFilter(id, localityFilter);
    }
    if (map.getLayer('bnd-locality-layer')) {
      map.setPaintProperty('bnd-locality-layer', 'line-color', '#0284C7');
      map.setPaintProperty('bnd-locality-layer', 'line-width', 1);
      map.setPaintProperty('bnd-locality-layer', 'line-opacity', boundaryFilters.locality ? 0.86 : 0.17);
    }
  }, [isMapLoaded, selectedArea?.level, selectedArea?.countryIso, selectedArea?.regionId, selectedArea?.provinceIso, selectedArea?.districtCode, provinceFeatures, showBoundaryLabels, boundaryFilters.country, boundaryFilters.province, boundaryFilters.locality]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    for (const id of ['kok-river-route-halo', 'kok-river-route-line']) {
      if (mapRef.current.getLayer(id)) {
        mapRef.current.setLayoutProperty(id, 'visibility', riverVisible ? 'visible' : 'none');
      }
    }
  }, [isMapLoaded, riverVisible]);

  // ควบคุมการแสดงผล/ซ่อนเลเยอร์ขอบเขตตาม boundaryFilters ทันที 100%
  useEffect(() => {
    if (isMapLoaded) {
      applyBoundaryVisibility(boundaryFilters);
    }
  }, [boundaryFilters, showBoundaryLabels, isMapLoaded, selectedArea?.level, selectedArea?.countryIso, selectedArea?.provinceIso, selectedArea?.regionId, selectedArea?.districtCode]);

  // ปิด Popup Card ทันทีเมื่อชุดข้อมูลตัวอย่างเปลี่ยนจากการสลับ Time Filter
  useEffect(() => {
    setIsPinned(false);
    updatePopupHotspot(null);
    setPreviewImage(null);
  }, [submissions]);

  // สลับการแสดงผลระหว่าง แผนที่สถานที่ & พื้นที่ดาวเทียม
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;
    applySoftMapPalette(map, mapType);
    applyNaturalFeatureVisibility(map, mapType);
    const overview = ['world', 'country', 'region'].includes(selectedArea?.level);
    const showBaseLabels = showLabels && !overview;
    if (map.getLayer('google-satellite-layer')) {
      map.setLayoutProperty('google-satellite-layer', 'visibility', (mapType === 'satellite' && showBaseLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-satellite-no-labels-layer')) {
      map.setLayoutProperty('google-satellite-no-labels-layer', 'visibility', (mapType === 'satellite' && !showBaseLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-terrain-layer')) {
      map.setLayoutProperty('google-terrain-layer', 'visibility', (mapType === 'terrain' && showBaseLabels) ? 'visible' : 'none');
    }
    if (map.getLayer('google-terrain-no-labels-layer')) {
      map.setLayoutProperty('google-terrain-no-labels-layer', 'visibility', (mapType === 'terrain' && !showBaseLabels) ? 'visible' : 'none');
    }
  }, [mapType, showLabels, isMapLoaded, selectedArea?.level]);

  // Update Dynamic Hotspot Clusters and Single Point Markers
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    const remaining = new globalThis.Map(markerEntriesRef.current);
    const keepMarker = (key, data) => {
      remaining.delete(key);
      const signature = JSON.stringify(data);
      const previous = markerEntriesRef.current.get(key);
      if (previous?.signature === signature) return true;
      previous?.marker.remove();
      markerEntriesRef.current.delete(key);
      return false;
    };
    const rememberMarker = (key, data, marker, element) => {
      element.dataset.sampleCode = data.sample?.sample_code || '';
      element.dataset.hotspotId = data.id;
      markerEntriesRef.current.set(key, { marker, signature: JSON.stringify(data) });
    };
    if (!shouldShowAreaSamples(selectedArea)) {
      markerEntriesRef.current.forEach(entry => entry.marker.remove());
      markerEntriesRef.current.clear(); markersRef.current = [];
      return;
    }

    // Run spatial clustering engine (radius 250m)
    const { clusters, singlePoints } = clusterSubmissions(
      submissions,
      250,
      sample => provinceForCoordinates(sample.coordinates, provinceFeatures)?.iso || null
    );

    // 1. Render Dynamic Hotspot Clusters (สำหรับบริเวณที่มีผลตรวจตั้งแต่ 2 รายการขึ้นไป)
    clusters.forEach((cluster) => {
      const key = 'cluster:' + cluster.items.map(item => item.sample_code || item.record_id).sort().join('|');
      if (keepMarker(key, cluster)) return;
      const province = provinceForCoordinates(cluster.coordinates, provinceFeatures);
      const isSelected = false;
      const isDanger = cluster.isDanger;
      const isWatch = cluster.isWatch;

      const riskGlow = isDanger
        ? 'ring-4 ring-rose-500/60 shadow-xl shadow-rose-500/40 border-rose-400 bg-rose-600'
        : isWatch
        ? 'ring-4 ring-amber-400/60 shadow-xl shadow-amber-500/40 border-amber-300 bg-amber-500'
        : 'ring-4 ring-emerald-400/60 shadow-xl shadow-emerald-500/40 border-emerald-300 bg-emerald-600';

      const pingColor = isDanger
        ? 'bg-rose-500/50'
        : isWatch
        ? 'bg-amber-500/50'
        : 'bg-emerald-500/50';

      const nodeBg = isDanger
        ? 'bg-rose-600'
        : isWatch
        ? 'bg-amber-500'
        : 'bg-emerald-600';

      const hasPhotos = (cluster.latestPhotos && cluster.latestPhotos.length > 0) || !!cluster.latestPhoto;

      const el = document.createElement('div');
      el.className = 'hotspot-marker group cursor-pointer select-none' + (isSelected ? ' is-selected' : '');
      el.style.zIndex = isSelected ? '70' : '45';

      el.innerHTML = `
        <div class="hotspot-inner flex flex-col items-center transform transition-all duration-300 ${
          isSelected ? 'scale-115' : 'hover:scale-110'
        }">
          <!-- Glowing Hotspot Badge -->
          <div class="hotspot-badge px-2.5 py-1 rounded-xl text-[11px] font-bold text-white shadow-xl flex items-center gap-1.5 whitespace-nowrap mb-1 transition-all ${riskGlow}">
            <span class="text-xs">🔥</span>
            ${province ? `<span class="font-extrabold">จ.${province.name}</span>` : ''}
            <span>${cluster.title}</span>
            <span class="px-1.5 py-0.2 rounded-md bg-black/30 font-mono font-black text-[10px] text-amber-200">
              ${cluster.count} จุด
            </span>
            <span class="font-mono text-white font-black ml-0.5">
              ${cluster.latestAs !== undefined ? cluster.latestAs : cluster.maxAs} ppb
            </span>
            ${hasPhotos ? '<span>📷</span>' : ''}
          </div>

          <!-- Pulsing Node Center -->
          <div class="hotspot-node relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full ${pingColor} animate-ping"></span>
            <div class="w-6 h-6 rounded-full ${nodeBg} border-2 border-white shadow-2xl flex items-center justify-center font-bold text-white text-[11px] font-mono">
              ${cluster.count}
            </div>
          </div>
        </div>
      `;

      // Hover -> แสดง Popup Card เมื่อไม่ได้ตรึงหน้าต่างไว้
      el.addEventListener('mouseenter', () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (!isPinnedRef.current) {
          const point = map.project(cluster.coordinates);
          setPopupPos({ x: point.x, y: point.y });
          updatePopupHotspot(cluster);
        }
      });

      el.addEventListener('mouseleave', () => {
        if (!isPinnedRef.current && !previewImageRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (!isHoveringPopupRef.current && !isPinnedRef.current && !previewImageRef.current) {
              updatePopupHotspot(null);
            }
          }, 250);
        }
      });

      // Click -> ตรึง Popup Card และเลื่อนแผนที่เข้าหากึ่งกลาง พร้อมอนิเมชั่นเลือก
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        isHoveringPopupRef.current = true;
        setIsPinned(true);
        document.querySelectorAll('.hotspot-marker.is-selected, .single-point-marker.is-selected').forEach(m => m.classList.remove('is-selected'));
        el.classList.add('is-selected');
        const point = map.project(cluster.coordinates);
        setPopupPos({ x: point.x, y: point.y });
        updatePopupHotspot(cluster);
        map.flyTo({ center: cluster.coordinates, offset: [0, -90], zoom: 15.5, duration: 700 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(cluster.coordinates)
        .addTo(map);

      rememberMarker(key, cluster, marker, el);
    });

    // 2. Render Single Points (จุดตรวจเดี่ยวที่มี 1 รายงาน)
    singlePoints.forEach((point) => {
      const key = 'point:' + (point.sample?.sample_code || point.sample?.record_id || point.id);
      if (keepMarker(key, point)) return;
      const province = provinceForCoordinates(point.coordinates, provinceFeatures);
      const isSelected = false;
      const arsenicVal = point.latestAs;
      const isDanger = point.isDanger;
      const isWatch = point.isWatch;

      const badgeColor = isDanger
        ? 'bg-rose-600 text-white'
        : isWatch
        ? 'bg-amber-500 text-white'
        : 'bg-emerald-600 text-white';

      const pinColor = isDanger ? '#e11d48' : isWatch ? '#f59e0b' : '#059669';

      const el = document.createElement('div');
      el.className = 'single-point-marker group cursor-pointer select-none' + (isSelected ? ' is-selected' : '');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `เปิดผลตรวจ ${point.latestSampleCode}`);
      el.tabIndex = 0;
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); }
      });
      el.style.zIndex = isSelected ? '65' : '35';

      const hasPhotos = (point.latestPhotos && point.latestPhotos.length > 0) || (point.photos && point.photos.length > 0);

      el.innerHTML = `
        <div class="point-inner flex flex-col items-center transform transition-all duration-300 ${
          isSelected ? 'scale-120' : 'hover:scale-110'
        }">
          <div class="point-badge px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md border border-white flex items-center gap-1.5 ${badgeColor} whitespace-nowrap mb-0.5 transition-all">
            ${province ? `<span class="font-extrabold">จ.${province.name}</span>` : ''}
            <span class="max-w-[110px] truncate text-[9px] font-sans font-medium text-white/95">
              ${point.locationName}
            </span>
            <span class="font-mono text-[9px] font-bold">
              ${arsenicVal !== null && arsenicVal !== undefined ? `${arsenicVal} ppb` : '-'}
            </span>
            ${hasPhotos ? '<span>📷</span>' : ''}
          </div>

          <div class="point-pin relative w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all" style="background-color: ${pinColor}">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      // Hover -> แสดง Popup Card
      el.addEventListener('mouseenter', () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (!isPinnedRef.current) {
          const pt = map.project(point.coordinates);
          setPopupPos({ x: pt.x, y: pt.y });
          updatePopupHotspot(point);
        }
      });

      el.addEventListener('mouseleave', () => {
        if (!isPinnedRef.current && !previewImageRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (!isHoveringPopupRef.current && !isPinnedRef.current && !previewImageRef.current) {
              updatePopupHotspot(null);
            }
          }, 250);
        }
      });

      // Click -> ตรึง Popup Card และเลื่อนแผนที่เข้าหาจุดตรวจ พร้อมอนิเมชั่นเลือก
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        isHoveringPopupRef.current = true;
        setIsPinned(true);
        document.querySelectorAll('.hotspot-marker.is-selected, .single-point-marker.is-selected').forEach(m => m.classList.remove('is-selected'));
        el.classList.add('is-selected');
        const pt = map.project(point.coordinates);
        setPopupPos({ x: pt.x, y: pt.y });
        updatePopupHotspot(point);
        map.flyTo({ center: point.coordinates, offset: [0, -90], zoom: 15.5, duration: 700 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(point.coordinates)
        .addTo(map);

      rememberMarker(key, point, marker, el);
    });
    remaining.forEach((entry, key) => { entry.marker.remove(); markerEntriesRef.current.delete(key); });
    markersRef.current = [...markerEntriesRef.current.values()].map(entry => entry.marker);
  }, [submissions, isMapLoaded, selectedArea?.level, provinceFeatures]);

  useEffect(() => {
    for (const { marker } of markerEntriesRef.current.values()) {
      const element = marker.getElement();
      element.classList.toggle('is-selected', Boolean(
        (selectedSample && element.dataset.sampleCode === selectedSample.sample_code) ||
        (selectedHotspot && element.dataset.hotspotId === selectedHotspot.id) ||
        (isPinned && popupHotspot && element.dataset.hotspotId === popupHotspot.id)
      ));
    }
  }, [selectedSample, selectedHotspot, isPinned, popupHotspot]);

  // Handle focus coordinates trigger
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !focusCoords) return;
    mapRef.current.flyTo({
      center: focusCoords,
      zoom: 16,
      duration: 1000
    });
  }, [focusCoords, isMapLoaded]);

  // ติดตามการเคลื่อนที่ของแผนที่เพื่อตรึง Popup Card ให้อยู่เหนือหมุดตลอดเวลา
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleUpdatePos = () => {
      if (popupHotspotRef.current) {
        const point = map.project(popupHotspotRef.current.coordinates);
        setPopupPos({ x: point.x, y: point.y });
      }
    };

    map.on('move', handleUpdatePos);
    map.on('zoom', handleUpdatePos);
    map.on('resize', handleUpdatePos);

    return () => {
      map.off('move', handleUpdatePos);
      map.off('zoom', handleUpdatePos);
      map.off('resize', handleUpdatePos);
    };
  }, [mapReloadKey]);

  // ป้องกันไม่ให้การ์ดล้นขอบจอซ้าย-ขวา หรือชนขอบบนสำหรับเดสก์ท็อป
  const cardHeightEstimate = 420;
  const isFlippedBelow = popupPos.y < (cardHeightEstimate + 20);
  const cardHalfWidth = 160;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popupMaxHeight = Math.max(160, isFlippedBelow ? screenHeight - popupPos.y - 100 : popupPos.y - 30);
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const clampedX = Math.max(cardHalfWidth + 10, Math.min(screenWidth - cardHalfWidth - 10, popupPos.x));
  const pointerOffset = Math.max(-110, Math.min(110, popupPos.x - clampedX));

  const formatThaiDateTime = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '-';
      const datePart = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const timePart = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} เวลา ${timePart} น.`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="relative w-full h-full bg-[#F8F7F5]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* หน้าต่างกู้คืนระบบเมื่อเกิด WebGL Context Loss ชั่วคราว */}
      {webglError && (
        <div className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                เบราว์เซอร์แจ้งเตือน WebGL ถูกระงับชั่วคราว
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                เนื่องจากเบราว์เซอร์มีการรีเซ็ตหน่วยความจำ GPU (GPU Context Loss) สามารถกดปุ่มด้านล่างเพื่อเริ่มระบบแผนที่ใหม่ทันที
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => {
                  setWebglError(null);
                  setMapReloadKey(k => k + 1);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>กู้คืนแผนที่ทันที</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.replace(window.location.origin + window.location.pathname + (window.location.hash || '#water-watch') + '?r=' + Date.now());
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>โหลดหน้าใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover / Click Hotspot Popup Card (บนมือถือแสดงตรงกลางจอพร้อมฉากหลัง, บนเดสก์ท็อปแสดงบนหัวหมุด) */}
      {popupHotspot && (
        isMobile ? createPortal(
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-3.5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => {
              setIsPinned(false);
              updatePopupHotspot(null);
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-[325px] max-h-[88vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 text-slate-800 relative flex flex-col select-none kok-popup-card animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ปุ่มปิด ✕ มุมขวาบน */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(false);
                  updatePopupHotspot(null);
                }}
                className="kok-popup-close-btn absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header: ตราวงกลม + ชื่อสถานี/จุดตรวจ */}
              <div className="flex items-start gap-2.5 pr-6">
                <div className="w-9 h-9 rounded-full border border-purple-200 bg-purple-50/80 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Droplets className="w-4 h-4 text-purple-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 leading-snug break-words" title={popupHotspot.locationName || popupHotspot.title}>
                    ผลการตรวจ ({popupHotspot.latestSampleCode ? popupHotspot.latestSampleCode.slice(-3) : (popupHotspot.count > 1 ? `R${popupHotspot.count}` : 'R1')}) - {popupHotspot.locationName || popupHotspot.title || 'จุดตรวจ'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    น้ำ · {getThaiShortDate(popupHotspot.latestCollectionTime)} · {popupHotspot.count || 1} รอบตรวจ
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate">
                    ชื่อสมมติ: {publicPseudonym(popupHotspot.latestSampleCode)}{popupHotspot.count > 1 ? ' · ผลตรวจล่าสุด' : ''}
                  </div>
                </div>
              </div>

              {/* Section: สารหนู (As) ทุกครั้งที่ตรวจ (ppb) */}
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-slate-900">
                    {popupHotspot.count > 5 || (popupHotspot.items && popupHotspot.items.length > 5)
                      ? 'สารหนู (As) 5 รอบล่าสุด (ppb)'
                      : 'สารหนู (As) ทุกครั้งที่ตรวจ (ppb)'}
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-mono">
                    มาตรฐาน 10 ppb
                  </span>
                </div>

                {/* Mini Chart แสดงวัน กับ สารที่วัดได้ในวันนั้น */}
                <MiniAsChart
                  items={popupHotspot.items && popupHotspot.items.length > 0 ? popupHotspot.items : (popupHotspot.sample ? [popupHotspot.sample] : [])}
                  latestAs={popupHotspot.latestAs}
                  latestTime={popupHotspot.latestCollectionTime}
                  count={popupHotspot.count || 1}
                />
                <PublicEvidencePhotos sample={popupHotspot.sample} />

                {/* ตารางสรุป 3 คอลัมน์เฉพาะข้อมูลระบบจริง: รอบตรวจ | สารหนู (As) | เกณฑ์ คพ. */}
                <div className="grid grid-cols-3 text-xs py-1.5 text-left border-t border-slate-100 mt-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">รอบตรวจ</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">ครั้งที่ {popupHotspot.count || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">สารหนู (As)</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                      {popupHotspot.latestAs !== null && popupHotspot.latestAs !== undefined ? `${popupHotspot.latestAs} ppb` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">เกณฑ์ คพ.</span>
                    <span className="font-semibold text-slate-600 text-xs sm:text-sm font-mono">&le; 10 ppb</span>
                  </div>
                </div>

                {/* จุดสถานะ */}
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold my-2">
                  <span className={`kok-status-dot-pulse w-2.5 h-2.5 rounded-full shrink-0 ${
                    popupHotspot.latestIsDanger
                      ? 'bg-rose-600'
                      : popupHotspot.latestIsWatch
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`} />
                  <span className="text-slate-600 font-medium">สถานะ:</span>
                  <span className={
                    popupHotspot.latestIsDanger
                      ? 'text-rose-600 font-bold'
                      : popupHotspot.latestIsWatch
                      ? 'text-amber-600 font-bold'
                      : 'text-emerald-600 font-bold'
                  }>
                    {popupHotspot.latestIsDanger ? 'เกินเกณฑ์' : popupHotspot.latestIsWatch ? 'เฝ้าระวัง' : 'ปกติ'}
                  </span>
                </div>

                {/* ปุ่มสีน้ำเงิน: ออกรายงาน */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = popupHotspot;
                    setIsPinned(false);
                    updatePopupHotspot(null);
                    if (target.isHotspot && onSelectHotspot) {
                      onSelectHotspot(target);
                    } else if (onSelectSample && target.sample) {
                      onSelectSample(target.sample);
                    } else if (onSelectHotspot) {
                      onSelectHotspot(target);
                    }
                  }}
                  className="kok-popup-report-btn w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>ออกรายงาน</span>
                </button>
              </div>
            </div>
          </div>, document.body
        ) : (
          <div
            className="absolute z-[90] pointer-events-auto transition-all duration-200"
            style={{
              left: `${clampedX}px`,
              top: isFlippedBelow ? `${popupPos.y + 14}px` : `${popupPos.y - 14}px`,
              transform: isFlippedBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(true);
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              isHoveringPopupRef.current = true;
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              isHoveringPopupRef.current = false;
              if (!isPinned && !previewImage) {
                hoverTimeoutRef.current = setTimeout(() => {
                  if (!isHoveringPopupRef.current && !isPinned && !previewImage) {
                    updatePopupHotspot(null);
                  }
                }, 250);
              }
            }}
          >
            <div style={{ maxHeight: popupMaxHeight, overflowY: 'auto' }} className="w-[300px] sm:w-[320px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 text-slate-800 relative flex flex-col select-none kok-popup-card">
              {/* ปุ่มปิด ✕ มุมขวาบน */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(false);
                  updatePopupHotspot(null);
                }}
                className="kok-popup-close-btn absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header: ตราวงกลม + ชื่อสถานี/จุดตรวจ */}
              <div className="flex items-start gap-2.5 pr-6">
                <div className="w-9 h-9 rounded-full border border-purple-200 bg-purple-50/80 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Droplets className="w-4 h-4 text-purple-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 leading-snug break-words" title={popupHotspot.locationName || popupHotspot.title}>
                    ผลการตรวจ ({popupHotspot.latestSampleCode ? popupHotspot.latestSampleCode.slice(-3) : (popupHotspot.count > 1 ? `R${popupHotspot.count}` : 'R1')}) - {popupHotspot.locationName || popupHotspot.title || 'จุดตรวจ'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    น้ำ · {getThaiShortDate(popupHotspot.latestCollectionTime)} · {popupHotspot.count || 1} รอบตรวจ
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate">
                    ชื่อสมมติ: {publicPseudonym(popupHotspot.latestSampleCode)}{popupHotspot.count > 1 ? ' · ผลตรวจล่าสุด' : ''}
                  </div>
                </div>
              </div>

              {/* Section: สารหนู (As) ทุกครั้งที่ตรวจ (ppb) */}
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-slate-900">
                    {popupHotspot.count > 5 || (popupHotspot.items && popupHotspot.items.length > 5)
                      ? 'สารหนู (As) 5 รอบล่าสุด (ppb)'
                      : 'สารหนู (As) ทุกครั้งที่ตรวจ (ppb)'}
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-mono">
                    มาตรฐาน 10 ppb
                  </span>
                </div>

                {/* Mini Chart แสดงวัน กับ สารที่วัดได้ในวันนั้น */}
                <MiniAsChart
                  items={popupHotspot.items && popupHotspot.items.length > 0 ? popupHotspot.items : (popupHotspot.sample ? [popupHotspot.sample] : [])}
                  latestAs={popupHotspot.latestAs}
                  latestTime={popupHotspot.latestCollectionTime}
                  count={popupHotspot.count || 1}
                />
                <PublicEvidencePhotos sample={popupHotspot.sample} />

                {/* ตารางสรุป 3 คอลัมน์เฉพาะข้อมูลระบบจริง: รอบตรวจ | สารหนู (As) | เกณฑ์ คพ. */}
                <div className="grid grid-cols-3 text-xs py-1.5 text-left border-t border-slate-100 mt-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">รอบตรวจ</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">ครั้งที่ {popupHotspot.count || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">สารหนู (As)</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                      {popupHotspot.latestAs !== null && popupHotspot.latestAs !== undefined ? `${popupHotspot.latestAs} ppb` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block font-medium">เกณฑ์ คพ.</span>
                    <span className="font-semibold text-slate-600 text-xs sm:text-sm font-mono">&le; 10 ppb</span>
                  </div>
                </div>

                {/* จุดสถานะ */}
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold my-2">
                  <span className={`kok-status-dot-pulse w-2.5 h-2.5 rounded-full shrink-0 ${
                    popupHotspot.latestIsDanger
                      ? 'bg-rose-600'
                      : popupHotspot.latestIsWatch
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`} />
                  <span className="text-slate-600 font-medium">สถานะ:</span>
                  <span className={
                    popupHotspot.latestIsDanger
                      ? 'text-rose-600 font-bold'
                      : popupHotspot.latestIsWatch
                      ? 'text-amber-600 font-bold'
                      : 'text-emerald-600 font-bold'
                  }>
                    {popupHotspot.latestIsDanger ? 'เกินเกณฑ์' : popupHotspot.latestIsWatch ? 'เฝ้าระวัง' : 'ปกติ'}
                  </span>
                </div>

                {/* ปุ่มสีน้ำเงิน: ออกรายงาน */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = popupHotspot;
                    setIsPinned(false);
                    updatePopupHotspot(null);
                    if (target.isHotspot && onSelectHotspot) {
                      onSelectHotspot(target);
                    } else if (onSelectSample && target.sample) {
                      onSelectSample(target.sample);
                    } else if (onSelectHotspot) {
                      onSelectHotspot(target);
                    }
                  }}
                  className="kok-popup-report-btn w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>ออกรายงาน</span>
                </button>
              </div>

              {/* Speech Bubble Pointer แสดงบนหัวหมุดบนเดสก์ท็อป */}
              {isFlippedBelow ? (
                <div 
                  className="absolute -top-2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow-xs -translate-x-1/2 pointer-events-none"
                  style={{ left: `calc(50% + ${pointerOffset}px)` }}
                />
              ) : (
                <div 
                  className="absolute -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-xs -translate-x-1/2 pointer-events-none"
                  style={{ left: `calc(50% + ${pointerOffset}px)` }}
                />
              )}
            </div>
          </div>
        )
      )}

      {/* Lightbox Modal สำหรับขยายดูรูปภาพถ่ายหลักฐาน พร้อมระบบสลับรูปถัดไป/ก่อนหน้า */}
      {previewImage && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-black/60 backdrop-blur-md flex items-center justify-between text-white border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                  {previewImage.photos?.[previewImage.index]?.title || previewImage.title || 'ภาพถ่ายหลักฐานการตรวจวัดล่าสุด'}
                </h4>
                {previewImage.photos && previewImage.photos.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 font-mono text-[10px] shrink-0">
                    {previewImage.index + 1} / {previewImage.photos.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                title="ปิด (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Image with Navigation Arrows */}
            <div className="relative w-full max-h-[72vh] flex items-center justify-center bg-black/90 p-2 sm:p-4 overflow-hidden">
              <img
                src={previewImage.photos?.[previewImage.index]?.url || previewImage.url}
                alt="ภาพถ่ายหลักฐาน"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />

              {previewImage.photos && previewImage.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(prev => ({
                        ...prev,
                        index: (prev.index - 1 + prev.photos.length) % prev.photos.length
                      }));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer shadow-lg"
                    title="ภาพก่อนหน้า"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(prev => ({
                        ...prev,
                        index: (prev.index + 1) % prev.photos.length
                      }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer shadow-lg"
                    title="ภาพถัดไป"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Strip if multiple photos */}
            {previewImage.photos && previewImage.photos.length > 1 && (
              <div className="p-2.5 bg-black/70 flex items-center justify-center gap-2 border-t border-white/10 shrink-0">
                {previewImage.photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewImage(prev => ({ ...prev, index: idx }))}
                    className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      previewImage.index === idx ? 'border-sky-400 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>, document.body
      )}

      {/* 1. Floating Map Controls & Boundaries Filter (ชิดขวาบน ใต้แถบบาร์) */}
      {!hideDefaultControls && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-4 z-20 pointer-events-auto flex flex-col items-end gap-2 select-none max-w-[calc(100vw-24px)]">
          {/* แถวที่ 1: สลับแผนที่สถานที่ / ดาวเทียม & แสดง/ซ่อนตัวอักษร */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* ปุ่มผู้ดูแลระบบ (Admin Login) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.hash = '#admin';
              }}
              className="p-1.5 sm:p-2 rounded-xl backdrop-blur-md shadow-lg border bg-white/95 text-slate-700 hover:text-[#A6192E] border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              title="เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A6192E]" />
            </button>

            <div className="p-1 sm:p-1.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-[#B4975A]/40 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMapType('street')}
                className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapType === 'street'
                    ? 'bg-[#A6192E] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="แผนที่สถานที่และชื่อสถานที่ภาษาไทย"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">แผนที่สถานที่</span>
                <span className="sm:hidden">สถานที่</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="พื้นที่ดาวเทียมความละเอียดสูง (Satellite Hybrid)"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">พื้นที่ดาวเทียม</span>
                <span className="sm:hidden">ดาวเทียม</span>
              </button>
            </div>

            {mapType !== 'street' && (
              <button
                type="button"
                onClick={() => setShowLabels(prev => !prev)}
                className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl backdrop-blur-md shadow-lg border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showLabels
                    ? 'bg-amber-50/95 text-amber-950 border-amber-300 ring-1 ring-amber-400/40'
                    : 'bg-white/90 text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title="เปิด/ปิด การแสดงตัวอักษรและชื่อสถานที่บนแผนที่"
              >
                <Layers className={`w-3.5 h-3.5 ${showLabels ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{showLabels ? 'แสดงตัวอักษร' : 'ซ่อนตัวอักษร'}</span>
              </button>
            )}
          </div>

          {/* แถวที่ 2: ตัวกรองขอบเขตการปกครองและพื้นที่ (Administrative Boundaries Filter) */}
          <div className="flex flex-col items-end">
            {/* ปุ่มเปิด/ปิด แผงตัวกรองขอบเขต */}
            <button
              type="button"
              onClick={() => setIsBoundaryFilterOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isBoundaryFilterOpen
                  ? 'bg-[#182234] text-white border-white/20 shadow-xl ring-2 ring-sky-400/40'
                  : 'bg-white/95 text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
              title="เปิด/ปิด แผงตัวกรองเส้นขอบเขตการปกครองและพื้นที่"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
              <span>ขอบเขตพื้นที่</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                isBoundaryFilterOpen ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {Object.values(boundaryFilters).filter(Boolean).length}/{BOUNDARY_ITEMS.length}
              </span>
              <span className="text-[10px] text-slate-400">
                {isBoundaryFilterOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* แผงตัวกรองขอบเขตจริง (Icon + Label ย่อ ไม่รก เข้าใจง่าย) */}
            {isBoundaryFilterOpen && (
              <div className="mt-1.5 p-2.5 sm:p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 text-xs w-72 sm:w-80 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>เส้นขอบเขตการปกครอง (Boundaries)</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setBoundaryFilters(DEFAULT_BOUNDARY_FILTERS)}
                      className="text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
                    >
                      เปิดหมด
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setBoundaryFilters({ country: false, province: false, locality: false })}
                      className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBoundaryLabels(prev => !prev)}
                  className={`w-full px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    showBoundaryLabels
                      ? 'bg-sky-50 border-sky-200 text-sky-900'
                      : 'bg-white/60 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2 text-left">
                    <Layers className={`w-4 h-4 ${showBoundaryLabels ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>
                      <span className="block text-xs font-bold">ชื่อพื้นที่</span>
                      <span className="block text-[10px] text-slate-400">แสดงชื่อประเทศ จังหวัด และพื้นที่</span>
                    </span>
                  </span>
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    showBoundaryLabels ? 'bg-[#182234] border-[#182234] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {showBoundaryLabels && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </button>

                {/* รายการตัวกรองระดับการปกครอง พร้อม Icon + Label ย่อ */}
                <div className="space-y-1">
                  {BOUNDARY_ITEMS.map((item) => {
                    const isActive = !!boundaryFilters[item.id];
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleBoundary(item.id)}
                        className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isActive
                            ? 'bg-slate-50 border-slate-300/80 shadow-2xs'
                            : 'bg-white/60 border-slate-200 text-slate-400 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs text-white"
                            style={{ backgroundColor: isActive ? item.activeColor : '#94a3b8' }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5 leading-tight">
                              <span className={`text-xs font-bold truncate ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                                {item.shortLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({item.id})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {/* Toggle Checkbox / Indicator */}
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-[#182234] border-[#182234] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Floating Vertical Toolstrip (ทางขวา: แคปซูล + / - และ ปุ่มรูปบ้าน ที่ตั้งปัจจุบัน) */}
      {!hideDefaultControls && (
        <div className={`absolute right-2 sm:right-4 z-20 pointer-events-auto flex flex-col items-center gap-2 select-none transition-all duration-200 ${
          isBoundaryFilterOpen ? 'top-80 sm:top-84' : 'top-24 sm:top-24'
        }`}>
          {/* Capsule: Zoom In (+) & Zoom Out (-) */}
          <div className="flex flex-col bg-[#182234]/95 backdrop-blur-md rounded-2xl border border-white/15 shadow-xl overflow-hidden text-white">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer border-b border-white/10"
              title="ซูมเข้า (Zoom In)"
            >
              <Plus className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer"
              title="ซูมออก (Zoom Out)"
            >
              <Minus className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
            </button>
          </div>

          {/* Squircle: Home Icon (ตำแหน่งปัจจุบันของเครื่อง / อุปกรณ์) */}
          <button
            type="button"
            onClick={handleGoToCurrentLocation}
            disabled={isLocating}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#182234]/95 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 transition-all cursor-pointer group ${
              isLocating ? 'ring-2 ring-sky-400' : ''
            }`}
            title="ตำแหน่งปัจจุบันของเครื่อง / อุปกรณ์ (GPS Current Location)"
          >
            <Home className={`w-5 h-5 sm:w-5.5 sm:h-5.5 group-hover:scale-110 transition-transform ${isLocating ? 'animate-bounce text-sky-400' : ''}`} />
          </button>
        </div>
      )}

      {/* 3. Floating Location Feedback Toast (แสดงสถานะเมื่อกดปุ่มรูปบ้าน ดึงตำแหน่งเครื่อง) */}
      {locationStatus && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto max-w-[90vw]">
          <div className={`px-3.5 py-2 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-2 text-xs font-semibold ${
            locationStatus.type === 'loading'
              ? 'bg-[#182234]/95 text-sky-200 border-sky-400/40 ring-2 ring-sky-500/20'
              : locationStatus.type === 'success'
              ? 'bg-[#0f291e]/95 text-emerald-200 border-emerald-400/40 ring-2 ring-emerald-500/20'
              : 'bg-[#2d1216]/95 text-rose-200 border-rose-400/40 ring-2 ring-rose-500/20'
          }`}>
            {locationStatus.type === 'loading' && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-300 border-t-transparent animate-spin shrink-0"></span>
            )}
            {locationStatus.type === 'success' && <span className="text-sm">📍</span>}
            {locationStatus.type === 'error' && <span className="text-sm">⚠️</span>}
            <span className="truncate">{locationStatus.message}</span>
            <button 
              type="button" 
              onClick={() => setLocationStatus(null)}
              className="ml-1 p-0.5 text-white/60 hover:text-white rounded-md cursor-pointer shrink-0"
              title="ปิดการแจ้งเตือน"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
