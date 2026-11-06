import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
const b = await chromium.launch({ headless: true });
for (const [tag, vp, dsf] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: tag === 'm', hasTouch: tag === 'm' });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:5173/?view=dashboard&community=thaton', { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForTimeout(4000);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `shots/fl-base-${tag}.png` });
  await p.locator('button[aria-label="เลเยอร์น้ำท่วม"]').click({ timeout: 8000 }).catch(e => console.log('layers', e.message.slice(0, 80)));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `shots/fl-panel-${tag}.png` });
  const sels = await p.$$eval('select', ss => ss.map(s => [s.getAttribute('aria-label'), [...s.options].map(o => o.value + ':' + o.text)]));
  console.log(tag, JSON.stringify(sels));
  const stage = p.locator('select').first(); await p.waitForTimeout(500);
  for (const v of ['5', '7.5']) { await stage.selectOption(v).catch(() => {}); await p.waitForTimeout(2500); await p.screenshot({ path: `shots/fl-${v}-${tag}.png` }); }
  await ctx.close();
}
await b.close();
