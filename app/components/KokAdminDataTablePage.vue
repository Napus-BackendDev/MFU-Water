<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Moon,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  User,
  X,
  XCircle,
} from 'lucide-vue-next'
import { contractData } from '../utils/kok-contract'

const emit = defineEmits<{
  (e: 'backToMap'): void
}>()

export type AdminSample = {
  sample_code: string
  station_name?: string
  latitude: number
  longitude: number
  collection_time: string
  created_at?: string
  gps_accuracy_meters: number | null
  arsenic_ppb: number
  measurements?: { arsenic?: { unit?: string; value?: number; status?: string } }
  sample_nature?: { water_source?: string; water_appearance?: string }
  publication_status: 'pending_review' | 'approved' | 'auto_published' | 'rejected'
  reviewed_at?: string | null
  review_reason?: string | null
  private_photo_paths?: string[]
  contact_name: string | null
  contact_phone: string | null
}

export type AdminCounts = {
  total: number
  pending: number
  approved: number
  autoPublished: number
  rejected: number
}

// Auth State
const isUnlocked = ref(false)
const passcodeInput = ref('')
const showPasscode = ref(false)
const verifying = ref(false)
const loginError = ref<string | null>(null)
const passcodeInputRef = ref<HTMLInputElement | null>(null)

// Data State
const loading = ref(false)
const samplesList = ref<AdminSample[]>([])
const counts = ref<AdminCounts>({
  total: 0,
  pending: 0,
  approved: 0,
  autoPublished: 0,
  rejected: 0,
})

// Filter & Table State
const activeTab = ref<'all' | 'pending_review' | 'approved' | 'auto_published' | 'rejected'>('all')
const searchQuery = ref('')
const arsenicFilter = ref<'all' | 'safe' | 'watch' | 'critical'>('all')
const currentPage = ref(1)
const pageSize = ref(10)
const copiedCode = ref<string | null>(null)

// Action & Modal State
const actionLoading = ref<string | null>(null)
const actionFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const selectedSample = ref<AdminSample | null>(null)
const reviewReasonInput = ref('')
const reasonPromptModal = ref<{
  sample: AdminSample
  decision: 'approve' | 'reject'
} | null>(null)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem('kok_admin_token')
  } catch {
    return null
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      sessionStorage.setItem('kok_admin_token', token)
    } else {
      sessionStorage.removeItem('kok_admin_token')
    }
  } catch {}
}

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
    const data = await res.json()
    if (!res.ok || !data.token) {
      loginError.value = data.error || 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
      return
    }

    setStoredToken(data.token)
    isUnlocked.value = true
    passcodeInput.value = ''
    loginError.value = null
    await fetchSamples()
  } catch (err) {
    loginError.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน'
  } finally {
    verifying.value = false
  }
}

function logoutAdmin() {
  setStoredToken(null)
  isUnlocked.value = false
  samplesList.value = []
  passcodeInput.value = ''
  loginError.value = null
  actionFeedback.value = null
  void nextTick(() => passcodeInputRef.value?.focus())
}

async function fetchSamples() {
  loading.value = true
  actionFeedback.value = null
  const token = getStoredToken()

  try {
    const res = await fetch('/api/admin/samples', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (res.status === 401) {
      logoutAdmin()
      return
    }

    if (!res.ok) throw new Error('โหลดข้อมูล Data Table ไม่สำเร็จ')
    const data = await res.json()
    samplesList.value = data.samples || []
    if (data.counts) {
      counts.value = data.counts
    }
    isUnlocked.value = true
  } catch (err) {
    actionFeedback.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
    }
  } finally {
    loading.value = false
  }
}

async function handleReviewAction(sampleCode: string, decision: 'approve' | 'reject', reason?: string) {
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
        reason: reason || (decision === 'approve' ? 'แอดมินอนุมัติการเผยแพร่ข้อมูล' : 'แอดมินไม่อนุมัติ'),
      }),
    })

    if (res.status === 401) {
      logoutAdmin()
      throw new Error('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'จัดการรายการไม่สำเร็จ')

    actionFeedback.value = {
      type: 'success',
      message:
        decision === 'approve'
          ? `อนุมัติรหัส ${sampleCode} เรียบร้อยแล้ว (แสดงผลบนแผนที่สาธารณะทันที)`
          : `ปฏิเสธรหัส ${sampleCode} เรียบร้อยแล้ว (จะไม่แสดงบนแผนที่สาธารณะ)`,
    }

    reasonPromptModal.value = null
    reviewReasonInput.value = ''
    await fetchSamples()
  } catch (err) {
    actionFeedback.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดำเนินการ',
    }
  } finally {
    actionLoading.value = null
  }
}

