import { expect, test } from '@playwright/test'

const now = new Date().toISOString()
const sample = (id: string, ppb: number, lat: number, lon: number) => ({
  id, sample_code: `KOK-E2E-${id}`, station_name: `จุดตรวจ ${id}`, arsenic_level_ppb: ppb, latitude: lat, longitude: lon,
  gps_accuracy_meters: 8, created_at: now, collection_time: now, water_source: 'แม่น้ำ', rain_context: 'ไม่ทราบ',
  contributor_label: 'ผู้ตรวจ', publication_status: 'auto_published', photo_count: 0,
})

test('the wall map prints only the map sheet, built from real samples, at the chosen paper size', async ({ page }) => {
  // Two samples in ท่าตอน, one far away in ปงของ that must not appear on the ท่าตอน sheet.
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({
    json: [sample('A', 30, 20.0595, 99.364), sample('B', 3, 20.0566, 99.3611), sample('C', 8, 20.3076, 100.2102)],
  }))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?view=admin')
  await page.getByRole('button', { name: /สร้างแผนที่พิมพ์/ }).first().click()

  const sheet = page.locator('#printable-map-canvas')
  await expect(sheet.getByRole('heading', { level: 1 })).toHaveText(/แผนที่ชุมชนบ้านท่าตอน/)
  await expect(sheet.locator('.pm-sample')).toHaveCount(2)
  await expect(sheet.getByText('จุดตรวจ (2 จุด · 2 ผลตรวจ)')).toBeVisible()
  // The old sheet showed invented villages and readings; none of them may come back.
  await expect(sheet).not.toContainText('บ้านมะลิกา')
  await expect(sheet).not.toContainText('14.8 ppb')

  await page.getByRole('button', { name: /^A4 ·/ }).click()
  await page.getByRole('button', { name: 'แนวตั้ง', exact: true }).click()
  await expect(page.getByRole('button', { name: /พิมพ์แผนที่ \/ บันทึก PDF \(A4\)/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('style')].some((s) => s.textContent?.includes('@page { size: 210mm 297mm')))).toBe(true)

  // In print, the admin screen disappears and only the sheet is left.
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'ส่วนงานแอดมิน' })).toBeHidden()
  await expect(page.getByRole('heading', { level: 2, name: /จัดทำแผนที่ฉบับพิมพ์/ })).toBeHidden()
  await expect(sheet.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'ขยายแผนที่' })).toBeHidden()
})
