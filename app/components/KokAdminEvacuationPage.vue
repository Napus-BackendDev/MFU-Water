<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  HelpCircle,
  LocateFixed,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import {
  MEMBERS_FIELD,
  UNKNOWN_ANSWER,
  ZONE_FIELD,
  evacuationDestinations,
  hamletNameOf,
  householdFields,
} from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import {
  buildEvacuationQueue,
  type EvacuationDestination,
  type HouseholdSourceRecord,
} from '../utils/evacuation-queue'
import type { HamletRow, HouseholdRow, MapDataClient } from '../utils/map-data-admin'
import { householdPinPath, type EditorMarker } from '../utils/map-pin'
import { actionButtonClass, adminCardClass, pillClass, primaryButtonClass, searchFieldClass } from '../utils/admin-ui'
import { chipClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokAdminHouseholdModal, { type HouseholdFormState } from './KokAdminHouseholdModal.vue'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import KokModalShell from './KokModalShell.vue'
import KokPagination from './KokPagination.vue'

type LevelFilter = 'queued' | '1' | '2' | '4' | '5' | 'all'

const props = defineProps<{ ctx: AdminMapData }>()
const { client, run, busy, publicView } = props.ctx

type Overview = Awaited<ReturnType<MapDataClient['evacuation']['overview']>>
const overview = ref<Overview | null>(null)
const households = ref<HouseholdRow[]>([])
const hamlets = ref<HamletRow[]>([])
const fitToken = ref(0)
const focusArea = ref<{ points: Array<[number, number]>; zoom?: number; nonce: number } | null>(null)
const householdForm = ref<HouseholdFormState | null>(null)
const deletingHouseholdId = ref<string | null>(null)

const displayLevel = (key: string) => (key === '4' ? '3' : key === '5' ? '4' : key)
const levelFilter = ref<LevelFilter>('all')
const query = ref('')
const page = ref(1)
const pageSize = ref(5)
const selectedId = ref<string | null>(null)
const showRules = ref(false)

async function load(refit = false) {
  const comm = props.ctx.community.value
  const [loaded, list, hamletList] = await Promise.all([
    run('evacuation', () => client.evacuation.overview(comm)),
    run('households', () => client.households.list({ pageSize: 200, community: comm })),
    run('hamlets', () => client.hamlets.list()),
  ])
  if (loaded) overview.value = loaded
  if (list) households.value = list.items.filter((h) => (h.community_id ?? 'thaton') === comm)
  if (hamletList) hamlets.value = hamletList.items
  if (refit) fitToken.value += 1
}

onMounted(() => load(true))
watch(() => props.ctx.community.value, () => {
  levelFilter.value = 'all'
  query.value = ''
  selectedId.value = null
  householdForm.value = null
  deletingHouseholdId.value = null
  void load(true)
})

const hamletById = computed(() => new Map(hamlets.value.map((h) => [h.id, h])))

const visibleHouseholds = computed(() =>
  households.value.filter((h) => !publicView.value || h.published !== false),
)

const destinations = computed<EvacuationDestination[]>(() =>
  evacuationDestinations(overview.value?.destinations ?? [])
    .filter((d): d is EvacuationDestination => d.kind === 'shelter' || d.kind === 'assembly'),
)

function toSourceRecord(household: HouseholdRow): HouseholdSourceRecord {
  const level = household.levels['layer-1']
  const levelKey = level?.key ?? '5'
  const hamletName = hamletNameOf(household, hamletById.value)
  const fields: Record<string, unknown> = {
    ...household.answers,
    ...(hamletName ? { [ZONE_FIELD]: hamletName } : {}),
  }
  return {
    id: household.id,
    latitude: household.latitude,
    longitude: household.longitude,
    status: `${levelKey}. ${level?.label ?? 'ปกติ'}`,
    color: level?.color ?? '#16A34A',
    fields,
  }
}

const queuedRecords = computed(() =>
  buildEvacuationQueue(visibleHouseholds.value.map(toSourceRecord), destinations.value),
)

const queueByHouseholdId = computed(() => new Map(queuedRecords.value.map((item) => [item.id, item])))

interface TableRow {
  id: string
  name: string
  rank: number | null
  levelKey: '1' | '2' | '4' | '5'
  levelLabel: string
  levelColor: string
  inQueue: boolean
  zone: string
  members: number
  flooded: boolean
  accident: boolean
  latitude: number
  longitude: number
}

const allRows = computed<TableRow[]>(() => {
  const byId = new Map(visibleHouseholds.value.map((h) => [h.id, h]))
  const queuedRows: TableRow[] = queuedRecords.value.map((q) => {
    const raw = byId.get(q.id)
    const levelDef = raw?.levels['layer-1']
    const zoneName = (raw ? hamletNameOf(raw, hamletById.value) : '') || (q.zone === 'ไม่ระบุหย่อม' ? 'ยังไม่ผูกหย่อม' : q.zone)
    return {
      id: q.id,
      name: (raw?.name ?? '').trim(),
      rank: q.rank,
      levelKey: String(q.level) as '1' | '2' | '4',
      levelLabel: (levelDef?.label ?? '').replace(/^\d+\.\s*/, '') || `ระดับ ${q.level}`,
      levelColor: levelDef?.color ?? '#DC2626',
      inQueue: true,
      zone: zoneName,
      members: q.members,
      flooded: q.flooded,
      accident: q.accident,
      latitude: q.latitude,
      longitude: q.longitude,
    }
  })

  const nonQueuedRows: TableRow[] = visibleHouseholds.value
    .filter((h) => h.levels['layer-1']?.key === '5')
    .map((h) => {
      const levelDef = h.levels['layer-1']
      const rawMembers = h.answers?.[MEMBERS_FIELD]
      const members = typeof rawMembers === 'number' ? rawMembers : parseFloat(String(rawMembers || 0)) || 0
      const resolvedZone = hamletNameOf(h, hamletById.value) || String(h.answers?.[ZONE_FIELD] || '').trim() || 'ยังไม่ผูกหย่อม'
      return {
        id: h.id,
        name: (h.name ?? '').trim(),
        rank: null,
        levelKey: '5',
        levelLabel: (levelDef?.label ?? 'ปกติ').replace(/^\d+\.\s*/, ''),
        levelColor: levelDef?.color ?? '#16A34A',
        inQueue: false,
        zone: resolvedZone,
        members,
        flooded: String(h.answers?.['ประวัติน้ำท่วมบ้าน'] || '').trim() === 'เคยท่วมบ้าน',
        accident: String(h.answers?.['อุบัติเหตุรุนแรงจากน้ำ'] || '').trim() !== 'ไม่มี' && Boolean(h.answers?.['อุบัติเหตุรุนแรงจากน้ำ']),
        latitude: h.latitude,
        longitude: h.longitude,
      }
    })

  return [...queuedRows, ...nonQueuedRows]
})

const mapFilteredHouseholds = computed(() => {
  if (levelFilter.value === 'all') return visibleHouseholds.value
  if (levelFilter.value === 'queued') return visibleHouseholds.value.filter((h) => h.levels['layer-1']?.key !== '5')
  return visibleHouseholds.value.filter((h) => h.levels['layer-1']?.key === levelFilter.value)
})

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return allRows.value.filter((row) => {
    if (levelFilter.value === 'queued' && !row.inQueue) return false
    if (levelFilter.value !== 'queued' && levelFilter.value !== 'all' && row.levelKey !== levelFilter.value) return false
    if (!q) return true
    return [row.name, row.id, row.levelLabel].some((v) => v.toLowerCase().includes(q))
  })
})

