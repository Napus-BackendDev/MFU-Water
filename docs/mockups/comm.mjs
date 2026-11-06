import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
const b = await chromium.launch({ headless: true });
for (const [tag, vp, dsf] of [['d', { width: 1440, height: 900 }, 1], ['m', { width: 390, height: 844 }, 2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: tag === 'm', hasTouch: tag === 'm' });
  const p = await ctx.newPage();
  for (const c of ['thaton', 'ruammit', 'pongkhong', 'pakingtai']) {
    await p.goto(`http://127.0.0.1:5173/?view=dashboard&community=${c}`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `shots/c-${c}-${tag}.png` });
    console.log(c, tag, (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 90));
  }
  await ctx.close();
}
await b.close();
