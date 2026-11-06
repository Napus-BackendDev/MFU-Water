const fs = require('fs');
const L = 'C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus--claude-spares-spare-zEaDfI/d2aeffde-255e-41fb-bc84-ffd2f8f6abdb/scratchpad/lib.js';
const { C, ctx, out } = require(L);
const G = ctx(0, 0, 1);
const NL = String.fromCharCode(10);
const origT = G.t.bind(G);
const vis = t => [...t].filter(ch => !/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch)).length;
const wrapLine = (line, maxc) => { if (vis(line) <= maxc) return line; const words = line.split(' '); const rows = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (vis(t) <= maxc || !cur) cur = t; else { rows.push(cur); cur = w; } } if (cur) rows.push(cur); return rows.join(NL); };
G.t = (x, y, s0, fs0 = 24, o = {}) => { const fs = fs0 <= 40 ? Math.round(fs0 * 1.2) : fs0; let text = String(s0); if (o.w && o.al !== 'center') { const maxc = Math.floor(o.w / (fs * 0.58)); text = text.split(NL).map(l => wrapLine(l, maxc)).join(NL); } origT(x, y, text, fs, o); };
const W = 2200;
const BL = '#0284C7', GR = '#16A34A', AM = '#D97706', RD = '#DC2626', PU = '#7E22CE', MU = '#64748B', TX = '#0F172A';
const box = (x, y, w, h, bg, st, o = {}) => G.rect(x, y, w, h, { bg, st, sw:o.sw || 2, r:o.r == null ? 20 : o.r, dash:o.dash });
const mid = (x, y, w, h, s, fs, c) => G.tc(x, y, w, h, s, fs, { c });
const arc = (cx, cy, r, a0, a1, col, sw) => { const pts = []; for (let a = a0; a <= a1 + 0.01; a += 2) { const t = (a - 90) * Math.PI / 180; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } G.line(pts, { st:col, sw }); };
const donut = (cx, cy, r, parts, sw) => { const tot = parts.reduce((a, p) => a + p[0], 0); let a = 0; G.ell(cx - r - sw / 2, cy - r - sw / 2, 2 * r + sw, 2 * r + sw, { bg:'#F1F5F9' }); G.ell(cx - r + sw / 2, cy - r + sw / 2, 2 * r - sw, 2 * r - sw, { bg:'#FFFFFF' }); parts.forEach(p => { const d = 360 * p[0] / tot; arc(cx, cy, r, a, a + d - 1.5, p[1], sw); a += d; }); };
const person = (cx, y, col) => { G.ell(cx - 22, y, 44, 44, { bg:col }); G.rect(cx - 34, y + 52, 68, 50, { bg:col, r:26 }); };
const sec = (n, title, y, col) => { G.rect(0, y, W, 84, { bg:col, r:20 }); G.t(30, y + 14, String(n), 52, { c:'#fff', w:60 }); G.t(100, y + 16, title, 46, { c:'#fff', w:1800 }); return y + 120; };
const kpi = (x, y, w, num, label, col) => { box(x, y, w, 190, '#fff', col, { sw:3 }); G.rect(x, y, 14, 190, { bg:col, r:6 }); G.t(x + 40, y + 20, num, 80, { c:col, w:w - 60 }); G.t(x + 40, y + 126, label, 28, { c:TX, w:w - 60 }); };

// ───────── Title
G.t(0, 0, 'MFU Kok Water Watch', 72, { w:2000 });
G.t(0, 88, 'ภาพรวมโครงการ · 26 ต.ค. 2026', 32, { c:MU, w:2000 });

