<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Accessibility,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  House,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Eye,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Waves,
  X,
} from 'lucide-vue-next'
import { useAdminQueue } from '../composables/useAdminQueue'
import { useSampleFilters } from '../composables/useSampleFilters'
import { useAdminNews } from '../composables/useAdminNews'
import { exportSamplesCsv } from '../utils/admin-csv'
import { actionButtonClass, adminCardClass, pillClass, primaryButtonClass } from '../utils/admin-ui'
import type { AdminCounts, AdminSample, Decision, SampleEdit } from '../utils/admin-types'
import type { NewsArticle } from '../utils/news-types'
import { communityTargets, type CommunityTarget } from '../utils/kok-contract'
import { communityOfPoint } from '../../src/lib/community-of-point'
import type { CommunityId } from '../../src/lib/map-data'
import KokAdminSampleEditDialog from './KokAdminSampleEditDialog.vue'
import KokModalShell from './KokModalShell.vue'
import KokAdminFilters from './KokAdminFilters.vue'
import KokAdminLogin from './KokAdminLogin.vue'
import KokAdminSampleDetail from './KokAdminSampleDetail.vue'
import KokAdminSampleTable from './KokAdminSampleTable.vue'
import KokAdminNewsTable from './KokAdminNewsTable.vue'
import KokAdminNewsForm from './KokAdminNewsForm.vue'
import KokAdminMapData, { type MapTab } from './KokAdminMapData.vue'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import type { EditorMarker } from '../utils/map-pin'
import KokAdminPrintMap from './KokAdminPrintMap.vue'
import KokAdminSettings from './KokAdminSettings.vue'
import KokAdminUsers from './KokAdminUsers.vue'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'
import type { AdminPageKey } from '../../src/lib/admin-rbac'

const emit = defineEmits<{ (e: 'backToMap'): void }>()

const queue = useAdminQueue()
const { isUnlocked, feedback, loading, actionLoading } = queue

// Community Village Filter (4 villages only - no "all/รวม 4 หมู่บ้าน" option)
const selectedCommunity = ref<CommunityId>('thaton')
const targetVillages = computed(() => communityTargets.slice(0, 4))
const currentCommunityTarget = computed(() => targetVillages.value.find((c) => c.id === selectedCommunity.value) ?? targetVillages.value[0]!)
const currentCommunityName = computed(() => currentCommunityTarget.value.name)

function communityDisplayName(c: CommunityTarget): string {
  if (c.name.startsWith('บ้าน')) return c.name
  return `บ้าน${c.name}`
}

function getSampleCommunityId(sample: AdminSample): CommunityId | null {
  const matched = communityOfPoint(sample.latitude, sample.longitude, communityTargets, 25)
  if (matched) return matched.id as CommunityId
  if (sample.station_name) {
    if (sample.station_name.includes('ท่าตอน')) return 'thaton'
    if (sample.station_name.includes('รวมมิตร') || sample.station_name.includes('กะเหรี่ยง')) return 'ruammit'
    if (sample.station_name.includes('ปงของ')) return 'pongkhong'
    if (sample.station_name.includes('ปากอิง')) return 'pakingtai'
  }
  return null
}

// Samples strictly filtered by selected community (no mixing with other villages)
const communitySamples = computed(() => {
  return queue.samples.value.filter((sample) => {
    const cid = getSampleCommunityId(sample)
    return cid === selectedCommunity.value
  })
})

// KPI counts for the selected community
const communityCounts = computed<AdminCounts>(() => {
  const list = communitySamples.value
  let pending = 0
  let approved = 0
  let autoPublished = 0
  let rejected = 0
  for (const s of list) {
    if (s.publication_status === 'pending_review') pending++
    else if (s.publication_status === 'approved') approved++
    else if (s.publication_status === 'auto_published') autoPublished++
    else if (s.publication_status === 'rejected') rejected++
  }
  return {
    total: list.length,
    pending,
    approved,
    autoPublished,
    rejected,
  }
})

const { tab, severity, timeRange, timeOrder, toggleTimeOrder, query, page, pageSize, filtered, paged } = useSampleFilters(communitySamples)

export type AdminTab =
  | 'samples'
  | 'map'
  | 'print-map'
  | 'news'
  | 'settings'
  | 'users'

const adminNews = useAdminNews(queue.logout)
const adminTab = ref<AdminTab>('map')
const mapDataTab = ref<MapTab>('overview')
const isSamplesActive = computed(() => adminTab.value === 'samples' || (adminTab.value === 'map' && mapDataTab.value === 'samples'))
const isMapSubActive = (sub: MapTab) => adminTab.value === 'map' && mapDataTab.value === sub

const currentPageKey = computed<AdminPageKey>(() => (
  adminTab.value === 'map' ? mapDataTab.value : adminTab.value
))
const currentTabReadOnly = computed(() => queue.canView(currentPageKey.value) && !queue.canEdit(currentPageKey.value))
const showCommunityBar = computed(() => (
  ['overview', 'hamlets', 'samples', 'evacuation', 'places', 'print-map'].includes(currentPageKey.value)
))

