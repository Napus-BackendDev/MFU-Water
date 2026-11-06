import { expect, test, type Page } from '@playwright/test'

async function mockAdminApi(page: Page) {
  await page.route('**/api/admin/**', (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('verify-passcode')) return route.fulfill({ json: { ok: true, token: '1.mock' } })
    if (url.includes('/samples') || url.includes('/pending-samples')) return route.fulfill({ json: { samples: [], counts: { total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 }, alerts: [] } })
    if (url.includes('/summary')) return route.fulfill({ json: { hamlets: { total: 0, unassigned: 0 }, places: { published: 0, total: 0, waitingLocation: 0 }, households: { published: 0, total: 0, byLevel: [] }, settings: { pointsPublic: false } } })
    if (url.includes('/news')) return route.fulfill({ json: { ok: true, items: [], counts: { total: 0, published: 0, draft: 0, pinned: 0 } } })
    return route.continue()
  })
}

test.describe('Admin Full Backend Navigation & All Pages Suite', () => {
  test('navigates through all 8 admin pages and interacts with their key features', async ({ page }) => {
    await mockAdminApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/?view=admin')

    // Login if passcode form is shown
    await page.locator('input[type=password]').fill('mock')
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()

    // Verify 1: ตรวจตัวอย่างน้ำ (Default Tab)
    await expect(page.getByText('ตรวจตัวอย่างน้ำ (>50 ppb)').first()).toBeVisible()
    // Confirm 'ทางลัดระบบ' is removed from sidebar
    await expect(page.locator('aside').getByText('ทางลัดระบบ')).toHaveCount(0)
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-samples.png' })

    // Verify 1.1: ข้อมูลแผนที่หน้าบ้าน (map) - Verify 'ตรวจตัวอย่างน้ำ' is between 'หมู่บ้าน' and 'กลุ่มอพยพ', and 'ข้อมูลชุมชน' is removed
    await page.getByRole('button', { name: /ข้อมูลแผนที่หน้าบ้าน/ }).first().click()
    await expect(page.getByRole('button', { name: 'ภาพรวม' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'หมู่บ้าน', exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'หน้าข้อมูลแผนที่' }).getByRole('button', { name: 'ตรวจตัวอย่างน้ำ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'กลุ่มอพยพ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'สถานที่สำคัญ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ข้อมูลชุมชน' })).toHaveCount(0)
    // One way in: water samples are a tab of ข้อมูลแผนที่หน้าบ้าน, not a second sidebar item.
    await expect(page.locator('aside').getByRole('button', { name: /^ตรวจตัวอย่างน้ำ/ })).toHaveCount(0)
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-map-with-samples.png' })

    // Verify 2: ทะเบียนอาสาสมัคร & ตรวจซ้ำ (reporters)
    await page.getByRole('button', { name: /ทะเบียนอาสาสมัคร/ }).first().click()
    await expect(page.getByRole('heading', { level: 2, name: /ทะเบียนอาสาสมัคร/ })).toBeVisible()
    await expect(page.getByText('อาสาสมัครทั้งหมด')).toBeVisible()
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-reporters.png' })

    // Verify 3: สร้างแผนที่พิมพ์ A0/A3 (print-map)
    await page.getByRole('button', { name: /สร้างแผนที่พิมพ์/ }).first().click()
    await expect(page.getByRole('heading', { level: 2, name: /จัดทำแผนที่ฉบับพิมพ์/ })).toBeVisible()
    await expect(page.locator('#printable-map-canvas')).toBeVisible()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-print-map.png' })
    await page.locator('#printable-map-canvas').screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/print-map-crop.png' })

    // Verify 4: จัดการข่าวสารประชาสัมพันธ์ (news)
    await page.getByRole('button', { name: /จัดการข่าวสารประชาสัมพันธ์/ }).first().click()
    await expect(page.getByText('ข่าวสารทั้งหมด').or(page.getByText('สร้างข่าวใหม่'))).toBeVisible()
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-news.png' })

    // Verify 5: องค์ความรู้ 7 ทีมวิจัย (research)
    await page.getByRole('button', { name: /องค์ความรู้ 7 ทีมวิจัย/ }).first().click()
    await expect(page.getByRole('heading', { level: 2, name: /จัดการองค์ความรู้ 7 ทีมวิจัย/ })).toBeVisible()
    await expect(page.getByText('SWG 1', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('SWG 2.1', { exact: true }).first()).toBeVisible()
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-research.png' })

    // Verify 6: วิเคราะห์และออกรายงาน (reports)
    await page.getByRole('button', { name: /วิเคราะห์และออกรายงาน/ }).first().click()
    await expect(page.getByRole('heading', { level: 2, name: /ศูนย์วิเคราะห์ข้อมูลและออกรายงานวิจัย/ })).toBeVisible()
    await expect(page.getByText('แนวโน้มสารหนูเฉลี่ยตามฤดูกาล')).toBeVisible()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-reports.png' })

    // Verify 7: ตั้งค่าและผู้สนับสนุน (settings)
    await page.getByRole('button', { name: /ตั้งค่าและผู้สนับสนุน/ }).first().click()
    await expect(page.getByRole('heading', { level: 2, name: /ตั้งค่าโครงการ ผู้สนับสนุน/ })).toBeVisible()
    await expect(page.getByText('Australian Aid')).toBeVisible()
    await page.screenshot({ path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-tab-settings.png' })
  })
})
