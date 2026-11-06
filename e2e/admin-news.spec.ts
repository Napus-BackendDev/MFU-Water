import { expect, test, type Page } from '@playwright/test'

const article = {
  id: 'NW-E2E-001',
  title: 'ข่าวจำลองสำหรับเทสต์',
  category: 'water',
  community_id: 'all',
  community_name: 'ทุกชุมชน',
  summary: 'สรุป',
  content: 'เนื้อหา',
  cover_image_url: '/data/news/thaton-map-preview.png',
  gallery_image_urls: [],
  is_pinned: false,
  status: 'published',
  author: 'ทดสอบ',
  published_at: '2026-10-01T00:00:00.000Z',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
}

const openLogin = (page: Page) => page.goto('/?view=admin')

async function login(page: Page, passcode: string) {
  await page.locator('input[type=password]').fill(passcode)
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
  await page.getByRole('button', { name: /จัดการข่าวสาร/ }).click()
}

// Mocked API: no credentials and nothing is written, so this is safe against any environment.
async function mockAdminApi(page: Page, writeStatus: number) {
  await page.route('**/api/admin/**', (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('verify-passcode')) return route.fulfill({ json: { ok: true, token: '1.mock' } })
    if (url.includes('/samples')) return route.fulfill({ json: { samples: [], counts: { total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 }, alerts: [] } })
    if (url.includes('/map-data/audit')) return route.fulfill({ json: { ok: true, items: [] } })
    if (url.includes('/map-data/preview')) return route.fulfill({ json: { ok: true, payload: { placed: [], pending: [], hamlets: [], routes: [], layers: [] } } })
    if (url.includes('/map-data')) return route.fulfill({ json: { ok: true, households: { total: 0, published: 0, byLevel: [] }, hamlets: { total: 0, unassigned: 0 }, places: { total: 0, published: 0, waitingLocation: 0 }, seed: {}, layers: [], settings: { hiddenLayers: [], pointsPublic: true, sourceUrl: '', title: '', importedAt: '', surveyDate: null } } })
    if (request.method() === 'GET') return route.fulfill({ json: { ok: true, items: [article], counts: { total: 1, published: 1, draft: 0, pinned: 0 } } })
    if (url.endsWith('/pin')) return route.fulfill({ json: { ok: true, article: { ...article, is_pinned: request.postDataJSON().is_pinned } } })
    return route.fulfill({ status: writeStatus, json: { error: 'ข้อความจากเซิร์ฟเวอร์' } })
  })
}

test('an expired session returns to the login form instead of a dead delete dialog', async ({ page }) => {
  await mockAdminApi(page, 401)
  await openLogin(page)
  await login(page, 'mock')
  await page.getByTitle('ลบข่าวสาร').click()
  await page.getByRole('button', { name: 'ยืนยันลบข่าว' }).click()
  await expect(page.getByText('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ยืนยันลบข่าว' })).toBeHidden()
  await expect(page.locator('input[type=password]')).toBeVisible()
})

test('a failed delete shows the error inside the dialog', async ({ page }) => {
  await mockAdminApi(page, 503)
  await openLogin(page)
  await login(page, 'mock')
  await page.getByTitle('ลบข่าวสาร').click()
  await page.getByRole('button', { name: 'ยืนยันลบข่าว' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'ข้อความจากเซิร์ฟเวอร์' })).toBeVisible()
})

test('a failed save shows the error beside the save button', async ({ page }) => {
  await mockAdminApi(page, 503)
  await openLogin(page)
  await login(page, 'mock')
  await page.getByTitle('แก้ไขข่าวสาร').click()
  await page.getByRole('button', { name: 'บันทึกและเผยแพร่ข่าว' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'ข้อความจากเซิร์ฟเวอร์' })).toBeVisible()
})

test('the pin button pins an unpinned article', async ({ page }) => {
  await mockAdminApi(page, 503)
  await openLogin(page)
  await login(page, 'mock')
  const pin = page.getByTitle('สลับสถานะปักหมุด')
  await pin.click()
  await expect(pin).toHaveAttribute('aria-pressed', 'true')
})

const pendingSample = { sample_code: 'KOK-E2E-001', latitude: 20.05, longitude: 99.36, collection_time: '2026-10-01T00:00:00.000Z', gps_accuracy_meters: 5, arsenic_ppb: 100, publication_status: 'pending_review', private_photo_paths: [], contact_name: 'ผู้ทดสอบ', contact_phone: '0800000000' }

async function mockSamples(page: Page) {
  await page.route('**/api/admin/samples', (route) => route.fulfill({ json: { samples: [pendingSample], counts: { total: 1, pending: 1, approved: 0, autoPublished: 0, rejected: 0 }, alerts: [] } }))
}