const PAGE_FALLBACK_ORDER: AdminPageKey[] = [
  'overview', 'hamlets', 'samples', 'evacuation', 'places',
  'print-map', 'news', 'users', 'settings',
]
const MAP_SUB_PAGES = new Set<AdminPageKey>(['overview', 'hamlets', 'samples', 'evacuation', 'places'])

function navigateToPage(key: AdminPageKey) {
  if (MAP_SUB_PAGES.has(key)) {
    adminTab.value = 'map'
    mapDataTab.value = key as MapTab
  } else {
    adminTab.value = key as AdminTab
  }
}
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const isNewsFormOpen = ref(false)
const editingNews = ref<NewsArticle | null>(null)
const deleteConfirmArticle = ref<NewsArticle | null>(null)
const newsError = computed(() => adminNews.feedback.value?.type === 'error' ? adminNews.feedback.value.message : null)

watch(selectedCommunity, () => {
  page.value = 1
  if (detail.value && getSampleCommunityId(detail.value) !== selectedCommunity.value) {
    detailCode.value = null
  }
})

watch(isUnlocked, (unlocked) => {
  if (unlocked) {
    if (queue.canView('news')) {
      void adminNews.fetchAdminNews()
    }
  } else {
    deleteConfirmArticle.value = null
    editingSample.value = null
    deletingSample.value = null
    isNewsFormOpen.value = false
    editingNews.value = null
    mobileSidebarOpen.value = false
  }
})

watch([isUnlocked, queue.permissions, currentPageKey], ([unlocked]) => {
  if (!unlocked) return
  if (queue.canView('news') && adminNews.articles.value.length === 0 && !adminNews.loading.value) {
    void adminNews.fetchAdminNews()
  }
  if (!queue.canView(currentPageKey.value)) {
    const firstAllowed = PAGE_FALLBACK_ORDER.find((key) => queue.canView(key))
    if (firstAllowed) navigateToPage(firstAllowed)
  }
}, { immediate: true })

function switchMapTab(sub: MapTab) {
  adminTab.value = 'map'
  mapDataTab.value = sub
  mobileSidebarOpen.value = false
}

function switchAdminTab(t: AdminTab) {
  if (t === 'samples') {
    adminTab.value = 'map'
    mapDataTab.value = 'samples'
  } else if (t === 'map') {
    adminTab.value = 'map'
  } else {
    adminTab.value = t
  }
  mobileSidebarOpen.value = false
  if (t === 'news') {
    void adminNews.fetchAdminNews()
  }
}

function handleCreateNews() {
  editingNews.value = null
  isNewsFormOpen.value = true
}

function handleEditNews(article: NewsArticle) {
  adminNews.feedback.value = null
  editingNews.value = article
  isNewsFormOpen.value = true
}

function handleDeleteNews(article: NewsArticle) {
  adminNews.feedback.value = null
  deleteConfirmArticle.value = article
}

async function confirmDeleteNews() {
  if (!deleteConfirmArticle.value) return
  const ok = await adminNews.deleteArticle(deleteConfirmArticle.value.id)
  if (ok) {
    deleteConfirmArticle.value = null
  }
}

async function handleSaveNews(payload: Partial<NewsArticle>) {
  const ok = await adminNews.saveArticle(payload)
  if (ok) {
    isNewsFormOpen.value = false
    editingNews.value = null
  }
}

async function handleTogglePin(article: NewsArticle) {
  await adminNews.togglePin(article.id)
}

// Looked up by code so the panel shows fresh data after a review reloads the list.
const detailCode = ref<string | null>(null)
const detail = computed(() => queue.samples.value.find((sample) => sample.sample_code === detailCode.value) ?? null)
const sampleMapFitToken = ref(0)
const sampleDropPinPath = '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'
const sampleMapMarkers = computed<EditorMarker[]>(() =>
  filtered.value
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item) => ({
      id: item.sample_code,
      latitude: item.latitude,
      longitude: item.longitude,
      color:
        item.publication_status === 'pending_review'
          ? '#E11D48'
          : item.publication_status === 'rejected'
            ? '#64748B'
            : '#059669',
      path: sampleDropPinPath,
      label: `${item.sample_code} · ${item.arsenic_ppb} ppb${item.contact_name ? ` · ${item.contact_name}` : ''}`,
      selected: detail.value?.sample_code === item.sample_code,
    })),
)

const editingSample = ref<AdminSample | null>(null)
const deletingSample = ref<AdminSample | null>(null)
const sampleError = computed(() => feedback.value?.type === 'error' ? feedback.value.message : null)

async function saveSample(values: SampleEdit) {
  if (editingSample.value && await queue.updateSample(editingSample.value.sample_code, values)) editingSample.value = null
}