// ───────── 1 System Overview
let y = sec(1, 'System Overview', 150, BL);
const kw = (W - 3 * 30) / 4;
kpi(0, y, kw, '4', 'ชุมชนเป้าหมาย', BL); kpi(kw + 30, y, kw, '24', 'ข้อในขอบเขตรอบนี้', GR); kpi(2 * (kw + 30), y, kw, '3', 'สัปดาห์ · 1–22 พ.ย.', AM); kpi(3 * (kw + 30), y, kw, '129', 'แถวสำรวจ (ท่าตอน)', PU);
y += 230;
// donut + actors
box(0, y, 840, 420, '#fff', C.bd);
G.t(30, y + 18, 'สถานะ 24 ข้อ', 34, { c:TX, w:400 });
donut(230, y + 250, 110, [[6, GR], [14, AM], [4, RD]], 46);
G.t(190, y + 218, '24', 56, { c:TX, w:100 });
[['มีแล้ว', 6, GR], ['บางส่วน', 14, AM], ['ใหม่', 4, RD]].forEach((l, i) => { const yy = y + 120 + i * 90; G.ell(440, yy, 34, 34, { bg:l[2] }); G.t(490, yy - 8, String(l[1]), 52, { c:l[2], w:120 }); G.t(580, yy + 6, l[0], 28, { c:TX, w:240 }); });
const AC = [['ชาวบ้าน / อาสาสมัคร', 'ส่งผลตรวจ · ดูแผนที่และสรุป · อ่านคู่มือ', BL], ['ผู้ประสานงานพื้นที่ / ผู้นำชุมชน', 'ตรวจข้อความแจ้งผล · ติดตามเคส · แผนรับมือภัย', GR], ['ทีมวิจัย มฟล. (7 SWG) / แอดมิน', 'ตรวจคิวค่า > 50 ppb · ตาราง · รายงาน · ส่งออก', PU]];
AC.forEach((a, i) => { const x = 880 + i * 440; box(x, y, 420, 420, '#fff', a[2], { sw:3 }); person(x + 210, y + 40, a[2]); G.t(x + 20, y + 180, a[0], 30, { c:a[2], w:380 }); G.t(x + 20, y + 280, a[1], 26, { c:TX, w:380 }); });
y += 460;
// communities with coverage dots
G.t(0, y, 'ข้อมูลที่มีของแต่ละชุมชน', 38, { c:TX, w:1200 });
y += 70;
const DT = ['โปรไฟล์', 'สำรวจ', 'แผนที่เสี่ยง', 'น้ำท่วม', 'แผนอพยพ'];
const CM = [['ท่าตอน (หมู่ 3)', [1, 1, 1, 1, 1], GR, 'สำรวจ 129 แถว · My Maps · F1'], ['รวมมิตร', [1, 0, 0, 0, 0], AM, 'มีเฉพาะโปรไฟล์ทะเบียน'], ['ปงของ', [1, 0, 0, 0, 0], AM, 'พิกัดต่างชีต ~17 กม. ต้องยืนยัน'], ['ปากอิงใต้', [1, 0, 0, 0, 0], AM, 'โปรไฟล์ + ภาพ/วิดีโอกิจกรรม']];
const cw = (W - 3 * 30) / 4;
CM.forEach((c, i) => { const x = i * (cw + 30); box(x, y, cw, 360, '#fff', c[2], { sw:3 }); G.rect(x, y, cw, 76, { bg:c[2], r:20 }); G.rect(x, y + 40, cw, 36, { bg:c[2], r:0 }); G.t(x + 24, y + 14, c[0], 40, { c:'#fff', w:cw - 40 });
  c[1].forEach((v, j) => { const yy = y + 100 + j * 44; G.ell(x + 28, yy, 30, 30, { bg:v ? c[2] : '#fff', st:v ? c[2] : '#CBD5E1', sw:3 }); G.t(x + 76, yy - 2, DT[j], 26, { c:v ? TX : '#94A3B8', w:cw - 100 }); });
  G.t(x + 24, y + 322, c[3], 24, { c:c[2], w:cw - 40 }); });
