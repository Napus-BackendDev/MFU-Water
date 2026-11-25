<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPin, Newspaper, RefreshCw, ShieldAlert, Users } from 'lucide-vue-next'
import type { AdminMapData } from '../composables/useAdminMapData'
import { useSampleFilters } from '../composables/useSampleFilters'
import type { HamletRow, MapDataSummary } from '../utils/map-data-admin'
import { formatThaiDate, type AdminCounts, type AdminSample } from '../utils/admin-types'
import type { PublicPlace } from '../../src/lib/map-data'
import { COMMUNITY_OPTIONS } from '../utils/news-types'
import { actionButtonClass, adminCardClass } from '../utils/admin-ui'
import { chipClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import { householdPinPath, type EditorMarker } from '../utils/map-pin'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import KokAdminFilters from './KokAdminFilters.vue'
import KokAdminSampleTable from './KokAdminSampleTable.vue'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'

const props = withDefaults(defineProps<{
  ctx: AdminMapData
  pendingSamplesCount?: number
  samples?: AdminSample[]
  selectedSampleCode?: string | null
  readOnlySamples?: boolean
}>(), {
  pendingSamplesCount: 0,
  samples: () => [],
  selectedSampleCode: null,
  readOnlySamples: false,
})

const emit = defineEmits<{
  (e: 'go', tab: 'hamlets' | 'samples' | 'evacuation' | 'places'): void
  (e: 'goNews'): void
  (e: 'selectSample', sample: AdminSample): void
  (e: 'editSample', sample: AdminSample): void
  (e: 'deleteSample', sample: AdminSample): void
}>()

const summary = ref<MapDataSummary | null>(null)
const hamletsList = ref<HamletRow[]>([])
const placedPlaces = ref<PublicPlace[]>([])
const pendingPlacesCount = ref(0)
const publicPointsEnabled = ref(false)
const fitToken = ref(0)

const communityLabel = computed(() => COMMUNITY_OPTIONS.find((c) => c.value === props.ctx.community.value)?.label ?? props.ctx.community.value)

async function load(manual = false) {
  const { client, run } = props.ctx
  const [loaded, hamletsRes, placesPreview, communityPreview] = await Promise.all([
    run('summary', () => client.summary(), manual ? `รีเฟรชข้อมูลภาพรวม ${communityLabel.value} เรียบร้อยแล้ว` : undefined),
    client.hamlets.list().catch(() => null),
    client.preview('places', props.ctx.community.value).catch(() => null),
    client.preview('community').catch(() => null),
  ])
  if (loaded) summary.value = loaded
  hamletsList.value = hamletsRes?.items ?? []
  placedPlaces.value = placesPreview?.placed ?? []
  pendingPlacesCount.value = placesPreview?.pending?.length ?? 0
  publicPointsEnabled.value = Boolean(communityPreview?.pointsPublic)
  fitToken.value += 1
}

onMounted(() => load(false))
watch(() => props.ctx.community.value, () => load(false))

const levelCount = (key: string) => summary.value?.households?.byLevel?.find((l) => l.key === key)?.count ?? 0
const inQueue = computed(() => levelCount('1') + levelCount('2') + levelCount('4'))
const queueBreakdown = computed(() => `ระดับ 1: ${levelCount('1')} · ระดับ 2: ${levelCount('2')} · ระดับ 3: ${levelCount('4')}`)

const shelterOrAssemblyCount = computed(() => placedPlaces.value.filter((p) => p.kind === 'shelter' || p.kind === 'assembly').length)

const highArsenicSamples = computed(() =>
  props.samples
    .filter((s) => (s.arsenic_ppb ?? 0) > 50 || s.publication_status === 'pending_review')
    .sort((a, b) => {
      if (a.publication_status === 'pending_review' && b.publication_status !== 'pending_review') return -1
      if (a.publication_status !== 'pending_review' && b.publication_status === 'pending_review') return 1
      return String(b.collection_time || '').localeCompare(String(a.collection_time || ''))
    }),
)

const highArsenicCounts = computed<AdminCounts>(() => {
  const list = highArsenicSamples.value
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
  return { total: list.length, pending, approved, autoPublished, rejected }
})

const {
  tab: sampleTab,
  severity: sampleSeverity,
  timeRange: sampleTimeRange,
  timeOrder: sampleTimeOrder,
  toggleTimeOrder: toggleSampleTimeOrder,
  query: sampleQuery,
  page: samplePage,
  pageSize: samplePageSize,
  filtered: filteredHighArsenicSamples,
  paged: pagedHighArsenicSamples,
} = useSampleFilters(highArsenicSamples)
samplePageSize.value = 5

watch(() => props.ctx.community.value, () => {
  samplePage.value = 1
})

const mapMarkers = computed<EditorMarker[]>(() => [
  ...hamletsList.value
    .filter((h) => h.center && Number.isFinite(h.center.latitude) && Number.isFinite(h.center.longitude))
    .map((h) => ({
      id: `hamlet-${h.id}`,
      latitude: h.center!.latitude,
      longitude: h.center!.longitude,
      label: `${h.name} (${h.household_count ?? 0} ครัวเรือน)`,
      color: '#0284C7',
      path: householdPinPath,
    })),
  ...placedPlaces.value
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: `place-${p.id}`,
      latitude: p.latitude!,
      longitude: p.longitude!,
      label: p.name,
      color: p.evacuationColor || '#059669',
      path: p.path || householdPinPath,
    })),
])

