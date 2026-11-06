const fs = require('fs');
const L = 'C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus--claude-spares-spare-zEaDfI/d2aeffde-255e-41fb-bc84-ffd2f8f6abdb/scratchpad/lib.js';
const { C, ctx, out } = require(L);
const G = ctx(0, 0, 1);
const NL = String.fromCharCode(10);
const origT = G.t.bind(G);
const vis = t => [...t].filter(ch => !/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch)).length;
const wrapLine = (line, maxc) => { if (vis(line) <= maxc) return line; const words = line.split(' '); const rows = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (vis(t) <= maxc || !cur) cur = t; else { rows.push(cur); cur = w; } } if (cur) rows.push(cur); return rows.join(NL); };
G.t = (x, y, s0, fs0 = 24, o = {}) => { const fs = fs0 <= 40 ? Math.round(fs0 * 1.2) : fs0; let text = String(s0); if (o.w && o.al !== 'center') { const maxc = Math.floor(o.w / (fs * 0.58)); text = text.split(NL).map(l => wrapLine(l, maxc)).join(NL); } origT(x, y, text, fs, o); };
const NAVY = '#0B1437', CARD = '#FFFFFF', TX = '#0F172A', MU = '#64748B';
const ST = { u:['#16A34A', 'ใช้อยู่'], p:['#EA7A0B', 'เสนอ'], o:['#94A3B8', 'ปิดอยู่'], n:['#7E22CE', 'อัปเดต'] };
const CAT = [
  ['Frontend', '#1D4ED8', [['Nuxt 4 + Vue 3', 'N', '#16A34A', 'u'], ['Nuxt UI', 'U', '#0EA5E9', 'u'], ['Tailwind CSS', 'T', '#06B6D4', 'u'], ['Leaflet (แผนที่)', 'L', '#22C55E', 'u'], ['Lucide (ไอคอน)', 'I', '#F97316', 'u']]],
  ['Backend', '#047857', [['Nitro (server/)', 'N', '#16A34A', 'u'], ['Express (api/)', 'E', '#334155', 'u'], ['Vercel Functions', 'V', '#0F172A', 'u']]],
  ['Database', '#6D28D9', [['Supabase Postgres', 'S', '#16A34A', 'u'], ['Row Level Security', 'R', '#7E22CE', 'u'], ['ไฟล์ข้อมูลสาธารณะ', 'J', '#64748B', 'u']]],
  ['Auth', '#7C3AED', [['Google Auth', 'G', '#DB4437', 'p'], ['Supabase Auth (ตัวเชื่อม)', 'S', '#16A34A', 'p'], ['รหัสผ่านแอดมินเดิม', 'P', '#64748B', 'n'], ['Cloudflare Turnstile', 'T', '#F97316', 'o']]],
  ['Storage', '#EA580C', [['Supabase Storage', 'S', '#16A34A', 'u'], ['ที่เก็บรูปถ่าย (ส่วนตัว)', 'B', '#7E22CE', 'u'], ['ลิงก์อัปโหลดลงนาม', 'H', '#0EA5E9', 'u']]],
  ['Maps & Geo', '#0E7490', [['OpenStreetMap tiles', 'O', '#16A34A', 'u'], ['Google Earth Engine', 'E', '#4285F4', 'u'], ['Sentinel-2 / GLO-30', 'C', '#0EA5E9', 'u'], ['MapTiler / Esri', 'M', '#64748B', 'o']]],
  ['Deployment', '#0369A1', [['Vercel Pro ≈ ฿672/เดือน', 'V', '#0F172A', 'u'], ['GitHub (โค้ด + CI)', 'G', '#334155', 'u'], ['โดเมน .com ≈ ฿350–630/ปี', 'D', '#EA7A0B', 'p']]],
  ['Testing & Quality', '#BE185D', [['Vitest (75 เทสต์)', 'V', '#16A34A', 'u'], ['Playwright (e2e)', 'P', '#22C55E', 'u'], ['oxlint', 'O', '#EA7A0B', 'u'], ['TypeScript', 'T', '#2563EB', 'u']]],
  ['Security', '#B91C1C', [['จำกัด 5 ครั้ง/ชม./IP', '5', '#DC2626', 'u'], ['ซ่อนกริดที่ข้อมูล < 5 แถว', 'k', '#7E22CE', 'u'], ['ชื่อ/เบอร์ไม่เผยแพร่', 'P', '#0EA5E9', 'u'], ['ค่า > 50 ppb รอแอดมิน', '!', '#EA7A0B', 'u']]],
];
const W = 2220, CW = 700, GAP = 60, HDR = 90, ROW = 78;
const PADY = 300;
G.rect(-60, -60, W + 120, 2500, { bg:NAVY, r:0 });
G.t(0, 10, 'MFU Kok Water Watch', 40, { c:'#7DD3FC', w:1200 });
G.t(0, 70, 'Tech Stack', 110, { c:'#FFFFFF', w:1400 });
G.t(0, 200, 'เฉพาะเครื่องมือที่ใช้จริงในโปรเจกต์ + ที่เสนอเพิ่ม แยกตามประเภท', 30, { c:'#BAE6FD', w:2000 });
// legend
let lx = 1020; [['u', 'ใช้อยู่แล้ว'], ['p', 'เสนอ (ยังไม่ทำ)'], ['n', 'จะเปลี่ยน'], ['o', 'ปิดอยู่/ไม่บังคับ']].forEach(([k, lab]) => { G.ell(lx, 130, 26, 26, { bg:ST[k][0] }); G.t(lx + 40, 124, lab, 24, { c:'#E2E8F0', w:340 }); lx += 330; });
let col = 0, rowY = [PADY, PADY, PADY];
CAT.forEach((c, i) => {
  const cx = (i % 3) * (CW + GAP), cy = rowY[i % 3];
  const h = HDR + c[2].length * ROW + 24;
  G.rect(cx, cy, CW, h, { bg:CARD, r:26 });
  G.rect(cx, cy, CW, HDR, { bg:c[1], r:26 }); G.rect(cx, cy + 50, CW, HDR - 50, { bg:c[1], r:0 });
  G.t(cx + 28, cy + 18, c[0], 38, { c:'#FFFFFF', w:CW - 60 });
  c[2].forEach((it, j) => {
    const yy = cy + HDR + 16 + j * ROW;
    G.ell(cx + 28, yy + 6, 52, 52, { bg:it[2] }); G.tc(cx + 28, yy + 6, 52, 52, it[1], 28, { c:'#fff' });
    G.t(cx + 100, yy + 10, it[0], 28, { c:TX, w:CW - 230 });
    G.ell(cx + CW - 56, yy + 20, 24, 24, { bg:ST[it[3]][0] });
  });
  rowY[i % 3] = cy + h + 40;
});
const endY = Math.max(...rowY);
// Auth flow panel
const FY = endY + 20;
G.rect(0, FY, W, 560, { bg:'#1E1B4B', st:'#A78BFA', sw:3, r:30 });
G.t(30, FY + 20, 'ล็อกอินด้วย Google Auth (ข้อเสนอ)', 46, { c:'#FFFFFF', w:1600 });
G.t(30, FY + 90, 'ใช้ Supabase Auth เป็นตัวเชื่อม (ระบบใช้ Supabase อยู่แล้ว) เปลี่ยนจากรหัสผ่านแอดมินเดิม', 28, { c:'#C4B5FD', w:2000 });
const STEPS = [['1', 'กด "เข้าสู่ระบบด้วย Google"', '#4285F4'], ['2', 'Google ยืนยันตัวตน', '#DB4437'], ['3', 'Supabase Auth ออก session', '#16A34A'], ['4', 'ตรวจอีเมลในรายชื่อแอดมิน', '#F59E0B'], ['5', 'เข้าหน้า Admin', '#7E22CE']];
const sw = 350, sg = 70;
STEPS.forEach((s, i) => { const x = i * (sw + sg); G.rect(x + 30, FY + 170, sw - 30, 200, { bg:'#312E81', st:s[2], sw:4, r:26 }); G.ell(x + 46, FY + 186, 56, 56, { bg:s[2] }); G.tc(x + 46, FY + 186, 56, 56, s[0], 30, { c:'#fff' }); G.t(x + 54, FY + 262, s[1], 28, { c:'#fff', w:sw - 80 });
  if (i < 4) G.line([[x + sw + 4, FY + 270], [x + sw + sg + 26, FY + 270]], { st:'#A78BFA', sw:5, arrow:true }); });
