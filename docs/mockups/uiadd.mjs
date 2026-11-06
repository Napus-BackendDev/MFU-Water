import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
const CSS = `.pp{font-family:inherit;box-sizing:border-box}.pp *{box-sizing:border-box}
.pp .tag{background:#EA7A0B;color:#fff;border-radius:99px;font-size:11px;font-weight:700;padding:3px 10px;white-space:nowrap}
.pp .note{border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.5}`;
const b = await chromium.launch({ headless: true });
for (const [tag, vp, dsf] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: tag === 'm', hasTouch: tag === 'm' });
  const p = await ctx.newPage();
  const go = async () => { await p.goto('http://127.0.0.1:5173/?view=dashboard&community=thaton', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(3500); };
  // S4+ summary with labels + freshness + icons
  await go();
  await p.locator('button[aria-label="สรุปรายวันและดูกราฟ"]').click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(900);
  await p.evaluate(css => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const pre = { 'ปกติ (< 5 ppb)': '✓ ', 'เฝ้าระวัง (5–10 ppb)': '⚠ ', 'เกินเกณฑ์ คพ. (> 10 ppb)': '✕ ' };
    document.querySelectorAll('div,span,p').forEach(e => { if (e.children.length === 0 && pre[e.textContent.trim()] && !e.dataset.done) { e.textContent = pre[e.textContent.trim()] + e.textContent.trim(); e.dataset.done = 1; } });
    const dlg = document.querySelector('[role="dialog"]') || document.querySelector('section');
    const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /จุดสำรวจที่เผยแพร่/.test(e.textContent));
    const grid = h && h.closest('div').parentElement;
    if (!grid) return;
    const box = document.createElement('div'); box.className = 'pp';
    box.innerHTML = `<div class="note" style="background:#FFF7ED;border:2px solid #EA7A0B;margin:0 0 10px"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px"><b>ผลชุดทดสอบเบื้องต้นจากภาคสนาม ไม่ใช่ผลแล็บ</b><span class="tag">ข้อเสนอใหม่</span></div>50 ppb เป็นเกณฑ์คัดกรองของระบบเพื่อส่งให้แอดมินตรวจ ไม่ใช่เกณฑ์ว่าน้ำปลอดภัย<br><span style="color:#64748B">ข้อมูลล่าสุดเก็บเมื่อ [วันที่ เวลา] · อัปเดตเมื่อ [เวลา]</span></div>`;
    grid.parentElement.insertBefore(box, grid);
  }, CSS);
  await p.waitForTimeout(400); await p.screenshot({ path: `shots/ui-s4plus-${tag}.png` });
  // S3.1 survey send failed + draft saved
  await go();
  await p.locator('button:has-text("ทำแบบสำรวจ"):visible').first().click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(900);
  await p.evaluate(css => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const dlg = document.querySelector('[role="dialog"]') || document.querySelector('section');
    if (!dlg) return;
    const box = document.createElement('div'); box.className = 'pp';
    box.style.cssText = 'position:sticky;top:0;z-index:5;margin:0 0 12px';
    box.innerHTML = `<div class="note" style="background:#FEF2F2;border:2px solid #DC2626"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px"><b style="color:#B91C1C">ส่งไม่สำเร็จ — ข้อมูลยังอยู่ในแบบฟอร์ม</b><span class="tag">ข้อเสนอใหม่</span></div>บันทึกฉบับร่างในเครื่องแล้ว ตรวจอินเทอร์เน็ตแล้วลองส่งอีกครั้ง · รูปถ่ายถูกบีบให้เล็กลงก่อนส่ง<div style="margin-top:8px"><span style="display:inline-block;background:#0284C7;color:#fff;border-radius:10px;padding:7px 14px;font-weight:700">ลองส่งใหม่</span></div></div>`;
    const first = dlg.querySelector('form, div');
    const target = dlg.querySelector('form') || dlg;
    target.insertBefore(box, target.firstChild);
    dlg.scrollTop = 0;
  }, CSS);
  await p.waitForTimeout(400); await p.screenshot({ path: `shots/ui-s31-${tag}.png` });
  await ctx.close();
}
await b.close(); console.log('done');
