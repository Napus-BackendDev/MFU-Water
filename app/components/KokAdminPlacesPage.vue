<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Crosshair, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { PLACE_KINDS, PLACE_OPERATIONAL, PLACE_PRECISIONS, toPublicPlace, type CommunityId, type Place, type PlaceKind } from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { EditorMarker } from '../utils/map-pin'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, primaryButtonClass, searchFieldClass } from '../utils/admin-ui'
import { chipClass, communityOptions, dangerButtonClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const { client, run, busy, publicView } = props.ctx

type PlaceForm = {
  id?: string
  name: string
  kind: PlaceKind
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
const filters = reactive({ kind: '', status: '', q: '' })
const selectedId = ref<string | null>(null)
const form = ref<PlaceForm | null>(null)
const pickMode = ref(false)
const fitToken = ref(0)
const deleting = ref<Place | null>(null)

async function load(refit = false) {
  const comm = props.ctx.community.value
  const result = await run('places', () => client.places.list({ community: comm }))
  if (!result) return
  items.value = result.items
  counts.value = result.counts
  if (refit) fitToken.value += 1
}
onMounted(() => load(true))
watch(() => props.ctx.community.value, () => load(true))

const visible = computed(() => items.value.filter((place) => {
  if (place.community_id && place.community_id !== props.ctx.community.value) return false
  if (filters.kind && place.kind !== filters.kind) return false
  if (filters.status === 'waiting' ? place.latitude !== null : filters.status && place.status !== filters.status) return false
  const text = filters.q.trim().toLowerCase()
  return !text || place.name.toLowerCase().includes(text) || place.id.toLowerCase().includes(text)
}))

const blankForm = (): PlaceForm => ({ name: '', kind: 'other', community_id: props.ctx.community.value, source_section: '', latitude: '', longitude: '', location_precision: 'approximate', operational_status: 'unchecked', capacity_planned: '', capacity_available: '', last_checked: '', note: '', status: 'draft' })
const toForm = (place: Place): PlaceForm => ({
  id: place.id,
  name: place.name,
  kind: place.kind,
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
})

const number = (value: string) => (value.trim() === '' ? null : Number(value))
function payload(source: PlaceForm) {
  return {
    ...(source.id ? { id: source.id } : {}),
    name: source.name,
    kind: source.kind,
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
    status: source.status,
  }
}

// ตัวอย่างที่หน้าบ้านเห็น คำนวณจากฟังก์ชันเดียวกับ API สาธารณะ จึงตรงกันเสมอ
const draftPlace = computed<Place | null>(() => {
  if (form.value) return { ...(payload(form.value) as unknown as Place), id: form.value.id ?? 'PL-ใหม่' }
  return items.value.find((place) => place.id === selectedId.value) ?? null
})
const publicPreview = computed(() => (draftPlace.value ? toPublicPlace(draftPlace.value) : null))
const previewState = computed(() => {
  if (!draftPlace.value) return ''
  if (draftPlace.value.status !== 'published') return 'ฉบับร่าง: หน้าบ้านยังไม่เห็น'
  return draftPlace.value.latitude === null ? 'หน้าบ้านแสดงในรายการ “รอผูกจุด” ไม่ปักบนแผนที่' : 'หน้าบ้านปักหมุดบนแผนที่'
})

const markers = computed<EditorMarker[]>(() => {
  const comm = props.ctx.community.value
  const list: EditorMarker[] = items.value
    .filter((place) => (!place.community_id || place.community_id === comm) && place.latitude !== null && place.longitude !== null && place.id !== form.value?.id && (!publicView.value || place.status === 'published'))
    .map((place) => ({ id: place.id, latitude: place.latitude!, longitude: place.longitude!, color: PLACE_KINDS[place.kind].color, path: PLACE_KINDS[place.kind].path, label: `${place.name} (${PLACE_KINDS[place.kind].label})`, selected: place.id === selectedId.value, dimmed: place.status !== 'published' }))
  const draft = form.value
  const latitude = draft ? number(draft.latitude) : null
  const longitude = draft ? number(draft.longitude) : null
  if (draft && latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    list.push({ id: draft.id ?? 'new', latitude, longitude, color: PLACE_KINDS[draft.kind].color, path: PLACE_KINDS[draft.kind].path, label: draft.name || 'สถานที่ใหม่', selected: true })
  }
  return list
})

function startCreate() { selectedId.value = null; pickMode.value = false; form.value = blankForm() }
function startEdit(place: Place) { selectedId.value = place.id; pickMode.value = false; form.value = toForm(place) }
function cancelForm() { form.value = null; pickMode.value = false }
function onPick(latitude: number, longitude: number) {
  if (!form.value) return
  form.value.latitude = String(latitude)
  form.value.longitude = String(longitude)
  pickMode.value = false
}
function onSelect(id: string) {
  selectedId.value = id
  const place = items.value.find((item) => item.id === id)
  if (place && form.value) startEdit(place)
}
function clearCoordinates() { if (form.value) { form.value.latitude = ''; form.value.longitude = '' } }

async function save() {
  if (!form.value) return
  const saved = await run('save', () => client.places.save(payload(form.value!) as Parameters<typeof client.places.save>[0]), 'บันทึกสถานที่เรียบร้อย')
  if (!saved) return
  selectedId.value = saved.place.id
  form.value = null
  pickMode.value = false
  await load()
}

async function togglePublish(place: Place) {
  const published = place.status !== 'published'
  if (await run('publish', () => client.places.publish(place.id, published), published ? `เผยแพร่ ${place.name} บนหน้าบ้านแล้ว` : `ซ่อน ${place.name} จากหน้าบ้านแล้ว`)) await load()
}

async function confirmDelete() {
  if (!deleting.value) return
  const target = deleting.value
  if (await run('delete', () => client.places.remove(target.id), `ลบ ${target.name} แล้ว`)) {
    deleting.value = null
    if (selectedId.value === target.id) selectedId.value = null
    await load()
  } else deleting.value = null
}
</script>

<template>
  <div class="grid items-start gap-4 xl:grid-cols-[390px_1fr]">
    <section :class="adminCardClass" class="min-w-0" aria-label="รายการสถานที่สำคัญ">
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-[#2C2C2E]">
        <div>
          <h2 :class="sectionTitleClass">สถานที่สำคัญ</h2>
          <p :class="mutedClass">{{ counts.published }} เผยแพร่ · {{ counts.waitingLocation }} รอผูกจุด · ทั้งหมด {{ counts.all }}</p>
        </div>
        <button type="button" :class="primaryButtonClass" @click="startCreate"><Plus class="h-4 w-4" /><span>เพิ่มสถานที่</span></button>
      </div>

      <div class="space-y-2 border-b border-slate-100 p-3 dark:border-[#2C2C2E]">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.q" type="search" placeholder="ค้นหาชื่อหรือรหัส" aria-label="ค้นหาสถานที่" :class="searchFieldClass">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <select v-model="filters.kind" aria-label="กรองตามชนิด" :class="fieldClass">
            <option value="">ทุกชนิด</option>
            <option v-for="(kind, id) in PLACE_KINDS" :key="id" :value="id">{{ kind.label }}</option>
          </select>
          <select v-model="filters.status" aria-label="กรองตามสถานะ" :class="fieldClass">
            <option value="">ทุกสถานะ</option>
            <option value="published">เผยแพร่แล้ว</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="waiting">รอผูกจุด (ไม่มีพิกัด)</option>
          </select>
        </div>
      </div>

      <p v-if="!visible.length" :class="mutedClass" class="p-6 text-center">{{ busy === 'places' ? 'กำลังโหลด…' : 'ไม่พบสถานที่' }}</p>
      <ul v-else class="max-h-[560px] divide-y divide-slate-100 overflow-y-auto dark:divide-[#2C2C2E]">
        <li v-for="place in visible" :key="place.id" :class="place.id === selectedId ? 'bg-sky-50 dark:bg-[#10202B]' : ''">
          <div class="flex items-start gap-3 p-3">
            <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ background: PLACE_KINDS[place.kind].color }" aria-hidden="true" />
            <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="selectedId = place.id">
              <span class="block truncate text-[13px] font-bold">{{ place.name }}</span>
              <span :class="mutedClass" class="block">{{ PLACE_KINDS[place.kind].label }} · {{ place.id }}</span>
              <span class="mt-1 flex flex-wrap gap-1">
                <span :class="chipClass(place.status === 'published' ? 'emerald' : 'neutral')">{{ place.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง' }}</span>
                <span v-if="place.latitude === null" :class="chipClass('amber')">รอผูกจุด</span>
                <span v-else-if="place.location_precision === 'approximate'" :class="chipClass('neutral')">ตำแหน่งประมาณ</span>
              </span>
            </button>
            <div class="flex shrink-0 gap-1">
              <button type="button" :aria-label="place.status === 'published' ? 'ซ่อนจากหน้าบ้าน' : 'เผยแพร่บนหน้าบ้าน'" :title="place.status === 'published' ? 'ซ่อนจากหน้าบ้าน' : 'เผยแพร่บนหน้าบ้าน'" :class="actionButtonClass" class="px-2!" :disabled="busy !== null" @click="togglePublish(place)">
                <EyeOff v-if="place.status === 'published'" class="h-3.5 w-3.5" /><Eye v-else class="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="แก้ไข" title="แก้ไข" :class="actionButtonClass" class="px-2!" @click="startEdit(place)"><Pencil class="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="ลบ" title="ลบ" :class="actionButtonClass" class="px-2! text-rose-600!" @click="deleting = place"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <div class="min-w-0 space-y-4">
      <KokAdminMapEditor :community="props.ctx.community.value" :markers="markers" :pick-mode="pickMode" :fit-token="fitToken" @select="onSelect" @pick="onPick" />

      <section v-if="form" :class="adminCardClass" class="space-y-4 p-4 sm:p-5" :aria-label="form.id ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'">
        <h2 :class="sectionTitleClass">{{ form.id ? `แก้ไข ${form.id}` : 'เพิ่มสถานที่ใหม่' }}</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="place-name" :class="fieldLabelClass">ชื่อสถานที่ *</label>
            <input id="place-name" v-model="form.name" type="text" maxlength="120" :class="fieldClass">
          </div>
          <div>
            <label for="place-kind" :class="fieldLabelClass">ชนิด *</label>
            <select id="place-kind" v-model="form.kind" :class="fieldClass"><option v-for="(kind, id) in PLACE_KINDS" :key="id" :value="id">{{ kind.label }}</option></select>
          </div>
          <div>
            <label for="place-community" :class="fieldLabelClass">ชุมชน</label>
            <select id="place-community" v-model="form.community_id" :class="fieldClass"><option v-for="community in communityOptions" :key="community.id" :value="community.id">{{ community.label }}</option></select>
          </div>
          <div class="sm:col-span-2">
            <label for="place-source" :class="fieldLabelClass">ที่มาของข้อมูล (เช่น F1 ข้อ 1.6, แผนอพยพ PDF)</label>
            <input id="place-source" v-model="form.source_section" type="text" maxlength="120" :class="fieldClass">
          </div>
          <div>
            <label for="place-lat" :class="fieldLabelClass">ละติจูด</label>
            <input id="place-lat" v-model="form.latitude" type="number" step="0.000001" inputmode="decimal" :class="fieldClass">
          </div>
          <div>
            <label for="place-lng" :class="fieldLabelClass">ลองจิจูด</label>
            <input id="place-lng" v-model="form.longitude" type="number" step="0.000001" inputmode="decimal" :class="fieldClass">
          </div>
          <div class="flex flex-wrap gap-2 sm:col-span-2">
            <button type="button" :class="actionButtonClass" :aria-pressed="pickMode" @click="pickMode = !pickMode"><Crosshair class="h-3.5 w-3.5" /><span>{{ pickMode ? 'ยกเลิกการเลือกบนแผนที่' : 'เลือกตำแหน่งจากแผนที่' }}</span></button>
            <button type="button" :class="actionButtonClass" @click="clearCoordinates">ล้างพิกัด (รอผูกจุด)</button>
            <span :class="mutedClass" class="self-center">ไม่มีพิกัดได้ ระบบจะไม่ปักหมุดเดาตำแหน่ง</span>
          </div>
          <div>
            <label for="place-precision" :class="fieldLabelClass">ความแม่นยำของตำแหน่ง</label>
            <select id="place-precision" v-model="form.location_precision" :disabled="form.latitude === '' || form.longitude === ''" :class="fieldClass">
              <option v-for="(label, id) in PLACE_PRECISIONS" :key="id" :value="id">{{ label }}</option>
            </select>
          </div>
          <div>
            <label for="place-operational" :class="fieldLabelClass">ความพร้อมใช้งาน</label>
            <select id="place-operational" v-model="form.operational_status" :class="fieldClass"><option v-for="(label, id) in PLACE_OPERATIONAL" :key="id" :value="id">{{ label }}</option></select>
          </div>
          <div>
            <label for="place-cap-plan" :class="fieldLabelClass">ความจุตามแผน (คน)</label>
            <input id="place-cap-plan" v-model="form.capacity_planned" type="number" min="0" :class="fieldClass">
          </div>
          <div>
            <label for="place-cap-now" :class="fieldLabelClass">ความจุว่างที่ตรวจแล้ว (คน)</label>
            <input id="place-cap-now" v-model="form.capacity_available" type="number" min="0" :class="fieldClass">
          </div>
          <div>
            <label for="place-checked" :class="fieldLabelClass">วันที่ตรวจล่าสุด</label>
            <input id="place-checked" v-model="form.last_checked" type="date" :class="fieldClass">
          </div>
          <div>
            <label for="place-status" :class="fieldLabelClass">สถานะบนหน้าบ้าน</label>
            <select id="place-status" v-model="form.status" :class="fieldClass"><option value="draft">ฉบับร่าง (ยังไม่แสดง)</option><option value="published">เผยแพร่</option></select>
          </div>
          <div class="sm:col-span-2">
            <label for="place-note" :class="fieldLabelClass">หมายเหตุ</label>
            <textarea id="place-note" v-model="form.note" rows="2" maxlength="300" :class="fieldClass" />
          </div>
        </div>
        <p :class="mutedClass">ไม่เก็บเบอร์โทรหรือชื่อผู้ติดต่อ (ตามข้อ R24) ความจุตามแผนไม่ได้หมายความว่ารับคนได้ในวันนี้</p>
        <div class="flex justify-end gap-2">
          <button type="button" :class="actionButtonClass" @click="cancelForm">ยกเลิก</button>
          <button type="button" :class="primaryButtonClass" :disabled="busy !== null || !form.name.trim()" @click="save">บันทึก</button>
        </div>
      </section>

      <section v-if="publicPreview" :class="adminCardClass" class="p-4 sm:p-5" aria-label="ตัวอย่างที่หน้าบ้านเห็น">
        <div class="flex items-center justify-between gap-2">
          <h2 :class="sectionTitleClass">หน้าบ้านเห็นสถานที่นี้แบบนี้</h2>
          <span :class="chipClass(draftPlace?.status === 'published' ? 'emerald' : 'neutral')">{{ previewState }}</span>
        </div>
        <div class="mt-3 flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-[#2C2C2E]">
          <span class="mt-0.5 h-8 w-8 shrink-0 rounded-full" :style="{ background: publicPreview.color }" aria-hidden="true" />
          <div class="min-w-0 space-y-0.5 text-[13px]">
            <p class="font-bold">{{ publicPreview.name || '(ยังไม่ระบุชื่อ)' }}</p>
            <p :class="mutedClass">{{ publicPreview.kindLabel }}<template v-if="publicPreview.sourceSection"> · ที่มา {{ publicPreview.sourceSection }}</template></p>
            <p>{{ publicPreview.precisionLabel }}</p>
            <p>{{ publicPreview.capacityLabel }}</p>
            <p>{{ publicPreview.operationalLabel }}</p>
            <p v-if="publicPreview.note" :class="mutedClass">{{ publicPreview.note }}</p>
          </div>
        </div>
      </section>
    </div>

    <KokModalShell v-if="deleting" width-class="max-w-md" @close="deleting = null">
      <h3 class="text-base font-bold">ยืนยันการลบสถานที่</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">ลบ <strong>{{ deleting.name }}</strong> ({{ deleting.id }}) จะหายจากหน้าบ้านและกู้คืนไม่ได้ ถ้าเพียงต้องการไม่ให้แสดง ให้ใช้ปุ่มซ่อนจากหน้าบ้านแทน</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="deleting = null">ยกเลิก</button>
        <button type="button" :class="dangerButtonClass" :disabled="busy !== null" @click="confirmDelete">ยืนยันลบ</button>
      </div>
    </KokModalShell>
  </div>
</template>