const readinessItems = computed(() => {
  const unassigned = summary.value?.hamlets?.unassigned ?? 0
  const waitingPlaces = summary.value?.places?.waitingLocation ?? 0
  return [
    {
      tab: 'hamlets' as const,
      icon: Users,
      title: 'หมู่บ้านและการ์ดรู้จักชุมชน',
      detail: unassigned > 0
        ? `ลงทะเบียน ${summary.value?.hamlets?.total ?? 0} หมู่บ้าน · ยังไม่ผูกหมู่บ้าน ${unassigned} ครัวเรือน`
        : `ลงทะเบียนครบ ${summary.value?.hamlets?.total ?? 0} หมู่บ้าน`,
      ok: unassigned === 0 && (summary.value?.hamlets?.total ?? 0) > 0,
      badge: unassigned > 0 ? `รอผูก ${unassigned}` : 'พร้อม',
    },
    {
      tab: 'samples' as const,
      icon: ShieldAlert,
      title: 'ตรวจตัวอย่างน้ำ >50 ppb',
      detail: props.pendingSamplesCount > 0
        ? `มีผลตรวจภาคสนามรออนุมัติ ${props.pendingSamplesCount} รายการ`
        : 'ไม่มีตัวอย่างน้ำค้างรออนุมัติ',
      ok: props.pendingSamplesCount === 0,
      badge: props.pendingSamplesCount > 0 ? `รออนุมัติ ${props.pendingSamplesCount}` : 'ปกติ',
    },
    {
      tab: 'evacuation' as const,
      icon: Users,
      title: 'กลุ่มเปราะบางและคิวอพยพ',
      detail: `คิวอพยพ ${inQueue.value} ราย`,
      ok: inQueue.value > 0,
      badge: inQueue.value > 0 ? 'พร้อม' : 'ยังไม่มีข้อมูล',
    },
    {
      tab: 'places' as const,
      icon: MapPin,
      title: 'สถานที่สำคัญและศูนย์พักพิง',
      detail: waitingPlaces > 0
        ? `ใช้งาน ${summary.value?.places?.published ?? 0} แห่ง · รอปักหมุด ${waitingPlaces} แห่ง`
        : `ใช้งาน ${summary.value?.places?.published ?? 0} แห่ง (ศูนย์พักพิง/จุดรวมพล ${shelterOrAssemblyCount.value})`,
      ok: waitingPlaces === 0 && shelterOrAssemblyCount.value > 0,
      badge: waitingPlaces > 0 ? `รอปักจุด ${waitingPlaces}` : shelterOrAssemblyCount.value > 0 ? 'พร้อม' : 'ขาดศูนย์พักพิง',
    },
  ]
})
</script>

