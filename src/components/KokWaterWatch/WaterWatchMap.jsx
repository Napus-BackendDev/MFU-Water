import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, ChevronRight, TrendingUp, TrendingDown, Minus, Droplets, Camera, Edit3 } from 'lucide-react';
import { WATER_WATCH_STATIONS, getStationTelemetry } from '../../data/waterWatchData';

export default function WaterWatchMap({
  submissions = [],
  stations = WATER_WATCH_STATIONS,
  selectedSample = null,
  onSelectSample = null,
  selectedStation = null,
  onSelectStation = null,
  onEditStation = null,
  focusCoords = null,
  onPopupChange = null,
  isPickingCoordinates = false,
  onPickCoordinates = null,
  pickedCoords = null,
  onCancelPick = null,
  onConfirmPick = null
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const pickedMarkerRef = useRef(null);

  const isPickingCoordinatesRef = useRef(isPickingCoordinates);
  const onPickCoordinatesRef = useRef(onPickCoordinates);

  useEffect(() => {
    isPickingCoordinatesRef.current = isPickingCoordinates;
  }, [isPickingCoordinates]);

  useEffect(() => {
    onPickCoordinatesRef.current = onPickCoordinates;
  }, [onPickCoordinates]);

  // State สำหรับ Hover / Click Station Popup Card แบบ waterroom.pro พร้อม Trend
  const [popupStation, setPopupStation] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef(null);
  const isHoveringPopupRef = useRef(false);
  const onPopupChangeRef = useRef(onPopupChange);

  useEffect(() => {
    onPopupChangeRef.current = onPopupChange;
  }, [onPopupChange]);

  const updatePopupStation = (st) => {
    setPopupStation(st);
    onPopupChangeRef.current?.(st);
  };

  // Initialize Map
  useEffect(() => {
    if (mapRef.current) return;

    const styleDefinition = {
      version: 8,
      sources: {
        googleStreet: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=m&apistyle=s.t:2|p.v:off&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=m&apistyle=s.t:2|p.v:off&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=m&apistyle=s.t:2|p.v:off&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=m&apistyle=s.t:2|p.v:off&x={x}&y={y}&z={z}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'background-white',
          type: 'background',
          paint: { 'background-color': '#F8F7F5' }
        },
        {
          id: 'google-layer',
          type: 'raster',
          source: 'googleStreet',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleDefinition,
      center: [99.3800, 20.0550], // Center between Tha Ton and Mok Cham
      zoom: 13.2,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      // ใช้แนวลำน้ำธรรมชาติของแผนที่ Google Maps โดยไม่ต้องวาดเส้นสีฟ้าทับ
    });

    map.on('click', (e) => {
      if (isPickingCoordinatesRef.current) {
        onPickCoordinatesRef.current?.([e.lngLat.lng, e.lngLat.lat]);
        return;
      }
      setPopupStation(null);
      onPopupChangeRef.current?.(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // เปลี่ยนเคอร์เซอร์เป็นเป้าเล็งเมื่ออยู่ในโหมดเลือกพิกัด
  useEffect(() => {
    if (!mapRef.current) return;
    const canvas = mapRef.current.getCanvas();
    if (canvas) {
      canvas.style.cursor = isPickingCoordinates ? 'crosshair' : '';
    }
  }, [isPickingCoordinates]);

  // ปักหมุดชั่วคราวแสดงพิกัดที่คลิกเลือกบนแผนที่
  useEffect(() => {
    if (!mapRef.current) return;
    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.remove();
      pickedMarkerRef.current = null;
    }

    if (isPickingCoordinates && pickedCoords && Array.isArray(pickedCoords) && pickedCoords.length === 2) {
      const el = document.createElement('div');
      el.className = 'picked-coords-marker select-none pointer-events-none';
      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-900 font-black text-[11px] shadow-xl border-2 border-white whitespace-nowrap mb-1 animate-pulse">
            📍 จุดที่เลือก: ${Number(pickedCoords[1]).toFixed(5)}, ${Number(pickedCoords[0]).toFixed(5)}
          </div>
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-amber-400/50 animate-ping"></span>
            <div class="w-5 h-5 rounded-full bg-[#A6192E] border-2 border-amber-300 shadow-lg flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(pickedCoords)
        .addTo(mapRef.current);
      pickedMarkerRef.current = marker;
    }

    return () => {
      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.remove();
        pickedMarkerRef.current = null;
      }
    };
  }, [isPickingCoordinates, pickedCoords]);

  // Update Markers for Stations and Submissions
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Render River Station & Water Pump Waypoints
    const stationList = stations && stations.length > 0 ? stations : WATER_WATCH_STATIONS;
    stationList.forEach(st => {
      const isSelected = selectedStation?.id === st.id;
      const isPump = st.stationType === 'pump' || st.name?.includes('ดูด') || st.name?.includes('สูบ');
      
      // Calculate telemetry & submissions for this station
      const telemetry = getStationTelemetry(st, submissions);
      const hasLogs = telemetry.logCount > 0 || telemetry.arsenic !== null;
      const logCount = telemetry.logCount;
      const latestAs = telemetry.arsenic;
      const isDanger = telemetry.isDanger;
      const isWatch = telemetry.isWatch;

      const riskBorder = isDanger
        ? 'border-rose-500 ring-2 ring-rose-400'
        : isWatch
        ? 'border-amber-400 ring-2 ring-amber-400'
        : hasLogs
        ? 'border-emerald-400 ring-2 ring-emerald-400'
        : (isPump ? 'border-sky-400 ring-1 ring-sky-300' : 'border-cyan-500/50');

      const beaconColor = isDanger
        ? 'bg-rose-500'
        : isWatch
        ? 'bg-amber-500'
        : hasLogs
        ? 'bg-emerald-500'
        : (isPump ? 'bg-sky-500' : 'bg-cyan-600');

      const pingColor = isDanger
        ? 'bg-rose-500/40'
        : isWatch
        ? 'bg-amber-500/40'
        : hasLogs
        ? 'bg-emerald-500/40'
        : (isPump ? 'bg-sky-400/40' : 'bg-cyan-500/30');

      const el = document.createElement('div');
      el.className = 'station-waypoint-marker group cursor-pointer select-none';
      el.style.zIndex = isSelected ? '55' : '45';

      el.innerHTML = `
        <div class="flex flex-col items-center transform transition-all duration-200 ${
          isSelected ? 'scale-110' : 'hover:scale-105'
        }">
          <!-- Compact River Waypoint Badge -->
          <div class="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md border flex items-center gap-1.5 whitespace-nowrap mb-0.5 ${
            isSelected
              ? 'bg-[#A6192E] text-white border-amber-300 ring-2 ring-amber-400'
              : `bg-slate-900/90 text-white backdrop-blur-xs ${riskBorder}`
          }">
            <span class="w-1.5 h-1.5 rounded-full ${hasLogs ? (isDanger ? 'bg-rose-400' : isWatch ? 'bg-amber-400' : 'bg-emerald-400') : (isPump ? 'bg-sky-400' : 'bg-cyan-400')} animate-pulse shrink-0"></span>
            <span class="font-mono ${isPump ? 'text-amber-300' : 'text-cyan-300'} font-extrabold">${st.code}</span>
            <span class="text-slate-200 font-medium">${isPump ? '💧 ' : ''}${st.name.replace('สถานี', '')}</span>

            ${hasLogs ? `
              <!-- Compact New Data Tag -->
              <span class="px-1 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 ${
                isDanger ? 'bg-rose-500 text-white' : isWatch ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }">
                ${latestAs !== null ? `${latestAs}µg` : `${logCount}ชุด`}
              </span>
            ` : ''}
          </div>

          <!-- Compact Waypoint Node -->
          <div class="relative flex items-center justify-center">
            <span class="absolute w-5 h-5 rounded-full ${pingColor} animate-ping"></span>
            <div class="w-3.5 h-3.5 rounded-full ${beaconColor} border-2 border-white shadow-sm flex items-center justify-center group-hover:bg-[#A6192E] transition-colors">
              <div class="w-1 h-1 rounded-full bg-white"></div>
            </div>
            ${hasLogs ? `
              <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
            ` : ''}
          </div>
        </div>
      `;

      // Mouse Hover -> แสดง Popup Card พร้อม Trend ทันทีแบบ waterroom.pro
      el.addEventListener('mouseenter', () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        const point = map.project(st.coordinates);
        setPopupPos({ x: point.x, y: point.y });
        updatePopupStation(st);
      });

      // Mouse Leave -> หน่วงเวลาเล็กน้อยให้เลื่อนเมาส์เข้าไปในการ์ดได้
      el.addEventListener('mouseleave', () => {
        hoverTimeoutRef.current = setTimeout(() => {
          if (!isHoveringPopupRef.current) {
            updatePopupStation(null);
          }
        }, 250);
      });

      // Click -> ปักหมุดแสดง Popup Card และจัดตำแหน่งให้เห็นการ์ดครบถ้วน
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        isHoveringPopupRef.current = true;
        const point = map.project(st.coordinates);
        setPopupPos({ x: point.x, y: point.y });
        updatePopupStation(st);
        map.flyTo({ center: st.coordinates, offset: [0, -100], zoom: 15.2, duration: 750 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(st.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 2. Render Submitted Samples (เฉพาะตัวอย่างนอกสถานีหลัก เพื่อไม่ให้มีจุดซ้ำซ้อนทับสถานี)
    const offStationSubmissions = submissions.filter(sub => {
      if (sub.is_off_station || sub.station_id === 'OFF-STATION') return true;
      const isKnownStation = stationList.some(
        st => st.id === sub.station_id || st.code === sub.station_id || (sub.station_name && sub.station_name.includes(st.name))
      );
      return !isKnownStation;
    });

    offStationSubmissions.forEach(sub => {
      const isSelected = selectedSample?.record_id === sub.record_id;
      const arsenicVal = sub.measurements?.arsenic?.value;
      const isDanger = arsenicVal !== null && arsenicVal > 20;
      const isWatch = arsenicVal !== null && arsenicVal > 10 && arsenicVal <= 20;

      const badgeColor = isDanger
        ? 'bg-rose-600 text-white'
        : (isWatch ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white');

      const pinColor = isDanger ? '#e11d48' : (isWatch ? '#f59e0b' : '#059669');

      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.zIndex = isSelected ? '60' : '40';

      const hasPhotos = sub.images && sub.images.length > 0;

      el.innerHTML = `
        <div class="flex flex-col items-center transform transition-all duration-200 ${
          isSelected ? 'scale-125 ring-4 ring-[#B4975A] rounded-full' : 'hover:scale-115'
        }">
          <!-- Info Badge with Custom Location Name & Telemetry -->
          <div class="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md border border-white flex items-center gap-1.5 ${badgeColor} whitespace-nowrap mb-1">
            <span class="max-w-[110px] truncate text-[9px] font-sans font-medium text-white/95">${sub.station_name || 'Mark Point'}</span>
            <span class="font-mono text-[9px] font-bold">As:${arsenicVal !== null ? `${arsenicVal}µg` : '-'}</span>
            ${hasPhotos ? '<span>📷</span>' : ''}
          </div>

          <!-- Pin Icon -->
          <div class="relative w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${pinColor}">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectSample) onSelectSample(sub);
        map.flyTo({
          center: sub.coordinates,
          zoom: 15.5,
          duration: 700
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(sub.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [submissions, stations, selectedSample, onSelectSample, selectedStation, onSelectStation]);

  // Handle focus coordinates trigger
  useEffect(() => {
    if (!mapRef.current || !focusCoords) return;
    mapRef.current.flyTo({
      center: focusCoords,
      zoom: 16,
      duration: 1000
    });
  }, [focusCoords]);

  // ติดตามการเคลื่อนที่ของแผนที่เพื่อตรึง Popup Card ให้อยู่เหนือหมุดตลอดเวลา
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleUpdatePos = () => {
      if (popupStation) {
        const point = map.project(popupStation.coordinates);
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
  }, [popupStation]);

  // คำนวณข้อมูลคุณภาพน้ำ รูปภาพ และ Trend สำหรับสถานีที่กำลัง Hover / เลือก
  const popupTelemetry = popupStation ? getStationTelemetry(popupStation, submissions) : null;
  const latestLog = popupTelemetry?.latestLog;
  const latestAs = popupTelemetry?.arsenic ?? null;
  const latestPh = popupTelemetry?.ph ?? null;
  const latestTurbidity = popupTelemetry?.turbidity ?? null;
  const latestTemp = popupTelemetry?.temperature ?? null;

  // รูปถ่ายสถานี: ใช้รูปล่าสุดจากภาคสนาม หรือรูปแลนด์มาร์กประจำสถานี
  const stationPhoto = latestLog?.images?.[0]?.url || popupStation?.image || 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80';

  // ข้อมูล Trend และการแสดงผล
  const trendData = popupTelemetry?.trend || [8.4, 7.8, 6.2];
  const trendText = popupTelemetry?.trendText || '→ ระดับคงที่';
  const trendColorClass = popupTelemetry?.trendColorClass || 'text-slate-700 bg-slate-50 border-slate-200';

  // สีตามเกณฑ์สารหนู (As)
  const asColorClass = latestAs !== null
    ? (latestAs > 20 ? 'text-rose-600' : latestAs > 10 ? 'text-amber-600' : 'text-emerald-600')
    : 'text-slate-700';

  const asBadgeText = latestAs !== null
    ? (latestAs > 20 ? 'เกินเกณฑ์ WHO' : latestAs > 10 ? 'เฝ้าระวัง' : 'ปกติ ปลอดภัย')
    : 'ปกติ';

  // SVG Sparkline Renderer
  const renderSparkline = (data) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) === 0 ? 1 : (max - min);
    const width = 200;
    const height = 30;
    const padding = 6;
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;

    const points = data.map((val, idx) => {
      const x = padding + (idx / Math.max(data.length - 1, 1)) * usableW;
      const y = height - padding - ((val - min) / range) * usableH;
      return { x, y, val };
    });

    const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaPoints = `${firstP.x},${height} ${polylinePoints} ${lastP.x},${height}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A6192E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#A6192E" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Shaded Area */}
        <polygon points={areaPoints} fill="url(#trendGradient)" />
        {/* Trend Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#A6192E"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot Markers */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 3.5 : 2.5}
            fill={idx === points.length - 1 ? '#A6192E' : '#B4975A'}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    );
  };

  // ป้องกันไม่ให้การ์ดล้นขอบจอซ้าย-ขวา หรือชน Header ด้านบน
  const isFlippedBelow = popupPos.y < 460;
  const cardHalfWidth = 145;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const clampedX = Math.max(cardHalfWidth + 12, Math.min(screenWidth - cardHalfWidth - 12, popupPos.x));
  const pointerOffset = Math.max(-110, Math.min(110, popupPos.x - clampedX));

  return (
    <div className="relative w-full h-full bg-[#F8F7F5]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Hover / Click Popup Card แบบ waterroom.pro พร้อม Trend */}
      {popupStation && (
        <div
          className="absolute z-50 pointer-events-auto transition-all duration-200"
          style={{
            left: `${clampedX}px`,
            top: isFlippedBelow ? `${popupPos.y + 16}px` : `${popupPos.y - 14}px`,
            transform: isFlippedBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
          }}
          onMouseEnter={() => {
            isHoveringPopupRef.current = true;
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={() => {
            isHoveringPopupRef.current = false;
            hoverTimeoutRef.current = setTimeout(() => {
              updatePopupStation(null);
            }, 250);
          }}
        >
          <div className="w-[270px] sm:w-[310px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800 relative max-h-[62vh] flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#A6192E] text-white">
                    {popupStation.code}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight truncate max-w-[190px]">
                    {popupStation.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ออนไลน์ · ล่าสุดวันนี้</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updatePopupStation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Station Image */}
            <div className="relative h-20 sm:h-28 w-full bg-slate-100 overflow-hidden shrink-0">
              <img
                src={stationPhoto}
                alt={popupStation.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-2 px-1.5 py-0.2 rounded bg-black/60 backdrop-blur-xs text-[9px] font-mono text-white flex items-center gap-1">
                <span>เครื่อง: {popupStation.device?.code || 'Node'}</span>
              </div>
            </div>

            {/* Parameters Table (แบบ waterroom.pro) */}
            <div className="p-2.5 sm:p-3 space-y-2 overflow-y-auto">
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="text-slate-600 font-medium">สารหนู (As):</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono font-bold ${asColorClass}`}>
                      {latestAs !== null ? `${latestAs} µg/L` : '-'}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white border border-slate-200 text-slate-500">
                      {asBadgeText}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="text-slate-600 font-medium">ค่า pH:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {latestPh !== null ? `${latestPh} pH` : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="text-slate-600 font-medium">ความขุ่น:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {latestTurbidity !== null ? `${latestTurbidity} NTU` : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-50 border border-slate-100/80">
                  <span className="text-slate-600 font-medium">อุณหภูมิน้ำ:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {latestTemp !== null ? `${latestTemp} °C` : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                  <span className="text-slate-600 font-medium">พิกัดเครื่อง:</span>
                  <span className="font-mono font-bold text-slate-700 text-[10px]">
                    {popupStation.coordinates ? `${popupStation.coordinates[1].toFixed(5)}, ${popupStation.coordinates[0].toFixed(5)}` : '-'}
                  </span>
                </div>
              </div>

              {/* Trend Section (แสดงแนวโน้มสารหนูพร้อม Sparkline) */}
              <div className="bg-[#F8F7F5] rounded-xl p-2.5 border border-slate-200/80">
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="flex items-center gap-1 text-slate-700">
                    <TrendingUp className="w-3.5 h-3.5 text-[#A6192E]" />
                    <span>แนวโน้มสารหนู (Trend)</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] border font-bold ${trendColorClass}`}>
                    {trendText}
                  </span>
                </div>
                <div className="pt-0.5">
                  {renderSparkline(trendData)}
                </div>
              </div>

              {/* Action Buttons: แก้ไขพิกัด และ เปิดดูรายละเอียด */}
              <div className="flex items-center gap-1.5">
                {onEditStation && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = popupStation;
                      updatePopupStation(null);
                      onEditStation(target);
                    }}
                    className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                    title="แก้ไขพิกัดและข้อมูลของเครื่องนี้"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>แก้ไขพิกัด</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = popupStation;
                    updatePopupStation(null);
                    if (onSelectStation) {
                      onSelectStation(target);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>เปิดดูรายละเอียด</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Speech Bubble Pointer */}
            {isFlippedBelow ? (
              <div 
                className="absolute -top-2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow-xs -translate-x-1/2"
                style={{ left: `calc(50% + ${pointerOffset}px)` }}
              />
            ) : (
              <div 
                className="absolute -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-xs -translate-x-1/2"
                style={{ left: `calc(50% + ${pointerOffset}px)` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Floating Banner สำหรับโหมดจิ้มเลือกพิกัดบนแผนที่ */}
      {isPickingCoordinates && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 max-w-[92vw] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block">📍 คลิกบนแผนที่เพื่อเลือกพิกัดจุดตั้งเครื่อง</span>
            <span className="text-[11px] text-slate-300 font-mono">
              {pickedCoords 
                ? `พิกัดที่เลือก: ${Number(pickedCoords[1]).toFixed(5)}, ${Number(pickedCoords[0]).toFixed(5)}`
                : 'คลิกบริเวณแนวลำน้ำกกหรือตลิ่งที่ต้องการวางเครื่องดูดน้ำหรือเครื่องตรวจวัด'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {pickedCoords && onConfirmPick && (
              <button
                type="button"
                onClick={onConfirmPick}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                ยืนยันพิกัดนี้
              </button>
            )}
            {onCancelPick && (
              <button
                type="button"
                onClick={onCancelPick}
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
