<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { getAdminToken as getStoredToken, getReviewerName, requestAdminBypass, setAdminToken as setStoredToken, setReviewerName } from '../utils/admin-session'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'sampleReviewed'): void
}>()

export type PendingSample = {
  sample_code: string
  station_name?: string
  latitude: number
  longitude: number
  collection_time: string
  arsenic_ppb: number
  publication_status: string
  contact_name: string | null
  contact_phone: string | null
  sample_nature?: { water_source?: string; water_appearance?: string }
}

export type AdminAlert = {
  id: number
  sample_code: string
  arsenic_ppb: number
  publication_status: string
  created_at: string
}

// Authentication & Passcode State (Option 1)
const isUnlocked = ref(false)
const passcodeInput = ref('')
const reviewerInput = ref(getReviewerName())
const showPasscode = ref(false)
const verifying = ref(false)
const loginError = ref<string | null>(null)
const passcodeInputRef = ref<HTMLInputElement | null>(null)

// Queue State
const loading = ref(false)
const pendingList = ref<PendingSample[]>([])
const alertsList = ref<AdminAlert[]>([])
const actionFeedback = ref<string | null>(null)
const actionLoading = ref<string | null>(null)
const reviewReason = ref('')

async function verifyPasscode() {
  const code = passcodeInput.value.trim()
  if (!code) {
    loginError.value = 'กรุณาระบุรหัสผ่านผู้ดูแลระบบ'
    return
  }

  verifying.value = true
  loginError.value = null
  try {
    const res = await fetch('/api/admin/verify-passcode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode: code }),
    })
    const text = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${res.status})` }
    }
    if (!res.ok || !data.token) {
      loginError.value = data.error || 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
      return
    }

    setStoredToken(data.token)
    setReviewerName(reviewerInput.value)
    isUnlocked.value = true
    passcodeInput.value = ''
    loginError.value = null
    await fetchAdminQueue()
  } catch (err) {
    loginError.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน'
  } finally {
    verifying.value = false
  }
}

function logoutAdmin() {
  setStoredToken(null)
  isUnlocked.value = false
  pendingList.value = []
  alertsList.value = []
  actionFeedback.value = null
  passcodeInput.value = ''
  loginError.value = null
}

async function fetchAdminQueue() {
  loading.value = true
  actionFeedback.value = null
  const token = getStoredToken()

  try {
    const res = await fetch('/api/admin/pending-samples', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res.status === 401) {
      logoutAdmin()
      return
    }

    if (!res.ok) throw new Error('โหลดคิวตรวจสอบไม่สำเร็จ')
    const data = await res.json()
    pendingList.value = data.pending || []
    alertsList.value = data.alerts || []
    isUnlocked.value = true
  } catch (err) {
    actionFeedback.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดคิว'
  } finally {
    loading.value = false
  }
}

async function handleReview(sampleCode: string, decision: 'approve' | 'reject') {
  actionLoading.value = sampleCode
  actionFeedback.value = null
  const token = getStoredToken()

  try {
    const res = await fetch(`/api/admin/samples/${encodeURIComponent(sampleCode)}/review`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        decision,
        reviewer: getReviewerName(),
        reason: reviewReason.value || (decision === 'approve' ? 'แอดมินอนุมัติการเผยแพร่' : 'แอดมินไม่อนุมัติ'),
      }),
    })

    if (res.status === 401) {
      logoutAdmin()
      throw new Error('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'จัดการรายการไม่สำเร็จ')

    actionFeedback.value =
      decision === 'approve'
        ? `อนุมัติรหัส ${sampleCode} เรียบร้อยแล้ว (จะแสดงบนแผนที่สาธารณะทันที)`
        : `ปฏิเสธรหัส ${sampleCode} เรียบร้อยแล้ว`

    reviewReason.value = ''
    await fetchAdminQueue()
    emit('sampleReviewed')
  } catch (err) {
    actionFeedback.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
  } finally {
    actionLoading.value = null
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      actionFeedback.value = null
      loginError.value = null
      const token = getStoredToken() || (await requestAdminBypass() ? getStoredToken() : null)
      if (token) {
        isUnlocked.value = true
        void fetchAdminQueue()
      } else {
        isUnlocked.value = false
        void nextTick(() => passcodeInputRef.value?.focus())
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
    @mousedown.self="emit('close')"
  >
    <section
      role="dialog"
      aria-modal="true"
      class="wv-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
    >
      <!-- Header -->
      <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-4">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-[#FF453A]/15 dark:text-[#FF453A] dark:border-transparent">
            <ShieldAlert class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              คิวตรวจสอบผลตรวจเกิน 50 ppb สำหรับผู้ดูแลระบบ (Admin)
            </h3>
            <p class="text-xs text-slate-500 dark:text-[#98A2A8]">
              ระบบควบคุมความปลอดภัย (R10): ตัวอย่างที่มีค่าสารหนู &gt; 50 ppb จะไม่แสดงสาธารณะจนกว่าแอดมินจะยืนยัน
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Logout Button (When Session is Active) -->
          <button
            v-if="isUnlocked"
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8] dark:hover:border-[#FF453A]/40 dark:hover:text-[#FF453A] transition"
            title="ออกจากระบบแอดมิน (ล็อกหน้าจอ)"
            @click="logoutAdmin"
          >
            <Lock class="h-3.5 w-3.5" />
            <span>ล็อก/ออก</span>
          </button>

          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white transition"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </header>

      <!-- VIEW 1: Admin Passcode Login Gate (When locked) -->
      <div v-if="!isUnlocked" class="mx-auto max-w-md py-10 px-4 text-center space-y-6">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-[#FF453A]/15 dark:text-[#FF453A] dark:ring-[#FF453A]/30">
          <KeyRound class="h-8 w-8" />
        </div>

        <div>
          <h4 class="text-lg font-bold text-slate-900 dark:text-white">เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)</h4>
          <p class="mt-1 text-xs text-slate-500 dark:text-[#98A2A8]">
            โปรดกรอกรหัสผ่านผู้ดูแลระบบ (Passcode) เพื่อปลดล็อกคิวตรวจสอบผลตรวจเกิน 50 ppb
          </p>
        </div>

        <form @submit.prevent="verifyPasscode" class="space-y-4">
          <div class="text-left">
            <label class="block text-xs font-semibold text-slate-700 dark:text-[#98A2A8] mb-1.5">
              รหัสผ่านผู้ดูแลระบบ (Passcode) <span class="text-rose-600 dark:text-[#FF453A]">*</span>
            </label>
            <div class="relative">
              <input
                ref="passcodeInputRef"
                v-model="passcodeInput"
                :type="showPasscode ? 'text' : 'password'"
                placeholder="ระบุรหัสผ่านแอดมิน..."
                class="wv-input pr-10 text-sm font-mono tracking-wider border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
                :disabled="verifying"
                autocomplete="current-password"
              >
              <button
                type="button"
                class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:text-white"
                @click="showPasscode = !showPasscode"
                :title="showPasscode ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
              >
                <EyeOff v-if="showPasscode" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
            <p v-if="loginError" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-[#FF453A]">
              <AlertTriangle class="h-4 w-4 shrink-0" />
              <span>{{ loginError }}</span>
            </p>
          </div>

          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200" for="review-reviewer">ชื่อผู้ตรวจ (บันทึกพร้อมการอนุมัติ)</label>
          <input
            id="review-reviewer"
            v-model="reviewerInput"
            type="text"
            maxlength="80"
            autocomplete="name"
            placeholder="เช่น ชื่อ-นามสกุลของผู้ตรวจ"
            class="wv-input border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            :disabled="verifying"
          >
          <button
            type="submit"
            class="wv-btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white dark:bg-[#00E5FF] dark:hover:bg-[#00c8e0] dark:text-black rounded-xl transition"
            :disabled="verifying || !passcodeInput.trim()"
          >
            <RefreshCw v-if="verifying" class="h-4 w-4 animate-spin" />
            <ShieldCheck v-else class="h-4 w-4" />
            <span>{{ verifying ? 'กำลังตรวจสอบรหัสผ่าน…' : 'เข้าสู่ระบบ (ปลดล็อก)' }}</span>
          </button>
        </form>
      </div>

      <!-- VIEW 2: Unlocked Review Queue Dashboard -->
      <div v-else>
        <!-- Feedback / Status -->
        <div v-if="actionFeedback" class="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800 dark:border-[#00E5FF]/40 dark:bg-[#00E5FF]/10 dark:text-[#00E5FF]">
          {{ actionFeedback }}
        </div>

        <!-- Action Refresh Bar -->
        <div class="mt-4 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-[#FF453A] dark:text-black px-2.5 py-0.5 font-bold">
              {{ pendingList.length }} รายการรอตรวจสอบ
            </span>
            <span class="text-slate-500 dark:text-[#98A2A8]">
              (แจ้งเตือนทั้งหมด {{ alertsList.length }} ครั้ง)
            </span>
          </div>
          <button
            type="button"
            class="wv-btn-secondary text-xs"
            :disabled="loading"
            @click="fetchAdminQueue"
          >
            <RefreshCw class="h-3.5 w-3.5 text-sky-600 dark:text-[#00E5FF]" :class="loading ? 'animate-spin' : ''" />
            <span>{{ loading ? 'กำลังโหลด…' : 'รีเฟรชคิว' }}</span>
          </button>
        </div>

        <!-- Pending List -->
        <div class="mt-4 space-y-3">
          <div v-if="loading && pendingList.length === 0" class="py-12 text-center text-xs text-slate-500 dark:text-[#98A2A8]">
            กำลังโหลดรายการจากฐานข้อมูล…
          </div>

          <div v-else-if="pendingList.length === 0" class="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-[#1C3A24] dark:bg-[#142318] p-8 text-center text-xs text-emerald-800 dark:text-[#32D74B]">
            <CheckCircle2 class="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-[#32D74B]" />
            <span class="font-bold">ไม่มีรายการรอตรวจสอบในขณะนี้</span>
            <p class="mt-1 text-slate-500 dark:text-[#98A2A8]">ผลตรวจใหม่ที่มีค่า &gt; 50 ppb จะปรากฏในคิวนี้ทันที</p>
          </div>

          <div
            v-for="item in pendingList"
            v-else
            :key="item.sample_code"
            class="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/20 dark:border-[#3A1C1C] dark:bg-[#1A1214] p-4 text-xs"
          >
            <!-- Sample Code & High Arsenic Badge -->
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-2">
              <div>
                <span class="font-mono text-sm font-bold text-slate-900 dark:text-white">{{ item.sample_code }}</span>
                <span class="ml-2 font-mono text-xs text-slate-500 dark:text-[#98A2A8]">
                  {{ item.collection_time ? new Date(item.collection_time).toLocaleString('th-TH') : '-' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-rose-600 text-white dark:bg-[#FF453A] dark:text-black px-2.5 py-0.5 font-mono text-sm font-black">
                  {{ item.arsenic_ppb }} ppb
                </span>
                <span class="rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-[#3A1C1C] dark:text-[#FF453A] dark:border-transparent px-2 py-0.5 font-bold">
                  เกิน 50 ppb (รอตรวจ)
                </span>
              </div>
            </div>

            <!-- Internal Contact Information (Confidential) -->
            <div class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-transparent dark:bg-[#251B1D] sm:grid-cols-2">
              <div class="flex items-center gap-2">
                <User class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
                <div>
                  <span class="block text-[10px] text-slate-500 dark:text-[#98A2A8]">ชื่อผู้แจ้ง (ข้อมูลภายใน):</span>
                  <span class="font-bold text-slate-900 dark:text-white">{{ item.contact_name || '—' }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Phone class="h-4 w-4 text-emerald-600 dark:text-[#32D74B]" />
                <div>
                  <span class="block text-[10px] text-slate-500 dark:text-[#98A2A8]">เบอร์โทรศัพท์ (ข้อมูลภายใน):</span>
                  <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.contact_phone || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Location & Water Source Info -->
            <div class="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-[#98A2A8]">
              <div>
                <span>แหล่งน้ำ: </span>
                <span class="font-semibold text-slate-800 dark:text-white">{{ item.sample_nature?.water_source || 'ไม่ระบุ' }}</span>
                <span v-if="item.station_name" class="ml-2">({{ item.station_name }})</span>
              </div>
              <div class="font-mono">
                พิกัด: {{ item.latitude.toFixed(4) }}, {{ item.longitude.toFixed(4) }}
              </div>
            </div>

            <!-- Review Actions -->
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-[#2C2C2E] pt-3">
              <div class="flex-1">
                <input
                  v-model="reviewReason"
                  type="text"
                  placeholder="เหตุผลหรือหมายเหตุการตรวจ (ไม่บังคับ)..."
                  class="wv-input text-xs border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white dark:placeholder:text-[#64748B]"
                  :disabled="actionLoading === item.sample_code"
                >
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 dark:border-[#3A1C1C] dark:bg-[#141416] dark:text-[#FF453A] dark:hover:bg-[#FF453A] dark:hover:text-black px-3 py-1.5 font-bold transition"
                  :disabled="actionLoading === item.sample_code"
                  @click="handleReview(item.sample_code, 'reject')"
                >
                  <XCircle class="mr-1 inline h-3.5 w-3.5" />
                  <span>ปฏิเสธ</span>
                </button>

                <button
                  type="button"
                  class="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold dark:bg-[#32D74B] dark:hover:bg-[#28b83e] dark:text-black px-3.5 py-1.5 transition shadow-sm"
                  :disabled="actionLoading === item.sample_code"
                  @click="handleReview(item.sample_code, 'approve')"
                >
                  <CheckCircle2 class="mr-1 inline h-3.5 w-3.5" />
                  <span>{{ actionLoading === item.sample_code ? 'กำลังบันทึก…' : 'อนุมัติเผยแพร่' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts History Section -->
        <div v-if="alertsList.length > 0" class="mt-6 border-t border-slate-200 dark:border-[#2C2C2E] pt-4">
          <h4 class="mb-2 text-xs font-bold text-slate-500 dark:text-[#98A2A8]">
            ประวัติการแจ้งเตือนแอดมินอัตโนมัติ (kok_admin_alerts)
          </h4>
          <div class="max-h-40 space-y-1.5 overflow-y-auto font-mono text-[11px]">
            <div
              v-for="alert in alertsList.slice(0, 5)"
              :key="alert.id"
              class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 dark:border-transparent dark:bg-[#141416] dark:text-[#98A2A8]"
            >
              <span>{{ alert.sample_code }} ({{ alert.arsenic_ppb }} ppb)</span>
              <span class="text-[10px] text-slate-500">{{ new Date(alert.created_at).toLocaleString('th-TH') }}</span>
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold"
                :class="alert.publication_status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-[#32D74B]/20 dark:text-[#32D74B]' : 'bg-rose-100 text-rose-800 dark:bg-[#FF453A]/20 dark:text-[#FF453A]'"
              >
                {{ alert.publication_status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
