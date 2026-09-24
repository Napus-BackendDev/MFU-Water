import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  ExternalLink,
  Info,
  CheckCircle2,
  Droplets,
  AlertTriangle,
  Compass,
  ArrowRight,
  Sliders,
  Check
} from 'lucide-react';
import {
  SENTINEL_METRICS,
  SENTINEL_CHOICES,
  SENTINEL_ZONES,
  SENTINEL_COMMUNITIES,
  SENTINEL_RUNS
} from '../data/sentinelFloodAnalysisData';

export default function SentinelCompareView({
  onFlyToLocation,
  onSwitchTo3DSim,
  onOpenWaterWatch
}) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeTab, setActiveTab] = useState('compare'); // 'compare' | 'zones' | 'methods'
  const canvasRef = useRef(null);

  const currentChoice = SENTINEL_CHOICES[selectedChoiceIdx] || SENTINEL_CHOICES[0];

  // วาดเลเยอร์จำแนกน้ำ (MNDWI Run-Length Encoded Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showOverlay) {
      // 1. วาดจุดภาพน้ำเพิ่ม (Added), น้ำเดิม (Stable), เมฆ/เงา (Unknown)
      for (const [y, x, len, k] of SENTINEL_RUNS) {
        if (k === 1) {
          // น้ำเดิมทั้งสองวัน (Deep River Blue)
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(x * 2, y * 2, len * 2, 2);
        } else if (k === 2) {
          // น้ำท่วมเพิ่มขึ้นใหม่ (Vibrant Cyan / Red Alert Tint)
          ctx.globalAlpha = 0.90;
          ctx.fillStyle = '#f97316'; // โทนส้ม-แดงเน้นพื้นที่น้ำหลากใหม่
          ctx.fillRect(x * 2, y * 2, len * 2, 2);
        } else if (k === 255) {
          // เมฆและเงาที่ไม่สามารถประเมินได้
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = '#64748b';
          for (let a = x; a < x + len; a++) {
            if ((a + y) % 6 < 2) ctx.fillRect(a * 2, y * 2, 2, 2);
          }
        }
      }
    }

    ctx.globalAlpha = 1.0;

    // 2. วาดกรอบสี่เหลี่ยมโซน (Box) หรือวงกลมรัศมีชุมชน 500 เมตร (Circle)
    if (currentChoice.box) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(
        currentChoice.box[0] * 2,
        currentChoice.box[1] * 2,
        currentChoice.box[2] * 2,
        currentChoice.box[3] * 2
      );
      ctx.setLineDash([]);
    }

    if (currentChoice.circle) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(currentChoice.circle[0] * 2, currentChoice.circle[1] * 2, 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // จุดกึ่งกลางชุมชน
      ctx.beginPath();
      ctx.arc(currentChoice.circle[0] * 2, currentChoice.circle[1] * 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [showOverlay, selectedChoiceIdx]);

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-900 text-slate-100 font-['Prompt',sans-serif] p-4 md:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Quick Stat Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-2">
            <span>🛰️ ข้อมูลจริงจากดาวเทียม Sentinel-2 MSI · Google Earth Engine (Main Function)</span>
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            ท่าตอน–ลำน้ำกก | ภาพก่อนและหลังน้ำท่วม 2567
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            เปรียบเทียบภาพถ่ายสีจริง B4/B3/B2 วันที่ 5 ก.ย. และ 15 ก.ย. 2567 พร้อมชั้นวิเคราะห์ผิวน้ำที่เพิ่มขึ้นตามหลัก GIS
          </p>
        </div>

        {/* Action Buttons: สลับไปโมเดล 3D และ KOK Water Watch */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenWaterWatch && (
            <button
              onClick={onOpenWaterWatch}
              className="px-3.5 py-2.5 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs md:text-sm border border-[#B4975A] shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="เปิด KOK Water Watch"
            >
              <Droplets className="w-4 h-4 text-amber-300" />
              <span>📋 KOK Water Watch</span>
            </button>
          )}
          {onSwitchTo3DSim && (
            <button
              onClick={onSwitchTo3DSim}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs md:text-sm shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-sky-400/30"
              title="สลับไปยังโมเดลจำลอง 3 มิติ (Diorama)"
            >
              <Compass className="w-4 h-4" />
              <span>🌊 โมเดลจำลอง 3 มิติ (3D Diorama)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. สรุปตัวเลขผลลัพธ์หลัก 3 ค่า (Core Scientific Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/15 border border-amber-500/30 shadow-lg">
          <span className="text-xs font-medium text-amber-300 block">พื้นที่น้ำเพิ่มที่ตรวจพบจริง</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl md:text-3xl font-bold text-white font-mono">{SENTINEL_METRICS.addedWaterKm2}</span>
            <span className="text-xs font-semibold text-amber-200">ตร.กม.</span>
          </div>
          <span className="text-xs text-amber-300/80 mt-1 block">ประมาณ ~{SENTINEL_METRICS.addedWaterRai} ไร่</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <span className="text-xs font-medium text-slate-400 block">พื้นที่เปรียบเทียบได้จริง</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl md:text-3xl font-bold text-sky-400 font-mono">{SENTINEL_METRICS.comparablePercentage}%</span>
            <span className="text-xs text-slate-400">({SENTINEL_METRICS.comparableExtentKm2} ตร.กม.)</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">คัดกรองพิกเซลไร้เมฆและเงา</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <span className="text-xs font-medium text-slate-400 block">พื้นที่ประเมินไม่ได้ (ติดเมฆ)</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl md:text-3xl font-bold text-slate-300 font-mono">{SENTINEL_METRICS.unassessedPercentage}%</span>
            <span className="text-xs text-slate-400">({SENTINEL_METRICS.unassessedExtentKm2} ตร.กม.)</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">กรองด้วย Cloud Score+</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <span className="text-xs font-medium text-slate-400 block">ขนาดกริดความละเอียด</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl md:text-3xl font-bold text-emerald-400 font-mono">{SENTINEL_METRICS.gridResolutionM} × {SENTINEL_METRICS.gridResolutionM}</span>
            <span className="text-xs text-slate-400">เมตร / พิกเซล</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">492 × 251 พิกเซล (UTM 47N)</span>
        </div>
      </div>

      {/* 3. แถบสลับแท็บฟังก์ชันหลัก */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'compare'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>01 / สไลด์เปรียบเทียบ ก่อน ↔ หลัง</span>
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'zones'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>02 / ผลวิเคราะห์แยกโซน & ชุมชน</span>
        </button>
        <button
          onClick={() => setActiveTab('methods')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'methods'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>03 / วิธีคำนวณ GIS (MNDWI)</span>
        </button>
      </div>

      {/* เนื้อหาแท็บ 1: สไลด์เปรียบเทียบ ก่อน ↔ หลัง (Interactive Before-After Swipe) */}
      {activeTab === 'compare' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            {/* กล่องเปรียบเทียบภาพพร้อมเส้นแบ่ง (Swipe Slider Container) */}
            <div className="relative w-full aspect-[492/251] rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 select-none">
              {/* ภาพก่อนน้ำท่วม: 5 ก.ย. 2567 */}
              <img
                src="/assets/before_10m.jpg"
                alt="ภาพดาวเทียม Sentinel-2 วันที่ 5 ก.ย. 2567 (ก่อนท่วม)"
                className="absolute inset-0 w-full h-full object-fill [image-rendering:pixelated]"
              />

              {/* ภาพหลังน้ำท่วม: 15 ก.ย. 2567 (Clip ด้วย Split Percent) */}
              <img
                src="/assets/after_flood_10m.jpg"
                alt="ภาพดาวเทียม Sentinel-2 วันที่ 15 ก.ย. 2567 (หลังท่วม)"
                className="absolute inset-0 w-full h-full object-fill [image-rendering:pixelated]"
                style={{
                  clipPath: `inset(0 calc(100% - ${splitPercent}%) 0 0)`
                }}
              />

              {/* เส้นแบ่งกึ่งกลาง (Split Divider Line) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none transform -translate-x-1/2 z-20 flex items-center justify-center"
                style={{ left: `${splitPercent}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-bold text-xs select-none">
                  ↔
                </div>
              </div>

              {/* ป้ายกำกับ 2 ฝั่ง */}
              <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-emerald-400 font-bold text-xs border border-emerald-500/30">
                5 ก.ย. (ก่อนท่วม)
              </span>
              <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-amber-400 font-bold text-xs border border-amber-500/30">
                15 ก.ย. (หลังท่วม)
              </span>
            </div>

            {/* แถบควบคุม Slider และปุ่มทางลัด */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>เลื่อนเส้นแบ่งภาพเปรียบเทียบ</span>
                <span className="font-mono text-sky-400">{splitPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setSplitPercent(0)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    splitPercent === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  ดูภาพก่อนเต็มภาพ (5 ก.ย.)
                </button>
                <button
                  onClick={() => setSplitPercent(50)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    splitPercent === 50 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  วางทับครึ่งต่อครึ่ง (50:50)
                </button>
                <button
                  onClick={() => setSplitPercent(100)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    splitPercent === 100 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  ดูภาพหลังเต็มภาพ (15 ก.ย.)
                </button>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: แผนที่จำแนกน้ำและตัวกรองพื้นที่ (Interactive Classified Map) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>จำแนกน้ำที่เพิ่มขึ้น (Sentinel-2 Classification)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ประมวลผลการจำแนกผิวน้ำที่แผ่ขยายออกนอกลำน้ำเดิม
              </p>
            </div>

            {/* กล่องเลือกพื้นที่/โซน */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">เลือกพื้นที่วิเคราะห์</label>
              <select
                value={selectedChoiceIdx}
                onChange={(e) => setSelectedChoiceIdx(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {SENTINEL_CHOICES.map((c, i) => (
                  <option key={i} value={i}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Checkbox แสดง Overlay ผลวิเคราะห์ */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-500"
              />
              <span className="text-xs font-semibold text-slate-200">แสดงชั้นข้อมูลจำแนกน้ำ (MNDWI Overlay)</span>
            </label>

            {/* ภาพ Raster + Canvas Overlay */}
            <div className="relative w-full aspect-[492/251] rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <img
                src="/assets/after_flood_10m.jpg"
                alt="แผนที่จำแนกน้ำ"
                className="absolute inset-0 w-full h-full object-fill [image-rendering:pixelated]"
              />
              <canvas
                ref={canvasRef}
                width={984}
                height={502}
                className="absolute inset-0 w-full h-full pointer-events-none [image-rendering:pixelated]"
              />
            </div>

            {/* คำอธิบายสัญลักษณ์สี (Legend) */}
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-orange-500"></span>
                <span>น้ำเพิ่มใหม่</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-600"></span>
                <span>ร่องน้ำเดิม</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-600 border border-slate-500"></span>
                <span>ประเมินไม่ได้ (เมฆ)</span>
              </span>
            </div>

            {/* ตัวเลขผลลัพธ์ของโซนที่เลือก */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 space-y-1">
              <span className="text-[10px] text-slate-400 block font-semibold">ผลคำนวณพื้นที่ที่เลือก:</span>
              <div className="text-base font-bold text-amber-400 font-mono">
                น้ำเพิ่ม {(currentChoice.area / 1e6).toFixed(4)} ตร.กม. &bull; {(currentChoice.area / 1600).toFixed(2)} ไร่
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                {currentChoice.note}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* เนื้อหาแท็บ 2: ผลวิเคราะห์แยกโซน & ชุมชน (Zones & Communities) */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          {/* ตารางเปรียบเทียบตามโซน 4 โซน (Z1 - Z4) */}
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>การกระจายตัวของน้ำท่วมจากตะวันตกไปตะวันออก (โซน Z1 - Z4)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SENTINEL_ZONES.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-4 rounded-xl border transition-all ${
                    zone.id === 'Z3'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-slate-900/70 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{zone.name.split(' (')[0]}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      zone.id === 'Z3' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {zone.pct}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-2">
                    {zone.addedKm2} <span className="text-xs text-slate-400 font-sans">ตร.กม.</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ~{zone.addedRai} ไร่
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                    {zone.note}
                  </p>
                  {onFlyToLocation && zone.center && (
                    <button
                      onClick={() => onFlyToLocation(zone.center, 15.2)}
                      className="w-full mt-2.5 py-1.5 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border border-sky-500/20"
                    >
                      <Compass className="w-3 h-3" />
                      <span>ส่องในโมเดล 3D</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 italic">
              * ข้อสังเกต: โซน Z3 (คุ้งน้ำกกตอนกลาง - บ้านท่าดอย) ได้รับผลกระทบสูงสุด คิดเป็น 51.2% ของพื้นที่น้ำท่วมทั้งหมดในกรอบศึกษา
            </p>
          </div>

          {/* การวิเคราะห์ระดับชุมชน (รัศมี 500 เมตร) */}
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>ผลกระทบในวงรัศมี 500 เมตรรอบจุดชุมชน (ข้อมูล GISTDA/DOPA)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SENTINEL_COMMUNITIES.map((com) => (
                <div key={com.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-700 space-y-2">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>{com.name}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {com.addedKm2} ตร.กม.
                  </div>
                  <div className="text-xs text-slate-400">
                    ~{com.addedRai} ไร่ ในรัศมี 500 ม.
                  </div>
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    {com.note}
                  </p>
                  {onFlyToLocation && com.center && (
                    <button
                      onClick={() => onFlyToLocation(com.center, 16.0)}
                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border border-emerald-500/20"
                    >
                      <Compass className="w-3 h-3" />
                      <span>ส่องในโมเดล 3D</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* เนื้อหาแท็บ 3: วิธีคำนวณทางวิทยาศาสตร์ (Methods & Science) */}
      {activeTab === 'methods' && (
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 max-w-4xl">
          <h3 className="font-bold text-base text-white">
            พื้นที่ 0.4975 ตร.กม. คำนวณอย่างไร?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
              <span className="font-bold text-sky-400 block">1. การจัดภาพให้ตรงกัน</span>
              <p className="text-slate-400 leading-relaxed">
                ภาพวันที่ 5 และ 15 ก.ย. ใช้กรอบเดียวกันบนระบบพิกัด UTM 47N (EPSG:32647) ขนาด 492 × 251 พิกเซล พิกเซลละ 10 × 10 เมตร หรือ 100 ตร.ม.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
              <span className="font-bold text-sky-400 block">2. การคัดกรองคุณภาพภาพ</span>
              <p className="text-slate-400 leading-relaxed">
                ใช้ Cloud Score+ และ SCL กรองเมฆ เงา และขอบพื้นที่ไม่แน่ชัด แล้วเปรียบเทียบเฉพาะพิกเซลที่ผ่านเกณฑ์ทั้งสองวัน
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
              <span className="font-bold text-sky-400 block">3. ดัชนีตรวจจับน้ำ (MNDWI & NDVI)</span>
              <p className="text-slate-400 leading-relaxed">
                ใช้สูตร MNDWI = (Green - SWIR) / (Green + SWIR) &gt; 0.10 และ NDVI &lt; 0.20 เพื่อแยกน้ำจากพืชและดินเปียก
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
              <span className="font-bold text-sky-400 block">4. การซ้อนทับและนับพื้นที่</span>
              <p className="text-slate-400 leading-relaxed">
                เลือกพิกเซลที่เป็นน้ำวันที่ 15 แต่ไม่เป็นน้ำวันที่ 5 ตัดกลุ่มเล็กกว่า 9 พิกเซล แล้วคูณด้วย 100 ตร.ม. ได้ผลลัพธ์สุทธิ 497,500 ตร.ม. (0.4975 ตร.กม.)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
