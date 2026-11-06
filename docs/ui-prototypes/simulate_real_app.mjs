import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch';
const artifactDir = 'C:/Users/asus/.gemini/antigravity/brain/25b1383f-5761-4768-8e00-4d3fce275274';
const imagesDir = path.join(projectRoot, 'docs/ui-prototypes/images');
const htmlPath = 'file:///' + path.join(projectRoot, 'docs/ui-prototypes/live-app.html').replace(/\\/g, '/');

async function runSimulation() {
  console.log('Launching Playwright for Real Google Maps UI Simulation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // High-res retina
  });
  const page = await context.newPage();

  console.log('Navigating to Live App on Google Maps:', htmlPath);
  await page.goto(htmlPath);
  
  // Wait for Google Maps satellite tiles to render
  console.log('Waiting for Google Maps satellite tiles over Thaton...');
  await page.waitForTimeout(4500);

  async function saveShot(name) {
    const localPath = path.join(imagesDir, name);
    const artPath = path.join(artifactDir, name);
    await page.screenshot({ path: localPath });
    fs.copyFileSync(localPath, artPath);
    console.log('Captured & Saved:', name);
  }

  // 1. Main Water Quality Map with Google Satellite
  await saveShot('real-01-google-sat-map.png');

  // 2. Open 3-Step Farmer Survey Modal
  console.log('Opening Citizen Survey Modal...');
  await page.click('.btn-giant-survey');
  await page.waitForTimeout(600);
  await saveShot('real-02-survey-modal.png');
  await page.evaluate(() => window.closeModal('surveyModal'));
  await page.waitForTimeout(400);

  // 3. Open Wat Tha Ton Point Detail Modal
  console.log('Opening Wat Tha Ton Detail Modal...');
  await page.evaluate(() => {
    const wp = window.waypoints.find(w => w.code === 'W-042') || window.waypoints[0];
    window.openDetailModal(wp);
  });
  await page.waitForTimeout(600);
  await saveShot('real-03-point-detail.png');
  await page.evaluate(() => window.closeModal('detailModal'));
  await page.waitForTimeout(400);

  // 4. Toggle Flood Simulation Layer (+2m on Google Satellite)
  console.log('Activating Flood Simulation Layer...');
  await page.click('#pill-flood');
  await page.waitForTimeout(1500);
  await saveShot('real-04-flood-simulation.png');
  await page.click('#pill-flood'); // close flood
  await page.waitForTimeout(400);

  // 5. Toggle Evacuation & 67 Vulnerability Points Layer
  console.log('Activating Evacuation & Safe Havens Layer...');
  await page.click('#pill-evac');
  await page.waitForTimeout(2000); // wait for tiles and lines
  await saveShot('real-05-evacuation-route.png');
  await page.click('#pill-evac'); // close evac
  await page.waitForTimeout(400);

  // 6. Switch to Google Roadmap View
  console.log('Switching to Google Roadmap...');
  await page.click('#btn-road');
  await page.waitForTimeout(2500);
  await saveShot('real-06-google-roadmap.png');
  await page.click('#btn-sat'); // switch back
  await page.waitForTimeout(1000);

  // 7. Village Headman Sound Notice
  console.log('Opening Sound Notice Modal...');
  await page.click('#btn-sound');
  await page.waitForTimeout(600);
  await saveShot('real-07-sound-notice.png');
  await page.evaluate(() => window.closeModal('soundModal'));
  await page.waitForTimeout(400);

  // 8. Mobile Viewport (430x932 - iPhone 15 Pro Max)
  console.log('Switching to Mobile Viewport for rural farmers...');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(2000);
  await saveShot('real-08-mobile-view.png');

  await browser.close();
  console.log('All 8 Real Google Maps Production Screenshots captured successfully!');
}

runSimulation().catch(err => {
  console.error('Error during simulation:', err);
  process.exit(1);
});
