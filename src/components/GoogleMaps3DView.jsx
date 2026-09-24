import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Key,
  ExternalLink,
  Info,
  Sparkles,
  ArrowLeft,
  Eye,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { THATON_CENTER } from '../data/thatonFloodData';

export default function GoogleMaps3DView({ onBack, floodStage = 0 }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_maps_3d_api_key') || '');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  // พิกัดแม่น้ำกก ต.ท่าตอน
  const lat = THATON_CENTER[1]; // 20.0619
  const lng = THATON_CENTER[0]; // 99.3603

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    localStorage.setItem('google_maps_3d_api_key', apiKey.trim());
    setIsKeySaved(true);
    loadGoogle3D(apiKey.trim());
  };

  const loadGoogle3D = (key) => {
    setLoadError(null);
    setIsLoaded(false);

    // ตรวจสอบว่า script ถูกโหลดไปแล้วหรือไม่
    const existingScript = document.getElementById('google-maps-3d-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-3d-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=alpha&libraries=maps3d`;
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <gmp-map-3d
            center="${lat},${lng},520"
            tilt="65"
            heading="35"
            range="1500"
            style="width: 100%; height: 100%; display: block;"
          ></gmp-map-3d>
        `;
      }
    };

    script.onerror = () => {
      setLoadError('ไม่สามารถโหลด Google Maps 3D ได้ กรุณาตรวจสอบ API Key และเปิดใช้งาน Maps JavaScript API & Map Tiles API');
    };

    document.head.appendChild(script);
  };

  useEffect(() => {
    if (apiKey) {
      loadGoogle3D(apiKey);
    }
  }, []);

  // ลิงก์ตรงไปยัง Google Earth 3D Web สำหรับดูแม่น้ำกก ต.ท่าตอน แบบ 3 มิติ Photorealistic ทันที
  const googleEarthUrl = `https://earth.google.com/web/@${lat},${lng},460a,1200d,35y,58h,65t,0r`;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Prompt',sans-serif] text-slate-100">
      {/* Top Banner (เหมือนในภาพของผู้ใช้) */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-slate-200">
            Google Maps JavaScript API 3D Maps (Alpha Mode)
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            &bull; WebGL Photorealistic 3D Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={googleEarthUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm"
          >
            <span>เปิดดูใน Google Earth 3D Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onBack}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับสู่แผนที่หลัก</span>
          </button>
        </div>
      </div>

      {/* 3D Map Container */}
      <div ref={containerRef} className="w-full h-full pt-10">
        {!apiKey && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-700 max-w-lg w-full text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 mx-auto flex items-center justify-center border border-sky-500/30 shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  โหมด Google Maps JavaScript API 3D Maps (Alpha)
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  นี่คือเทคโนโลยีเดียวกับภาพตัวอย่างของคุณ (Google Maps 3D WebGL พร้อมแท็ก <code>&lt;gmp-map-3d&gt;</code>)
                </p>
              </div>

              {/* คำแนะนำเรื่อง Key ฟรี */}
              <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 text-left text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>วิธีรับ Google Maps API Key ฟรี (โควต้าฟรี $200 ทุกเดือน):</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Google มีโควต้า <strong>ฟรี $200/เดือน (ประมาณ 7,000 บาท)</strong> ให้ทุกคนโดยอัตโนมัติ สำหรับใช้งาน Maps & 3D Tiles ฟรีหลายหมื่นครั้งต่อเดือน:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
                  <li>เข้า Google Cloud Console: <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">console.cloud.google.com</a></li>
                  <li>กด <strong>Create Credentials &rarr; API key</strong> (จะได้คีย์ขึ้นต้นด้วย <code>AIzaSy...</code>)</li>
                  <li>ไปที่แท็บ APIs & Services &rarr; เปิดใช้งาน <strong>Maps JavaScript API</strong> และ <strong>Map Tiles API</strong></li>
                </ol>
              </div>

              <form onSubmit={handleSaveKey} className="space-y-3 pt-1">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ใส่ Google Maps API Key ของคุณ:
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs font-mono p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Key className="w-4 h-4" />
                  <span>บันทึกและเริ่มแสดงผล Google 3D Maps</span>
                </button>
              </form>

              {/* ทางเลือกฟรี 100% โดยไม่ต้องใช้ Key ใดๆ */}
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-left text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>ถ้าไม่อยากผูกบัตรหรือไม่ต้องการขอ Key — ใช้ 2 ทางเลือกฟรี 100% นี้ได้ทันที:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onBack}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-md transition-all"
                  >
                    <span>🛰️ กลับไปหน้าหลัก (ดาวเทียม 3D)</span>
                    <span className="text-[10px] text-sky-200 font-normal">ฟรี 100% มีเขาเว้าโค้งและแม่น้ำกก</span>
                  </button>

                  <a
                    href={googleEarthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-md transition-all"
                  >
                    <span className="flex items-center gap-1">
                      <span>🌍 เปิด Google Earth 3D Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                    <span className="text-[10px] text-emerald-200 font-normal">ฟรี 100% ของ Google ไม่ต้องใส่ Key</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/40 max-w-md text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-xs text-rose-300 font-semibold">{loadError}</p>
              <button
                onClick={() => setApiKey('')}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold hover:bg-slate-700"
              >
                ลองใส่ Key ใหม่
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating HUD Information */}
      <div className="absolute bottom-5 left-5 z-40 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1 shadow-xl">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Compass className="w-4 h-4" />
          <span>ศูนย์กลาง: แม่น้ำกก &bull; ต.ท่าตอน &bull; วัดท่าตอน</span>
        </div>
        <p className="text-[11px] text-slate-400">
          พิกัด: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E &bull; มุมเอียง 65° &bull; ทิศทาง 35°
        </p>
      </div>
    </div>
  );
}
