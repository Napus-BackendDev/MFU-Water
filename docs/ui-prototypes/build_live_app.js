// Build Production Mobile-First live-app.html with OpenStreetMap (OSM) Standard Tiles,
// Native Mobile Bottom Sheet, 4-Community Switcher,
// Water Quality, Flood & Evacuation layers (Ultra-simple for villagers).

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch';

// Read real evacuation data
const evacuationData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'public/evacuation/thaton.json'), 'utf8'));

// Read real flood simulation features
const floodDataRaw = JSON.parse(fs.readFileSync(path.join(projectRoot, 'public/flood-simulations/thaton-6.json'), 'utf8'));
const floodFeatures = floodDataRaw.potentialFeatures.slice(0, 35);

// 4 Communities Data
const communities = [
  {
    id: 'thaton',
    name: 'ท่าตอน',
    fullName: 'บ้านท่าตอน (เน้นหมู่ 3)',
    subdistrict: 'ต.ท่าตอน',
    district: 'อ.แม่อาย',
    province: 'จ.เชียงใหม่',
    riverZone: 'ต้นน้ำกก (เชียงใหม่)',
    center: [20.058, 99.361],
    zoomInner: 16,
    zoomOuter: 13,
    records: 129,
    statusText: 'น้ำปกติ ปลอดภัย',
    statusColor: '#2E7D32',
    desc: 'พื้นที่ต้นแบบ มีชุดสำรวจ 129 ครัวเรือน และแผนเผชิญเหตุ 9 หย่อมบ้าน'
  },
  {
    id: 'ruammit',
    name: 'รวมมิตร',
    fullName: 'บ้านกะเหรี่ยงรวมมิตร',
    subdistrict: 'ต.แม่ยาว',
    district: 'อ.เมือง',
    province: 'จ.เชียงราย',
    riverZone: 'กลางน้ำกก (เชียงราย)',
    center: [19.9605, 99.7082],
    zoomInner: 16,
    zoomOuter: 13,
    records: 24,
    statusText: 'น้ำปกติ ปลอดภัย',
    statusColor: '#2E7D32',
    desc: 'ชุมชนท่องเที่ยวล่องแพแม่น้ำกก และจุดเฝ้าระวังตะกอนผิวดิน'
  },
  {
    id: 'pongkhong',
    name: 'โป่งขาม / โป่งฮึ้ง',
    fullName: 'บ้านโป่งขาม / โป่งฮึ้ง',
    subdistrict: 'ต.ป่าตึง',
    district: 'อ.แม่จัน',
    province: 'จ.เชียงราย',
    riverZone: 'ปลายน้ำกก (เชียงแสน)',
    center: [20.3076, 100.2102],
    zoomInner: 16,
    zoomOuter: 13,
    records: 18,
    statusText: 'น้ำปกติ ปลอดภัย',
    statusColor: '#2E7D32',
    desc: 'พื้นที่เกษตรกรรมชลประทานและจุดตรวจวัดทางน้ำก่อนลงแม่น้ำโขง'
  },
  {
    id: 'pakingtai',
    name: 'ปากอิงใต้',
    fullName: 'บ้านปากอิงใต้ (หมู่ 16)',
    subdistrict: 'ต.ศรีดอนชัย',
    district: 'อ.เชียงของ',
    province: 'จ.เชียงราย',
    riverZone: 'ปลายน้ำกก-อิง (เชียงของ)',
    center: [20.203878, 100.449169],
    zoomInner: 16,
    zoomOuter: 13,
    records: 15,
    statusText: 'น้ำปกติ ปลอดภัย',
    statusColor: '#2E7D32',
    desc: 'จุดสบแม่น้ำอิงกับแม่น้ำโขง จุดตรวจคุณภาพน้ำข้ามแดน'
  }
];

// Generate Thaton 129 survey points
const sampleWaypoints = [];
const landmarkNames = [
  'ท่าน้ำวัดท่าตอน (หมู่ 3)', 'สะพานข้ามแม่น้ำกก', 'ท่าเรือท่องเที่ยวท่าตอน',
  'โรงเรียนบ้านท่าตอน', 'รพ.สต. ท่าตอน', 'ศาลาประชาคมหมู่ 3',
  'อู่ต่อเรือหางยาว', 'ฝายน้ำล้นท่าตอน', 'ประปาหมู่บ้านคุ้มล่าง',
  'บ่อน้ำบาดาลลุงสมชาย', 'บ่อน้ำบาดาลป้าจันทร์', 'น้ำถังครัวเรือน 042'
];

