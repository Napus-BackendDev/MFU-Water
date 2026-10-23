<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ObservationDate } from './utils/flood-observations'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Database,
  Download,
  FileText,
  Filter,
  FlaskConical,
  FolderGit2,
  Layers,
  MapPin,
  Megaphone,
  Moon,
  Printer,
  Radio,
  Satellite,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Waves,
  ListFilter,
} from 'lucide-vue-next'
import KokLandingHero from './components/KokLandingHero.vue'
import KokPPBTrendChart from './components/KokPPBTrendChart.vue'
import KokWaterHealthChart from './components/KokWaterHealthChart.vue'
import KokPointDetailModal from './components/KokPointDetailModal.vue'
import KokAdminReviewModal from './components/KokAdminReviewModal.vue'
import KokAdminDataTablePage from './components/KokAdminDataTablePage.vue'
import KokRecordedSamplesModal from './components/KokRecordedSamplesModal.vue'
import type { CommunityMapType } from './utils/community-map-layers'
import { fetchSurveyWaypoints, type SurveyWaypoint } from '../src/lib/survey'
import { createPublicWaypointsCsv } from '../src/lib/water-status'
import {
  aggregateData,
  communityTargets,
  contractData,
  dataQualityAuditRows,
  funderCredits,
  pcdRound22ComparableSeries,
  publicSurveyGridCells,
  surveyDistributionColumns,
  type PublicGridCell,
} from './utils/kok-contract'

const runtimeConfig = useRuntimeConfig()
const mapTilerKey = computed(() => String(runtimeConfig.public.mapTilerApiKey ?? ''))

// Active Workspace Module Tab
type ModuleTab = 'K1' | 'K2' | 'K3' | 'S1' | 'S2' | 'S3' | 'S4_T1' | 'F0'
const activeTab = ref<ModuleTab>('K1')

const moduleTabs: Array<{ id: ModuleTab; code: string; label: string; reqs: string }> = [
  { id: 'K1', code: 'K1', label: 'แผนที่ดาวเทียม & แนวโน้ม', reqs: 'R02, R03, R06, R07, R08, R23' },
  { id: 'K2', code: 'K2', label: 'ส่งผลตรวจ & คิวแอดมิน >50 ppb', reqs: 'R04, R05, R06, R10, R11' },
  { id: 'K3', code: 'K3', label: 'แจ้งผู้ประสานงาน & ช่องทางเตือนภัย', reqs: 'R01' },
  { id: 'S1', code: 'S1', label: 'ข้อมูลสำรวจท่าตอน & แผนเผชิญเหตุ', reqs: 'R15, R16, R19, R22, R24' },
  { id: 'S2', code: 'S2', label: 'เรื่องเล่า เส้นเวลา ดาวเทียม & บอร์ด A0', reqs: 'R17, R20, R21, R25' },
  { id: 'S3', code: 'S3', label: 'คู่มือชุดตรวจ 4 ขั้น & SWOT', reqs: 'R13, R14' },
  { id: 'S4_T1', code: 'S4 + T1', label: 'รายงานวิจัย ตรวจคุณภาพ & เหมือง Stimson', reqs: 'R09, R18, R26, R27' },
  { id: 'F0', code: 'F0', label: 'ทะเบียน 29 Req · 27 หลักฐาน · ทีม 12 คน', reqs: 'R12, R28, R29' },
]

// Public waypoints from Express + Supabase
const waypoints = ref<SurveyWaypoint[]>([])
const loadingWaypoints = ref(true)
const waypointLoadError = ref<string | null>(null)
const exportFeedback = ref<string | null>(null)
const surveyFeedback = ref<string | null>(null)

// Survey Modal & Quick Panels
const surveyModalOpen = ref(false)
const activeQuickPanel = ref<'guide' | 'summary' | 'settings' | null>(null)

