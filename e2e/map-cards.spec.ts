import { expect, test, type Page } from '@playwright/test'

const communities = [
  { id: 'thaton', title: 'บ้านท่าตอน', place: 'ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่', basin: 'ลุ่มน้ำกกตอนบน' },
  { id: 'ruammit', title: 'บ้านกะเหรี่ยงรวมมิตร', place: 'ต.แม่ยาว อ.เมืองเชียงราย จ.เชียงราย', basin: 'ลุ่มน้ำกกตอนกลาง' },
  { id: 'pongkhong', title: 'บ้านปงของ', place: 'ต.แม่เงิน อ.เชียงแสน จ.เชียงราย', basin: 'ลุ่มน้ำโขงตอนบน' },
  { id: 'pakingtai', title: 'บ้านปากอิงใต้', place: 'ต.ศรีดอนชัย อ.เชียงของ จ.เชียงราย', basin: 'จุดบรรจบแม่น้ำอิงกับโขง' },
]

const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

for (const community of communities) {
  test(`the หมู่บ้าน tab introduces ${community.title}`, async ({ page }) => {
    await page.goto(`/?welcome=off&community=${community.id}`)
    await page.getByRole('button', { name: /หมู่บ้าน/ }).last().click()

    const card = page.getByRole('complementary', { name: 'รู้จักชุมชน' })
    await expect(card.getByRole('heading', { name: `รู้จักชุมชน · ${community.title}` })).toBeVisible()
    await expect(card.getByText(community.place)).toBeVisible()
    await expect(card.getByText(community.basin)).toBeVisible()
    for (const term of ['ลุ่มน้ำ', 'ผู้คน', 'อาชีพ', 'ความเสี่ยง']) await expect(card.getByText(term, { exact: true })).toBeVisible()
    // The card states what the village layer actually holds, instead of a fixed sentence.
    await expect(card.getByText(/หมู่บ้านในทะเบียน \d+ แห่ง|ปักตำแหน่งแล้ว \d+ จาก \d+ หมู่บ้าน|ปักตำแหน่งครบ \d+ หมู่บ้าน|ยังไม่มีทะเบียนหมู่บ้านของชุมชนนี้/)).toBeVisible()
    expect(await noSidewaysScroll(page)).toBe(true)

    await card.getByRole('button', { name: 'ซ่อนการ์ดรู้จักชุมชน' }).click()
    await expect(card).toBeHidden()
  })
}

test('the card follows the chosen community on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?welcome=off&community=pakingtai')
  await page.getByRole('navigation', { name: 'เมนูประเภทแผนที่' }).getByRole('button', { name: /หมู่บ้าน/ }).click()
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

test('the evacuation tab shows the households of the community-data layer, not the old PDF points', async ({ page }) => {
  await page.goto('/?welcome=off&community=thaton')
  await page.getByRole('button', { name: /อพยพ/ }).last().click()
  const pins = page.locator('.community-household-review-marker')
  await expect(pins).toHaveCount(68)

  const legend = page.getByLabel('สีและสัญลักษณ์อพยพ')
  for (const row of ['1. วิกฤตสูงสุด (4)', '2. มีสมาชิกเปราะบาง (8)', '4. เคยท่วมบ้าน (56)']) await expect(legend).toContainText(row)
  await expect(legend).not.toContainText('บ้านที่มีผู้สูงอายุ')

  await pins.first().click({ force: true })
  const popup = page.locator('.leaflet-popup').last()
  await expect(popup).toContainText('ครัวเรือน MM1-')
  await expect(popup).toContainText('จำนวนสมาชิกเปราะบาง (คน)'.replace(' (คน)', ' คน'))
  await expect(popup).toContainText('ที่มา: ข้อมูลชุมชน (My Maps)')
})

test('a first-time visitor lands on data, not an empty map', async ({ page }) => {
  await page.goto('/?welcome=off&community=thaton')
  await page.waitForSelector('.leaflet-container')
  // No filter touched: published results are already on the map.
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible()
  const filter = page.getByRole('region', { name: 'ตัวกรองเวลาสารเคมีปนเปื้อน' })
  await expect(filter.getByRole('button', { name: 'ทั้งหมด' })).toHaveAttribute('aria-pressed', 'true')
  await expect(filter).not.toContainText('ไม่มีผลตรวจช่วงนี้')
})

test('a community with nothing published says so instead of showing a blank map', async ({ page }) => {
  await page.goto('/?welcome=off&community=ruammit')
  await page.waitForSelector('.leaflet-container')
  await expect(page.getByText(/ยังไม่มีผลตรวจที่เผยแพร่ของ/)).toBeVisible()
})

test('the map can be zoomed with buttons and cannot be zoomed out past the basin', async ({ page }) => {
  await page.goto('/?welcome=off&community=thaton')
  await page.waitForSelector('.leaflet-container')
  const zoom = () => page.evaluate(() => {
    const el = document.querySelector('.leaflet-container') as any
    let c = el.__vueParentComponent
    while (c && !c.setupState?.mapInstance) c = c.parent
    return c.setupState.mapInstance.getZoom() as number
  })
  await expect(page.locator('.leaflet-control-zoom a')).toHaveCount(2)
  const start = await zoom()
  // Leaflet ignores a click while the previous zoom animates, so step down with a pause.
  // Leaflet disables the button at the floor, so stop there instead of counting clicks.
  const zoomOut = page.locator('.leaflet-control-zoom-out')
  for (let i = 0; i < 20 && !(await zoomOut.getAttribute('class'))?.includes('leaflet-disabled'); i++) {
    await zoomOut.click({ force: true }) // it may become disabled mid-animation
    await page.waitForTimeout(200)
  }
  await expect(zoomOut).toHaveClass(/leaflet-disabled/)
  const out = await zoom()
  expect(out).toBeLessThan(start)
  expect(out).toBeGreaterThanOrEqual(8)
  // Zoomed out, the four target communities are marked so the map is never blank.
  await expect(page.locator('.kok-community-pin')).toHaveCount(4)
  await page.locator('.leaflet-control-zoom-in').click()
  await expect.poll(zoom).toBeGreaterThan(out)
})
