const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(4000);
  
  const slider = await page.locator('input[type="range"]');
  await slider.fill('50');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test_flood_50.png' });
  console.log('Saved test_flood_50.png');
  
  await slider.fill('100');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test_flood_100.png' });
  console.log('Saved test_flood_100.png');
  
  await browser.close();
})();
