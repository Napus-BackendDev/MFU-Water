import { expect, test, type Page } from '@playwright/test'

const communities = [
  { id: 'thaton', title: 'บ้านท่าตอน', place: 'ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่', basin: 'ลุ่มน้ำกกตอนบน' },
  { id: 'ruammit', title: 'บ้านกะเหรี่ยงรวมมิตร', place: 'ต.แม่ยาว อ.เมืองเชียงราย จ.เชียงราย', basin: 'ลุ่มน้ำกกตอนกลาง' },
  { id: 'pongkhong', title: 'บ้านปงของ', place: 'ต.แม่เงิน อ.เชียงแสน จ.เชียงราย', basin: 'ลุ่มน้ำโขงตอนบน' },
  { id: 'pakingtai', title: 'บ้านปากอิงใต้', place: 'ต.ศรีดอนชัย อ.เชียงของ จ.เชียงราย', basin: 'จุดบรรจบแม่น้ำอิงกับโขง' },
]

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

for (const community of communities) {
  test(`the หย่อมบ้าน tab introduces ${community.title}`, async ({ page }) => {
    await page.goto(`/?welcome=off&community=${community.id}`)
    await page.getByRole('button', { name: /หย่อมบ้าน/ }).last().click()

    const card = page.getByRole('complementary', { name: 'รู้จักชุมชน' })
    await expect(card.getByRole('heading', { name: `รู้จักชุมชน · ${community.title}` })).toBeVisible()
    await expect(card.getByText(community.place)).toBeVisible()
    await expect(card.getByText(community.basin)).toBeVisible()
    for (const term of ['ลุ่มน้ำ', 'ผู้คน', 'อาชีพ', 'ความเสี่ยง']) await expect(card.getByText(term, { exact: true })).toBeVisible()
    await expect(card.getByText('ยังไม่มีขอบเขตหย่อมและผลสำรวจรายหย่อมของชุมชนนี้')).toBeVisible()
    expect(await noSidewaysScroll(page)).toBe(true)

    await card.getByRole('button', { name: 'ซ่อนการ์ดรู้จักชุมชน' }).click()
    await expect(card).toBeHidden()
  })
}

test('the card follows the chosen community on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?welcome=off&community=pakingtai')
  await page.getByRole('navigation', { name: 'เมนูประเภทแผนที่' }).getByRole('button', { name: /หย่อมบ้าน/ }).click()
  const card = page.getByRole('complementary', { name: 'รู้จักชุมชน' })
  await expect(card.getByRole('heading', { name: 'รู้จักชุมชน · บ้านปากอิงใต้' })).toBeVisible()
  const box = (await card.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(await noSidewaysScroll(page)).toBe(true)
})

test('a test-kit point opens a compact card first and the full detail on request', async ({ page }) => {
  const now = new Date().toISOString()
  const point = (id: string, ppb: number, lat: number) => ({
    id, sample_code: `KOK-E2E-000${id}`, station_name: `จุดตรวจ KOK-E2E-000${id}`, arsenic_level_ppb: ppb, latitude: lat, longitude: 99.364,
    gps_accuracy_meters: 8, created_at: now, collection_time: now, water_source: 'แม่น้ำ', rain_context: 'ไม่ทราบ',
    contributor_label: 'ผู้ตรวจ ก', publication_status: 'auto_published', photo_count: 0,
  })
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({ json: [point('1', 30, 20.0595), point('2', 5, 20.0566)] }))
  await page.goto('/?welcome=off&community=thaton')
  await page.locator('path.leaflet-interactive').first().click({ force: true })

  const popup = page.locator('.kok-popup').last()
  await expect(popup.getByRole('heading')).toContainText('KOK-E2E-000')
  await expect(popup.getByText('อ่านผลอย่างไร')).toBeVisible()
  await expect(popup.getByText('ไม่ใช่คำรับรองว่าน้ำดื่มได้')).toBeVisible()
  await expect(popup.getByText('ผู้บันทึก ผู้ตรวจ ก')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await popup.getByRole('button', { name: /ดูรายละเอียดและกราฟ/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