const pagedRows = computed(() =>
  filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
)

watch([levelFilter, query, pageSize], () => { page.value = 1 })

const markers = computed<EditorMarker[]>(() =>
  mapFilteredHouseholds.value.map((household) => {
    const level = household.levels['layer-1']!
    const rank = queueByHouseholdId.value.get(household.id)?.rank
    const levelNo = displayLevel(level.key)
    const shortText = level.label.replace(/^\d+\.\s*/, '')
    const nameText = household.name?.trim() ? `${household.name.trim()} (${household.id})` : household.id
    return {
      id: household.id,
      latitude: household.latitude,
      longitude: household.longitude,
      color: level.color,
      path: householdPinPath,
      label: rank ? `คิว #${rank} · ${nameText} · ระดับ ${levelNo} (${shortText})` : `${nameText} · ระดับ ${levelNo} (${shortText})`,
      selected: selectedId.value === household.id,
    }
  }),
)

function panTo(points: Array<[number, number]>, zoom = 17) {
  if (!points.length) return
  focusArea.value = { points, zoom, nonce: (focusArea.value?.nonce ?? 0) + 1 }
}

function focusRow(row: TableRow) {
  selectedId.value = row.id
  panTo([[row.latitude, row.longitude]], 17)
}

function toggleGroupCard(key: string) {
  if (key !== '1' && key !== '2' && key !== '4' && key !== '5') return
  levelFilter.value = levelFilter.value === key ? 'all' : key
}