y += 400;
// scope
box(0, y, 1330, 160, '#DCFCE7', GR, { sw:3 }); G.t(30, y + 14, 'ในแผนรอบนี้ · 24 ข้อ', 30, { c:GR, w:900 }); G.t(30, y + 62, 'R01–R14 · R16 · R19–R25 · R27 · R29', 30, { c:TX, w:1280 }); G.t(30, y + 106, 'เรียงตามผลต่อเป้าหมาย ตัดจากท้ายถ้าเวลาไม่พอ', 24, { c:MU, w:1280 });
box(1370, y, 830, 160, '#FEF2F2', RD, { sw:3 }); G.t(1400, y + 14, 'นอกแผนรอบนี้', 30, { c:RD, w:300 }); G.t(1400, y + 62, 'ตัด R28 R18 R26 · ผู้ใช้ทำเอง R15 R17', 26, { c:TX, w:780 }); G.t(1400, y + 106, 'ไม่ส่ง LINE/SMS จริง · ไม่เผยแพร่ชื่อ/เบอร์/พิกัดรายบ้าน', 22, { c:MU, w:780 });
y += 220;

// ───────── 2 Architecture
y = sec(2, 'Architecture', y, GR);
const AB = [['ผู้ใช้ (เบราว์เซอร์)', 'มือถือ / คอมพิวเตอร์ · ชาวบ้าน ผู้ประสานงาน แอดมิน', 'หน้าเดียว สลับมุมมอง landing · dashboard · admin', BL], ['Frontend · Nuxt 4 + Leaflet', 'KokMapPanel · KokSurveyModal · KokAdminDataTablePage', 'กราฟแนวโน้ม · ข้อมูลสาธารณะ data/*.json', BL], ['API · Vercel Functions', 'surveys: prepare · complete · photo · waypoints', 'admin: verify-passcode · samples · review · photo', GR], ['Supabase', 'water_quality_surveys · rate_limits · map_configs', 'bucket survey-photos (private) · รหัสตัวอย่างไม่เกิน 9,999/วัน', PU]];
const aw = (W - 3 * 70) / 4;
AB.forEach((b, i) => { const x = i * (aw + 70); box(x, y, aw, 330, '#fff', b[3], { sw:4 }); G.rect(x, y, aw, 70, { bg:b[3], r:20 }); G.rect(x, y + 40, aw, 30, { bg:b[3], r:0 }); G.t(x + 20, y + 12, b[0], 30, { c:'#fff', w:aw - 40 }); G.t(x + 20, y + 96, b[1], 26, { c:TX, w:aw - 40 }); G.t(x + 20, y + 206, b[2], 24, { c:MU, w:aw - 40 });
  if (i < 3) G.line([[x + aw + 6, y + 165], [x + aw + 64, y + 165]], { st:MU, sw:5, arrow:true }); });
y += 370;
G.t(0, y, 'ลำดับส่งผลตรวจ', 34, { c:TX, w:800 }); y += 56;
const FL = [['1 prepare', 'จำกัด 5 ครั้ง/ชม./IP · ออกตั๋วลงนาม', BL], ['2 อัปโหลดรูป', 'ลิงก์ลงนามอายุสั้น · JPG/PNG/WebP', BL], ['3 complete', 'บันทึก · รหัส KOK-YYYYMMDD-NNNN', GR], ['4 แอดมินตรวจ', '> 50 ppb รอตรวจ · ≤ 50 เผยแพร่เลย', RD]];
FL.forEach((f, i) => { const x = i * (aw + 70); box(x, y, aw, 170, f[2] + '15', f[2], { sw:3, r:40 }); G.t(x + 28, y + 14, f[0], 32, { c:f[2], w:aw - 50 }); G.t(x + 28, y + 70, f[1], 24, { c:TX, w:aw - 50 });
  if (i < 3) G.line([[x + aw + 6, y + 85], [x + aw + 64, y + 85]], { st:MU, sw:5, arrow:true }); });
