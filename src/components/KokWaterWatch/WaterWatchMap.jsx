import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { WATER_WATCH_STATIONS } from '../../data/waterWatchData';

export default function WaterWatchMap({
  submissions = [],
  selectedSample = null,
  onSelectSample = null,
  selectedStation = null,
  onSelectStation = null,
  focusCoords = null
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectStation) {
          onSelectStation(st);
        }
        map.flyTo({ center: st.coordinates, zoom: 15.2, duration: 750 });
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

  return (
    <div className="relative w-full h-full bg-[#F8F7F5]">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