// Map & Filter State (R02, R03, R08, R23)
const activeThematicLayer = ref<'arsenic' | 'survey_grid'>('arsenic')
const activeCommunityMapType = ref<CommunityMapType | null>(null)
const floodStage = ref(2.5)
const simulationVisible = ref(true)
const observationsVisible = ref(false)
const observationDate = ref<ObservationDate>('2024-09-15')
const selectedCommunityId = ref<'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'>('all')
const zoomScope = ref<'inner' | 'outer'>('inner')
const selectedTimeRange = ref<'today' | '24h' | '7d' | '30d' | 'all'>('all')
const selectedStatusFilter = ref<'all' | 'normal' | 'alert'>('all')
const waterwayTrigger = ref(0)
const waterwayMessage = ref<string | null>(null)
const virtualPolygonActive = ref(false)

watch(activeCommunityMapType, (newType) => {
  if ((newType === 'flood' || newType === 'evacuation') && selectedCommunityId.value === 'all') {
    selectedCommunityId.value = 'thaton'
  }
})

// Selected Map Item for Right Inspector
const selectedWaypoint = ref<SurveyWaypoint | null>(null)
const showPointDetailModal = ref(false)
const showRecordedSamplesModal = ref(false)
const showAdminModal = ref(false)

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
const activeComparableSeries = computed(
  () => pcdRound22ComparableSeries.find((s) => s.seriesId === selectedSeriesId.value) ?? pcdRound22ComparableSeries[0]!,
)

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

function updateReviewItemStatus(
  item: ReviewQueueItem,
  nextStatus: 'approved_published' | 'revision_requested' | 'rejected',
) {
  item.status = nextStatus
  if (nextStatus === 'approved_published') {
    item.reviewerNote = 'อนุมัติโดยผู้ดูแลระบบแล้ว: อนุญาตให้นำขึ้นแผนที่สาธารณะ'
  } else if (nextStatus === 'revision_requested') {
    item.reviewerNote = 'ขอให้ผู้ส่งตรวจสอบภาพถ่ายแถบสีหรือเก็บตัวอย่างซ้ำ'
  } else {
    item.reviewerNote = 'ไม่เผยแพร่สู่สาธารณะเนื่องจากหลักฐานไม่ครบถ้วน'
  }
}

// K3 / R01 Coordinator Notice State Machine (draft -> approved -> sent -> ack)
const coordinatorWorkflowState = ref<'draft' | 'approved' | 'sent' | 'ack'>('draft')
const coordinatorTargetCommunity = ref('บ้านท่าตอน หมู่ 3 (หอกระจายข่าว 103/129 แถว)')
const coordinatorMessageText = ref(
  'แจ้งเตือนผลเฝ้าระวังคุณภาพน้ำแม่น้ำกก: ขอให้ผู้ใช้น้ำผิวดินริมแม่น้ำกกตรวจสอบประกาศจุดตรวจล่าสุดของชุมชน และหลีกเลี่ยงการนำน้ำแม่น้ำกกมาดื่มหรือปรุงอาหารโดยตรง',
)
const coordinatorReviewerName = ref('ผู้ประสานงานศูนย์วิจัย มฟล.')
const coordinatorAckLog = ref<string[]>([
  'สถานะเริ่มต้น: ร่างข้อความแจ้งเตือน รอตรวจทานก่อนส่งต่อ (การเปิดอ่านหน้าจอนี้ไม่นับเป็นการยืนยันรับทราบ R01)',
])

