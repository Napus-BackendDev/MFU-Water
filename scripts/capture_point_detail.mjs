import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/asus/.gemini/antigravity/brain/f386505b-1245-4a67-ae33-cfdd96158916';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const dbBtn = page.locator('button[aria-label="ประวัติผลตรวจที่บันทึกไว้"]');
  await dbBtn.click();
  await page.waitForTimeout(1000);
  const inspectBtn = page.locator('button:has-text("รายละเอียด")').first();
  await inspectBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_04_point_detail_modal.png') });
  console.log('Successfully captured updated e2e_04_point_detail_modal.png');
  await browser.close();
}

run().catch(console.error);
