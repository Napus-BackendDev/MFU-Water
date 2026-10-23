import { chromium } from 'playwright';

async function testSubmit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

  console.log('Navigating...');
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle' });
  await page.click('button:has-text("ทำแบบสำรวจ")');
  await page.waitForTimeout(500);

  await page.fill('input[placeholder*="ระบุชื่อ-นามสกุล"]', 'นายสมเกียรติ รักแม่น้ำกก');
  await page.fill('input[placeholder*="08X-XXX-XXXX"]', '089-987-6543');
  await page.click('button[aria-label*="100 ppb"]');
  await page.fill('input[aria-label="ละติจูด"]', '20.0545');
  await page.fill('input[aria-label="ลองจิจูด"]', '99.3688');
  await page.check('input[type="checkbox"]');

  console.log('Clicking submit...');
  await page.click('button[type="submit"]:has-text("ส่งข้อมูลบันทึก")');

  await page.waitForTimeout(4000);
  const alertEl = await page.$('p[role="alert"]');
  if (alertEl) console.log('ALERT TEXT:', await alertEl.textContent());
  const statusEl = await page.$('p[role="status"]');
  if (statusEl) console.log('STATUS TEXT:', await statusEl.textContent());

  await browser.close();
}

testSubmit().catch(console.error);