y += 210;
G.t(0, y, 'บริการภายนอก', 34, { c:TX, w:800 }); y += 56;
const EX = [['แผนที่พื้นหลัง', 'OpenStreetMap (MapTiler/Esri ใส่ key ได้ ไม่บังคับ)', BL, false], ['Cloudflare Turnstile', 'มีโค้ดตรวจ แต่ปิดอยู่', MU, true], ['Google Earth Engine', 'ตรวจสถานะการเชื่อมต่อ (อ่านอย่างเดียว)', GR, false], ['My Maps / KokData', 'นำเข้าตอนพัฒนา ไม่เปิดใน production', AM, false]];
EX.forEach((e, i) => { const x = i * (aw + 70); box(x, y, aw, 170, '#fff', e[2], { sw:3, dash:e[3] }); G.t(x + 20, y + 14, e[0], 30, { c:e[2], w:aw - 40 }); G.t(x + 20, y + 64, e[1], 24, { c:TX, w:aw - 40 }); });
y += 200;
box(0, y, W, 76, '#FFFBEB', AM, { sw:3 }); G.t(24, y + 18, 'ต้องยืนยัน: ตาราง kok_admin_alerts ใช้ในโค้ด แต่ไม่พบ migration', 28, { c:AM, w:2100 });
y += 140;

// ───────── 3 Use Case
y = sec(3, 'Use Case', y, PU);
const UY = y, UH = 1020, SX = 340, SW = 1520;
G.rect(SX, UY, SW, UH, { bg:'#FAF5FF', st:PU, sw:4, r:28, dash:true });
G.t(SX + 30, UY + 16, 'MFU Kok Water Watch', 34, { c:PU, w:800 });
const actor = (x, yy, label, col) => { G.ell(x - 28, yy, 56, 56, { bg:'#fff', st:col, sw:4 }); G.line([[x, yy + 56], [x, yy + 150]], { st:col, sw:4 }); G.line([[x - 54, yy + 90], [x + 54, yy + 90]], { st:col, sw:4 }); G.line([[x, yy + 150], [x - 40, yy + 210]], { st:col, sw:4 }); G.line([[x, yy + 150], [x + 40, yy + 210]], { st:col, sw:4 }); G.tc(x - 160, yy + 222, 320, 60, label, 26, { c:col }); };
const A1 = [150, UY + 380], A2 = [2050, UY + 140], A3 = [2050, UY + 700];
actor(A1[0], A1[1], 'ชาวบ้าน / อาสาสมัคร', BL); actor(A2[0], A2[1], 'ผู้ประสานงานพื้นที่ / ผู้นำชุมชน', GR); actor(A3[0], A3[1], 'ทีมวิจัย / แอดมิน', PU);
const UC = (cx, cy, label, rs, st) => { const col = st === 'have' ? GR : AM; G.ell(cx - 200, cy - 56, 400, 112, { bg:'#fff', st:col, sw:4 }); G.tc(cx - 200, cy - 44, 400, 44, label, 26, { c:TX }); G.tc(cx - 200, cy + 4, 400, 36, rs, 24, { c:MU }); return [cx, cy]; };
const V = [['เลือกพื้นที่ชุมชน', 'R02', 'have', 600, UY + 130], ['ดูแผนที่ทีละหัวข้อ', 'R23 R03', 'have', 600, UY + 290], ['ส่งผลตรวจ', 'R04 R11', 'have', 600, UY + 450], ['ดูสรุปและแนวโน้ม', 'R07 R22', 'have', 600, UY + 610], ['กรองพื้นที่/เวลา/ผล', 'R08', 'plan', 600, UY + 770], ['อ่านคู่มือและบทเรียน', 'R13 R14', 'plan', 600, UY + 930]];
V.forEach(u => { const p = UC(u[3], u[4], u[0], u[1], u[2]); G.line([[A1[0] + 54, A1[1] + 90], [p[0] - 200, p[1]]], { st:BL, sw:2.5 }); });
UC(1100, UY + 450, 'ระบุตำแหน่ง GPS + ภาพ', 'R06', 'have');
G.line([[800, UY + 450], [900, UY + 450]], { st:AM, sw:3, arrow:true, dash:true }); G.t(792, UY + 400, 'include', 22, { c:AM, w:120 });
const Cc = [['แจ้งผลถึงชุมชน', 'R01', 'plan', 1610, UY + 130], ['ติดตามเคส', 'R05', 'plan', 1610, UY + 290], ['แผนรับมือภัย', 'R16', 'plan', 1610, UY + 450]];
Cc.forEach(u => { const p = UC(u[3], u[4], u[0], u[1], u[2]); G.line([[A2[0] - 54, A2[1] + 90], [p[0] + 200, p[1]]], { st:GR, sw:2.5 }); });
const Ad = [['ตรวจคิวค่า > 50 ppb', 'R10', 'have', 1610, UY + 640], ['ดูตาราง · ส่งออก CSV', 'R10', 'have', 1610, UY + 790], ['ออกรายงาน', 'R09', 'plan', 1610, UY + 940]];
Ad.forEach(u => { const p = UC(u[3], u[4], u[0], u[1], u[2]); G.line([[A3[0] - 54, A3[1] + 90], [p[0] + 200, p[1]]], { st:PU, sw:2.5 }); });
G.line([[1260, UY + 520], [1470, UY + 600]], { st:AM, sw:3, arrow:true, dash:true }); G.t(1300, UY + 560, 'extend', 22, { c:AM, w:120 });
y = UY + UH + 30;
G.ell(0, y + 8, 40, 30, { st:GR, sw:4 }); G.t(56, y + 4, 'มีแล้ว', 28, { c:TX, w:200 }); G.ell(240, y + 8, 40, 30, { st:AM, sw:4 }); G.t(296, y + 4, 'อยู่ในแผน', 28, { c:TX, w:300 });
y += 100;

