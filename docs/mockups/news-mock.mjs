import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch';
const SHOTS_DIR = path.join(ROOT, 'docs/mockups/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const exData = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/canvas-backup-2026-10-26.excalidraw'), 'utf8'));
const mapD = exData.files.f_s2_map_d?.dataURL || '';
const summaryD = exData.files.f_s4_summary_d?.dataURL || '';
const guideD = exData.files.f_s6_guide_d?.dataURL || '';
const evacD = exData.files.f_s2b_evac_d?.dataURL || '';

const satDir = path.join(ROOT, 'KokData/thaton-flood-satellites-2022-2026');
const b64File = (relPath, mime = 'image/png') => {
  const full = path.join(satDir, relPath);
  return `data:${mime};base64,` + fs.readFileSync(full).toString('base64');
};

const IMG = {
  floodSat: b64File('02_2565_2022-08_07-08Aug/Sentinel2_2022-08-22_satellite.png'),
  satNormal: b64File('01_2565_2022-07_21-22Jul/Normal_Sentinel2_2022-06-28_satellite.png'),
  sarFlood: b64File('02_2565_2022-08_07-08Aug/Sentinel1_2022-08-10_satellite.png'),
  satAug: b64File('04_2566_2023-08_Aug/Sentinel2_2023-08-17_satellite.png'),
  mapD,
  summaryD,
  guideD,
  evacD,
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');
.nw-root {
  --pri: #0284C7;
  --pri-dark: #0369A1;
  --pri-soft: #E0F2FE;
  --bd: #E2E8F0;
  --mu: #64748B;
  --tx: #0F172A;
  --bg: #F8FAFC;
  --grn: #16A34A;
  --grn-soft: #F0FDF4;
  --amb: #D97706;
  --amb-soft: #FFFBEB;
  --red: #DC2626;
  --red-soft: #FEF2F2;
  --new: #EA7A0B;
  position: fixed;
  inset: 0;
  background: var(--bg);
  color: var(--tx);
  font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.nw-root * { box-sizing: border-box; }
.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

/* Clean cropped satellite/map thumbnail helper */
.thumb-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #CBD5E1;
  background: #0F172A;
}
.thumb-wrap > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 54% 52%;
  transform: scale(1.26);
  display: block;
}
.thumb-wrap.ui-shot > img {
  transform: scale(1.02);
  object-position: center top;
}

/* Top Header */
.nw-top {
  background: #FFFFFF;
  border-bottom: 1px solid var(--bd);
  padding: 12px 26px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.nw-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.nw-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #0284C7, #0EA5E9);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(2,132,199,0.22);
}
.nw-brand h1 {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
  color: var(--tx);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nw-brand small {
  display: block;
  font-size: 11.5px;
  color: var(--mu);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nw-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}
.nw-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: #475569;
  background: #F1F5F9;
  border: 1px solid transparent;
  white-space: nowrap;
}
.nw-tab.on {
  background: var(--pri-soft);
  color: var(--pri-dark);
  border-color: #7DD3FC;
}
.nw-prop {
  background: var(--new);
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  white-space: nowrap;
}

