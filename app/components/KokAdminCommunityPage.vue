<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Crosshair, Eye, EyeOff, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-vue-next'
import {
  COMMUNITY_LAYERS,
  MEMBERS_FIELD,
  UNKNOWN_ANSWER,
  ZONE_FIELD,
  buildCommunityReview,
  classifyLayer,
  householdFields,
  levelGroups,
  type Answers,
  type Household,
} from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { CommunitySettings, HamletRow, HouseholdRow } from '../utils/map-data-admin'
import { householdPinPath, type EditorMarker } from '../utils/map-pin'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, pillClass, primaryButtonClass, searchFieldClass } from '../utils/admin-ui'
import { chipClass, dangerButtonClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokAdminMapEditor from './KokAdminMapEditor.vue'
import KokModalShell from './KokModalShell.vue'
import KokPagination from './KokPagination.vue'

const props = defineProps<{ ctx: AdminMapData; focusId?: string | null }>()
const { client, run, busy, publicView } = props.ctx

const households = ref<HouseholdRow[]>([])
const hamlets = ref<HamletRow[]>([])
const settings = ref<CommunitySettings | null>(null)
const layerId = ref('layer-1')
const filters = reactive({ hamlet: '', level: '', q: '', published: '' })
const page = ref(1)
const pageSize = ref(10)
const selectedId = ref<string | null>(null)
const pickMode = ref(false)
const fitToken = ref(0)
const deleting = ref<HouseholdRow | null>(null)
const showSettings = ref(false)

type Draft = { id?: string; latitude: string; longitude: string; hamlet_id: string; published: boolean; answers: Record<string, string | number> }
const draft = ref<Draft | null>(null)
const fields = householdFields()
const answerFields = COMMUNITY_LAYERS.map((layer) => ({ layer, fields: fields.filter((field) => layer.fields.includes(field.key)) }))

async function load(refit = false) {
  const [list, hamletList, config] = await Promise.all([
    run('households', () => client.households.list({ pageSize: 200 })),
    run('hamlets', () => client.hamlets.list()),
    run('settings', () => client.settings.get()),
  ])
  if (list) households.value = list.items
  if (hamletList) hamlets.value = hamletList.items
  if (config) settings.value = config.settings
  if (refit) fitToken.value += 1
}

onMounted(async () => {
  await load(true)
  if (props.focusId) {
    const target = households.value.find((household) => household.id === props.focusId)
    if (target) startEdit(target)
  }
})

const layer = computed(() => COMMUNITY_LAYERS.find((item) => item.id === layerId.value)!)
const legend = computed(() => levelGroups(households.value, layerId.value))
const hamletName = (id: string | null) => hamlets.value.find((hamlet) => hamlet.id === id)?.name ?? ''

const visible = computed(() => households.value.filter((household) => {
  if (filters.hamlet === 'none' ? household.hamlet_id : filters.hamlet && household.hamlet_id !== filters.hamlet) return false
  if (filters.level && household.levels[layerId.value]?.key !== filters.level) return false
  if (filters.published === 'true' && household.published === false) return false
  if (filters.published === 'false' && household.published !== false) return false
  return !filters.q.trim() || household.id.toLowerCase().includes(filters.q.trim().toLowerCase())
}))
const paged = computed(() => visible.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch(() => [filters.hamlet, filters.level, filters.q, filters.published, layerId.value], () => { page.value = 1 })

// หน้าบ้านเห็นหัวข้อนี้ไหม และเห็นหมุดไหม (ตามตั้งค่าหน้าบ้าน) ใช้กับโหมด “ดูตามหน้าบ้าน”
const layerHidden = computed(() => Boolean(settings.value?.hiddenLayers.includes(layerId.value)))
const pointsHidden = computed(() => settings.value?.pointsPublic === false)
const publicNote = computed(() => {
  if (!publicView.value) return ''
  if (layerHidden.value) return 'หัวข้อนี้ถูกซ่อนจากหน้าบ้าน หน้าบ้านไม่เห็นหมุดและยอดของหัวข้อนี้'
  if (pointsHidden.value) return 'หน้าบ้านแสดงเฉพาะยอดรวม ไม่แสดงหมุดตำแหน่งรายครัวเรือน'
  return ''
})

const markers = computed<EditorMarker[]>(() => {
  const showAll = !publicView.value
  const list: EditorMarker[] = []
  if (showAll || (!layerHidden.value && !pointsHidden.value)) {
    for (const household of visible.value) {
      if (household.id === draft.value?.id || (!showAll && household.published === false)) continue
      const level = household.levels[layerId.value]!
      list.push({ id: household.id, latitude: household.latitude, longitude: household.longitude, color: level.color, path: householdPinPath, label: `${household.id} · ${level.label}`, selected: household.id === selectedId.value, dimmed: household.published === false })
    }
  }
  const current = draft.value
  const latitude = current ? Number(current.latitude) : NaN
  const longitude = current ? Number(current.longitude) : NaN
  if (current && current.latitude !== '' && current.longitude !== '' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    list.push({ id: current.id ?? 'new', latitude, longitude, color: draftLevel.value?.color ?? '#64748B', path: householdPinPath, label: current.id ?? 'ครัวเรือนใหม่', selected: true })
  }
  return list
})

function blankDraft(): Draft {
  const answers: Record<string, string | number> = { [MEMBERS_FIELD]: 0 }
  for (const field of fields) answers[field.key] = field.options.includes(UNKNOWN_ANSWER) ? UNKNOWN_ANSWER : ''
  return { latitude: '', longitude: '', hamlet_id: '', published: true, answers }
}

function startCreate() { selectedId.value = null; pickMode.value = false; draft.value = blankDraft() }
function startEdit(household: HouseholdRow) {
  selectedId.value = household.id
  pickMode.value = false
  draft.value = { id: household.id, latitude: String(household.latitude), longitude: String(household.longitude), hamlet_id: household.hamlet_id ?? '', published: household.published !== false, answers: { ...household.answers } }
}
function cancelDraft() { draft.value = null; pickMode.value = false }
function onPick(latitude: number, longitude: number) {
  if (!draft.value) return
  draft.value.latitude = String(latitude)
  draft.value.longitude = String(longitude)
  pickMode.value = false
}
function onSelect(id: string) {
  const household = households.value.find((item) => item.id === id)
  if (household) startEdit(household)
}

const missing = computed(() => (draft.value ? fields.filter((field) => field.required && !draft.value!.answers[field.key]).map((field) => field.key) : []))
const coordinatesReady = computed(() => draft.value !== null && draft.value.latitude !== '' && draft.value.longitude !== '' && Number.isFinite(Number(draft.value.latitude)) && Number.isFinite(Number(draft.value.longitude)))
const canSave = computed(() => draft.value !== null && coordinatesReady.value && missing.value.length === 0)

const levelOf = (target: (typeof COMMUNITY_LAYERS)[number], answers: Record<string, string | number>) => (missingFor(target).length ? null : classifyLayer(target, answers as Answers))
const missingFor = (target: (typeof COMMUNITY_LAYERS)[number]) => fields.filter((field) => target.fields.includes(field.key) && field.required && !draft.value?.answers[field.key])
const draftLevel = computed(() => (draft.value ? levelOf(layer.value, draft.value.answers) : null))

// พรีวิวป๊อปอัปของหน้าบ้านก่อนบันทึก ผ่านฟังก์ชันสร้างข้อมูลสาธารณะตัวเดียวกับ API
const popupPreview = computed(() => {
  const current = draft.value
  if (!current || !coordinatesReady.value || missing.value.length) return null
  const household = { id: current.id ?? 'MM1-000', seq: 1, community_id: 'thaton', latitude: Number(current.latitude), longitude: Number(current.longitude), hamlet_id: current.hamlet_id || null, answers: current.answers as Answers, published: true } as Household
  const review = buildCommunityReview({ households: [household], hamlets: hamlets.value.map((row) => ({ ...row })) })
  return review.layers.map((item) => ({ ...item.records[0]!, layerId: item.id, label: item.label }))
})
const popupForLayer = computed(() => popupPreview.value?.find((item) => item.layerId === layerId.value) ?? null)

async function save() {
  const current = draft.value
  if (!current || !canSave.value) return
  const before = current.id ? households.value.find((household) => household.id === current.id) : null
  const body = { latitude: Number(current.latitude), longitude: Number(current.longitude), hamlet_id: current.hamlet_id || null, published: current.published, answers: current.answers } as unknown as Partial<Household>
  const saved = await run('save', () => client.households.save(current.id ?? null, body), undefined)
  if (!saved) return
  const changes = before ? COMMUNITY_LAYERS.filter((item) => before.levels[item.id]?.key !== saved.household.levels[item.id]?.key).map((item) => `${item.label}: ระดับ ${before.levels[item.id]!.key} → ${saved.household.levels[item.id]!.key}`) : []
  props.ctx.feedback.value = { type: 'success', message: `${current.id ? `บันทึก ${saved.household.id} แล้ว` : `เพิ่มครัวเรือน ${saved.household.id} แล้ว`} หน้าบ้านเห็นผลทันที${changes.length ? ` · ระดับที่เปลี่ยน: ${changes.join(' · ')}` : ''}` }
  selectedId.value = saved.household.id
  draft.value = null
  await load()
}

async function togglePublish(household: HouseholdRow) {
  const published = household.published === false
  if (await run('publish', () => client.households.publish(household.id, published), published ? `แสดง ${household.id} บนหน้าบ้านแล้ว` : `ซ่อน ${household.id} จากหน้าบ้านแล้ว (ข้อมูลยังอยู่)`)) await load()
}

async function confirmDelete() {
  const target = deleting.value
  if (!target) return
  deleting.value = null
  if (await run('delete', () => client.households.remove(target.id), `ลบ ${target.id} แล้ว`)) {
    if (selectedId.value === target.id) selectedId.value = null
    await load()
  }
}

// ---------- ตั้งค่าหน้าบ้าน ----------
const settingsDraft = ref<{ hiddenLayers: string[]; pointsPublic: boolean; surveyDate: string } | null>(null)
function openSettings() {
  if (!settings.value) return
  settingsDraft.value = { hiddenLayers: [...settings.value.hiddenLayers], pointsPublic: settings.value.pointsPublic, surveyDate: settings.value.surveyDate ?? '' }
  showSettings.value = true
}
async function saveSettings() {
  const value = settingsDraft.value
  if (!value) return
  const saved = await run('settings-save', () => client.settings.save({ hiddenLayers: value.hiddenLayers, pointsPublic: value.pointsPublic, surveyDate: value.surveyDate || null }), 'บันทึกตั้งค่าหน้าบ้านแล้ว หน้าบ้านเห็นภายใน 20 วินาที')
  if (saved) {
    settings.value = saved.settings
    showSettings.value = false
  }
}
function toggleLayer(id: string) {
  const value = settingsDraft.value
  if (!value) return
  value.hiddenLayers = value.hiddenLayers.includes(id) ? value.hiddenLayers.filter((item) => item !== id) : [...value.hiddenLayers, id]
}

const shortLevel = (label: string) => label.replace(/^\d+\.\s*/, '')
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <nav aria-label="หัวข้อข้อมูลชุมชน" class="flex flex-wrap gap-2">
        <button v-for="item in COMMUNITY_LAYERS" :key="item.id" type="button" :class="pillClass(layerId === item.id)" class="whitespace-normal! text-left" :aria-pressed="layerId === item.id" @click="layerId = item.id">
          {{ item.label }}
          <EyeOff v-if="settings?.hiddenLayers.includes(item.id)" class="h-3 w-3" aria-label="ซ่อนจากหน้าบ้าน" />
        </button>
      </nav>
      <div class="ml-auto flex gap-2">
        <button type="button" :class="actionButtonClass" @click="openSettings"><Settings2 class="h-3.5 w-3.5" /><span>ตั้งค่าหน้าบ้าน</span></button>
        <button type="button" :class="primaryButtonClass" @click="startCreate"><Plus class="h-4 w-4" /><span>เพิ่มครัวเรือน</span></button>
      </div>
    </div>

    <div class="grid items-start gap-4 xl:grid-cols-[1fr_440px]">
      <div class="min-w-0 space-y-4">
        <KokAdminMapEditor :markers="markers" :pick-mode="pickMode" :fit-token="fitToken" @select="onSelect" @pick="onPick" />
        <p v-if="publicNote" role="status" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">{{ publicNote }}</p>

        <section :class="adminCardClass" class="p-4" :aria-label="`คำอธิบายสี ${layer.label}`">
          <h2 :class="sectionTitleClass">{{ layer.label }}</h2>
          <p :class="mutedClass">คำอธิบายสีและยอดที่หน้าบ้านเห็น (นับเฉพาะครัวเรือนที่แสดงบนหน้าบ้าน) กดแถวเพื่อกรองตาราง</p>
          <ul class="mt-2 grid gap-1 sm:grid-cols-2">
            <li v-for="level in legend" :key="level.key">
              <button type="button" class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-[#252525]" :class="filters.level === level.key ? 'bg-sky-50 dark:bg-[#10202B]' : ''" @click="filters.level = filters.level === level.key ? '' : level.key">
                <span class="h-3 w-3 shrink-0 rounded-[3px]" :style="{ background: level.color }" aria-hidden="true" />
                <span class="flex-1">{{ level.label }}</span><span class="font-mono tabular-nums">{{ level.count }}</span>
              </button>
            </li>
          </ul>
        </section>

        <section :class="adminCardClass" class="overflow-hidden" aria-label="ตารางครัวเรือน">
          <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-[#2C2C2E]">
            <div class="relative min-w-40 flex-1">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input v-model="filters.q" type="search" placeholder="ค้นหารหัส เช่น MM1-012" aria-label="ค้นหารหัสครัวเรือน" :class="searchFieldClass">
            </div>
            <select v-model="filters.hamlet" aria-label="กรองตามหย่อม" :class="fieldClass" class="w-auto!">
              <option value="">ทุกหย่อม</option><option value="none">ยังไม่ผูกหย่อม</option>
              <option v-for="hamlet in hamlets" :key="hamlet.id" :value="hamlet.id">{{ hamlet.name }}</option>
            </select>
            <select v-model="filters.published" aria-label="กรองตามการแสดงบนหน้าบ้าน" :class="fieldClass" class="w-auto!">
              <option value="">แสดง+ซ่อน</option><option value="true">แสดงบนหน้าบ้าน</option><option value="false">ซ่อนอยู่</option>
            </select>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <caption class="sr-only">ครัวเรือนในข้อมูลชุมชน</caption>
              <thead class="bg-slate-50 text-slate-500 dark:bg-[#141416] dark:text-[#98A2A8]">
                <tr><th scope="col" class="px-3 py-2">รหัส</th><th scope="col" class="px-3 py-2">หย่อม</th><th scope="col" class="px-3 py-2">ระดับ (หัวข้อที่เลือก)</th><th scope="col" class="px-3 py-2 text-right">จัดการ</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
                <tr v-for="household in paged" :key="household.id" class="hover:bg-slate-50 dark:hover:bg-[#252525]" :class="household.id === selectedId ? 'bg-sky-50 dark:bg-[#10202B]' : ''">
                  <td class="px-3 py-2 font-mono"><button type="button" class="cursor-pointer font-bold underline-offset-2 hover:underline" @click="startEdit(household)">{{ household.id }}</button></td>
                  <td class="px-3 py-2">{{ hamletName(household.hamlet_id) || '—' }}</td>
                  <td class="px-3 py-2">
                    <span class="inline-flex items-center gap-1.5" :title="household.levels[layerId]?.label"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: household.levels[layerId]?.color }" aria-hidden="true" />{{ shortLevel(household.levels[layerId]?.label ?? '') }}</span>
                    <span v-if="household.published === false" :class="chipClass('neutral')" class="ml-1">ซ่อน</span>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex justify-end gap-1">
                      <button type="button" :aria-label="household.published === false ? 'แสดงบนหน้าบ้าน' : 'ซ่อนจากหน้าบ้าน'" :title="household.published === false ? 'แสดงบนหน้าบ้าน' : 'ซ่อนจากหน้าบ้าน'" :class="actionButtonClass" class="px-2!" :disabled="busy !== null" @click="togglePublish(household)"><Eye v-if="household.published === false" class="h-3.5 w-3.5" /><EyeOff v-else class="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="แก้ไข" title="แก้ไข" :class="actionButtonClass" class="px-2!" @click="startEdit(household)"><Pencil class="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="ลบ" title="ลบ" :class="actionButtonClass" class="px-2! text-rose-600!" @click="deleting = household"><Trash2 class="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!paged.length"><td colspan="4" class="px-3 py-8 text-center" :class="mutedClass">{{ busy === 'households' ? 'กำลังโหลด…' : 'ไม่พบครัวเรือน' }}</td></tr>
              </tbody>
            </table>
          </div>
          <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="visible.length" />
        </section>
      </div>

      <aside class="min-w-0 xl:sticky xl:top-[5.5rem]" aria-label="แก้ไขครัวเรือน">
        <section v-if="draft" :class="adminCardClass" class="space-y-4 p-4">
          <div class="flex items-center justify-between gap-2">
            <h2 :class="sectionTitleClass">{{ draft.id ? `แก้ไข ${draft.id}` : 'เพิ่มครัวเรือนใหม่' }}</h2>
            <button type="button" :class="actionButtonClass" @click="cancelDraft">ปิด</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div><label for="hh-lat" :class="fieldLabelClass">ละติจูด *</label><input id="hh-lat" v-model="draft.latitude" type="number" step="0.000001" :class="fieldClass"></div>
            <div><label for="hh-lng" :class="fieldLabelClass">ลองจิจูด *</label><input id="hh-lng" v-model="draft.longitude" type="number" step="0.000001" :class="fieldClass"></div>
            <button type="button" :class="actionButtonClass" class="col-span-2" :aria-pressed="pickMode" @click="pickMode = !pickMode"><Crosshair class="h-3.5 w-3.5" /><span>{{ pickMode ? 'ยกเลิกการเลือกบนแผนที่' : 'เลือกตำแหน่งจากแผนที่' }}</span></button>
            <div class="col-span-2">
              <label for="hh-hamlet" :class="fieldLabelClass">หย่อมบ้าน (ชื่อ “{{ ZONE_FIELD }}” ที่หน้าบ้านเห็น)</label>
              <select id="hh-hamlet" v-model="draft.hamlet_id" :class="fieldClass"><option value="">ยังไม่ผูกหย่อม</option><option v-for="hamlet in hamlets" :key="hamlet.id" :value="hamlet.id">{{ hamlet.name }}</option></select>
            </div>
            <label class="col-span-2 flex cursor-pointer items-center gap-2 text-xs font-semibold"><input v-model="draft.published" type="checkbox"> แสดงบนหน้าบ้าน (ไม่ติ๊ก = ซ่อน ข้อมูลยังอยู่)</label>
          </div>

          <div class="space-y-2">
            <details v-for="group in answerFields" :key="group.layer.id" :open="group.layer.id === layerId" class="rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
              <summary class="flex cursor-pointer items-center justify-between gap-2 p-3 text-xs font-bold">
                <span>{{ group.layer.label }}</span>
                <span v-if="levelOf(group.layer, draft.answers)" :class="chipClass('neutral')" :style="{ borderColor: levelOf(group.layer, draft.answers)!.color }"><span class="h-2 w-2 rounded-full" :style="{ background: levelOf(group.layer, draft.answers)!.color }" />ระดับ {{ levelOf(group.layer, draft.answers)!.key }}</span>
                <span v-else :class="chipClass('amber')">ยังไม่ครบ</span>
              </summary>
              <div class="space-y-3 border-t border-slate-100 p-3 dark:border-[#2C2C2E]">
                <div v-if="group.layer.fields.includes(MEMBERS_FIELD)">
                  <label for="hh-members" :class="fieldLabelClass">{{ MEMBERS_FIELD }}</label>
                  <input id="hh-members" v-model.number="draft.answers[MEMBERS_FIELD]" type="number" min="0" max="30" :class="fieldClass">
                </div>
                <div v-for="field in group.fields" :key="field.key">
                  <label :for="`hh-${field.key}`" :class="fieldLabelClass">{{ field.key }}<span v-if="field.required" class="text-rose-600"> *</span></label>
                  <select :id="`hh-${field.key}`" v-model="draft.answers[field.key]" :class="fieldClass">
                    <option v-if="field.required" value="" disabled>เลือกคำตอบ</option>
                    <option v-for="option in field.options" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          <div v-if="popupForLayer" class="rounded-xl border border-slate-200 p-3 text-xs dark:border-[#2C2C2E]">
            <p class="mb-1.5 font-bold">ป๊อปอัปที่หน้าบ้านเห็น · {{ popupForLayer.label }}</p>
            <p class="flex items-center gap-2 font-semibold"><span class="h-3 w-3 rounded-full" :style="{ background: popupForLayer.color }" />{{ popupForLayer.status }}</p>
            <p v-for="(value, key) in popupForLayer.fields" :key="key" class="mt-1"><span :class="mutedClass">{{ key }}:</span> {{ value || 'ไม่ระบุ' }}</p>
          </div>
          <p v-else :class="mutedClass">กรอกพิกัดและคำตอบที่มีดาว (*) ให้ครบเพื่อดูตัวอย่างที่หน้าบ้านเห็น</p>

          <div class="flex justify-end gap-2">
            <button type="button" :class="actionButtonClass" @click="cancelDraft">ยกเลิก</button>
            <button type="button" :class="primaryButtonClass" :disabled="!canSave || busy !== null" @click="save">บันทึก</button>
          </div>
        </section>
        <section v-else :class="adminCardClass" class="p-5 text-center">
          <p :class="mutedClass">เลือกหมุดบนแผนที่หรือแถวในตารางเพื่อแก้ไข หรือกด “เพิ่มครัวเรือน”</p>
          <p :class="mutedClass" class="mt-2">ระดับ สี และป๊อปอัปของทุกหัวข้อคำนวณใหม่อัตโนมัติจากคำตอบ ไม่ต้องตั้งเอง</p>
        </section>
      </aside>
    </div>

    <KokModalShell v-if="showSettings && settingsDraft" width-class="max-w-lg" @close="showSettings = false">
      <h3 class="text-base font-bold">ตั้งค่าสิ่งที่หน้าบ้านเห็น</h3>
      <fieldset class="space-y-2">
        <legend :class="fieldLabelClass">หัวข้อที่แสดงบนหน้าบ้าน (ติ๊กเพื่อแสดง)</legend>
        <label v-for="item in COMMUNITY_LAYERS" :key="item.id" class="flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" :checked="!settingsDraft.hiddenLayers.includes(item.id)" @change="toggleLayer(item.id)"> {{ item.label }}</label>
      </fieldset>
      <label class="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <input v-model="settingsDraft.pointsPublic" type="checkbox" class="mt-0.5">
        <span><strong>แสดงหมุดตำแหน่งรายครัวเรือนต่อสาธารณะ</strong><br>ปิดแล้วหน้าบ้านเห็นเฉพาะยอดรวมของแต่ละระดับ ไม่เห็นพิกัดบ้าน (แนวทาง DESIGN.md และข้อ R15)</span>
      </label>
      <div><label for="survey-date" :class="fieldLabelClass">วันที่สำรวจ (ถ้าทราบ)</label><input id="survey-date" v-model="settingsDraft.surveyDate" type="date" :class="fieldClass"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="showSettings = false">ยกเลิก</button>
        <button type="button" :class="primaryButtonClass" :disabled="busy !== null" @click="saveSettings">บันทึก</button>
      </div>
    </KokModalShell>

    <KokModalShell v-if="deleting" width-class="max-w-md" @close="deleting = null">
      <h3 class="text-base font-bold">ยืนยันการลบครัวเรือน</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">ลบ <strong class="font-mono">{{ deleting.id }}</strong> จะหายจากทุกหัวข้อและกู้คืนไม่ได้ ถ้าเพียงไม่ต้องการให้แสดง ให้ใช้ปุ่มซ่อนจากหน้าบ้านแทน (ครัวเรือนที่อยู่ในรอบอพยพที่เปิดอยู่ลบไม่ได้)</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="deleting = null">ยกเลิก</button>
        <button type="button" :class="dangerButtonClass" :disabled="busy !== null" @click="confirmDelete">ยืนยันลบ</button>
      </div>
    </KokModalShell>
  </div>
</template>
