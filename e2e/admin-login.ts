import type { Page } from '@playwright/test'

// The admin login opens on the username tab; these specs use the emergency passcode tab with a mocked API.
export async function fillPasscode(page: Page, passcode: string) {
  await page.getByRole('button', { name: 'รหัสผ่านฉุกเฉิน' }).click()
  await page.locator('#admin-passcode').fill(passcode)
}

// What /api/admin/me answers for a Super Admin; the mocked specs return it so the sidebar shows every page.
export const superAdminMe = {
  ok: true,
  bypass: false,
  isSuperAdmin: true,
  userId: null,
  username: null,
  displayName: 'ผู้ดูแลระบบ (Super Admin)',
  roleId: 'super-admin',
  roleName: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
  permissions: Object.fromEntries(['overview', 'hamlets', 'samples', 'evacuation', 'places', 'reporters', 'print-map', 'news', 'research', 'reports', 'settings', 'users'].map((key) => [key, 'edit'])),
  allowedCommunities: ['all'],
}

// On localhost the login offers a role picker instead of opening straight away; this picks Super Admin.
// It does nothing when the session is already unlocked.
export async function devSuperAdminLogin(page: Page) {
  const pick = page.getByRole('button', { name: /ผู้ดูแลระบบสูงสุด \(Super Admin\)/ })
  await pick.waitFor({ state: 'visible', timeout: 5000 }).then(() => pick.click()).catch(() => {})
}