async function openSamplesTab(page: Page) {
  const nav = page.getByRole('navigation', { name: 'ส่วนงานแอดมิน' })
  const target = nav.getByRole('button', { name: /^ตรวจตัวอย่างน้ำ/ }).first()
  if (!(await target.isVisible())) {
    const menu = page.getByRole('button', { name: 'เปิดเมนูนำทาง' })
    if (await menu.isVisible()) await menu.click()
  }
  await target.click()
}

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`selecting a sample shows its contact and review actions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockAdminApi(page, 503)
    await mockSamples(page)
    await openLogin(page)
    await page.locator('input[type=password]').fill('mock')
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
    await openSamplesTab(page)
    await page.getByRole('button', { name: 'KOK-E2E-001' }).click()
    await expect(page.getByRole('link', { name: '0800000000' })).toBeVisible()
    await page.getByRole('button', { name: 'ปฏิเสธ', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
}

for (const width of [375, 768, 1024, 1280, 1440]) {
  test(`the admin pages do not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await mockAdminApi(page, 503)
    await mockSamples(page)
    await openLogin(page)
    await page.locator('input[type=password]').fill('mock')
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
    await openSamplesTab(page)
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    await expect(page.getByRole('button', { name: 'KOK-E2E-001' })).toBeVisible()
    expect(await fits()).toBe(true)
    // The status column stays on screen without scrolling the table
    expect((await page.locator('tbody tr').first().locator('td').last().boundingBox())!.x).toBeLessThan(width)
    // Below the lg breakpoint the admin pages are reached through the menu button only.
    const menu = page.getByRole('button', { name: 'เปิดเมนูนำทาง' })
    if (await menu.isVisible()) await menu.click()
    await page.getByRole('button', { name: /จัดการข่าวสาร/ }).first().click()
    await expect(page.getByTitle('แก้ไขข่าวสาร')).toBeVisible()
    expect(await fits()).toBe(true)
    await expect(page.getByTitle('ลบข่าวสาร')).toBeInViewport()
    await page.getByTitle('แก้ไขข่าวสาร').click()
    await expect(page.getByRole('button', { name: 'บันทึกและเผยแพร่ข่าว' })).toBeVisible()
    expect(await fits()).toBe(true)
  })
}

test('an admin edits a sample and deletes it, and failures stay in the dialog', async ({ page }) => {
  await mockAdminApi(page, 503)
  await mockSamples(page)
  const writes: string[] = []
  let fail = true
  await page.route('**/api/admin/samples/KOK-E2E-001', (route) => {
    const request = route.request()
    if (fail) return route.fulfill({ status: 503, json: { error: 'ข้อความจากเซิร์ฟเวอร์' } })
    writes.push(request.method())
    return route.fulfill({ json: { success: true } })
  })
  await openLogin(page)
  await page.locator('input[type=password]').fill('mock')
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
  await openSamplesTab(page)
  await page.getByRole('button', { name: 'KOK-E2E-001' }).click()

  await page.getByRole('button', { name: 'แก้ไขข้อมูล' }).click()
  await expect(page.getByLabel('ชื่อผู้รายงาน')).toHaveValue('ผู้ทดสอบ')
  await page.getByLabel('ระดับสารหนู').selectOption('50')
  await expect(page.getByText('จะเผยแพร่บนแผนที่สาธารณะทันที')).toBeVisible()
  await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'ข้อความจากเซิร์ฟเวอร์' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
  await expect(page.getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeHidden()

  await page.getByRole('button', { name: 'ลบข้อมูล' }).click()
  await expect(page.getByText('กู้คืนไม่ได้')).toBeVisible()
  await page.getByRole('button', { name: 'ยืนยันลบข้อมูล' }).click()
  await expect(page.getByRole('button', { name: 'ยืนยันลบข้อมูล' })).toBeHidden()
  expect(writes).toEqual(['PUT', 'DELETE'])
})

// Real create, edit, pin and delete of one temporary article. Writes to the target's database, so it only runs when asked:
// PLAYWRIGHT_TEST_BASE_URL=<site> E2E_ADMIN_PASSCODE=<passcode> npx playwright test e2e/admin-news.spec.ts
test('admin creates, edits, pins and deletes an article', async ({ page }) => {
  const passcode = process.env.E2E_ADMIN_PASSCODE
  test.skip(!passcode, 'E2E_ADMIN_PASSCODE is not set')
  const title = `[ทดสอบระบบ ลบได้] ${Date.now()}`

  await openLogin(page)
  await login(page, passcode!)

  await page.getByRole('button', { name: 'สร้างข่าวใหม่' }).click()
  await page.getByPlaceholder(/แจ้งผลตรวจคุณภาพน้ำ/).fill(title)
  await page.getByPlaceholder(/รายละเอียดผลการตรวจ/).fill('เนื้อหาทดสอบ')
  await page.getByRole('button', { name: 'บันทึกและเผยแพร่ข่าว' }).click()

  const row = page.locator('tbody tr', { hasText: title })
  try {
    await expect(row).toBeVisible()

    await row.getByTitle('แก้ไขข่าวสาร').click()
    await page.getByPlaceholder(/แจ้งผลตรวจคุณภาพน้ำ/).fill(`${title} แก้แล้ว`)
    await page.getByRole('button', { name: 'บันทึกและเผยแพร่ข่าว' }).click()
    await expect(row.getByText(`${title} แก้แล้ว`).first()).toBeVisible()

    const pin = row.getByTitle('สลับสถานะปักหมุด')
    await pin.click()
    await expect(pin).toHaveAttribute('aria-pressed', 'true')
  } finally {
    await row.getByTitle('ลบข่าวสาร').click()
    await page.getByRole('button', { name: 'ยืนยันลบข่าว' }).click()
    await expect(row).toBeHidden()
  }
})
