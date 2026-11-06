<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-vue-next'
import { PLACE_KINDS } from '../../src/lib/map-data'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { HouseholdRow, MapDataClient } from '../utils/map-data-admin'
import { householdPinPath, type EditorMarker } from '../utils/map-pin'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import { chipClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokAdminMapEditor from './KokAdminMapEditor.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const emit = defineEmits<{ (e: 'go', tab: 'community' | 'places', id?: string): void }>()
const { client, run, busy, publicView } = props.ctx

type Overview = Awaited<ReturnType<MapDataClient['evacuation']['overview']>>
const overview = ref<Overview | null>(null)
const households = ref<HouseholdRow[]>([])
const fitToken = ref(0)
const editingIndex = ref<number | null>(null)
const draftRoute = ref<Array<[number, number]> | null>(null)

async function load(refit = false) {
  const comm = props.ctx.community.value
  const [loaded, list] = await Promise.all([
    run('evacuation', () => client.evacuation.overview(comm)),
    run('households', () => client.households.list({ pageSize: 200, community: comm })),
  ])
  if (loaded) overview.value = loaded
  if (list) households.value = list.items.filter((h) => (h.community_id ?? 'thaton') === comm)
  if (refit) fitToken.value += 1
}
onMounted(() => load(true))
watch(() => props.ctx.community.value, () => load(true))

// ครัวเรือนในคิวอพยพ = ระดับ 1, 2, 4 ของหัวข้อ “กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต” (ระดับ 5 ปกติไม่เข้าคิว เหมือนโหมดอพยพ)
const queued = computed(() => households.value.filter((household) => household.levels['layer-1']?.key !== '5' && (!publicView.value || household.published !== false)))

const markers = computed<EditorMarker[]>(() => {
  const list: EditorMarker[] = queued.value.map((household) => {
    const level = household.levels['layer-1']!
    return { id: household.id, latitude: household.latitude, longitude: household.longitude, color: level.color, path: householdPinPath, label: `${household.id} · ${level.label}`, dimmed: household.published === false }
  })
  for (const place of overview.value?.destinations ?? []) {
    if (place.latitude === null || place.longitude === null || (publicView.value && place.status !== 'published')) continue
    const kind = PLACE_KINDS[place.kind]
    list.push({ id: place.id, latitude: place.latitude, longitude: place.longitude, color: kind.evacuationColor ?? kind.color, path: kind.path, label: `${place.name} (${kind.label})`, dimmed: place.status !== 'published' })
  }
  return list
})

const lines = computed(() => (overview.value?.routes.routes ?? []).filter((_, index) => index !== editingIndex.value))

function onSelect(id: string) {
  if (households.value.some((household) => household.id === id)) emit('go', 'community', id)
  else emit('go', 'places', id)
}

function startEditRoute(index: number) {
  editingIndex.value = index
  draftRoute.value = (overview.value?.routes.routes[index] ?? []).map((point) => [...point] as [number, number])
}
function startNewRoute() {
  editingIndex.value = overview.value?.routes.routes.length ?? 0
  draftRoute.value = []
}
function cancelRoute() { editingIndex.value = null; draftRoute.value = null }
const undoPoint = () => { if (draftRoute.value) draftRoute.value = draftRoute.value.slice(0, -1) }

async function persist(routes: Array<Array<[number, number]>>, message: string) {
  const current = overview.value?.routes
  const saved = await run('route', () => client.evacuation.saveRoute(routes, current?.alignment ?? 'manual', current?.source ?? '', props.ctx.community.value), message)
  if (saved) {
    cancelRoute()
    await load()
  }
}
async function saveRoute() {
  if (editingIndex.value === null || !draftRoute.value) return
  const routes = (overview.value?.routes.routes ?? []).map((route) => route.map((point) => [...point] as [number, number]))
  routes[editingIndex.value] = draftRoute.value
  await persist(routes, 'บันทึกเส้นทางอพยพแล้ว หน้าบ้านเห็นเส้นใหม่ภายใน 20 วินาที')
}
async function deleteRoute(index: number) {
  const routes = (overview.value?.routes.routes ?? []).filter((_, position) => position !== index)
  await persist(routes, `ลบเส้นทางที่ ${index + 1} แล้ว`)
}
</script>

<template>
  <div v-if="overview" class="space-y-4">
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div v-for="group in overview.groups" :key="group.key" class="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <p class="flex items-center gap-2 text-xs text-slate-500 dark:text-[#98A2A8]"><span class="h-3 w-3 shrink-0 rounded-[3px]" :style="{ background: group.color }" aria-hidden="true" />ระดับ {{ group.key }}</p>
        <p class="mt-0.5 font-mono text-[26px] font-bold leading-tight tabular-nums" :style="{ color: group.color }">{{ group.count }}</p>
        <p class="text-[11px] leading-snug text-slate-500 dark:text-[#98A2A8]">{{ group.label.replace(/^\d+\.\s*/, '') }}</p>
        <span :class="chipClass(group.inQueue ? 'rose' : 'neutral')" class="mt-1.5">{{ group.inQueue ? 'เข้าคิวอพยพ' : 'ไม่เข้าคิว' }}</span>
      </div>
    </div>

    <div class="grid items-start gap-4 xl:grid-cols-[1fr_400px]">
      <div class="min-w-0 space-y-3">
        <KokAdminMapEditor :community="props.ctx.community.value" :markers="markers" :lines="lines" :route-draft="draftRoute" :fit-token="fitToken" height-class="h-[520px]" @select="onSelect" @route-change="draftRoute = $event" />
        <p :class="mutedClass">กดหมุดครัวเรือนเพื่อดูข้อมูล กดหมุดที่หมายเพื่อไปแก้ในหน้า “สถานที่สำคัญ” ระดับของครัวเรือนคำนวณจากคำตอบ จึงไม่ต้องจัดกลุ่มอพยพด้วยมือ</p>
      </div>

      <div class="min-w-0 space-y-4">
        <section :class="adminCardClass" class="p-4" aria-label="เส้นทางอพยพ">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 :class="sectionTitleClass">เส้นทางอพยพตามแผน</h2>
              <p :class="mutedClass">{{ overview.routes.routes.length }} เส้น · ตำแหน่งประมาณ ไม่ใช่การนำทางจริง</p>
            </div>
            <button v-if="editingIndex === null" type="button" :class="actionButtonClass" @click="startNewRoute"><Plus class="h-3.5 w-3.5" /><span>เพิ่มเส้น</span></button>
          </div>

          <ul v-if="editingIndex === null" class="mt-3 divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <li v-for="(route, index) in overview.routes.routes" :key="index" class="flex items-center justify-between gap-2 py-2 text-[13px]">
              <span>เส้นทางที่ {{ index + 1 }} <span :class="mutedClass">· {{ route.length }} จุด</span></span>
              <span class="flex gap-1">
                <button type="button" aria-label="แก้เส้นทาง" title="แก้เส้นทาง" :class="actionButtonClass" class="px-2!" @click="startEditRoute(index)"><Pencil class="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="ลบเส้นทาง" title="ลบเส้นทาง" :class="actionButtonClass" class="px-2! text-rose-600!" :disabled="busy !== null" @click="deleteRoute(index)"><Trash2 class="h-3.5 w-3.5" /></button>
              </span>
            </li>
          </ul>
          <div v-else class="mt-3 space-y-3">
            <p class="text-xs">กำลังแก้เส้นทางที่ {{ (editingIndex ?? 0) + 1 }} · {{ draftRoute?.length ?? 0 }} จุด · คลิกแผนที่เพื่อต่อเส้น ลากจุดเพื่อย้าย (เขียว = จุดแรก แดง = จุดสุดท้าย)</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" :class="actionButtonClass" :disabled="!draftRoute?.length" @click="undoPoint"><Undo2 class="h-3.5 w-3.5" /><span>ลบจุดสุดท้าย</span></button>
              <button type="button" :class="actionButtonClass" @click="cancelRoute">ยกเลิก</button>
              <button type="button" :class="primaryButtonClass" :disabled="(draftRoute?.length ?? 0) < 2 || busy !== null" @click="saveRoute">บันทึกเส้นทาง</button>
            </div>
          </div>
        </section>

        <section :class="adminCardClass" class="p-4" aria-label="ที่หมายอพยพ">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 :class="sectionTitleClass">ที่หมาย (ศูนย์พักพิงและจุดรวมพล)</h2>
              <p :class="mutedClass">มาจากสถานที่สำคัญชนิดศูนย์พักพิง/จุดรวมพล</p>
            </div>
            <button type="button" :class="actionButtonClass" @click="emit('go', 'places')">จัดการ</button>
          </div>
          <ul class="mt-3 divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <li v-for="place in overview.destinations" :key="place.id" class="flex items-start gap-2 py-2 text-[13px]">
              <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ background: PLACE_KINDS[place.kind].evacuationColor ?? PLACE_KINDS[place.kind].color }" aria-hidden="true" />
              <span class="min-w-0 flex-1"><span class="block font-bold">{{ place.name }}</span><span :class="mutedClass">{{ PLACE_KINDS[place.kind].label }} · {{ place.id }}</span></span>
              <span class="flex flex-col items-end gap-1">
                <span :class="chipClass(place.status === 'published' ? 'emerald' : 'neutral')">{{ place.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง' }}</span>
                <span v-if="place.latitude === null" :class="chipClass('amber')">รอผูกจุด</span>
              </span>
            </li>
            <li v-if="!overview.destinations.length" :class="mutedClass" class="py-3">ยังไม่มีที่หมาย เพิ่มได้ที่หน้า “สถานที่สำคัญ”</li>
          </ul>
        </section>

        <section :class="adminCardClass" class="p-4" aria-label="กติกาจัดคิว">
          <h2 :class="sectionTitleClass">กติกาการจัดคิว (โหมดอพยพ)</h2>
          <ol :class="mutedClass" class="mt-2 list-decimal space-y-1 pl-4">
            <li>ระดับ 5 (ปกติ) ไม่เข้าคิว เรียงระดับ 1 → 2 → 4</li>
            <li>ระดับเท่ากัน: จำนวนสมาชิกเปราะบางมากกว่าก่อน</li>
            <li>ยังเท่ากัน: เคยประสบเหตุรุนแรงจากน้ำก่อน แล้วบ้านที่ไกลจากที่หมายมากกว่าก่อน</li>
          </ol>
        </section>
      </div>
    </div>
  </div>
  <p v-else :class="mutedClass" class="py-10 text-center">กำลังโหลดข้อมูลกลุ่มอพยพ…</p>
</template>