// ───────── 4 Timeline
y = sec(4, 'Timeline · แผน 3 สัปดาห์ (1–22 พ.ย.)', y, AM);
G.t(0, y - 10, 'เรียงงานตามผลกระทบต่อเป้าหมาย มาก → น้อย · เป้าหมาย: ① เก็บข้อมูลให้ได้ดีที่สุด ② แจ้งผลและแสดงผลให้เรียบง่ายที่สุด', 28, { c:MU, w:2150 });
y += 60;
const TG = { w:['รอคนอื่น', AM], a:['ต้องอนุมัติ', RD], o:['ถ้ายังอยู่ในแผน', MU] };
const WK = [
 ['สัปดาห์ 1 · 1–7 พ.ย.', 'เก็บข้อมูลให้เสถียรและปลอดภัย', BL, [
  ['1', 'ส่งผลตรวจให้เสถียร', 'ปุ่มส่งมีสถานะ/กันกดซ้ำ · หน้าสำเร็จ-ล้มเหลว · หน้าโหลดดิ้งมาสคอต', []],
  ['2', 'R10 แอดมินปลอดภัย', 'หน้า login ไม่เผยรหัส · ตั้งรหัสฝั่งเซิร์ฟเวอร์ · ยืนยัน migrations', ['a']],
  ['3', 'R11 ปัจจัยแวดล้อม', 'ฟิลด์ฝน / ใกล้เหมือง / การใช้น้ำ ถึงตารางและ CSV', ['a']],
  ['4', 'R05 ติดตามผู้รายงาน', 'สถานะเคส · ผู้รับผิดชอบ · กำหนดตรวจซ้ำ', []],
  ['5', 'R22 ภาษาแสดงผล', 'ป้ายผล 3 ระดับ + ข้อความสั้นภาษาง่าย', []]]],
 ['สัปดาห์ 2 · 8–14 พ.ย.', 'แสดงผลเรียบง่ายและแจ้งผลถึงชุมชน', GR, [
  ['6', 'R08 ตัวกรอง', 'เพิ่มกรองกลุ่มผล + เลือกพื้นที่', []],
  ['7', 'R03 แผนที่สองระดับ', 'ปุ่มสลับ "ในหมู่บ้าน / รอบหมู่บ้าน"', []],
  ['8', 'R01 แจ้งผลถึงชุมชน', 'ร่างข้อความภาษาง่าย · บันทึกอนุมัติ/ส่ง/รับทราบ (POC ไม่ส่งจริง)', []],
  ['9', 'R16 แผนรับมือภัย', 'หน้าค้นหาและเปิดแผนของชุมชน', ['w']],
  ['10', 'R09 รายงาน', 'สรุปตามระดับ ส่งออก PDF / CSV', []]]],
 ['สัปดาห์ 3 · 15–22 พ.ย.', 'ส่วนเสริม ทดสอบ ส่งมอบ', AM, [
  ['11', 'R12 / R29 เครดิตผู้สนับสนุน', 'โลโก้จริงบนหน้าแรก หน้าโหลดดิ้ง และแผนที่พิมพ์', ['w']],
  ['12', 'R27 ขอบเขตการปกครอง', 'เลเยอร์เส้นขอบบนแผนที่', ['w']],
  ['13', 'R19 / R24 แผนที่หัวข้อ', 'เปิดใช้ตัวเลือกหัวข้อ แสดงทีละเรื่อง', []],
  ['14', 'R14 บทเรียนเยาวชน', 'บทเรียนในหน้าคู่มือ', ['w']],
  ['15', 'R20 ภาพก่อน–หลังน้ำท่วม', 'แถบเลื่อนเปรียบเทียบ (ไม่มีภาพจริงใช้แบบจำลอง)', ['w']],
  ['16', 'R25 Timeline', 'ไทม์ไลน์เหตุการณ์ในหน้าเดียว', []],
  ['17', 'R21 พิมพ์แผนที่ A0', 'PDF ต่อชุมชนทีละหัวข้อ (ตอนนี้ท่าตอนเท่านั้น)', []],
  ['18', 'R13 คลิปสอน', 'ฝังคลิปในคู่มือ', ['w', 'o']],
  ['✓', 'ทดสอบและส่งมอบ', 'ทดสอบ · preview deploy · คู่มือส่งมอบ', ['a']]]]];