async function confirmDeleteSample() {
  if (!deletingSample.value || !await queue.deleteSample(deletingSample.value.sample_code)) return
  deletingSample.value = null
  detailCode.value = null
}

async function handleDirectDecision(sample: AdminSample, type: Decision) {
  if (await queue.review(sample.sample_code, type)) {
    detailCode.value = null
  }
}

function handleExportCsv() {
  try {
    if (!filtered.value.length) {
      throw new Error('ไม่มีรายการตัวอย่างน้ำตามตัวกรองปัจจุบันให้ส่งออก')
    }
    exportSamplesCsv(filtered.value)
    feedback.value = { type: 'success', message: `ส่งออกไฟล์ CSV จำนวน ${filtered.value.length} รายการเรียบร้อยแล้ว` }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ CSV ได้'
    feedback.value = { type: 'error', message: `ส่งออก CSV ไม่สำเร็จ — เหตุผล: ${reason}` }
  }
}

const currentTabTitle = computed(() => {
  if (adminTab.value === 'map') {
    if (mapDataTab.value === 'samples') return 'ตรวจตัวอย่างน้ำ (>50 ppb)'
    if (mapDataTab.value === 'hamlets') return 'จัดการข้อมูลหมู่บ้าน'
    if (mapDataTab.value === 'evacuation') return 'จัดการกลุ่มอพยพ'
    if (mapDataTab.value === 'places') return 'จัดการสถานที่สำคัญ'
    return 'ภาพรวมข้อมูลแผนที่'
  }
  switch (adminTab.value) {
    case 'news': return 'จัดการข่าวสารประชาสัมพันธ์'
    case 'print-map': return 'จัดทำแผนที่ฉบับพิมพ์ติดชุมชน A0/A3'
    case 'users': return 'จัดการผู้ใช้งานและบทบาท (RBAC)'
    case 'settings': return 'บันทึกกิจกรรมย้อนหลัง (Audit Log)'
    case 'samples':
    default:
      return 'ตรวจตัวอย่างน้ำ (>50 ppb)'
  }
})

const currentTabDescription = computed(() => {
  if (adminTab.value === 'map') {
    if (mapDataTab.value === 'samples') return `ตรวจสอบผลตรวจสารหนูภาคสนามเกิน 50 ppb ก่อนเผยแพร่สู่สาธารณะ (${currentCommunityName.value})`
    if (mapDataTab.value === 'hamlets') return `จัดการข้อมูลหมู่บ้านและพิกัด (${currentCommunityName.value})`
    if (mapDataTab.value === 'evacuation') return `กลุ่มเปราะบางและคิวอพยพ (${currentCommunityName.value})`
    if (mapDataTab.value === 'places') return `สถานที่สำคัญ จุดปลอดภัย และจุดบริการ (${currentCommunityName.value})`
    return `ตรวจสอบและจัดการข้อมูลหมู่บ้าน ครัวเรือน และสถานที่สำคัญ (${currentCommunityName.value})`
  }
  switch (adminTab.value) {
    case 'news': return 'สร้าง แก้ไข และปักหมุดข่าวสารประชาสัมพันธ์บนแผนที่สาธารณะ'
    case 'print-map': return `สร้างแผนที่ความละเอียดสูงขนาดใหญ่พร้อมกริด 1 กม. และจุดปลอดภัย (${currentCommunityName.value})`
    case 'users': return 'กำหนดสิทธิ์การเข้าถึงหน้าหลังบ้าน 3 ระดับ ตามบทบาทผู้ใช้งาน'
    case 'settings': return 'บันทึกประวัติการตรวจสอบและการแก้ไขข้อมูลย้อนหลังของระบบ'
    case 'samples':
    default:
      return `ตรวจสอบผลตรวจสารหนูภาคสนามเกิน 50 ppb ก่อนเผยแพร่สู่สาธารณะ (${currentCommunityName.value})`
  }
})

