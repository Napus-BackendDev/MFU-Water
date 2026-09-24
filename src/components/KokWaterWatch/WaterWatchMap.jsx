import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
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
  ZoomIn,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Minus,
  Home,
  Landmark,
  Building2,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { clusterSubmissions } from '../../data/waterWatchData';
import PPBTrendChart from './PPBTrendChart';

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

export default function WaterWatchMap({
  submissions = [],
  selectedSample = null,
  onSelectSample = null,
  selectedHotspot = null,
  onSelectHotspot = null,
  focusCoords = null,
  onPopupChange = null,
  controllerRef = null,
  hideDefaultControls = false
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // โหมดแสดงผลแผนที่: ค่าเริ่มต้นเป็น 'satellite' (พื้นที่ดาวเทียม) และ ซ่อนตัวอักษร (showLabels = false)
  const [mapType, setMapType] = useState(() => {
    try {
      return localStorage.getItem('kok_water_watch_map_type') || 'satellite';
    } catch {
      return 'satellite';
    }
  });
  const [showLabels, setShowLabels] = useState(() => {
    try {
      const saved = localStorage.getItem('kok_water_watch_show_labels');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
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
    try {
      const saved = localStorage.getItem('kok_water_watch_show_boundary_labels');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kok_water_watch_show_boundary_labels', String(showBoundaryLabels));
    } catch {}
  }, [showBoundaryLabels]);

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
      shortLabel: 'อำเภอ',
      fullLabel: 'Locality (อำเภอ / เขต / เมือง)',
      desc: 'ขอบเขตของเทศบาล เมือง หรือเขตอำเภอ',
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
    try {
      localStorage.setItem('kok_boundary_filters', JSON.stringify(boundaryFilters));
    } catch {}
  }, [boundaryFilters]);

  const applyBoundaryVisibility = (filters) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const setVisibility = (layerId, isVisible) => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        }
      } catch (err) {
        console.warn('Failed to set boundary visibility:', layerId, err);
      }
    };

    setVisibility('bnd-country-layer', !!filters.country);
    setVisibility('bnd-country-labels', !!filters.country && showBoundaryLabels);
    setVisibility('bnd-province-layer', !!filters.province);
    setVisibility('bnd-province-labels', !!filters.province && showBoundaryLabels);
    setVisibility('bnd-locality-fill', !!filters.locality);
    setVisibility('bnd-locality-layer', !!filters.locality);
    setVisibility('bnd-locality-labels', !!filters.locality && showBoundaryLabels);
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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    showLocationStatus('loading', 'กำลังค้นหาตำแหน่งของเครื่อง / อุปกรณ์ของคุณ...', 0);

    // วางหมุดตำแหน่งอุปกรณ์และวาดรัศมีความแม่นยำลงบนแผนที่
    const placeUserLocationMarker = (longitude, latitude, accuracy, isEstimated = false) => {
      setIsLocating(false);

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

      // หมุดพิกัดที่ตั้งปัจจุบันของอุปกรณ์
      const el = document.createElement('div');
      el.className = 'current-location-marker relative flex items-center justify-center cursor-pointer select-none';
      el.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-sky-500/35 animate-ping absolute pointer-events-none"></div>
        <div class="w-6 h-6 rounded-full bg-sky-600 border-2 border-white shadow-2xl flex items-center justify-center relative z-10 transition-transform hover:scale-115">
          <div class="w-2.5 h-2.5 rounded-full bg-white shadow-xs"></div>
        </div>
      `;

      const popupContent = `
        <div class="p-2 font-['Prompt',sans-serif] text-xs text-slate-800 space-y-1.5 min-w-[190px]">
          <div class="flex items-center gap-1.5 font-bold text-sky-800 text-sm">
            <span>📍</span>
            <span>ตำแหน่งอุปกรณ์ของคุณ</span>
          </div>
          <div class="text-[11px] font-mono text-slate-700 bg-sky-50/90 px-2 py-1 rounded-md border border-sky-200">
            พิกัด: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
          </div>
          <div class="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
            <span>ความแม่นยำ:</span>
            <span class="font-bold text-sky-700 font-mono">±${Math.round(accuracy || 10)} เมตร</span>
          </div>
          ${isEstimated ? '<div class="text-[9px] text-amber-600 font-medium pt-0.5 leading-tight">* ตำแหน่งประมาณการจากเครือข่ายอินเทอร์เน็ต</div>' : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({ 
        offset: 16, 
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);

      userLocationMarkerRef.current = marker;
      marker.togglePopup(); // เปิดแสดงป๊อปอัปพิกัดทันที

      map.flyTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 15),
        pitch: 0,
        essential: true,
        duration: 1200
      });

      showLocationStatus(
        'success', 
        `พบตำแหน่งอุปกรณ์ของคุณแล้ว (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) ความแม่นยำ ±${Math.round(accuracy || 10)}ม.`, 
        4500
      );
    };

    // Fallback: ดึงตำแหน่งจาก IP ในกรณีเครื่องไม่มีฮาร์ดแวร์ GPS หรือบล็อกสิทธิ์
    const tryIPFallback = async () => {
      try {
        showLocationStatus('loading', 'กำลังค้นหาตำแหน่งอุปกรณ์ผ่านเครือข่ายอินเทอร์เน็ต...', 0);
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

  // Initialize Map with Google Street & Google Satellite Hybrid tiles
  useEffect(() => {
    if (mapRef.current) return;

    const styleDefinition = {
      version: 8,
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
        }
      },
      layers: [
        {
          id: 'background-base',
          type: 'background',
          paint: { 'background-color': '#0f172a' }
        },
        {
          id: 'google-street-layer',
          type: 'raster',
          source: 'googleStreet',
          minzoom: 0,
          maxzoom: 21,
          layout: { visibility: 'none' }
        },
        {
          id: 'google-satellite-layer',
          type: 'raster',
          source: 'googleSatellite',
          minzoom: 0,
          maxzoom: 21,
          layout: { visibility: 'none' }
        },
        {
          id: 'google-street-no-labels-layer',
          type: 'raster',
          source: 'googleStreetNoLabels',
          minzoom: 0,
          maxzoom: 21,
          layout: { visibility: 'none' }
        },
        {
          id: 'google-satellite-no-labels-layer',
          type: 'raster',
          source: 'googleSatelliteNoLabels',
          minzoom: 0,
          maxzoom: 21,
          layout: { visibility: 'visible' }
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleDefinition,
      center: [99.3800, 20.0550], // แม่น้ำกก ท่าตอน - หมอกจ๋าม
      zoom: 13.2,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      const curFilters = boundaryFiltersRef.current || {};

      // 1. เส้นพรมแดนประเทศ (Country)
      map.addSource('bnd-country-src', {
        type: 'geojson',
        data: '/data/boundaries/thailand-adm0.geojson'
      });
      map.addLayer({
        id: 'bnd-country-layer',
        type: 'line',
        source: 'bnd-country-src',
        layout: {
          visibility: curFilters.country ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-dasharray': [3, 2]
        }
      });
      map.addLayer({
        id: 'bnd-country-labels',
        type: 'symbol',
        source: 'bnd-country-src',
        layout: {
          visibility: curFilters.country && showBoundaryLabels ? 'visible' : 'none',
          'symbol-placement': 'point',
          'text-field': ['concat', 'ประเทศ: ', ['coalesce', ['get', 'shapeName'], ['get', 'name'], '']],
          'text-size': 16,
          'text-font': ['Open Sans Bold'],
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
        layout: {
          visibility: curFilters.province ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 2.5,
          'line-dasharray': [4, 2]
        }
      });
      map.addLayer({
        id: 'bnd-province-labels',
        type: 'symbol',
        source: 'bnd-province-src',
        layout: {
          visibility: curFilters.province && showBoundaryLabels ? 'visible' : 'none',
          'symbol-placement': 'point',
          'text-field': ['concat', 'จังหวัด: ', ['coalesce', ['get', 'shapeName'], ['get', 'name'], '']],
          'text-size': 13,
          'text-font': ['Open Sans Bold'],
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
        id: 'bnd-locality-fill',
        type: 'fill',
        source: 'bnd-locality-src',
        layout: {
          visibility: curFilters.locality ? 'visible' : 'none'
        },
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.05
        }
      });
      map.addLayer({
        id: 'bnd-locality-layer',
        type: 'line',
        source: 'bnd-locality-src',
        layout: {
          visibility: curFilters.locality ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-dasharray': [3, 1.5]
        }
      });
      map.addLayer({
        id: 'bnd-locality-labels',
        type: 'symbol',
        source: 'bnd-locality-src',
        layout: {
          visibility: curFilters.locality && showBoundaryLabels ? 'visible' : 'none',
          'symbol-placement': 'point',
          'text-field': ['concat', 'อำเภอ: ', ['coalesce', ['get', 'shapeName'], ['get', 'name'], '']],
          'text-size': 11,
          'text-font': ['Open Sans Regular'],
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#1d4ed8',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });

      setIsMapLoaded(true);
      applyBoundaryVisibility(curFilters);
    });

    map.on('click', () => {
      setIsPinned(false);
      updatePopupHotspot(null);
    });

    mapRef.current = map;

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }
      if (locationStatusTimeoutRef.current) {
        clearTimeout(locationStatusTimeoutRef.current);
      }
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  // ควบคุมการแสดงผล/ซ่อนเลเยอร์ขอบเขตตาม boundaryFilters ทันที 100%
  useEffect(() => {
    if (isMapLoaded) {
      applyBoundaryVisibility(boundaryFilters);
    }
  }, [boundaryFilters, showBoundaryLabels, isMapLoaded]);

  // ปิด Popup Card ทันทีเมื่อชุดข้อมูลตัวอย่างเปลี่ยนจากการสลับ Time Filter
  useEffect(() => {
    setIsPinned(false);
    updatePopupHotspot(null);
  }, [submissions]);

  // สลับการแสดงผลระหว่าง แผนที่สถานที่ & พื้นที่ดาวเทียม
  useEffect(() => {
    if (!mapRef.current) return;
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
  }, [mapType, showLabels]);

  // Update Dynamic Hotspot Clusters and Single Point Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Run spatial clustering engine (radius 250m)
    const { clusters, singlePoints } = clusterSubmissions(submissions, 250);

    // 1. Render Dynamic Hotspot Clusters (สำหรับบริเวณที่มีผลตรวจตั้งแต่ 2 รายการขึ้นไป)
    clusters.forEach((cluster) => {
      const isSelected = selectedHotspot?.id === cluster.id;
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
      el.className = 'hotspot-marker group cursor-pointer select-none';
      el.style.zIndex = isSelected ? '60' : '45';

      el.innerHTML = `
        <div class="flex flex-col items-center transform transition-all duration-200 ${
          isSelected ? 'scale-115' : 'hover:scale-110'
        }">
          <!-- Glowing Hotspot Badge -->
          <div class="px-2.5 py-1 rounded-xl text-[11px] font-bold text-white shadow-xl flex items-center gap-1.5 whitespace-nowrap mb-1 ${riskGlow}">
            <span class="text-xs">🔥</span>
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
          <div class="relative flex items-center justify-center">
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

      // Click -> ตรึง Popup Card และเลื่อนแผนที่เข้าหากึ่งกลาง
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        isHoveringPopupRef.current = true;
        setIsPinned(true);
        const point = map.project(cluster.coordinates);
        setPopupPos({ x: point.x, y: point.y });
        updatePopupHotspot(cluster);
        map.flyTo({ center: cluster.coordinates, offset: [0, -90], zoom: 15.5, duration: 700 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(cluster.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 2. Render Single Points (จุดตรวจเดี่ยวที่มี 1 รายงาน)
    singlePoints.forEach((point) => {
      const isSelected = selectedSample?.record_id === point.sample?.record_id || selectedHotspot?.id === point.id;
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
      el.className = 'single-point-marker group cursor-pointer select-none';
      el.style.zIndex = isSelected ? '55' : '35';

      const hasPhotos = (point.latestPhotos && point.latestPhotos.length > 0) || (point.photos && point.photos.length > 0);

      el.innerHTML = `
        <div class="flex flex-col items-center transform transition-all duration-200 ${
          isSelected ? 'scale-120 ring-4 ring-[#B4975A] rounded-full' : 'hover:scale-110'
        }">
          <div class="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md border border-white flex items-center gap-1.5 ${badgeColor} whitespace-nowrap mb-0.5">
            <span class="max-w-[110px] truncate text-[9px] font-sans font-medium text-white/95">
              ${point.locationName}
            </span>
            <span class="font-mono text-[9px] font-bold">
              ${arsenicVal !== null && arsenicVal !== undefined ? `${arsenicVal} ppb` : '-'}
            </span>
            ${hasPhotos ? '<span>📷</span>' : ''}
          </div>

          <div class="relative w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${pinColor}">
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

      // Click -> ตรึง Popup Card และเลื่อนแผนที่เข้าหาจุดตรวจ
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        isHoveringPopupRef.current = true;
        setIsPinned(true);
        const pt = map.project(point.coordinates);
        setPopupPos({ x: pt.x, y: pt.y });
        updatePopupHotspot(point);
        map.flyTo({ center: point.coordinates, offset: [0, -90], zoom: 15.5, duration: 700 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(point.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [submissions, selectedSample, onSelectSample, selectedHotspot, onSelectHotspot]);

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
  }, []);

  // ป้องกันไม่ให้การ์ดล้นขอบจอซ้าย-ขวา หรือชนขอบบน
  const isFlippedBelow = popupPos.y < 460;
  const cardHalfWidth = 180;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const clampedX = Math.max(cardHalfWidth + 12, Math.min(screenWidth - cardHalfWidth - 12, popupPos.x));
  const pointerOffset = Math.max(-120, Math.min(120, popupPos.x - clampedX));

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

      {/* Hover / Click Hotspot Popup Card */}
      {popupHotspot && (
        <div
          className={`z-50 pointer-events-auto transition-all duration-200 ${
            isMobile
              ? 'fixed inset-x-3 bottom-3 flex justify-center items-end'
              : 'absolute'
          }`}
          style={isMobile ? undefined : {
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
          <div className="w-full sm:w-[350px] max-w-[360px] max-h-[68vh] sm:max-h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800 relative flex flex-col">
            {/* Header */}
            <div className={`px-3.5 py-2.5 text-white flex items-start justify-between shrink-0 ${
              popupHotspot.latestIsDanger
                ? 'bg-gradient-to-r from-rose-700 to-rose-900'
                : popupHotspot.latestIsWatch
                ? 'bg-gradient-to-r from-amber-600 to-amber-800'
                : 'bg-gradient-to-r from-[#A6192E] to-[#8c1527]'
            }`}>
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <span className="text-lg shrink-0">{popupHotspot.isHotspot ? '🔥' : '📍'}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
                    {popupHotspot.locationName || popupHotspot.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {popupHotspot.isHotspot && (
                      <span className="px-1.5 py-0.5 rounded-md bg-black/35 font-mono text-[10px] font-bold text-amber-200">
                        {popupHotspot.count} รายการ
                      </span>
                    )}
                    <span className="text-[11px] text-white/90 font-mono truncate">
                      {popupHotspot.latestSampleCode ? `รหัส ${popupHotspot.latestSampleCode}` : (popupHotspot.isHotspot ? 'ก้อน Hotspot' : 'จุดตรวจวัดเดี่ยว')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(false);
                  updatePopupHotspot(null);
                }}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 ml-1"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Photo Section: ภาพถ่ายหลักฐานของการตรวจวัดล่าสุดเท่านั้น */}
            <EvidencePhotoBox
              photos={popupHotspot.latestPhotos && popupHotspot.latestPhotos.length > 0 ? popupHotspot.latestPhotos : (popupHotspot.latestPhoto ? [popupHotspot.latestPhoto] : [])}
              activeIdx={activePhotoIdx}
              onSelectIdx={(idx) => setActivePhotoIdx(idx)}
              onExpand={(idx) => {
                const photos = popupHotspot.latestPhotos && popupHotspot.latestPhotos.length > 0 ? popupHotspot.latestPhotos : (popupHotspot.latestPhoto ? [popupHotspot.latestPhoto] : []);
                setPreviewImage({
                  index: idx,
                  photos,
                  url: photos[idx]?.url,
                  title: photos[idx]?.title || 'ภาพถ่ายหลักฐานการตรวจวัดล่าสุด'
                });
              }}
            />

            {/* Popup Body: แสดงเฉพาะข้อมูลการตรวจวัดล่าสุด (Latest Only) - รองรับ scroll ได้ 100% */}
            <div className="p-3 space-y-2 overflow-y-auto flex-1 min-h-0 overscroll-contain touch-pan-y">
              {/* Highlight Card: ค่าตรวจวัดสารหนูล่าสุด (Latest Record) */}
              <div className={`p-2.5 rounded-xl border ${
                popupHotspot.latestIsDanger
                  ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                  : popupHotspot.latestIsWatch
                  ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                  : 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                      style={{ backgroundColor: popupHotspot.latestLevelCfg?.color || (popupHotspot.latestIsDanger ? '#e11d48' : popupHotspot.latestIsWatch ? '#f59e0b' : '#059669') }}
                    />
                    ผลตรวจวัดล่าสุด
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    popupHotspot.latestIsDanger
                      ? 'bg-rose-600 text-white'
                      : popupHotspot.latestIsWatch
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {popupHotspot.latestIsDanger ? 'เกินเกณฑ์อันตราย' : popupHotspot.latestIsWatch ? 'เฝ้าระวัง' : 'เกณฑ์ปลอดภัย (WHO)'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
                      {popupHotspot.latestAs}
                    </span>
                    <span className="text-xs font-bold font-mono opacity-80">ppb</span>
                  </div>
                  <div className="text-[11px] font-bold text-right opacity-90">
                    <span>ระดับที่ {popupHotspot.latestLevelCfg?.level || '-'}: {popupHotspot.latestLevelCfg?.desc || ''}</span>
                  </div>
                </div>
              </div>

              {/* กราฟแนวโน้มการขึ้น-ลงของค่าสารหนู (PPB Trend Chart) ตามช่วงเวลา */}
              <PPBTrendChart
                items={popupHotspot.items && popupHotspot.items.length > 0 ? popupHotspot.items : (popupHotspot.sample ? [popupHotspot.sample] : [])}
                title="แนวโน้มการขึ้น-ลงของค่าสารหนู (PPB)"
                isCompact={true}
              />

              {/* Time & Collector Information (ข้อมูลเฉพาะของการตรวจวัดล่าสุด) */}
              <div className="space-y-1.5 text-xs">
                {/* เวลาที่ตรวจวัดล่าสุด */}
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                    <span>เวลาตรวจล่าสุด:</span>
                  </span>
                  <span className="font-mono text-slate-800 font-bold text-xs text-right truncate ml-2">
                    {formatThaiDateTime(popupHotspot.latestCollectionTime)}
                  </span>
                </div>

                {/* ผู้ตรวจวัดล่าสุด */}
                {(popupHotspot.latestCollector?.name || popupHotspot.sample?.collector?.name) && (
                  <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>ผู้ตรวจล่าสุด:</span>
                    </span>
                    <span className="font-bold text-slate-800 text-xs text-right truncate ml-2 max-w-[180px]" title={popupHotspot.latestCollector?.name || popupHotspot.sample?.collector?.name}>
                      {popupHotspot.latestCollector?.name || popupHotspot.sample?.collector?.name}
                      {popupHotspot.latestCollector?.organization ? ` (${popupHotspot.latestCollector.organization})` : ''}
                    </span>
                  </div>
                )}

                {/* แหล่งน้ำ / ตำแหน่งเก็บ */}
                {popupHotspot.latestWaterSource && (
                  <div className="flex items-center justify-between py-1 px-2.5 text-xs text-slate-600">
                    <span className="shrink-0 text-slate-400 font-medium">แหล่งน้ำ:</span>
                    <span className="text-right truncate ml-2 text-slate-800 font-bold">
                      {popupHotspot.latestWaterSource}
                    </span>
                  </div>
                )}

                {/* บันทึกเฉพาะข้อมูลล่าสุด ไม่เอาข้อมูลเก่ามาโชว์ */}
                {popupHotspot.isHotspot && popupHotspot.count > 1 && (
                  <div className="flex items-center justify-between px-2.5 pt-0.5 text-[11px] text-slate-500 font-mono font-medium">
                    <span>ประวัติตรวจวัดสะสม:</span>
                    <span>{popupHotspot.count} รายการ (แสดงผลตรวจล่าสุด)</span>
                  </div>
                )}
              </div>

              {/* Action Button: เปิดดูรายละเอียด */}
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
                className="w-full py-2.5 px-3 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 active:scale-[0.98]"
              >
                <span>{popupHotspot.isHotspot ? `เปิดดูประวัติในก้อนนี้ (${popupHotspot.count} รายการ)` : 'เปิดดูผลตรวจวัดฉบับเต็ม'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Speech Bubble Pointer */}
            {!isMobile && (isFlippedBelow ? (
              <div 
                className="absolute -top-2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow-xs -translate-x-1/2 pointer-events-none"
                style={{ left: `calc(50% + ${pointerOffset}px)` }}
              />
            ) : (
              <div 
                className="absolute -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-xs -translate-x-1/2 pointer-events-none"
                style={{ left: `calc(50% + ${pointerOffset}px)` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal สำหรับขยายดูรูปภาพถ่ายหลักฐาน พร้อมระบบสลับรูปถัดไป/ก่อนหน้า */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
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
        </div>
      )}

      {/* 1. Floating Map Controls & Boundaries Filter (ชิดขวาบน ใต้แถบบาร์) */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-4 z-20 pointer-events-auto flex flex-col items-end gap-2 select-none max-w-[calc(100vw-24px)]">
        {/* แถวที่ 1: สลับแผนที่สถานที่ / ดาวเทียม & แสดง/ซ่อนตัวอักษร */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
                    <span className="block text-[10px] text-slate-400">แสดงชื่อประเทศ จังหวัด และอำเภอ</span>
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