function promptDecision(sample: AdminSample, decision: 'approve' | 'reject') {
  reasonPromptModal.value = { sample, decision }
  reviewReasonInput.value = decision === 'approve' ? 'ตรวจสอบแล้ว ข้อมูลถูกต้องและสอดคล้องกับพื้นที่' : 'ข้อมูลไม่สอดคล้อง หรือพิกัดไม่ชัดเจน'
}

function copySampleCode(code: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(code)
    copiedCode.value = code
    setTimeout(() => {
      if (copiedCode.value === code) copiedCode.value = null
    }, 2000)
  }
}

const filteredSamples = computed(() => {
  return samplesList.value.filter((item) => {
    // 1. Tab Status Filter
    if (activeTab.value !== 'all' && item.publication_status !== activeTab.value) {
      return false
    }

    // 2. Arsenic Severity Filter
    if (arsenicFilter.value === 'safe' && item.arsenic_ppb > 10) return false
    if (arsenicFilter.value === 'watch' && (item.arsenic_ppb <= 10 || item.arsenic_ppb > 50)) return false
    if (arsenicFilter.value === 'critical' && item.arsenic_ppb <= 50) return false

    // 3. Search Query Filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchCode = item.sample_code.toLowerCase().includes(q)
      const matchName = (item.contact_name || '').toLowerCase().includes(q)
      const matchPhone = (item.contact_phone || '').toLowerCase().includes(q)
      const matchStation = (item.station_name || '').toLowerCase().includes(q)
      const matchPpb = String(item.arsenic_ppb).includes(q)
      const matchSource = (item.sample_nature?.water_source || '').toLowerCase().includes(q)
      return matchCode || matchName || matchPhone || matchStation || matchPpb || matchSource
    }

    return true
  })
})

const totalFiltered = computed(() => filteredSamples.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))

const paginatedSamples = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSamples.value.slice(start, start + pageSize.value)
})

watch([activeTab, arsenicFilter, searchQuery], () => {
  currentPage.value = 1
})