<template>
  <div v-if="summary" class="space-y-4">
    <!-- 4 Core KPI Cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
      <KokKpiCard
        label="หมู่บ้านในชุมชน"
        :value="summary.hamlets?.total ?? 0"
        tone="amber"
        :caption="`ครัวเรือนยังไม่ผูกหมู่บ้าน ${summary.hamlets?.unassigned ?? 0} หลัง`"
      />
      <KokKpiCard
        label="ตัวอย่างน้ำรออนุมัติ"
        :value="pendingSamplesCount"
        :tone="pendingSamplesCount > 0 ? 'rose' : 'emerald'"
        :caption="pendingSamplesCount > 0 ? 'ผล >50 ppb รอตรวจสอบ' : 'ไม่มีรายการค้างอนุมัติ'"
      />
      <KokKpiCard
        label="อยู่ในคิวอพยพ"
        :value="inQueue"
        tone="rose"
        :caption="queueBreakdown"
      />
      <KokKpiCard
        label="สถานที่สำคัญที่ใช้งาน"
        :value="summary.places?.published ?? 0"
        tone="emerald"
        :caption="`ทั้งหมด ${summary.places?.total ?? 0} แห่ง · รอผูกจุด ${summary.places?.waitingLocation ?? 0}`"
      />
    </div>

    <!-- Main 2-Column Overview: Mini Map + Village Readiness -->
    <div class="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
      <!-- Left: Mini Map of Selected Community -->
      <section :class="adminCardClass" class="p-4 sm:p-5" aria-label="แผนที่ย่อของชุมชน">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 :class="sectionTitleClass">แผนที่ภาพรวม · {{ communityLabel }}</h2>
            <p :class="mutedClass" class="mt-0.5">แสดงหมุดหมู่บ้านและสถานที่สำคัญที่ใช้งาน</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="รีเฟรชข้อมูลภาพรวม"
              :class="actionButtonClass"
              class="px-2.5!"
              :disabled="ctx.busy.value !== null"
              @click="load(true)"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': ctx.busy.value !== null }" />
            </button>
            <a
              :href="`/?community=${ctx.community.value}`"
              target="_blank"
              rel="noopener"
              :class="actionButtonClass"
            >
              <ExternalLink class="h-3.5 w-3.5" />
              <span>เปิดหน้าบ้าน</span>
            </a>
            <button
              type="button"
              :class="actionButtonClass"
              @click="emit('goNews')"
            >
              <Newspaper class="h-3.5 w-3.5" />
              <span>จัดการข่าวสาร</span>
            </button>
          </div>
        </div>

        <KokAdminMapEditor
          :community="ctx.community.value"
          :markers="mapMarkers"
          :fit-token="fitToken"
          height-class="h-[340px] sm:h-[400px]"
        />

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-[#98A2A8]">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-[#0284C7]" /> หมู่บ้าน ({{ hamletsList.length }})
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-[#059669]" /> สถานที่สำคัญ ({{ placedPlaces.length }})
          </span>
        </div>
      </section>

      <!-- Right: Village Readiness & Direct Actions -->
      <section :class="adminCardClass" class="p-4 sm:p-5" aria-label="ความพร้อมของชุมชนและทางลัดจัดการ">
        <div class="flex items-center justify-between gap-2">
          <h2 :class="sectionTitleClass">ความพร้อมของชุมชนนี้</h2>
          <span :class="chipClass(publicPointsEnabled ? 'emerald' : 'slate')">
            {{ publicPointsEnabled ? 'เปิดแสดงจุดหน้าบ้าน' : 'ข้อมูลภาพรวมสาธารณะ' }}
          </span>
        </div>
        <p :class="mutedClass" class="mt-1">ตรวจเช็กความครบถ้วนและกดเข้าจัดการเฉพาะส่วนของ {{ communityLabel }}</p>

        <ul class="mt-4 divide-y divide-slate-100 dark:divide-[#2C2C2E]">
          <li
            v-for="item in readinessItems"
            :key="item.tab"
            class="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-1"
          >
            <div class="flex min-w-0 items-start gap-2.5">
              <div
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                :class="item.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'"
              >
                <component :is="item.icon" class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[13px] font-bold text-slate-900 dark:text-white">{{ item.title }}</span>
                  <span :class="chipClass(item.ok ? 'emerald' : 'amber')" class="inline-flex items-center gap-1">
                    <CheckCircle2 v-if="item.ok" class="h-3 w-3" />
                    <AlertTriangle v-else class="h-3 w-3" />
                    {{ item.badge }}
                  </span>
                </div>
                <p :class="mutedClass" class="mt-0.5">{{ item.detail }}</p>
              </div>
            </div>
            <button
              type="button"
              :class="actionButtonClass"
              class="shrink-0"
              @click="emit('go', item.tab)"
            >
              จัดการ
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- High Arsenic (>50 ppb) Water Samples Table (reusing KokAdminFilters + KokAdminSampleTable + KokPagination, 5 rows default) -->
    <section :class="adminCardClass" class="min-w-0 overflow-hidden" aria-label="ตารางตรวจตัวอย่างน้ำ >50 ppb">
      <div class="space-y-3 border-b border-slate-100 p-4 sm:px-5 dark:border-[#2C2C2E]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 :class="sectionTitleClass">ตรวจตัวอย่างน้ำ &gt;50 ppb · {{ communityLabel }}</h2>
            <p :class="mutedClass" class="mt-0.5">รายการผลตรวจสารหนูเกินเกณฑ์ 50 ppb และรายการรออนุมัติในชุมชนนี้</p>
          </div>
          <button type="button" :class="actionButtonClass" @click="emit('go', 'samples')">
            จัดการตัวอย่างน้ำทั้งหมด
          </button>
        </div>
        <KokAdminFilters
          v-model:tab="sampleTab"
          v-model:severity="sampleSeverity"
          v-model:time-range="sampleTimeRange"
          v-model:query="sampleQuery"
          :counts="highArsenicCounts"
        />
      </div>

      <KokAdminSampleTable
        :items="pagedHighArsenicSamples"
        :loading="false"
        :selected="selectedSampleCode"
        :read-only="readOnlySamples"
        :time-order="sampleTimeOrder"
        @select="emit('selectSample', $event)"
        @edit="emit('editSample', $event)"
        @delete="emit('deleteSample', $event)"
        @toggle-time-order="toggleSampleTimeOrder"
      />
      <KokPagination
        v-if="filteredHighArsenicSamples.length > 0"
        v-model:page="samplePage"
        v-model:page-size="samplePageSize"
        :total="filteredHighArsenicSamples.length"
      />
    </section>
  </div>
  <div v-else-if="ctx.feedback.value?.type === 'error'" :class="adminCardClass" class="p-6 text-center text-sm text-rose-700 dark:text-rose-300">
    <ShieldAlert class="mx-auto mb-2 h-6 w-6" />{{ ctx.feedback.value.message }}
  </div>
</template>
