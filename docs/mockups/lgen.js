const fs = require('fs');
const L = 'C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus--claude-spares-spare-zEaDfI/d2aeffde-255e-41fb-bc84-ffd2f8f6abdb/scratchpad/lib.js';
const { C, ctx, out, base } = require(L);
const G = ctx(0, 0, 1);
const NL = String.fromCharCode(10);
const origT = G.t.bind(G);
const vis = t => [...t].filter(ch => !/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch)).length;
const wrapLine = (line, maxc) => { if (vis(line) <= maxc) return line; const words = line.split(' '); const rows = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (vis(t) <= maxc || !cur) cur = t; else { rows.push(cur); cur = w; } } if (cur) rows.push(cur); return rows.join(NL); };
G.t = (x, y, s0, fs0 = 24, o = {}) => { const fs = fs0 <= 40 ? Math.round(fs0 * 1.2) : fs0; let text = String(s0); if (o.w && o.al !== 'center') { const maxc = Math.floor(o.w / (fs * 0.58)); text = text.split(NL).map(l => wrapLine(l, maxc)).join(NL); } origT(x, y, text, fs, o); };
const BL = '#0284C7', GR = '#16A34A', AM = '#D97706', RD = '#DC2626', PU = '#7E22CE', MU = '#64748B', TX = '#0F172A', OR = '#EA7A0B';
const FILES = {};
const addImg = (name, x, y, w, h) => {
  const b64 = fs.readFileSync('ljpg/' + name + '.jpg').toString('base64'); const fid = 'f_' + name.replace(/[^a-z0-9]/gi, '_');
  FILES[fid] = { mimeType:'image/jpeg', id:fid, dataURL:'data:image/jpeg;base64,' + b64, created:1 };
  out.push(base('image', x, y, w, h, { fileId:fid, status:'saved', scale:[1, 1], strokeColor:'transparent', backgroundColor:'transparent' }));
  out.push(base('rectangle', x, y, w, h, { strokeColor:'#94A3B8', strokeWidth:2, backgroundColor:'transparent' }));
};
const bl = (x, y, t, w, col) => { const fs = 31; const maxc = Math.floor(w / (fs * 0.58)); const n = ('• ' + t).split(NL).map(l => wrapLine(l, maxc)).join(NL).split(NL).length; origT(x, y, ('• ' + t).split(NL).map(l => wrapLine(l, maxc)).join(NL), fs, { c:col, w }); return y + n * 40 + 24; };
const DW = 960, DH = 600, MW = 440, MH = 953, NX = DW + 60 + MW + 60, NW = 760;
G.t(0, 0, 'Landing Page ใหม่ · หน้าเล่าเรื่องเลื่อนลง', 56, { w:2200 });
G.t(0, 80, 'เปลี่ยนจาก "ประตูเลือกพื้นที่" เป็นหน้านำเสนอข้อมูลที่เก็บมา · แบบเลื่อนลงทีละส่วน (scrollytelling) · เน้นท่าตอน ส่วนอีก 3 ชุมชนเป็นสไลด์ "พร้อมในรอบถัดไป"', 28, { c:MU, w:2300 });
G.chip(0, 210, 'ข้อเสนอออกแบบ ยังไม่ได้พัฒนา', OR, { fs:22, h:44 });
G.t(480, 216, 'ภาพทุกสไลด์ฉีดเข้าหน้าแอปจริงเพื่อใช้ฟอนต์/สีเดียวกัน · แผนที่และดาวเทียมเป็นภาพจริงจากระบบ/KokData', 24, { c:MU, w:1700 });
const SL = [
  ['L0', 'Hero · เปิดหน้า', 'L0', null, ['ภาพเต็มจอ ชื่อโครงการ + มาสคอตต้นฉบับ', 'ปุ่ม "เริ่มดูข้อมูล" เลื่อนลงไปส่วนถัดไป', 'ข้อความสั้น 1 บรรทัด ไม่ใส่การ์ดเลือกพื้นที่แล้ว'], ['เข้าได้ทั้งแบบอ่านเอง และกดข้ามไปแผนที่จากเมนูบนสุด (ไม่ซ่อนทางลัด)']],
  ['L1', 'ลุ่มน้ำและ 4 ชุมชน', 'L1', null, ['เส้นแม่น้ำวาดต่อเนื่องตามการเลื่อน (เส้นค่อย ๆ ยาวขึ้น)', 'ท่าตอน = จุดเขียว เด่น เพราะมีข้อมูลสำรวจ', 'กดจุดชุมชนไหนก็เลื่อนไปส่วนนั้น'], ['ที่มา: ทะเบียน Village (MFU_IP3_SWG) ต้นน้ำ/กลางน้ำ/ปลายน้ำ', 'อีก 3 ชุมชนยังไม่มีชุดสำรวจ ใช้วงกลมโปร่ง']],
  ['L2', 'ท่าตอนในตัวเลข', 'L2', null, ['ตัวเลข 129 / 60 / 104 นับขึ้นเมื่อเลื่อนมาถึง', 'วงแหวนแสดงสัดส่วนเทียบ 129 แถว'], ['ที่มา: data/public-aggregate.json (สำรวจ SWG6)', '129 = จำนวนแถวคำตอบ ไม่ใช่ครัวเรือนไม่ซ้ำ (123 รหัสไม่ซ้ำ)']],
  ['L3', 'เลเยอร์จำลองน้ำท่วม · น้ำขึ้น-น้ำลง', 'L3', null, ['พื้นหลังมืดเพื่อให้แผนที่เด่น แผนที่อยู่ด้านขวาค้างไว้ (sticky)', 'เลื่อนสไลเดอร์ +2.5 → +5 → +7.5 ม. ภาพน้ำบนแผนที่เปลี่ยนตาม (น้ำขึ้น ↔ น้ำลง)', 'ตำนานสี ตื้น <50 ซม. / ปานกลาง 50–100 / ลึก >100'], ['ที่มา: public/flood-simulations/thaton.json (ภูมิประเทศ GEDTM30 + Copernicus)', 'ต้องมีป้ายเตือนเสมอ: แบบจำลองทดลอง ยังไม่สอบเทียบ ไม่ใช่น้ำท่วมสด ไม่ใช่รายบ้าน สีเขียว = ตื้น ไม่ใช่ปลอดภัย']],
  ['L4', 'หลักฐานจากดาวเทียม', 'L4', null, ['ภาพ 5 ก.ย. และ 15 ก.ย. 2024 วางคู่กัน ลากเทียบได้', 'ระบุเปอร์เซ็นต์พื้นที่ที่ใช้ได้ (94.4% / 93.6%)'], ['ที่มา: Copernicus Sentinel-2 (CC BY 4.0) · KokData/flood-validation-2024-09', '10 ก.ย. เมฆเต็ม ไม่ใช้ · วัดความลึกไม่ได้ · 5 ก.ย. ไม่ใช่ภาพก่อนท่วมที่ยืนยัน']],
  ['L5', 'ชาวบ้านรู้ข่าวเตือนทางไหน', 'L5', null, ['แท่งกราฟยืดขึ้นทีละแท่งเมื่อเลื่อนมาถึง', 'สรุปบรรทัดล่าง: ระบบจึงเน้นข้อความสั้น อ่านออกเสียงได้'], ['ที่มา: สำรวจท่าตอน SWG6 · เลือกได้หลายข้อ จาก 129 แถว', 'หอกระจายข่าว 103 · ผู้นำ 48 · โทร/SMS 40 · ออนไลน์ 19 · วิทยุ 12 · โทรโข่ง 2']],
  ['L6', 'แนวโน้มสารหนู (กรมควบคุมมลพิษ)', 'L6', null, ['เส้น KK01 และ KK03 วาดจากซ้ายไปขวา', 'เส้นประแดง = เกณฑ์น้ำผิวดิน 10 ppb'], ['ที่มา: kok-contract.ts (รอบ พ.ค.–ส.ค. 2026) · ผลห้องปฏิบัติการ ไม่ใช่ชุดทดสอบภาคสนาม', 'KK01 ย้ายจุด พ.ค. 2026 จึงแยกเส้น · ไม่ใส่ KK12 (เป็นอำเภอเชียงแสน ไม่ใช่ของปงของ)']],
  ['L7', 'อีก 3 ชุมชน · พร้อมในรอบถัดไป', 'L7', null, ['การ์ด 3 ใบ โปรไฟล์จากทะเบียน Village', 'ป้ายส้ม "ยังไม่มีชุดสำรวจ" ชัดเจน'], ['ไม่ใส่ตัวเลขที่ไม่มีหลักฐาน', 'พิกัดปงของในแอปต่างจากชีต ~17 กม. ต้องยืนยันก่อนเปิดแผนที่ของชุมชนนี้']],
  ['L8', 'ปิดท้าย · ประตูเข้าใช้งาน', 'L8', null, ['ปุ่มหลัก "เปิดแผนที่ท่าตอน" และ "ส่งผลตรวจน้ำ"', 'เครดิตผู้สนับสนุน (รอไฟล์โลโก้จริง)'], ['นี่คือจุดที่เดิมเป็นการ์ดเลือกพื้นที่ ตอนนี้เป็นปลายทางของการเล่าเรื่อง']],
];
let y = 330;
SL.forEach((s, i) => {
  const [code, title, key, , beh, src] = s;
  G.rect(0, y, 2300, 8, { bg:i === 3 ? BL : '#E2E8F0', r:4 });
  G.t(0, y + 24, code + ' · ' + title, 40, { c:TX, w:1500 });
  if (code === 'L3') G.chip(1500, y + 30, 'เลเยอร์น้ำท่วม', BL, { fs:22, h:44 });
  addImg('ls-' + key + '-d', 0, y + 100, DW, DH); G.t(0, y + 100 + DH + 10, 'Desktop 1440×900', 22, { c:MU, w:300 });
  addImg('ls-' + key + '-m', DW + 60, y + 100, MW, MH); G.t(DW + 60, y + 100 + MH + 10, 'Mobile 390×844', 22, { c:MU, w:300 });
  const nh = 120 + (beh.length + src.length) * 140 + 120;
  G.rect(NX, y + 100, NW, Math.max(nh, 760), { bg:'#FFFBEB', st:OR, sw:3, r:24 });
  G.t(NX + 30, y + 120, 'เขียนกำกับ', 36, { c:OR, w:600 });
  G.t(NX + 30, y + 190, 'การทำงาน', 28, { c:TX, w:600 });
  let yy = y + 240; beh.forEach(t => { yy = bl(NX + 30, yy, t, NW - 60, TX); });
  G.t(NX + 30, yy + 10, 'ข้อมูลและข้อจำกัด', 28, { c:RD, w:600 }); yy += 64;
  src.forEach(t => { yy = bl(NX + 30, yy, t, NW - 60, MU); });
  if (i < SL.length - 1) { G.t(DW / 2 - 70, y + 100 + MH + 60, 'เลื่อนลง ↓', 36, { c:MU, w:300 }); }
  y += 100 + MH + 150;
});
// M1 map layer sheet
G.rect(0, y, 2300, 8, { bg:BL, r:4 });
G.t(0, y + 24, 'M1 · หน้าแผนที่ · ตัวควบคุมเลเยอร์น้ำจำลอง (มือถือ)', 40, { c:TX, w:1800 }); G.chip(1800, y + 30, 'เลเยอร์น้ำท่วม', BL, { fs:22, h:44 });
addImg('ls-M1-m', 0, y + 100, MW, MH); G.t(0, y + 100 + MH + 10, 'Mobile 390×844', 22, { c:MU, w:300 });
G.rect(MW + 60, y + 100, 1000, 820, { bg:'#FFFBEB', st:OR, sw:3, r:24 });
G.t(MW + 90, y + 120, 'เขียนกำกับ', 36, { c:OR, w:600 });
['เปลี่ยนจาก popup เล็กมุมขวาบน เป็นแผ่นล่าง (bottom sheet) ลากขึ้น-ลงได้ นิ้วโป้งเอื้อมถึง', 'สไลเดอร์ระดับน้ำ +2.5 / +5 / +7.5 ม. แทนเมนูเลือก เลื่อนแล้วแผนที่ด้านหลังเปลี่ยนทันที', 'สวิตช์ "น้ำจำลอง" และ "ข้อมูลน้ำท่วมจริง (ดาวเทียม)" อยู่ในแผ่นเดียวกัน', 'ป้ายเตือนสีเหลืองคงอยู่ทุกครั้ง: แบบจำลองทดลอง ไม่ใช่น้ำท่วมสด', 'ใช้ได้เฉพาะท่าตอน (ชุมชนอื่นยังไม่มีข้อมูลน้ำท่วม ปุ่มจะปิดพร้อมข้อความ)', 'ของเดิมในแอป: เมนูเลือกระดับ 3 ค่า + สวิตช์ 2 ตัว + ตำนาน อยู่ใน popup ขวาบน'].forEach((t, i) => G.t(MW + 90, y + 200 + i * 105, '• ' + t, 28, { c:TX, w:940 }));
fs.writeFileSync(process.argv[2], JSON.stringify({ type:'excalidraw', version:2, source:'napus-os', elements:out, appState:{ viewBackgroundColor:'#FFFFFF', gridSize:null }, files:FILES }));
console.log(out.length, 'elements; files', Object.keys(FILES).length, 'bottom', y + 100 + MH);
