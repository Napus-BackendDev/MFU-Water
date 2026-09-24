import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { KOK_RIVER_LINE, generateFloodPolygon } from '../data/kokRiverGeoJSON';
import { LANDMARKS } from '../data/landmarks';

export default function MapView3D({
  waterLevel,
  activeLayer,
  terrainEnabled,
  selectedLandmark,
  onSelectLandmark,
  cameraTrigger,
  showLandmarks = true,
  showRiver = true,
  riskInfo
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cameraState, setCameraState] = useState({
    pitch: 58,
    bearing: -15,
    zoom: 11.5
  });

  // Initial Map Setup
  useEffect(() => {
    if (mapRef.current) return;

    const initialStyle = {
      version: 8,
      sources: {
        terrainSource: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15
        },
        esriSatellite: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Esri, Maxar, Earthstar Geographics'
        },
        esriTopo: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Esri, USGS'
        },
        osmStreet: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esriSatellite',
          layout: { visibility: 'visible' },
          minzoom: 0,
          maxzoom: 20
        },
        {
          id: 'topo-layer',
          type: 'raster',
          source: 'esriTopo',
          layout: { visibility: 'none' },
          minzoom: 0,
          maxzoom: 20
        },
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osmStreet',
          layout: { visibility: 'none' },
          minzoom: 0,
          maxzoom: 20
        },
        {
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'terrainSource',
          layout: { visibility: 'visible' },
          paint: {
            'hillshade-shadow-color': '#020617',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#0284c7',
            'hillshade-exaggeration': 0.65
          }
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: [99.8450, 19.9800], // ศูนย์กลางระหว่าง มฟล. และแม่น้ำกก
      zoom: 11.5,
      pitch: 58,
      bearing: -15,
      maxPitch: 85,
      canvasContextAttributes: { antialias: true }
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
      showCompass: true,
      showZoom: true
    }), 'top-right');

    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 140,
      unit: 'metric'
    }), 'bottom-right');

    map.on('load', () => {
      // 1. ตั้งค่า 3D Terrain
      map.setTerrain({
        source: 'terrainSource',
        exaggeration: 1.55 // เสริมความสูงภูเขาดอยเชียงรายให้เด่นชัด
      });

      // 2. ตั้งค่าบรรยากาศ Sky / Atmosphere
      map.setSky({
        'sky-color': '#0ea5e9',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#e0f2fe',
        'horizon-fog-blend': 0.8,
        'fog-color': '#0f172a',
        'fog-ground-blend': 0.7
      });

      // 3. เพิ่มเลเยอร์สายน้ำแม่น้ำกก
      map.addSource('riverSource', {
        type: 'geojson',
        data: KOK_RIVER_LINE
      });

      map.addLayer({
        id: 'river-glow',
        type: 'line',
        source: 'riverSource',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 4,
            14, 12,
            18, 24
          ],
          'line-blur': 3,
          'line-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'river-core',
        type: 'line',
        source: 'riverSource',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': '#0284c7',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 2,
            14, 7,
            18, 16
          ],
          'line-opacity': 0.95
        }
      });

      // 4. เพิ่มเลเยอร์พื้นที่จำลองน้ำท่วม (Flood Simulation Polygons)
      map.addSource('floodSource', {
        type: 'geojson',
        data: generateFloodPolygon(waterLevel)
      });

      map.addLayer({
        id: 'flood-fill-layer',
        type: 'fill',
        source: 'floodSource',
        paint: {
          'fill-color': riskInfo?.color || '#0ea5e9',
          'fill-opacity': 0.65
        }
      });

      map.addLayer({
        id: 'flood-outline-layer',
        type: 'line',
        source: 'floodSource',
        paint: {
          'line-color': '#bae6fd',
          'line-width': 2.5,
          'line-dasharray': [2, 1]
        }
      });

      setMapLoaded(true);
    });

    map.on('rotate', () => {
      setCameraState(prev => ({
        ...prev,
        bearing: Math.round(map.getBearing()),
        pitch: Math.round(map.getPitch()),
        zoom: Number(map.getZoom().toFixed(1))
      }));
    });

    map.on('pitch', () => {
      setCameraState(prev => ({
        ...prev,
        pitch: Math.round(map.getPitch())
      }));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Layer Switcher (Satellite / Topo / Street)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const layers = {
      satellite: 'satellite-layer',
      topo: 'topo-layer',
      street: 'osm-layer'
    };

    Object.entries(layers).forEach(([key, layerId]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          key === activeLayer ? 'visible' : 'none'
        );
      }
    });
  }, [activeLayer, mapLoaded]);

  // Update 3D Terrain on/off
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (terrainEnabled) {
      map.setTerrain({
        source: 'terrainSource',
        exaggeration: 1.55
      });
      if (map.getLayer('hillshade-layer')) {
        map.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
      }
    } else {
      map.setTerrain(null);
      if (map.getLayer('hillshade-layer')) {
        map.setLayoutProperty('hillshade-layer', 'visibility', 'none');
      }
    }
  }, [terrainEnabled, mapLoaded]);

  // Update Flood Simulation Water Level
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const floodSource = map.getSource('floodSource');

    if (floodSource) {
      floodSource.setData(generateFloodPolygon(waterLevel));
    }

    if (map.getLayer('flood-fill-layer')) {
      const color = riskInfo?.color || '#0ea5e9';
      map.setPaintProperty('flood-fill-layer', 'fill-color', color);
      // ความโปร่งแสงปรับตามระดับน้ำ
      const opacity = Math.min(0.85, 0.45 + (waterLevel / 8) * 0.4);
      map.setPaintProperty('flood-fill-layer', 'fill-opacity', opacity);
    }
  }, [waterLevel, riskInfo, mapLoaded]);

  // Toggle River visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const visibility = showRiver ? 'visible' : 'none';

    if (map.getLayer('river-glow')) {
      map.setLayoutProperty('river-glow', 'visibility', visibility);
    }
    if (map.getLayer('river-core')) {
      map.setLayoutProperty('river-core', 'visibility', visibility);
    }
  }, [showRiver, mapLoaded]);

  // Handle Landmarks Markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!showLandmarks) return;

    LANDMARKS.forEach(landmark => {
      // Create custom HTML marker element
      const el = document.createElement('div');
      el.className = 'group cursor-pointer transform transition-all duration-300 hover:scale-110';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full animate-ping opacity-30" style="background-color: ${landmark.iconColor};"></div>
          <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white/90 text-white font-bold text-xs" style="background-color: ${landmark.iconColor};">
            ${landmark.category === 'education' ? '🎓' : landmark.category === 'critical_bridge' ? '🌉' : landmark.category === 'infrastructure' ? '⚡' : landmark.category === 'recreation' ? '🏖️' : '📍'}
          </div>
          <div class="absolute -top-7 whitespace-nowrap bg-slate-900/90 text-slate-100 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-700/80 shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            ${landmark.name}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectLandmark(landmark);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(landmark.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [showLandmarks, mapLoaded, onSelectLandmark]);

  // Handle Camera Fly-to Trigger
  useEffect(() => {
    if (!mapRef.current || !cameraTrigger) return;
    const map = mapRef.current;

    map.flyTo({
      center: cameraTrigger.center,
      zoom: cameraTrigger.zoom,
      pitch: cameraTrigger.pitch,
      bearing: cameraTrigger.bearing,
      essential: true,
      duration: 2500,
      curve: 1.42
    });
  }, [cameraTrigger]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating 3D Navigation Status HUD */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel-subtle px-3 py-1.5 rounded-lg text-xs flex items-center gap-3 text-slate-300">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          3D Engine Active
        </span>
        <span className="border-l border-slate-700 pl-2">
          Pitch: <strong className="text-sky-400">{cameraState.pitch}°</strong>
        </span>
        <span className="border-l border-slate-700 pl-2">
          Bearing: <strong className="text-sky-400">{cameraState.bearing}°</strong>
        </span>
        <span className="border-l border-slate-700 pl-2">
          Zoom: <strong className="text-sky-400">{cameraState.zoom}</strong>
        </span>
        <span className="border-l border-slate-700 pl-2 text-slate-400 hidden sm:inline">
          💡 คลิกขวา/Ctrl + ลากเมาส์ เพื่อหมุนและปรับมุมเอียง 3D
        </span>
      </div>
    </div>
  );
}
