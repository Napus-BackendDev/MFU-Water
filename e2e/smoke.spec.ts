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

test('landing page 4 communities and page 2 dashboard with survey form load in Nuxt UI', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('MFU Kok Water Watch')

  // Page 1: Landing Page (R02 4 Focus Communities)
  await expect(page.getByText('เลือกพื้นที่เป้าหมาย 4 ชุมชนลุ่มน้ำกก')).toBeVisible()
  await expect(page.getByText('บ้านท่าตอน (เน้นหมู่ 3)')).toBeVisible()
  await expect(page.getByText('บ้านกะเหรี่ยงรวมมิตร')).toBeVisible()
  await expect(page.getByText('บ้านปงของ')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'บ้านปากอิงใต้' })).toBeVisible()

  // Page 1 defaults to Light mode
  await expect(page.locator('html')).toHaveClass(/light/)

  // Navigate to Page 2 (Monitoring Dashboard)
  await page.getByRole('button', { name: 'เข้าสู่ข้อมูลท่าตอน' }).click()
  await expect(page.getByRole('button', { name: 'เลือกพื้นที่ (หน้าแรก)' })).toBeVisible()

  // Theme toggle on Page 2 (defaults to Light mode)
  const dashboardThemeBtn = page.locator('header .map-actions').getByRole('button', { name: 'สลับโหมดสว่าง/โหมดมืด' })
  await expect(dashboardThemeBtn).toBeVisible()
  await dashboardThemeBtn.click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await dashboardThemeBtn.click()
  await expect(page.locator('html')).toHaveClass(/light/)

  // Page 2: OpenStreetMap and R01-R29 modules
  await expect(page.getByRole('region', { name: /แผนที่.*Leaflet/ })).toBeVisible()
  await expect(page.locator('.leaflet-control-attribution')).toContainText(/OpenStreetMap/)
  await expect.poll(
    () => page.locator('.leaflet-tile').evaluateAll((tiles) =>
      tiles.filter((tile) => tile instanceof HTMLImageElement && tile.complete && tile.naturalWidth > 0).length,
    ),
    { timeout: 20000 },
  ).toBeGreaterThan(0)
  await expect(page.getByText('พื้นที่: ท่าตอน')).toBeVisible()

  // Survey Form
  await page.getByRole('button', { name: 'ทำแบบสำรวจ' }).click()
  await expect(page.getByRole('dialog', { name: 'ทำแบบสำรวจ' })).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(9)
  await expect(page.getByLabel('เลือกภาพที่ 1')).toBeVisible()
  await expect(page.getByLabel('เลือกภาพที่ 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ส่งข้อมูลบันทึก' })).toBeEnabled()
})
