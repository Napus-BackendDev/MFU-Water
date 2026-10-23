import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/asus/.gemini/antigravity/brain/f386505b-1245-4a67-ae33-cfdd96158916';
const TEST_IMAGE_PATH = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch/test-fixtures/water-sample-test.png';

async function run() {
  console.log('=== Starting Photo Upload UI Test ===');
  
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    throw new Error('Test image not found: ' + TEST_IMAGE_PATH);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  });
  const page = await context.newPage();

  // Listen to network requests & console to track uploads
  page.on('console', msg => console.log('  [Browser]', msg.text()));
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/api/surveys') || url.includes('supabase.co/storage')) {
      console.log(`  [HTTP ${resp.status()}] ${url.slice(0, 100)}`);
    }
  });

  // 1. Open Dashboard
  console.log('1. Navigating to Dashboard...');
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 2. Open Survey Modal
  console.log('2. Opening Survey Form Modal...');
  await page.click('button:has-text("ทำแบบสำรวจ")');
  await page.waitForSelector('h2#survey-title:has-text("ทำแบบสำรวจ")', { timeout: 8000 });
  await page.waitForTimeout(500);

  // 3. Fill Form Fields
  console.log('3. Filling Survey fields...');
  await page.fill('input[placeholder*="ระบุชื่อ-นามสกุล"]', 'นายทดสอบ อัปโหลดภาพ');
  await page.fill('input[placeholder*="08X-XXX-XXXX"]', '081-234-5678');

  // Select 100 ppb
  await page.click('button[aria-label*="100 ppb"]');

  // Fill Coordinates
  await page.fill('input[aria-label="ละติจูด"]', '20.0545');
  await page.fill('input[aria-label="ลองจิจูด"]', '99.3688');

  // 4. Attach Photo 1 via file input
  console.log('4. Uploading Photo 1 via file input...');
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.first().setInputFiles(TEST_IMAGE_PATH);
  await page.waitForTimeout(600);

  // Check consent
  await page.check('input[type="checkbox"]');
  await page.waitForTimeout(400);

  // Capture Image 1: Form with attached photo
  const screenshot1 = path.join(ARTIFACTS_DIR, 'upload_01_form_with_photo.png');
  await page.screenshot({ path: screenshot1 });
  console.log('   Saved screenshot: upload_01_form_with_photo.png');

  // 5. Submit Form
  console.log('5. Submitting Form with photo...');
  await page.click('button[type="submit"]:has-text("ส่งข้อมูลบันทึก")');

  // Wait for submission completion status or error
  console.log('6. Waiting for server response...');
  try {
    const result = await Promise.race([
      page.locator('p[role="status"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'status'),
      page.locator('p[role="alert"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'alert')
    ]);

    if (result === 'alert') {
      const alertText = await page.locator('p[role="alert"]').innerText();
      console.error('   FORM ALERT ERROR:', alertText);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_error.png') });
      throw new Error('Form Alert Error: ' + alertText);
    }
  } catch (err) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_error.png') });
    throw err;
  }

  const statusLocator = page.locator('p[role="status"]');
  const statusText = await statusLocator.innerText();
  console.log('   Submission Status:', statusText);

  // Extract sample code
  const codeMatch = statusText.match(/KOK-\d{8}-\w+/);
  const sampleCode = codeMatch ? codeMatch[0] : null;
  console.log('   Generated Sample Code:', sampleCode);

  // Scroll success box into view so thumbnail is visible
  await statusLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  // Capture Image 2: Success Message with photo thumbnail
  const screenshot2 = path.join(ARTIFACTS_DIR, 'upload_02_submitted_success.png');
  await page.screenshot({ path: screenshot2 });
  console.log('   Saved screenshot: upload_02_submitted_success.png');

  // Close Survey Modal
  await page.click('button[aria-label="ปิดหน้าต่าง"]');
  await page.waitForTimeout(800);

  // 7. Open Admin Data Table to inspect the new record
  console.log('7. Navigating to Admin Data Table (?view=admin)...');
  await page.goto('http://127.0.0.1:5173/?view=admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check if login needed
  const passcodeField = page.locator('input[placeholder*="ระบุรหัสผ่านแอดมิน"]');
  if (await passcodeField.isVisible()) {
    console.log('   Entering admin passcode...');
    await passcodeField.fill('mfu2026admin');
    await page.click('button:has-text("เข้าสู่ระบบ")');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);
  }

  // Find our sample code row in table
  if (sampleCode) {
    console.log(`8. Searching for ${sampleCode} in Data Table...`);
    await page.fill('input[placeholder*="ค้นหารหัสตัวอย่าง"]', sampleCode);
    await page.waitForTimeout(600);

    // Click "ดูรายละเอียด"
    const viewDetailBtn = page.locator('button[aria-label="ดูรายละเอียด"]').first();
    if (await viewDetailBtn.isVisible()) {
      await viewDetailBtn.click();
      await page.waitForSelector('text=รายละเอียดตัวอย่างน้ำ', { timeout: 5000 });
      await page.waitForTimeout(600);

      const screenshot3 = path.join(ARTIFACTS_DIR, 'upload_03_admin_detail_with_photo.png');
      await page.screenshot({ path: screenshot3 });
      console.log('   Saved screenshot: upload_03_admin_detail_with_photo.png');
    }
  }

  await browser.close();
  console.log('=== Browser Test Finished Successfully ===');
  return sampleCode;
}

run().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
