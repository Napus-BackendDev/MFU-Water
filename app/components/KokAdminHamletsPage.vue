<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Merge, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import { HAMLET_K_THRESHOLD, PROFILE_FIELDS, type CommunityId, type Hamlet } from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { HamletRow, HouseholdRow } from '../utils/map-data-admin'
import { communityProfiles } from '../utils/community-profiles'
import { communityTargets } from '../utils/kok-contract'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, primaryButtonClass } from '../utils/admin-ui'
import { chipClass, communityOptions, dangerButtonClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokCommunityProfileBody from './KokCommunityProfileBody.vue'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const { client, run, busy, community } = props.ctx

// ---------- การ์ดรู้จักชุมชน (แท็บหมู่บ้านของหน้าบ้าน) ----------
type ProfileText = { title: string; basin: string; people: string; livelihood: string; risk: string }
const overrides = ref<Record<string, ProfileText>>({})
const profile = reactive<ProfileText>({ title: '', basin: '', people: '', livelihood: '', risk: '' })
const profileLabels: Record<string, string> = { title: 'ชื่อที่แสดง', basin: 'ลุ่มน้ำ', people: 'ผู้คน', livelihood: 'อาชีพ', risk: 'ความเสี่ยง' }

const target = computed(() => communityTargets.find((item) => item.id === community.value)!)
const defaults = computed<ProfileText>(() => communityProfiles[community.value])
const hasOverride = computed(() => Boolean(overrides.value[community.value]))
const profileChanged = computed(() => PROFILE_FIELDS.some((field) => profile[field as keyof ProfileText] !== (overrides.value[community.value] ?? defaults.value)[field as keyof ProfileText]))

function fillProfile() { Object.assign(profile, overrides.value[community.value] ?? defaults.value) }

async function loadProfiles() {
  const result = await run('profiles', () => client.profiles.list())
  if (!result) return
  overrides.value = Object.fromEntries(result.items.map(({ community_id: id, title, basin, people, livelihood, risk }) => [id, { title, basin, people, livelihood, risk }]))
  fillProfile()
}

function changeCommunity(id: CommunityId) { community.value = id; fillProfile() }

async function saveProfile() {
  if (await run('profile-save', () => client.profiles.save(community.value, { ...profile }), `บันทึกการ์ดรู้จักชุมชน ${target.value.name} แล้ว หน้าบ้านเห็นข้อความใหม่ทันที`)) await loadProfiles()
}
async function resetProfile() {
  if (await run('profile-reset', () => client.profiles.reset(community.value), `คืนข้อความเดิมของ ${target.value.name} แล้ว`)) await loadProfiles()
}

// ---------- ทะเบียนหย่อมบ้าน ----------
const hamlets = ref<HamletRow[]>([])
const unassigned = ref(0)
const suggestions = ref<Array<{ ids: string[]; names: string[] }>>([])

async function loadHamlets() {
  const result = await run('hamlets', () => client.hamlets.list())
  if (!result) return
  hamlets.value = result.items
  unassigned.value = result.unassigned
  suggestions.value = result.suggestions
}
onMounted(async () => { await Promise.all([loadProfiles(), loadHamlets()]) })

type HamletForm = { id?: string; name: string; aliases: string; note: string; latitude: string; longitude: string; status: Hamlet['status'] }
const form = ref<HamletForm | null>(null)
const deleting = ref<HamletRow | null>(null)
const mergeAsk = ref<{ ids: string[]; names: string[] } | null>(null)
const mergeInto = ref('')

const startCreate = () => { form.value = { name: '', aliases: '', note: '', latitude: '', longitude: '', status: 'published' } }
const startEdit = (hamlet: HamletRow) => {
  form.value = { id: hamlet.id, name: hamlet.name, aliases: hamlet.aliases.join(', '), note: hamlet.note, latitude: hamlet.center ? String(hamlet.center.latitude) : '', longitude: hamlet.center ? String(hamlet.center.longitude) : '', status: hamlet.status }
}

async function saveHamlet() {
  const source = form.value
  if (!source) return
  const body = {
    ...(source.id ? { id: source.id } : {}),
    name: source.name,
    aliases: source.aliases.split(/[,，\n]/).map((alias) => alias.trim()).filter(Boolean),
    note: source.note,
    status: source.status,
    center: source.latitude && source.longitude ? { latitude: Number(source.latitude), longitude: Number(source.longitude) } : null,
    community_id: community.value,
  }
  if (await run('hamlet-save', () => client.hamlets.save(body as Parameters<typeof client.hamlets.save>[0]), 'บันทึกหมู่บ้านแล้ว')) {
    form.value = null
    await loadHamlets()
  }
}

async function confirmDelete() {
  const hamlet = deleting.value
  if (!hamlet) return
  deleting.value = null
  if (await run('hamlet-delete', () => client.hamlets.remove(hamlet.id), `ลบหมู่บ้าน ${hamlet.name} แล้ว`)) await loadHamlets()
}

function askMerge(group: { ids: string[]; names: string[] }) {
  mergeAsk.value = group
  mergeInto.value = group.ids[0] ?? ''
}
async function confirmMerge() {
  const ask = mergeAsk.value
  if (!ask || !mergeInto.value) return
  const fromIds = ask.ids.filter((id) => id !== mergeInto.value)
  mergeAsk.value = null
  const merged = await run('merge', () => client.hamlets.merge(fromIds, mergeInto.value), undefined)
  if (merged) {
    props.ctx.feedback.value = { type: 'success', message: `รวมหมู่บ้านแล้ว ย้ายครัวเรือน ${merged.moved} หลังไปที่ “${merged.into.name}” ชื่อเดิมเก็บเป็นชื่อเรียกอื่น` }
    await loadHamlets()
  }
}

// ---------- ผูกครัวเรือนที่ยังไม่มีหย่อม ----------
const assigning = ref<{ items: HouseholdRow[]; hamletId: string; picked: Set<string> } | null>(null)
async function openAssign() {
  const result = await run('assign-load', () => client.households.list({ hamlet: 'none', pageSize: 200 }))
  if (result) assigning.value = { items: result.items, hamletId: hamlets.value[0]?.id ?? '', picked: new Set(result.items.map((household) => household.id)) }
}
function togglePicked(id: string) {
  const current = assigning.value
  if (!current) return
  if (current.picked.has(id)) current.picked.delete(id)
  else current.picked.add(id)
}
async function confirmAssign() {
  const current = assigning.value
  if (!current || !current.hamletId || !current.picked.size) return
  const done = await run('assign', () => client.households.assign([...current.picked], current.hamletId), undefined)
  if (done) {
    props.ctx.feedback.value = { type: 'success', message: `ผูกหมู่บ้านให้ครัวเรือน ${done.assigned} หลังแล้ว` }
    assigning.value = null
    await loadHamlets()
  }
}
</script>

<template>
  <div class="grid items-start gap-4 xl:grid-cols-[1fr_1.15fr]">
    <section :class="adminCardClass" class="space-y-4 p-4 sm:p-5" aria-label="การ์ดรู้จักชุมชน">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 :class="sectionTitleClass">การ์ด “รู้จักชุมชน” (แท็บหย่อมบ้านของหน้าบ้าน)</h2>
          <p :class="mutedClass">แก้ข้อความที่ชาวบ้านเห็นบนแผนที่ ไม่แก้ก็ใช้ข้อความเดิมจากชีต Village</p>
        </div>
        <select :value="community" aria-label="เลือกชุมชน" :class="fieldClass" class="w-auto!" @change="changeCommunity(($event.target as HTMLSelectElement).value as CommunityId)">
          <option v-for="item in communityOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </div>
      <div class="grid gap-3">
        <div v-for="field in PROFILE_FIELDS" :key="field">
          <label :for="`profile-${field}`" :class="fieldLabelClass">{{ profileLabels[field] }}</label>
          <input v-if="field === 'title'" :id="`profile-${field}`" v-model="profile.title" type="text" maxlength="300" :class="fieldClass">
          <textarea v-else :id="`profile-${field}`" v-model="profile[field as keyof ProfileText]" rows="2" maxlength="300" :class="fieldClass" />
        </div>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" :class="actionButtonClass" :disabled="!hasOverride || busy !== null" @click="resetProfile"><RotateCcw class="h-3.5 w-3.5" /><span>คืนข้อความเดิม</span></button>
        <button type="button" :class="primaryButtonClass" :disabled="!profileChanged || busy !== null" @click="saveProfile">บันทึก</button>
      </div>
      <div>
        <p :class="mutedClass" class="mb-1 font-semibold">หน้าบ้านเห็นการ์ดแบบนี้</p>
        <div class="rounded-2xl border border-slate-200 p-4 dark:border-[#2C2C2E]">
          <h3 class="text-base font-bold leading-snug">รู้จักชุมชน · {{ profile.title }}</h3>
          <p :class="mutedClass" class="mt-0.5">{{ target.subdistrict }} {{ target.district }} {{ target.province }}</p>
          <KokCommunityProfileBody :profile="profile" />
        </div>
      </div>
    </section>

    <section :class="adminCardClass" class="min-w-0" aria-label="ทะเบียนหมู่บ้าน">
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-[#2C2C2E]">
        <div>
          <h2 :class="sectionTitleClass">ทะเบียนหมู่บ้าน</h2>
          <p :class="mutedClass">ชื่อหมู่บ้านที่ใช้ในระบบ หน้าบ้านบอกจำนวนครัวเรือนเมื่อมีตั้งแต่ {{ HAMLET_K_THRESHOLD }} หลังขึ้นไป</p>
        </div>
        <button type="button" :class="primaryButtonClass" @click="startCreate"><Plus class="h-4 w-4" /><span>เพิ่มหมู่บ้าน</span></button>
      </div>

      <div v-if="suggestions.length || unassigned" class="space-y-2 border-b border-slate-100 p-3 dark:border-[#2C2C2E]">
        <div v-for="group in suggestions" :key="group.ids.join()" class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span>พบชื่อคล้ายกัน: <strong>{{ group.names.join(' / ') }}</strong> น่าจะเป็นหมู่บ้านเดียวกัน</span>
          <button type="button" :class="actionButtonClass" @click="askMerge(group)"><Merge class="h-3.5 w-3.5" /><span>รวมหมู่บ้าน</span></button>
        </div>
        <div v-if="unassigned" class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          <span>มีครัวเรือน <strong>{{ unassigned }}</strong> หลังที่ยังไม่ผูกกับหมู่บ้าน (ชื่อหย่อมว่างในแบบสำรวจ)</span>
          <button type="button" :class="actionButtonClass" @click="openAssign">ผูกหมู่บ้าน</button>
        </div>
      </div>

      <ul class="max-h-[560px] divide-y divide-slate-100 overflow-y-auto dark:divide-[#2C2C2E]">
        <li v-for="hamlet in hamlets" :key="hamlet.id" class="flex items-start gap-3 p-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-bold">{{ hamlet.name }} <span :class="mutedClass" class="font-normal">{{ hamlet.id }}</span></p>
            <p v-if="hamlet.aliases.length" :class="mutedClass">ชื่อเรียกอื่น: {{ hamlet.aliases.join(', ') }}</p>
            <p v-if="hamlet.note" :class="mutedClass">{{ hamlet.note }}</p>
            <span class="mt-1 flex flex-wrap gap-1">
              <span :class="chipClass('sky')">{{ hamlet.household_count }} ครัวเรือน</span>
              <span v-if="hamlet.household_count < HAMLET_K_THRESHOLD" :class="chipClass('amber')">หน้าบ้านซ่อนตัวเลข (&lt; {{ HAMLET_K_THRESHOLD }})</span>
              <span :class="chipClass(hamlet.status === 'published' ? 'emerald' : 'neutral')">{{ hamlet.status === 'published' ? 'แสดง' : 'ซ่อน' }}</span>
            </span>
          </div>
          <div class="flex shrink-0 gap-1">
            <button type="button" aria-label="แก้ไข" title="แก้ไข" :class="actionButtonClass" class="px-2!" @click="startEdit(hamlet)"><Pencil class="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="ลบ" title="ลบ" :class="actionButtonClass" class="px-2! text-rose-600!" @click="deleting = hamlet"><Trash2 class="h-3.5 w-3.5" /></button>
          </div>
        </li>
      </ul>
    </section>

    <KokModalShell v-if="form" width-class="max-w-lg" @close="form = null">
      <h3 class="text-base font-bold">{{ form.id ? `แก้ไขหมู่บ้าน ${form.id}` : 'เพิ่มหมู่บ้าน' }}</h3>
      <div class="grid gap-3">
        <div><label for="hamlet-name" :class="fieldLabelClass">ชื่อหมู่บ้าน *</label><input id="hamlet-name" v-model="form.name" type="text" maxlength="80" :class="fieldClass"></div>
        <div><label for="hamlet-alias" :class="fieldLabelClass">ชื่อเรียกอื่น (คั่นด้วยจุลภาค)</label><input id="hamlet-alias" v-model="form.aliases" type="text" :class="fieldClass"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label for="hamlet-lat" :class="fieldLabelClass">จุดกลางหมู่บ้าน: ละติจูด</label><input id="hamlet-lat" v-model="form.latitude" type="number" step="0.000001" :class="fieldClass"></div>
          <div><label for="hamlet-lng" :class="fieldLabelClass">ลองจิจูด</label><input id="hamlet-lng" v-model="form.longitude" type="number" step="0.000001" :class="fieldClass"></div>
        </div>
        <div><label for="hamlet-note" :class="fieldLabelClass">หมายเหตุ</label><textarea id="hamlet-note" v-model="form.note" rows="2" maxlength="300" :class="fieldClass" /></div>
        <div><label for="hamlet-status" :class="fieldLabelClass">การแสดงบนหน้าบ้าน</label><select id="hamlet-status" v-model="form.status" :class="fieldClass"><option value="published">แสดง</option><option value="draft">ซ่อน</option></select></div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="form = null">ยกเลิก</button>
        <button type="button" :class="primaryButtonClass" :disabled="busy !== null || !form.name.trim()" @click="saveHamlet">บันทึก</button>
      </div>
    </KokModalShell>

    <KokModalShell v-if="deleting" width-class="max-w-md" @close="deleting = null">
      <h3 class="text-base font-bold">ยืนยันการลบหมู่บ้าน</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">ลบหมู่บ้าน <strong>{{ deleting.name }}</strong> ลบได้เมื่อไม่มีครัวเรือนอยู่ในหมู่บ้านนี้ (ตอนนี้มี {{ deleting.household_count }} หลัง) ถ้ามีให้ย้ายหรือรวมหมู่บ้านก่อน</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="deleting = null">ยกเลิก</button>
        <button type="button" :class="dangerButtonClass" :disabled="busy !== null" @click="confirmDelete">ยืนยันลบ</button>
      </div>
    </KokModalShell>

    <KokModalShell v-if="mergeAsk" width-class="max-w-md" @close="mergeAsk = null">
      <h3 class="text-base font-bold">รวมหมู่บ้าน</h3>
      <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">เลือกชื่อที่จะใช้ต่อ ครัวเรือนของอีกหมู่บ้านจะย้ายมาที่นี่ และชื่อเดิมถูกเก็บเป็นชื่อเรียกอื่น หน้าบ้านจะเห็นชื่อเดียว</p>
      <label for="merge-into" :class="fieldLabelClass">ใช้ชื่อ</label>
      <select id="merge-into" v-model="mergeInto" :class="fieldClass"><option v-for="(id, index) in mergeAsk.ids" :key="id" :value="id">{{ mergeAsk.names[index] }}</option></select>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="mergeAsk = null">ยกเลิก</button>
        <button type="button" :class="primaryButtonClass" :disabled="busy !== null" @click="confirmMerge">รวมหมู่บ้าน</button>
      </div>
    </KokModalShell>

    <KokModalShell v-if="assigning" width-class="max-w-lg" @close="assigning = null">
      <h3 class="text-base font-bold">ผูกครัวเรือนกับหมู่บ้าน</h3>
      <p class="text-xs text-slate-600 dark:text-slate-300">เลือกครัวเรือนที่ต้องการ แล้วเลือกหมู่บ้านปลายทาง (รู้ว่าอยู่หมู่บ้านไหนค่อยผูก ถ้ายังไม่แน่ใจปล่อยไว้ได้)</p>
      <label for="assign-hamlet" :class="fieldLabelClass">หมู่บ้านปลายทาง</label>
      <select id="assign-hamlet" v-model="assigning.hamletId" :class="fieldClass"><option v-for="hamlet in hamlets" :key="hamlet.id" :value="hamlet.id">{{ hamlet.name }}</option></select>
      <ul class="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-[#2C2C2E] dark:border-[#2C2C2E]">
        <li v-for="household in assigning.items" :key="household.id">
          <label class="flex cursor-pointer items-center gap-2 p-2.5 text-xs">
            <input type="checkbox" :checked="assigning.picked.has(household.id)" @change="togglePicked(household.id)">
            <span class="font-mono">{{ household.id }}</span>
            <span :class="mutedClass">{{ household.latitude.toFixed(5) }}, {{ household.longitude.toFixed(5) }}</span>
          </label>
        </li>
      </ul>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" :class="actionButtonClass" @click="assigning = null">ยกเลิก</button>
        <button type="button" :class="primaryButtonClass" :disabled="busy !== null || !assigning.picked.size" @click="confirmAssign">ผูก {{ assigning.picked.size }} หลัง</button>
      </div>
    </KokModalShell>
  </div>
</template>
