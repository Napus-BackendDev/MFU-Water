<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Check, Layers, MapPin, Palette, Pencil, Plus, Search, Trash2, X } from 'lucide-vue-next'
import {
  DEFAULT_PLACE_MAP,
  PIN_COLOR_OPTIONS,
  PIN_ICON_OPTIONS,
  PIN_PATHS,
  PLACE_KINDS,
  type CommunityId,
  type PinIconId,
  type Place,
  type PlaceKind,
} from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { EditorMarker } from '../utils/map-pin'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, primaryButtonClass, searchFieldClass } from '../utils/admin-ui'
import { chipClass, dangerButtonClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import KokModalShell from './KokModalShell.vue'
import KokPagination from './KokPagination.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const { client, run, busy, publicView } = props.ctx

type PlaceForm = {
  id?: string
  name: string
  kind: PlaceKind
  map_name: string
  pin_icon: PinIconId
  pin_color: string
  community_id: CommunityId
  source_section: string
  latitude: string
  longitude: string
  location_precision: 'approximate' | 'field_verified'
  operational_status: Place['operational_status']
  capacity_planned: string
  capacity_available: string
  last_checked: string
  note: string
  status: Place['status']
}

const items = ref<Place[]>([])
const counts = ref({ all: 0, published: 0, waitingLocation: 0 })
const filters = reactive({ icon: '', q: '' })
const selectedId = ref<string | null>(null)
const form = ref<PlaceForm | null>(null)
const fitToken = ref(0)
const deleting = ref<Place | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

// รายการแผนที่สำคัญ: แผนที่แรกคือ "แผนที่จากสถานที่" เสมอ และแอดมินกด "+ เพิ่มแผนที่" เพื่อตั้งชื่อแผนที่ใหม่ได้
const activeMapName = ref<string>(DEFAULT_PLACE_MAP)
const customMapNames = ref<string[]>([])
const creatingMap = ref(false)
const newMapTitle = ref('')
const newMapInputRef = ref<HTMLInputElement | null>(null)

function storageKey(comm: CommunityId) {
  return `kok_admin_custom_maps_${comm}`
}

function loadCustomMaps() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(storageKey(props.ctx.community.value))
    const parsed = raw ? JSON.parse(raw) : []
    customMapNames.value = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch {
    customMapNames.value = []
  }
}

function saveCustomMaps() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(props.ctx.community.value), JSON.stringify(customMapNames.value))
  } catch {
    // ignore storage errors
  }
}

function mapNameOf(place: Place): string {
  return place.map_name && place.map_name.trim() ? place.map_name.trim() : DEFAULT_PLACE_MAP
}

function iconOptionByKind(kind: PlaceKind) {
  return PIN_ICON_OPTIONS.find((opt) => opt.kind === kind) ?? PIN_ICON_OPTIONS[0]!
}

function iconOptionOfPlace(place: Place) {
  if (place.pin_icon) {
    const matched = PIN_ICON_OPTIONS.find((opt) => opt.id === place.pin_icon)
    if (matched) return matched
  }
  return iconOptionByKind(place.kind)
}

