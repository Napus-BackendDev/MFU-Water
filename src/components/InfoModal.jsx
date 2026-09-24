import React from 'react';
import { X, HelpCircle, MousePointer, ShieldCheck, Mountain, Layers } from 'lucide-react';

export default function InfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 text-slate-100 space-y-4 border-sky-500/30 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              คู่มือการใช้งาน MFU Water 3D
            </h3>
            <p className="text-xs text-slate-400">แบบจำลองภูมิประเทศและระดับน้ำท่วมลุ่มน้ำแม่กก</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-3.5 text-xs text-slate-300">
          {/* Navigation Controls */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <h4 className="font-semibold text-sky-400 flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              การควบคุมมุมกล้อง 3D (Mouse & Touch)
            </h4>
            <ul className="space-y-1.5 text-slate-300 pl-1">
              <li>• <strong>เลื่อนแผนที่:</strong> คลิกซ้ายค้างแล้วลาก (Left Click + Drag)</li>
              <li>• <strong>ปรับมุมเอียง & หมุน 3D (Pitch / Bearing):</strong> คลิกขวาค้างแล้วลาก หรือกด <code>Ctrl</code> + คลิกซ้ายลาก</li>
              <li>• <strong>ซูมเข้า-ออก:</strong> หมุนปุ่มลูกกลิ้งเมาส์ (Scroll Wheel)</li>
              <li>• <strong>บนมือถือ/แท็บเล็ต:</strong> ใช้ 2 นิ้วหมุนและเลื่อนขึ้น-ลงเพื่อปรับมุมเอียง 3D</li>
            </ul>
          </div>

          {/* Map Technology */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <h4 className="font-semibold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              ระบบแผนที่ 3D ฟรี 100% (No API Cost)
            </h4>
            <p className="leading-relaxed">
              โปรเจกต์นี้ทำงานด้วย <strong>MapLibre GL JS 3D</strong> ผสานข้อมูลความสูงภูมิประเทศจริง (Global Digital Elevation Model - Terrarium) และภาพถ่ายดาวเทียมความละเอียดสูงจาก <strong>ESRI World Imagery</strong> โดยไม่มีค่าใช้จ่าย API และไม่ต้องผูกบัตรเครดิต
            </p>
          </div>

          {/* Simulation Model */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <h4 className="font-semibold text-amber-400 flex items-center gap-2">
              <Mountain className="w-4 h-4" />
              การจำลองระดับน้ำท่วม (Flood Simulation)
            </h4>
            <p className="leading-relaxed">
              เมื่อปรับ Slider ระดับน้ำ ระบบจะคำนวณการขยายตัวของผืนน้ำท่วมตามความสูงของภูมิประเทศ (Elevation MSL) และแสดงระดับความเสี่ยงพร้อมอัตราการไหลประมาณการ เพื่อใช้เป็นเครื่องมือช่วยศึกษาและวางแผนการบริหารจัดการน้ำ
            </p>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all shadow-lg shadow-sky-500/20 active:scale-98"
          >
            เข้าใจแล้ว เริ่มสำรวจ 3D
          </button>
        </div>
      </div>
    </div>
  );
}
