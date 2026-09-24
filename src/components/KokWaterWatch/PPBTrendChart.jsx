import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ARSENIC_LEVELS } from '../../data/waterWatchData';

/**
 * ดึงชุดข้อมูล PPB เรียงตามลำดับเวลาจากอดีตไปหาปัจจุบัน (Oldest -> Newest)
 */
export function getPPBTimeSeries(items = []) {
  if (!items || items.length === 0) return [];

  // เรียงลำดับจากเก่าไปใหม่ เพื่อให้กราฟไหลจากซ้ายไปขวา
  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.collection_time || a.created_at || a.timestamp || 0).getTime();
    const tB = new Date(b.collection_time || b.created_at || b.timestamp || 0).getTime();
    return tA - tB;
  });

  return sorted.map((it, idx) => {
    let ppb = null;
    const asObj = it.measurements?.arsenic;
    if (asObj?.value !== undefined && asObj?.value !== null && !isNaN(Number(asObj.value))) {
      ppb = Number(asObj.value);
    } else if (asObj?.level !== undefined && asObj?.level !== null) {
      const cfg = ARSENIC_LEVELS.find(l => l.level === Number(asObj.level));
      ppb = cfg ? cfg.ppb : 0;
    } else if (it.arsenic !== undefined && !isNaN(Number(it.arsenic))) {
      ppb = Number(it.arsenic);
    } else if (it.as !== undefined && !isNaN(Number(it.as))) {
      ppb = Number(it.as);
    } else if (it.arsenic_ppb !== undefined && !isNaN(Number(it.arsenic_ppb))) {
      ppb = Number(it.arsenic_ppb);
    }

    const d = new Date(it.collection_time || it.created_at || it.timestamp || Date.now());
    const validDate = !isNaN(d.getTime());
    const dateLabel = validDate
      ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      : `#${idx + 1}`;
    const timeLabel = validDate
      ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';
    const fullDateLabel = validDate
      ? `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} เวลา ${timeLabel} น.`
      : '-';

    const numPpb = ppb !== null && !isNaN(ppb) ? Number(ppb) : 0;
    const isDanger = numPpb > 50;
    const isWatch = numPpb > 10 && !isDanger;
    const isSafe = !isDanger && !isWatch;

    return {
      index: idx + 1,
      id: it.record_id || it.id || `pt-${idx}`,
      sampleCode: it.sample_code || `REC-${idx + 1}`,
      ppb: numPpb,
      timestamp: validDate ? d.getTime() : idx,
      dateLabel,
      timeLabel,
      fullDateLabel,
      collector: it.collector?.name || (typeof it.collector === 'string' ? it.collector : 'อาสาสมัคร'),
      notes: it.sample_nature?.notes || '',
      isDanger,
      isWatch,
      isSafe,
      color: isDanger ? '#e11d48' : isWatch ? '#f59e0b' : '#059669'
    };
  });
}

/**
 * คอมโพเนนต์กราฟแสดงการขึ้น-ลงของค่าสารหนู (PPB Trend Chart)
 * ใช้งานได้ทั้งใน Popover Card และในหน้าต่าง Modal
 */
