import { expect, test } from '@playwright/test'

test.describe('Admin RBAC & User/Role Management', () => {
  test('auto-unlocks in dev mode, renders Users & Roles 3-level matrix, and enforces Dev Role Preview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/?view=admin')

    // 1. Localhost dev mode shows Role Picker login screen
    await expect(page.getByText('เลือกบทบาทเข้าสู่ระบบ (Localhost)')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /ผู้ดูแลระบบสูงสุด \(Super Admin\)/ }).click()

    // 2. Enters dashboard: sidebar has NO พื้นที่เป้าหมาย/ทะเบียนอาสาสมัคร, and page has inline community switcher
    await expect(page.locator('aside').getByText('พื้นที่เป้าหมาย (4 หมู่บ้าน)')).toHaveCount(0)
    await expect(page.locator('aside').getByRole('button', { name: /ทะเบียนอาสาสมัคร/ })).toHaveCount(0)
    await expect(page.getByText('เลือกดูข้อมูลตามชุมชน:')).toBeVisible()
    await page.getByRole('tab', { name: /รวมมิตร/ }).click()
    await expect(page.locator('header').getByText(/รวมมิตร/).first()).toBeVisible()

    const usersBtn = page.locator('aside').getByRole('button', { name: /ผู้ใช้งานและบทบาท/ })
    await expect(usersBtn).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Dev Role Preview')).toBeVisible()

    // Collapse & expand sidebar toggle
    await page.getByRole('button', { name: 'ย่อแถบข้าง' }).click()
    await expect(page.locator('aside')).toHaveClass(/lg:w-20/)
    await page.getByRole('button', { name: 'ขยายแถบข้าง' }).click()
    await expect(page.locator('aside')).toHaveClass(/lg:w-60/)

    // 2. Open ผู้ใช้งานและบทบาท -> กำหนดบทบาทและสิทธิ์
    await usersBtn.click()
    await expect(page.getByRole('button', { name: /^ผู้ใช้งาน \(/ })).toBeVisible()
    const rolesTab = page.getByRole('button', { name: /กำหนดบทบาทและสิทธิ์/ })
    await expect(rolesTab).toBeVisible()
    await rolesTab.click()

    // 3. Verify 4 preset roles and 12-page 3-level matrix
    await expect(page.getByText('ผู้ดูแลระบบสูงสุด (Super Admin)').first()).toBeVisible()
    await expect(page.getByText('ผู้ตรวจและอนุมัติผลน้ำ').first()).toBeVisible()
    await expect(page.getByText('ทีมวิจัยและจัดการข้อมูล').first()).toBeVisible()
    await expect(page.getByText('ผู้ดูข้อมูลอย่างเดียว (Viewer)').first()).toBeVisible()
    await expect(page.getByText('สิทธิ์การใช้งานทั้ง 12 หน้า').or(page.getByText('ดูไม่ได้เลย')).first()).toBeVisible()

    await page.screenshot({
      path: 'C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/admin-rbac-roles.png',
    })

    // 4. Switch Dev Role Preview to Viewer -> hides users/settings and shows View-Only banner
    const roleSelect = page.getByLabel('สลับบทบาททดสอบ (Dev)')
    await roleSelect.selectOption('viewer')
    await expect(usersBtn).toHaveCount(0)
    await expect(page.locator('aside').getByRole('button', { name: /Audit Log/ })).toHaveCount(0)
    await expect(page.getByText(/โหมดดูอย่างเดียว \(View-Only\)/)).toBeVisible()

    // 5. Switch Dev Role Preview to Reviewer -> hides news/research/users, keeps samples/overview
    await roleSelect.selectOption('reviewer')
    await expect(page.locator('aside').getByRole('button', { name: /ตรวจตัวอย่างน้ำ/ })).toBeVisible()
    await expect(page.locator('aside').getByRole('button', { name: /ภาพรวม/ })).toBeVisible()
    await expect(page.locator('aside').getByRole('button', { name: /จัดการข่าวสารประชาสัมพันธ์/ })).toHaveCount(0)
    await expect(page.locator('aside').getByRole('button', { name: /องค์ความรู้ 7 ทีมวิจัย/ })).toHaveCount(0)

    // 6. Reset back to super-admin, then logout & re-enter directly as Viewer
    await roleSelect.selectOption('super-admin')
    await expect(usersBtn).toBeVisible()

    await page.getByRole('button', { name: 'ออกจากระบบ' }).click()
    await expect(page.getByText('เลือกบทบาทเข้าสู่ระบบ (Localhost)')).toBeVisible()
    await page.getByRole('button', { name: /ผู้ดูข้อมูลอย่างเดียว \(Viewer\)/ }).click()
    await expect(page.getByText(/โหมดดูอย่างเดียว \(View-Only\)/)).toBeVisible()
  })
})
