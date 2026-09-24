import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Droplets,
  Waves,
  X,
  Compass,
  AlertTriangle,
  Layers,
  FileText,
  Maximize2,
  ZoomIn,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import MapView2D from './components/MapView2D';
import SatelliteComparisonController from './components/SatelliteComparisonController';
import SentinelAnalysisHUD from './components/SentinelAnalysisHUD';
import FloodAnalysisModal from './components/FloodAnalysisModal';
import ImageZoomLightbox from './components/ImageZoomLightbox';
import { THATON_COMMUNITIES, THATON_CENTER } from './data/thatonFloodData';

// Code splitting: Dynamic lazy load for secondary views to maximize initial page performance
const SentinelCompareView = lazy(() => import('./components/SentinelCompareView'));
const KokWaterWatchView = lazy(() => import('./components/KokWaterWatch/KokWaterWatchView'));
const GoogleMaps3DView = lazy(() => import('./components/GoogleMaps3DView'));

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#sentinel-compare') return 'sentinel-compare';
      if (window.location.hash === '#water-watch') return 'water-watch';
      if (window.location.hash === '#google-3d') return 'google-3d';
    }
    // ค่าเริ่มต้นเป็นโมเดลจำลอง 3 มิติ (3D Diorama) ที่มีฟังก์ชันวิเคราะห์ดาวเทียมครบครัน
    return 'flood-sim';
  });

  const [selectedLocation, setSelectedLocation] = useState(null); // Default full overview of Thaton & Thadoi
  const [floodStage, setFloodStage] = useState(0); // 0, 25, 50, 75, 100
  const [isPlaying, setIsPlaying] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true); // Default 3D on Tha Ton
  const [activeZone, setActiveZone] = useState(null); // Z1, Z2, Z3, Z4
  const [activeCommunity, setActiveCommunity] = useState(null); // huaimaphuang, thaton, huainamyen
  const [waterColorMode, setWaterColorMode] = useState('standard'); // 'standard' | 'mndwi'
  const [comparisonBlend, setComparisonBlend] = useState(0); // 0 = 5 ก.ย. 67, 100 = 15 ก.ย. 67
  const [comparisonMode, setComparisonMode] = useState('before'); // 'before' | 'after' | 'blend'
  const [showMndwiWater, setShowMndwiWater] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // 'before' | 'after' | null
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isControllerExpanded, setIsControllerExpanded] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

  // Hash route listener
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#sentinel-compare') {
        setActivePage('sentinel-compare');
      } else if (window.location.hash === '#water-watch') {
        setActivePage('water-watch');
      } else if (window.location.hash === '#google-3d') {
        setActivePage('google-3d');
      } else {
        setActivePage('flood-sim');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Animation Loop สำหรับจำลองน้ำท่วมขยายอาณาเขต
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setFloodStage(prev => {
        if (prev >= 100) return 0;
        return prev + 25;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleFocusThaton = () => {
    setIs3DMode(true);
    setSelectedLocation(null);
    if (window.map) {
      window.map.flyTo({
        center: THATON_CENTER,
        zoom: 14.2,
        pitch: 42,
        bearing: 12,
        duration: 1200,
        essential: true
      });
    }
  };

  // 1. หน้าต่างหลัก: ภาพถ่ายดาวเทียม Sentinel-2 ก่อน-หลัง 2567 (Main Function จากระบบต้นแบบ)
  if (activePage === 'sentinel-compare') {
    return (
      <Suspense fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white font-['Prompt',sans-serif]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">กำลังโหลดข้อมูลดาวเทียม Sentinel-2 (ก่อน-หลัง 2567)...</p>
          </div>
        </div>
      }>
        <SentinelCompareView
          onSwitchTo3DSim={() => {
            setActivePage('flood-sim');
            window.location.hash = '#3d';
          }}
          onOpenWaterWatch={() => {
            setActivePage('water-watch');
            window.location.hash = '#water-watch';
          }}
          onFlyToLocation={(coords, zoom = 15.5) => {
            setActivePage('flood-sim');
            window.location.hash = '#3d';
            setTimeout(() => {
              if (window.map) {
                window.map.flyTo({
                  center: coords,
                  zoom: zoom,
                  pitch: 45,
                  bearing: 15,
                  duration: 1500,
                  essential: true
                });
              }
            }, 300);
          }}
        />
      </Suspense>
    );
  }

  if (activePage === 'water-watch') {
    return (
      <Suspense fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white font-['Prompt',sans-serif]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">กำลังโหลด KOK Water Watch...</p>
          </div>
        </div>
      }>
        <KokWaterWatchView
          onBackToFloodSim={() => {
            setActivePage('flood-sim');
            window.location.hash = '';
          }}
        />
      </Suspense>
    );
  }

  if (activePage === 'google-3d') {
    return (
      <Suspense fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-900 text-white font-['Prompt',sans-serif]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">กำลังโหลด Google Maps 3D View...</p>
          </div>
        </div>
      }>
        <GoogleMaps3DView
          onBack={() => {
            setActivePage('flood-sim');
            window.location.hash = '';
          }}
          floodStage={floodStage}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white font-['Prompt',sans-serif] text-slate-800">
      {/* 3D Map Viewport (ภาพถ่ายดาวเทียม 3D คมชัด 100% ไร้สิ่งรบกวน) */}
      <div className="absolute inset-0 z-0">
        <MapView2D
          selectedLocation={selectedLocation}
          onSelectLocation={(loc) => {
            setSelectedLocation(loc);
          }}
          floodStage={floodStage}
          is3DMode={is3DMode}
          activeZone={activeZone}
          activeCommunity={activeCommunity}
          waterColorMode={waterColorMode}
          comparisonBlend={comparisonBlend}
          showMndwiWater={showMndwiWater}
        />
      </div>

      {/* 1. ฝั่งซ้ายบน: เรียบง่าย สะอาดตา สามารถย่อ-ขยายได้ */}
      {/* 1. ฝั่งซ้ายบน: เรียบง่าย สะอาดตา สามารถย่อ-ขยายได้ */}
      {!isHeaderExpanded ? (
        <button
          onClick={() => setIsHeaderExpanded(true)}
          className="absolute top-3 left-3 md:top-4 md:left-4 z-20 pointer-events-auto glass-panel-light p-2 px-2.5 md:p-2.5 md:px-3 rounded-2xl flex items-center gap-2 shadow-md hover:border-sky-400 transition-all cursor-pointer group active:scale-95 animate-in fade-in"
          title="คลิกเพื่อขยายชื่อระบบจำลอง"
        >
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
            <Waves className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
            จำลอง 3 มิติ
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
        </button>
      ) : (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 pointer-events-auto glass-panel-light p-2 px-2.5 md:py-2.5 md:px-4 rounded-2xl flex items-center gap-2 md:gap-3 shadow-md animate-in fade-in max-w-[calc(100vw-120px)] md:max-w-none">
          <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <h1 className="text-xs md:text-sm font-bold text-slate-900 leading-tight truncate">
              ระบบจำลองน้ำท่วมแม่น้ำกก 3 มิติ
            </h1>
            <p className="text-[10px] md:text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
              <span>ต.ท่าตอน &bull; บ้านท่าดอย</span>
              <span className="hidden sm:inline text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-md">เปรียบเทียบก่อน-หลัง</span>
            </p>
          </div>
          <button
            onClick={() => setIsHeaderExpanded(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ml-0.5 cursor-pointer flex-shrink-0"
            title="ย่อแถบชื่อระบบ"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. ฝั่งขวาบน: ปุ่มเปิดบทวิเคราะห์ 2567 */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 pointer-events-auto flex items-center gap-1.5 md:gap-2">
        <button
          onClick={() => setShowAnalysisModal(true)}
          className="px-2.5 py-2 md:px-3.5 md:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-xs border border-indigo-400/40 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 backdrop-blur-md"
          title="เปิดบทความวิเคราะห์สถานการณ์น้ำท่วม 2567"
        >
          <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-300" />
          <span className="hidden sm:inline">📖 บทวิเคราะห์ 2567</span>
          <span className="sm:hidden">📖 วิเคราะห์</span>
        </button>
      </div>

      {/* 3.1 ปุ่มควบคุมกล้องและซูมด่วนสำหรับมือถือ (Mobile Quick Controls) */}
      <div className="absolute right-3 top-20 md:hidden z-10 pointer-events-auto flex flex-col gap-1.5 shadow-md rounded-xl overflow-hidden glass-panel-light p-1 border border-slate-200/80">
        <button
          onClick={() => {
            if (window.map) window.map.zoomIn({ duration: 300 });
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 font-bold active:bg-sky-100 active:text-sky-700 text-base"
          title="ซูมเข้า (+)"
        >
          +
        </button>
        <button
          onClick={() => {
            if (window.map) window.map.zoomOut({ duration: 300 });
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 font-bold active:bg-sky-100 active:text-sky-700 text-base"
          title="ซูมออก (-)"
        >
          &minus;
        </button>
        <button
          onClick={handleFocusThaton}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sky-600 active:bg-sky-100"
          title="จัดมุมมองกึ่งกลาง ต.ท่าตอน"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. ฝั่งขวา: แผง HUD วิเคราะห์ดาวเทียม Sentinel-2 บนโมเดล 3D */}
      <div className="absolute top-14 right-3 md:top-16 md:right-4 z-20 pointer-events-auto">
        <SentinelAnalysisHUD
          floodStage={floodStage}
          setFloodStage={(val) => {
            setFloodStage(val);
            setComparisonBlend(val);
          }}
          activeZone={activeZone}
          setActiveZone={setActiveZone}
          activeCommunity={activeCommunity}
          setActiveCommunity={setActiveCommunity}
          waterColorMode={waterColorMode}
          setWaterColorMode={setWaterColorMode}
          onOpenAnalysisModal={() => setShowAnalysisModal(true)}
          onFlyToLocation={(coords, zoom = 15.2) => {
            if (window.map) {
              window.map.flyTo({
                center: coords,
                zoom: zoom,
                pitch: 42,
                bearing: 15,
                duration: 1200,
                essential: true
              });
            }
          }}
        />
      </div>

      {/* 5. ซ้ายล่าง: แผงควบคุมเปรียบเทียบภาพถ่ายดาวเทียมจริง ก่อน ↔ หลัง (5 ก.ย. vs 15 ก.ย. 67) */}
      <div className="absolute bottom-3 left-3 md:bottom-5 md:left-5 z-20 pointer-events-auto">
        <SatelliteComparisonController
          isExpanded={isControllerExpanded}
          setIsExpanded={setIsControllerExpanded}
          comparisonBlend={comparisonBlend}
          setComparisonBlend={(val) => {
            setComparisonBlend(val);
            setFloodStage(val);
          }}
          comparisonMode={comparisonMode}
          setComparisonMode={setComparisonMode}
          showMndwiWater={showMndwiWater}
          setShowMndwiWater={setShowMndwiWater}
          is3DMode={is3DMode}
          setIs3DMode={setIs3DMode}
          onOpenAnalysisModal={() => setShowAnalysisModal(true)}
          onFocusThaton={handleFocusThaton}
          onOpenWaterWatch={() => {
            setActivePage('water-watch');
            window.location.hash = '#water-watch';
          }}
        />
      </div>

      {/* 6. ขวาล่าง: ปุ่มสีแดง KOK Water Watch และการ์ดแสดงข้อมูลชุมชน */}
      <div className={`absolute bottom-3 right-3 md:bottom-5 md:right-5 z-30 pointer-events-none flex flex-col items-end gap-2 max-w-sm ${isControllerExpanded ? 'hidden md:flex' : 'flex'}`}>
        {selectedLocation && (
          <div className="pointer-events-auto glass-panel-light p-3.5 md:p-4 rounded-3xl shadow-2xl border border-slate-200/90 w-[calc(100vw-1.5rem)] max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${
                  selectedLocation.type === 'landmark' ? 'bg-amber-500' : 'bg-sky-600'
                }`}></span>
                <h3 className="font-bold text-base text-slate-900">
                  {selectedLocation.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ตำบลท่าตอน อำเภอแม่อาย จังหวัดเชียงใหม่
              </p>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            {/* ภาพถ่ายดาวเทียมจริง Before vs After ของพื้นที่ */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <span>🛰️</span>
                <span>ภาพถ่ายดาวเทียมจริง Sentinel-2 ณ บริเวณนี้:</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  onClick={() => setLightboxImage('before')}
                  className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-900 group cursor-zoom-in hover:border-emerald-500 hover:shadow-md transition-all"
                  title="คลิกเพื่อซูมดูภาพขนาดใหญ่"
                >
                  <img
                    src="/assets/diorama_before_full.jpg"
                    alt="ก่อนน้ำท่วม 5 ก.ย. 67"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-bold text-emerald-400">
                    5 ก.ย. (ก่อนท่วม)
                  </div>
                  <div className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3 text-emerald-300" />
                  </div>
                </div>
                <div
                  onClick={() => setLightboxImage('after')}
                  className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-900 group cursor-zoom-in hover:border-rose-500 hover:shadow-md transition-all"
                  title="คลิกเพื่อซูมดูภาพขนาดใหญ่"
                >
                  <img
                    src="/assets/diorama_after_full.jpg"
                    alt="หลังน้ำท่วม 15 ก.ย. 67"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-bold text-rose-400">
                    15 ก.ย. (หลังท่วม)
                  </div>
                  <div className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3 text-rose-300" />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              {selectedLocation.description}
            </p>

            {/* Inundation Comparison Box */}
            <div className="space-y-1.5 pt-1">
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
                <span className="font-bold text-sky-900 block text-[10px]">สภาพช่วงน้ำปกติ (5 ก.ย. 67):</span>
                <span className="text-sky-700 text-[11px]">{selectedLocation.normalStatus}</span>
              </div>

              <div className={`p-2 rounded-xl border ${
                comparisonBlend >= 50
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <span className="font-bold block text-[10px] flex items-center gap-1">
                  {comparisonBlend >= 50 && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                  สภาพช่วงน้ำท่วมสูงสุด (15 ก.ย. 67):
                </span>
                <span className="text-[11px]">{selectedLocation.floodStatus}</span>
              </div>
            </div>

            {/* ปุ่มเปิดบทวิเคราะห์ฉบับเต็ม */}
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>📖 อ่านบทวิเคราะห์สถานการณ์น้ำท่วมฉบับเต็ม</span>
            </button>
          </div>
        </div>
      )}

        {/* ปุ่มสีแดง KOK Water Watch ประจำที่ตำแหน่งขวาล่างเสมอ */}
        <button
          onClick={() => {
            setActivePage('water-watch');
            window.location.hash = '#water-watch';
          }}
          className="pointer-events-auto px-3 py-2 md:px-4 md:py-2.5 rounded-2xl bg-[#A6192E] text-white font-bold text-xs md:text-sm border-2 border-[#B4975A] shadow-xl hover:bg-[#851424] hover:shadow-2xl transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer active:scale-95 group"
          title="เปิดระบบแบบสอบถามและบันทึกข้อมูลคุณภาพน้ำ KOK Water Watch"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Droplets className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
          </div>
          <span className="hidden sm:inline">📋 KOK Water Watch</span>
          <span className="sm:hidden">📋 Water Watch</span>
        </button>
      </div>

      {/* 7. Modal รายงานวิเคราะห์สถานการณ์น้ำท่วม 2567 (ฉบับเต็ม) */}
      <FloodAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
      />

      {/* 8. Fullscreen Interactive Zoom Lightbox for Location Cards */}
      <ImageZoomLightbox
        isOpen={!!lightboxImage}
        initialImage={lightboxImage || 'before'}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
