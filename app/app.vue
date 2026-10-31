<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ObservationDate } from './utils/flood-observations'
import { Activity, BookOpen, CheckCircle2, ClipboardList, Filter, ShieldAlert } from 'lucide-vue-next'
import KokLandingHero from './components/KokLandingHero.vue'
import KokKpiCard from './components/KokKpiCard.vue'
import KokLoadingScreen from './components/KokLoadingScreen.vue'
import KokPPBTrendChart from './components/KokPPBTrendChart.vue'
import KokWaterHealthChart from './components/KokWaterHealthChart.vue'
import KokPointDetailModal from './components/KokPointDetailModal.vue'
import KokAdminDataTablePage from './components/KokAdminDataTablePage.vue'

import type { CommunityMapType } from './utils/community-map-layers'
import { fetchSurveyWaypoints, type SurveyWaypoint } from '../src/lib/survey'

import { communityTargets, pcdRound22ComparableSeries, publicSurveyGridCells, surveyDistributionColumns, type PublicGridCell } from './utils/kok-contract'

const runtimeConfig = useRuntimeConfig()
const mapTilerKey = computed(() => String(runtimeConfig.public.mapTilerApiKey ?? ''))






// Public waypoints from Express + MongoDB
const waypoints = ref<SurveyWaypoint[]>([])
const loadingWaypoints = ref(true)
const waypointLoadError = ref<string | null>(null)
const surveyFeedback = ref<string | null>(null)

// Survey Modal & Quick Panels
const surveyModalOpen = ref(false)
const activeQuickPanel = ref<'guide' | 'summary' | null>(null)

// Map & Filter State (R02, R03, R08, R23)
const activeThematicLayer = ref<'arsenic' | 'survey_grid'>('arsenic')
const activeCommunityMapType = ref<CommunityMapType | null>('chemical')
const timelineSelectedDate = ref<number | null>(null)
const floodStage = ref(2.5)
// Simulated flood water is switched off for now; its toggle was removed from the layer menu.
const simulationVisible = ref(false)
const observationsVisible = ref(false)
const observationDate = ref<ObservationDate>('2024-09-15')
const STORAGE_KEY_COMMUNITY = 'kok_selected_community'
const validCommunities = ['thaton', 'ruammit', 'pongkhong', 'pakingtai'] as const

function getInitialCommunity(): 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai' {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const comm = params.get('community')
    if (comm && validCommunities.includes(comm as any)) {
      return comm as any
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY)
      if (stored && validCommunities.includes(stored as any)) {
        return stored as any
      }
    } catch {
      // ignore
    }
  }
  return 'thaton'
}

const selectedCommunityId = ref<'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'>('thaton')

watch(selectedCommunityId, (newId) => {
  if (newId && validCommunities.includes(newId as any)) {
    try {
      localStorage.setItem(STORAGE_KEY_COMMUNITY, newId)
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.history && currentView.value === 'dashboard') {
      const url = new URL(window.location.href)
      url.searchParams.set('community', newId)
      window.history.replaceState(null, '', url.toString())
    }
  }
})
const zoomScope = ref<'inner' | 'outer'>('inner')
const selectedTimeRange = ref<'today' | '24h' | '7d' | '30d' | 'all'>('all')
const selectedStatusFilter = ref<'all' | 'normal' | 'alert'>('all')
const waterwayTrigger = ref(0)
const waterwayMessage = ref<string | null>(null)
const virtualPolygonActive = ref(false)

watch(activeCommunityMapType, (newType) => {
  if (newType === 'evacuation' && selectedCommunityId.value === 'all') {
    selectedCommunityId.value = 'thaton'
  }
})

// Selected Map Item for Right Inspector
const selectedWaypoint = ref<SurveyWaypoint | null>(null)
const showPointDetailModal = ref(false)

function handleSelectWaypoint(wp: SurveyWaypoint) {
  selectedWaypoint.value = wp
  showPointDetailModal.value = true
}

function handleFocusWaypoint(wp: SurveyWaypoint) {
  selectedWaypoint.value = wp
}
const selectedGridCell = ref<PublicGridCell | null>(publicSurveyGridCells[3] ?? publicSurveyGridCells[0] ?? null)

// Comparable Trend Series Selection (R07)
const selectedSeriesId = ref(pcdRound22ComparableSeries[0]?.seriesId ?? 'pcd-kk01-v2')


