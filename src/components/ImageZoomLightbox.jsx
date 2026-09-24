import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Move,
  Sliders
} from 'lucide-react';

export default function ImageZoomLightbox({
  isOpen,
  onClose,
  initialImage = 'before' // 'before' | 'after'
}) {
  const [activeImage, setActiveImage] = useState(initialImage);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'split'
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef(null);

  useEffect(() => {
    setActiveImage(initialImage);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [initialImage, isOpen]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setActiveImage('before');
      else if (e.key === 'ArrowRight') setActiveImage('after');
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
      else if (e.key === '0') handleReset();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.35, 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev - 0.35, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 0.2, 4));
    } else {
      setZoom(prev => {
        const next = Math.max(prev - 0.2, 1);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Pan / Drag handlers
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-slate-950/95 backdrop-blur-xl select-none animate-in fade-in duration-200 font-['Prompt',sans-serif]">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-slate-900/90 z-20">
        
        {/* Title & Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm md:text-base text-white">
                ภาพถ่ายดาวเทียม Sentinel-2 ความละเอียดสูง (10 ม.)
              </h3>
              <span className="text-[10px] bg-slate-800 text-sky-400 font-mono font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ลุ่มน้ำกก ต.ท่าตอน - บ้านท่าดอย อ.แม่อาย (ลากเมาส์เพื่อเลื่อนดู / หมุนลูกกลิ้งเพื่อซูม)
            </p>
          </div>
        </div>

        {/* View Mode & Image Selector Buttons */}
        <div className="flex items-center gap-2">
          {/* Switch Single / Split Mode */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'single' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ภาพเดี่ยว
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'split' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              สไลด์เปรียบเทียบ
            </button>
          </div>

          {/* Quick Date Toggle (when single mode) */}
          {viewMode === 'single' && (
            <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700">
              <button
                onClick={() => setActiveImage('before')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeImage === 'before'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢 5 ก.ย. 67 (ก่อนท่วม)</span>
              </button>
              <button
                onClick={() => setActiveImage('after')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeImage === 'after'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔴 15 ก.ย. 67 (หลังท่วม)</span>
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer ml-1"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onClick={(e) => {
          // ถ้าคลิกครั้งแรกและไม่ได้ซูม ให้ซูมเข้าทันทีที่จุดนั้น
          if (zoom === 1) {
            setZoom(2.2);
          }
        }}
      >
        {/* SINGLE IMAGE MODE */}
        {viewMode === 'single' && (
          <div
            className="transition-transform duration-75 ease-out select-none will-change-transform max-w-full max-h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <img
              src={activeImage === 'before' ? '/assets/diorama_before_full.jpg' : '/assets/diorama_after_full.jpg'}
              alt={activeImage === 'before' ? 'ภาพก่อนน้ำท่วม 5 ก.ย. 2567' : 'ภาพหลังน้ำท่วม 15 ก.ย. 2567'}
              className="max-w-[92vw] max-h-[78vh] object-contain rounded-2xl shadow-2xl pointer-events-none"
              draggable={false}
            />
          </div>
        )}

        {/* SPLIT SLIDER MODE */}
        {viewMode === 'split' && (
          <div
            className="relative max-w-[92vw] max-h-[78vh] aspect-[1440/1068] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-75 ease-out select-none will-change-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {/* Base Image: After Flood */}
            <img
              src="/assets/diorama_after_full.jpg"
              alt="ภาพหลังน้ำท่วม 15 ก.ย. 2567"
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Clipped Image: Before Flood */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${splitPercent}%` }}
            >
              <img
                src="/assets/diorama_before_full.jpg"
                alt="ภาพก่อนน้ำท่วม 5 ก.ย. 2567"
                className="w-full h-full object-cover max-w-none"
                style={{ width: containerRef.current ? `${containerRef.current.clientWidth * 0.92}px` : '92vw' }}
                draggable={false}
              />
            </div>

            {/* Split Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none z-10"
              style={{ left: `${splitPercent}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-bold text-xs border-2 border-sky-500">
                ↔
              </div>
            </div>
          </div>
        )}

        {/* Date Labels Overlaid on Bottom */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-auto flex items-center gap-2">
          {viewMode === 'single' ? (
            <div className={`px-4 py-2 rounded-2xl backdrop-blur-md border text-xs font-bold shadow-xl ${
              activeImage === 'before'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
            }`}>
              {activeImage === 'before'
                ? '🟢 ภาพถ่ายก่อนน้ำท่วม: 5 ก.ย. 2567 (11:02:45 น.)'
                : '🔴 ภาพถ่ายหลังน้ำท่วมสูงสุด: 15 ก.ย. 2567 (11:02:41 น.)'}
            </div>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700 text-xs font-bold text-white shadow-xl flex items-center gap-3">
              <span className="text-emerald-400">🟢 ซ้าย: 5 ก.ย. (ก่อนท่วม)</span>
              <span className="text-slate-500">|</span>
              <span className="text-rose-400">🔴 ขวา: 15 ก.ย. (หลังท่วม)</span>
            </div>
          )}
        </div>

        {/* Split Percent Slider (in split mode) */}
        {viewMode === 'split' && (
          <div className="absolute bottom-6 right-6 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-3 w-64">
            <span className="text-xs font-bold text-slate-300">สไลเดอร์:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xs font-mono font-bold text-sky-400 w-8 text-right">{splitPercent}%</span>
          </div>
        )}
      </div>

      {/* Floating Bottom Zoom Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-slate-200">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className={`p-2 rounded-xl transition-all ${
            zoom <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 text-white cursor-pointer active:scale-95'
          }`}
          title="ซูมออก (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 font-mono text-xs font-bold text-sky-400 min-w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className={`p-2 rounded-xl transition-all ${
            zoom >= 4 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 text-white cursor-pointer active:scale-95'
          }`}
          title="ซูมเข้า (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1"></div>

        <button
          onClick={handleReset}
          className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
          title="รีเซ็ตขนาด 100% (เลข 0)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>รีเซ็ต</span>
        </button>
      </div>
    </div>
  );
}
