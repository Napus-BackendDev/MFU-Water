import { computed, onMounted, ref } from 'vue'
import {
  adminFetch as sessionAdminFetch,
  getAdminToken,
  getDevCommunities,
  getDevRoleId,
  getReviewerName,
  requestAdminBypass,
  setAdminToken,
  setDevCommunities,
  setDevRoleId,
  setReviewerName,
} from '../utils/admin-session'
import { emptyCounts, type AdminCounts, type AdminSample, type Decision, type SampleEdit } from '../utils/admin-types'
import { formatErrorWithReason } from '../utils/map-data-admin'
import {
  DEFAULT_ROLES,
  canAccessCommunity,
  hasPageAccess,
  makePermissions,
  type AdminMe,
  type AdminPageKey,
  type AdminRole,
  type PermissionLevel,
} from '../../src/lib/admin-rbac'

type Feedback = { type: 'success' | 'error'; message: string }

const defaultReason: Record<Decision, string> = { approve: 'แอดมินอนุมัติการเผยแพร่ข้อมูล', reject: 'แอดมินไม่อนุมัติ' }
const doneMessage = (decision: Decision, code: string) => decision === 'approve'
  ? `อนุมัติรหัส ${code} เรียบร้อยแล้ว (แสดงผลบนแผนที่สาธารณะทันที)`
  : `ปฏิเสธรหัส ${code} เรียบร้อยแล้ว (จะไม่แสดงบนแผนที่สาธารณะ)`