// K2 / R10 Admin Review Queue (> 50 ppb items held back from public map)
type ReviewQueueItem = {
  id: string
  sampleCode: string
  arsenicLevelPpb: number
  latitude: number
  longitude: number
  waterSourceType: string
  rainContext: string
  submittedAt: string
  status: 'pending_review' | 'approved_published' | 'revision_requested' | 'rejected'
  reviewerNote: string
}

const adminReviewQueue = ref<ReviewQueueItem[]>([
  {
    id: 'demo-review-01',
    sampleCode: 'DEMO-R10-0100',
    arsenicLevelPpb: 100,
    latitude: 20.0584,
    longitude: 99.3614,
    waterSourceType: 'แม่น้ำ',
    rainContext: 'ไม่ทราบ',
    submittedAt: '2026-10-15T09:10:00+07:00',
    status: 'pending_review',
    reviewerNote: 'ตัวอย่างสาธิตกติกา R10: ค่า > 50 ppb ต้องรอผู้ดูแลระบบตรวจภาพแถบสีและพิกัดก่อนเผยแพร่',
  },
])











// S1 Column Distribution Selector
const distributionColumns = surveyDistributionColumns
const selectedDistributionCol = ref(distributionColumns[1]?.colKey ?? distributionColumns[0]?.colKey ?? '70')




















// Filtered Public Waypoints (R08)
const filteredWaypoints = computed(() => {
  const now = Date.now()
  return waypoints.value.filter((wp) => {
    // R10 safety: only <= 50 ppb in public waypoints
    if (wp.arsenic_level_ppb > 50 && wp.publication_status !== 'approved') return false

    if (selectedStatusFilter.value === 'normal' && wp.arsenic_level_ppb > 10) return false
    if (selectedStatusFilter.value === 'alert' && wp.arsenic_level_ppb <= 10) return false

    // Timeline filter: กรองจุดที่บันทึกสะสมถึงวันที่เลือกในไทม์ไลน์
    if (timelineSelectedDate.value !== null && timelineSelectedDate.value !== undefined) {
      const rawDate = wp.collection_time || wp.created_at
      const createdMs = Date.parse(rawDate)
      if (Number.isFinite(createdMs)) {
        const targetDate = new Date(timelineSelectedDate.value)
        targetDate.setHours(23, 59, 59, 999)
        if (createdMs > targetDate.getTime()) return false
      }
    }

    if (selectedTimeRange.value !== 'all') {
      const rawDate = wp.collection_time || wp.created_at
      const createdMs = Date.parse(rawDate)
      if (Number.isFinite(createdMs)) {
        const ageHours = (now - createdMs) / (1000 * 3600)
        if (selectedTimeRange.value === 'today' && ageHours > 24) return false
        if (selectedTimeRange.value === '24h' && ageHours > 24) return false
        if (selectedTimeRange.value === '7d' && ageHours > 24 * 7) return false
        if (selectedTimeRange.value === '30d' && ageHours > 24 * 30) return false
      }
    }
    return true
  })
})

const statusSummary = computed(() => {
  const counts = { critical: 0, watch: 0, normal: 0, total: 0 }
  for (const wp of filteredWaypoints.value) {
    if (wp.arsenic_level_ppb > 10) counts.critical += 1
    else if (wp.arsenic_level_ppb >= 5) counts.watch += 1
    else counts.normal += 1
    counts.total += 1
  }
  return counts
})



async function loadPublicWaypoints() {
  loadingWaypoints.value = true
  waypointLoadError.value = null
  try {
    waypoints.value = await fetchSurveyWaypoints()
    if (waypoints.value.length > 0 && !selectedWaypoint.value) {
      selectedWaypoint.value = waypoints.value[0] ?? null
    }
  } catch {
    waypointLoadError.value = 'โหลดผลตรวจไม่สำเร็จ'
  } finally {
    loadingWaypoints.value = false
  }
}