/* Body container */
.nw-body {
  flex: 1;
  padding: 18px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

/* Badges & Chips */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 3.5px 10px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge.urgent { background: var(--red-soft); color: var(--red); border-color: #FECACA; }
.badge.water { background: var(--pri-soft); color: var(--pri-dark); border-color: #BAE6FD; }
.badge.event { background: var(--grn-soft); color: var(--grn); border-color: #BBF7D0; }
.badge.know { background: var(--amb-soft); color: var(--amb); border-color: #FDE68A; }
.badge.comm { background: #F1F5F9; color: #334155; border-color: #CBD5E1; }
.badge.pin { background: #FFF7ED; color: #C2410C; border-color: #FDBA74; }
.badge.draft { background: #F8FAFC; color: #64748B; border-color: #CBD5E1; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--bd);
  border-radius: 999px;
  padding: 5.5px 12px;
  font-size: 11.5px;
  font-weight: 600;
  background: #fff;
  color: #475569;
  white-space: nowrap;
}
.chip.on {
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  padding: 7.5px 13px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--bd);
  background: #fff;
  color: var(--tx);
  white-space: nowrap;
}
.btn.pri { background: var(--pri); border-color: var(--pri); color: #fff; }
.btn.grn { background: var(--grn); border-color: var(--grn); color: #fff; }
.btn.red { background: #fff; border-color: #FCA5A5; color: var(--red); }
.btn.sm { padding: 5px 10px; font-size: 11px; border-radius: 8px; }

.card {
  background: #fff;
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.03);
}

.inp {
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 7.5px 12px;
  font-size: 12px;
  background: #fff;
  color: var(--tx);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.lbl {
  font-size: 11.5px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 5px;
  display: block;
}

@media (max-width: 800px) {
  .nw-top { padding: 10px 12px; gap: 8px; }
  .nw-brand h1 { font-size: 13.5px; }
  .nw-brand small { display: none; }
  .nw-logo { width: 30px; height: 30px; font-size: 14px; border-radius: 8px; }
  .nw-body { padding: 10px 12px; gap: 9px; }
  .hide-m { display: none !important; }
  .show-m { display: flex !important; }
}
`;

const PAGES = {
  // 1. S12 User News List Page
  's12-news-list': (m) => `
  <div class="nw-root">
    <div class="nw-top">
      <div class="nw-brand">
        <div class="nw-logo">≋</div>
        <div>
          <h1>${m ? 'ข่าวสารประชาสัมพันธ์' : 'MFU Kok Water Watch · ข่าวสารประชาสัมพันธ์'}</h1>
          <small>ศูนย์ข้อมูลข่าวสาร แจ้งเตือนคุณภาพน้ำ และกิจกรรมชุมชนลุ่มน้ำกก</small>
        </div>
      </div>
      <div class="nw-nav">
        <span class="nw-tab hide-m">🗺️ แผนที่หลัก</span>
        <span class="nw-tab on" style="${m ? 'padding:6px 10px;font-size:11px' : ''}">📰 ข่าวสาร</span>
        <span class="nw-tab hide-m">📊 สรุปผลตรวจ</span>
        <span class="nw-tab hide-m">📖 คู่มือ</span>
        <span class="nw-prop" style="${m ? 'font-size:10px;padding:3px 8px' : ''}">ข้อเสนอใหม่</span>
      </div>
    </div>

    <div class="nw-body">
      <!-- Featured Pinned News Banner -->
      <div class="card" style="padding:${m ? '11px' : '16px 20px'};display:grid;grid-template-columns:${m ? '1fr' : '320px 1fr'};gap:${m ? '9px' : '20px'};border:1.5px solid #BAE6FD;background:linear-gradient(135deg,#FFFFFF 55%,#F0F9FF 100%);flex-shrink:0">
        <div class="thumb-wrap" style="height:${m ? '115px' : '168px'}">
          <img src="${IMG.floodSat}" alt="Thaton satellite" />
          <span class="badge pin" style="position:absolute;left:8px;top:8px;box-shadow:0 2px 8px rgba(0,0,0,0.18)">📌 ปักหมุดข่าวสำคัญ</span>
          <span class="badge comm" style="position:absolute;right:8px;bottom:8px;background:rgba(15,23,42,0.82);color:#fff;border:none">📍 บ้านท่าตอน</span>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:space-between;min-width:0">
          <div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:5px">
              <span class="badge urgent">⚠️ แจ้งเตือนสำคัญ</span>
              <span class="badge water">💧 ผลตรวจน้ำ</span>
              <span class="mono" style="font-size:11px;color:#64748B">28 ต.ค. 2569 • ทีมวิจัย มฟล.</span>
            </div>
            <h2 style="font-size:${m ? '14px' : '18.5px'};font-weight:800;margin:0 0 5px;line-height:1.34;color:#0F172A">
              แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569 และแผนเฝ้าระวังพื้นที่น้ำท่วมซ้ำซากบ้านท่าตอน
            </h2>
            <p style="font-size:${m ? '11.5px' : '13px'};color:#475569;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
              สรุปผลตรวจคัดกรองสารหนูภาคสนามและห้องปฏิบัติการบริเวณจุดเก็บตัวอย่าง KK01–KK03 บ้านท่าตอน พร้อมภาพถ่ายดาวเทียม Sentinel-2 เปรียบเทียบแนวตลิ่งและจุดเสี่ยงน้ำท่วมเพื่อให้ชุมชนเตรียมความพร้อม
            </p>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #E2E8F0">
            <span style="font-size:11px;color:#64748B">📷 มีภาพประกอบ 3 ภาพ • ภาษาชุมชนเข้าใจง่าย</span>
            <span class="btn pri sm">อ่านรายละเอียด →</span>
          </div>
        </div>
      </div>

      <!-- Filter Bar: Category + Community + Search -->
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:space-between;flex-shrink:0">
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <span class="chip on">ทั้งหมด (12)</span>
          <span class="chip">⚠️ แจ้งเตือนสำคัญ</span>
          <span class="chip">💧 ผลตรวจน้ำ</span>
          <span class="chip hide-m">🤝 กิจกรรมโครงการ</span>
          <span class="chip hide-m">📘 ความรู้ชุมชน</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;width:${m ? '100%' : 'auto'}">
          <div class="inp" style="min-width:${m ? '145px' : '175px'};font-weight:600;padding:6px 10px">
            <span>📍 ชุมชน: ทุกชุมชน (4)</span><span style="color:#64748B">▾</span>
          </div>
          <div class="inp" style="min-width:${m ? '140px' : '230px'};color:#64748B;flex:1;padding:6px 10px">
            <span>🔍 ค้นหาข่าวสาร...</span>
          </div>
        </div>
      </div>

      <!-- News Cards Grid -->
      <div style="display:${m ? 'flex' : 'grid'};${m ? 'flex-direction:column' : 'grid-template-columns:repeat(3, 1fr)'};gap:${m ? '9px' : '14px'};flex:1;min-height:0;overflow:hidden">
        ${[
          {
            img: IMG.mapD,
            ui: true,
            cat: '💧 ผลตรวจน้ำ',
            catCls: 'water',
            comm: 'บ้านท่าตอน',
            date: '25 ต.ค. 2569',
            title: 'สรุปแนวโน้มค่าสารหนู (ppb) จุดตรวจ KK01 และสะพานแม่นาวาง–ท่าตอน รอบล่าสุด',
            desc: 'ผลการตรวจติดตามคุณภาพน้ำผิวดินพบค่าแนวโน้มลดลงจากช่วงต้นฤดูฝน แนะนำใช้น้ำประปาหมู่บ้านและน้ำดื่มบรรจุขวดตามปกติ'
          },
          {
            img: IMG.satNormal,
            ui: false,
            cat: '🤝 กิจกรรมโครงการ',
            catCls: 'event',
            comm: 'บ้านกะเหรี่ยงรวมมิตร',
            date: '19 ต.ค. 2569',
            title: 'ลงพื้นที่คืนข้อมูลชุมชนและอบรมอาสาสมัครชุดทดสอบน้ำภาคสนาม ต.แม่ยาว',
            desc: 'ทีมวิจัยมหาวิทยาลัยแม่ฟ้าหลวงร่วมกับผู้นำชุมชนจัดกิจกรรมฝึกใช้ชุดตรวจน้ำเบื้องต้นและการส่งพิกัด GPS ผ่านมือถือ'
          },
          {
            img: IMG.evacD,
            ui: true,
            cat: '📘 ความรู้ชุมชน',
            catCls: 'know',
            comm: 'ทุกชุมชน (4 พื้นที่)',
            date: '12 ต.ค. 2569',
            title: 'คู่มือการอ่านค่าสีระดับความเสี่ยงคุณภาพน้ำ 3 ระดับ และวิธีปฏิบัติตัวเมื่อพบน้ำขุ่นผิดปกติ',
            desc: 'ทำความเข้าใจเกณฑ์สีเขียว (<5 ppb) สีเหลือง (5–10 ppb) และสีแดง (>10 ppb) พร้อมช่องทางแจ้งผู้ประสานงานพื้นที่'
          }
        ].map(n => `
          <div class="card" style="padding:${m ? '10px 12px' : '12px'};display:flex;flex-direction:${m ? 'row' : 'column'};gap:${m ? '10px' : '8px'};min-height:0;overflow:hidden;align-items:${m ? 'center' : 'stretch'};${m ? 'flex:1' : ''}">
            <div class="thumb-wrap ${n.ui ? 'ui-shot' : ''}" style="${m ? 'width:106px;height:96px;flex-shrink:0' : 'height:142px;flex-shrink:0'}">
              <img src="${n.img}" alt="" />
              <span class="badge ${n.catCls}" style="position:absolute;left:6px;top:6px;background:rgba(255,255,255,0.95);font-size:10px;padding:2px 7px">${n.cat}</span>
              ${m ? '' : `<span class="badge comm" style="position:absolute;right:8px;bottom:8px;background:rgba(15,23,42,0.82);color:#fff;border:none">📍 ${n.comm}</span>`}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;height:100%">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#64748B" class="mono">
                <span>📅 ${n.date}</span>
                <span>📍 ${n.comm}</span>
              </div>
              <h3 style="font-size:${m ? '12.5px' : '14.5px'};font-weight:800;margin:0;line-height:1.35;color:#0F172A;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n.title}</h3>
              ${m ? '' : `<p style="font-size:12px;color:#475569;margin:0;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${n.desc}</p>`}
              <div style="margin-top:auto;padding-top:6px;border-top:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:10.5px;color:#64748B">ทีมวิจัย มฟล.</span>
                <span style="font-size:11.5px;font-weight:700;color:#0284C7">อ่านต่อ →</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`,

  // 2. S12.1 User News Detail Page (Standard clean article layout per Q3)
  's12-1-news-detail': (m) => `
  <div class="nw-root">
    <div class="nw-top">
      <span class="btn sm" style="border-radius:999px;padding:6px 12px">← กลับหน้ารวมข่าว</span>
      <div class="nw-brand" style="margin-left:2px">
        <div class="nw-logo">≋</div>
        <div>
          <h1>${m ? 'อ่านรายละเอียดข่าว' : 'ข่าวสารประชาสัมพันธ์ · อ่านรายละเอียดข่าว'}</h1>
          <small>MFU Kok Water Watch • ข้อมูลสำหรับประชาชนและชุมชนลุ่มน้ำกก</small>
        </div>
      </div>
      <div class="nw-nav">
        <span class="nw-prop" style="${m ? 'font-size:10px;padding:3px 8px' : ''}">ข้อเสนอใหม่</span>
      </div>
    </div>

    <div class="nw-body" style="align-items:center">
      <div class="card" style="width:100%;max-width:1080px;flex:1;padding:${m ? '12px 14px' : '20px 26px'};display:flex;flex-direction:column;gap:${m ? '10px' : '14px'};min-height:0;overflow:hidden">
        <!-- Article Header Meta -->
        <div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
            <span class="badge pin">📌 ข่าวปักหมุด</span>
            <span class="badge urgent">⚠️ แจ้งเตือนสำคัญ</span>
            <span class="badge water">💧 ผลตรวจน้ำ</span>
            <span class="badge comm">📍 บ้านท่าตอน (หมู่ที่ 3)</span>
            <span class="mono" style="font-size:11px;color:#64748B;margin-left:${m ? '0' : 'auto'}">เผยแพร่: 28 ต.ค. 2569 • NW-2026-014</span>
          </div>
          <h1 style="font-size:${m ? '15.5px' : '21px'};font-weight:800;margin:0;line-height:1.35;color:#0F172A">
            แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569 และแผนเฝ้าระวังพื้นที่น้ำท่วมซ้ำซากบ้านท่าตอน
          </h1>
        </div>

        <!-- Main Article Layout: Cover + Content + Photo Gallery -->
        <div style="display:${m ? 'flex' : 'grid'};${m ? 'flex-direction:column' : 'grid-template-columns:1.15fr 1fr'};gap:${m ? '12px' : '22px'};flex:1;min-height:0;overflow:hidden">
          <!-- Left: Cover Image + Gallery -->
          <div style="display:flex;flex-direction:column;gap:10px;${m ? 'flex-shrink:0' : 'min-height:0'}">
            <div class="thumb-wrap" style="${m ? 'height:180px' : 'flex:1;min-height:240px'}">
              <img src="${IMG.floodSat}" alt="Cover" />
              <span style="position:absolute;left:10px;right:10px;bottom:10px;background:rgba(15,23,42,0.82);color:#fff;font-size:11px;padding:5px 10px;border-radius:8px">
                ภาพปก: ภาพถ่ายดาวเทียม Sentinel-2 แสดงแนวลำน้ำกกและพื้นที่เฝ้าระวังบ้านท่าตอน
              </span>
            </div>
            <!-- Photo Gallery (รูปภาพประกอบ) -->
            <div>
              <div style="font-size:11.5px;font-weight:700;color:#334155;margin-bottom:6px">🖼️ รูปภาพประกอบข่าว (3 ภาพ)</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;height:${m ? '68px' : '86px'}">
                <div class="thumb-wrap" style="border:2px solid #0284C7;border-radius:9px"><img src="${IMG.satNormal}" alt="" /></div>
                <div class="thumb-wrap" style="border-radius:9px"><img src="${IMG.sarFlood}" alt="" /></div>
                <div class="thumb-wrap ui-shot" style="border-radius:9px"><img src="${IMG.mapD}" alt="" /></div>
              </div>
            </div>
          </div>

          <!-- Right: Clean Article Content -->
          <div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;min-height:0;overflow:hidden">
            <div style="font-size:${m ? '12px' : '13.6px'};line-height:${m ? '1.58' : '1.68'};color:#1E293B;display:flex;flex-direction:column;gap:${m ? '8px' : '12px'}">
              <p style="margin:0">
                <b>1. สรุปผลการตรวจติดตามคุณภาพน้ำ:</b> ทีมวิจัยมหาวิทยาลัยแม่ฟ้าหลวง (MFU Kok Water Watch) ลงพื้นที่เก็บตัวอย่างน้ำผิวดินบริเวณบ้านท่าตอน หมู่ที่ 3 ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่ ประจำเดือนตุลาคม 2569 พบค่าความเข้มข้นของสารหนูอยู่ในช่วงเฝ้าระวังและมีแนวโน้มลดลงจากช่วงฤดูน้ำหลาก
              </p>
              <p style="margin:0">
                <b>2. คำแนะนำการใช้น้ำของครัวเรือน:</b> ขอให้ประชาชนใช้น้ำดื่มบรรจุขวดหรือน้ำผ่านระบบกรองมาตรฐานสำหรับการบริโภค ส่วนการใช้น้ำเพื่อการเกษตรและอุปโภคทั่วไปควรหลีกเลี่ยงช่วงที่น้ำในแม่น้ำกกมีสีขุ่นแดงผิดปกติหลังฝนตกหนัก
              </p>
              <p style="margin:0">
                <b>3. การเตรียมความพร้อมรับมือน้ำท่วมริมตลิ่ง:</b> จากข้อมูลภาพถ่ายดาวเทียม Sentinel-1 และ Sentinel-2 พบพื้นที่ลุ่มต่ำริมตลิ่งแม่น้ำกกที่เกิดน้ำท่วมขังซ้ำซาก ขอให้ครัวเรือนใกล้แนวตลิ่งติดตามประกาศแจ้งเตือนจากหอกระจายข่าวหมู่บ้านและผู้นำชุมชนอย่างใกล้ชิด
              </p>
            </div>

            <div style="padding-top:10px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#64748B">
              <span>ผู้เขียน: ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.</span>
              <span class="btn sm">← กลับหน้ารวมข่าว</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`,

  // 3. S5.1 Admin News Management Table (Tab inside Admin Page)
  's5-1-admin-news-table': (m) => `
  <div class="nw-root">
    <div class="nw-top">
      <span class="btn sm" style="border-radius:999px">← กลับ</span>
      <div class="nw-brand">
        <div class="nw-logo">≋</div>
        <div>
          <h1>${m ? 'แอดมิน · จัดการข่าวสาร' : 'ระบบจัดการข้อมูลแอดมิน (Admin Management Console)'}</h1>
          <small>มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก</small>
        </div>
      </div>
      <!-- Admin Mode Switcher Tabs per Q4 -->
      <div class="nw-nav">
        <div class="hide-m" style="display:inline-flex;background:#F1F5F9;padding:4px;border-radius:12px;border:1px solid #E2E8F0;gap:4px">
          <span style="padding:6px 12px;border-radius:9px;font-size:12px;font-weight:700;color:#64748B">🧪 ตรวจตัวอย่างน้ำ (&gt;50 ppb)</span>
          <span style="padding:6px 12px;border-radius:9px;font-size:12px;font-weight:700;background:#0284C7;color:#fff;box-shadow:0 1px 4px rgba(2,132,199,0.3)">📰 จัดการข่าวสารประชาสัมพันธ์</span>
        </div>
        <span class="btn pri sm" style="${m ? 'padding:6px 10px' : 'padding:8px 14px;font-size:12.5px'}">+ สร้างข่าวใหม่</span>
        <span class="nw-prop hide-m">ข้อเสนอใหม่ · S5.1</span>
      </div>
    </div>

    <div class="nw-body">
      ${m ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;background:#F1F5F9;padding:3px;border-radius:10px;border:1px solid #E2E8F0;text-align:center;font-size:11.5px;font-weight:700;flex-shrink:0">
        <span style="padding:6px;color:#64748B">🧪 ตรวจน้ำ (&gt;50 ppb)</span>
        <span style="padding:6px;background:#0284C7;color:#fff;border-radius:8px">📰 จัดการข่าวสาร</span>
      </div>` : ''}

      <!-- 4 KPI Cards -->
      <div style="display:grid;grid-template-columns:repeat(${m ? 2 : 4}, 1fr);gap:${m ? '8px' : '12px'};flex-shrink:0">
        ${[
          ['ข่าวทั้งหมด', '14', '#0284C7', 'ในระบบ 4 ชุมชน'],
          ['เผยแพร่แล้ว', '11', '#16A34A', 'แสดงบนหน้าเว็บ User'],
          ['ข่าวปักหมุด', '2', '#EA7A0B', 'แสดงแบนเนอร์บนสุด'],
          ['ฉบับร่าง', '3', '#64748B', 'รอตรวจสอบก่อนเผยแพร่']
        ].map(k => `
          <div class="card" style="padding:${m ? '9px 12px' : '12px 16px'};display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11px;color:#64748B;font-weight:600">${k[0]}</div>
              <div class="mono" style="font-size:${m ? '20px' : '26px'};font-weight:800;color:${k[2]};line-height:1.15;margin-top:2px">${k[1]}</div>
              <div class="hide-m" style="font-size:11px;color:#94A3B8;margin-top:2px">${k[3]}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Filter & Search Row -->
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:space-between;flex-shrink:0">
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          <span class="chip on">ทั้งหมด (14)</span>
          <span class="chip">เผยแพร่แล้ว (11)</span>
          <span class="chip">📌 ปักหมุด (2)</span>
          <span class="chip hide-m">ฉบับร่าง (3)</span>
          <span class="chip hide-m">หมวดหมู่ ▾ ทั้งหมด</span>
          <span class="chip hide-m">ชุมชน ▾ ทุกชุมชน</span>
        </div>
        <div class="inp" style="width:${m ? '100%' : '260px'};color:#64748B;padding:6px 10px">
          <span>🔍 ค้นหารหัสข่าว หรือหัวข้อข่าว...</span>
        </div>
      </div>

      <!-- Admin News List / Table -->
      ${m ? `
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow:hidden">
        ${[
          ['NW-2026-014', 'แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือน ต.ค. 2569 และแผนเฝ้าระวังน้ำท่วมท่าตอน', '⚠️ แจ้งเตือนสำคัญ', 'urgent', 'บ้านท่าตอน', '28 ต.ค.', true, 'เผยแพร่แล้ว', 'event'],
          ['NW-2026-013', 'สรุปแนวโน้มค่าสารหนู (ppb) จุดตรวจ KK01 และสะพานแม่นาวาง–ท่าตอน', '💧 ผลตรวจน้ำ', 'water', 'บ้านท่าตอน', '25 ต.ค.', true, 'เผยแพร่แล้ว', 'event'],
          ['NW-2026-012', 'ลงพื้นที่คืนข้อมูลชุมชนและอบรมอาสาสมัครชุดทดสอบน้ำภาคสนาม ต.แม่ยาว', '🤝 กิจกรรมโครงการ', 'event', 'รวมมิตร', '19 ต.ค.', false, 'เผยแพร่แล้ว', 'event'],
          ['NW-2026-011', '(ร่าง) กำหนดการประชุมเวทีชาวบ้านเพื่อทบทวนเส้นทางอพยพกลุ่มเปราะบาง', '🤝 กิจกรรมโครงการ', 'event', 'บ้านปงของ', '16 ต.ค.', false, 'ฉบับร่าง', 'draft']
        ].map(r => `
          <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <span class="mono" style="font-size:11px;font-weight:700;color:#0284C7">${r[0]} • ${r[5]}</span>
              <div style="display:flex;gap:4px">
                ${r[6] ? '<span class="badge pin" style="font-size:10px;padding:2px 7px">📌 ปักหมุด</span>' : ''}
                <span class="badge ${r[8]}" style="font-size:10px;padding:2px 7px">${r[7]}</span>
              </div>
            </div>
            <div style="font-size:12.5px;font-weight:800;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r[1]}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;border-top:1px solid #F1F5F9">
              <div style="display:flex;gap:4px">
                <span class="badge ${r[3]}" style="font-size:10px;padding:2px 7px">${r[2]}</span>
                <span class="badge comm" style="font-size:10px;padding:2px 7px">📍 ${r[4]}</span>
              </div>
              <div style="display:flex;gap:4px">
                <span class="btn sm" style="padding:3px 8px;font-size:10.5px">✏️ แก้ไข</span>
                <span class="btn red sm" style="padding:3px 8px;font-size:10.5px">🗑️ ลบ</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      ` : `
      <div class="card" style="flex:1;padding:0;overflow:hidden;display:flex;flex-direction:column;min-height:0">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;color:#475569;font-size:11.5px">
              <th style="padding:10px 14px;text-align:left">รหัสข่าว</th>
              <th style="padding:10px 14px;text-align:left">หัวข้อข่าวประชาสัมพันธ์</th>
              <th style="padding:10px 14px;text-align:left">หมวดหมู่</th>
              <th style="padding:10px 14px;text-align:left">พื้นที่ชุมชน</th>
              <th style="padding:10px 14px;text-align:left">วันที่อัปเดต</th>
              <th style="padding:10px 14px;text-align:center">ปักหมุด</th>
              <th style="padding:10px 14px;text-align:left">สถานะ</th>
              <th style="padding:10px 14px;text-align:right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['NW-2026-014', 'แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือน ต.ค. 2569 และแผนเฝ้าระวังน้ำท่วมท่าตอน', '⚠️ แจ้งเตือนสำคัญ', 'urgent', 'บ้านท่าตอน', '28 ต.ค. 2569', true, 'เผยแพร่แล้ว', 'event'],
              ['NW-2026-013', 'สรุปแนวโน้มค่าสารหนู (ppb) จุดตรวจ KK01 และสะพานแม่นาวาง–ท่าตอน', '💧 ผลตรวจน้ำ', 'water', 'บ้านท่าตอน', '25 ต.ค. 2569', true, 'เผยแพร่แล้ว', 'event'],
              ['NW-2026-012', 'ลงพื้นที่คืนข้อมูลชุมชนและอบรมอาสาสมัครชุดทดสอบน้ำภาคสนาม ต.แม่ยาว', '🤝 กิจกรรมโครงการ', 'event', 'บ้านกะเหรี่ยงรวมมิตร', '19 ต.ค. 2569', false, 'เผยแพร่แล้ว', 'event'],
              ['NW-2026-011', '(ร่าง) กำหนดการประชุมเวทีชาวบ้านเพื่อทบทวนเส้นทางอพยพกลุ่มเปราะบาง', '🤝 กิจกรรมโครงการ', 'event', 'บ้านปงของ', '16 ต.ค. 2569', false, 'ฉบับร่าง', 'draft'],
              ['NW-2026-010', 'คู่มือการอ่านค่าสีระดับความเสี่ยงคุณภาพน้ำ 3 ระดับ และวิธีปฏิบัติตัว', '📘 ความรู้ชุมชน', 'know', 'ทุกชุมชน (4 พื้นที่)', '12 ต.ค. 2569', false, 'เผยแพร่แล้ว', 'event'],
              ['NW-2026-009', 'รายงานการสำรวจผลกระทบน้ำท่วมย้อนบริเวณปากแม่น้ำอิงและลำห้วยสาขา', '💧 ผลตรวจน้ำ', 'water', 'บ้านปากอิงใต้', '05 ต.ค. 2569', false, 'เผยแพร่แล้ว', 'event']
            ].map(r => `
              <tr style="border-bottom:1px solid #F1F5F9">
                <td class="mono" style="padding:11px 14px;font-weight:700;color:#0284C7;white-space:nowrap">${r[0]}</td>
                <td style="padding:11px 14px;font-weight:700;color:#0F172A;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r[1]}</td>
                <td style="padding:11px 14px"><span class="badge ${r[3]}">${r[2]}</span></td>
                <td style="padding:11px 14px"><span class="badge comm">📍 ${r[4]}</span></td>
                <td class="mono" style="padding:11px 14px;color:#64748B">${r[5]}</td>
                <td style="padding:11px 14px;text-align:center">
                  <span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:${r[6] ? '#FFF7ED' : '#F1F5F9'};color:${r[6] ? '#EA7A0B' : '#94A3B8'};border:1px solid ${r[6] ? '#FDBA74' : '#E2E8F0'}">${r[6] ? '📌 ปักหมุด' : 'ปกติ'}</span>
                </td>
                <td style="padding:11px 14px"><span class="badge ${r[8]}">${r[7]}</span></td>
                <td style="padding:11px 14px;text-align:right;white-space:nowrap">
                  <span class="btn sm" style="margin-right:4px">✏️ แก้ไข</span>
                  <span class="btn red sm">🗑️ ลบ</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}
    </div>
  </div>`,

  // 4. S5.2 Admin News Create / Edit Form
  's5-2-admin-news-form': (m) => `
  <div class="nw-root">
    <div class="nw-top">
      <span class="btn sm" style="border-radius:999px">← กลับตารางข่าว</span>
      <div class="nw-brand">
        <div class="nw-logo">≋</div>
        <div>
          <h1>${m ? 'สร้าง / แก้ไขข่าวสาร' : 'สร้าง / แก้ไขข่าวประชาสัมพันธ์ (Admin News Editor)'}</h1>
          <small>จัดการข้อมูลข่าวสาร แจ้งเตือนคุณภาพน้ำ และรูปภาพประกอบสำหรับเผยแพร่หน้าเว็บไซต์</small>
        </div>
      </div>
      <div class="nw-nav">
        <span class="btn hide-m">💾 บันทึกฉบับร่าง</span>
        <span class="btn grn sm" style="${m ? 'padding:6px 10px' : 'padding:8px 14px;font-size:12.5px'}">🚀 เผยแพร่ข่าว</span>
        <span class="nw-prop hide-m">ข้อเสนอใหม่ · S5.2</span>
      </div>
    </div>

    <div class="nw-body">
      <div style="display:${m ? 'flex' : 'grid'};${m ? 'flex-direction:column' : 'grid-template-columns:1.6fr 1fr'};gap:${m ? '10px' : '16px'};flex:1;min-height:0;overflow:hidden">
        <!-- Left Column: Title, Category, Community, Content Editor -->
        <div class="card" style="padding:${m ? '12px' : '16px'};display:flex;flex-direction:column;gap:${m ? '8px' : '12px'};min-height:0;overflow:hidden;${m ? 'flex:1' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h2 style="font-size:${m ? '13.5px' : '15px'};font-weight:800;margin:0">📝 ข้อมูลเนื้อหาข่าวประชาสัมพันธ์</h2>
            <span class="mono" style="font-size:11px;color:#64748B">NW-2026-014</span>
          </div>

          <div>
            <span class="lbl">หัวข้อข่าวประชาสัมพันธ์ (Title) <span style="color:#DC2626">*</span></span>
            <div class="inp" style="font-weight:700;color:#0F172A;background:#F8FAFC">
              แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569 และแผนเฝ้าระวังพื้นที่น้ำท่วมซ้ำซากบ้านท่าตอน
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <span class="lbl">หมวดหมู่ข่าว <span style="color:#DC2626">*</span></span>
              <div class="inp" style="font-weight:600">
                <span>⚠️ แจ้งเตือนสำคัญ</span><span>▾</span>
              </div>
            </div>
            <div>
              <span class="lbl">ชุมชนเป้าหมาย <span style="color:#DC2626">*</span></span>
              <div class="inp" style="font-weight:600">
                <span>📍 บ้านท่าตอน</span><span>▾</span>
              </div>
            </div>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;min-height:0">
            <span class="lbl">เนื้อหาข่าวประชาสัมพันธ์ (Content Editor) <span style="color:#DC2626">*</span></span>
            <div style="border:1px solid #CBD5E1;border-radius:11px;flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff">
              <!-- Toolbar -->
              <div style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:6px 10px;display:flex;gap:6px;align-items:center;font-size:11.5px;font-weight:700;color:#475569">
                <span style="padding:2px 7px;background:#fff;border:1px solid #CBD5E1;border-radius:5px">B</span>
                <span style="padding:2px 7px;background:#fff;border:1px solid #CBD5E1;border-radius:5px">I</span>
                <span style="padding:2px 7px;background:#fff;border:1px solid #CBD5E1;border-radius:5px">H2</span>
                <span style="padding:2px 7px;background:#fff;border:1px solid #CBD5E1;border-radius:5px">• รายการ</span>
                <span style="margin-left:auto;font-size:10.5px;color:#64748B;font-weight:500">ภาษาชาวบ้านเข้าใจง่าย</span>
              </div>
              <!-- Textarea Content -->
              <div style="padding:10px 12px;font-size:${m ? '11.5px' : '12.5px'};line-height:1.55;color:#1E293B;flex:1;overflow:hidden">
                <b>1. สรุปผลการตรวจติดตามคุณภาพน้ำ:</b><br>
                ${m ? 'ทีมวิจัย มฟล. ลงพื้นที่เก็บตัวอย่างน้ำบ้านท่าตอน หมู่ที่ 3 เดือน ต.ค. 2569 พบค่าสารหนูอยู่ในเกณฑ์เฝ้าระวังและลดลง' : 'ทีมวิจัยมหาวิทยาลัยแม่ฟ้าหลวงลงพื้นที่เก็บตัวอย่างน้ำผิวดินบริเวณบ้านท่าตอน หมู่ที่ 3 ประจำเดือนตุลาคม 2569 พบค่าความเข้มข้นของสารหนูอยู่ในเกณฑ์เฝ้าระวังและมีแนวโน้มลดลง<br><br><b>2. คำแนะนำการใช้น้ำของครัวเรือน:</b><br>แนะนำให้ใช้น้ำดื่มบรรจุขวดหรือน้ำผ่านระบบกรองมาตรฐานสำหรับการบริโภค และหลีกเลี่ยงการใช้น้ำแม่น้ำกกโดยตรงในช่วงหลังฝนตกหนัก'}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Cover Image, Photo Gallery Upload, Pin & Publish Settings -->
        <div style="display:flex;flex-direction:column;gap:${m ? '10px' : '12px'};min-height:0;overflow:hidden">
          <!-- Cover & Gallery Card -->
          <div class="card" style="padding:${m ? '10px 12px' : '16px'};display:flex;flex-direction:column;gap:6px">
            <h2 style="font-size:${m ? '13px' : '14.5px'};font-weight:800;margin:0">🖼️ ภาพปกข่าวและรูปภาพประกอบ</h2>
            <div>
              <span class="lbl">ภาพปกข่าวหลัก (Cover Image • 16:9)</span>
              <div class="thumb-wrap" style="height:${m ? '70px' : '132px'};border:2px dashed #0284C7">
                <img src="${IMG.floodSat}" alt="Cover preview" />
                <span style="position:absolute;left:8px;bottom:6px;background:rgba(15,23,42,0.82);color:#fff;font-size:10px;padding:2px 8px;border-radius:6px">✓ Sentinel2_2022-08-22_satellite.png (เปลี่ยนภาพปก)</span>
              </div>
            </div>
            <div>
              <span class="lbl">รูปภาพประกอบในเนื้อหาข่าว (Gallery • สูงสุด 6 ภาพ)</span>
              <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;height:${m ? '42px' : '64px'}">
                <div class="thumb-wrap" style="border-radius:8px"><img src="${IMG.satNormal}" alt="" /></div>
                <div class="thumb-wrap" style="border-radius:8px"><img src="${IMG.sarFlood}" alt="" /></div>
                <div class="thumb-wrap ui-shot" style="border-radius:8px"><img src="${IMG.mapD}" alt="" /></div>
                <div style="border-radius:8px;border:2px dashed #94A3B8;background:#F8FAFC;display:grid;place-items:center;font-size:10.5px;font-weight:700;color:#0284C7">+ เพิ่มรูป</div>
              </div>
            </div>
          </div>

          <!-- Publication & Pin Settings Card -->
          <div class="card" style="padding:${m ? '10px 12px' : '16px'};display:flex;flex-direction:column;gap:6px;${m ? '' : 'flex:1'}">
            <h2 style="font-size:${m ? '13.5px' : '14.5px'};font-weight:800;margin:0">⚙️ ตั้งค่าการเผยแพร่และปักหมุด</h2>
            
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:11px;background:#FFF7ED;border:1px solid #FDBA74">
              <div>
                <div style="font-size:12px;font-weight:800;color:#9A3412">📌 ปักหมุดเป็นข่าวสำคัญด้านบนสุด</div>
                <div style="font-size:10.5px;color:#C2410C">แสดงเป็นแบนเนอร์ใหญ่บนสุดของหน้ารวมข่าวสาร</div>
              </div>
              <div style="width:42px;height:22px;border-radius:999px;background:#EA7A0B;position:relative;flex-shrink:0">
                <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;right:3px;top:3px"></div>
              </div>
            </div>

            <div>
              <span class="lbl">สถานะการเผยแพร่ (Status)</span>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="border:2px solid #16A34A;background:#F0FDF4;border-radius:9px;padding:6px 10px;font-size:11.5px;font-weight:700;color:#15803D">● เผยแพร่ทันที</div>
                <div style="border:1px solid #CBD5E1;background:#fff;border-radius:9px;padding:6px 10px;font-size:11.5px;font-weight:600;color:#64748B">○ เก็บเป็นฉบับร่าง</div>
              </div>
            </div>

            <div style="margin-top:auto;display:flex;gap:8px;padding-top:6px;border-top:1px solid #E2E8F0">
              <span class="btn" style="flex:1">💾 บันทึกฉบับร่าง</span>
              <span class="btn grn" style="flex:1.3">🚀 บันทึกและเผยแพร่ข่าว</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`
};

const b = await chromium.launch({ headless: true });
for (const [tag, vp, dsf] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]]) {
  const m = tag === 'm';
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: m, hasTouch: m });
  const p = await ctx.newPage();
  await p.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  for (const [name, fn] of Object.entries(PAGES)) {
    await p.evaluate(({ html, css }) => {
      document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style>';
      document.body.innerHTML = html;
    }, { html: fn(m), css: CSS });
    await p.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
    await p.waitForTimeout(450);
    const outPath = path.join(SHOTS_DIR, `${name}-${tag}.png`);
    await p.screenshot({ path: outPath });
    console.log('Rendered:', outPath);
  }
  await ctx.close();
}
await b.close();
