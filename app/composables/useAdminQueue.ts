import { onMounted, ref } from 'vue'
import { getAdminToken, getReviewerName, requestAdminBypass, setAdminToken, setReviewerName } from '../utils/admin-session'
import { emptyCounts, type AdminCounts, type AdminSample, type Decision } from '../utils/admin-types'

type Feedback = { type: 'success' | 'error'; message: string }

const defaultReason: Record<Decision, string> = { approve: 'แอดมินอนุมัติการเผยแพร่ข้อมูล', reject: 'แอดมินไม่อนุมัติ' }
const doneMessage = (decision: Decision, code: string) => decision === 'approve'
  ? `อนุมัติรหัส ${code} เรียบร้อยแล้ว (แสดงผลบนแผนที่สาธารณะทันที)`
  : `ปฏิเสธรหัส ${code} เรียบร้อยแล้ว (จะไม่แสดงบนแผนที่สาธารณะ)`

// Admin session + review queue: login, loading samples, approving or rejecting them.
export function useAdminQueue() {
  const isUnlocked = ref(false)
  const passcode = ref('')
  const reviewer = ref(getReviewerName())
  const verifying = ref(false)
  const loginError = ref<string | null>(null)

  const loading = ref(false)
  const samples = ref<AdminSample[]>([])
  const counts = ref<AdminCounts>(emptyCounts())
  const feedback = ref<Feedback | null>(null)
  const actionLoading = ref<string | null>(null)

  function logout(error: string | null = null) {
    setAdminToken(null)
    isUnlocked.value = false
    samples.value = []
    passcode.value = ''
    loginError.value = error
    feedback.value = null
  }

  // fetch with the admin token; an expired or invalid session sends the user back to the login form.
  async function adminFetch(url: string, init: RequestInit = {}) {
    const token = getAdminToken()
    const response = await fetch(url, {
      ...init,
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (response.status === 401) {
      logout('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
      throw new Error('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
    }
    return response
  }

  async function fetchSamples() {
    loading.value = true
    feedback.value = null
    try {
      const response = await adminFetch('/api/admin/samples')
      if (!response.ok) throw new Error('โหลดข้อมูล Data Table ไม่สำเร็จ')
      const data = await response.json()
      samples.value = data.samples || []
      if (data.counts) counts.value = data.counts
      isUnlocked.value = true
    } catch (error) {
      if (isUnlocked.value) feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล' }
    } finally {
      loading.value = false
    }
  }

  async function login() {
    const code = passcode.value.trim()
    if (!code) {
      loginError.value = 'กรุณาระบุรหัสผ่านผู้ดูแลระบบ'
      return
    }
    verifying.value = true
    loginError.value = null
    try {
      const response = await fetch('/api/admin/verify-passcode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      })
      const data = await response.json().catch(() => ({ error: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})` }))
      if (!response.ok || !data.token) {
        loginError.value = data.error || 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
        return
      }
      setAdminToken(data.token)
      setReviewerName(reviewer.value)
      isUnlocked.value = true
      passcode.value = ''
      await fetchSamples()
    } catch (error) {
      loginError.value = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน'
    } finally {
      verifying.value = false
    }
  }

  // Returns true when the decision was saved, so the caller can close its dialog.
  async function review(sampleCode: string, decision: Decision, reason?: string) {
    actionLoading.value = sampleCode
    feedback.value = null
    try {
      const response = await adminFetch(`/api/admin/samples/${encodeURIComponent(sampleCode)}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewer: getReviewerName(), reason: reason || defaultReason[decision] }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'จัดการรายการไม่สำเร็จ')
      await fetchSamples()
      feedback.value = { type: 'success', message: doneMessage(decision, sampleCode) }
      return true
    } catch (error) {
      feedback.value = { type: 'error', message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดำเนินการ' }
      return false
    } finally {
      actionLoading.value = null
    }
  }

  // Opens straight away with a stored session, or with the local-development bypass.
  onMounted(async () => {
    if (getAdminToken() || await requestAdminBypass()) {
      isUnlocked.value = true
      void fetchSamples()
    }
  })

  return { isUnlocked, passcode, reviewer, verifying, loginError, loading, samples, counts, feedback, actionLoading, login, logout: () => logout(), fetchSamples, review }
}