function handleSurveySubmitted(payload: {
  waypoint: SurveyWaypoint
  waterSourceType: 'แม่น้ำ' | 'บ่อ' | 'ประปา'
  rainContext: 'ไม่ทราบ' | 'ไม่ตก' | 'ตก'
  sampleCollectedAt: string
  reviewStatus: 'auto_published' | 'pending_review'
  feedbackMessage?: string
}) {
  surveyFeedback.value = payload.feedbackMessage || `บันทึกผลสำรวจรหัส ${payload.waypoint.sample_code} เรียบร้อยแล้ว`
  setTimeout(() => {
    if (surveyFeedback.value === payload.feedbackMessage) {
      surveyFeedback.value = null
    }
  }, 8000)

  if (payload.reviewStatus === 'pending_review') {
    adminReviewQueue.value.unshift({
      id: payload.waypoint.id,
      sampleCode: payload.waypoint.sample_code,
      arsenicLevelPpb: payload.waypoint.arsenic_level_ppb,
      latitude: payload.waypoint.latitude,
      longitude: payload.waypoint.longitude,
      waterSourceType: payload.waterSourceType,
      rainContext: payload.rainContext,
      submittedAt: payload.sampleCollectedAt || payload.waypoint.created_at,
      status: 'pending_review',
      reviewerNote: 'รอผู้ดูแลระบบตรวจสอบตามกติกา R10 (> 50 ppb) จึงยังไม่แสดงบนแผนที่สาธารณะ',
    })
  } else {
    waypoints.value = [payload.waypoint, ...waypoints.value.filter((item) => item.id !== payload.waypoint.id)]
    selectedWaypoint.value = payload.waypoint
  }
}

function toggleQuickPanel(panel: 'guide' | 'summary') {
  activeQuickPanel.value = activeQuickPanel.value === panel ? null : panel
}

// View navigation state: the map dashboard is the first page; 'landing' (community picker) is only reachable with ?view=landing
type AppView = 'landing' | 'dashboard' | 'admin'
const currentView = ref<AppView>('dashboard')

function navigateToAdmin() {
  currentView.value = 'admin'
  if (typeof window !== 'undefined' && window.history) {
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'admin')
    window.history.pushState(null, '', url.toString())
  }
}

function returnToDashboardFromAdmin() {
  currentView.value = 'dashboard'
  if (typeof window !== 'undefined' && window.history) {
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'dashboard')
    window.history.pushState(null, '', url.toString())
  }
  void loadPublicWaypoints()
}

function selectCommunityFromLanding(id: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai') {
  selectedCommunityId.value = id === 'all' ? getInitialCommunity() : id
  activeCommunityMapType.value = 'chemical'
  currentView.value = 'dashboard'
}

function enterDashboardDirectly() {
  selectedCommunityId.value = getInitialCommunity()
  activeCommunityMapType.value = 'chemical'
  currentView.value = 'dashboard'
}



const colorMode = useColorMode()

// S0 / S0.1: mascot loading screen while the first data loads; offer retry or skip when it drags on.
const bootSkipped = ref(false)
const bootSlow = ref(false)
const bootVisible = computed(() => currentView.value !== 'admin' && loadingWaypoints.value && !bootSkipped.value)
let bootSlowTimer: ReturnType<typeof setTimeout> | undefined

function startBootTimer() {
  clearTimeout(bootSlowTimer)
  bootSlow.value = false
  bootSlowTimer = setTimeout(() => { bootSlow.value = true }, 8000)
}

function retryBoot() {
  startBootTimer()
  void loadPublicWaypoints()
}

watch(loadingWaypoints, (loading) => {
  if (!loading) clearTimeout(bootSlowTimer)
})
onBeforeUnmount(() => clearTimeout(bootSlowTimer))

onMounted(() => {
  startBootTimer()
  void loadPublicWaypoints()
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('theme') === 'dark') {
      colorMode.preference = 'dark'
    } else {
      colorMode.preference = 'light'
    }

    selectedCommunityId.value = getInitialCommunity()
    if (params.get('view') === 'admin') currentView.value = 'admin'
    else if (params.get('view') === 'landing') currentView.value = 'landing'
    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(window.location.search)
      const v = p.get('view')
      currentView.value = v === 'admin' ? 'admin' : v === 'landing' ? 'landing' : 'dashboard'
    })
  }
})
</script>

