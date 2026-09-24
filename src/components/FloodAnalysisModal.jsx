import React, { useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Droplets,
  Sliders,
  Compass,
  ZoomIn
} from 'lucide-react';
import {
  SENTINEL_METRICS,
  SENTINEL_ZONES,
  SENTINEL_COMMUNITIES
} from '../data/sentinelFloodAnalysisData';
import ImageZoomLightbox from './ImageZoomLightbox';

export default function FloodAnalysisModal({ isOpen, onClose }) {
  const [zoomImage, setZoomImage] = useState(null); // 'before' | 'after' | null

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 font-['Prompt',sans-serif]">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  บทความวิเคราะห์ทางวิชาการ GIS & GEE
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>เหตุการณ์ ก.ย. 2567</span>
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mt-1">
                รายงานวิเคราะห์การเปลี่ยนแปลงพื้นที่น้ำท่วมขังลุ่มน้ำกก ต.ท่าตอน - บ้านท่าดอย
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Article Body */}
        <div className="overflow-y-auto p-5 md:p-8 space-y-6 text-slate-300 text-xs md:text-sm leading-relaxed">
          
          {/* Executive Summary Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/30 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm md:text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>บทสรุปสาระสำคัญ (Executive Summary)</span>
            </div>
            <p className="text-slate-200">
              จากการวิเคราะห์ข้อมูลภาพถ่ายดาวเทียมความละเอียดสูง <strong>Sentinel-2 MSI</strong> ร่วมกับแพลตฟอร์ม <strong>Google Earth Engine (GEE)</strong> ระหว่างวันที่ <strong>5 ก.ย. 2567 (สภาพปกติก่อนน้ำท่วม)</strong> และวันที่ <strong>15 ก.ย. 2567 (หลังมวลน้ำหลากสูงสุด)</strong> พบว่าพื้นที่ลุ่มน้ำกกบริเวณตำบลท่าตอนและบ้านท่าดอย อำเภอแม่อาย จังหวัดเชียงใหม่ มีพื้นที่น้ำท่วมขังเพิ่มขึ้นสุทธิถึง <strong>0.4975 ตารางกิโลเมตร หรือประมาณ 310.94 ไร่</strong>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-sky-500/20 text-center">
              <div className="p-2 rounded-xl bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">น้ำท่วมเพิ่มสุทธิ</span>
                <span className="font-bold text-amber-400 text-base font-mono">0.4975</span>
                <span className="text-[10px] text-slate-400 block">ตร.กม. (~310 ไร่)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">พื้นที่เปรียบเทียบได้</span>
                <span className="font-bold text-sky-400 text-base font-mono">90.14%</span>
                <span className="text-[10px] text-slate-400 block">11.13 ตร.กม. ไร้เมฆ</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">โซนที่ท่วมหนักสุด</span>
                <span className="font-bold text-rose-400 text-base font-mono">Z3 ท่าดอย</span>
                <span className="text-[10px] text-slate-400 block">51.2% ของน้ำทั้งหมด</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">ความละเอียดกริด</span>
                <span className="font-bold text-emerald-400 text-base font-mono">10 x 10 ม.</span>
                <span className="text-[10px] text-slate-400 block">UTM Zone 47N</span>
              </div>
            </div>
          </div>

          {/* Section 1: ภาพหลักฐานดาวเทียม Before vs After */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">01.</span>
              <span>หลักฐานภาพถ่ายดาวเทียมสีจริง (Sentinel-2 B4/B3/B2)</span>
            </h3>
            <p className="text-slate-400">
              ภาพถ่ายดาวเทียมแสดงให้เห็นความเปลี่ยนแปลงของสภาพภูมิประเทศอย่างชัดเจน จากสภาพลำน้ำกกที่มีร่องน้ำแคบตามธรรมชาติในวันที่ 5 ก.ย. กลายสภาพเป็นมวลน้ำสีโคลนขนาดใหญ่ที่เอ่อล้นทะลักตลิ่งเข้าท่วมแปลงเกษตรและบ้านเรือนราษฎรในวันที่ 15 ก.ย.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div
                  onClick={() => setZoomImage('before')}
                  className="relative rounded-2xl overflow-hidden border border-slate-700 aspect-[16/10] bg-slate-950 group cursor-zoom-in hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                  title="คลิกเพื่อซูมดูภาพขนาดใหญ่ระดับพิกเซล"
                >
                  <img
                    src="/assets/diorama_before_full.jpg"
                    alt="สภาพก่อนน้ำท่วม 5 ก.ย. 2567"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                    🟢 ก่อนน้ำท่วม: 5 ก.ย. 2567 (11:02 น.)
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-sm text-[10px] font-bold text-white border border-slate-700/80 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 group-hover:bg-emerald-600 transition-all shadow-md">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-300 group-hover:text-white" />
                    <span>คลิกเพื่อซูมขยาย</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ร่องน้ำกกตามปกติ กว้างประมาณ 40-60 เมตร มีผิวน้ำเดิม 0.3082 ตร.กม. สันดอนทรายและแปลงเกษตรริมตลิ่งยังแห้งเป็นปกติ
                </p>
              </div>

              <div className="space-y-2">
                <div
                  onClick={() => setZoomImage('after')}
                  className="relative rounded-2xl overflow-hidden border border-slate-700 aspect-[16/10] bg-slate-950 group cursor-zoom-in hover:border-rose-500/60 hover:shadow-lg hover:shadow-rose-500/10 transition-all"
                  title="คลิกเพื่อซูมดูภาพขนาดใหญ่ระดับพิกเซล"
                >
                  <img
                    src="/assets/diorama_after_full.jpg"
                    alt="สภาพหลังน้ำท่วม 15 ก.ย. 2567"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold text-rose-400 border border-rose-500/30">
                    🔴 หลังน้ำท่วม: 15 ก.ย. 2567 (11:02 น.)
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-sm text-[10px] font-bold text-white border border-slate-700/80 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 group-hover:bg-rose-600 transition-all shadow-md">
                    <ZoomIn className="w-3.5 h-3.5 text-rose-300 group-hover:text-white" />
                    <span>คลิกเพื่อซูมขยาย</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  มวลน้ำกกหลากท่วมเต็มคันตลิ่ง ผิวน้ำเพิ่มขึ้นเป็น 0.8120 ตร.กม. น้ำท่วมขังพื้นที่เกษตรและชุมชนบ้านท่าดอยเป็นบริเวณกว้าง
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: ระเบียบวิธีวิจัยและเกณฑ์วิทยาศาสตร์ (GIS Methodology) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">02.</span>
              <span>ระเบียบวิธีวิจัยทางวิทยาศาสตร์ GIS & Remote Sensing</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>1. ดัชนีตรวจจับผิวน้ำดัดแปลง (MNDWI)</span>
                </span>
                <p className="text-slate-300 text-xs">
                  ใช้สูตร <code>MNDWI = (Green - SWIR) / (Green + SWIR) &gt; 0.10</code> ในการแยกแยะผิวน้ำที่เต็มไปด้วยตะกอนขุ่นออกจากดินเปียกได้อย่างแม่นยำสูงกว่าดัชนี NDWI ดั้งเดิม
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. การตัดสิ่งรบกวนด้วย NDVI และความลาดชัน</span>
                </span>
                <p className="text-slate-300 text-xs">
                  กำหนดเงื่อนไข <code>NDVI &lt; 0.20</code> ร่วมกับ Digital Elevation Model (DEM) เพื่อตัดเงาของต้นไม้และร่มเงาของขุนเขาดอยท่าตอน ไม่ให้ถูกประเมินผิดพลาดเป็นผิวน้ำ
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>3. อัลกอริทึมคัดกรองเมฆ Cloud Score+</span>
                </span>
                <p className="text-slate-300 text-xs">
                  เปรียบเทียบเฉพาะพิกเซลที่ผ่านเกณฑ์ไร้เมฆและเงาเมฆทั้งสองวัน ส่งผลให้มีพื้นที่ประเมินได้ถึง 90.14% (11.1313 จาก 12.3492 ตร.กม.) และมีพื้นที่ประเมินไม่ได้เพียง 9.86%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>4. การคำนวณพื้นที่สุทธิ (Net Difference)</span>
                </span>
                <p className="text-slate-300 text-xs">
                  คัดเลือกเฉพาะพิกเซลที่เป็นน้ำในวันที่ 15 แต่ไม่เป็นน้ำในวันที่ 5 ตัดกลุ่มพิกเซลเดี่ยวที่มีขนาดเล็กกว่า 9 พิกเซล (Noise Filter) ได้ผลลัพธ์สุทธิ 497,500 ตารางเมตร
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: การจำแนกตามโซน Z1 - Z4 */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">03.</span>
              <span>ผลการวิเคราะห์จำแนกตามโซนภูมิประเทศ (Z1 - Z4)</span>
            </h3>
            <p className="text-slate-400">
              เมื่อแบ่งพื้นที่ศึกษาออกเป็น 4 โซนย่อยจากทิศตะวันตกไปทิศตะวันออก พบว่าปริมาณน้ำท่วมขังมีการกระจุกตัวในจุดที่เป็นคุ้งน้ำและที่ราบลุ่มต่ำอย่างมีนัยสำคัญ:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SENTINEL_ZONES.map(z => (
                <div
                  key={z.id}
                  className={`p-3.5 rounded-2xl border ${
                    z.id === 'Z3'
                      ? 'bg-rose-950/40 border-rose-500/40'
                      : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{z.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      z.id === 'Z3' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {z.pct}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-semibold">{z.name.split(' (')[0]}</div>
                  <div className="text-lg font-mono font-bold text-sky-400 mt-2">
                    {z.addedKm2 > 0 ? `${z.addedKm2} ตร.กม.` : '0 ตร.กม.'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {z.addedRai > 0 ? `~${z.addedRai} ไร่` : 'ไม่มีน้ำท่วมขัง'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700/60">
                    {z.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>ข้อสังเกตเชิงอุทกวิทยา:</strong> โซน Z3 (โค้งลำน้ำกกตอนกลาง - บ้านท่าดอย) ได้รับผลกระทบหนักที่สุด คิดเป็น 51.2% ของพื้นที่น้ำท่วมทั้งหมด เนื่องจากเป็นจุดที่ลำน้ำกกโค้งหักศอก ปะทะกับสันเขาดอยท่าตอน ทำให้มวลน้ำชะลอความเร็วและเอ่อล้นทะลักเข้าสู่ที่ราบลุ่มสองฝั่งอย่างรวดเร็ว
              </div>
            </div>
          </div>

          {/* Section 4: ข้อเสนอแนะเชิงนโยบาย */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">04.</span>
              <span>ข้อเสนอแนะเชิงวิศวกรรมและการบริหารจัดการลุ่มน้ำกก</span>
            </h3>
            <ul className="space-y-2 list-disc list-inside text-slate-300">
              <li>
                <strong>การสร้างแนวคันชะลอน้ำและพื้นที่แก้มลิงธรรมชาติ:</strong> ในพื้นที่โซน Z3 บ้านท่าดอย เพื่อรองรับน้ำหลากก่อนทะลักเข้าสู่เขตเศรษฐกิจสะพานท่าตอน
              </li>
              <li>
                <strong>การติดตั้งระบบเซนเซอร์วัดระดับน้ำ Real-time อัตโนมัติ:</strong> บริเวณสะพานท่าตอน (จุดเชื่อม ทล.107) เพื่อแจ้งเตือนประชาชนล่วงหน้าอย่างน้อย 3-6 ชั่วโมง
              </li>
              <li>
                <strong>การขุดลอกสันดอนทรายและขจัดสิ่งกีดขวางทางน้ำ:</strong> บริเวณช่วงโค้งลำน้ำกก เพื่อเพิ่มประสิทธิภาพการระบายน้ำหลากลงสู่พื้นที่ตอนล่างของจังหวัดเชียงราย
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            แหล่งข้อมูล: Copernicus Sentinel-2 MSI · Google Earth Engine · GISTDA
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs md:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Fullscreen Interactive Zoom Lightbox */}
      <ImageZoomLightbox
        isOpen={!!zoomImage}
        initialImage={zoomImage || 'before'}
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
}
