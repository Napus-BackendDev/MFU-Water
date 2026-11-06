import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
const { svg, POSES } = createRequire(import.meta.url)('./mascot.js');
const cap = { loading: 'กำลังโหลด', waiting: 'รอนานกว่าปกติ', camera: 'กำลังส่งแบบสำรวจ (ถ่ายรูป)', cheer: 'ส่งสำเร็จ', error: 'ส่งไม่สำเร็จ' };
const html = `<body style="margin:0;background:#fff;font-family:'Noto Sans Thai',sans-serif"><div style="display:flex;gap:0;padding:20px 10px">${Object.keys(POSES).map(k => `<div style="width:360px;text-align:center">${svg(k, 330)}<div style="font-size:20px;font-weight:700;margin-top:6px;color:#0F172A">${cap[k]}</div></div>`).join('')}</div>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1820, height: 460 }, deviceScaleFactor: 1.5 });
await p.setContent(html);
await p.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 360; }));
await p.screenshot({ path: 'sheet.png' }); await b.close();
