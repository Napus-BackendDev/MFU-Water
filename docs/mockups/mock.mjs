import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const U = 'http://127.0.0.1:5173/';
const img = n => 'data:image/png;base64,' + fs.readFileSync('shots/' + n).toString('base64');
const IM = { mapD: img('s2-map-d.png'), floodD: img('s2b-flood-d.png'), mapM: img('s2-map-m.png'), floodM: img('s2b-flood-m.png') };

const CSS = `
.mk{--pri:#0284C7;--bd:#E2E8F0;--mu:#64748B;--tx:#0F172A;--new:#EA7A0B;font-family:inherit;color:var(--tx);box-sizing:border-box}
.mk *{box-sizing:border-box}
.page{position:fixed;inset:0;background:#F8FAFC;overflow:hidden;display:flex;flex-direction:column}
.top{background:#fff;border-bottom:1px solid var(--bd);padding:14px 28px;display:flex;align-items:center;gap:14px}
.top h1{font-size:18px;margin:0;font-weight:700}.top small{color:var(--mu);font-size:12px}
.back{border:1px solid var(--bd);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;background:#fff;white-space:nowrap}
.ico{width:40px;height:40px;border-radius:12px;background:#E0F2FE;color:var(--pri);display:grid;place-items:center;font-weight:700}
.new{background:var(--new);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:4px 10px;white-space:nowrap}
.body{flex:1;padding:24px 28px;overflow:hidden;display:grid;gap:18px;min-height:0}
.card{background:#fff;border:1px solid var(--bd);border-radius:18px;padding:20px;min-width:0}
.card h2{font-size:15px;margin:0 0 12px;font-weight:700}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--bd);background:#fff;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13px;white-space:nowrap}
.btn.pri{background:var(--pri);border-color:var(--pri);color:#fff}.btn.grn{background:#16A34A;border-color:#16A34A;color:#fff}.btn.red{color:#DC2626;border-color:#DC2626}
.chip{display:inline-flex;border:1px solid var(--bd);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;background:#fff;color:var(--mu);white-space:nowrap}
.chip.on{background:var(--pri);color:#fff;border-color:var(--pri)}.chip.g{color:#16A34A;border-color:#16A34A;background:#F0FDF4}.chip.a{color:#B45309;border-color:#F59E0B;background:#FFFBEB}.chip.r{color:#DC2626;border-color:#DC2626;background:#FEF2F2}
.lbl{font-size:11px;color:var(--mu);font-weight:600;margin-bottom:6px;display:block}
.inp{border:1px solid var(--bd);border-radius:12px;padding:11px 14px;font-size:13px;color:var(--mu);background:#fff}
.mut{color:var(--mu);font-size:12px}.row{display:flex;gap:10px;align-items:center}.col{display:flex;flex-direction:column;gap:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.ph{background:#E2E8F0;border-radius:14px;display:grid;place-items:center;color:var(--mu);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:var(--mu);font-size:11px;padding:8px 10px;border-bottom:1px solid var(--bd)}td{padding:11px 10px;border-bottom:1px solid #F1F5F9}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}
.fx{position:fixed;z-index:60}
.pill{background:#fff;border:1px solid var(--bd);box-shadow:0 4px 16px #0f172a22;border-radius:999px;padding:9px 16px;font-size:13px;font-weight:600;display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.seg{display:inline-flex;background:#fff;border:1px solid var(--bd);box-shadow:0 4px 16px #0f172a22;border-radius:999px;padding:4px}
.seg span{padding:8px 16px;border-radius:999px;font-size:13px;font-weight:700;color:var(--mu)}.seg .on{background:var(--pri);color:#fff}
.sheet{background:#fff;border:1px solid var(--bd);box-shadow:0 12px 40px #0f172a33}
.star{width:30px;height:30px;border-radius:50%;background:var(--new);border:3px solid #fff;color:#fff;display:grid;place-items:center;font-size:14px;box-shadow:0 2px 8px #0003}
@media (max-width:700px){.top{padding:12px 14px;gap:10px}.top h1{font-size:15px}.top .ico{display:none}.body{padding:14px;gap:12px}.body[style*="grid-template-columns"]{grid-template-columns:1fr!important}.adm{grid-template-columns:1fr!important}.kp{grid-template-columns:repeat(2,1fr)!important}.s7{grid-template-columns:repeat(2,1fr)!important}.grid2{grid-template-columns:1fr}.hide-m{display:none!important}.card{padding:14px;border-radius:16px}td,th{white-space:nowrap;padding:9px 6px}.mono{font-size:12px}}
`;