function colorOfPlace(place: Place): string {
  if (place.pin_color && /^#[0-9A-Fa-f]{6}$/.test(place.pin_color)) return place.pin_color
  return PLACE_KINDS[place.kind]?.color ?? '#047857'
}

function pathOfPlace(place: Place): string {
  if (place.pin_icon && PIN_PATHS[place.pin_icon as PinIconId]) return PIN_PATHS[place.pin_icon as PinIconId]
  return PLACE_KINDS[place.kind]?.path ?? PIN_PATHS.dot
}

const communityPlaces = computed(() =>
  items.value.filter((place) => !place.community_id || place.community_id === props.ctx.community.value),
)

const mapGroups = computed(() => {
  const names = new Set<string>([DEFAULT_PLACE_MAP, ...customMapNames.value])
  for (const place of communityPlaces.value) {
    names.add(mapNameOf(place))
  }
  return [...names].map((name) => {
    const list = communityPlaces.value.filter((p) => mapNameOf(p) === name)
    const located = list.filter((p) => p.latitude !== null && p.longitude !== null).length
    return {
      name,
      isDefault: name === DEFAULT_PLACE_MAP,
      total: list.length,
      waiting: list.length - located,
    }
  })
})

const activeMapPlaces = computed(() =>
  communityPlaces.value.filter((place) => mapNameOf(place) === activeMapName.value),
)

const availableIconOptions = computed(() => {
  const present = new Map<string, string>()
  for (const place of activeMapPlaces.value) {
    const opt = iconOptionOfPlace(place)
    if (!present.has(opt.id)) present.set(opt.id, opt.label)
  }
  return [...present.entries()].map(([id, label]) => ({ id, label }))
})

const visible = computed(() =>
  activeMapPlaces.value.filter((place) => {
    if (filters.icon && iconOptionOfPlace(place).id !== filters.icon) return false
    const text = filters.q.trim().toLowerCase()
    return (
      !text
      || place.name.toLowerCase().includes(text)
      || (place.note || '').toLowerCase().includes(text)
      || place.id.toLowerCase().includes(text)
    )
  }),
)

const tablePage = ref(1)
const tablePageSize = ref(5)
const totalTablePages = computed(() => Math.max(1, Math.ceil(visible.value.length / tablePageSize.value)))
const pagedVisible = computed(() => {
  const start = (tablePage.value - 1) * tablePageSize.value
  return visible.value.slice(start, start + tablePageSize.value)
})

watch([activeMapName, () => props.ctx.community.value], () => {
  filters.icon = ''
})
watch(availableIconOptions, (options) => {
  if (filters.icon && !options.some((opt) => opt.id === filters.icon)) {
    filters.icon = ''
  }
})
watch([() => filters.icon, () => filters.q, activeMapName, () => props.ctx.community.value, tablePageSize], () => {
  tablePage.value = 1
})
watch(visible, () => {
  if (tablePage.value > totalTablePages.value) {
    tablePage.value = totalTablePages.value
  }
})

const defaultPinIcon = PIN_ICON_OPTIONS[0]!

async function load(refit = false) {
  loadCustomMaps()
  const comm = props.ctx.community.value
  const result = await run('places', () => client.places.list({ community: comm }))
  if (!result) return
  items.value = result.items
  counts.value = result.counts
  if (!mapGroups.value.some((g) => g.name === activeMapName.value)) {
    activeMapName.value = DEFAULT_PLACE_MAP
  }
  if (refit) fitToken.value += 1
}

onMounted(() => load(true))
watch(() => props.ctx.community.value, () => {
  activeMapName.value = DEFAULT_PLACE_MAP
  form.value = null
  load(true)
})

function selectMap(name: string) {
  activeMapName.value = name
  selectedId.value = null
  form.value = null
  fitToken.value += 1
}

async function openNewMapDialog() {
  creatingMap.value = true
  newMapTitle.value = ''
  await nextTick()
  newMapInputRef.value?.focus()
}

function confirmCreateMap() {
  try {
    const title = newMapTitle.value.trim()
    if (!title) {
      throw new Error('กรุณาตั้งชื่อแผนที่ใหม่ก่อนกดสร้าง')
    }
    if (mapGroups.value.some((g) => g.name.toLowerCase() === title.toLowerCase())) {
      throw new Error(`มีแผนที่ชื่อ “${title}” อยู่ในชุมชนนี้แล้ว`)
    }
    customMapNames.value = [...customMapNames.value, title]
    saveCustomMaps()
    creatingMap.value = false
    newMapTitle.value = ''
    activeMapName.value = title
    selectedId.value = null
    form.value = null
    fitToken.value += 1
    props.ctx.notifySuccess(`สร้างแผนที่ “${title}” เรียบร้อยแล้ว`)
  } catch (err) {
    props.ctx.notifyError('สร้างแผนที่ใหม่ไม่สำเร็จ', err)
  }
}

function removeCustomMap(name: string) {
  try {
    if (name === DEFAULT_PLACE_MAP) {
      throw new Error('ไม่สามารถลบแผนที่หลักของระบบได้')
    }
    customMapNames.value = customMapNames.value.filter((n) => n !== name)
    saveCustomMaps()
    if (activeMapName.value === name) {
      activeMapName.value = DEFAULT_PLACE_MAP
      form.value = null
    }
    props.ctx.notifySuccess(`ลบแผนที่ “${name}” เรียบร้อยแล้ว`)
  } catch (err) {
    props.ctx.notifyError('ลบแผนที่ไม่สำเร็จ', err)
  }
}

function selectModalIcon(opt: (typeof PIN_ICON_OPTIONS)[number]) {
  if (!form.value) return
  const prevIcon = PIN_ICON_OPTIONS.find((o) => o.id === form.value!.pin_icon)
  const colorWasIconDefault = !prevIcon || form.value.pin_color.toLowerCase() === prevIcon.defaultColor.toLowerCase()
  form.value.pin_icon = opt.id
  form.value.kind = opt.kind
  if (colorWasIconDefault) {
    form.value.pin_color = opt.defaultColor
  }
}

function selectModalColor(hex: string) {
  if (!form.value) return
  form.value.pin_color = hex
}

const blankForm = (lat = '', lng = ''): PlaceForm => {
  return {
    name: '',
    kind: defaultPinIcon.kind,
    map_name: activeMapName.value,
    pin_icon: defaultPinIcon.id,
    pin_color: defaultPinIcon.defaultColor,
    community_id: props.ctx.community.value,
    source_section: activeMapName.value === DEFAULT_PLACE_MAP ? '' : activeMapName.value,
    latitude: lat,
    longitude: lng,
    location_precision: 'approximate',
    operational_status: 'unchecked',
    capacity_planned: '',
    capacity_available: '',
    last_checked: '',
    note: '',
    status: 'published',
  }
}

const toForm = (place: Place): PlaceForm => {
  const iconOpt = iconOptionOfPlace(place)
  return {
    id: place.id,
    name: place.name,
    kind: place.kind,
    map_name: mapNameOf(place),
    pin_icon: (place.pin_icon as PinIconId) || iconOpt.id,
    pin_color: colorOfPlace(place),
    community_id: place.community_id,
    source_section: place.source_section,
    latitude: place.latitude === null ? '' : String(place.latitude),
    longitude: place.longitude === null ? '' : String(place.longitude),
    location_precision: place.location_precision ?? 'approximate',
    operational_status: place.operational_status,
    capacity_planned: place.capacity_planned === null ? '' : String(place.capacity_planned),
    capacity_available: place.capacity_available === null ? '' : String(place.capacity_available),
    last_checked: place.last_checked ? place.last_checked.slice(0, 10) : '',
    note: place.note,
    status: place.status,
  }
}

const number = (value: string | number | null | undefined) => {
  const s = String(value ?? '').trim()
  return s === '' ? null : Number(s)
}
function payload(source: PlaceForm) {
  return {
    ...(source.id ? { id: source.id } : {}),
    name: source.name,
    kind: source.kind,
    map_name: source.map_name || activeMapName.value,
    pin_icon: source.pin_icon,
    pin_color: source.pin_color,
    community_id: source.community_id,
    source_section: source.source_section,
    latitude: number(source.latitude),
    longitude: number(source.longitude),
    location_precision: source.location_precision,
    operational_status: source.operational_status,
    capacity_planned: number(source.capacity_planned),
    capacity_available: number(source.capacity_available),
    last_checked: source.last_checked || null,
    note: source.note,
    status: 'published' as const,
  }
}

const markers = computed<EditorMarker[]>(() => {
  const list: EditorMarker[] = activeMapPlaces.value
    .filter((place) => place.latitude !== null && place.longitude !== null && place.id !== form.value?.id)
    .map((place) => ({
      id: place.id,
      latitude: place.latitude!,
      longitude: place.longitude!,
      color: colorOfPlace(place),
      path: pathOfPlace(place),
      label: `${place.name} (${iconOptionOfPlace(place).label})`,
      selected: place.id === selectedId.value,
    }))
  const draft = form.value
  const latitude = draft ? number(draft.latitude) : null
  const longitude = draft ? number(draft.longitude) : null
  if (draft && latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const draftPath = PIN_PATHS[draft.pin_icon] ?? PLACE_KINDS[draft.kind]?.path ?? PIN_PATHS.dot
    list.push({
      id: draft.id ?? 'new',
      latitude,
      longitude,
      color: draft.pin_color || PLACE_KINDS[draft.kind].color,
      path: draftPath,
      label: draft.name || 'หมุดใหม่ (กำลังตั้งค่า)',
      selected: true,
    })
  }
  return list
})

async function startCreate(lat = '', lng = '') {
  selectedId.value = null
  form.value = blankForm(lat, lng)
  await nextTick()
  nameInputRef.value?.focus()
}

async function startEdit(place: Place) {
  selectedId.value = place.id
  form.value = toForm(place)
  await nextTick()
  nameInputRef.value?.focus()
}

function cancelForm() {
  form.value = null
}

async function onPick(latitude: number, longitude: number) {
  if (!form.value) {
    await startCreate(String(latitude), String(longitude))
    return
  }
  form.value.latitude = String(latitude)
  form.value.longitude = String(longitude)
  await nextTick()
  nameInputRef.value?.focus()
}

function onSelect(id: string) {
  selectedId.value = id
  const place = activeMapPlaces.value.find((item) => item.id === id)
  if (place) void startEdit(place)
}

function focusPlaceOnMap(place: Place) {
  selectedId.value = place.id
  fitToken.value += 1
}

function clearCoordinates() {
  if (form.value) {
    form.value.latitude = ''
    form.value.longitude = ''
  }
}

async function save() {
  if (!form.value) return
  const saved = await run('save', async () => {
    const f = form.value!
    if (!f.name.trim()) {
      throw new Error('กรุณาระบุชื่อสถานที่/ชื่อหมุด')
    }
    const lat = number(f.latitude)
    const lng = number(f.longitude)
    if ((lat === null) !== (lng === null)) {
      throw new Error('กรุณาระบุพิกัดละติจูดและลองจิจูดให้ครบทั้งคู่ หรือล้างพิกัดทั้งหมด')
    }
    if (lat !== null && lng !== null && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      throw new Error('ค่าพิกัดละติจูดหรือลองจิจูดไม่อยู่ในช่วงที่ถูกต้อง')
    }
    return client.places.save(payload(f) as Parameters<typeof client.places.save>[0])
  }, 'บันทึกสถานที่เรียบร้อย')
  if (!saved) return
  selectedId.value = saved.place.id
  await load()
  form.value = null
}

function requestDeleteFromForm() {
  if (!form.value?.id) return
  const target = items.value.find((item) => item.id === form.value?.id)
  if (!target) {
    props.ctx.notifyError('ไม่สามารถลบหมุดได้', new Error('ไม่พบข้อมูลหมุดในรายการปัจจุบัน'))
    return
  }
  deleting.value = target
}

async function confirmDelete() {
  if (!deleting.value) return
  const target = deleting.value
  if (await run('delete', () => client.places.remove(target.id), `ลบ ${target.name} แล้ว`)) {
    deleting.value = null
    if (selectedId.value === target.id) selectedId.value = null
    if (form.value?.id === target.id) form.value = null
    await load()
  } else deleting.value = null
}
</script>

<template>
  <div class="space-y-4">
    <!-- SECTION 1 (แนวระนาบ): รายการแผนที่สำคัญ -->
    <section :class="adminCardClass" class="min-w-0" aria-label="รายการสถานที่สำคัญ">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-[#2C2C2E]">
        <div>
          <h2 :class="sectionTitleClass">แผนที่สำคัญ</h2>
          <p :class="mutedClass">{{ mapGroups.length }} แผนที่ · ทั้งหมด {{ counts.all }} หมุด</p>
        </div>
        <button type="button" :class="primaryButtonClass" @click="openNewMapDialog">
          <Plus class="h-4 w-4" />
          <span>เพิ่มแผนที่</span>
        </button>
      </div>

      <!-- กล่องตั้งชื่อแผนที่ใหม่ -->
      <form
        v-if="creatingMap"
        class="flex flex-col gap-3 border-b border-sky-100 bg-sky-50/60 p-4 sm:flex-row sm:items-end dark:border-sky-900/40 dark:bg-sky-950/20"
        @submit.prevent="confirmCreateMap"
      >
        <div class="min-w-0 flex-1">
          <label for="new-map-title" :class="fieldLabelClass">ตั้งชื่อแผนที่ใหม่ *</label>
          <input
            id="new-map-title"
            ref="newMapInputRef"
            v-model="newMapTitle"
            type="text"
            maxlength="80"
            placeholder="เช่น แผนที่จุดเสี่ยงน้ำท่วม, แผนที่จุดกรองน้ำ..."
            :class="fieldClass"
            class="mt-1 bg-white dark:bg-[#141416]"
          >
        </div>
        <div class="flex shrink-0 items-center justify-end gap-2">
          <button type="button" :class="actionButtonClass" @click="creatingMap = false">ยกเลิก</button>
          <button type="submit" :class="primaryButtonClass">สร้างแผนที่</button>
        </div>
      </form>

      <!-- รายการแผนที่ทั้งหมดแบบแนวระนาบ (แผนที่แรกคือ "แผนที่จากสถานที่") -->
      <div class="p-3 sm:p-4">
        <p class="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#98A2A8]">
          เลือกแผนที่ที่ต้องการปักหมุด
        </p>
        <ul class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <li v-for="group in mapGroups" :key="group.name">
            <div
              class="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition"
              :class="group.name === activeMapName
                ? 'border-sky-500 bg-sky-50/90 text-sky-950 shadow-2xs dark:border-sky-500 dark:bg-sky-950/40 dark:text-white'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#18181B] dark:hover:bg-[#222225]'"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                @click="selectMap(group.name)"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  :class="group.name === activeMapName ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-slate-600 dark:bg-[#27272A] dark:text-slate-300'"
                >
                  <Layers class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate text-[13px] font-bold">{{ group.name }}</span>
                    <span v-if="group.isDefault" :class="chipClass('sky')" class="text-[10px]!">แผนที่หลัก</span>
                  </div>
                  <p :class="mutedClass" class="text-[11px]!">
                    {{ group.total }} หมุด
                    <template v-if="group.waiting > 0"> · รอผูกจุด {{ group.waiting }}</template>
                  </p>
                </div>
              </button>
              <button
                v-if="!group.isDefault && group.total === 0"
                type="button"
                aria-label="ลบแผนที่"
                title="ลบแผนที่ว่าง"
                :class="actionButtonClass"
                class="px-2! text-rose-600!"
                @click="removeCustomMap(group.name)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- RIGHT COLUMN: แผนที่ปักหมุด + แผงตั้งค่าไอคอน/สี + ตารางข้อมูลหมุดด้านล่าง -->
    <div class="min-w-0 space-y-4">
      <!-- 1. แผนที่และคลังไอคอน/สีสำหรับเจาะจุดปักหมุด -->
      <section :class="adminCardClass" class="space-y-3.5 p-4 sm:p-5" aria-label="พื้นที่ปักหมุดแผนที่สำคัญ">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 :class="sectionTitleClass">{{ activeMapName }}</h2>
              <span :class="chipClass('sky')">{{ activeMapPlaces.length }} หมุด</span>
            </div>
            <p :class="mutedClass" class="mt-0.5">
              หมายเหตุ: กดคลิกเพื่อปักหมุดบนแผนที่ หรือกด “เพิ่มหมุด” เพื่อกรอกพิกัดเอง
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" :class="actionButtonClass" @click="startCreate()">
              <Plus class="h-3.5 w-3.5" />
              <span>เพิ่มหมุด</span>
            </button>
          </div>
        </div>

        <!-- Interactive Map -->
        <KokAdminMapEditor
          :community="props.ctx.community.value"
          :markers="markers"
          :pick-mode="true"
          :fit-token="fitToken"
          @select="onSelect"
          @pick="onPick"
        />
      </section>

      <!-- 2. ข้างล่างทางขวา: ตารางข้อมูลหมุดในแผนที่นี้ -->
      <section :class="adminCardClass" class="min-w-0 overflow-hidden" aria-label="ตารางข้อมูลหมุดในแผนที่">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:px-5 dark:border-[#2C2C2E]">
          <div>
            <h2 :class="sectionTitleClass">ตารางข้อมูลหมุด · {{ activeMapName }}</h2>
            <p :class="mutedClass" class="mt-0.5">รายการหมุดทั้งหมดที่ปักไว้ในแผนที่นี้ พร้อมไอคอน สี และรายละเอียดการใช้งาน</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative min-w-[200px]">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input v-model="filters.q" type="search" placeholder="ค้นหาชื่อหมุดหรือรายละเอียด..." aria-label="ค้นหาสถานที่" :class="searchFieldClass" class="py-1.5! text-xs!">
            </div>
            <select v-model="filters.icon" aria-label="กรองตามประเภทไอคอน" :class="fieldClass" class="w-auto! py-1.5! text-xs!">
              <option value="">ทุกไอคอน ({{ availableIconOptions.length }})</option>
              <option v-for="opt in availableIconOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
            </select>
            <button type="button" :class="primaryButtonClass" class="py-1.5! text-xs!" @click="startCreate()">
              <Plus class="h-3.5 w-3.5" />
              <span>เพิ่มหมุด</span>
            </button>
          </div>
        </div>

        <template v-if="visible.length">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[680px] text-left text-xs">
              <thead class="border-b border-slate-200 bg-slate-50/60 text-slate-500 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8]">
                <tr>
                  <th class="px-4 py-3 font-semibold">หมุด</th>
                  <th class="px-3 py-3 font-semibold">ชื่อหมุด / คืออะไร</th>
                  <th class="px-3 py-3 font-semibold">ไอคอน / การใช้งาน</th>
                  <th class="px-3 py-3 font-semibold">พิกัด (Lat, Lng)</th>
                  <th class="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-800 dark:divide-[#2C2C2E]/60 dark:text-slate-200">
                <tr
                  v-for="place in pagedVisible"
                  :key="place.id"
                class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-[#252525]/60"
                :class="place.id === selectedId ? 'bg-sky-50/80 dark:bg-sky-950/30' : ''"
                @click="focusPlaceOnMap(place)"
              >
                <td class="px-4 py-3">
                  <span
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-xs"
                    :style="{ background: colorOfPlace(place) }"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2" stroke-linecap="round" stroke-linejoin="round" v-html="pathOfPlace(place)" />
                  </span>
                </td>
                <td class="px-3 py-3">
                  <div class="font-bold text-slate-900 dark:text-white">{{ place.name }}</div>
                  <div v-if="place.note" class="text-[11px] text-slate-500 dark:text-[#98A2A8]">{{ place.note }}</div>
                  <div v-else-if="place.source_section" class="text-[11px] text-slate-400">{{ place.source_section }}</div>
                </td>
                <td class="px-3 py-3">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">{{ iconOptionOfPlace(place).label }}</div>
                </td>
                <td class="px-3 py-3 font-mono text-[11px]">
                  <template v-if="place.latitude !== null && place.longitude !== null">
                    {{ Number(place.latitude).toFixed(5) }}, {{ Number(place.longitude).toFixed(5) }}
                  </template>
                  <span v-else :class="chipClass('amber')">รอผูกจุด</span>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      aria-label="ดูตำแหน่งหมุดบนแผนที่"
                      title="ดูหมุด (View)"
                      class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                      @click="focusPlaceOnMap(place)"
                    >
                      <MapPin class="h-3.5 w-3.5" />
                      <span class="hidden sm:inline">ดูหมุด</span>
                    </button>
                    <button
                      type="button"
                      aria-label="แก้ไขข้อมูลหมุด"
                      title="แก้ไข (Edit)"
                      class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-amber-600 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                      @click="startEdit(place)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                      <span class="hidden sm:inline">แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      aria-label="ลบข้อมูลหมุด"
                      title="ลบ (Delete)"
                      class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                      @click="deleting = place"
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
          <KokPagination v-model:page="tablePage" v-model:page-size="tablePageSize" :total="visible.length" />
        </template>
        <p v-else :class="mutedClass" class="p-8 text-center">
          ยังไม่มีข้อมูลหมุดในแผนที่ “{{ activeMapName }}” — คลิกบนแผนที่ด้านบนเพื่อปักหมุดและระบุข้อมูลได้ทันที
        </p>
      </section>
    </div>

    <!-- Modal เพิ่ม / แก้ไขหมุด -->
    <KokModalShell v-if="form" overlay-class="z-[1060] p-4" width-class="max-w-lg" @close="cancelForm">
      <form class="space-y-4" novalidate @submit.prevent="save">
        <header class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white dark:ring-[#1E1E1E]"
              :style="{ background: form.pin_color }"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current stroke-2" stroke-linecap="round" stroke-linejoin="round" v-html="PIN_PATHS[form.pin_icon] || PIN_PATHS.dot" />
            </span>
            <div class="min-w-0">
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                {{ form.id ? `แก้ไขหมุด ${form.id}` : 'เพิ่มหมุดใหม่' }}
              </h3>
              <p :class="mutedClass" class="truncate">
                แผนที่: {{ form.map_name }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่าง"
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#252525] dark:hover:text-white"
            @click="cancelForm"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <!-- ชื่อหมุด / ชื่อสถานที่ และ คำอธิบาย -->
        <div class="space-y-3">
          <div>
            <label for="place-name" :class="fieldLabelClass">ชื่อหมุด / ชื่อสถานที่ *</label>
            <input
              id="place-name"
              ref="nameInputRef"
              v-model="form.name"
              type="text"
              maxlength="120"
              placeholder="เช่น จุดติดตั้งเครื่องกรองน้ำหมู่ 3, ศูนย์พักพิงวัดท่าตอน..."
              :class="fieldClass"
              class="mt-1"
            >
          </div>
          <div>
            <label for="place-note" :class="fieldLabelClass">คำอธิบาย</label>
            <textarea
              id="place-note"
              v-model="form.note"
              rows="3"
              maxlength="300"
              placeholder="อธิบายรายละเอียดเพิ่มเติมเกี่ยวกับหมุดนี้..."
              :class="fieldClass"
              class="mt-1 resize-none"
            />
          </div>
        </div>

        <!-- Latitude & Longitude -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="place-lat" :class="fieldLabelClass">Latitude (ละติจูด)</label>
            <input
              id="place-lat"
              v-model="form.latitude"
              type="number"
              step="0.000001"
              inputmode="decimal"
              placeholder="เช่น 20.058000"
              :class="fieldClass"
              class="mt-1 font-mono"
            >
          </div>
          <div>
            <div class="flex items-center justify-between gap-2">
              <label for="place-lng" :class="fieldLabelClass">Longitude (ลองจิจูด)</label>
              <button
                v-if="form.latitude !== '' || form.longitude !== ''"
                type="button"
                class="cursor-pointer text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-rose-600 hover:underline dark:text-[#98A2A8]"
                @click="clearCoordinates"
              >
                ล้างพิกัด
              </button>
            </div>
            <input
              id="place-lng"
              v-model="form.longitude"
              type="number"
              step="0.000001"
              inputmode="decimal"
              placeholder="เช่น 99.361000"
              :class="fieldClass"
              class="mt-1 font-mono"
            >
          </div>
        </div>

        <!-- เลือก Icon หมุด (ปุ่มรูป Icon ล้วน) -->
        <div>
          <div class="flex items-center justify-between gap-2">
            <span :class="fieldLabelClass">เลือก Icon หมุด</span>
            <span :class="mutedClass" class="text-[11px]!">
              {{ PIN_ICON_OPTIONS.find((o) => o.id === form!.pin_icon)?.label || 'ไอคอน' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="เลือกไอคอนหมุด">
            <button
              v-for="opt in PIN_ICON_OPTIONS"
              :key="opt.id"
              type="button"
              role="radio"
              :title="opt.label"
              :aria-label="opt.label"
              :aria-checked="form.pin_icon === opt.id"
              class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition hover:scale-105"
              :class="form.pin_icon === opt.id
                ? 'border-transparent text-white shadow-sm ring-2 ring-slate-900 dark:ring-white scale-105'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300 dark:hover:bg-[#222225]'"
              :style="form.pin_icon === opt.id ? { background: form.pin_color } : undefined"
              @click="selectModalIcon(opt)"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current stroke-2" stroke-linecap="round" stroke-linejoin="round" v-html="opt.path" />
            </button>
          </div>
        </div>

        <!-- เลือกสี -->
        <div>
          <span :class="fieldLabelClass" class="inline-flex items-center gap-1.5">
            <Palette class="h-3.5 w-3.5 text-slate-500" />
            <span>เลือกสีหมุด</span>
          </span>
          <div class="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
            <button
              v-for="c in PIN_COLOR_OPTIONS"
              :key="c.hex"
              type="button"
              :title="c.label"
              :aria-label="c.label"
              :aria-pressed="form.pin_color.toLowerCase() === c.hex.toLowerCase()"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white text-white shadow-xs transition hover:scale-110 dark:border-[#1E1E1E]"
              :class="form.pin_color.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : ''"
              :style="{ background: c.hex }"
              @click="selectModalColor(c.hex)"
            >
              <Check v-if="form.pin_color.toLowerCase() === c.hex.toLowerCase()" class="h-3.5 w-3.5" />
            </button>
            <label class="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-[#98A2A8]">
              <span>กำหนดสีเอง:</span>
              <input
                :value="form.pin_color"
                type="color"
                aria-label="กำหนดสีหมุดเอง"
                class="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-[#2C2C2E]"
                @input="selectModalColor(($event.target as HTMLInputElement).value)"
              >
            </label>
            <span class="ml-auto font-mono text-[11px] uppercase text-slate-500 dark:text-[#98A2A8]">{{ form.pin_color }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-[#2C2C2E]">
          <div>
            <button
              v-if="form.id"
              type="button"
              :disabled="busy !== null"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              @click="requestDeleteFromForm"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>ลบหมุด</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" :class="actionButtonClass" @click="cancelForm">ยกเลิก</button>
            <button type="submit" :class="primaryButtonClass" :disabled="busy !== null">บันทึกหมุด</button>
          </div>
        </div>
      </form>
    </KokModalShell>

    <KokModalShell v-if="deleting" overlay-class="z-[1070] p-4" title="ยืนยันการลบหมุด" @close="deleting = null">
      <p class="text-[13px]">ต้องการลบ <strong>{{ deleting.name }}</strong> ({{ deleting.id }}) ออกจาก “{{ mapNameOf(deleting) }}” หรือไม่</p>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" :class="actionButtonClass" @click="deleting = null">ยกเลิก</button>
        <button type="button" :class="dangerButtonClass" :disabled="busy !== null" @click="confirmDelete">ยืนยันลบ</button>
      </div>
    </KokModalShell>
  </div>
</template>