// Admin session + RBAC + review queue: login, loading permissions, samples, approving or rejecting them.
export function useAdminQueue() {
  const isUnlocked = ref(false)
  const loginMode = ref<'user' | 'passcode'>('user')
  const username = ref('')
  const password = ref('')
  const passcode = ref('')
  const reviewer = ref(getReviewerName())
  const verifying = ref(false)
  const loginError = ref<string | null>(null)

  const me = ref<(AdminMe & { devRoles?: AdminRole[] }) | null>(null)
  const devBypassAvailable = ref(false)
  const googleOAuthEnabled = ref(false)
  const devRoles = ref<AdminRole[]>([...DEFAULT_ROLES])
  const devRoleId = ref(getDevRoleId() || 'super-admin')
  const devCommunities = ref<string[]>(getDevCommunities() ? getDevCommunities().split(',').filter(Boolean) : ['all'])

  const loading = ref(false)
  const samples = ref<AdminSample[]>([])
  const counts = ref<AdminCounts>(emptyCounts())
  const feedback = ref<Feedback | null>(null)
  const actionLoading = ref<string | null>(null)

  const permissions = computed(() => me.value?.permissions ?? makePermissions('none'))
  const allowedCommunities = computed(() => me.value?.allowedCommunities ?? ['all'])
  const canView = (page: AdminPageKey) => hasPageAccess(permissions.value, page, 'view')
  const canEdit = (page: AdminPageKey) => hasPageAccess(permissions.value, page, 'edit')
  const permissionOf = (page: AdminPageKey): PermissionLevel => permissions.value[page] ?? 'none'
  const isCommunityAllowed = (communityId: string) => canAccessCommunity(allowedCommunities.value, communityId)

  function logout(error: string | null = null) {
    setAdminToken(null)
    setDevRoleId(null)
    setDevCommunities(null)
    isUnlocked.value = false
    me.value = null
    samples.value = []
    passcode.value = ''
    password.value = ''
    loginError.value = error
    feedback.value = null
  }

  // fetch with the admin token; an expired or invalid session sends the user back to the login form.
  async function adminFetch(url: string, init: RequestInit = {}) {
    const response = await sessionAdminFetch(url, init)
    if (response.status === 401) {
      logout('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
      throw new Error('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
    }
    return response
  }

  async function fetchMe() {
    try {
      const response = await adminFetch('/api/admin/me')
      if (!response.ok) return false
      const data = await response.json()
      me.value = data
      if (data.displayName && !getReviewerName()) {
        setReviewerName(data.displayName)
        reviewer.value = data.displayName
      }
      isUnlocked.value = true
      return true
    } catch {
      return false
    }
  }

  async function fetchSamples(manual = false) {
    if (me.value && !canView('samples')) {
      samples.value = []
      counts.value = emptyCounts()
      return
    }
    loading.value = true
    if (manual) feedback.value = null
    try {
      const response = await adminFetch('/api/admin/samples')
      if (response.status === 403) {
        samples.value = []
        if (manual) {
          throw new Error('บทบาทของคุณไม่มีสิทธิ์ดูรายการตัวอย่างน้ำ (HTTP 403)')
        }
        return
      }
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || `เซิร์ฟเวอร์ตอบกลับ HTTP ${response.status}`)
      samples.value = data?.samples || []
      if (data?.counts) counts.value = data.counts
      isUnlocked.value = true
      if (manual) {
        feedback.value = { type: 'success', message: `รีเฟรชข้อมูลตัวอย่างน้ำเรียบร้อยแล้ว (${samples.value.length} รายการ)` }
      }
    } catch (error) {
      if (isUnlocked.value || manual) {
        feedback.value = {
          type: 'error',
          message: formatErrorWithReason('โหลดข้อมูลตัวอย่างน้ำไม่สำเร็จ', error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'),
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function switchDevRole(nextRoleId: string, nextCommunities?: string[]) {
    const wasUnlocked = isUnlocked.value
    devRoleId.value = nextRoleId || 'super-admin'
    setDevRoleId(devRoleId.value === 'super-admin' ? null : devRoleId.value)
    if (nextCommunities !== undefined) {
      devCommunities.value = nextCommunities.length ? nextCommunities : ['all']
      setDevCommunities(devCommunities.value.includes('all') ? null : devCommunities.value)
    }
    await fetchMe()
    if (canView('samples')) await fetchSamples(false)
    else samples.value = []
    if (wasUnlocked) {
      const roleLabel = me.value?.roleName || devRoleId.value
      feedback.value = { type: 'success', message: `สลับบทบาทเป็น “${roleLabel}” เรียบร้อยแล้ว` }
    }
  }

  async function loginWithDevRole(nextRoleId: string, nextCommunities: string[] = ['all']) {
    verifying.value = true
    loginError.value = null
    try {
      setAdminToken('dev-bypass')
      await switchDevRole(nextRoleId, nextCommunities)
    } catch (error) {
      const msg = formatErrorWithReason('เข้าสู่ระบบทดลองบทบาทไม่สำเร็จ', error instanceof Error ? error.message : 'เกิดข้อผิดพลาด')
      loginError.value = msg
      feedback.value = { type: 'error', message: msg }
    } finally {
      verifying.value = false
    }
  }

  async function login() {
    const isUserMode = loginMode.value === 'user'
    const u = username.value.trim()
    const p = password.value
    const code = passcode.value.trim()

    verifying.value = true
    loginError.value = null
    try {
      if (isUserMode && (!u || !p)) {
        throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน')
      }
      if (!isUserMode && !code) {
        throw new Error('กรุณาระบุรหัสผ่านฉุกเฉินของผู้ดูแลระบบ')
      }

      const response = await fetch('/api/admin/verify-passcode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isUserMode ? { username: u, password: p } : { passcode: code }),
      })
      const data = await response.json().catch(() => ({ error: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})` }))
      if (!response.ok || !data.token) {
        throw new Error(data.error || `รหัสผ่านไม่ถูกต้องหรือเซิร์ฟเวอร์ปฏิเสธ (HTTP ${response.status})`)
      }
      setAdminToken(data.token)
      if (data.user?.displayName) {
        setReviewerName(data.user.displayName)
        reviewer.value = data.user.displayName
      } else {
        setReviewerName(reviewer.value)
      }
      setDevRoleId(null)
      setDevCommunities(null)
      isUnlocked.value = true
      passcode.value = ''
      password.value = ''
      await fetchMe()
      await fetchSamples(false)
      feedback.value = { type: 'success', message: `เข้าสู่ระบบหลังบ้านสำเร็จ (${me.value?.displayName || 'ผู้ดูแลระบบ'})` }
    } catch (error) {
      const msg = formatErrorWithReason('เข้าสู่ระบบไม่สำเร็จ', error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      loginError.value = msg
      feedback.value = { type: 'error', message: msg }
    } finally {
      verifying.value = false
    }
  }

  // Returns true when the decision was saved, so the caller can close its dialog.
  async function review(sampleCode: string, decision: Decision, reason?: string) {
    actionLoading.value = sampleCode
    feedback.value = null
    try {
      if (!sampleCode) throw new Error('ไม่พบรหัสตัวอย่างน้ำที่ต้องการตรวจสอบ')
      const response = await adminFetch(`/api/admin/samples/${encodeURIComponent(sampleCode)}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewer: getReviewerName(), reason: reason || defaultReason[decision] }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${response.status})`)
      await fetchSamples(false)
      feedback.value = { type: 'success', message: doneMessage(decision, sampleCode) }
      return true
    } catch (error) {
      feedback.value = {
        type: 'error',
        message: formatErrorWithReason('บันทึกผลการตรวจสอบตัวอย่างน้ำไม่สำเร็จ', error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดำเนินการ'),
      }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  // Saves or deletes one sample, then reloads the list. Returns true on success so the caller can close its dialog.
  async function changeSample(sampleCode: string, init: RequestInit, failure: string, done: string) {
    actionLoading.value = sampleCode
    feedback.value = null
    try {
      if (!sampleCode) throw new Error('ไม่พบรหัสตัวอย่างน้ำเป้าหมาย')
      const response = await adminFetch(`/api/admin/samples/${encodeURIComponent(sampleCode)}`, init)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${response.status})`)
      await fetchSamples(false)
      feedback.value = { type: 'success', message: done }
      return true
    } catch (error) {
      feedback.value = {
        type: 'error',
        message: formatErrorWithReason(failure, error instanceof Error ? error.message : failure),
      }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  const updateSample = (sampleCode: string, values: SampleEdit) => changeSample(
    sampleCode,
    { method: 'PUT', body: JSON.stringify({ ...values, reviewer: getReviewerName() }) },
    'แก้ไขข้อมูลไม่สำเร็จ',
    `แก้ไขข้อมูลรหัส ${sampleCode} เรียบร้อยแล้ว`,
  )

  const deleteSample = (sampleCode: string) => changeSample(
    sampleCode,
    { method: 'DELETE' },
    'ลบข้อมูลไม่สำเร็จ',
    `ลบข้อมูลรหัส ${sampleCode} เรียบร้อยแล้ว`,
  )

  async function loadDevBypassRoles() {
    const bypass = await requestAdminBypass()
    if (bypass) {
      setAdminToken(null)
      devBypassAvailable.value = true
      try {
        const res = await fetch('/api/admin/me')
        const data = await res.json().catch(() => null)
        if (res.ok && data?.devRoles?.length) {
          devRoles.value = data.devRoles
        }
      } catch {
        // Fallback to DEFAULT_ROLES already initialized
      }
    }
  }

  async function loadOAuthStatus() {
    try {
      const res = await fetch('/api/admin/oauth/status')
      const data = await res.json().catch(() => null)
      if (res.ok && typeof data?.googleEnabled === 'boolean') {
        googleOAuthEnabled.value = data.googleEnabled
      }
    } catch {
      // ignore
    }
  }

  function startGoogleOAuth() {
    if (typeof window === 'undefined') return
    verifying.value = true
    loginError.value = null
    window.location.href = '/api/admin/oauth/google/start'
  }

  function consumeOAuthRedirectResult(): boolean {
    if (typeof window === 'undefined') return false
    const searchParams = new URLSearchParams(window.location.search)
    const oauthErr = searchParams.get('oauth_error')
    if (oauthErr) {
      loginError.value = oauthErr
      searchParams.delete('oauth_error')
      const cleanQuery = searchParams.toString()
      const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`
      window.history.replaceState({}, '', cleanUrl)
    }
    const hash = window.location.hash || ''
    if (!hash.startsWith('#oauth_token=')) return false
    const token = decodeURIComponent(hash.slice('#oauth_token='.length)).trim()
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`)
    if (!token) return false
    setAdminToken(token)
    setDevRoleId(null)
    setDevCommunities(null)
    isUnlocked.value = true
    return true
  }

  // Opens straight away with a stored session; handles Google OAuth callback hash; on localhost dev bypass, loads roles.
  onMounted(async () => {
    void loadOAuthStatus()
    if (consumeOAuthRedirectResult()) {
      const ok = await fetchMe()
      if (ok) await fetchSamples()
      return
    }
    if (getAdminToken()) {
      const ok = await fetchMe()
      if (ok) await fetchSamples()
      return
    }
    await loadDevBypassRoles()
  })

  if (typeof window !== 'undefined' && !getAdminToken()) {
    void loadOAuthStatus()
    void loadDevBypassRoles()
  }

  return {
    isUnlocked,
    loginMode,
    username,
    password,
    passcode,
    reviewer,
    verifying,
    loginError,
    me,
    devBypassAvailable,
    googleOAuthEnabled,
    startGoogleOAuth,
    devRoles,
    permissions,
    allowedCommunities,
    devRoleId,
    devCommunities,
    canView,
    canEdit,
    permissionOf,
    isCommunityAllowed,
    switchDevRole,
    loginWithDevRole,
    fetchMe,
    loading,
    samples,
    counts,
    feedback,
    actionLoading,
    login,
    logout: (error?: string) => logout(error),
    fetchSamples,
    review,
    updateSample,
    deleteSample,
  }
}