function advanceCoordinatorWorkflow(target: 'approved' | 'sent' | 'ack' | 'reset') {
  const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  if (target === 'reset') {
    coordinatorWorkflowState.value = 'draft'
    coordinatorAckLog.value.unshift(`[${timestamp}] รีเซ็ตสถานะกลับเป็นร่างข้อความ (draft)`)
    return
  }
  if (target === 'approved' && coordinatorWorkflowState.value === 'draft') {
    coordinatorWorkflowState.value = 'approved'
    coordinatorAckLog.value.unshift(`[${timestamp}] อนุมัติข้อความโดย ${coordinatorReviewerName.value} พร้อมส่งต่อช่องทางชุมชน`)
  } else if (target === 'sent' && coordinatorWorkflowState.value === 'approved') {
    coordinatorWorkflowState.value = 'sent'
    coordinatorAckLog.value.unshift(`[${timestamp}] ส่งต่อข้อความไปยัง ${coordinatorTargetCommunity.value} เรียบร้อยแล้ว`)
  } else if (target === 'ack' && coordinatorWorkflowState.value === 'sent') {
    coordinatorWorkflowState.value = 'ack'
    coordinatorAckLog.value.unshift(`[${timestamp}] ผู้ประสานงานพื้นที่ยืนยันรับทราบและบันทึกการกระจายข่าวแล้ว`)
  }
}

// S1 Column Distribution Selector
const distributionColumns = surveyDistributionColumns
const selectedDistributionCol = ref(distributionColumns[1]?.colKey ?? distributionColumns[0]?.colKey ?? '70')
const currentDistribution = computed(
  () => distributionColumns.find((d) => d.colKey === selectedDistributionCol.value) ?? distributionColumns[0]!,
)

// S1 / R19 Simulated Assistance Case Form
const assistNeedType = ref('ขอรับการสนับสนุนน้ำดื่มสะอาด / ถังเก็บน้ำ')
const assistZone = ref('หย่อมบ้านหมู่ 3 ท่าตอน (อ้างอิงกริด 1 กม. ไม่ระบุพิกัดบ้าน)')
const assistCoordinatorNote = ref('')
const assistCases = ref([
  {
    caseCode: 'SIM-CASE-01',
    zone: 'บ้านท่าตอน หมู่ 3 (ระดับหย่อมบ้าน)',
    need: 'ขอตรวจซ้ำแหล่งน้ำประปาภูเขาและสำรองน้ำดื่ม (ความต้องการอันดับ 1: 91/129 แถว)',
    status: 'ส่งต่อผู้ประสานงานแล้ว',
  },
])

function addSimulatedAssistCase() {
  const nextIdx = assistCases.value.length + 1
  assistCases.value.unshift({
    caseCode: `SIM-CASE-0${nextIdx}`,
    zone: assistZone.value,
    need: `${assistNeedType.value}${assistCoordinatorNote.value ? ` — ${assistCoordinatorNote.value}` : ''}`,
    status: 'รับเรื่องในคิวผู้ประสานงาน (จำลองภายใน ไม่เปิดเผย PII)',
  })
  assistCoordinatorNote.value = ''
}

// S2 / R21 Print A0 Board Topic Selector
const printBoardTopic = ref<'grid' | 'contingency' | 'satellite' | 'strip'>('grid')

function triggerPrintBoard() {
  if (typeof window !== 'undefined') window.print()
}

// F0 Explorer Search & Filters
const reqSearchQuery = ref('')
const reqPriorityFilter = ref<'ALL' | 'Key' | 'Secondary' | 'Third' | 'Foundation'>('ALL')

const enrichedRequirements = computed(() => {
  const evMap = contractData.requirement_evidence as Record<
    string,
    { sources: string[]; line: string; actual: string; display: string; work: string; accept: string }
  >
  return contractData.requirements.map((req) => {
    const matchedFeature = contractData.features.features.find((f) => f.reqs.includes(req.id))
    const featureCode = matchedFeature?.id ?? 'F0'
    const priority: 'Key' | 'Secondary' | 'Third' | 'Foundation' =
      featureCode === 'K1' || featureCode === 'K2' || featureCode === 'K3'
        ? 'Key'
        : featureCode === 'S1' || featureCode === 'S2' || featureCode === 'S3' || featureCode === 'S4'
          ? 'Secondary'
          : featureCode === 'T1'
            ? 'Third'
            : 'Foundation'
    const ev = evMap[req.id]
    return {
      ...req,
      featureCode,
      priority,
      actual: ev?.actual ?? '',
      display: ev?.display ?? '',
      work: ev?.work ?? '',
      accept: ev?.accept ?? '',
      sources: ev?.sources ?? [],
      teams: matchedFeature?.teams ?? ['F', 'PM'],
    }
  })
})