function formatThaiDate(iso: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function getArsenicMeta(ppb: number) {
  const match = contractData.levels.find((l) => l.ppb === ppb)
  if (match) return match
  if (ppb > 50) return { color: '#7A2E1E', hex: '#7A2E1E', action: 'เกินเกณฑ์วิกฤติ (>50 ppb)' }
  if (ppb > 10) return { color: '#E5A93C', hex: '#E5A93C', action: 'เกินมาตรฐานผิวดิน (>10 ppb)' }
  return { color: '#FFFFFF', hex: '#FFFFFF', action: 'เกณฑ์ปกติ (<=10 ppb)' }
}

function exportCsv() {
  if (!filteredSamples.value.length) return
  const headers = [
    'รหัสตัวอย่าง',
    'วันเวลาบันทึก',
    'ค่าสารหนู (ppb)',
    'สถานะค่าสารหนู',
    'ละติจูด',
    'ลองจิจูด',
    'แหล่งน้ำ',
    'ลักษณะน้ำ',
    'ชื่อผู้แจ้ง',
    'เบอร์โทรศัพท์',
    'สถานะเผยแพร่',
    'หมายเหตุแอดมิน',
  ]
  const rows = filteredSamples.value.map((s) => [
    `"${s.sample_code}"`,
    `"${s.collection_time || s.created_at}"`,
    s.arsenic_ppb,
    `"${s.arsenic_ppb > 50 ? 'วิกฤติ (>50 ppb)' : s.arsenic_ppb > 10 ? 'เฝ้าระวัง' : 'ปกติ'}"`,
    s.latitude,
    s.longitude,
    `"${s.sample_nature?.water_source || 'แม่น้ำกก'}"`,
    `"${s.sample_nature?.water_appearance || '-'}"`,
    `"${s.contact_name || '-'}"`,
    `"${s.contact_phone || '-'}"`,
    `"${s.publication_status}"`,
    `"${s.review_reason || '-'}"`,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kok-water-admin-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  const token = getStoredToken()
  if (token) {
    isUnlocked.value = true
    void fetchSamples()
  } else {
    isUnlocked.value = false
    void nextTick(() => passcodeInputRef.value?.focus())
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col">
    <!-- Top Admin Navigation Bar -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <!-- Brand & Back -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] dark:hover:text-white transition"
            @click="emit('backToMap')"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>กลับสู่แผนที่สาธารณะ</span>
          </button>

          <div class="h-5 w-px bg-slate-200 dark:bg-[#2C2C2E] hidden sm:block" />

          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
              <ShieldAlert class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  ระบบตรวจสอบและจัดการข้อมูลน้ำ (Admin Data Table)
                </h1>
                <span
                  v-if="isUnlocked"
                  class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hidden md:inline-flex items-center gap-1"
                >
                  <ShieldCheck class="h-3 w-3" /> แอดมินเข้าสู่ระบบแล้ว
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
                มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก
              </p>
            </div>
          </div>
        </div>

        <!-- Controls Right -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="สลับโหมดสี"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525] transition"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" class="h-4 w-4 text-amber-400" />
            <Moon v-else class="h-4 w-4 text-slate-600" />
          </button>

          <template v-if="isUnlocked">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] transition"
              :disabled="loading"
              @click="fetchSamples"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
              <span class="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] transition"
              @click="exportCsv"
            >
              <Download class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ส่งออก CSV</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition"
              @click="logoutAdmin"
            >
              <LogOut class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <!-- 1. LOGIN PASSCODE PORTAL (When not unlocked) -->
      <div v-if="!isUnlocked" class="flex min-h-[70vh] items-center justify-center">
        <div class="wv-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
          <div class="text-center space-y-3">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 shadow-inner">
              <KeyRound class="h-7 w-7" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)</h2>
              <p class="text-xs text-slate-500 dark:text-[#98A2A8] mt-1">
                โปรดกรอกรหัสผ่านผู้ดูแลระบบ (Passcode) เพื่อปลดล็อกเข้าสู่หน้า Data Table ตรวจสอบผลตรวจเกิน 50 ppb และฐานข้อมูลตัวอย่างน้ำ
              </p>
            </div>
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="verifyPasscode">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                รหัสผ่านผู้ดูแลระบบ (Passcode) <span class="text-rose-600">*</span>
              </label>
              <div class="relative mt-1.5">
                <input
                  ref="passcodeInputRef"
                  v-model="passcodeInput"
                  :type="showPasscode ? 'text' : 'password'"
                  placeholder="ระบุรหัสผ่านแอดมิน..."
                  class="wv-input pr-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
                  :disabled="verifying"
                >
                <button
                  type="button"
                  aria-label="เปิด/ปิดการแสดงรหัสผ่าน"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
                  @click="showPasscode = !showPasscode"
                >
                  <Eye v-if="!showPasscode" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <p v-if="loginError" role="alert" class="wv-alert-box text-xs font-medium">
              {{ loginError }}
            </p>

            <button
              type="submit"
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition"
              :disabled="verifying || !passcodeInput.trim()"
            >
              <Lock class="h-4 w-4" />
              <span>{{ verifying ? 'กำลังตรวจสอบรหัสผ่าน…' : 'เข้าสู่ระบบ (ปลดล็อก Data Table)' }}</span>
            </button>

            <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              💡 <strong>หมายเหตุความปลอดภัย:</strong> รหัสผ่านเริ่มต้นคือ <code class="rounded bg-amber-100 px-1 py-0.5 font-mono text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">mfu2026admin</code> หรือแก้ไขได้ผ่าน <code class="font-mono">ADMIN_PASSCODE</code> ใน .env.local
            </div>

            <div class="pt-2 text-center">
              <button
                type="button"
                class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white underline"
                @click="emit('backToMap')"
              >
                ← ยกเลิกและกลับสู่หน้าแผนที่สาธารณะ
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. DATA TABLE DASHBOARD (When unlocked) -->
      <div v-else class="space-y-5">
        <!-- Toast Feedback -->
        <div
          v-if="actionFeedback"
          class="rounded-xl p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-sm transition"
          :class="actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'"
        >
          <div class="flex items-center gap-2">
            <CheckCircle2 v-if="actionFeedback.type === 'success'" class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <AlertTriangle v-else class="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{{ actionFeedback.message }}</span>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="actionFeedback = null">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- 4 Metric Cards -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] shadow-xs">
            <span class="text-xs font-semibold text-slate-500 dark:text-[#98A2A8]">ตัวอย่างน้ำทั้งหมด</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-slate-900 dark:text-white">{{ counts.total }}</span>
              <span class="text-xs text-slate-400">รายการ</span>
            </div>
          </div>

          <div
            class="rounded-2xl border p-4 shadow-xs transition"
            :class="counts.pending > 0 ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E]'"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">รอตรวจสอบ (>50 ppb)</span>
              <span v-if="counts.pending > 0" class="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{{ counts.pending }}</span>
              <span class="text-xs text-amber-600/80">รายการ</span>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] shadow-xs">
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">อนุมัติแล้ว</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ counts.approved }}</span>
              <span class="text-xs text-slate-400">รายการ</span>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] shadow-xs">
            <span class="text-xs font-semibold text-sky-600 dark:text-sky-400">เผยแพร่อัตโนมัติ (<=50 ppb)</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">{{ counts.autoPublished }}</span>
              <span class="text-xs text-slate-400">รายการ</span>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] shadow-xs space-y-3">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <!-- Tabs -->
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                :class="activeTab === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30]'"
                @click="activeTab = 'all'"
              >
                ทั้งหมด ({{ counts.total }})
              </button>
              <button
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5"
                :class="activeTab === 'pending_review' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60'"
                @click="activeTab = 'pending_review'"
              >
                <span>⏳ รอตรวจสอบ</span>
                <span class="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                  {{ counts.pending }}
                </span>
              </button>
              <button
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                :class="activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30]'"
                @click="activeTab = 'approved'"
              >
                ✅ อนุมัติแล้ว ({{ counts.approved }})
              </button>
              <button
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                :class="activeTab === 'auto_published' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30]'"
                @click="activeTab = 'auto_published'"
              >
                🟢 เผยแพร่อัตโนมัติ ({{ counts.autoPublished }})
              </button>
              <button
                type="button"
                class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                :class="activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30]'"
                @click="activeTab = 'rejected'"
              >
                ❌ ปฏิเสธ ({{ counts.rejected }})
              </button>
            </div>

            <!-- Severity Filter -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-500 dark:text-[#98A2A8]">ระดับสารหนู:</span>
              <select
                v-model="arsenicFilter"
                class="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white focus:outline-none"
              >
                <option value="all">ทุกระดับ</option>
                <option value="safe">เกณฑ์ปกติ (<=10 ppb)</option>
                <option value="watch">เฝ้าระวัง (10-50 ppb)</option>
                <option value="critical">วิกฤติ (>50 ppb)</option>
              </select>
            </div>
          </div>

          <!-- Search Input Bar -->
          <div class="relative">
            <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหารหัสตัวอย่าง, ชื่อผู้ส่ง, เบอร์โทรศัพท์, พิกัด, หรือค่า ppb..."
              class="wv-input pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            >
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              @click="searchQuery = ''"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- The DATA TABLE -->
        <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-[#2C2C2E] dark:bg-[#141416]/80 text-slate-600 dark:text-[#98A2A8]">
                <tr>
                  <th scope="col" class="px-4 py-3.5 font-semibold">รหัสตัวอย่าง</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold">วัน-เวลาเก็บตัวอย่าง</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold">ระดับสารหนู</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold">พิกัด & แหล่งน้ำ</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold">ผู้แจ้ง & ข้อมูลติดต่อ</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold">สถานะเผยแพร่</th>
                  <th scope="col" class="px-4 py-3.5 font-semibold text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]/60 text-slate-800 dark:text-slate-200">
                <tr v-if="loading">
                  <td colspan="7" class="py-12 text-center text-slate-500">
                    <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-sky-600" />
                    กำลังโหลดข้อมูล Data Table…
                  </td>
                </tr>

                <tr v-else-if="!paginatedSamples.length">
                  <td colspan="7" class="py-12 text-center text-slate-500">
                    ไม่พบข้อมูลตัวอย่างน้ำตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>

                <tr
                  v-for="item in paginatedSamples"
                  :key="item.sample_code"
                  class="hover:bg-slate-50/80 dark:hover:bg-[#252525]/60 transition"
                >
                  <!-- 1. Sample Code -->
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                    <div class="flex items-center gap-1.5">
                      <span>{{ item.sample_code }}</span>
                      <button
                        type="button"
                        aria-label="คัดลอกรหัส"
                        class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        @click="copySampleCode(item.sample_code)"
                      >
                        <Check v-if="copiedCode === item.sample_code" class="h-3.5 w-3.5 text-emerald-600" />
                        <Copy v-else class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  <!-- 2. Date Time -->
                  <td class="px-4 py-3 text-slate-600 dark:text-[#98A2A8]">
                    {{ formatThaiDate(item.collection_time || item.created_at || '') }}
                  </td>

                  <!-- 3. Arsenic Level -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="h-3 w-3 rounded-full border shrink-0"
                        :style="{ backgroundColor: getArsenicMeta(item.arsenic_ppb).hex, borderColor: 'rgba(0,0,0,0.2)' }"
                      />
                      <span class="font-mono font-bold text-sm" :class="item.arsenic_ppb > 50 ? 'text-rose-600 dark:text-[#FF453A]' : item.arsenic_ppb > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'">
                        {{ item.arsenic_ppb }} ppb
                      </span>
                      <span
                        v-if="item.arsenic_ppb > 50"
                        class="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      >
                        เกิน 50
                      </span>
                    </div>
                  </td>

                  <!-- 4. Location & Source -->
                  <td class="px-4 py-3">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <MapPin class="h-3 w-3 text-slate-400" />
                        <span>{{ item.latitude.toFixed(4) }}, {{ item.longitude.toFixed(4) }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                        <span>{{ item.sample_nature?.water_source || 'แม่น้ำกก' }}</span>
                        <span
                          v-if="item.private_photo_paths?.length"
                          class="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.2 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        >
                          <Camera class="h-2.5 w-2.5" /> {{ item.private_photo_paths.length }} ภาพ
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- 5. Citizen Contact -->
                  <td class="px-4 py-3">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                        <User class="h-3 w-3 text-slate-400" />
                        <span>{{ item.contact_name || 'ไม่ระบุชื่อ' }}</span>
                      </div>
                      <div v-if="item.contact_phone" class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                        <Phone class="h-3 w-3 text-slate-400" />
                        <a :href="`tel:${item.contact_phone}`" class="hover:underline font-mono text-sky-600 dark:text-sky-400">
                          {{ item.contact_phone }}
                        </a>
                      </div>
                    </div>
                  </td>

                  <!-- 6. Status -->
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      :class="{
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800': item.publication_status === 'pending_review',
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800': item.publication_status === 'approved',
                        'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800': item.publication_status === 'auto_published',
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400': item.publication_status === 'rejected',
                      }"
                    >
                      <span v-if="item.publication_status === 'pending_review'">⏳ รอตรวจสอบ</span>
                      <span v-else-if="item.publication_status === 'approved'">✅ อนุมัติแล้ว</span>
                      <span v-else-if="item.publication_status === 'auto_published'">🟢 เผยแพร่อัตโนมัติ</span>
                      <span v-else-if="item.publication_status === 'rejected'">❌ ปฏิเสธ</span>
                    </span>
                  </td>

                  <!-- 7. Actions -->
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- Quick Approve/Reject for pending -->
                      <template v-if="item.publication_status === 'pending_review'">
                        <button
                          type="button"
                          class="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          :disabled="actionLoading === item.sample_code"
                          @click="promptDecision(item, 'approve')"
                        >
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          class="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                          :disabled="actionLoading === item.sample_code"
                          @click="promptDecision(item, 'reject')"
                        >
                          ปฏิเสธ
                        </button>
                      </template>

                      <!-- Detail Button -->
                      <button
                        type="button"
                        aria-label="ดูรายละเอียด"
                        class="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30] transition"
                        @click="selectedSample = item"
                      >
                        <Eye class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-[#2C2C2E] dark:bg-[#141416]/50 text-xs">
            <div class="text-slate-500 dark:text-[#98A2A8]">
              แสดง <span class="font-bold text-slate-800 dark:text-white">{{ totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span> ถึง
              <span class="font-bold text-slate-800 dark:text-white">{{ Math.min(currentPage * pageSize, totalFiltered) }}</span> จากทั้งหมด
              <span class="font-bold text-slate-800 dark:text-white">{{ totalFiltered }}</span> รายการ
            </div>

            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500 dark:text-[#98A2A8]">แถวต่อหน้า:</span>
                <select
                  v-model="pageSize"
                  class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
                  @change="currentPage = 1"
                >
                  <option :value="10">10</option>
                  <option :value="25">25</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                </select>
              </div>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 p-1.5 text-slate-600 disabled:opacity-30 dark:border-[#2C2C2E] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252525]"
                  :disabled="currentPage <= 1"
                  @click="currentPage--"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>
                <span class="px-2 font-mono font-medium">
                  {{ currentPage }} / {{ totalPages }}
                </span>
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 p-1.5 text-slate-600 disabled:opacity-30 dark:border-[#2C2C2E] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252525]"
                  :disabled="currentPage >= totalPages"
                  @click="currentPage++"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal 1: Approve / Reject with Reason Prompt -->
    <div
      v-if="reasonPromptModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @mousedown.self="reasonPromptModal = null"
    >
      <div class="wv-card w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white space-y-4">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl"
              :class="reasonPromptModal.decision === 'approve' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'"
            >
              <CheckCircle2 v-if="reasonPromptModal.decision === 'approve'" class="h-5 w-5" />
              <XCircle v-else class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold">
                {{ reasonPromptModal.decision === 'approve' ? 'ยืนยันอนุมัติผลตรวจ' : 'ยืนยันปฏิเสธผลตรวจ' }}
              </h3>
              <p class="text-[11px] text-slate-500 font-mono">
                รหัส: {{ reasonPromptModal.sample.sample_code }} (ค่าสารหนู {{ reasonPromptModal.sample.arsenic_ppb }} ppb)
              </p>
            </div>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="reasonPromptModal = null">
            <X class="h-4 w-4" />
          </button>
        </header>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            หมายเหตุหรือเหตุผลประกอบการพิจารณา (จะบันทึกใน Audit Log)
          </label>
          <textarea
            v-model="reviewReasonInput"
            rows="3"
            class="wv-input mt-1.5 border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            placeholder="ระบุเหตุผล..."
          />
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8]">
          <span v-if="reasonPromptModal.decision === 'approve'">
            💡 เมื่ออนุมัติแล้ว ระบบจะเปลี่ยนสถานะเป็น <strong class="text-emerald-600">approved</strong> และนำผลตรวจนี้แสดงบนแผนที่สาธารณะทันที
          </span>
          <span v-else>
            ⚠️ เมื่อปฏิเสธ รายการนี้จะไม่ถูกนำไปแสดงบนแผนที่สาธารณะ แต่จะคงบันทึกไว้ในฐานข้อมูลสำหรับการตรวจสอบภายใน
          </span>
        </div>

        <footer class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#2C2C2E]">
          <button
            type="button"
            class="wv-btn-secondary"
            @click="reasonPromptModal = null"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition"
            :class="reasonPromptModal.decision === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'"
            :disabled="actionLoading === reasonPromptModal.sample.sample_code"
            @click="handleReviewAction(reasonPromptModal.sample.sample_code, reasonPromptModal.decision, reviewReasonInput)"
          >
            {{ actionLoading === reasonPromptModal.sample.sample_code ? 'กำลังบันทึก…' : (reasonPromptModal.decision === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Modal 2: Sample Full Detail Drawer/Modal -->
    <div
      v-if="selectedSample"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @mousedown.self="selectedSample = null"
    >
      <div class="wv-card w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white space-y-4">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
          <div>
            <span class="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              รายละเอียดตัวอย่างน้ำ
            </span>
            <h3 class="text-base font-bold font-mono mt-1 text-slate-900 dark:text-white">
              {{ selectedSample.sample_code }}
            </h3>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="selectedSample = null">
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- Key Metrics Grid -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2C2C2E] dark:bg-[#141416]">
            <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">ระดับสารหนู</span>
            <div class="mt-1 flex items-baseline gap-1.5">
              <span class="text-lg font-bold font-mono text-slate-900 dark:text-white">{{ selectedSample.arsenic_ppb }}</span>
              <span class="text-xs text-slate-400">ppb</span>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2C2C2E] dark:bg-[#141416]">
            <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">สถานะการเผยแพร่</span>
            <div class="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">
              {{ selectedSample.publication_status }}
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2C2C2E] dark:bg-[#141416]">
            <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">แหล่งน้ำ</span>
            <div class="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">
              {{ selectedSample.sample_nature?.water_source || 'แม่น้ำกก' }}
            </div>
          </div>
        </div>

        <!-- Contact Info (Admin Only) -->
        <div class="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-slate-800 dark:border-sky-900/40 dark:bg-[#00E5FF]/10 dark:text-sky-100 space-y-1.5">
          <div class="flex items-center gap-1.5 font-bold text-sky-800 dark:text-[#00E5FF]">
            <ShieldCheck class="h-4 w-4" />
            <span>ข้อมูลติดต่อผู้แจ้ง (เฉพาะผู้ดูแลระบบมองเห็น)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-200">
            <div><strong>ชื่อ-นามสกุล:</strong> {{ selectedSample.contact_name || '-' }}</div>
            <div><strong>เบอร์โทรศัพท์:</strong> {{ selectedSample.contact_phone || '-' }}</div>
          </div>
        </div>

        <!-- Coordinates & Map Link -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-200 space-y-2">
          <div class="font-bold flex items-center gap-1.5">
            <MapPin class="h-4 w-4 text-sky-600" />
            <span>ตำแหน่งพิกัดภูมิศาสตร์</span>
          </div>
          <div class="font-mono text-xs">
            ละติจูด: {{ selectedSample.latitude }}, ลองจิจูด: {{ selectedSample.longitude }}
          </div>
          <div class="pt-1">
            <a
              :href="`https://www.google.com/maps?q=${selectedSample.latitude},${selectedSample.longitude}`"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400 font-medium"
            >
              <span>เปิดดูบน Google Maps</span>
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <!-- Attached Photos Preview (Admin Only) -->
        <div v-if="selectedSample.private_photo_paths?.length" class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-[#2C2C2E] dark:bg-[#141416] space-y-2">
          <div class="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Camera class="h-4 w-4 text-sky-600" />
            <span>ภาพถ่ายหลักฐานการเก็บตัวอย่าง ({{ selectedSample.private_photo_paths.length }} ภาพ — บันทึกใน Supabase Storage)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div
              v-for="(p, pIdx) in selectedSample.private_photo_paths"
              :key="pIdx"
              class="relative rounded-xl border border-slate-200 dark:border-[#2C2C2E] overflow-hidden bg-black/5 dark:bg-white/5 p-2 flex flex-col items-center justify-center"
            >
              <img
                :src="`/api/admin/photo?path=${encodeURIComponent(p)}`"
                :alt="`ภาพถ่ายที่ ${pIdx + 1}`"
                class="w-full max-h-48 object-contain rounded-lg shadow-xs"
              />
              <span class="mt-1.5 text-[10px] text-slate-400 font-mono">{{ p }}</span>
            </div>
          </div>
        </div>

        <!-- Audit Note if available -->
        <div v-if="selectedSample.review_reason" class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]">
          <div class="font-bold text-slate-800 dark:text-slate-200 mb-1">บันทึกการพิจารณา (Review Reason)</div>
          <p class="text-slate-600 dark:text-[#98A2A8]">{{ selectedSample.review_reason }}</p>
          <div v-if="selectedSample.reviewed_at" class="text-[10px] text-slate-400 mt-1">
            พิจารณาเมื่อ: {{ formatThaiDate(selectedSample.reviewed_at) }}
          </div>
        </div>

        <!-- Action Footer -->
        <footer class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#2C2C2E]">
          <button
            type="button"
            class="wv-btn-secondary"
            @click="selectedSample = null"
          >
            ปิด
          </button>
          <button
            v-if="selectedSample.publication_status === 'pending_review'"
            type="button"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            @click="selectedSample = null; promptDecision(selectedSample, 'approve')"
          >
            อนุมัติเผยแพร่
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>
