import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/asus/.gemini/antigravity/brain/f386505b-1245-4a67-ae33-cfdd96158916';

async function run() {
  console.log('--- Starting Admin Data Table Flow Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  });
  const page = await context.newPage();

  // 1. Open Admin Login Page directly via ?view=admin
  console.log('1. Navigating to Admin Page (?view=admin)...');
  await page.goto('http://127.0.0.1:5173/?view=admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Clear any existing session token to guarantee login card is shown
  await page.evaluate(() => sessionStorage.removeItem('kok_admin_token'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot: Dedicated Admin Login Page
  const loginScreenshot = path.join(ARTIFACTS_DIR, 'admin_01_login_page.png');
  await page.screenshot({ path: loginScreenshot });
  console.log('   Saved: admin_01_login_page.png');

  // 2. Perform Passcode Login
  console.log('2. Entering Passcode mfu2026admin...');
  await page.fill('input[placeholder*="ระบุรหัสผ่านแอดมิน"]', 'mfu2026admin');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');

  // Wait for Data Table to render
  console.log('3. Waiting for Data Table to load...');
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Take screenshot: Full Admin Data Table Dashboard
  const tableScreenshot = path.join(ARTIFACTS_DIR, 'admin_02_datatable_page.png');
  await page.screenshot({ path: tableScreenshot });
  console.log('   Saved: admin_02_datatable_page.png');

  // 3. Test Filter: Click "⏳ รอตรวจสอบ" tab
  console.log('4. Testing Tab Filter: รอตรวจสอบ...');
  await page.click('button:has-text("รอตรวจสอบ")');
  await page.waitForTimeout(600);
  const pendingScreenshot = path.join(ARTIFACTS_DIR, 'admin_03_pending_filter.png');
  await page.screenshot({ path: pendingScreenshot });
  console.log('   Saved: admin_03_pending_filter.png');

  // 4. Click "ดูรายละเอียด" on first row
  console.log('5. Testing Detail Modal...');
  const detailButtons = page.locator('button[aria-label="ดูรายละเอียด"]');
  if (await detailButtons.count() > 0) {
    await detailButtons.first().click();
    await page.waitForSelector('text=รายละเอียดตัวอย่างน้ำ', { timeout: 8000 });
    await page.waitForTimeout(600);
    const detailScreenshot = path.join(ARTIFACTS_DIR, 'admin_04_detail_modal.png');
    await page.screenshot({ path: detailScreenshot });
    console.log('   Saved: admin_04_detail_modal.png');
    await page.click('button:has-text("ปิด")');
    await page.waitForTimeout(500);
  }

  // 5. Test Back to Map
  console.log('6. Testing Back to Map navigation...');
  await page.click('button:has-text("กลับสู่แผนที่สาธารณะ")');
  await page.waitForTimeout(1500);
  console.log('   Current URL:', page.url());

  await browser.close();
  console.log('--- Verification Complete ---');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