export default function PPBTrendChart({
  items = [],
  title = 'กราฟขึ้น-ลงของค่าสารหนู (PPB)',
  isCompact = false,
  className = ''
}) {
  const series = getPPBTimeSeries(items);
  const [activeIdx, setActiveIdx] = useState(null);

  if (series.length === 0) {
    return null;
  }

  // คำนวณค่าทางสถิติ
  const values = series.map(s => s.ppb);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));

  // แนวโน้มเปรียบเทียบระหว่างจุดแรกและจุดล่าสุด
  const firstVal = series[0].ppb;
  const lastVal = series[series.length - 1].ppb;
  const diffVal = Number((lastVal - firstVal).toFixed(1));
  const trend = diffVal > 0 ? 'up' : diffVal < 0 ? 'down' : 'flat';

  // พารามิเตอร์พื้นที่วาดกราฟ (SVG ViewBox)
  const svgWidth = isCompact ? 330 : 540;
  const svgHeight = isCompact ? 135 : 180;
  const paddingLeft = isCompact ? 34 : 45;
  const paddingRight = isCompact ? 20 : 30;
  const paddingTop = isCompact ? 20 : 25;
  const paddingBottom = isCompact ? 28 : 34;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // กำหนดสเกล Y: ต้องครอบคลุมอย่างน้อย 0 ถึง 55 เพื่อให้เห็นเส้นเกณฑ์ WHO 10 และ เกณฑ์อันตราย 50
  const yCeil = Math.max(55, Math.ceil((maxVal * 1.25) / 10) * 10);
  const yFloor = 0;

  const getYCoord = (val) => {
    const clamped = Math.max(yFloor, Math.min(yCeil, val));
    const ratio = (clamped - yFloor) / (yCeil - yFloor);
    return paddingTop + (1 - ratio) * plotHeight;
  };

  const getXCoord = (idx) => {
    if (series.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (idx / (series.length - 1)) * plotWidth;
  };

  // พิกัดจุดทั้งหมด
  const points = series.map((s, idx) => ({
    ...s,
    x: getXCoord(idx),
    y: getYCoord(s.ppb)
  }));

  // สร้างเส้น Path และพื้นที่ Gradient Area
  const linePathD = points.length === 1
    ? `M ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y}`
    : `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;

  const bottomY = paddingTop + plotHeight;
  const areaPathD = points.length === 1
    ? ''
    : `M ${points[0].x.toFixed(1)},${bottomY} L ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${points[points.length - 1].x.toFixed(1)},${bottomY} Z`;

  // เส้นเกณฑ์มาตรฐาน
  const whoY = getYCoord(10);
  const dangerY = getYCoord(50);

  const selectedPoint = activeIdx !== null ? points[activeIdx] : points[points.length - 1];

  return (
    <div className={`p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 shadow-2xs space-y-2 select-none ${className}`}>
      {/* Header ของกราฟ */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#A6192E]/10 flex items-center justify-center text-[#A6192E]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
              {title}
            </h4>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
              ประวัติการตรวจวัด {series.length} ครั้ง (เรียงตามเวลา)
            </span>
          </div>
        </div>

        {/* ป้ายแนวโน้มการเปลี่ยนแปลง */}
        {series.length > 1 && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-mono border shadow-2xs ${
            trend === 'up'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : trend === 'down'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {trend === 'up' ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+{diffVal} ppb (เพิ่มขึ้น)</span>
              </>
            ) : trend === 'down' ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{diffVal} ppb (ลดลง)</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>คงที่ ({lastVal} ppb)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* SVG Canvas แสดงกราฟเส้นขึ้น-ลง */}
      <div className="relative w-full overflow-hidden rounded-xl bg-white border border-slate-100 p-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible block"
        >
          <defs>
            {/* Gradient พื้นใต้กราฟ */}
            <linearGradient id="ppbChartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A6192E" stopOpacity="0.30" />
              <stop offset="50%" stopColor="#DF8A20" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#DF8A20" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines แนวนอน */}
          <line
            x1={paddingLeft}
            y1={bottomY}
            x2={svgWidth - paddingRight}
            y2={bottomY}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* เส้นเกณฑ์มาตรฐาน WHO 10 ppb */}
          <line
            x1={paddingLeft}
            y1={whoY}
            x2={svgWidth - paddingRight}
            y2={whoY}
            stroke="#059669"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x={paddingLeft - 4}
            y={whoY + 3.5}
            textAnchor="end"
            fontSize={isCompact ? 9 : 10.5}
            fontWeight="bold"
            fill="#059669"
            fontFamily="monospace"
          >
            10
          </text>
          <text
            x={svgWidth - paddingRight + 4}
            y={whoY + 3.5}
            textAnchor="start"
            fontSize={isCompact ? 8.5 : 9.5}
            fontWeight="bold"
            fill="#059669"
          >
            WHO (10)
          </text>

          {/* เส้นเกณฑ์อันตราย 50 ppb */}
          {yCeil >= 50 && (
            <>
              <line
                x1={paddingLeft}
                y1={dangerY}
                x2={svgWidth - paddingRight}
                y2={dangerY}
                stroke="#e11d48"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x={paddingLeft - 4}
                y={dangerY + 3.5}
                textAnchor="end"
                fontSize={isCompact ? 9 : 10.5}
                fontWeight="bold"
                fill="#e11d48"
                fontFamily="monospace"
              >
                50
              </text>
              <text
                x={svgWidth - paddingRight + 4}
                y={dangerY + 3.5}
                textAnchor="start"
                fontSize={isCompact ? 8.5 : 9.5}
                fontWeight="bold"
                fill="#e11d48"
              >
                อันตราย (50)
              </text>
            </>
          )}

          {/* Label 0 ppb */}
          <text
            x={paddingLeft - 4}
            y={bottomY + 3}
            textAnchor="end"
            fontSize={isCompact ? 9 : 10}
            fill="#94a3b8"
            fontFamily="monospace"
          >
            0
          </text>

          {/* Area ใต้เส้นกราฟ */}
          {areaPathD && (
            <path d={areaPathD} fill="url(#ppbChartGradient)" />
          )}

          {/* เส้นกราฟเชื่อมต่อจุด (Line Path) */}
          <path
            d={linePathD}
            fill="none"
            stroke="#A6192E"
            strokeWidth={isCompact ? '2.5' : '3'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* จุดข้อมูลแต่ละครั้ง (Circles with Hit Target) */}
          {points.map((p, idx) => {
            const isHovered = activeIdx === idx;
            return (
              <g
                key={p.id || idx}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                {/* วงแหวนขยายเมื่อคลิกหรือชี้ */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isCompact ? 9 : 11}
                    fill={p.color}
                    opacity="0.25"
                    className="animate-ping"
                  />
                )}

                {/* วงกลมหลักของจุดข้อมูล */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? (isCompact ? 6.5 : 8) : (isCompact ? 4.5 : 5.5)}
                  fill={p.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-150 drop-shadow-xs"
                />

                {/* ตัวเลขค่า PPB เหนือจุดข้อมูล */}
                <text
                  x={p.x}
                  y={p.y - (isCompact ? 8 : 10)}
                  textAnchor="middle"
                  fontSize={isCompact ? 10 : 12}
                  fontWeight="900"
                  fill="#1e293b"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {p.ppb}
                </text>

                {/* วันที่ใต้จุดข้อมูล */}
                <text
                  x={p.x}
                  y={bottomY + (isCompact ? 15 : 18)}
                  textAnchor="middle"
                  fontSize={isCompact ? 9 : 11}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#A6192E' : '#64748b'}
                  className="pointer-events-none"
                >
                  {p.dateLabel}
                </text>

                {/* Invisible hit target สำหรับแตะ/คลิกบนมือถือ */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCompact ? 16 : 20}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* แถบข้อมูลรายละเอียดของจุดที่เลือก (Selected Point Detail Card) */}
      {selectedPoint && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white shadow-2xs"
              style={{ backgroundColor: selectedPoint.color }}
            />
            <div className="min-w-0">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                <span>ครั้งที่ {selectedPoint.index}:</span>
                <span className="font-mono text-sm font-black text-[#A6192E]">
                  {selectedPoint.ppb} ppb
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  selectedPoint.isDanger
                    ? 'bg-rose-600 text-white'
                    : selectedPoint.isWatch
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {selectedPoint.isDanger ? 'เกินเกณฑ์' : selectedPoint.isWatch ? 'เฝ้าระวัง' : 'ปลอดภัย'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate font-mono">
                <span>{selectedPoint.fullDateLabel}</span>
                <span>• ผู้ตรวจ: {selectedPoint.collector}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* สรุปสถิติ 3 ช่อง (ต่ำสุด / เฉลี่ย / สูงสุด) */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
        <div className="py-1 px-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
          <span className="text-[10px] text-emerald-800 block font-semibold">ต่ำสุด (Min)</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-emerald-900">{minVal} ppb</span>
        </div>
        <div className="py-1 px-1.5 rounded-lg bg-slate-100 border border-slate-200">
          <span className="text-[10px] text-slate-600 block font-semibold">เฉลี่ย (Avg)</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">{avgVal} ppb</span>
        </div>
        <div className={`py-1 px-1.5 rounded-lg border ${
          maxVal > 50
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : maxVal > 10
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-[10px] block font-semibold opacity-80">สูงสุด (Max)</span>
          <span className="text-xs sm:text-sm font-bold font-mono">{maxVal} ppb</span>
        </div>
      </div>
    </div>
  );
}
