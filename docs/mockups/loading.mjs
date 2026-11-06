import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { svg } = createRequire(import.meta.url)('./mascot.js');
const b64 = n => 'data:image/png;base64,' + fs.readFileSync(n).toString('base64');
const BALL = b64('mascot-ball.png'), CAM = b64('mascot-cam.png');
const CSS = `
.ld{position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:radial-gradient(circle at 50% 38%,#FFFFFF 0%,#EAF6FD 55%,#D7ECF8 100%);color:#0F172A;text-align:center;padding:24px}
.ld img{display:block}
.ld .shadow{width:120px;height:14px;border-radius:50%;background:#0F172A22;margin-top:-6px;filter:blur(3px)}
.ld h1{font-size:26px;font-weight:800;margin:18px 0 6px}.ld p{margin:0;color:#64748B;font-size:15px}
.bar{width:280px;height:8px;border-radius:99px;background:#CBD5E1;margin-top:22px;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px;background:#0284C7}
.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:12px 22px;font-weight:700;font-size:14px;background:#0284C7;color:#fff;border:0;margin-top:22px}
.btn.o{background:#fff;color:#0F172A;border:1px solid #E2E8F0}
.new{position:absolute;top:18px;right:18px;background:#EA7A0B;color:#fff;border-radius:99px;font-size:12px;font-weight:700;padding:5px 12px}
.sp{position:absolute;left:0;right:0;bottom:22px;display:flex;flex-direction:column;align-items:center;gap:10px}
.sp small{color:#64748B;font-size:12px}.sp div{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:0 14px}
.sp span{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:8px 14px;font-weight:700;font-size:12px;color:#64748B}
.card{background:#fff;border-radius:24px;padding:26px 34px;box-shadow:0 20px 60px #0f172a44;display:flex;flex-direction:column;align-items:center;max-width:92vw}
.ov{position:fixed;inset:0;z-index:99;background:#0F172AA6;display:grid;place-items:center}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@media (max-width:700px){.ld h1{font-size:21px}.bar{width:220px}}
`;
const sponsors = `<div class="sp"><small>ได้รับการสนับสนุนโดย <b style="color:#EA7A0B">(รอไฟล์โลโก้จริง)</b></small><div><span>Oxfam</span><span>ADPC</span><span>DFAT</span><span>SDC</span><span>มหาวิทยาลัยแม่ฟ้าหลวง</span></div></div>`;
const img = (src, w, extra = '') => `<img src="${src}" width="${w}" style="mix-blend-mode:multiply;display:block;${extra}">`;
const S = {
  load: m => `<div class="ld"><span class="new">ข้อเสนอใหม่</span>${img(BALL, m ? 230 : 290, 'transform:translateY(-8px)')}<div class="shadow"></div><h1>MFU Kok Water Watch</h1><p>กำลังโหลดแผนที่และข้อมูลคุณภาพน้ำ…</p><div class="bar"><i style="width:55%"></i></div>${sponsors}</div>`,
  slow: m => `<div class="ld"><span class="new">ข้อเสนอใหม่</span>${img(BALL, m ? 200 : 250, 'transform:rotate(-6deg)')}<div class="shadow"></div><h1>ใช้เวลานานกว่าปกติ</h1><p>อินเทอร์เน็ตอาจช้า หรือเซิร์ฟเวอร์ตอบสนองช้า</p><button class="btn">ลองใหม่</button><button class="btn o" style="margin-top:10px">ดูหน้าเลือกพื้นที่ก่อน</button>${sponsors}</div>`,
  send: m => `<div class="ov"><span class="new">ข้อเสนอใหม่</span><div class="card">${img(CAM, m ? 150 : 200)}<h1 style="font-size:21px;font-weight:800;margin:10px 0 4px">กำลังส่งผลตรวจ…</h1><p style="margin:0;color:#64748B;font-size:14px;text-align:center">กำลังอัปโหลดรูปและบันทึกข้อมูล<br>กรุณาอย่าปิดหน้านี้</p><div class="bar" style="margin-top:16px"><i style="width:70%"></i></div></div></div>`,
};
const b = await chromium.launch({ headless: true });
for (const [tag, vp, dsf] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: tag === 'm', hasTouch: tag === 'm' });
  const p = await ctx.newPage();
  for (const [name, fn] of Object.entries(S)) {
    await p.goto('http://127.0.0.1:5173/?view=dashboard&community=thaton', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3500);
    await p.evaluate(({ html, css }) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); }, { html: fn(tag === 'm'), css: CSS });
    await p.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 360; }));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `shots/ld-${name}-${tag}.png` }); console.log('ok', name, tag);
  }
  await ctx.close();
}
await b.close();