function onSelect(id: string) {
  if (allRows.value.some((r) => r.id === id)) {
    selectedId.value = id
    startEditHousehold(id)
  }
}

function onPickMap(latitude: number, longitude: number) {
  startNewHousehold({ latitude, longitude })
}

function defaultHouseholdAnswers(): Record<string, string | number> {
  const answers: Record<string, string | number> = { [MEMBERS_FIELD]: 0 }
  for (const { key, options } of householdFields()) {
    if (key === 'ประวัติน้ำท่วมบ้าน') answers[key] = 'ไม่เคยท่วมบ้าน'
    else if (key === 'อุบัติเหตุรุนแรงจากน้ำ') answers[key] = 'ไม่มี'
    else answers[key] = options.includes(UNKNOWN_ANSWER) ? UNKNOWN_ANSWER : (options[0] ?? UNKNOWN_ANSWER)
  }
  return answers
}

function startNewHousehold(coords?: { latitude: number; longitude: number }) {
  const fallbackLat = households.value[0]?.latitude ?? 20.058
  const fallbackLng = households.value[0]?.longitude ?? 99.361
  householdForm.value = {
    id: null,
    name: '',
    hamletId: '',
    latitude: String(coords ? coords.latitude : fallbackLat),
    longitude: String(coords ? coords.longitude : fallbackLng),
    published: true,
    answers: defaultHouseholdAnswers(),
  }
}

function startEditHousehold(id: string) {
  const target = households.value.find((h) => h.id === id)
  if (!target) return
  householdForm.value = {
    id: target.id,
    name: target.name ?? '',
    hamletId: target.hamlet_id ?? '',
    latitude: String(target.latitude),
    longitude: String(target.longitude),
    published: target.published !== false,
    answers: { ...defaultHouseholdAnswers(), ...target.answers },
  }
}

async function saveHousehold() {
  const form = householdForm.value
  if (!form) return
  const saved = await run('household-save', async () => {
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (!String(form.latitude).trim() || !String(form.longitude).trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('กรุณาระบุพิกัด Latitude และ Longitude ให้ถูกต้อง')
    }
    return client.households.save(form.id, {
      name: form.name.trim(),
      community_id: props.ctx.community.value,
      hamlet_id: form.hamletId || null,
      latitude: lat,
      longitude: lng,
      published: true,
      answers: { ...form.answers },
    })
  }, form.id ? `บันทึกข้อมูลครัวเรือน ${form.id} แล้ว` : 'เพิ่มครัวเรือนใหม่เข้าแผนอพยพแล้ว')
  if (saved) {
    const savedKey = saved.household.levels?.['layer-1']?.key ?? '5'
    if (
      levelFilter.value !== 'all'
      && ((levelFilter.value === 'queued' && savedKey === '5') || (levelFilter.value !== 'queued' && levelFilter.value !== savedKey))
    ) {
      levelFilter.value = 'all'
    }
    householdForm.value = null
    selectedId.value = saved.household.id
    await load()
    panTo([[saved.household.latitude, saved.household.longitude]], 17)
  }
}

async function confirmDeleteHousehold() {
  const id = deletingHouseholdId.value
  if (!id) return
  const removed = await run('household-delete', () => client.households.remove(id), `ลบครัวเรือน ${id} แล้ว`)
  deletingHouseholdId.value = null
  if (removed) {
    if (householdForm.value?.id === id) householdForm.value = null
    if (selectedId.value === id) selectedId.value = null
    await load()
  }
}

const queuedTotal = computed(() => overview.value?.inQueue ?? queuedRecords.value.length)
const levelCounts = computed(() => {
  const map: Record<string, number> = {}
  for (const g of overview.value?.groups ?? []) map[g.key] = g.count
  return map
})
</script>

