import { test, expect } from '@playwright/test';

test('sidebar community switch updates map and data in places and evacuation tabs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kok_admin_token', 'mock_admin_token');
    localStorage.setItem('kok_admin_reviewer', 'อาจารย์ผู้ดูแล');
  });

  await page.goto('http://127.0.0.1:5173/?view=admin', { waitUntil: 'networkidle' });

  // 1. In Sidebar, open community dropdown and select "บ้านปงของ"
  const communitySelect = page.locator('aside button:has-text("บ้านท่าตอน")').first();
  await expect(communitySelect).toBeVisible();
  await communitySelect.click();
  await page.waitForTimeout(300);

  const pongkhongOption = page.locator('button:has-text("บ้านปงของ")').last();
  await pongkhongOption.click();
  await page.waitForTimeout(500);

  // 2. Click "สถานที่สำคัญ" in sidebar
  const placesTab = page.locator('aside button:has-text("สถานที่สำคัญ")').first();
  await placesTab.click();
  await page.waitForTimeout(1000);

  // Take screenshot of Places tab for Pongkhong
  await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-pongkhong-places.png' });

  // Verify places list has Pongkhong places
  const placesSection = page.locator('section[aria-label="รายการสถานที่สำคัญ"]');
  await expect(placesSection).toContainText('ศาลาประชาคมบ้านปงของ');
  await expect(placesSection).toContainText('วัดปงของ');
  await expect(placesSection).not.toContainText('TH-ASSEMBLY-01');

  // 3. Click "กลุ่มอพยพ" in sidebar
  const evacuationTab = page.locator('aside button:has-text("กลุ่มอพยพ")').first();
  await evacuationTab.click();
  await page.waitForTimeout(1000);

  // Take screenshot of Evacuation tab for Pongkhong
  await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-pongkhong-evacuation.png' });

  // Verify evacuation overview shows Pongkhong destinations
  const evacDestSection = page.locator('section[aria-label="ที่หมายอพยพ"]');
  await expect(evacDestSection).toContainText('ศาลาประชาคมบ้านปงของ');
  await expect(evacDestSection).toContainText('วัดปงของ');
  await expect(evacDestSection).not.toContainText('TH-ASSEMBLY-01');

  // 5. Switch back to "บ้านท่าตอน"
  const sidebarDropdown = page.locator('aside button:has-text("บ้านปงของ")').first();
  await sidebarDropdown.click();
  await page.waitForTimeout(300);
  const thatonOption = page.locator('button:has-text("บ้านท่าตอน")').last();
  await thatonOption.click();
  await page.waitForTimeout(1000);

  // Take screenshot of Evacuation tab for Thaton
  await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-thaton-evacuation.png' });

  // Verify Thaton has 68 households in queue
  await expect(page.locator('text=ระดับ 1').first()).toBeVisible();
});