<template>
  <UApp>
    <!-- Dedicated Admin Data Table Page (หน้าแอดมิน Data Table เต็มรูปแบบ) -->
    <KokAdminDataTablePage
      v-if="currentView === 'admin'"
      @back-to-map="returnToDashboardFromAdmin"
    />

    <!-- Page 1: Landing Page & Community Selection (R02 4 Focus Communities) -->
    <KokLandingHero
      v-else-if="currentView === 'landing'"
      :communities="communityTargets"
      @select-community="selectCommunityFromLanding"
      @selectCommunity="selectCommunityFromLanding"
      @enter-dashboard="enterDashboardDirectly"
      @enterDashboard="enterDashboardDirectly"
    />

    <!-- Page 2: Full-screen Map Dashboard -->
    <div v-else class="relative w-full h-[100svh] overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white">
      <!-- Full-screen Leaflet Map Base Layer -->
      <div class="absolute inset-0 z-0">
        <KokMapPanel
          :map-key="mapTilerKey"
          :waypoints="filteredWaypoints"
          :active-thematic-layer="activeThematicLayer"
          :community-map-type="activeCommunityMapType"
          @update:community-map-type="activeCommunityMapType = $event"
          v-model:flood-stage="floodStage"
          flood-view="depth"
          :flood-sensitivity="false"
          :simulation-visible="simulationVisible"
          :observations-visible="observationsVisible"
          :observation-date="observationDate"
          v-model:selected-community-id="selectedCommunityId"
          :zoom-scope="zoomScope"
          :waterway-request-trigger="waterwayTrigger"
          :virtual-polygon-active="virtualPolygonActive"
          :is-full-screen="true"
          @update:active-thematic-layer="activeThematicLayer = $event"
          @update:zoom-scope="zoomScope = $event"
          @select-waypoint="handleSelectWaypoint($event)"
          @select-grid-cell="selectedGridCell = $event"
          @waterway-loaded="waterwayMessage = $event"
        />
      </div>

      <!-- Floating Top Header Bar -->
      <header class="no-print absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-3 pointer-events-none">
        <div class="pointer-events-auto flex items-center gap-1 shrink-0">
          <!-- Community Target Dropdown (4 Focus Communities) -->
          <KokCommunityDropdown
            v-model="selectedCommunityId"
          />
        </div>

        <!-- Header Actions / Map Actions (Vertical on mobile, horizontal on sm+) -->
        <div class="map-actions pointer-events-auto flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <KokFloodLayersControl v-if="(selectedCommunityId === 'thaton' || selectedCommunityId === 'all') && activeCommunityMapType === 'evacuation'"
            v-model:observations-visible="observationsVisible" v-model:date="observationDate" />
          <button
            type="button"
            aria-label="คู่มือ"
            title="คู่มือ"
            class="round-control"
            :class="{ 'ring-2 ring-[#0284C7] dark:ring-[#00E5FF]': activeQuickPanel === 'guide' }"
            @click="toggleQuickPanel('guide')"
          >
            <BookOpen class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
          </button>
          <button
            type="button"
            aria-label="สรุปรายวันและดูกราฟ"
            title="สรุปรายวันและดูกราฟ"
            class="round-control"
            :class="{ 'ring-2 ring-[#16A34A] dark:ring-[#32D74B]': activeQuickPanel === 'summary' }"
            @click="toggleQuickPanel('summary')"
          >
            <Activity class="h-4 w-4 text-[#16A34A] dark:text-[#32D74B]" />
          </button>
          <button
            type="button"
            aria-label="ระบบแอดมิน Data Table (>50 ppb)"
            title="ระบบแอดมิน Data Table (>50 ppb)"
            class="round-control"
            :class="{ 'ring-2 ring-[#DC2626] dark:ring-[#FF453A]': currentView === 'admin' }"
            @click="navigateToAdmin"
          >
            <ShieldAlert class="h-4 w-4 text-[#DC2626] dark:text-[#FF453A]" />
          </button>
        </div>
      </header>



      <!-- Timeline Slider: แสดงเฉพาะเมื่ออยู่ในแท็บ 'สารเคมีปนเปื้อน' ลอยอยู่เหนือแถบเมนูล่าง -->
      <div
        v-if="activeCommunityMapType === 'chemical'"
        class="pointer-events-none absolute z-20 transition-all duration-300 bottom-[64px] sm:bottom-[58px] left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-[540px]"
      >
        <KokSurveyTimeline
          :waypoints="waypoints"
          v-model="timelineSelectedDate"
          class="pointer-events-auto shadow-2xl"
        />
      </div>

      <!-- Desktop Bottom Bar: Tabs centered at bottom-[9px], Survey Button on right at bottom-[9px] (+4px lifted) -->
      <div class="pointer-events-none hidden sm:flex absolute bottom-[9px] left-1/2 -translate-x-1/2 z-20 items-center justify-center">
        <KokMapTypesControl
          v-model="activeCommunityMapType"
          :community-id="selectedCommunityId"
          class="pointer-events-auto"
        />
      </div>

      <!-- Desktop: ปุ่มทำแบบสำรวจ แสดงเฉพาะเมื่ออยู่ในแท็บ 'สารเคมีปนเปื้อน' -->
      <div v-if="activeCommunityMapType === 'chemical'" class="pointer-events-none hidden sm:block absolute bottom-[9px] right-4 z-20">
        <button
          type="button"
          class="survey-button pointer-events-auto"
          @click="surveyModalOpen = true"
        >
          <ClipboardList class="h-5 w-5" />
          <span>ทำแบบสำรวจ</span>
        </button>
      </div>

      <!-- Mobile: Floating Survey Button (แสดงเฉพาะเมื่ออยู่ในแท็บ 'สารเคมีปนเปื้อน' ลอยเหนือแถบไทม์ไลน์) -->
      <div v-if="activeCommunityMapType === 'chemical'" class="pointer-events-none sm:hidden absolute bottom-[146px] right-3 z-20">
        <button
          type="button"
          class="survey-button pointer-events-auto shadow-xl"
          @click="surveyModalOpen = true"
        >
          <ClipboardList class="h-5 w-5" />
          <span>ทำแบบสำรวจ</span>
        </button>
      </div>

      <!-- Mobile: Bottom Navigation Button Menu (4 tabs as native bottom menu bar) -->
      <div class="sm:hidden fixed bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <KokMapTypesControl
          v-model="activeCommunityMapType"
          :community-id="selectedCommunityId"
          variant="bottom-nav"
        />
      </div>

      <!-- Floating Quick Panels (Guide, Summary, Settings Modals) -->
      <div
        v-if="activeQuickPanel"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="activeQuickPanel = null"
      >
        <div class="wv-card w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4 rounded-2xl border border-slate-200 bg-white/95 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 backdrop-blur-xl"
          :class="activeQuickPanel === 'summary' ? 'max-w-3xl' : 'max-w-lg'">
          <!-- Guide Modal -->
          <div v-if="activeQuickPanel === 'guide'" class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
              <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen class="h-5 w-5 text-[#0284C7] dark:text-[#00E5FF]" />
                <span>คู่มือการใช้งานและชุดตรวจภาคสนาม (R13, R14)</span>
              </h2>
              <button type="button" class="wv-btn-secondary text-xs" @click="activeQuickPanel = null">ปิด</button>
            </div>
            <div class="space-y-3">
              <div class="wv-subsurface">
                <strong class="text-sm text-[#0284C7] dark:text-[#00E5FF]">ขั้นที่ 1: เตรียมน้ำตัวอย่าง</strong>
                <p class="mt-1 text-xs text-slate-600 dark:text-[#98A2A8]">
                  เก็บตัวอย่างน้ำผิวดิน น้ำบ่อ หรือน้ำประปาตามคู่มือชุดตรวจภาคสนาม บันทึกวัน-เวลาและสภาพฝนตามจริง (R04, R11)
                </p>
              </div>
              <div class="wv-subsurface">
                <strong class="text-sm text-[#0284C7] dark:text-[#00E5FF]">ขั้นที่ 2: เทียบแถบสี 9 ระดับ</strong>
                <p class="mt-1 text-xs text-slate-600 dark:text-[#98A2A8]">
                  เทียบสีแผ่นทดสอบกับสเกลมาตรฐาน 9 ระดับ (0, 5, 10, 30, 50, 100, 200, 300, 500 ppb) และถ่ายภาพไว้ 1–2 ภาพ
                </p>
              </div>
              <div class="wv-subsurface">
                <strong class="text-sm text-[#0284C7] dark:text-[#00E5FF]">ขั้นที่ 3: จับพิกัด GPS และกรอกข้อมูลติดต่อ</strong>
                <p class="mt-1 text-xs text-slate-600 dark:text-[#98A2A8]">
                  กดปุ่มจับพิกัด GPS หรือกรอกละติจูด/ลองจิจูด พร้อมชื่อและเบอร์โทรสำหรับทีมงานติดต่อกลับ (ไม่เปิดเผยต่อสาธารณะ)
                </p>
              </div>
              <div class="wv-subsurface">
                <strong class="text-sm text-[#0284C7] dark:text-[#00E5FF]">ขั้นที่ 4: ส่งข้อมูลตามเกณฑ์ POC 50 ppb</strong>
                <p class="mt-1 text-xs text-slate-600 dark:text-[#98A2A8]">
                  ผลตรวจ &lt;= 50 ppb แสดงบนแผนที่สาธารณะทันที ส่วน &gt; 50 ppb เข้าคิวรอแอดมินตรวจสอบก่อนเผยแพร่ (R10)
                </p>
              </div>
            </div>
          </div>

          <!-- Summary Modal with Graphs and Analytics -->
          <div v-else-if="activeQuickPanel === 'summary'" class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
              <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity class="h-5 w-5 text-[#16A34A] dark:text-[#32D74B]" />
                <span>สรุปผลตรวจ คุณภาพน้ำ และกราฟแนวโน้มสารหนู</span>
              </h2>
              <button type="button" class="wv-btn-secondary text-xs" @click="activeQuickPanel = null">ปิด</button>
            </div>
            <p v-if="waypointLoadError" class="wv-alert-box text-xs">
              โหลดข้อมูลไม่สำเร็จ: {{ waypointLoadError }}
            </p>
            <div v-else class="space-y-4">
              <!-- KPI Metric Cards -->
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KokKpiCard surface="subsurface" label="จุดสำรวจที่เผยแพร่" :value="filteredWaypoints.length" />
                <KokKpiCard surface="subsurface" label="ปกติ (&lt; 5 ppb)" :value="statusSummary.normal" value-class="text-[#16A34A] dark:text-[#32D74B]" />
                <KokKpiCard surface="subsurface" label="เฝ้าระวัง (5–10 ppb)" :value="statusSummary.watch" value-class="text-[#CA8A04] dark:text-[#F7E752]" />
                <KokKpiCard surface="subsurface" label="เกินเกณฑ์ คพ. (&gt; 10 ppb)" :value="statusSummary.critical" value-class="text-[#DC2626] dark:text-[#FF453A]" />
              </div>

              <!-- Interactive Graphs -->
              <div class="space-y-4 pt-1">
                <!-- Stacked Bar Chart: Health Status distribution by Day/Month -->
                <KokWaterHealthChart :waypoints="filteredWaypoints" />

                <!-- Arsenic PPB Time Series Chart with 5/10 ppb threshold lines -->
                <KokPPBTrendChart
                  :waypoints="filteredWaypoints"
                  title="แนวโน้มระดับสารหนู (As ppb) ในลุ่มน้ำกกตามลำดับเวลา"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Survey Submission Toast Feedback -->
      <div
        v-if="surveyFeedback"
        role="status"
        class="wv-info-box absolute top-16 right-4 z-40 max-w-md shadow-xl flex items-center justify-between gap-3 text-xs border border-emerald-300 dark:border-emerald-700 bg-white/95 dark:bg-[#1E1E1E]/95"
      >
        <div class="flex items-start gap-2">
          <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-[#32D74B] shrink-0 mt-0.5" />
          <span class="text-slate-800 dark:text-slate-100 font-medium">{{ surveyFeedback }}</span>
        </div>
        <button type="button" class="underline ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400" @click="surveyFeedback = null">ปิด</button>
      </div>

      <!-- K2 Survey Modal Dialog -->
      <KokSurveyModal
        :open="surveyModalOpen"
        @close="surveyModalOpen = false"
        @submitted="handleSurveySubmitted"
      />

      <!-- Point Detail Modal (Selected Marker) -->
      <KokPointDetailModal
        :open="showPointDetailModal"
        :waypoint="selectedWaypoint"
        :all-waypoints="waypoints"
        @close="showPointDetailModal = false"
        @focus="handleFocusWaypoint"
      />
    </div>

    <KokLoadingScreen
      v-if="bootVisible"
      :variant="bootSlow ? 'slow' : 'boot'"
      @retry="retryBoot"
      @skip="bootSkipped = true"
    />
  </UApp>
</template>
