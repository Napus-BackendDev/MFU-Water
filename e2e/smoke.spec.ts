import { expect, test } from '@playwright/test'

test('local Express API routes return JSON and enforce methods, body limits, and contract data', async ({ request }) => {
  const waypoints = await request.get('/api/surveys/waypoints')
  expect([200, 503]).toContain(waypoints.status())
  expect(waypoints.headers()['content-type']).toContain('application/json')
  expect(waypoints.headers()['cache-control']).toBe('no-store')

  const prepare = await request.get('/api/surveys/prepare')
  expect(prepare.status()).toBe(405)
  expect(prepare.headers().allow).toBe('POST')

  const oversized = await request.post('/api/surveys/prepare', { data: { payload: 'x'.repeat(17000) } })
  expect(oversized.status()).toBe(413)

  const health = await request.get('/api/health')
  expect(health.status()).toBe(200)
  const healthJson = await health.json()
  expect(healthJson.ok).toBe(true)

  const contract = await request.get('/api/contract')
  expect(contract.status()).toBe(200)
  const contractJson = await contract.json()
  expect(contractJson.requirements).toHaveLength(29)
})

test('app opens on the map dashboard and the survey form loads in Nuxt UI', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('MFU Kok Water Watch')

  // The how-to video opens over the map on every visit and can be closed
  const welcome = page.getByRole('dialog')
  await expect(welcome.locator('video')).toBeVisible()
  await page.getByRole('button', { name: 'ปิดวิดีโอ' }).click()
  await expect(welcome).toHaveCount(0)

  // First page is the map, no community picker in between; defaults to Light mode
  await expect(page.getByRole('region', { name: /แผนที่.*Leaflet/ })).toBeVisible()
  await expect(page.getByText('เลือกพื้นที่เป้าหมาย 4 ชุมชนลุ่มน้ำกก')).toHaveCount(0)
  await expect(page.locator('html')).toHaveClass(/light/)

  // OpenStreetMap tiles
  await expect(page.locator('.leaflet-control-attribution')).toContainText(/OpenStreetMap/)
  await expect.poll(
    () => page.locator('.leaflet-tile').evaluateAll((tiles) =>
      tiles.filter((tile) => tile instanceof HTMLImageElement && tile.complete && tile.naturalWidth > 0).length,
    ),
    { timeout: 20000 },
  ).toBeGreaterThan(0)

  // Survey Form
  await page.getByRole('button', { name: 'ทำแบบสำรวจ' }).first().click()
  await expect(page.getByRole('dialog', { name: 'ทำแบบสำรวจ' })).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(9)
  await expect(page.getByLabel('เลือกภาพที่ 1')).toBeVisible()
  await expect(page.getByLabel('เลือกภาพที่ 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ส่งข้อมูลบันทึก' })).toBeEnabled()
})
