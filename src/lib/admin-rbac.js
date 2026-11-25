// Shared RBAC definitions for admin sidebar pages, 3-level permissions, and village scope.

export const PERMISSION_LEVELS = /** @type {const} */ (['none', 'view', 'edit'])
export const ALL_COMMUNITY_IDS = /** @type {const} */ (['thaton', 'ruammit', 'pongkhong', 'pakingtai'])

export const ADMIN_PAGES = /** @type {const} */ ([
  { key: 'overview', label: 'ภาพรวม', subtitle: 'สรุปข้อมูลหน้าบ้านและประวัติ', group: 'การจัดการพื้นที่' },
  { key: 'hamlets', label: 'หมู่บ้าน', subtitle: 'จัดการหมู่บ้านและรู้จักชุมชน', group: 'การจัดการพื้นที่' },
  { key: 'samples', label: 'ตรวจตัวอย่างน้ำ', subtitle: '>50 ppb รออนุมัติ', group: 'การจัดการพื้นที่' },
  { key: 'evacuation', label: 'กลุ่มอพยพ', subtitle: 'แผนอพยพและเส้นทาง', group: 'การจัดการพื้นที่' },
  { key: 'places', label: 'สถานที่สำคัญ', subtitle: 'ศูนย์พักพิงและจุดบริการ', group: 'การจัดการพื้นที่' },
  { key: 'reporters', label: 'ทะเบียนอาสาสมัคร', subtitle: 'ติดตามงานส่งตรวจน้ำ', group: 'งานภาคสนามและแผนที่' },
  { key: 'print-map', label: 'สร้างแผนที่พิมพ์ A0/A3', subtitle: 'ติดศาลาประชาคม', group: 'งานภาคสนามและแผนที่' },
  { key: 'news', label: 'จัดการข่าวสารประชาสัมพันธ์', subtitle: 'ประกาศและบทความ', group: 'ข้อมูลและองค์ความรู้' },
  { key: 'research', label: 'องค์ความรู้ 7 ทีมวิจัย', subtitle: 'SWG 1–7 Research Hub', group: 'ข้อมูลและองค์ความรู้' },
  { key: 'reports', label: 'วิเคราะห์และออกรายงาน', subtitle: 'สถิติและแนวโน้มวิจัย', group: 'สรุปรายงานและระบบ' },
  { key: 'settings', label: 'ตั้งค่าและผู้สนับสนุน', subtitle: 'แหล่งทุนและ Audit Log', group: 'สรุปรายงานและระบบ' },
  { key: 'users', label: 'ผู้ใช้งานและบทบาท', subtitle: 'สิทธิ์การเข้าถึงหลังบ้าน', group: 'สรุปรายงานและระบบ' },
])

export const ADMIN_PAGE_KEYS = ADMIN_PAGES.map((p) => p.key)

export function makePermissions(level = 'none', overrides = {}) {
  const perms = {}
  for (const key of ADMIN_PAGE_KEYS) {
    perms[key] = overrides[key] || level
  }
  return perms
}

export function normalizePermissions(input) {
  const perms = {}
  for (const key of ADMIN_PAGE_KEYS) {
    const val = input && typeof input === 'object' ? input[key] : undefined
    perms[key] = PERMISSION_LEVELS.includes(val) ? val : 'none'
  }
  return perms
}

// A missing value is an account saved before village scoping existed, so it keeps full access.
// Anything else that names no valid village means no access: a typo must never widen a scope.
export function normalizeAllowedCommunities(input) {
  if (input === undefined || input === null) return ['all']
  if (!Array.isArray(input)) return []
  if (input.includes('all')) return ['all']
  const valid = [...new Set(input.filter((id) => ALL_COMMUNITY_IDS.includes(id)))]
  return valid.length === ALL_COMMUNITY_IDS.length ? ['all'] : valid
}

export function hasPageAccess(permissions, pageKey, required = 'view') {
  const current = permissions?.[pageKey] || 'none'
  if (required === 'edit') return current === 'edit'
  return current === 'view' || current === 'edit'
}

export function canAccessCommunity(allowedCommunities, communityId) {
  if (!Array.isArray(allowedCommunities)) return false
  return allowedCommunities.includes('all') || allowedCommunities.includes(communityId)
}

export const DEFAULT_ROLES = [
  {
    id: 'super-admin',
    name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    description: 'เข้าถึงและแก้ไขได้ทุกหน้า รวมถึงจัดการผู้ใช้งาน บทบาท และตั้งค่าระบบ',
    isSystem: true,
    permissions: makePermissions('edit'),
  },
  {
    id: 'reviewer',
    name: 'ผู้ตรวจและอนุมัติผลน้ำ',
    description: 'ตรวจรับรองผลตรวจสารหนู > 50 ppb ติดตามอาสาสมัคร และดูข้อมูลชุมชน/แผนอพยพ',
    isSystem: true,
    permissions: makePermissions('none', {
      overview: 'edit',
      samples: 'edit',
      reporters: 'edit',
      hamlets: 'view',
      evacuation: 'view',
      places: 'view',
      'print-map': 'view',
      reports: 'view',
    }),
  },
  {
    id: 'researcher',
    name: 'ทีมวิจัยและจัดการข้อมูล',
    description: 'จัดการข้อมูลหมู่บ้าน แผนอพยพ สถานที่สำคัญ แผนที่พิมพ์ และข่าวสาร',
    isSystem: true,
    permissions: makePermissions('none', {
      overview: 'edit',
      hamlets: 'edit',
      evacuation: 'edit',
      places: 'edit',
      'print-map': 'edit',
      news: 'edit',
      research: 'edit',
      reports: 'edit',
      samples: 'view',
      reporters: 'view',
    }),
  },
  {
    id: 'viewer',
    name: 'ผู้ดูข้อมูลอย่างเดียว (Viewer)',
    description: 'เปิดดูข้อมูลและแผนที่ในระบบหลังบ้านได้ แต่ไม่สามารถเพิ่ม แก้ไข หรือลบข้อมูลใด ๆ',
    isSystem: true,
    permissions: makePermissions('view', {
      settings: 'none',
      users: 'none',
    }),
  },
]