const filteredRequirements = computed(() => {
  const q = reqSearchQuery.value.trim().toLowerCase()
  return enrichedRequirements.value.filter((req) => {
    if (reqPriorityFilter.value !== 'ALL' && req.priority !== reqPriorityFilter.value) return false
    if (!q) return true
    return (
      req.id.toLowerCase().includes(q) ||
      req.title.toLowerCase().includes(q) ||
      req.featureCode.toLowerCase().includes(q) ||
      req.actual.toLowerCase().includes(q) ||
      req.detail.toLowerCase().includes(q)
    )
  })
})

// Filtered Public Waypoints (R08)
const filteredWaypoints = computed(() => {
  const now = Date.now()
  return waypoints.value.filter((wp) => {
    // R10 safety: only <= 50 ppb in public waypoints
    if (wp.arsenic_level_ppb > 50 && wp.publication_status !== 'approved') return false

    if (selectedStatusFilter.value === 'normal' && wp.arsenic_level_ppb > 10) return false
    if (selectedStatusFilter.value === 'alert' && wp.arsenic_level_ppb <= 10) return false

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

// SVG Area Chart path generator for R07 Comparable Trend
const chartGeometry = computed(() => {
  const pts = activeComparableSeries.value.points
  const width = 640
  const height = 210
  const padLeft = 44
  const padRight = 24
  const padTop = 24
  const padBottom = 36
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const maxVal = 35

  const coords = pts.map((pt, index) => {
    const x = padLeft + (pts.length > 1 ? (index / (pts.length - 1)) * innerW : innerW / 2)
    const y = padTop + innerH - (Math.min(pt.ppb, maxVal) / maxVal) * innerH
    return { x, y, ...pt }
  })

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0]!.x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : ''
  const threshold10Y = padTop + innerH - (10 / maxVal) * innerH

  return { width, height, padLeft, padRight, padTop, padBottom, coords, linePath, areaPath, threshold10Y }
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

function exportPublicCsv() {
  exportFeedback.value = null
  if (filteredWaypoints.value.length === 0) {
    exportFeedback.value = 'ยังไม่มีผลตรวจให้ส่งออก'
    return
  }
  const csvContent = createPublicWaypointsCsv(filteredWaypoints.value)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `kok-public-waypoints-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  exportFeedback.value = `ส่งออก CSV สาธารณะ ${filteredWaypoints.value.length} รายการเรียบร้อย (ไม่มีชื่อ-เบอร์โทร และไม่รวมรายการรอตรวจ >50 ppb)`
}

function toggleQuickPanel(panel: 'guide' | 'summary' | 'settings') {
  activeQuickPanel.value = activeQuickPanel.value === panel ? null : panel
}

// View navigation state: 'landing' (Page 1), 'dashboard' (Page 2), or 'admin' (Dedicated Admin Data Table Page)
type AppView = 'landing' | 'dashboard' | 'admin'
const currentView = ref<AppView>('landing')

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
  selectedCommunityId.value = id
  currentView.value = 'dashboard'
}

function enterDashboardDirectly() {
  selectedCommunityId.value = 'all'
  currentView.value = 'dashboard'
}

function returnToLanding() {
  currentView.value = 'landing'
}

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

onMounted(() => {
  void loadPublicWaypoints()
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('theme') === 'dark') {
      colorMode.preference = 'dark'
    } else {
      colorMode.preference = 'light'
    }

    if (params.get('view') === 'admin') {
      currentView.value = 'admin'
    } else if (params.get('view') === 'dashboard' || params.has('community')) {
      const comm = params.get('community')
      if (comm && ['all', 'thaton', 'ruammit', 'pongkhong', 'pakingtai'].includes(comm)) {
        selectedCommunityId.value = comm as any
      }
      currentView.value = 'dashboard'
    }
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
      <header class="no-print absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div class="pointer-events-auto flex items-center gap-2">
          <!-- Back to Landing Button -->
          <button
            type="button"
            class="wv-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 bg-white/95 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 backdrop-blur-md text-[#0284C7] dark:text-[#00E5FF] shadow-lg hover:border-[#0284C7] dark:hover:border-[#00E5FF] transition"
            @click="returnToLanding"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>เลือกพื้นที่ (หน้าแรก)</span>
          </button>

          <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 px-3 py-1.5 backdrop-blur-md shadow-lg">
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00E5FF]/20 text-[#0284C7] dark:text-[#00E5FF]">
              <Waves class="h-3.5 w-3.5" />
            </div>
            <strong class="text-xs font-semibold text-slate-900 dark:text-white hidden sm:inline">MFU Kok Water Watch</strong>
          </div>
        </div>

        <!-- Header Actions / Map Actions -->
        <div class="map-actions pointer-events-auto flex items-center gap-2">
          <KokFloodLayersControl v-if="(selectedCommunityId === 'thaton' || selectedCommunityId === 'all') && (activeCommunityMapType === 'flood' || activeCommunityMapType === 'evacuation')"
            v-model:stage="floodStage" v-model:simulation-visible="simulationVisible" v-model:observations-visible="observationsVisible" v-model:date="observationDate" />
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
            aria-label="ประวัติผลตรวจที่บันทึกไว้"
            title="ประวัติผลตรวจที่บันทึกไว้"
            class="round-control"
            :class="{ 'ring-2 ring-[#0284C7] dark:ring-[#00E5FF]': showRecordedSamplesModal }"
            @click="showRecordedSamplesModal = true"
          >
            <Database class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
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
          <button
            type="button"
            aria-label="ตั้งค่า"
            title="ตั้งค่า"
            class="round-control"
            :class="{ 'ring-2 ring-[#0284C7] dark:ring-[#00E5FF]': activeQuickPanel === 'settings' }"
            @click="toggleQuickPanel('settings')"
          >
            <Settings class="h-4 w-4 text-slate-600 dark:text-[#98A2A8]" />
          </button>
          <button
            type="button"
            aria-label="สลับโหมดสว่าง/โหมดมืด"
            title="สลับโหมดสว่าง/โหมดมืด"
            class="round-control"
            @click="toggleTheme"
          >
            <Sun v-if="!isDark" class="h-4 w-4 text-[#F59E0B]" />
            <Moon v-else class="h-4 w-4 text-[#00E5FF]" />
          </button>
          <button
            type="button"
            aria-label="Export ข้อมูล"
            title="Export ข้อมูล"
            class="round-control"
            @click="exportPublicCsv"
          >
            <Download class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
          </button>
        </div>
      </header>



      <!-- Floating Bottom Center: Map Types -->
      <div class="pointer-events-none absolute bottom-24 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <KokMapTypesControl v-model="activeCommunityMapType" :community-id="selectedCommunityId" />
      </div>

      <!-- Floating Bottom Right: Survey Button -->
      <div class="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          class="survey-button"
          @click="surveyModalOpen = true"
        >
          <ClipboardList class="h-5 w-5" />
          <span>ทำแบบสำรวจ</span>
        </button>
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
                <div class="wv-subsurface">
                  <span class="text-xs text-slate-500 dark:text-[#98A2A8]">จุดสำรวจที่เผยแพร่</span>
                  <div class="wv-kpi-number mt-1 text-slate-900 dark:text-white">{{ filteredWaypoints.length }}</div>
                </div>
                <div class="wv-subsurface">
                  <span class="text-xs text-slate-500 dark:text-[#98A2A8]">ปกติ (&lt; 5 ppb)</span>
                  <div class="wv-kpi-number mt-1 text-[#16A34A] dark:text-[#32D74B]">{{ statusSummary.normal }}</div>
                </div>
                <div class="wv-subsurface">
                  <span class="text-xs text-slate-500 dark:text-[#98A2A8]">เฝ้าระวัง (5–10 ppb)</span>
                  <div class="wv-kpi-number mt-1 text-[#CA8A04] dark:text-[#F7E752]">{{ statusSummary.watch }}</div>
                </div>
                <div class="wv-subsurface">
                  <span class="text-xs text-slate-500 dark:text-[#98A2A8]">เกินเกณฑ์ คพ. (&gt; 10 ppb)</span>
                  <div class="wv-kpi-number mt-1 text-[#DC2626] dark:text-[#FF453A]">{{ statusSummary.critical }}</div>
                </div>
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

          <!-- Settings Modal -->
          <div v-else-if="activeQuickPanel === 'settings'" class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
              <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings class="h-5 w-5 text-[#0284C7] dark:text-[#00E5FF]" />
                <span>ตั้งค่าแผนที่ เส้นทางน้ำ OSM และพื้นที่จำลอง</span>
              </h2>
              <button type="button" class="wv-btn-secondary text-xs" @click="activeQuickPanel = null">ปิด</button>
            </div>
            <p class="text-xs text-slate-600 dark:text-[#98A2A8]">
              หมายเหตุความซื่อสัตย์ของข้อมูล: ระบบยังไม่เชื่อมข้อมูลสถานีวัดการไหลของน้ำแบบเรียลไทม์ เส้นทางน้ำดึงจาก OpenStreetMap Overpass API เพื่อใช้เป็นบริบทเชิงพื้นที่เท่านั้น
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="wv-btn-primary text-xs"
                @click="waterwayTrigger += 1"
              >
                <Waves class="h-4 w-4" />
                <span>โหลดเส้นทางน้ำในแผนที่</span>
              </button>
              <button
                type="button"
                class="wv-btn-secondary text-xs"
                :class="{ 'is-active': virtualPolygonActive }"
                @click="virtualPolygonActive = !virtualPolygonActive"
              >
                <Sparkles class="h-4 w-4 text-[#16A34A] dark:text-[#32D74B]" />
                <span>พื้นที่จำลอง</span>
              </button>
            </div>
            <p v-if="virtualPolygonActive" class="text-xs text-[#16A34A] dark:text-[#32D74B]">
              โหมดพื้นที่จำลองทำงานอยู่บนเบราว์เซอร์เท่านั้น (ไม่บันทึก/ไม่ส่งออกเป็นขอบเขตหมู่บ้านจริงตามกติกา R09)
            </p>
            <p v-if="waterwayMessage" class="text-xs text-[#0284C7] dark:text-[#00E5FF]">
              {{ waterwayMessage }}
            </p>
          </div>
        </div>
      </div>

      <!-- Export Toast Feedback -->
      <div
        v-if="exportFeedback"
        role="status"
        class="wv-info-box absolute top-16 right-4 z-40 max-w-md shadow-xl flex items-center justify-between gap-3 text-xs"
      >
        <span>{{ exportFeedback }}</span>
        <button type="button" class="underline ml-2" @click="exportFeedback = null">ปิด</button>
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

      <!-- Recorded Samples History Modal -->
      <KokRecordedSamplesModal
        :open="showRecordedSamplesModal"
        :waypoints="waypoints"
        @close="showRecordedSamplesModal = false"
        @select-waypoint="handleSelectWaypoint"
        @focus-waypoint="handleFocusWaypoint"
      />

      <!-- Admin Review Modal (>50 ppb) -->
      <KokAdminReviewModal
        :open="showAdminModal"
        @close="showAdminModal = false"
        @sample-reviewed="loadPublicWaypoints"
      />
    </div>
  </UApp>
</template>
