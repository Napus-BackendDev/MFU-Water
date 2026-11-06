import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch';
const artifactDir = 'C:/Users/asus/.gemini/antigravity/brain/25b1383f-5761-4768-8e00-4d3fce275274';
const imagesDir = path.join(projectRoot, 'docs/ui-prototypes/images');
const htmlPath = 'file:///' + path.join(projectRoot, 'docs/ui-prototypes/live-app.html').replace(/\\/g, '/');

async function runMobileSimulation() {
  console.log('Launching Playwright for Native Mobile OpenStreetMap (OSM) Simulation (430x932)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }, // iPhone 15/16 Pro Max viewport
    deviceScaleFactor: 2, // Crisp Retina display
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  console.log('Navigating to Live Mobile App:', htmlPath);
  await page.goto(htmlPath);

  // Wait for OpenStreetMap tiles
  console.log('Waiting for OpenStreetMap (OSM) tiles over Thaton...');
  await page.waitForTimeout(4000);

  async function saveShot(name) {
    const localPath = path.join(imagesDir, name);
    const artPath = path.join(artifactDir, name);
    await page.screenshot({ path: localPath });
    fs.copyFileSync(localPath, artPath);
    console.log('Saved Mobile Shot:', name);
  }

  // 1. Mobile Home View on Google Satellite Hybrid (3 Bottom Tabs)
  await saveShot('mobile-01-home-sat.png');

  // 2. Open Community Selector Sheet (4 Communities only, no grid)
  console.log('Opening Community Selector Sheet...');
  await page.click('.area-selector-pill');
  await page.waitForTimeout(600);
  await saveShot('mobile-02-community-sheet.png');

  // Close sheet
  await page.evaluate(() => window.closeSheet('sheetCommunity'));
  await page.waitForTimeout(300);

  // 3. FlyTo Community: บ้านกะเหรี่ยงรวมมิตร (อ.เมือง จ.เชียงราย)
  console.log('Flying to Community: บ้านกะเหรี่ยงรวมมิตร (Ruammit)...');
  await page.evaluate(() => window.selectCommunity('ruammit'));
  await page.waitForTimeout(3000); // wait for flyTo and tile loading
  await saveShot('mobile-03-flyto-ruammit.png');

  // Fly back to Thaton
  console.log('Flying back to Thaton...');
  await page.evaluate(() => window.selectCommunity('thaton'));
  await page.waitForTimeout(2000);

  // 4. Open Farmer Survey Bottom Sheet (FAB)
  console.log('Opening Farmer Survey Bottom Sheet...');
  await page.click('.fab-survey-btn');
  await page.waitForTimeout(600);
  await saveShot('mobile-04-survey-sheet.png');
  await page.evaluate(() => window.closeSheet('sheetSurvey'));
  await page.waitForTimeout(300);

  // 5. Open Point Detail Bottom Sheet ("น้ำนี้เอาไปทำอะไรได้บ้าง")
  console.log('Opening Point Detail Bottom Sheet for Wat Tha Ton...');
  await page.evaluate(() => {
    const wp = window.waypointsData.find(w => w.code === 'W-042') || window.waypointsData[0];
    window.openPointDetail(wp);
  });
  await page.waitForTimeout(600);
  await saveShot('mobile-05-point-detail-sheet.png');
  await page.evaluate(() => window.closeSheet('sheetDetail'));
  await page.waitForTimeout(300);

  // 6. Toggle Flood Simulation Layer
  console.log('Activating Flood Simulation Layer...');
  await page.click('#tab-flood');
  await page.waitForTimeout(1500);
  await saveShot('mobile-06-flood-layer.png');

  // 7. Toggle Evacuation & 67 Vulnerability Points Layer
  console.log('Activating Evacuation & Safe Havens Layer...');
  await page.click('#tab-evac');
  await page.waitForTimeout(2000);
  await saveShot('mobile-07-evac-layer.png');

  await browser.close();
  console.log('All 7 Clean Native Mobile Screenshots captured successfully!');
}

runMobileSimulation().catch(err => {
  console.error('Error during mobile simulation:', err);
  process.exit(1);
});
