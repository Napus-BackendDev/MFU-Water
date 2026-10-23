import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/asus/.gemini/antigravity/brain/f386505b-1245-4a67-ae33-cfdd96158916';

async function captureMockupFlow() {
  console.log('--- Starting Mockup Capture ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  });
  const page = await context.newPage();

  // 1. Open Dashboard
  console.log('1. Navigating to Dashboard...');
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // 2. Open Survey Modal and fill mockup data
  console.log('2. Opening Survey Modal and filling mockup data...');
  const surveyBtn = page.locator('button:has-text("ทำแบบสำรวจ")');
  await surveyBtn.click();
  await page.waitForSelector('h2#survey-title:has-text("ทำแบบสำรวจ")', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Fill Name & Phone
  await page.fill('input[placeholder*="ระบุชื่อ-นามสกุล"]', 'นายสมเกียรติ รักแม่น้ำกก');
  await page.fill('input[placeholder*="08X-XXX-XXXX"]', '089-987-6543');

  // Select 100 ppb (Level 6: > 50 ppb for admin verification trigger!)
  const level100Btn = page.locator('button[aria-label*="100 ppb"]');
  await level100Btn.click();
  await page.waitForTimeout(300);

  // Set Coordinates (near Kok River Thaton area)
  await page.fill('input[aria-label="ละติจูด"]', '20.0545');
  await page.fill('input[aria-label="ลองจิจูด"]', '99.3688');

  // Check Public Consent
  await page.check('input[type="checkbox"]');
  await page.waitForTimeout(500);

  // Capture Image 1: ภาพแบบฟอร์ม
  await page.locator('section[role="dialog"]').evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(300);
  const img1Path = path.join(ARTIFACTS_DIR, 'mockup_01_form.png');
  await page.screenshot({ path: img1Path });
  console.log('   Saved: mockup_01_form.png');

  // 3. Submit Form
  console.log('3. Submitting Form...');
  const submitBtn = page.locator('button[type="submit"]:has-text("ส่งข้อมูลบันทึก")');
  await submitBtn.click();
  await page.waitForSelector('p[role="status"]', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Capture Image 2: ภาพแสดงผลตอนใส่ข้อมูลไปแล้ว
  const img2Path = path.join(ARTIFACTS_DIR, 'mockup_02_submitted_result.png');
  await page.screenshot({ path: img2Path });
  console.log('   Saved: mockup_02_submitted_result.png');

  // Close Survey Modal
  await page.locator('button[aria-label="ปิดหน้าต่าง"]').click();
  await page.waitForTimeout(1000);

  // 4. Capture Image 3: แสดงผลในแมป (Click marker to open Leaflet Popup)
  console.log('4. Showing Map View and Marker Details...');
  // Find a marker on the map and click it to open rich popup
  const markers = page.locator('.leaflet-marker-icon');
  const markerCount = await markers.count();
  console.log(`   Found ${markerCount} markers on map`);
  if (markerCount > 0) {
    // Click the middle marker
    await markers.nth(Math.min(2, markerCount - 1)).click({ force: true });
    await page.waitForTimeout(1200);
  }

  const img3Path = path.join(ARTIFACTS_DIR, 'mockup_03_map_view.png');
  await page.screenshot({ path: img3Path });
  console.log('   Saved: mockup_03_map_view.png');

  // 5. Capture Image 4: ตัวของหลังบ้าน (Admin Passcode Login Gate)
  console.log('5. Opening Admin Passcode Gate...');
  const adminBtn = page.locator('button[aria-label="คิวตรวจสอบแอดมิน (>50 ppb)"]');
  await adminBtn.click();
  await page.waitForSelector('text=เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)', { timeout: 8000 });
  await page.waitForTimeout(600);

  const img4Path = path.join(ARTIFACTS_DIR, 'mockup_04_admin_login.png');
  await page.screenshot({ path: img4Path });
  console.log('   Saved: mockup_04_admin_login.png');

  // 6. Unlock Admin with Passcode
  console.log('6. Unlocking Admin Queue with Passcode...');
  await page.fill('input[placeholder*="ระบุรหัสผ่านแอดมิน"]', 'mfu2026admin');
  await page.locator('button:has-text("เข้าสู่ระบบ (ปลดล็อก)")').click();
  await page.waitForSelector('text=รายการรอตรวจสอบ', { timeout: 8000 });
  await page.waitForTimeout(1500);

  // Capture Image 5: ตัวของหน้า table หลังบ้านที่กดยืนยันแสดงผลเมื่อเกิน 50
  const img5Path = path.join(ARTIFACTS_DIR, 'mockup_05_admin_review_table.png');
  await page.screenshot({ path: img5Path });
  console.log('   Saved: mockup_05_admin_review_table.png');

  await browser.close();
  console.log('--- ALL 5 MOCKUP SCREENSHOTS CAPTURED SUCCESSFULLY ---');
}

captureMockupFlow().catch(console.error);
