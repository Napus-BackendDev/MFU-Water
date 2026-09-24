import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  THATON_CENTER,
  THATON_BOUNDS,
  THATON_COMMUNITIES,
  getFloodPolygonGeoJSON,
  getDioramaMaskGeoJSON,
  getDioramaFrameGeoJSON
} from '../data/thatonFloodData';
import {
  getSentinelZonesGeoJSON,
  getSentinelCommunityCircleGeoJSON
} from '../data/sentinelFloodAnalysisData';

export default function MapView2D({
  selectedLocation = null,
  onSelectLocation,
  floodStage = 0, // 0 to 100
  is3DMode = false,
  activeZone = null,
  activeCommunity = null,
  waterColorMode = 'standard', // 'standard' | 'mndwi'
  comparisonBlend = 0, // 0 to 100
  showMndwiWater = true
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. เริ่มต้น MapLibre แบบจำลองสี่เหลี่ยม 3 มิติ (3D Architectural Diorama)
  useEffect(() => {
    if (mapRef.current) return;

    const styleDefinition = {
      version: 8,
      sources: {
        // 3D Terrain DEM (Digital Elevation Model): ความสูงจริงของขุนเขาและหุบเขาแม่น้ำกก
        terrainSource: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15
        },
        // Google Pure Satellite: ภาพถ่ายดาวเทียมคมชัดระดับสูง (คลีน 100% ไร้หมุดร้านค้า ไร้ข้อความรบกวนสายตา)
        googleSatellite: {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          ],
          tileSize: 256,
          attribution: 'Google Satellite (Pure Imagery)'
        }
      },
      layers: [
        {
          id: 'background-white',
          type: 'background',
          paint: { 'background-color': '#080c14' }
        },
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'googleSatellite',
          layout: { visibility: 'visible' },
          minzoom: 0,
          maxzoom: 20
        },
        {
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'terrainSource',
          layout: { visibility: 'none' }
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleDefinition,
      center: THATON_CENTER,
      zoom: 14.2,
      minZoom: 12.8,
      maxZoom: 17.5,
      // ล็อกขอบเขตให้อยู่เฉพาะโมเดล ต.ท่าตอน - บ้านท่าดอย และแนวข้างสายน้ำกก
      maxBounds: [
        [99.315, 20.015],
        [99.435, 20.105]
      ],
      pitch: is3DMode ? 42 : 0, // เริ่มต้น 2D แบนราบ (0 องศา) หรือ 3D (42 องศา)
      bearing: is3DMode ? 15 : 0,
      maxPitch: 80,
      dragRotate: true,
      touchPitch: true,
      pitchWithRotate: true
    });

    map.on('error', (e) => {
      console.warn('MapLibre event:', e?.error?.message || e);
    });


    map.on('load', () => {
      // 1. ตั้งค่า 3D Terrain สมจริง (Realistic Mountain Ridges & Valley Relief)
      if (is3DMode) {
        map.setTerrain({
          source: 'terrainSource',
          exaggeration: 1.25 // จำลองภูมิประเทศเว้าโค้ง ขุนเขา สันเขา และหุบเขาแม่น้ำกกให้สมจริง
        });
      }

      // 2. บรรยากาศสตูดิโอโมเดล 3D แบบคลีน สบายตา
      map.setSky({
        'sky-color': '#080c14',
        'sky-horizon-blend': 0.8,
        'horizon-color': '#0f172a',
        'horizon-fog-blend': 0.1,
        'fog-color': '#080c14',
        'fog-ground-blend': 0.0
      });

      // 3. ภาพถ่ายดาวเทียมความละเอียดสูง Sentinel-2 MSI ครอบคลุม 100% เต็มกรอบโมเดล 3D ต.ท่าตอน - บ้านท่าดอย
      // พิกัด 4 มุมสอดคล้องกับ THATON_BOUNDS ทุกประการ ทำให้ภาพจรดกรอบโมเดล ไม่มีรอยต่อสี่เหลี่ยมปะติดปะต่อตรงกลาง
      const dioramaFullCoords = [
        [99.346, 20.084], // NW (ทิศตะวันตกเฉียงเหนือ)
        [99.408, 20.084], // NE (ทิศตะวันออกเฉียงเหนือ)
        [99.408, 20.038], // SE (ทิศตะวันออกเฉียงใต้)
        [99.346, 20.038]  // SW (ทิศตะวันตกเฉียงใต้)
      ];

      // 3.1 ภาพก่อนน้ำท่วม (5 ก.ย. 2567) Sentinel-2 เต็มพื้นที่โมเดล 3D
      map.addSource('sentinelBeforeSource', {
        type: 'image',
        url: '/assets/diorama_before_full.jpg',
        coordinates: dioramaFullCoords
      });

      map.addLayer({
        id: 'sentinel-before-layer',
        type: 'raster',
        source: 'sentinelBeforeSource',
        paint: {
          'raster-opacity': 1.0, // ฐานคงที่ 100% เพื่อความสม่ำเสมอของสี (Uniform Constant Luminance)
          'raster-fade-duration': 0
        }
      });

      // 3.2 ภาพหลังน้ำท่วมสูงสุด (15 ก.ย. 2567) Sentinel-2 เต็มพื้นที่โมเดล 3D
      map.addSource('sentinelAfterSource', {
        type: 'image',
        url: '/assets/diorama_after_full.jpg',
        coordinates: dioramaFullCoords
      });

      map.addLayer({
        id: 'sentinel-after-layer',
        type: 'raster',
        source: 'sentinelAfterSource',
        paint: {
          'raster-opacity': comparisonBlend / 100, // เฟดซ้อนทับภาพฐานอย่างเรียบเนียน ไร้การกระพริบ ไร้รอยต่อ
          'raster-fade-duration': 0
        }
      });

      // 4. เลเยอร์ขอบเขตผืนน้ำท่วมจริง (Smooth Anti-Aliased Flood Polygon)
      map.addSource('floodInundationSource', {
        type: 'geojson',
        data: getFloodPolygonGeoJSON(floodStage)
      });

      map.addLayer({
        id: 'flood-inundation-fill',
        type: 'fill',
        source: 'floodInundationSource',
        paint: {
          'fill-color': '#f97316',
          'fill-opacity': (showMndwiWater || waterColorMode === 'mndwi') ? (comparisonBlend > 10 ? 0.65 : 0.35) : 0
        }
      });

      // 4. หน้ากากตัดเฉพาะสี่เหลี่ยมโมเดล (Inverted Diorama Mask): ปิดบังทั้งโลกภายนอกกรอบสี่เหลี่ยมทั้งหมด
      map.addSource('dioramaMaskSource', {
        type: 'geojson',
        data: getDioramaMaskGeoJSON()
      });

      map.addLayer({
        id: 'diorama-mask-layer',
        type: 'fill',
        source: 'dioramaMaskSource',
        paint: {
          'fill-color': '#080c14',
          'fill-opacity': 1.0
        }
      });

      // 5. เส้นกรอบขอบโมเดลสี่เหลี่ยม 3 มิติ (Diorama Showcase Frame)
      map.addSource('dioramaFrameSource', {
        type: 'geojson',
        data: getDioramaFrameGeoJSON()
      });

      // เส้นเรืองแสงกรอบโมเดล (Outer Glow)
      map.addLayer({
        id: 'diorama-frame-glow',
        type: 'line',
        source: 'dioramaFrameSource',
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 7,
          'line-opacity': 0.45,
          'line-blur': 4
        }
      });

      // เส้นกรอบโมเดลคมชัด (Crisp Architectural Frame)
      map.addLayer({
        id: 'diorama-frame-line',
        type: 'line',
        source: 'dioramaFrameSource',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2.5,
          'line-opacity': 0.95
        }
      });

      // 6. เลเยอร์แสดงขอบเขตโซน Z1 - Z4 (ถอดแบบจาก Google Earth Engine)
      map.addSource('sentinelZonesSource', {
        type: 'geojson',
        data: getSentinelZonesGeoJSON(activeZone)
      });

      map.addLayer({
        id: 'sentinel-zones-fill',
        type: 'fill',
        source: 'sentinelZonesSource',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#0284c7',
            '#ffffff'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            0.15,
            0.02
          ]
        }
      });

      map.addLayer({
        id: 'sentinel-zones-line',
        type: 'line',
        source: 'sentinelZonesSource',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#38bdf8',
            '#64748b'
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            2.5,
            1.0
          ],
          'line-dasharray': [4, 3],
          'line-opacity': 0.80
        }
      });

      // 7. เลเยอร์แสดงวงรัศมี 500 เมตร รอบจุดชุมชน (ม.2, ม.3, ม.4)
      map.addSource('sentinelCommunitiesSource', {
        type: 'geojson',
        data: getSentinelCommunityCircleGeoJSON(activeCommunity)
      });

      map.addLayer({
        id: 'sentinel-community-fill',
        type: 'fill',
        source: 'sentinelCommunitiesSource',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.15
        }
      });

      map.addLayer({
        id: 'sentinel-community-line',
        type: 'line',
        source: 'sentinelCommunitiesSource',
        paint: {
          'line-color': '#10b981',
          'line-width': 2.5,
          'line-dasharray': [6, 4],
          'line-opacity': 0.95
        }
      });

      setMapLoaded(true);
    });

    mapRef.current = map;
    window.map = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // อัปเดตขอบเขตผืนน้ำท่วมตาม floodStage และ waterColorMode
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const waterSource = map.getSource('floodInundationSource');
    if (waterSource) {
      waterSource.setData(getFloodPolygonGeoJSON(floodStage));
    }

    if (map.getLayer('flood-inundation-fill')) {
      const showOverlay = showMndwiWater || waterColorMode === 'mndwi';
      const opacity = showOverlay ? (floodStage === 0 ? 0.35 : 0.65) : 0;
      map.setPaintProperty('flood-inundation-fill', 'fill-color', '#f97316');
      map.setPaintProperty('flood-inundation-fill', 'fill-opacity', opacity);
    }
  }, [floodStage, waterColorMode, showMndwiWater, mapLoaded]);

  // อัปเดตเลเยอร์โซนและรัศมีชุมชนตาม activeZone และ activeCommunity
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const zonesSource = map.getSource('sentinelZonesSource');
    if (zonesSource) {
      zonesSource.setData(getSentinelZonesGeoJSON(activeZone));
    }

    const comSource = map.getSource('sentinelCommunitiesSource');
    if (comSource) {
      comSource.setData(getSentinelCommunityCircleGeoJSON(activeCommunity));
    }
  }, [activeZone, activeCommunity, mapLoaded]);

  // ปรับความโปร่งใสผสมภาพดาวเทียมจริง ก่อน (5 ก.ย.) ↔ หลัง (15 ก.ย. 67) แบบคงที่สม่ำเสมอทั่วทั้งโมเดล
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const afterOpacity = Math.max(0, Math.min(1, comparisonBlend / 100));

    if (map.getLayer('sentinel-before-layer')) {
      map.setPaintProperty('sentinel-before-layer', 'raster-opacity', 1.0);
    }

    if (map.getLayer('sentinel-after-layer')) {
      map.setPaintProperty('sentinel-after-layer', 'raster-opacity', afterOpacity);
    }
  }, [comparisonBlend, mapLoaded]);

  // ควบคุมการแสดงผลเลเยอร์ตรวจจับน้ำท่วม GEE (MNDWI)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (map.getLayer('flood-inundation-fill')) {
      const showOverlay = showMndwiWater || waterColorMode === 'mndwi';
      const targetOpacity = showOverlay ? (comparisonBlend > 10 ? 0.65 : 0.35) : 0;
      map.setPaintProperty('flood-inundation-fill', 'fill-opacity', targetOpacity);
    }
  }, [showMndwiWater, waterColorMode, comparisonBlend, mapLoaded]);

  // ควบคุมมุมมอง 3D Perspective และ 3D Terrain
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (is3DMode) {
      map.setTerrain({
        source: 'terrainSource',
        exaggeration: 1.25 // เว้า โค้ง สันเขาและหุบเขาแม่น้ำกกสมจริง
      });
      map.flyTo({
        center: THATON_CENTER,
        zoom: 14.4,
        pitch: 40,
        bearing: 15,
        duration: 1200,
        essential: true
      });
    } else {
      map.setTerrain(null);
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
        essential: true
      });
    }
  }, [is3DMode, mapLoaded]);

  // แสดงหมุดสถานที่สำคัญและชุมชน ต.ท่าตอน / บ้านท่าดอย
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    THATON_COMMUNITIES.forEach(com => {
      const isSelected = selectedLocation?.id === com.id;

      let icon = '📍';
      let iconColor = '#0284c7';
      if (com.id === 'wat-thaton') {
        icon = '🛕';
        iconColor = '#f59e0b';
      } else if (com.id === 'thaton-bridge') {
        icon = '🌉';
        iconColor = '#6366f1';
      } else if (com.id === 'thadoi-village') {
        icon = '🏡';
        iconColor = '#0d9488';
      } else if (com.id === 'thaton-village') {
        icon = '🏘️';
        iconColor = '#0284c7';
      }

      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.zIndex = isSelected ? '50' : '30';

      el.innerHTML = `
        <div class="flex flex-col items-center transform transition-transform duration-150 ${
          isSelected ? 'scale-115' : 'hover:scale-110'
        }">
          <!-- ป้ายชื่อสถานที่ -->
          <div class="px-2.5 py-1 mb-1 rounded-lg text-xs font-bold shadow-md border whitespace-nowrap transition-all duration-150 ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-sky-400'
              : 'bg-white/95 text-slate-800 border-slate-300 group-hover:border-sky-500 group-hover:bg-sky-50'
          }">
            ${com.name}
          </div>

          <!-- หมุดไอคอน 3 มิติ -->
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs transition-all ${
            isSelected ? 'ring-2 ring-sky-400 scale-125' : ''
          }" style="background-color: ${iconColor}">
            ${icon}
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectLocation) onSelectLocation(com);

        const cam = com.camera || {
          center: com.coordinates,
          zoom: 16.0,
          pitch: is3DMode ? 42 : 0,
          bearing: is3DMode ? 25 : 0
        };

        map.flyTo({
          ...cam,
          pitch: is3DMode ? (cam.pitch ?? 42) : 0,
          bearing: is3DMode ? (cam.bearing ?? 0) : 0,
          duration: 1200,
          essential: true
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(com.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [selectedLocation, mapLoaded, onSelectLocation, is3DMode]);

  // เลื่อนมุมมองเมื่อมีการเลือกสถานที่จากภายนอก
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedLocation) return;
    const map = mapRef.current;
    const cam = selectedLocation.camera || {
      center: selectedLocation.coordinates,
      zoom: 16.0,
      pitch: is3DMode ? 42 : 0,
      bearing: is3DMode ? 25 : 0
    };
    map.flyTo({
      ...cam,
      pitch: is3DMode ? (cam.pitch ?? 42) : 0,
      bearing: is3DMode ? (cam.bearing ?? 0) : 0,
      duration: 1200,
      essential: true
    });
  }, [selectedLocation?.id, mapLoaded, is3DMode]);

  return (
    <div className="relative w-full h-full bg-[#080c14] overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