const play = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const head = (title, sub) => `<div class="top"><span class="back">← กลับ</span><span class="ico">≋</span><div style="flex:1;min-width:0"><h1>${title}</h1><small>${sub}</small></div><span class="new hide-m">ข้อเสนอใหม่ · ยังไม่มีในระบบ</span></div>`;
const ex = '<span class="mut">[ตัวอย่างโครง]</span>';

const PAGES = {
  // S5 admin table
  admin: () => `<div class="page mk">${head('ระบบตรวจสอบและจัดการข้อมูลน้ำ (Admin Data Table)', 'มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก')}
  <div class="body" style="grid-template-rows:auto auto 1fr"><div class="row" style="flex-wrap:wrap"><div class="kp" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;flex:1;min-width:280px">
  ${[['ทั้งหมด','—','#0284C7'],['รอตรวจ > 50 ppb','—','#DC2626'],['อนุมัติแล้ว','—','#16A34A'],['เผยแพร่อัตโนมัติ','—','#64748B']].map(k => `<div class="card" style="padding:14px"><span class="mut">${k[0]}</span><div style="font-size:26px;font-weight:800;color:${k[2]}" class="mono">${k[1]}</div></div>`).join('')}</div></div>
  <div class="row" style="flex-wrap:wrap"><span class="chip">ทั้งหมด</span><span class="chip on">รอตรวจ</span><span class="chip">อนุมัติ</span><span class="chip">ปฏิเสธ</span><span class="chip">ระดับ ▾ ทั้งหมด</span><span style="flex:1"></span><span class="btn">⤓ Export CSV</span><span class="btn pri hide-m">ออกรายงาน (R09)</span></div>
  <div style="display:grid;grid-template-columns:1.9fr 1fr;gap:18px;min-height:0" class="adm"><div class="card" style="padding:6px 10px;overflow:hidden"><table><tr><th>รหัสตัวอย่าง</th><th>เวลาเก็บ</th><th>ppb</th><th class="hide-m">แหล่งน้ำ</th><th class="hide-m">ผู้รายงาน</th><th>สถานะ</th></tr>
  ${[0,1,2,3,4,5,6,7].map(i => { const hi = i === 2; return `<tr><td class="mono">KOK-YYYYMMDD-00${i+1}</td><td>[เวลา]</td><td class="mono" style="color:${hi?'#DC2626':'#16A34A'};font-weight:700">${hi?'> 50':'≤ 10'}</td><td class="hide-m">[แหล่งน้ำ]</td><td class="hide-m"><span style="background:#E2E8F0;border-radius:6px;display:inline-block;width:70px;height:10px"></span></td><td><span class="chip ${hi?'r':'g'}">${hi?'รอตรวจ':'เผยแพร่'}</span></td></tr>`; }).join('')}</table></div>
  <div class="card hide-m"><h2>รายละเอียดตัวอย่าง</h2><div class="ph" style="height:150px">ภาพถ่ายตัวอย่าง</div><p class="mut" style="margin:12px 0">ติดต่อ: ชื่อ · เบอร์ (เฉพาะแอดมิน)<br>หมายเหตุการตรวจ…</p><div class="row"><span class="btn grn" style="flex:1">อนุมัติ</span><span class="btn red" style="flex:1">ปฏิเสธ</span></div></div></div></div></div>`,

  // S8 timeline + before/after
  timeline: () => `<div class="page mk">${head('สรุปเหตุการณ์ · ท่าตอน', 'Timeline และภาพก่อน–หลัง · ใช้ข้อมูลจาก KokData เมื่อพร้อมใช้งาน')}
  <div class="body" style="grid-template-rows:auto 1fr"><div class="card"><h2>Timeline เหตุการณ์ ${ex}</h2><div style="position:relative;height:120px"><div style="position:absolute;left:0;right:0;top:28px;height:4px;background:#0284C7;border-radius:2px"></div>
  ${[0,1,2,3,4].map(i => `<div style="position:absolute;left:${i*22}%;top:0;width:150px" class="${i>2?'hide-m':''}"><div style="width:20px;height:20px;border-radius:50%;background:${i==2?'#DC2626':'#0284C7'};border:3px solid #fff;box-shadow:0 0 0 1px #E2E8F0;margin-top:20px"></div><div style="margin-top:10px;font-size:11px;color:#64748B">[วันที่]</div><div style="font-size:12px;font-weight:700">เหตุการณ์ ${i+1}</div><div class="mut">แหล่งที่มา E##</div></div>`).join('')}</div></div>
  <div class="grid2" style="min-height:0"><div class="card" style="display:flex;flex-direction:column;min-height:0"><div class="row" style="justify-content:space-between"><h2>ก่อน – หลัง น้ำท่วม <span class="chip a" style="margin-left:8px">ตัวอย่างภาพจากแผนที่ของระบบ</span></h2></div>
  <div style="position:relative;flex:1;border-radius:14px;overflow:hidden;min-height:0"><div style="position:absolute;inset:0;background:url(${IM.mapD}) 86% 46%/260% auto"></div><div style="position:absolute;inset:0;background:url(${IM.floodD}) 260% auto;background-position:86% 46%;clip-path:inset(0 0 0 50%)"></div><div style="position:absolute;left:50%;top:0;bottom:0;width:4px;background:#fff;box-shadow:0 0 8px #0006"></div><div style="position:absolute;left:calc(50% - 18px);top:calc(50% - 18px);width:36px;height:36px;border-radius:50%;background:#0284C7;border:3px solid #fff;color:#fff;display:grid;place-items:center">↔</div><span class="pill" style="position:absolute;left:12px;top:12px">ก่อน [วันที่ภาพ]</span><span class="pill" style="position:absolute;right:12px;top:12px">หลัง [วันที่ภาพ]</span></div>
  <div class="row" style="margin-top:12px"><span class="chip on">น้ำท่วม</span><span class="chip">พื้นที่เหมือง</span><span class="chip">วันที่ภาพ ▾</span></div></div>
  <div class="card hide-m"><h2>อินโฟกราฟิกหนึ่งหน้า</h2><div class="ph" style="height:78%">พื้นที่สรุปเหตุการณ์ · ตัวเลขพร้อมรหัสหลักฐาน</div><div class="btn pri" style="margin-top:14px;width:100%">⤓ ดาวน์โหลดภาพ</div></div></div></div></div>`,

  // S9 print A0
  print: () => `<div class="page mk">${head('พิมพ์แผนที่ขนาด A0 รายชุมชน', 'เลือกหัวข้อแผนที่ได้ทีละเรื่อง · ติดที่ทำการผู้ใหญ่บ้าน')}
  <div class="body" style="grid-template-columns:340px 1fr;min-height:0" id="pr"><div class="card hide-m"><h2>ตั้งค่า</h2><span class="lbl">ชุมชน</span><div class="inp">ท่าตอน ▾</div><span class="lbl" style="margin-top:14px">หัวข้อแผนที่ (ทีละเรื่อง)</span><div class="inp">น้ำท่วม ▾</div><span class="lbl" style="margin-top:14px">ขนาดกระดาษ</span><div class="inp">A0 · 841×1189 มม. ▾</div><div class="col" style="margin-top:18px;font-size:13px"><div>☑ คำอธิบายสัญลักษณ์</div><div>☑ เครดิตผู้สนับสนุน (R29)</div><div>☑ QR ไปแผนที่ออนไลน์</div></div><div class="btn pri" style="margin-top:22px;width:100%">⤓ ดาวน์โหลด PDF</div></div>
  <div class="card" style="display:grid;place-items:center;background:#E2E8F0;min-height:0"><div style="height:100%;aspect-ratio:841/1189;max-width:100%;background:#fff;box-shadow:0 8px 30px #0003;padding:14px;display:flex;flex-direction:column;gap:8px"><div style="font-weight:800;font-size:15px">แผนที่น้ำท่วม · บ้านท่าตอน</div><div style="flex:1;border-radius:6px;background:url(${IM.floodD}) center/cover;min-height:0"></div><div style="display:flex;gap:8px;align-items:center;font-size:9px"><div style="flex:1">● ท่วมตื้น ● ท่วมปานกลาง ● ท่วมลึก<br><span style="color:#64748B">สัญลักษณ์และหมายเหตุ</span></div><div style="width:34px;height:34px;border:2px solid #0F172A;display:grid;place-items:center;font-size:8px">QR</div></div><div style="border-top:1px solid #E2E8F0;padding-top:6px;font-size:8px;color:#64748B">ได้รับการสนับสนุนโดย Oxfam · ADPC · DFAT · SDC · มหาวิทยาลัยแม่ฟ้าหลวง</div></div></div></div></div>`,

  // S10 notification center
  notice: () => `<div class="page mk">${head('แจ้งเตือนและติดตามเคส', 'ผู้ประสานงานเตรียมข้อความ · ใน POC ไม่ส่ง LINE / โทรจริง')}
  <div class="body" style="grid-template-columns:420px 1fr;min-height:0"><div class="card" style="overflow:hidden"><h2>เคสที่ต้องติดตาม</h2><div class="col">
  ${[['รอตรวจซ้ำ','a'],['ติดต่อแล้ว','g'],['ปิดเคส',''],['รอตรวจซ้ำ','a']].map((c, i) => `<div style="border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;background:#F8FAFC"><div class="row" style="justify-content:space-between"><b class="mono" style="font-size:13px">KOK-YYYYMMDD-00${i+1}</b><span class="chip ${c[1]}">${c[0]}</span></div><div class="mut" style="margin-top:6px">ผู้รับผิดชอบ [ชื่อ] · ครบกำหนด [วันที่]</div></div>`).join('')}</div></div>
  <div class="card hide-m"><h2>เตรียมข้อความแจ้งชุมชน</h2><span class="lbl">เรื่อง / พื้นที่</span><div class="inp">ท่าตอน · ผลตรวจล่าสุด ▾</div><span class="lbl" style="margin-top:14px">ข้อความ (ภาษาง่าย) พร้อมวันที่และแหล่งผล</span><div class="inp" style="height:150px">[ร่างข้อความ]</div><span class="lbl" style="margin-top:14px">ช่องทาง</span><div class="row" style="flex-wrap:wrap"><span class="chip on">หอกระจายข่าว</span><span class="chip">LINE</span><span class="chip">โทร/SMS</span><span class="chip">ออนไลน์</span></div><div class="row" style="margin-top:18px"><span class="btn pri" style="flex:1">เตรียมข้อความ</span><span class="btn" style="flex:1">บันทึกรับช่วง</span></div><p class="mut" style="margin-top:12px">POC: ไม่ส่งจริง · บันทึกเวลา อนุมัติ / ส่ง / รับทราบ แยกกัน · ไม่นับการอ่านหน้าจอเป็นการรับทราบ</p></div></div></div>`,

  // S11 reports
  reports: () => `<div class="page mk">${head('รายงานและงานรวมผล 7 ทีม', 'สำหรับแอดมินและผู้ประสานโครงการ')}
  <div class="body" style="grid-template-columns:400px 1fr;min-height:0"><div class="card hide-m"><h2>สร้างรายงาน</h2><span class="lbl">พื้นที่</span><div class="inp">ทุกชุมชน ▾</div><span class="lbl" style="margin-top:14px">ช่วงเวลา</span><div class="inp">[เริ่ม] – [สิ้นสุด] ▾</div><span class="lbl" style="margin-top:14px">กลุ่มผล</span><div class="inp">ทั้งหมด ▾</div><div class="row" style="margin-top:22px"><span class="btn pri" style="flex:1">ออกรายงาน PDF</span><span class="btn" style="flex:1">CSV</span></div></div>
  <div class="col" style="min-height:0"><div class="card"><h2>ผลจาก 7 ทีม (SWG)</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px" class="s7">${[1,2,3,4,5,6,7].map(i => `<div style="border:1px solid #E2E8F0;border-radius:12px;padding:12px;background:#F8FAFC"><b style="font-size:13px">ทีม ${i}</b><div style="margin-top:8px"><span class="chip ${i<3?'g':'a'}">${i<3?'ส่งแล้ว':'รอ'}</span></div></div>`).join('')}</div></div>
  <div class="card" style="flex:1"><h2>ทรัพยากร · งบประมาณ · ลำดับเริ่มทำ (R26)</h2><table><tr><th>รายการ</th><th>ผู้รับผิดชอบ</th><th>ลำดับ</th></tr>${[1,2,3,4].map(i => `<tr><td>รายการ ${i}</td><td class="mut">[ผู้รับผิดชอบ]</td><td class="mut">[ลำดับ]</td></tr>`).join('')}</table></div></div></div></div>`,
};

// overlays on the real map / modals
async function overlayStories(p, mobile) {
  await p.evaluate(({ mobile, css }) => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const d = document.createElement('div'); d.className = 'mk';
    const pins = mobile ? [[22, 42], [58, 50], [38, 30]] : [[30, 40], [52, 52], [42, 68]];
    d.innerHTML = pins.map(a => `<div class="fx star" style="left:${a[0]}%;top:${a[1]}%">★</div>`).join('') + `
    <div class="fx sheet" style="${mobile ? 'left:0;right:0;bottom:0;height:48%;border-radius:24px 24px 0 0' : 'right:20px;top:70px;bottom:20px;width:400px;border-radius:20px'};padding:18px;display:flex;flex-direction:column;gap:12px;overflow:hidden">
      <div class="row" style="justify-content:space-between"><b style="font-size:16px">เรื่องเล่าและแผนรับมือภัย</b><span class="new">ข้อเสนอใหม่</span></div>
      <div class="inp" style="border-radius:999px">🔍 ค้นหาแผนรับมือภัยของชุมชน</div>
      <div class="ph" style="height:${mobile ? '90px' : '170px'}">ภาพ / คลิปจากพื้นที่</div>
      <div><b>เรื่องเล่าจากพื้นที่ (ชื่อเรื่อง)</b><div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="chip g">✓ ตรวจสิทธิ์แล้ว</span><span class="chip">เหตุการณ์ [วันที่]</span></div></div>
      ${mobile ? '' : `<div class="col">${['แผนรับมือภัย: น้ำท่วม', 'แผนอพยพกลุ่มเปราะบาง', 'เส้นทางและจุดรวมพล'].map(t => `<div style="border:1px solid #E2E8F0;border-radius:12px;padding:11px 14px;font-size:13px;font-weight:600;display:flex;justify-content:space-between">${t}<span class="mut">›</span></div>`).join('')}</div>`}
      <div class="btn pri" style="margin-top:auto">เปิดแผนรับมือภัย</div></div>`;
    document.body.appendChild(d);
  }, { mobile, css: CSS });
}
async function overlayMapAdds(p, mobile) {
  await p.evaluate(({ mobile, css }) => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const d = document.createElement('div'); d.className = 'mk';
    const W = innerWidth, H = innerHeight;
    d.innerHTML = `<svg class="fx" style="left:0;top:0;pointer-events:none" width="${W}" height="${H}"><polygon points="${W*.2},${H*.25} ${W*.62},${H*.22} ${W*.68},${H*.62} ${W*.3},${H*.7}" fill="#0284C722" stroke="#0284C7" stroke-width="3" stroke-dasharray="10 7"/></svg>
    <div class="fx" style="left:${W*.2+8}px;top:${H*.25+8}px"><span class="new">ข้อเสนอ · ขอบเขตหมู่บ้าน (R27)</span></div>
    <div class="fx" style="${mobile ? 'left:16px;top:170px' : 'left:50%;transform:translateX(-50%);top:14px'}"><span class="seg"><span class="on">ในหมู่บ้าน</span><span>รอบหมู่บ้าน</span></span> <span class="new" style="margin-left:6px">R03</span></div>
    <div class="fx row" style="${mobile ? 'left:16px;top:226px;right:16px;overflow:hidden' : 'left:50%;transform:translateX(-50%);top:68px'}"><span class="pill">พื้นที่ · ท่าตอน ▾</span><span class="pill">ช่วงเวลา · 7 วัน ▾</span><span class="pill">กลุ่มผล · ทั้งหมด ▾</span><span class="new">R08</span></div>`;
    document.body.appendChild(d);
  }, { mobile, css: CSS });
}
async function surveyR11(p) {
  await p.evaluate(({ css }) => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const cb = document.querySelector('section[role="dialog"] input[type=checkbox], [role="dialog"] input[type=checkbox]');
    const anchor = cb ? (cb.closest('label') || cb.parentElement) : null;
    if (!anchor) return;
    const box = document.createElement('div'); box.className = 'mk';
    box.style.cssText = 'border:2px solid #EA7A0B;border-radius:14px;padding:14px;margin:12px 0;background:#FFF7ED';
    box.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><b style="font-size:14px">สภาพแวดล้อมขณะเก็บตัวอย่าง (R11)</b><span class="new">ข้อเสนอใหม่</span></div>
    <span class="lbl">ฝนในรอบ 24 ชม.</span><div class="row" style="flex-wrap:wrap;margin-bottom:10px"><span class="chip on">ไม่มี</span><span class="chip">ตกเล็กน้อย</span><span class="chip">ตกหนัก</span></div>
    <span class="lbl">ใกล้พื้นที่เหมือง</span><div class="row" style="flex-wrap:wrap;margin-bottom:10px"><span class="chip">ใช่</span><span class="chip on">ไม่ใช่</span><span class="chip">ไม่ทราบ</span></div>
    <span class="lbl">การใช้น้ำ</span><div class="row" style="flex-wrap:wrap"><span class="chip on">อุปโภค</span><span class="chip">เกษตร</span><span class="chip">ปศุสัตว์</span></div>`;
    anchor.parentElement.insertBefore(box, anchor); box.scrollIntoView({ block: 'center' });
  }, { css: CSS });
}
async function guideClips(p, mobile) {
  await p.evaluate(({ css, mobile, play }) => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /ขั้นที่ 1/.test(e.textContent));
    const card = h && h.closest('div[class*="rounded"], section, div');
    const list = card && card.parentElement;
    if (!list) return;
    const v = document.createElement('div'); v.className = 'mk';
    v.innerHTML = `<div style="position:relative;border-radius:16px;overflow:hidden;background:#0F172A;height:${mobile ? 120 : 130}px;margin-bottom:12px;display:grid;place-items:center"><div style="width:${mobile ? 44 : 64}px;height:${mobile ? 44 : 64}px;border-radius:50%;background:#fff;color:#0284C7;display:grid;place-items:center">${play}</div><span class="new" style="position:absolute;left:12px;top:12px">ข้อเสนอใหม่ · คลิปสอน ${mobile ? '+ บทเรียนเยาวชน (R13, R14)' : '(R13)'}</span><div style="position:absolute;left:14px;right:14px;bottom:12px"><div style="color:#fff;font-size:12px;margin-bottom:6px">${mobile ? 'คลิปสั้น · 0:00 / [ความยาว]' : 'คลิปสั้น: วิธีใช้ชุดทดสอบภาคสนาม · 0:00 / [ความยาว]'}</div><div style="height:5px;background:#ffffff44;border-radius:3px"><div style="width:30%;height:100%;background:#00E5FF;border-radius:3px"></div></div></div></div>`;
    list.insertBefore(v, list.firstChild);
    const y = document.createElement('div'); y.className = 'mk';
    y.innerHTML = `<div style="border:2px solid #EA7A0B;border-radius:16px;padding:14px;margin-top:12px;background:#FFF7ED"><div class="row" style="justify-content:space-between"><b style="font-size:14px">บทเรียนเยาวชน: ดูฝนและระดับน้ำ (R14)</b><span class="new">ใหม่</span></div><div class="mut" style="margin-top:6px">คลิปสอนเครื่องมือดูฝน/น้ำ · แบบฝึกหัด [จำนวน] ข้อ</div></div>`;
    if (!mobile) list.appendChild(y);
  }, { css: CSS, mobile, play });
}

