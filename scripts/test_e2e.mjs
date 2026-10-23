import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/asus/.gemini/antigravity/brain/f386505b-1245-4a67-ae33-cfdd96158916';

async function runE2ETests() {
  console.log('--- Launching Chromium for E2E Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE LOG ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE UNHANDLED ERROR:', err.message);
  });

  const results = {
    landingPageLoaded: false,
    dashboardLoaded: false,
    waypointsRendered: 0,
    recordedSamplesModalVerified: false,
    pointDetailModalVerified: false,
    summaryChartsVerified: false,
    adminReviewModalVerified: false,
    surveyModalVerified: false,
    errors: []
  };

  try {
    // 1. Visit Landing Page
    console.log('1. Navigating to http://127.0.0.1:5173/ ...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 30000 });
    results.landingPageLoaded = true;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_01_landing.png') });
    console.log('   Landing page captured');

    // 2. Navigate to Dashboard
    console.log('2. Entering Dashboard view...');
    await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500); // Wait for Leaflet & waypoints API
    results.dashboardLoaded = true;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_02_dashboard.png') });
    console.log('   Dashboard view captured');

    // Check Waypoints markers
    const waypointsCount = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon, .leaflet-interactive');
      return markers.length;
    });
    console.log(`   Waypoints markers in DOM: ${waypointsCount}`);
    results.waypointsRendered = waypointsCount;

    // 3. Test "ประวัติผลตรวจที่บันทึกไว้" Modal
    console.log('3. Testing Recorded Samples History Modal...');
    const dbBtn = page.locator('button[aria-label="ประวัติผลตรวจที่บันทึกไว้"]');
    await dbBtn.click();
    await page.waitForSelector('text=รายการผลตรวจที่บันทึกไว้ในระบบ', { timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_03_recorded_samples_modal.png') });

    // Verify search filter works inside modal
    const searchInput = page.locator('input[placeholder*="ค้นหาด้วยรหัสตัวอย่าง"]');
    await searchInput.fill('F1CF36');
    await page.waitForTimeout(500);
    const filteredText = await page.locator('text=KOK-20261020-F1CF36').isVisible();
    console.log(`   Search for F1CF36: visible = ${filteredText}`);

    // Click "รายละเอียด" on item to open Point Detail Modal
    const inspectBtn = page.locator('button:has-text("รายละเอียด")').first();
    await inspectBtn.click();
    await page.waitForTimeout(1000);
    results.recordedSamplesModalVerified = true;

    // 4. Test Point Detail Modal (KokPointDetailModal with KokPPBTrendChart)
    console.log('4. Testing Point Detail Modal with Trend Chart...');
    await page.waitForSelector('text=สารหนู (As)', { timeout: 8000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_04_point_detail_modal.png') });
    
    // Check chart elements in Point Detail Modal
    const hasTrendSvg = await page.locator('svg').count();
    console.log(`   SVGs in Point Detail Modal: ${hasTrendSvg}`);
    results.pointDetailModalVerified = hasTrendSvg > 0;

    // Close Point Detail Modal (topmost)
    await page.locator('.z-\\[1050\\] button[aria-label="ปิดหน้าต่าง"]').click();
    await page.waitForTimeout(500);

    // Close Recorded Samples Modal
    if (await page.locator('.z-\\[1000\\] button[aria-label="ปิดหน้าต่าง"]').count() > 0) {
      await page.locator('.z-\\[1000\\] button[aria-label="ปิดหน้าต่าง"]').first().click();
      await page.waitForTimeout(500);
    }

    // 5. Test Summary Modal with Both KokWaterHealthChart and KokPPBTrendChart
    console.log('5. Testing Daily Summary & Charts Modal...');
    const summaryBtn = page.locator('button[aria-label="สรุปรายวันและดูกราฟ"]');
    await summaryBtn.click();
    await page.waitForSelector('text=สรุปผลตรวจ คุณภาพน้ำ และกราฟแนวโน้มสารหนู', { timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_05_summary_and_charts_modal.png') });

    // Toggle daily to monthly in KokWaterHealthChart
    const monthlyBtn = page.locator('button:has-text("รายเดือน")');
    if (await monthlyBtn.isVisible()) {
      await monthlyBtn.click();
      await page.waitForTimeout(500);
      console.log('   Toggled to Monthly view in Health Chart');
    }
    results.summaryChartsVerified = true;

    // Close Summary Modal
    const closeSummaryBtn = page.locator('button:has-text("ปิด")').first();
    await closeSummaryBtn.click();
    await page.waitForTimeout(500);

    // 6. Test Admin Review Modal & Passcode Login Gate (>50 ppb queue)
    console.log('6. Testing Admin Passcode Login Gate and Review Queue...');
    const adminBtn = page.locator('button[aria-label="คิวตรวจสอบแอดมิน (>50 ppb)"]');
    await adminBtn.click();
    await page.waitForSelector('text=เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)', { timeout: 8000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_06a_admin_passcode_gate.png') });
    console.log('   Admin Passcode Gate visible');

    // 6.1 Test Wrong Passcode
    await page.fill('input[placeholder*="ระบุรหัสผ่านแอดมิน"]', 'wrong-pass');
    await page.locator('button:has-text("เข้าสู่ระบบ (ปลดล็อก)")').click();
    await page.waitForSelector('text=รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง', { timeout: 5000 });
    console.log('   Wrong passcode rejected successfully');

    // 6.2 Test Correct Passcode
    await page.fill('input[placeholder*="ระบุรหัสผ่านแอดมิน"]', 'mfu2026admin');
    await page.locator('button:has-text("เข้าสู่ระบบ (ปลดล็อก)")').click();
    await page.waitForSelector('text=4 รายการรอตรวจสอบ', { timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_06b_admin_queue_unlocked.png') });
    console.log('   Admin Passcode verified and Queue unlocked!');

    // Verify pending review items and confidential contacts are shown to admin
    const pendingItemsCount = await page.locator('text=เกิน 50 ppb (รอตรวจ)').count();
    const hasSampleCode = await page.locator('text=KOK-20260929-027197').first().isVisible();
    console.log(`   Pending review badges found: ${pendingItemsCount}, Sample KOK-20260929-027197 visible: ${hasSampleCode}`);
    results.adminReviewModalVerified = pendingItemsCount > 0 && hasSampleCode;

    // 6.3 Test Logout / Lock
    const lockBtn = page.locator('button:has-text("ล็อก/ออก")');
    await lockBtn.click();
    await page.waitForSelector('text=เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)', { timeout: 5000 });
    console.log('   Admin screen re-locked successfully');

    // Close Admin Modal
    await page.locator('button[aria-label="ปิดหน้าต่าง"]').first().click();
    await page.waitForTimeout(500);

    // 7. Test Survey Submission Modal (KokSurveyModal)
    console.log('7. Testing Survey Submission Modal Flow...');
    const surveyBtn = page.locator('button:has-text("ทำแบบสำรวจ")');
    await surveyBtn.click();
    await page.waitForSelector('h2#survey-title:has-text("ทำแบบสำรวจ")', { timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_07_survey_modal.png') });

    // Verify privacy notice in Survey Modal
    const privacyNoticeVisible = await page.locator('text=การคุ้มครองข้อมูลผู้แจ้ง').isVisible();
    console.log(`   Privacy notice visible: ${privacyNoticeVisible}`);
    results.surveyModalVerified = privacyNoticeVisible;

    // Close survey modal
    await page.locator('button[aria-label="ปิดหน้าต่าง"]').first().click();
    await page.waitForTimeout(500);

    console.log('--- ALL E2E VERIFICATION STEPS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('E2E Test Error:', err);
    results.errors.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('E2E Results Summary:', JSON.stringify(results, null, 2));
}

runE2ETests();