const tw = (W - 2 * 30) / 3;
WK.forEach((w, i) => { const x = i * (tw + 30); box(x, y, tw, 150, w[2], w[2], { r:24 }); G.t(x + 24, y + 14, w[0], 38, { c:'#fff', w:tw - 40 }); G.t(x + 24, y + 72, 'ส่งมอบ: ' + w[1], 26, { c:'#fff', w:tw - 40 });
  G.t(x + tw - 150, y + 8, String(w[3].length), 70, { c:'#ffffff', w:130 }); });
y += 180;
const CHH = 190, CG = 16;
WK.forEach((w, i) => { const x = i * (tw + 30); w[3].forEach((t, j) => { const yy = y + j * (CHH + CG);
  box(x, yy, tw, CHH, '#fff', C.bd, { sw:2.5, r:20 }); G.rect(x + 20, yy + 20, 62, 62, { bg:w[2], r:31 }); G.tc(x + 20, yy + 20, 62, 62, t[0], 30, { c:'#fff' });
  G.t(x + 104, yy + 14, t[1], 30, { c:TX, w:tw - 130 }); G.t(x + 104, yy + 62, t[2], 24, { c:MU, w:tw - 130 });
  let tx = x + 104; t[3].forEach(k => { const [lab, col] = TG[k]; const cwid = lab.length * 17 + 50; G.rect(tx, yy + CHH - 52, cwid, 38, { bg:col + '18', st:col, sw:2, r:19 }); G.tc(tx, yy + CHH - 52, cwid, 38, lab, 22, { c:col }); tx += cwid + 12; }); }); });
y += 9 * (CHH + CG) + 30;
box(0, y, W, 190, '#F8FAFC', C.bd, { sw:2 });
G.t(24, y + 16, 'ถ้าเวลาไม่พอ ตัดจากท้ายก่อน:  R13 → R21 → R25 → R20 → R14', 32, { c:RD, w:2100 });
G.t(24, y + 70, 'แกนที่ต้องส่งให้ได้: งาน 1–9 (เก็บข้อมูล ตรวจสอบ แสดงผล แจ้งผล)', 28, { c:TX, w:2100 });
G.t(24, y + 118, 'นอกแผนรอบนี้: ตัดออก R28 · R18 · R26  |  ผู้ใช้ทำเอง R17 · R15  |  production ต้องขออนุมัติแยก', 26, { c:MU, w:2100 });
y += 250;

