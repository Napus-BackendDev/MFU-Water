import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { svg, POSES } = require('./mascot.js');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 440 }, deviceScaleFactor: 1 });
for (const k of Object.keys(POSES)) {
  await p.setContent(`<body style="margin:0;background:#fff;display:grid;place-items:center;height:440px">${svg(k, 360)}</body>`);
  fs.mkdirSync(`gif/${k}`, { recursive: true });
  for (let i = 0; i < 40; i++) {
    await p.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }), i * 60);
    await p.screenshot({ path: `gif/${k}/f${String(i).padStart(2, '0')}.png` });
  }
  console.log('frames', k);
}
await b.close();
