import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const IMG_DIR = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch/docs/ui-prototypes/images';
const ARTIFACT_DIR = 'C:/Users/asus/.gemini/antigravity/brain/25b1383f-5761-4768-8e00-4d3fce275274';

const screens = [
  { svg: 'screen-01-map.svg', png: 'screen-01-map.png', w: 1440, h: 960 },
  { svg: 'screen-02-survey.svg', png: 'screen-02-survey.png', w: 1440, h: 1180 },
  { svg: 'screen-03-detail.svg', png: 'screen-03-detail.png', w: 1440, h: 960 },
  { svg: 'screen-04-flood.svg', png: 'screen-04-flood.png', w: 1440, h: 960 },
  { svg: 'screen-05-evac.svg', png: 'screen-05-evac.png', w: 1440, h: 960 },
  { svg: 'screen-06-admin-review.svg', png: 'screen-06-admin-review.png', w: 1440, h: 960 },
  { svg: 'screen-07-admin-table.svg', png: 'screen-07-admin-table.png', w: 1440, h: 960 },
  { svg: 'screen-08-notice.svg', png: 'screen-08-notice.png', w: 1440, h: 960 },
  { svg: 'screen-09-guide-a0.svg', png: 'screen-09-guide-a0.png', w: 1440, h: 960 },
];

async function run() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const s of screens) {
    const svgPath = path.join(IMG_DIR, s.svg);
    const pngPath = path.join(IMG_DIR, s.png);
    const artifactPath = path.join(ARTIFACT_DIR, s.png);

    if (!fs.existsSync(svgPath)) {
      console.error(`Missing SVG: ${svgPath}`);
      continue;
    }

    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #F5F4ED; overflow: hidden; font-family: 'Noto Sans Thai', 'Segoe UI', Tahoma, sans-serif; }
    svg { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

    await page.setViewportSize({ width: s.w, height: s.h });
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    // Screenshot
    await page.screenshot({ path: pngPath, fullPage: true });
    console.log(`Saved PNG: ${pngPath}`);

    // Copy to artifact directory for markdown embedding
    fs.copyFileSync(pngPath, artifactPath);
    console.log(`Copied to Artifact Dir: ${artifactPath}`);
  }

  await browser.close();
  console.log('All 9 screens successfully rendered to PNG!');
}

run().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