// ───────── 5 Budget
y = sec(5, 'งบประมาณและดูแลหลังส่งมอบ', y, RD);
const BW = (W - 2 * 30) / 3;
const big = (x, yy, title, num, sub, col, dash) => { box(x, yy, BW, 290, dash ? '#fff' : col + '12', col, { sw:3, dash }); G.t(x + 28, yy + 18, title, 30, { c:col, w:BW - 50 }); G.t(x + 28, yy + 70, num, dash ? 56 : 72, { c:dash ? '#94A3B8' : col, w:BW - 50 }); G.t(x + 28, yy + 172, sub, 24, { c:MU, w:BW - 50 }); };
big(0, y, 'Vercel Pro', '฿672', 'ต่อเดือน (≈ $20) · ฿8,064/ปี ต่อ 1 ที่นั่ง · โควตาจริงต้องดู vercel.com/pricing (แหล่งต่าง ๆ ตัวเลขไม่ตรงกัน)', GR, false);
big(BW + 30, y, 'โดเมน .com', '฿350–630', 'ต่อปี (≈ $10–19) · Cloudflare ฿351 · Namecheap ปีแรก ฿386 ต่ออายุ ฿628 · ราคาขายส่ง .com ขึ้น 1 พ.ย. 2026', BL, false);
big(2 * (BW + 30), y, 'Supabase', '?', 'ใช้เก็บผลตรวจและรูป · ยังไม่ได้ค้นราคา · ไม่รวมในยอด Vercel + โดเมน', MU, true);
y += 320;
['ค่าพัฒนา เฟส 1 · งาน 1–5 (1–7 พ.ย.)', 'ค่าพัฒนา เฟส 2 · งาน 6–10 (8–14 พ.ย.)', 'ค่าพัฒนา เฟส 3 · งาน 11–18 (15–22 พ.ย.)', 'MA (การดูแลระบบหลังส่งมอบ)', 'Warranty (การรับประกัน)', 'การอบรมผู้ใช้'].forEach((t, i) => { const x = (i % 3) * (BW + 30), yy = y + Math.floor(i / 3) * 160; box(x, yy, BW, 140, '#fff', '#94A3B8', { sw:2.5, dash:true }); G.t(x + 28, yy + 18, t, 30, { c:TX, w:BW - 50 }); G.t(x + 28, yy + 72, '฿ [กรอก]', 44, { c:'#94A3B8', w:BW - 50 }); });
y += 340;
G.t(0, y, 'เทียบราคาโดเมนต่อปี (บาท)', 36, { c:TX, w:1200 }); y += 64;
const BR = [['.com Cloudflare', 351, BL], ['.com Namecheap ปีแรก', 386, BL], ['ผู้ให้บริการไทย (เริ่ม)', 500, GR], ['.com Namecheap ต่ออายุ', 628, BL], ['.co.th (ต่ำสุด)', 1452, AM], ['.in.th (สูงสุด)', 4005, RD]];
const sc = 1100 / 4005;
BR.forEach((b, i) => { const yy = y + i * 74; G.t(0, yy + 14, b[0], 28, { c:TX, w:520 }); G.rect(540, yy + 4, Math.max(12, b[1] * sc), 52, { bg:b[2], r:10 }); G.t(540 + b[1] * sc + 20, yy + 10, '฿' + b[1].toLocaleString('en-US'), 32, { c:b[2], w:260 }); });
y += BR.length * 74 + 20;
box(0, y, W, 130, '#FFFBEB', AM, { sw:3 });
G.t(24, y + 14, 'แปลงที่ 33.6 บาท/ดอลลาร์ (ประมาณ ปลาย ก.ค.–ส.ค. 2026 ไม่พบอัตราวันนี้) · ราคาจากเว็บอ้างอิง ต้องยืนยันตอนซื้อ', 26, { c:TX, w:2150 });
G.t(24, y + 76, 'ช่อง [กรอก] ไม่มีตัวเลขในไฟล์โปรเจกต์ จึงเว้นว่าง ไม่ประมาณเอง', 26, { c:MU, w:2150 });

fs.writeFileSync(process.argv[2], JSON.stringify({ type:'excalidraw', version:2, source:'napus-os', elements:out, appState:{ viewBackgroundColor:'#FFFFFF', gridSize:null }, files:{} }));
console.log(out.length, 'elements; bottom', y + 130);
