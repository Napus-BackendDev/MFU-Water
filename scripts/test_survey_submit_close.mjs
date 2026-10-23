import { chromium } from 'playwright';

async function testSubmit() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle' });
  await page.click('button:has-text("ทำแบบสำรวจ")');
  await page.waitForSelector('#survey-title');

  await page.fill('input[placeholder*="ระบุชื่อ-นามสกุล"]', 'ทดสอบ ปิดโมดอล');
  await page.fill('input[placeholder*="08X-XXX-XXXX"]', '089-999-9999');
  await page.click('button:has-text("5 ppb")');
  await page.fill('input[aria-label="ละติจูด"]', '20.05');
  await page.fill('input[aria-label="ลองจิจูด"]', '99.36');
  await page.check('input[type="checkbox"]');
  await page.click('button[type="submit"]:has-text("ส่งข้อมูลบันทึก")');

  await page.waitForTimeout(2500);
  const modalCount = await page.locator('#survey-title').count();
  const toasts = await page.locator('.wv-info-box').allInnerTexts();
  console.log(`MODAL_COUNT=${modalCount}`);
  console.log(`TOASTS=${JSON.stringify(toasts)}`);

  await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/167a548e-f031-4202-b894-c6a1adcd750e/after_submit_closed.png' });
  await browser.close();
}

testSubmit().catch(console.error);
