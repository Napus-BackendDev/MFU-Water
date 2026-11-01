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
  await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'ข้อความจากเซิร์ฟเวอร์' })).toBeVisible()
})

test('the pin button pins an unpinned article', async ({ page }) => {
  await mockAdminApi(page, 503)
  await openLogin(page)
  await login(page, 'mock')
  const pin = page.getByTitle('สลับสถานะปักหมุด')
  await pin.click()
  await expect(pin).toHaveClass(/text-amber-500/)
})

// Real create, edit, pin and delete of one temporary draft. Writes to the target's database, so it only runs when asked:
// PLAYWRIGHT_TEST_BASE_URL=<site> E2E_ADMIN_PASSCODE=<passcode> npx playwright test e2e/admin-news.spec.ts
test('admin creates, edits, pins and deletes a draft article', async ({ page }) => {
  const passcode = process.env.E2E_ADMIN_PASSCODE
  test.skip(!passcode, 'E2E_ADMIN_PASSCODE is not set')
  const title = `[ทดสอบระบบ ลบได้] ${Date.now()}`

  await openLogin(page)
  await login(page, passcode!)

  await page.getByRole('button', { name: 'สร้างข่าวประชาสัมพันธ์ใหม่' }).click()
  await page.getByPlaceholder(/แจ้งผลตรวจคุณภาพน้ำ/).fill(title)
  await page.getByPlaceholder(/รายละเอียดผลการตรวจ/).fill('เนื้อหาทดสอบ')
  await page.locator('input[type=radio][value=draft]').check()
  await page.getByRole('button', { name: 'สร้างข่าวประชาสัมพันธ์', exact: true }).click()

  const row = page.locator('tbody tr', { hasText: title })
  try {
    await expect(row).toBeVisible()

    await row.getByTitle('แก้ไขข่าวสาร').click()
    await page.getByPlaceholder(/แจ้งผลตรวจคุณภาพน้ำ/).fill(`${title} แก้แล้ว`)
    await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
    await expect(row.getByText(`${title} แก้แล้ว`).first()).toBeVisible()

    const pin = row.getByTitle('สลับสถานะปักหมุด')
    await pin.click()
    await expect(pin).toHaveClass(/text-amber-500/)
  } finally {
    await row.getByTitle('ลบข่าวสาร').click()
    await page.getByRole('button', { name: 'ยืนยันลบข่าว' }).click()
    await expect(row).toBeHidden()
  }
})
