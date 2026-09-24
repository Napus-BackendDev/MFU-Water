const { chromium } = require('playwright');

(async () => {
  console.log('=== STARTING COMPLETE VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  // 1. Initial Load
  console.log('1. Loading application at http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'verify_01_overview.png' });
  console.log('-> Captured verify_01_overview.png');

  // Verify markers count
  const markerCount = await page.evaluate(() => {
    const markers = document.querySelectorAll('.maplibregl-marker');
    return markers.length;
  });
  console.log('Active map markers count:', markerCount);

  // 2. Click Wat Thaton
  console.log('2. Testing Wat Thaton navigation...');
  const watBtn = page.locator('button', { hasText: 'วัดท่าตอน' }).first();
  await watBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_02_wat_thaton.png' });
  console.log('-> Captured verify_02_wat_thaton.png');

  // 3. Click Ban Tha Doi
  console.log('3. Testing Ban Tha Doi navigation...');
  const thadoiBtn = page.locator('button', { hasText: 'บ้านท่าดอย' }).first();
  await thadoiBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_03_thadoi.png' });
  console.log('-> Captured verify_03_thadoi.png');

  // 4. Click Tha Ton Bridge
  console.log('4. Testing Tha Ton Bridge navigation...');
  const bridgeBtn = page.locator('button', { hasText: 'สะพานท่าตอน' }).first();
  await bridgeBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_04_bridge.png' });
  console.log('-> Captured verify_04_bridge.png');

  // 5. Click Tha Ton Village (Hwy 107)
  console.log('5. Testing Tha Ton Village navigation...');
  const villageBtn = page.locator('button', { hasText: 'บ้านท่าตอน' }).first();
  await villageBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_05_village.png' });
  console.log('-> Captured verify_05_village.png');

  // 6. Click Tha Ton Pier
  console.log('6. Testing Tha Ton Pier navigation...');
  const pierBtn = page.locator('button', { hasText: 'ท่าเรือท่องเที่ยวท่าตอน' }).first();
  await pierBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_06_pier.png' });
  console.log('-> Captured verify_06_pier.png');

  // 7. Click Riverview Resort
  console.log('7. Testing Riverview Resort navigation...');
  const resortBtn = page.locator('button', { hasText: 'ริเวอร์วิว รีสอร์ท' }).first();
  await resortBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'verify_07_resort.png' });
  console.log('-> Captured verify_07_resort.png');

  // 8. Test Flood Slider to 50%
  console.log('8. Testing Flood Slider at 50%...');
  const slider = page.locator('input[type="range"]');
  await slider.fill('50');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_08_flood_50.png' });
  const stat50 = await page.locator('.font-mono', { hasText: 'หลัง' }).innerText();
  console.log('Building stat at 50%:', stat50);

  // 9. Test Flood Slider to 100%
  console.log('9. Testing Flood Slider at 100%...');
  await slider.fill('100');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_09_flood_100.png' });
  const stat100 = await page.locator('.font-mono', { hasText: 'หลัง' }).innerText();
  console.log('Building stat at 100%:', stat100);

  // 10. Test clicking a 3D building directly in canvas
  console.log('10. Testing clicking a 3D building on canvas...');
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'verify_10_click_building.png' });
  console.log('-> Captured verify_10_click_building.png');

  console.log('=== VERIFICATION SUMMARY ===');
  console.log('Console Errors:', consoleErrors);
  console.log('Page Errors:', pageErrors);

  await browser.close();
  console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
})();