for (let i = 1; i <= 129; i++) {
  const code = `W-${String(i).padStart(3, '0')}`;
  const lat = 20.052 + (Math.sin(i * 1.7) * 0.007) + (i % 7) * 0.0012;
  const lon = 99.356 + (Math.cos(i * 1.3) * 0.009) + (i % 5) * 0.002;
  let ppb = 5;
  if (i === 12 || i === 48 || i === 89) ppb = 100;
  else if (i % 8 === 0) ppb = 30;
  else if (i % 13 === 0) ppb = 10;
  
  const source = i <= 91 ? 'น้ำถัง/ขวดบริโภค' : (i % 3 === 0 ? 'ประปาหมู่บ้าน' : (i % 2 === 0 ? 'บ่อบาดาล' : 'แม่น้ำกก'));
  const name = i <= landmarkNames.length ? landmarkNames[i - 1] : `จุดสำรวจครัวเรือน ${code} (${source})`;

  sampleWaypoints.push({
    id: code,
    code,
    name,
    ppb,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    source,
    date: '15 ต.ค. 2569 08:30 น.',
    safe: ppb <= 10,
    caution: ppb > 10 && ppb <= 50,
    danger: ppb > 50
  });
}

const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>น้ำกกใกล้บ้าน — MFU Kok Water Watch (Mobile First on OpenStreetMap)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    :root {
      --bg: #F5F4ED;
      --primary: #195640;
      --primary-dark: #113D2E;
      --primary-light: #E8F5E9;
      --text: #213E32;
      --text-muted: #556B60;
      --safe-green: #2E7D32;
      --warning-amber: #DE9922;
      --alert-red: #A33228;
      --card-bg: rgba(255, 255, 255, 0.98);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body {
      height: 100%;
      width: 100%;
      font-family: 'Noto Sans Thai', sans-serif;
      overflow: hidden;
      background: #000;
      color: var(--text);
    }

    #map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    /* TOP FLOATING NAVIGATION BAR (NATIVE MOBILE STYLE) */
    .top-mobile-nav {
      position: absolute;
      top: env(safe-area-inset-top, 12px);
      left: 12px;
      right: 12px;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    }
    .area-selector-pill {
      pointer-events: auto;
      background: #FFFFFF;
      border: 1.5px solid rgba(0,0,0,0.1);
      border-radius: 28px;
      padding: 8px 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      max-width: 70%;
      transition: all 0.2s;
    }
    .area-selector-pill:active { transform: scale(0.97); }
    .area-pin-icon { font-size: 18px; }
    .area-text-group { overflow: hidden; white-space: nowrap; }
    .area-main-name { font-size: 14px; font-weight: 800; color: var(--primary); text-overflow: ellipsis; overflow: hidden; }
    .area-sub-name { font-size: 10px; color: var(--text-muted); font-weight: 600; }
    .area-arrow { font-size: 12px; color: #888; margin-left: 2px; }

    .top-actions-right {
      pointer-events: auto;
      display: flex;
      gap: 6px;
    }
    .btn-circle-tool {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: #FFFFFF;
      border: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      color: var(--text);
    }
    .btn-circle-tool:active { transform: scale(0.94); }

    /* FLOATING ACTION BUTTON (FAB) FOR FARMER SURVEY */
    .fab-survey-btn {
      position: absolute;
      bottom: calc(76px + env(safe-area-inset-bottom, 12px));
      right: 14px;
      z-index: 1000;
      height: 60px;
      padding: 0 20px;
      border-radius: 30px;
      background: var(--warning-amber);
      color: #213E32;
      border: 2px solid #FFFFFF;
      box-shadow: 0 6px 24px rgba(222, 153, 34, 0.55);
      font-family: inherit;
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .fab-survey-btn:active { transform: scale(0.96); }
    .fab-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    /* BOTTOM FLOATING SUMMARY CARD (EXPANDABLE) */
    .bottom-summary-card {
      position: absolute;
      bottom: calc(76px + env(safe-area-inset-bottom, 12px));
      left: 14px;
      right: 210px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 20px;
      padding: 10px 14px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    @media (max-width: 600px) {
      .bottom-summary-card {
        right: 175px;
        padding: 8px 10px;
      }
    }
    .summary-badge-dot {
      width: 12px;
      height: 12px;
      border-radius: 6px;
      background: #2E7D32;
      flex-shrink: 0;
      box-shadow: 0 0 8px #2E7D32;
    }
    .summary-text-box { overflow: hidden; white-space: nowrap; }
    .summary-title { font-size: 13px; font-weight: 800; color: #1B5E20; text-overflow: ellipsis; overflow: hidden; }
    .summary-sub { font-size: 10px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; }

    /* MOBILE BOTTOM NAVIGATION BAR (MATCHING NUXT PRODUCTION APP) */
    .mobile-bottom-nav {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: #FFFFFF;
      border-top: 1px solid #E2E8F0;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 8px)) 8px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .nav-btn-tab {
      border: none;
      background: transparent;
      padding: 6px 4px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      cursor: pointer;
      font-family: inherit;
      color: #64748B;
      transition: all 0.15s;
    }
    .nav-btn-tab.active {
      color: var(--primary);
      background: #E8F5E9;
      font-weight: 700;
    }
    .nav-btn-tab .tab-icon { font-size: 19px; }
    .nav-btn-tab .tab-label { font-size: 11px; font-weight: 600; }

    /* BOTTOM SHEETS / SLIDE-UP DRAWERS */
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    .sheet-backdrop.open { display: flex; }
    .bottom-sheet {
      background: #FFFFFF;
      width: 100%;
      max-width: 600px;
      max-height: 85vh;
      border-radius: 28px 28px 0 0;
      padding: 16px 20px calc(24px + env(safe-area-inset-bottom, 16px)) 20px;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
      overflow-y: auto;
      animation: slideUp 0.25s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .sheet-handle {
      width: 44px;
      height: 5px;
      border-radius: 3px;
      background: #CBD5E1;
      margin: 0 auto 14px auto;
    }
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid #F1F5F9;
      padding-bottom: 10px;
    }
    .sheet-title { font-size: 18px; font-weight: 800; color: var(--primary); }

    /* COMMUNITY CARDS IN SHEET */
    .community-card {
      border: 1.5px solid #E2E8F0;
      border-radius: 16px;
      padding: 12px 14px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s;
    }
    .community-card.active {
      border-color: var(--primary);
      background: #F4FBF7;
    }
    .com-left { display: flex; align-items: center; gap: 12px; }
    .com-badge {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: #E8F5E9;
      color: #1B5E20;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
    }
    .com-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .com-sub { font-size: 11px; color: var(--text-muted); }
    .com-zone-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 10px;
      background: #EFF6FF;
      color: #1D4ED8;
    }

    /* FLOOD SLIDER DRAWER */
    .flood-slider-card {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 16px;
    }

    /* PINS */
    .farmer-pin {
      width: 22px;
      height: 22px;
      border-radius: 11px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
    }
    .farmer-pin.safe { background: #2E7D32; }
    .farmer-pin.caution { background: #DE9922; }
    .farmer-pin.danger { background: #A33228; animation: pulse 1.5s infinite; }
  </style>
</head>
<body>

  <!-- FULLSCREEN LEAFLET GOOGLE MAP -->
  <div id="map"></div>

  <!-- TOP MOBILE APP BAR -->
  <div class="top-mobile-nav">
    <!-- Clickable Area Pill -> Opens Community Selector Sheet -->
    <div class="area-selector-pill" onclick="openCommunitySheet()">
      <div class="area-pin-icon">📍</div>
      <div class="area-text-group">
        <div class="area-main-name" id="currentAreaName">บ้านท่าตอน (เน้นหมู่ 3)</div>
        <div class="area-sub-name" id="currentAreaSub">ต.ท่าตอน อ.แม่อาย • 129 จุดตรวจ</div>
      </div>
      <div class="area-arrow">▾</div>
    </div>

    <!-- Right Controls: Home Reset, GPS & Sound -->
    <div class="top-actions-right">
      <button class="btn-circle-tool" id="btnHome" onclick="resetToCenter()" title="กลับจุดศูนย์กลางหมู่บ้าน">
        🏠
      </button>
      <button class="btn-circle-tool" onclick="locateUser()" title="ตำแหน่งของฉัน">
        🎯
      </button>
      <button class="btn-circle-tool" onclick="openSoundSheet()" title="เสียงตามสาย">
        📢
      </button>
    </div>
  </div>

  <!-- BOTTOM SUMMARY CARD (AT A GLANCE) -->
  <div class="bottom-summary-card" onclick="openSummarySheet()">
    <div class="summary-badge-dot" id="todayDot"></div>
    <div class="summary-text-box">
      <div class="summary-title" id="todayTitle">น้ำกกวันนี้: ปลอดภัย</div>
      <div class="summary-sub" id="todaySub">ใช้อาบ ซักล้าง รดผักได้ตามปกติ (แตะดูเพิ่ม)</div>
    </div>
  </div>

  <!-- GIANT 60PX FLOATING SURVEY BUTTON FOR FARMERS -->
  <button class="fab-survey-btn" onclick="openSurveySheet()">
    <div class="fab-icon-box">📸</div>
    <span>ส่งผลตรวจน้ำ</span>
  </button>

  <!-- MOBILE BOTTOM NAVIGATION (3 ESSENTIAL BUTTONS FOR VILLAGERS) -->
  <nav class="mobile-bottom-nav">
    <button class="nav-btn-tab active" id="tab-water" onclick="switchTab('water')">
      <span class="tab-icon">🗺️</span>
      <span class="tab-label">คุณภาพน้ำ</span>
    </button>
    <button class="nav-btn-tab" id="tab-flood" onclick="switchTab('flood')">
      <span class="tab-icon">🌊</span>
      <span class="tab-label">น้ำท่วม</span>
    </button>
    <button class="nav-btn-tab" id="tab-evac" onclick="switchTab('evac')">
      <span class="tab-icon">🏃</span>
      <span class="tab-label">ทางหนีน้ำ</span>
    </button>
  </nav>

  <!-- ========================================================================= -->
  <!-- SHEET 1: COMMUNITY & TERRITORY SELECTOR SHEET -->
  <!-- ========================================================================= -->
  <div class="sheet-backdrop" id="sheetCommunity">
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div>
          <div class="sheet-title">📍 เลือกพื้นที่และอาณาเขตเป้าหมาย</div>
          <div style="font-size:12px; color:#64748B;">4 พื้นที่โครงการลุ่มน้ำกกตามข้อกำหนด (R01, R02)</div>
        </div>
        <button style="border:none; background:none; font-size:18px; color:#999; cursor:pointer;" onclick="closeSheet('sheetCommunity')">✕</button>
      </div>

      <!-- Scope Toggle: Inner (Zoom 16) vs Outer (Zoom 13) -->
      <div style="display:flex; background:#F1F5F9; border-radius:12px; padding:3px; margin-bottom:14px;">
        <button id="btnScopeInner" style="flex:1; border:none; background:#fff; color:#195640; font-weight:700; border-radius:10px; padding:8px; font-family:inherit; font-size:12px; cursor:pointer;" onclick="setZoomScope('inner')">
          🔍 ระดับชุมชน (Zoom 16x)
        </button>
        <button id="btnScopeOuter" style="flex:1; border:none; background:transparent; color:#64748B; font-weight:600; border-radius:10px; padding:8px; font-family:inherit; font-size:12px; cursor:pointer;" onclick="setZoomScope('outer')">
          🌐 ระดับตำบล/อำเภอ (Zoom 13x)
        </button>
      </div>

      <div id="communityListContainer">
        <!-- Rendered via JS -->
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- SHEET 2: CITIZEN 3-STEP SURVEY SHEET (FOR FARMERS) -->
  <!-- ========================================================================= -->
  <div class="sheet-backdrop" id="sheetSurvey">
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div>
          <div class="sheet-title">📝 ส่งผลตรวจน้ำของคุณ</div>
          <div style="font-size:12px; color:#64748B;" id="surveyAreaLabel">บ้านท่าตอน หมู่ 3 • อ.แม่อาย จ.เชียงใหม่</div>
        </div>
        <button style="border:none; background:none; font-size:18px; color:#999; cursor:pointer;" onclick="closeSheet('sheetSurvey')">✕</button>
      </div>

      <!-- Step 1: Color Strip Choice -->
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:12px; margin-bottom:12px;">
        <div style="font-size:13px; font-weight:700; color:#195640; margin-bottom:8px;">1. แผ่นตรวจของคุณเปลี่ยนเป็นสีอะไร? (แตะเลือก)</div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
          <button type="button" class="swatch-btn selected" onclick="selectColor(this, 5)" style="border:2px solid #2E7D32; border-radius:10px; background:#fff; padding:8px 4px; text-align:center; font-family:inherit;">
            <div style="height:24px; border-radius:6px; background:#DFF0D8; border:1px solid #468847; margin-bottom:4px;"></div>
            <div style="font-size:11px; font-weight:700; color:#1B5E20;">เขียวอ่อน</div>
            <div style="font-size:9px; color:#2E7D32;">ปลอดภัย</div>
          </button>
          <button type="button" class="swatch-btn" onclick="selectColor(this, 30)" style="border:1.5px solid #CBD5E1; border-radius:10px; background:#fff; padding:8px 4px; text-align:center; font-family:inherit;">
            <div style="height:24px; border-radius:6px; background:#F8E5B8; border:1px solid #D19C24; margin-bottom:4px;"></div>
            <div style="font-size:11px; font-weight:700; color:#213E32;">ส้มอ่อน</div>
            <div style="font-size:9px; color:#DE9922;">เฝ้าระวัง</div>
          </button>
          <button type="button" class="swatch-btn" onclick="selectColor(this, 100)" style="border:1.5px solid #CBD5E1; border-radius:10px; background:#fff; padding:8px 4px; text-align:center; font-family:inherit;">
            <div style="height:24px; border-radius:6px; background:#E89B58; border:1px solid #B85818; margin-bottom:4px;"></div>
            <div style="font-size:11px; font-weight:700; color:#213E32;">ส้มเข้ม</div>
            <div style="font-size:9px; color:#C45A10;">ห้ามดื่ม!</div>
          </button>
          <button type="button" class="swatch-btn" onclick="selectColor(this, 300)" style="border:1.5px solid #CBD5E1; border-radius:10px; background:#fff; padding:8px 4px; text-align:center; font-family:inherit;">
            <div style="height:24px; border-radius:6px; background:#7A4328; border:1px solid #4A2010; margin-bottom:4px;"></div>
            <div style="font-size:11px; font-weight:700; color:#213E32;">น้ำตาล-ดำ</div>
            <div style="font-size:9px; color:#A33228;">อันตราย</div>
          </button>
        </div>
      </div>

      <!-- Step 2: Photo Evidence -->
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:12px; margin-bottom:12px;">
        <div style="font-size:13px; font-weight:700; color:#195640; margin-bottom:8px;">2. ถ่ายรูปยืนยันผลตรวจ (กดรูปกล้อง)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div style="border:2px dashed #195640; background:#E8F5E9; border-radius:12px; padding:12px 6px; text-align:center; cursor:pointer;">
            <div style="font-size:22px;">📷</div>
            <div style="font-size:11px; font-weight:700; color:#195640;">แผ่นตรวจคู่แถบสี</div>
            <div style="font-size:9px; color:#2E7D32;">✓ แนบแล้ว</div>
          </div>
          <div style="border:2px dashed #CBD5E1; background:#fff; border-radius:12px; padding:12px 6px; text-align:center; cursor:pointer;">
            <div style="font-size:22px;">📷</div>
            <div style="font-size:11px; font-weight:700; color:#475569;">จุดที่ตักน้ำจริง</div>
            <div style="font-size:9px; color:#94A3B8;">แตะเพื่อถ่ายรูป</div>
          </div>
        </div>
      </div>

      <!-- Step 3: Name & Phone Number (Required for Internal Follow-up R05) -->
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:12px; margin-bottom:14px;">
        <div style="font-size:13px; font-weight:700; color:#195640; margin-bottom:8px;">3. ข้อมูลผู้ส่งตรวจ (สำหรับ อสม. ติดต่อกลับ)</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#334155; margin-bottom:3px;">👤 ชื่อ-นามสกุลผู้แจ้ง <span style="color:#DC2626;">*</span></label>
            <input type="text" id="surveyNameInput" placeholder="เช่น นายสมชาย ใจดี" value="สมชาย ใจดี" style="width:100%; height:42px; border-radius:10px; border:1.5px solid #CBD5E1; padding:0 12px; font-family:inherit; font-size:13px; background:#fff; color:#1E293B; outline:none; box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#334155; margin-bottom:3px;">📞 เบอร์โทรศัพท์มือถือ <span style="color:#DC2626;">*</span></label>
            <input type="tel" id="surveyPhoneInput" placeholder="เช่น 081-234-5678" value="081-987-6543" style="width:100%; height:42px; border-radius:10px; border:1.5px solid #CBD5E1; padding:0 12px; font-family:inherit; font-size:13px; background:#fff; color:#1E293B; outline:none; box-sizing:border-box;">
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button style="width:100%; height:54px; border-radius:16px; background:#195640; color:#fff; border:none; font-family:inherit; font-size:16px; font-weight:800; cursor:pointer;" onclick="submitSurvey()">
        ✓ ส่งผลตรวจน้ำทันที
      </button>
      <div style="text-align:center; font-size:11px; color:#64748B; margin-top:8px;">
        🔒 ป้องกันข้อมูลส่วนบุคคลตาม PDPA ไม่แสดงชื่อและเบอร์สู่สาธารณะ
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- SHEET 3: POINT DETAIL SHEET ("น้ำนี้เอาไปทำอะไรได้บ้าง") -->
  <!-- ========================================================================= -->
  <div class="sheet-backdrop" id="sheetDetail">
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div>
          <div class="sheet-title" id="sheetPointCode">จุดตรวจ W-042</div>
          <div style="font-size:12px; color:#64748B;" id="sheetPointName">ท่าน้ำวัดท่าตอน (หมู่ 3)</div>
        </div>
        <button style="border:none; background:none; font-size:18px; color:#999; cursor:pointer;" onclick="closeSheet('sheetDetail')">✕</button>
      </div>

      <!-- Status Banner -->
      <div style="background:#E8F5E9; border:1px solid #81C784; border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:12px; margin-bottom:14px;">
        <div style="width:36px; height:36px; border-radius:18px; background:#2E7D32; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800;">✓</div>
        <div>
          <div style="font-size:15px; font-weight:800; color:#1B5E20;" id="sheetPointStatus">น้ำสะอาด ปลอดภัย</div>
          <div style="font-size:11px; color:#2E7D32;" id="sheetPointDate">ตรวจล่าสุด: 15 ต.ค. 2569 (โดย อสม.)</div>
        </div>
      </div>

      <div style="font-size:13px; font-weight:700; color:#195640; margin-bottom:8px;">💡 น้ำจากจุดนี้ ใช้ทำอะไรได้บ้าง?</div>
      <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px;"><b>☕ ดื่มกิน:</b> ดื่มได้ (แนะนำให้ต้มสุกก่อน)</div>
          <span style="font-size:10px; font-weight:700; color:#2E7D32; background:#E8F5E9; padding:2px 8px; border-radius:10px;">ดื่มได้ (ต้ม)</span>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px;"><b>🚿 ซักล้าง/อาบน้ำ:</b> ใช้ได้ตามปกติ</div>
          <span style="font-size:10px; font-weight:700; color:#2E7D32; background:#E8F5E9; padding:2px 8px; border-radius:10px;">ปกติ</span>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px;"><b>🥬 การเกษตร:</b> รดแปลงผัก เลี้ยงสัตว์น้ำปลอดภัย</div>
          <span style="font-size:10px; font-weight:700; color:#2E7D32; background:#E8F5E9; padding:2px 8px; border-radius:10px;">ปลอดภัย 100%</span>
        </div>
      </div>

      <!-- Trend -->
      <div style="background:#F1F5F9; border-radius:12px; padding:10px 14px; margin-bottom:14px; font-size:11px; color:#334155;">
        <b>📈 ประวัติ 4 เดือน:</b> น้ำพัฒนาจาก 'เฝ้าระวัง' ➔ 'ปกติ' ➔ 'สะอาดมาก' ต่อเนื่อง
      </div>

      <!-- Action buttons -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button style="height:44px; border-radius:12px; border:1.5px solid #195640; background:#fff; color:#195640; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;" onclick="alert('ส่งคำขอตรวจซ้ำถึง อสม. แล้ว')">
          🔄 ขอตรวจซ้ำ
        </button>
        <button style="height:44px; border-radius:12px; border:none; background:#195640; color:#fff; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;" onclick="alert('กำลังต่อสายโทรหา อสม. ท่าตอน...')">
          📞 โทรหา อสม.
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- SHEET 4: VILLAGE HEADMAN SOUND NOTICE & LINE BROADCAST -->
  <!-- ========================================================================= -->
  <div class="sheet-backdrop" id="sheetSound">
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div>
          <div class="sheet-title">📢 ประกาศเสียงตามสาย & LINE ชุมชน</div>
          <div style="font-size:12px; color:#64748B;">สำหรับผู้นำชุมชน / ผู้ใหญ่บ้าน • ภาษาพูดอ่านง่าย</div>
        </div>
        <button style="border:none; background:none; font-size:18px; color:#999; cursor:pointer;" onclick="closeSheet('sheetSound')">✕</button>
      </div>

      <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:14px; padding:14px; font-size:13px; line-height:1.7; color:#78350F; margin-bottom:14px;">
        <p><b>"สวัสดีครับ พ่อแม่พี่น้องทุกท่าน"</b></p>
        <p style="margin-top:6px;">วันนี้ ทางผู้ใหญ่บ้านและ อสม. ร่วมกับ มหาวิทยาลัยแม่ฟ้าหลวง ได้ตรวจน้ำแม่น้ำกกแล้ว ผลตรวจวันนี้: <b>น้ำสะอาด ปลอดภัยครับ!</b> สามารถสูบน้ำเข้านาและรดพืชผักได้ตามปกติ ส่วนน้ำดื่มขอให้ต้มสุกก่อนดื่มนะครับ... ขอบคุณครับ</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button style="height:46px; border-radius:12px; border:none; background:#00B900; color:#fff; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;" onclick="alert('คัดลอกข้อความสำหรับส่งเข้ากลุ่ม LINE เรียบร้อยแล้ว!')">
          💬 ส่งเข้า LINE ชุมชน
        </button>
        <button style="height:46px; border-radius:12px; border:1.5px solid #195640; background:#fff; color:#195640; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer;" onclick="window.print()">
          🖨️ พิมพ์กระดาษตัวโตๆ
        </button>
      </div>
    </div>
  </div>

  <script>
    // 1. DATA DEFINITIONS
    const communitiesData = ${JSON.stringify(communities)};
    const waypointsData = ${JSON.stringify(sampleWaypoints)};
    const evacuationData = ${JSON.stringify(evacuationData)};
    const floodData = ${JSON.stringify(floodFeatures)};

    let activeCommunity = communitiesData[0]; // default 'thaton'
    let currentTab = 'water'; // 'water', 'flood', 'evac'
    let zoomScope = 'inner';

    // 2. INITIALIZE LEAFLET WITH OPENSTREETMAP (OSM STANDARD TILES)
    const map = L.map('map', {
      center: activeCommunity.center,
      zoom: activeCommunity.zoomInner,
      zoomControl: false,
      attributionControl: false
    });

    // Pure OpenStreetMap (OSM) Standard Tiles (identical to production app)
    const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      maxNativeZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    function resetToCenter() {
      const targetZoom = zoomScope === 'inner' ? activeCommunity.zoomInner : activeCommunity.zoomOuter;
      map.flyTo(activeCommunity.center, targetZoom, { duration: 0.8 });
    }

    function toggleMapType() {
      // Compatibility stub
      resetToCenter();
    }

    // 3. LAYER GROUPS
    const waterLayer = L.layerGroup().addTo(map);
    const floodLayer = L.layerGroup();
    const evacLayer = L.layerGroup();

    // 4. RENDER WATER WAYPOINTS (129 PINS)
    waypointsData.forEach(wp => {
      let pinClass = 'safe';
      let iconSymbol = '✓';
      if (wp.danger) { pinClass = 'danger'; iconSymbol = '!'; }
      else if (wp.caution) { pinClass = 'caution'; iconSymbol = '~'; }

      const icon = L.divIcon({
        className: 'custom-pin',
        html: \`<div class="farmer-pin \${pinClass}">\${iconSymbol}</div>\`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([wp.lat, wp.lon], { icon }).addTo(waterLayer);
      marker.on('click', () => {
        openPointDetail(wp);
      });
    });

    // 5. RENDER FLOOD SIMULATION LAYER
    floodData.forEach(feat => {
      if (feat.geometry && feat.geometry.coordinates) {
        const latlngs = feat.geometry.coordinates.map(ring => ring.map(pt => [pt[1], pt[0]]));
        L.polygon(latlngs, {
          color: '#1976D2',
          weight: 1.5,
          fillColor: '#0D47A1',
          fillOpacity: 0.65
        }).bindPopup(\`<b>🌊 ระดับน้ำล้นตลิ่ง</b><br/>ความลึกประมาณ \${feat.properties.maxDepth || 1.2} ม.\`).addTo(floodLayer);
      }
    });

    // 6. RENDER EVACUATION & SAFE HAVEN LAYER
    if (evacuationData.routes && evacuationData.routes.length) {
      evacuationData.routes.forEach(routeCoords => {
        L.polyline(routeCoords, { color: '#2E7D32', weight: 6, opacity: 0.9 }).addTo(evacLayer);
        L.polyline(routeCoords, { color: '#FFFFFF', weight: 2, dashArray: '6, 6' }).addTo(evacLayer);
      });
    }

    if (evacuationData.points && evacuationData.points.length) {
      evacuationData.points.forEach(pt => {
        let color = '#DC2626';
        let label = 'ผู้สูงอายุ';
        if (pt.kind === 'disability') { color = '#C2410C'; label = 'คนพิการ'; }
        else if (pt.kind === 'children') { color = '#A16207'; label = 'เด็กเล็ก'; }

        const icon = L.divIcon({
          className: 'evac-pin',
          html: \`<div style="width:18px;height:18px;border-radius:9px;background:\${color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;">🏠</div>\`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        L.marker([pt.latitude, pt.longitude], { icon })
          .bindPopup(\`<b>บ้านกลุ่มเปราะบาง (\${label})</b><br/>รหัส: \${pt.id}<br/><button onclick="alert('แจ้งเรือกู้ภัยแล้ว')" style="background:#E65100;color:#fff;border:none;padding:3px 8px;border-radius:6px;cursor:pointer;margin-top:4px;">🚨 ขอเรือมารับ</button>\`)
          .addTo(evacLayer);
      });
    }

    // Wat Tha Ton Safe Haven Pin
    const watPin = L.divIcon({
      className: 'wat-pin',
      html: \`<div style="background:#2E7D32;color:#fff;padding:6px 12px;border-radius:20px;border:2px solid #fff;font-weight:800;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;">🛕 ศูนย์พักพิง: ศาลาวัดท่าตอน</div>\`,
      iconAnchor: [80, 20]
    });
    L.marker([20.0583, 99.3665], { icon: watPin }).addTo(evacLayer);

    // 7. TAB SWITCHER (3 ESSENTIAL BUTTONS)
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.nav-btn-tab').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');

      // Clear layers
      map.removeLayer(waterLayer);
      map.removeLayer(floodLayer);
      map.removeLayer(evacLayer);

      if (tab === 'water') {
        waterLayer.addTo(map);
      } else if (tab === 'flood') {
        floodLayer.addTo(map);
      } else if (tab === 'evac') {
        evacLayer.addTo(map);
      }
    }

    // 9. COMMUNITY SELECTION FUNCTIONS
    function renderCommunityCards() {
      const container = document.getElementById('communityListContainer');
      container.innerHTML = communitiesData.map(c => \`
        <div class="community-card \${c.id === activeCommunity.id ? 'active' : ''}" onclick="selectCommunity('\${c.id}')">
          <div class="com-left">
            <div class="com-badge">📍</div>
            <div>
              <div class="com-name">\${c.fullName}</div>
              <div class="com-sub">\${c.district} \${c.province} • \${c.records} จุดตรวจ</div>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="com-zone-tag">\${c.riverZone}</span>
            <div style="font-size:10px; color:\${c.statusColor}; font-weight:700; margin-top:4px;">\${c.statusText}</div>
          </div>
        </div>
      \`).join('');
    }

    function selectCommunity(id) {
      const found = communitiesData.find(c => c.id === id);
      if (!found) return;
      activeCommunity = found;
      
      document.getElementById('currentAreaName').textContent = found.name;
      document.getElementById('currentAreaSub').textContent = \`\${found.district} \${found.province} • \${found.records} จุดตรวจ\`;
      document.getElementById('surveyAreaLabel').textContent = \`\${found.fullName} • \${found.province}\`;
      document.getElementById('todayTitle').textContent = \`น้ำ\${found.name}วันนี้: \${found.statusText}\`;

      renderCommunityCards();
      closeSheet('sheetCommunity');

      // Smooth FlyTo
      const targetZoom = zoomScope === 'inner' ? found.zoomInner : found.zoomOuter;
      map.flyTo(found.center, targetZoom, { duration: 1.2 });
    }

    function setZoomScope(scope) {
      zoomScope = scope;
      if (scope === 'inner') {
        document.getElementById('btnScopeInner').style.background = '#fff';
        document.getElementById('btnScopeInner').style.color = '#195640';
        document.getElementById('btnScopeOuter').style.background = 'transparent';
        document.getElementById('btnScopeOuter').style.color = '#64748B';
        map.setZoom(activeCommunity.zoomInner);
      } else {
        document.getElementById('btnScopeOuter').style.background = '#fff';
        document.getElementById('btnScopeOuter').style.color = '#195640';
        document.getElementById('btnScopeInner').style.background = 'transparent';
        document.getElementById('btnScopeInner').style.color = '#64748B';
        map.setZoom(activeCommunity.zoomOuter);
      }
    }

    function locateUser() {
      map.flyTo([20.0585, 99.3620], 17, { duration: 1 });
    }

    // 10. MODAL SHEETS CONTROLS
    function openCommunitySheet() {
      renderCommunityCards();
      document.getElementById('sheetCommunity').classList.add('open');
    }
    function openSurveySheet() {
      document.getElementById('sheetSurvey').classList.add('open');
    }
    function openSoundSheet() {
      document.getElementById('sheetSound').classList.add('open');
    }
    function openSummarySheet() {
      openPointDetail(waypointsData[0]);
    }
    function closeSheet(id) {
      document.getElementById(id).classList.remove('open');
    }

    function openPointDetail(wp) {
      document.getElementById('sheetPointCode').textContent = \`จุดตรวจ \${wp.code}\`;
      document.getElementById('sheetPointName').textContent = wp.name;
      document.getElementById('sheetPointDate').textContent = \`ตรวจเมื่อ: \${wp.date} (\${wp.source})\`;
      
      const statusEl = document.getElementById('sheetPointStatus');
      if (wp.danger) {
        statusEl.textContent = 'อันตราย ห้ามดื่มเด็ดขาด!';
        statusEl.style.color = '#A33228';
      } else if (wp.caution) {
        statusEl.textContent = 'เฝ้าระวัง (ใช้รดผักได้ ห้ามดื่ม)';
        statusEl.style.color = '#DE9922';
      } else {
        statusEl.textContent = 'น้ำสะอาด อยู่ในเกณฑ์ปกติ';
        statusEl.style.color = '#1B5E20';
      }
      document.getElementById('sheetDetail').classList.add('open');
    }

    function selectColor(btn, ppb) {
      document.querySelectorAll('.swatch-btn').forEach(b => {
        b.style.borderColor = '#CBD5E1';
        b.classList.remove('selected');
      });
      btn.style.borderColor = '#195640';
      btn.classList.add('selected');
    }

    function selectSource(btn) {
      // deprecated
    }

    function submitSurvey() {
      const name = document.getElementById('surveyNameInput')?.value || 'ชาวบ้าน';
      const phone = document.getElementById('surveyPhoneInput')?.value || '';
      closeSheet('sheetSurvey');
      const newLat = activeCommunity.center[0] + (Math.random() - 0.5) * 0.003;
      const newLon = activeCommunity.center[1] + (Math.random() - 0.5) * 0.003;

      const newIcon = L.divIcon({
        className: 'new-pin',
        html: \`<div class="farmer-pin safe" style="transform:scale(1.3);box-shadow:0 0 15px #2E7D32;">★</div>\`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([newLat, newLon], { icon: newIcon }).addTo(waterLayer);
      map.setView([newLat, newLon], 17);

      alert(\`✅ ส่งผลตรวจสำเร็จ! ได้รับรหัส: KOK-20261025-0130 ขอบคุณ \${name} อสม. ได้รับข้อมูลเรียบร้อยแล้ว\`);
    }

    // Expose for Playwright simulation
    window.selectCommunity = selectCommunity;
    window.switchTab = switchTab;
    window.openCommunitySheet = openCommunitySheet;
    window.openSurveySheet = openSurveySheet;
    window.openPointDetail = openPointDetail;
    window.closeSheet = closeSheet;
    window.setZoomScope = setZoomScope;
    window.resetToCenter = resetToCenter;
    window.toggleMapType = toggleMapType;
    window.waypointsData = waypointsData;
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(projectRoot, 'docs/ui-prototypes/live-app.html'), html, 'utf8');
console.log('Successfully generated Production Mobile-First live-app.html!');