const sidebarItemClass = (active: boolean) => [
  'group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150',
  sidebarCollapsed.value ? 'lg:justify-center lg:px-2 lg:[&_.text-left]:hidden' : '',
  active
    ? 'bg-[#0284C7] text-white shadow-sm shadow-[#0284C7]/20 font-bold'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#252525] dark:hover:text-white',
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white">
    <KokAlertToast :feedback="feedback" @close="feedback = null" />
    <KokAlertToast :feedback="adminNews.feedback.value" @close="adminNews.feedback.value = null" />

    <!-- Unlocked State: False (Login Form) -->
    <div v-if="!isUnlocked" class="min-h-screen flex flex-col">
      <header class="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <div class="mx-auto flex max-w-[1440px] items-center justify-between">
          <button type="button" aria-label="กลับสู่แผนที่สาธารณะ" :class="actionButtonClass" @click="emit('backToMap')">
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>กลับ</span>
          </button>
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0284C7] text-white">
              <Waves class="h-4 w-4" />
            </div>
            <span class="font-bold text-sm">ระบบจัดการข้อมูลแอดมิน</span>
          </div>
          <div class="w-16"></div>
        </div>
      </header>
      <main class="flex-1 flex items-center justify-center p-4">
        <KokAdminLogin
          v-model:mode="queue.loginMode.value"
          v-model:username="queue.username.value"
          v-model:password="queue.password.value"
          v-model:passcode="queue.passcode.value"
          v-model:reviewer="queue.reviewer.value"
          :verifying="queue.verifying.value"
          :error="queue.loginError.value"
          :dev-bypass="queue.devBypassAvailable.value"
          :dev-roles="queue.devRoles.value"
          :google-oauth-enabled="queue.googleOAuthEnabled.value"
          @submit="queue.login()"
          @dev-login="(roleId, communities) => queue.loginWithDevRole(roleId, communities)"
          @oauth-login="queue.startGoogleOAuth()"
          @cancel="emit('backToMap')"
        />
      </main>
    </div>

    <!-- Unlocked State: True (Sidebar Layout) -->
    <div v-else class="flex h-screen overflow-hidden">
      <!-- Mobile Backdrop -->
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        @click="mobileSidebarOpen = false"
      />

      <!-- Left Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out dark:border-[#2C2C2E] dark:bg-[#1A1A1E] lg:static lg:flex lg:translate-x-0"
        :class="[
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full max-lg:hidden',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-60 xl:w-72',
        ]"
      >
        <!-- Sidebar Brand / Logo Header -->
        <div
          class="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-[#2C2C2E]"
          :class="{ 'lg:justify-center lg:px-2': sidebarCollapsed }"
        >
          <div class="flex items-center gap-3 min-w-0" :class="{ 'lg:justify-center': sidebarCollapsed }">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0284C7] to-sky-400 text-white shadow-sm">
              <Waves class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1" :class="{ 'lg:hidden': sidebarCollapsed }">
              <h2 class="text-sm font-bold leading-tight text-slate-900 dark:text-white truncate">
                ระบบจัดการแอดมิน
              </h2>
              <p class="text-[11px] text-slate-500 dark:text-[#98A2A8] truncate">
                ม.แม่ฟ้าหลวง · ลุ่มน้ำกก
              </p>
            </div>
          </div>
          <button
            type="button"
            class="lg:hidden p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-[#252525]"
            aria-label="ปิดเมนู"
            @click="mobileSidebarOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Navigation Menu -->
        <nav
          aria-label="ส่วนงานแอดมิน"
          class="flex-1 space-y-5 overflow-y-auto p-4"
          :class="{ 'lg:px-2.5 lg:space-y-3 lg:[&>div>p]:hidden': sidebarCollapsed }"
        >
          <!-- GROUP 0: สรุปผล (Overview) -->
          <div v-if="queue.canView('overview')">
            <p class="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              สรุปผล (Overview)
            </p>
            <div class="space-y-1.5">
              <!-- Item 1: ภาพรวม -->
              <button
                type="button"
                :class="sidebarItemClass(isMapSubActive('overview'))"
                :aria-pressed="isMapSubActive('overview')"
                @click="switchMapTab('overview')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="isMapSubActive('overview') ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <LayoutDashboard class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">ภาพรวม</span>
                  <span class="block text-[10px] opacity-75 truncate">สรุปข้อมูลหน้าบ้านและประวัติ</span>
                </div>
              </button>
            </div>
          </div>

          <!-- GROUP 1: การจัดการพื้นที่ -->
          <div v-if="queue.canView('hamlets') || queue.canView('samples') || queue.canView('evacuation') || queue.canView('places') || queue.canView('print-map')">
            <p class="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              การจัดการพื้นที่
            </p>

            <!-- รายการเมนูหมวดการจัดการพื้นที่ -->
            <div class="space-y-1.5">
              <!-- Item 2: หมู่บ้าน -->
              <button
                v-if="queue.canView('hamlets')"
                type="button"
                :class="sidebarItemClass(isMapSubActive('hamlets'))"
                :aria-pressed="isMapSubActive('hamlets')"
                @click="switchMapTab('hamlets')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="isMapSubActive('hamlets') ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <House class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">หมู่บ้าน</span>
                  <span class="block text-[10px] opacity-75 truncate">จัดการหมู่บ้านและรู้จักชุมชน</span>
                </div>
              </button>

              <!-- Item 3: ตรวจตัวอย่างน้ำ -->
              <button
                v-if="queue.canView('samples')"
                type="button"
                :class="sidebarItemClass(isMapSubActive('samples'))"
                :aria-pressed="isMapSubActive('samples')"
                @click="switchMapTab('samples')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="isMapSubActive('samples') ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <FlaskConical class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">ตรวจตัวอย่างน้ำ</span>
                  <span class="block text-[10px] opacity-75 truncate">>50 ppb รออนุมัติ</span>
                </div>
                <span
                  v-if="communityCounts.pending > 0"
                  class="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                  :class="{ 'lg:hidden': sidebarCollapsed }"
                  :aria-label="`ตัวอย่างรออนุมัติ ${communityCounts.pending} รายการ`"
                >
                  {{ communityCounts.pending }}
                </span>
              </button>

              <!-- Item 4: กลุ่มอพยพ -->
              <button
                v-if="queue.canView('evacuation')"
                type="button"
                :class="sidebarItemClass(isMapSubActive('evacuation'))"
                :aria-pressed="isMapSubActive('evacuation')"
                @click="switchMapTab('evacuation')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="isMapSubActive('evacuation') ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <Accessibility class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">กลุ่มอพยพ</span>
                  <span class="block text-[10px] opacity-75 truncate">กลุ่มเปราะบางและคิวอพยพ</span>
                </div>
              </button>

              <!-- Item 5: สถานที่สำคัญ -->
              <button
                v-if="queue.canView('places')"
                type="button"
                :class="sidebarItemClass(isMapSubActive('places'))"
                :aria-pressed="isMapSubActive('places')"
                @click="switchMapTab('places')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="isMapSubActive('places') ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <MapPinned class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">สถานที่สำคัญ</span>
                  <span class="block text-[10px] opacity-75 truncate">ศูนย์พักพิงและจุดบริการ</span>
                </div>
              </button>

              <!-- Item 4: สร้างแผนที่พิมพ์ A0/A3 -->
              <button
                v-if="queue.canView('print-map')"
                type="button"
                :class="sidebarItemClass(adminTab === 'print-map')"
                :aria-pressed="adminTab === 'print-map'"
                @click="switchAdminTab('print-map')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="adminTab === 'print-map' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <Printer class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">สร้างแผนที่พิมพ์ A0/A3</span>
                  <span class="block text-[10px] opacity-75 truncate">ติดศาลาประชาคม</span>
                </div>
              </button>
            </div>
          </div>

          <!-- GROUP 2: ข้อมูลข่าวสาร -->
          <div v-if="queue.canView('news')">
            <p class="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              ข้อมูลข่าวสาร
            </p>
            <div class="space-y-1.5">
              <!-- Item 5: ข่าวสารประชาสัมพันธ์ -->
              <button
                type="button"
                aria-label="จัดการข่าวสารประชาสัมพันธ์"
                :class="sidebarItemClass(adminTab === 'news')"
                :aria-pressed="adminTab === 'news'"
                @click="switchAdminTab('news')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="adminTab === 'news' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <Newspaper class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">จัดการข่าวสารประชาสัมพันธ์</span>
                  <span class="block text-[10px] opacity-75 truncate">ประกาศและบทความ</span>
                </div>
              </button>
            </div>
          </div>

          <!-- GROUP 3: การจัดการระบบ -->
          <div v-if="queue.canView('users') || queue.canView('settings')">
            <p class="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              การจัดการระบบ
            </p>
            <div class="space-y-1.5">
              <!-- Item 8: จัดการผู้ใช้งานและบทบาท -->
              <button
                v-if="queue.canView('users')"
                type="button"
                :class="sidebarItemClass(adminTab === 'users')"
                :aria-pressed="adminTab === 'users'"
                @click="switchAdminTab('users')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="adminTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <ShieldCheck class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">ผู้ใช้งานและบทบาท</span>
                  <span class="block text-[10px] opacity-75 truncate">สิทธิ์การเข้าถึงหน้าหลังบ้าน</span>
                </div>
              </button>

              <!-- Item 9: บันทึกกิจกรรมย้อนหลัง (Audit Log) — วางไว้ล่างสุดใต้ผู้ใช้งานและบทบาท -->
              <button
                v-if="queue.canView('settings')"
                type="button"
                :class="sidebarItemClass(adminTab === 'settings')"
                :aria-pressed="adminTab === 'settings'"
                @click="switchAdminTab('settings')"
              >
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                  :class="adminTab === 'settings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-[#252525] dark:text-slate-400 dark:group-hover:text-white'"
                >
                  <Settings class="h-4 w-4" />
                </div>
                <div class="flex-1 text-left min-w-0">
                  <span class="block truncate">บันทึกกิจกรรม (Audit Log)</span>
                  <span class="block text-[10px] opacity-75 truncate">ประวัติการตรวจสอบย้อนหลัง</span>
                </div>
              </button>
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer / Reviewer Session -->
        <div
          class="border-t border-slate-200 p-3.5 bg-slate-50/70 dark:border-[#2C2C2E] dark:bg-[#141416]/70 space-y-2.5"
          :class="{ 'lg:p-2': sidebarCollapsed }"
        >
          <!-- Dev Role Switcher (Local Dev Bypass only) -->
          <div
            v-if="queue.me.value?.bypass"
            class="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] dark:border-amber-900/60 dark:bg-amber-950/30"
            :class="{ 'lg:hidden': sidebarCollapsed }"
          >
            <p class="font-bold text-amber-800 dark:text-amber-200 mb-1.5">Dev Role Preview</p>
            <select
              aria-label="สลับบทบาททดสอบ (Dev)"
              class="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 dark:border-amber-800 dark:bg-[#1E1E1E] dark:text-slate-100"
              :value="queue.devRoleId.value || 'super-admin'"
              @change="queue.switchDevRole(($event.target as HTMLSelectElement).value, ['all'])"
            >
              <option value="super-admin">Super Admin (ทุกหน้า)</option>
              <option value="reviewer">Reviewer (ตรวจตัวอย่างน้ำ)</option>
              <option value="researcher">Researcher (จัดการข้อมูลพื้นที่/ข่าว)</option>
              <option value="viewer">Viewer (ดูอย่างเดียว)</option>
            </select>
          </div>

          <div
            class="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E]"
            :class="{ 'lg:justify-center lg:p-2': sidebarCollapsed }"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 font-bold text-xs text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
                {{ (queue.reviewer.value || 'AD').slice(0, 2).toUpperCase() }}
                <span class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1E1E1E]"></span>
              </div>
              <div class="min-w-0 flex-1" :class="{ 'lg:hidden': sidebarCollapsed }">
                <p class="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                  {{ queue.me.value?.displayName || queue.reviewer.value || 'ผู้ดูแลระบบ' }}
                </p>
                <p class="truncate text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {{ queue.me.value?.roleName || 'สถานะออนไลน์' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              class="cursor-pointer rounded-lg p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              :class="{ 'lg:hidden': sidebarCollapsed }"
              @click="queue.logout()"
            >
              <LogOut class="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Right Main Content Area -->
      <div class="flex flex-1 flex-col min-w-0 h-screen overflow-y-auto">
        <!-- Topbar -->
        <header class="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/90">
          <div class="flex items-center gap-3 min-w-0">
            <!-- Mobile Menu Toggle Button -->
            <button
              type="button"
              class="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-[#2C2C2E] dark:text-slate-300 dark:hover:bg-[#252525] cursor-pointer"
              aria-label="เปิดเมนูนำทาง"
              @click="mobileSidebarOpen = true"
            >
              <Menu class="h-4 w-4" />
            </button>
            <!-- Desktop Sidebar Collapse/Expand Toggle -->
            <button
              type="button"
              class="hidden lg:inline-flex p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-[#2C2C2E] dark:text-slate-300 dark:hover:bg-[#252525] cursor-pointer"
              :aria-label="sidebarCollapsed ? 'ขยายแถบข้าง' : 'ย่อแถบข้าง'"
              :title="sidebarCollapsed ? 'ขยายแถบข้าง' : 'ย่อแถบข้าง'"
              @click="sidebarCollapsed = !sidebarCollapsed"
            >
              <PanelLeftOpen v-if="sidebarCollapsed" class="h-4 w-4" />
              <PanelLeftClose v-else class="h-4 w-4" />
            </button>

            <div class="min-w-0">
              <h1 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 truncate">
                <span>{{ currentTabTitle }}</span>
                <span
                  v-if="isSamplesActive && communityCounts.pending > 0"
                  class="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                >
                  {{ communityCounts.pending }} รอตรวจ
                </span>
                <span
                  v-if="(isSamplesActive || adminTab === 'map' || adminTab === 'print-map') && currentCommunityName"
                  class="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0369A1] dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300"
                >
                  <MapPin class="h-3 w-3 text-sky-500" />
                  <span>{{ currentCommunityTarget?.fullName || currentCommunityName }}</span>
                </span>
              </h1>
              <p class="hidden sm:block text-xs text-slate-500 dark:text-[#98A2A8] truncate">
                {{ currentTabDescription }}
              </p>
            </div>
          </div>

          <!-- Topbar Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="adminTab === 'news' && !isNewsFormOpen && !currentTabReadOnly"
              type="button"
              :class="primaryButtonClass"
              @click="handleCreateNews"
            >
              <Plus class="h-4 w-4" />
              <span>สร้างข่าวใหม่</span>
            </button>

            <button
              type="button"
              aria-label="กลับสู่แผนที่สาธารณะ"
              :class="actionButtonClass"
              class="flex items-center gap-1.5"
              @click="emit('backToMap')"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">กลับสู่แผนที่</span>
              <span class="sm:hidden">กลับ</span>
            </button>
          </div>
        </header>


        <!-- Main Body Content -->
        <main class="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          <div class="space-y-4">
            <div
              v-if="currentTabReadOnly"
              role="status"
              class="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <Eye class="h-4 w-4 shrink-0" />
              <span>โหมดดูอย่างเดียว (View-Only) — บทบาทของคุณดูข้อมูลหน้านี้ได้ แต่ไม่สามารถแก้ไขหรือลบข้อมูลได้</span>
            </div>

            <!-- Per-Page Community Switcher (for หมู่บ้าน / ตรวจตัวอย่างน้ำ / กลุ่มอพยพ / สถานที่สำคัญ ฯลฯ) -->
            <div
              v-if="showCommunityBar"
              role="region"
              aria-label="เลือกชุมชนที่ต้องการดูข้อมูล"
              :class="adminCardClass"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <MapPin class="h-4 w-4 text-[#0284C7]" />
                <span>เลือกดูข้อมูลตามชุมชน:</span>
              </div>
              <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="รายชื่อ 4 ชุมชน">
                <button
                  v-for="c in targetVillages"
                  :key="c.id"
                  type="button"
                  role="tab"
                  :aria-selected="selectedCommunity === c.id"
                  :class="pillClass(selectedCommunity === c.id)"
                  @click="selectedCommunity = c.id"
                >
                  {{ communityDisplayName(c) }}
                </button>
              </div>
            </div>

            <!-- TAB: NEWS MANAGEMENT (S5.1 & S5.2) -->
            <template v-if="adminTab === 'news'">
              <!-- Create / Edit News Form -->
              <KokAdminNewsForm
                v-if="isNewsFormOpen"
                :initial-data="editingNews"
                :saving="adminNews.actionLoading.value !== null"
                :save-error="newsError"
                @save="handleSaveNews"
                @cancel="isNewsFormOpen = false; editingNews = null"
              />

              <!-- News Management Table -->
              <KokAdminNewsTable
                v-else
                :articles="adminNews.articles.value"
                :counts="adminNews.counts.value"
                :loading="adminNews.loading.value"
                :action-loading="adminNews.actionLoading.value"
                v-model:status-filter="adminNews.statusFilter.value"
                v-model:category-filter="adminNews.categoryFilter.value"
                v-model:community-filter="adminNews.communityFilter.value"
                v-model:search-query="adminNews.searchQuery.value"
                v-model:page="adminNews.page.value"
                v-model:page-size="adminNews.pageSize.value"
                @edit="handleEditNews"
                @delete="handleDeleteNews"
                @toggle-pin="handleTogglePin"
                @refresh="adminNews.fetchAdminNews(true)"
              />
            </template>

            <!-- TAB: MAP DATA (includes Overview, Hamlets, Samples, Evacuation, Places) -->
            <KokAdminMapData
              v-else-if="adminTab === 'map' || adminTab === 'samples'"
              :key="`map-${selectedCommunity}`"
              v-model:community="selectedCommunity"
              v-model:tab="mapDataTab"
              :pending-samples-count="communityCounts.pending"
              :samples="communitySamples"
              :selected-sample-code="detail?.sample_code ?? null"
              :read-only-samples="!queue.canEdit('samples')"
              @go-news="adminTab = 'news'"
              @select-sample="detailCode = $event.sample_code"
              @edit-sample="feedback = null; editingSample = $event"
              @delete-sample="feedback = null; deletingSample = $event"
              @session-expired="queue.logout($event)"
            >
              <template #samples>
                <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <KokKpiCard label="ทั้งหมด" :value="communityCounts.total" caption="ตัวอย่างน้ำในระบบ" />
                  <KokKpiCard label="รอตรวจ > 50 ppb" :value="communityCounts.pending" tone="rose" caption="รอแอดมินตรวจก่อนเผยแพร่" />
                  <KokKpiCard label="อนุมัติแล้ว" :value="communityCounts.approved + communityCounts.autoPublished" tone="emerald" caption="แสดงบนแผนที่สาธารณะ" />
                  <KokKpiCard label="ปฏิเสธ" :value="communityCounts.rejected" tone="slate" caption="ไม่แสดงบนแผนที่" />
                </div>

                <!-- Sample Locations Map -->
                <section :class="adminCardClass" class="space-y-3 p-4 sm:p-5" aria-label="แผนที่จุดตรวจตัวอย่างน้ำ">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="text-sm font-bold text-slate-900 dark:text-white">แผนที่จุดตรวจตัวอย่างน้ำ</h2>
                      <span class="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-[#252528] dark:text-slate-300">
                        แสดง {{ sampleMapMarkers.length }} จุด
                      </span>
                      <div class="flex flex-wrap items-center gap-2.5 pl-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-[#E11D48]" />รอตรวจ</span>
                        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-[#059669]" />อนุมัติแล้ว</span>
                        <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-[#64748B]" />ปฏิเสธ</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      :class="actionButtonClass"
                      title="จัดมุมมองแผนที่ให้พอดีกับทุกหมุด"
                      @click="sampleMapFitToken += 1"
                    >
                      <LocateFixed class="h-3.5 w-3.5" />
                      <span>ภาพรวมทั้งหมด</span>
                    </button>
                  </div>
                  <KokAdminMapEditor
                    :markers="sampleMapMarkers"
                    :community="selectedCommunity"
                    :fit-token="sampleMapFitToken"
                    height-class="h-[340px] sm:h-[380px]"
                    @select="detailCode = $event"
                  />
                </section>

                <KokAdminFilters v-model:tab="tab" v-model:severity="severity" v-model:time-range="timeRange" v-model:query="query" :counts="communityCounts">
                  <button type="button" aria-label="รีเฟรช" title="รีเฟรช" :class="actionButtonClass" class="px-2.5!" :disabled="loading" @click="queue.fetchSamples(true)">
                    <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                  </button>
                  <button type="button" aria-label="Export CSV" :class="actionButtonClass" @click="handleExportCsv">
                    <Download class="h-4 w-4" />
                    <span class="hidden sm:inline">Export CSV</span>
                  </button>
                </KokAdminFilters>

                <div :class="adminCardClass" class="min-w-0 overflow-hidden">
                  <KokAdminSampleTable
                    :items="paged"
                    :loading="loading"
                    :selected="detail?.sample_code ?? null"
                    :read-only="currentTabReadOnly"
                    :time-order="timeOrder"
                    @select="detailCode = $event.sample_code"
                    @edit="feedback = null; editingSample = $event"
                    @delete="feedback = null; deletingSample = $event"
                    @toggle-time-order="toggleTimeOrder"
                  />
                  <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />
                </div>
              </template>
            </KokAdminMapData>

            <!-- Sample Detail Modal (View Popup — shared across Overview and Samples tabs) -->
            <div
              v-if="detail"
              class="fixed inset-0 z-[1060] flex items-end justify-center bg-slate-900/60 backdrop-blur-xs sm:items-center sm:p-4"
              @click.self="detailCode = null"
            >
              <KokAdminSampleDetail
                :key="detail.sample_code"
                :sample="detail"
                :saving="actionLoading === detail.sample_code"
                @close="detailCode = null"
                @decide="handleDirectDecision(detail!, $event)"
                @edit="feedback = null; editingSample = detail"
                @delete="feedback = null; deletingSample = detail"
              />
            </div>

            <!-- TAB 5: PRINT MAP A0/A3 (R21) -->
            <KokAdminPrintMap
              v-else-if="adminTab === 'print-map'"
              :key="`print-${selectedCommunity}`"
              :community-id="selectedCommunity"
            />

            <!-- TAB 8: SETTINGS, SPONSORS & AUDIT (R12, R26, R29) -->
            <KokAdminSettings
              v-else-if="adminTab === 'settings'"
            />

            <!-- TAB 9: USER & ROLE MANAGEMENT (RBAC) -->
            <KokAdminUsers
              v-else-if="adminTab === 'users'"
              :current-user-id="queue.me.value?.id"
              :read-only="currentTabReadOnly"
            />
          </div>
        </main>
      </div>
    </div>

    <!-- Delete Confirmation Modal for News -->
    <div
      v-if="deleteConfirmArticle"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบข่าวสารประชาสัมพันธ์</h3>
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          คุณต้องการลบข่าว <strong>"{{ deleteConfirmArticle.title }}"</strong> (รหัส {{ deleteConfirmArticle.id }}) ใช่หรือไม่? ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร
        </p>
        <p v-if="newsError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ newsError }}</p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:text-slate-300 dark:hover:bg-[#252525] cursor-pointer"
            @click="deleteConfirmArticle = null"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            class="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            :disabled="adminNews.actionLoading.value !== null"
            @click="confirmDeleteNews"
          >
            ยืนยันลบข่าว
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Dialog for Sample -->
    <KokAdminSampleEditDialog
      v-if="editingSample"
      :sample="editingSample"
      :saving="actionLoading === editingSample.sample_code"
      :error="sampleError"
      @save="saveSample"
      @close="editingSample = null"
    />

    <!-- Delete Confirmation Modal for Sample -->
    <KokModalShell v-if="deletingSample" width-class="max-w-md" @close="deletingSample = null">
      <h3 class="text-base font-bold">ยืนยันการลบข้อมูลตัวอย่างน้ำ</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        ลบรหัส <strong class="font-mono">{{ deletingSample.sample_code }}</strong> ({{ deletingSample.arsenic_ppb }} ppb) พร้อมข้อมูลติดต่อและภาพถ่าย จุดนี้จะหายจากแผนที่สาธารณะ และกู้คืนไม่ได้
      </p>
      <p v-if="sampleError" role="alert" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{{ sampleError }}</p>
      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="deletingSample = null">ยกเลิก</button>
        <button type="button" class="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50" :disabled="actionLoading === deletingSample.sample_code" @click="confirmDeleteSample">
          ยืนยันลบข้อมูล
        </button>
      </div>
    </KokModalShell>
  </div>
</template>