const b = await chromium.launch({ headless: true });
async function run(tag, vp, dsf) {
  const mobile = tag === 'm';
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  const shot = async n => { await p.waitForTimeout(900); await p.screenshot({ path: `shots/${n}-${tag}.png` }); console.log('ok', n, tag); };
  const go = async q => { await p.goto(U + q, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3500); };
  for (const [name, fn] of Object.entries(PAGES)) {
    await go('?view=dashboard&community=thaton');
    await p.evaluate(({ html, css }) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); document.body.innerHTML = html; }, { html: fn(), css: CSS });
    await shot('mk-' + name);
  }
  await go('?view=dashboard&community=thaton'); await overlayStories(p, mobile); await shot('mk-stories');
  await go('?view=dashboard&community=thaton'); await overlayMapAdds(p, mobile); await shot('mk-mapadds');
  await go('?view=dashboard&community=thaton');
  await p.locator('button:has-text("ทำแบบสำรวจ"):visible').first().click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(800); await surveyR11(p); await shot('mk-survey11');
  await go('?view=dashboard&community=thaton');
  await p.locator('button[aria-label="คู่มือ"]').click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(800); await guideClips(p, mobile); await shot('mk-guide');
  await ctx.close();
}
await run('d', { width: 1440, height: 900 }, 1);
await run('m', { width: 390, height: 844 }, 2);
await b.close();