<template>
  <div v-if="overview" class="space-y-4">
    <!-- 1. Interactive KPI Priority Filter Cards -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="group" aria-label="สรุปจำนวนและตัวกรองตามระดับความเร่งด่วน">
      <button
        v-for="group in overview.groups"
        :key="group.key"
        type="button"
        :aria-pressed="levelFilter === group.key"
        class="group cursor-pointer rounded-2xl border bg-white px-4 py-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7] dark:bg-[#1E1E1E]"
        :class="levelFilter === group.key
          ? 'border-[#0284C7] ring-2 ring-[#0284C7]/20 dark:border-[#00E5FF] dark:ring-[#00E5FF]/20'
          : 'border-slate-200 hover:border-slate-300 dark:border-[#2C2C2E] dark:hover:border-slate-600'"
        @click="toggleGroupCard(group.key)"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-[#98A2A8]">
            <span class="h-3 w-3 shrink-0 rounded-[3px]" :style="{ background: group.color }" aria-hidden="true" />
            <span>ระดับ {{ displayLevel(group.key) }}</span>
          </p>
          <span :class="chipClass(group.inQueue ? 'rose' : 'neutral')">
            {{ group.inQueue ? 'เข้าคิวอพยพ' : 'ไม่เข้าคิว' }}
          </span>
        </div>
        <p class="mt-1 font-mono text-[26px] font-bold leading-tight tabular-nums" :style="{ color: group.color }">
          {{ group.count }}
        </p>
        <p class="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-[#98A2A8]">
          {{ group.label.replace(/^\d+\.\s*/, '') }}
        </p>
        <p class="mt-1.5 text-[11px] font-semibold" :class="levelFilter === group.key ? 'text-[#0284C7] dark:text-[#00E5FF]' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'">
          {{ levelFilter === group.key ? 'กำลังกรองกลุ่มนี้ · กดซ้ำเพื่อล้าง' : 'คลิกเพื่อกรองดูกลุ่มนี้' }}
        </p>
      </button>
    </div>

    <!-- 2. Full-Width Click-to-Pin Evacuation Map -->
    <section :class="adminCardClass" class="min-w-0 p-4 space-y-3" aria-label="แผนที่กลุ่มอพยพ">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 :class="sectionTitleClass">แผนที่หมุดกลุ่มอพยพ</h2>
            <span class="rounded-full bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-bold text-[#0284C7] dark:bg-sky-950/50 dark:text-[#00E5FF]">
              แสดง {{ mapFilteredHouseholds.length }} หลัง
            </span>
            <button
              v-if="levelFilter !== 'all'"
              type="button"
              class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200"
              @click="levelFilter = 'all'"
            >
              <X class="h-3 w-3" /> แสดงทั้งหมด ({{ visibleHouseholds.length }})
            </button>
          </div>
          <p :class="mutedClass" class="mt-0.5">
            กดคลิกบนแผนที่เพื่อเพิ่มครัวเรือนใหม่ หรือกด “+ เพิ่มครัวเรือน” เพื่อกรอกพิกัดเอง
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            :aria-expanded="showRules"
            :class="actionButtonClass"
            @click="showRules = !showRules"
          >
            <HelpCircle class="h-3.5 w-3.5 text-[#0284C7]" />
            <span>กติกาจัดคิว</span>
          </button>
          <button
            type="button"
            :class="actionButtonClass"
            title="จัดมุมมองแผนที่ให้พอดีกับทุกหมุด"
            @click="fitToken += 1"
          >
            <LocateFixed class="h-3.5 w-3.5" />
            <span>ภาพรวมทั้งหมด</span>
          </button>
          <button type="button" :class="primaryButtonClass" @click="startNewHousehold()">
            <Plus class="h-3.5 w-3.5" />
            <span>เพิ่มครัวเรือน</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Queue Rules Disclosure -->
      <div
        v-if="showRules"
        class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300"
      >
        <div class="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
          <span>กติกาการจัดคิว (โหมดอพยพ) — คำนวณอัตโนมัติจากข้อมูลครัวเรือน</span>
          <button type="button" aria-label="ปิดกติกาการจัดคิว" class="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" @click="showRules = false">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
        <ol class="mt-1.5 list-decimal space-y-1 pl-4">
          <li>ระดับ 4 (ปกติ) ไม่เข้าคิว — เรียงระดับความเร่งด่วน <strong>1 → 2 → 3</strong></li>
          <li>ระดับเท่ากัน: ครัวเรือนที่มี <strong>จำนวนสมาชิกเปราะบางมากกว่า</strong> อยู่คิวก่อน</li>
          <li>ยังเท่ากัน: <strong>เคยประสบเหตุรุนแรงจากน้ำ</strong> ก่อน</li>
        </ol>
      </div>

      <KokAdminMapEditor
        :community="props.ctx.community.value"
        :markers="markers"
        :pick-mode="true"
        :fit-token="fitToken"
        :focus-area="focusArea"
        height-class="h-[460px]"
        @select="onSelect"
        @pick="onPickMap"
      />
    </section>

    <!-- 3. Prioritized Evacuation Queue Data Table -->
    <section :class="adminCardClass" class="min-w-0 overflow-hidden" aria-label="ตารางลำดับคิวอพยพ">
      <div class="space-y-3 border-b border-slate-100 p-4 sm:px-5 dark:border-[#2C2C2E]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 :class="sectionTitleClass">ลำดับคิวอพยพตามความเร่งด่วน</h2>
            <p :class="mutedClass" class="mt-0.5">
              เรียงคิวอัตโนมัติตามระดับ 1 → 2 → 3 และแสดงทุกหมุด 1–4 บนแผนที่
            </p>
          </div>
          <span class="font-mono text-xs text-slate-500 dark:text-[#98A2A8]">
            พบ {{ filteredRows.length }} ครัวเรือน
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="pillClass(levelFilter === 'all')" @click="levelFilter = 'all'">
            ทั้งหมด ({{ visibleHouseholds.length }})
          </button>
          <button type="button" :class="pillClass(levelFilter === 'queued')" @click="levelFilter = 'queued'">
            ในคิว ({{ queuedTotal }})
          </button>
          <button type="button" :class="pillClass(levelFilter === '1')" @click="levelFilter = '1'">
            ระดับ 1 ({{ levelCounts['1'] ?? 0 }})
          </button>
          <button type="button" :class="pillClass(levelFilter === '2')" @click="levelFilter = '2'">
            ระดับ 2 ({{ levelCounts['2'] ?? 0 }})
          </button>
          <button type="button" :class="pillClass(levelFilter === '4')" @click="levelFilter = '4'">
            ระดับ 3 ({{ levelCounts['4'] ?? 0 }})
          </button>
          <button type="button" :class="pillClass(levelFilter === '5')" @click="levelFilter = '5'">
            ระดับ 4 ปกติ ({{ levelCounts['5'] ?? 0 }})
          </button>

          <div class="relative w-full sm:w-64 xl:ml-auto">
            <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              v-model="query"
              type="text"
              aria-label="ค้นหาครัวเรือนในคิวอพยพ"
              placeholder="ค้นหาชื่อ หรือรหัสครัวเรือน..."
              :class="searchFieldClass"
            >
            <button
              v-if="query"
              type="button"
              aria-label="ล้างคำค้นหา"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-800"
              @click="query = ''"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-slate-200 text-slate-500 dark:border-[#2C2C2E] dark:text-[#98A2A8]">
            <tr>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">คิวที่</th>
              <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ชื่อ / รหัส</th>
              <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ลำดับความอันตราย</th>
              <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold sm:table-cell">สมาชิกเปราะบาง</th>
              <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">ประวัติ</th>
              <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold lg:table-cell">พิกัด (Lat, Lng)</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-800 dark:divide-[#2C2C2E]/60 dark:text-slate-200">
            <tr v-if="!pagedRows.length">
              <td colspan="7" class="py-10 text-center text-slate-500 dark:text-[#98A2A8]">
                <p>ไม่พบข้อมูลครัวเรือนตามเงื่อนไขที่เลือก</p>
                <div class="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    v-if="query || levelFilter !== 'all'"
                    type="button"
                    :class="actionButtonClass"
                    @click="query = ''; levelFilter = 'all'"
                  >
                    แสดงทั้งหมด
                  </button>
                  <button type="button" :class="primaryButtonClass" @click="startNewHousehold()">
                    <Plus class="h-3.5 w-3.5" />
                    <span>เพิ่มครัวเรือนแรก</span>
                  </button>
                </div>
              </td>
            </tr>

            <tr
              v-for="row in pagedRows"
              :key="row.id"
              class="cursor-pointer transition"
              :class="selectedId === row.id ? 'bg-sky-50 dark:bg-sky-950/30' : 'hover:bg-slate-50 dark:hover:bg-[#252525]/60'"
              @click="focusRow(row)"
            >
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  v-if="row.rank !== null"
                  class="inline-flex min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-900 tabular-nums dark:bg-[#252525] dark:text-white"
                >
                  #{{ row.rank }}
                </span>
                <span v-else :class="chipClass('neutral')">ไม่เข้าคิว</span>
              </td>

              <td class="px-3 py-3">
                <div class="font-bold text-slate-900 dark:text-white" :class="{ 'font-mono': !row.name }">
                  {{ row.name || row.id }}
                </div>
                <div v-if="row.name" class="font-mono text-[11px] text-slate-500 dark:text-[#98A2A8]">
                  {{ row.id }}
                </div>
              </td>

              <td class="whitespace-nowrap px-3 py-3">
                <span class="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: row.levelColor }" />
                  <span>ระดับ {{ displayLevel(row.levelKey) }}</span>
                </span>
              </td>

              <td class="hidden whitespace-nowrap px-3 py-3 sm:table-cell">
                <span v-if="row.members > 0" :class="chipClass('amber')" class="font-mono">{{ row.members }} คน</span>
                <span v-else class="text-slate-400">-</span>
              </td>

              <td class="hidden px-3 py-3 md:table-cell">
                <div class="flex flex-wrap gap-1">
                  <span :class="chipClass(row.flooded ? 'rose' : 'neutral')">
                    {{ row.flooded ? 'เคยท่วมบ้าน' : 'ไม่เคยท่วม' }}
                  </span>
                  <span v-if="row.accident" :class="chipClass('rose')">เหตุรุนแรงจากน้ำ</span>
                </div>
              </td>

              <td class="hidden whitespace-nowrap px-3 py-3 font-mono text-[11px] text-slate-600 lg:table-cell dark:text-[#98A2A8]">
                {{ row.latitude.toFixed(5) }}, {{ row.longitude.toFixed(5) }}
              </td>

              <td class="whitespace-nowrap px-4 py-3 text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                    @click.stop="focusRow(row)"
                  >
                    <MapPin class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">ดูบนแผนที่</span>
                  </button>
                  <button
                    type="button"
                    aria-label="แก้ไขข้อมูลครัวเรือน"
                    class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-amber-600 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                    @click.stop="startEditHousehold(row.id)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    aria-label="ลบครัวเรือน"
                    :disabled="busy !== null"
                    class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    @click.stop="deletingHouseholdId = row.id"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">ลบ</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <KokPagination
        v-if="filteredRows.length > 0"
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="filteredRows.length"
      />
    </section>

    <!-- Add / Edit Household Modal -->
    <KokAdminHouseholdModal
      v-if="householdForm"
      :form="householdForm"
      :busy="busy !== null"
      @close="householdForm = null"
      @save="saveHousehold"
      @request-delete="deletingHouseholdId = householdForm.id"
    />

    <!-- Delete Household Confirmation Modal -->
    <KokModalShell v-if="deletingHouseholdId !== null" width-class="max-w-sm" overlay-class="z-[1070] p-4" @close="deletingHouseholdId = null">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Trash2 class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">ยืนยันลบข้อมูลครัวเรือน</h3>
            <p :class="mutedClass" class="mt-1">
              ต้องการลบครัวเรือน <span class="font-mono font-bold">{{ deletingHouseholdId }}</span> ออกจากแผนอพยพหรือไม่?
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" :class="actionButtonClass" @click="deletingHouseholdId = null">ยกเลิก</button>
          <button
            type="button"
            :disabled="busy !== null"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
            @click="confirmDeleteHousehold"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>ยืนยันลบครัวเรือน</span>
          </button>
        </div>
      </div>
    </KokModalShell>
  </div>

  <p v-else :class="mutedClass" class="py-10 text-center">กำลังโหลดข้อมูลกลุ่มอพยพ…</p>
</template>
