const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(4000);
  
  // 1. Click Wat Thaton
  console.log('1. Testing Wat Thaton click...');
  const watMarker = await page.locator('text=วัดท่าตอน (พระเจดีย์แก้ว 9 ชั้น)').first();
  await watMarker.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test_click_wat_thaton.png' });
  console.log('Saved test_click_wat_thaton.png');
  
  // 2. Click Tha Ton Bridge
  console.log('2. Testing Tha Ton Bridge click...');
  const bridgeMarker = await page.locator('text=สะพานท่าตอน (ทล.107)').first();
  await bridgeMarker.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test_click_bridge.png' });
  console.log('Saved test_click_bridge.png');
  
  // 3. Click Ban Tha Doi
  console.log('3. Testing Ban Tha Doi click...');
  const thadoiMarker = await page.locator('text=บ้านท่าดอย').first();
  await thadoiMarker.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test_click_thadoi.png' });
  console.log('Saved test_click_thadoi.png');

  // 4. Click a 3D building directly in canvas
  console.log('4. Testing clicking a 3D building...');
  // Click on a building near the center
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test_click_building.png' });
  console.log('Saved test_click_building.png');

  // 5. Test Flood Slider to 75%
  console.log('5. Testing Flood Slider...');
  const slider = await page.locator('input[type="range"]');
  await slider.fill('75');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test_flood_75.png' });
  console.log('Saved test_flood_75.png');

  // Check stat text
  const statText = await page.locator('.font-mono', { hasText: 'หลัง' }).innerText();
  console.log('Building stat text:', statText);

  console.log('Total console/page errors:', errors);
  await browser.close();
})();
