<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-vue-next'
import type { AdminMapData } from '../composables/useAdminMapData'
import type { AuditEntry, MapDataSummary } from '../utils/map-data-admin'
import { formatThaiDate } from '../utils/admin-types'
import { actionButtonClass, adminCardClass } from '../utils/admin-ui'
import { auditText, chipClass, mutedClass, sectionTitleClass } from '../utils/map-data-ui'
import KokKpiCard from './KokKpiCard.vue'

const props = defineProps<{ ctx: AdminMapData }>()
const emit = defineEmits<{ (e: 'go', tab: 'hamlets' | 'samples' | 'evacuation' | 'places'): void }>()

const summary = ref<MapDataSummary | null>(null)
const audit = ref<AuditEntry[]>([])
const publicNow = ref<{ layers: number; pointsPublic: boolean; places: number; pending: number; hamlets: number; hiddenHamlets: number; routePoints: number } | null>(null)

async function load() {
  const { client, run } = props.ctx
  const [loaded, history] = await Promise.all([run('summary', () => client.summary()), run('audit', () => client.audit(15))])
  if (loaded) summary.value = loaded
  if (history) audit.value = history.items ?? []
  const [community, places, hamlets, routes] = await Promise.all([
    client.preview('community'),
    client.preview('places', props.ctx.community.value),
    client.preview('hamlets'),
    client.preview('routes', props.ctx.community.value),
  ]).catch(() => [null, null, null, null] as const)
  if (community && places && hamlets && routes) {
    publicNow.value = {
      layers: community.layers?.length ?? 0,
      pointsPublic: Boolean(community.pointsPublic),
      places: places.placed?.length ?? 0,
      pending: places.pending?.length ?? 0,
      hamlets: hamlets.hamlets?.length ?? 0,
      hiddenHamlets: hamlets.hamlets?.filter((hamlet) => hamlet.households === null)?.length ?? 0,
      routePoints: routes.routes?.reduce((sum, route) => sum + (route?.length ?? 0), 0) ?? 0,
    }
  }
}
onMounted(load)
watch(() => props.ctx.community.value, load)

const inQueue = () => summary.value?.households?.byLevel?.filter((level) => level.key !== '5')?.reduce((sum, level) => sum + level.count, 0) ?? 0
</script>

<template>
  <div v-if="summary" class="space-y-4">
    <div class="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
      <KokKpiCard label="หมู่บ้านในทะเบียน" :value="summary.hamlets?.total ?? 0" tone="amber" :caption="`ครัวเรือนยังไม่ผูกหมู่บ้าน ${summary.hamlets?.unassigned ?? 0} หลัง`" />
      <KokKpiCard label="สถานที่สำคัญที่เผยแพร่" :value="summary.places?.published ?? 0" tone="emerald" :caption="`ทั้งหมด ${summary.places?.total ?? 0} แห่ง · รอผูกจุด ${summary.places?.waitingLocation ?? 0}`" />
      <KokKpiCard label="อยู่ในคิวอพยพ" :value="inQueue()" tone="rose" caption="ระดับ 1, 2 และ 4 ของกลุ่มเปราะบาง" />
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section :class="adminCardClass" class="p-4 sm:p-5" aria-label="สิ่งที่หน้าบ้านเห็น">
        <div class="flex items-center justify-between gap-2">
          <h2 :class="sectionTitleClass">หน้าบ้านเห็นอะไรอยู่ตอนนี้</h2>
          <a href="/" target="_blank" rel="noopener" :class="actionButtonClass"><ExternalLink class="h-3.5 w-3.5" /><span>เปิดหน้าบ้าน</span></a>
        </div>
        <p :class="mutedClass" class="mt-1">ตัวเลขนี้อ่านจากข้อมูลชุดเดียวกับที่ API สาธารณะส่งให้หน้าบ้าน</p>
        <ul v-if="publicNow" class="mt-3 divide-y divide-slate-100 text-[13px] dark:divide-[#2C2C2E]">
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span><strong>หมู่บ้าน</strong> · แสดง {{ publicNow.hamlets }} แห่ง (ซ่อนตัวเลขเพราะน้อยกว่า 5 ครัวเรือน {{ publicNow.hiddenHamlets }})</span>
            <button type="button" :class="actionButtonClass" @click="emit('go', 'hamlets')">จัดการ</button>
          </li>
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span><strong>ตรวจตัวอย่างน้ำ</strong> · ตรวจสอบผลตรวจสารหนูภาคสนาม</span>
            <button type="button" :class="actionButtonClass" @click="emit('go', 'samples')">จัดการ</button>
          </li>
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span><strong>กลุ่มอพยพ</strong> · เส้นทางตามแผน {{ publicNow.routePoints }} จุด</span>
            <button type="button" :class="actionButtonClass" @click="emit('go', 'evacuation')">จัดการ</button>
          </li>
          <li class="flex items-center justify-between gap-3 py-2.5">
            <span><strong>สถานที่สำคัญ</strong> · ปักบนแผนที่ {{ publicNow.places }} แห่ง · รายการรอผูกจุด {{ publicNow.pending }}</span>
            <button type="button" :class="actionButtonClass" @click="emit('go', 'places')">จัดการ</button>
          </li>
        </ul>
      </section>

      <section :class="adminCardClass" class="p-4 sm:p-5" aria-label="ประวัติการแก้ไข">
        <div class="flex items-center justify-between gap-2">
          <h2 :class="sectionTitleClass">ประวัติการแก้ไขล่าสุด</h2>
          <button type="button" aria-label="รีเฟรช" :class="actionButtonClass" class="px-2.5!" :disabled="ctx.busy.value !== null" @click="load"><RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': ctx.busy.value !== null }" /></button>
        </div>
        <p v-if="!audit.length" :class="mutedClass" class="mt-3">ยังไม่มีการแก้ไข</p>
        <ol v-else class="mt-3 space-y-2.5">
          <li v-for="(entry, index) in audit" :key="`${entry.at}-${index}`" class="text-[13px]">
            <div class="flex flex-wrap items-center gap-x-2">
              <span :class="chipClass(entry.action === 'delete' ? 'rose' : entry.action === 'create' || entry.action === 'publish' ? 'emerald' : 'sky')">{{ auditText(entry) }}</span>
            </div>
            <p :class="mutedClass" class="mt-0.5">{{ formatThaiDate(entry.at) }} · โดย {{ entry.by ?? 'ไม่ระบุ' }}<template v-if="entry.changed?.length"> · เปลี่ยน {{ entry.changed.slice(0, 4).join(', ') }}</template></p>
          </li>
        </ol>
      </section>
    </div>
  </div>
  <p v-else :class="mutedClass" class="py-10 text-center">กำลังโหลดข้อมูลแผนที่…</p>
</template>
