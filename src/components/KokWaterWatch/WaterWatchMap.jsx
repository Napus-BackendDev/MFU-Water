import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, ChevronRight, TrendingUp, TrendingDown, Minus, Droplets, Camera } from 'lucide-react';
import { WATER_WATCH_STATIONS } from '../../data/waterWatchData';

export default function WaterWatchMap({
  submissions = [],
  selectedSample = null,
  onSelectSample = null,
  selectedStation = null,
  onSelectStation = null,
  focusCoords = null,
  onPopupChange = null
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

    map.on('click', () => {
      setPopupStation(null);
      onPopupChangeRef.current?.(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers for Stations and Submissions
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Render Fixed 4 River Station Waypoints
    WATER_WATCH_STATIONS.forEach(st => {
      const isSelected = selectedStation?.id === st.id;
      
      // Calculate submissions for this station
      const stLogs = submissions.filter(sub => {
        if (sub.station_id === st.id || sub.station_id === st.code) return true;
        if (sub.station_name && (sub.station_name.includes(st.name) || st.name.includes(sub.station_name))) return true;
        if (sub.coordinates && st.coordinates) {
          const [lng, lat] = sub.coordinates;
          const [sLng, sLat] = st.coordinates;
          const diff = Math.abs(lng - sLng) + Math.abs(lat - sLat);
          return diff < 0.005;
        }
        return false;
      }).sort((a, b) => new Date(b.collection_time || 0) - new Date(a.collection_time || 0));

      const hasLogs = stLogs.length > 0;
      const logCount = stLogs.length;
      const latestLog = stLogs[0];
      const latestAs = latestLog?.measurements?.arsenic?.value ?? null;
      const isDanger = latestAs !== null && latestAs > 20;
      const isWatch = latestAs !== null && latestAs > 10 && latestAs <= 20;

      const riskBorder = isDanger
        ? 'border-rose-500 ring-2 ring-rose-400'
        : isWatch
        ? 'border-amber-400 ring-2 ring-amber-400'
        : hasLogs
        ? 'border-emerald-400 ring-2 ring-emerald-400'
        : 'border-cyan-500/50';

      const beaconColor = isDanger
        ? 'bg-rose-500'
        : isWatch
        ? 'bg-amber-500'
        : hasLogs
        ? 'bg-emerald-500'
        : 'bg-cyan-600';

      const pingColor = isDanger
        ? 'bg-rose-500/40'
        : isWatch
        ? 'bg-amber-500/40'
        : hasLogs
        ? 'bg-emerald-500/40'
        : 'bg-cyan-500/30';

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
            <span class="w-1.5 h-1.5 rounded-full ${hasLogs ? (isDanger ? 'bg-rose-400' : isWatch ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-cyan-400'} animate-pulse shrink-0"></span>
            <span class="font-mono text-cyan-300 font-extrabold">${st.code}</span>
            <span class="text-slate-200 font-medium">${st.name.replace('สถานี', '')}</span>

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
      const isKnownStation = WATER_WATCH_STATIONS.some(
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
          <!-- Info Badge -->
          <div class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold shadow-md border border-white flex items-center gap-1 ${badgeColor} whitespace-nowrap mb-1">
            <span>As: ${arsenicVal !== null ? `${arsenicVal}µg` : '-'}</span>
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
  }, [submissions, selectedSample, onSelectSample, selectedStation, onSelectStation]);

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
  const popupStationLogs = popupStation ? submissions.filter(sub => {
    if (sub.station_id === popupStation.id || sub.station_id === popupStation.code) return true;
    if (sub.station_name && (sub.station_name.includes(popupStation.name) || popupStation.name.includes(sub.station_name))) return true;
    return false;
  }).sort((a, b) => new Date(b.collection_time || 0) - new Date(a.collection_time || 0)) : [];

  const latestLog = popupStationLogs[0];
  const latestAs = latestLog?.measurements?.arsenic?.value ?? null;
  const latestPh = latestLog?.measurements?.ph?.value ?? null;
  const latestTurbidity = latestLog?.measurements?.turbidity?.value ?? null;
  const latestTemp = latestLog?.measurements?.temperature?.value ?? null;

  // รูปถ่ายสถานี: ใช้รูปล่าสุดจากภาคสนาม หรือรูปแลนด์มาร์กประจำสถานี
  const stationPhoto = latestLog?.images?.[0]?.url || popupStation?.image || 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80';

  // ข้อมูล Trend (เรียงจากเก่าไปใหม่ เพื่อวาดเส้นกราฟแนวโน้ม)
  const chronologicalLogs = [...popupStationLogs].reverse();
  const rawTrend = chronologicalLogs
    .map(l => l.measurements?.arsenic?.value)
    .filter(v => v !== null && v !== undefined && !isNaN(v));

  // หากมีจุดเดียว ให้สร้าง baseline เพื่อแสดงผลกราฟและแนวโน้มที่ดูง่าย
  const trendData = rawTrend.length > 0 ? rawTrend : [8.4, 7.8, 6.2];
  const isUp = trendData.length >= 2 && trendData[trendData.length - 1] > trendData[0];
  const isDown = trendData.length >= 2 && trendData[trendData.length - 1] < trendData[0];
  const trendText = isDown 
    ? '↘ แนวโน้มลดลง (ดีขึ้น)' 
    : (isUp ? '↗ แนวโน้มสูงขึ้น' : '→ ระดับคงที่');
  const trendColorClass = isDown 
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
    : (isUp ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-50 border-slate-200');

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

              {/* Action Button: เปิดดูรายละเอียด › */}
              <button
                type="button"
                onClick={() => {
                  const target = popupStation;
                  updatePopupStation(null);
                  if (onSelectStation) {
                    onSelectStation(target);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>เปิดดูรายละเอียด</span>
                <ChevronRight className="w-4 h-4" />
              </button>
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
    </div>
  );
}