G.t(30, FY + 400, 'ต้องมี: OAuth client ใน Google Cloud · เปิด Google provider ใน Supabase · เก็บรายชื่ออีเมลแอดมินฝั่งเซิร์ฟเวอร์ (ไม่ใส่ในโค้ด/แชต) · ยกเลิกรหัสผ่านแอดมินเดิม', 26, { c:'#E0E7FF', w:2100 });
G.t(30, FY + 480, 'ยังไม่ตัดสินใจ: ชาวบ้านที่ส่งผลตรวจต้องล็อกอินไหม (ตอนนี้ไม่ต้อง) · migration/ตั้งค่า production ต้องขออนุมัติแยก', 26, { c:'#FDE68A', w:2100 });
G.t(0, FY + 600, 'ราคาแปลงที่ 33.6 บาท/ดอลลาร์ (ประมาณ) · ไอคอนวงกลมเป็นตัวย่อ ไม่ใช่โลโก้จริง · Supabase ยังไม่ได้ค้นราคา', 24, { c:'#94A3B8', w:2100 });
out[0].height = FY + 700 + 60;
fs.writeFileSync(process.argv[2], JSON.stringify({ type:'excalidraw', version:2, source:'napus-os', elements:out, appState:{ viewBackgroundColor:'#FFFFFF', gridSize:null }, files:{} }));
console.log(out.length, 'bottom', FY + 700);
