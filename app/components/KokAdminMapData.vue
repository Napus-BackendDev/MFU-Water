<script setup lang="ts">
import { watch } from 'vue'
import { AlertTriangle, CheckCircle2, Eye, X } from 'lucide-vue-next'
import type { CommunityId } from '../../src/lib/map-data'
import { useAdminMapData } from '../composables/useAdminMapData'
import { feedbackBannerClass, mutedClass } from '../utils/map-data-ui'
import KokAdminEvacuationPage from './KokAdminEvacuationPage.vue'
import KokAdminHamletsPage from './KokAdminHamletsPage.vue'
import KokAdminMapOverview from './KokAdminMapOverview.vue'
import KokAdminPlacesPage from './KokAdminPlacesPage.vue'

// หน้า “ข้อมูลแผนที่” ของแอดมิน: ภาพรวม หมู่บ้าน ตรวจตัวอย่างน้ำ กลุ่มอพยพ สถานที่สำคัญ
export type MapTab = 'overview' | 'hamlets' | 'samples' | 'evacuation' | 'places'

const props = withDefaults(defineProps<{
  community?: CommunityId
  pendingSamplesCount?: number
}>(), {
  community: 'thaton',
  pendingSamplesCount: 0,
})

const emit = defineEmits<{ (e: 'sessionExpired', message: string): void }>()
const ctx = useAdminMapData((message) => emit('sessionExpired', message), props.community)
const { feedback, publicView } = ctx

watch(() => props.community, (next) => {
  if (next && ctx.community.value !== next) {
    ctx.community.value = next
  }
})

const tab = defineModel<MapTab>('tab', { default: 'overview' })

function go(next: MapTab | 'community') {
  feedback.value = null
  if (next === 'community') {
    tab.value = 'evacuation'
  } else {
    tab.value = next
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="feedback" role="status" class="flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-medium" :class="feedbackBannerClass(feedback.type)">
      <div class="flex items-center gap-2">
        <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4 shrink-0" />
        <AlertTriangle v-else class="h-4 w-4 shrink-0" />
        <span>{{ feedback.message }}</span>
      </div>
      <button type="button" aria-label="ปิดข้อความ" class="cursor-pointer text-slate-500 hover:text-slate-700" @click="feedback = null"><X class="h-4 w-4" /></button>
    </div>

    <div v-if="tab === 'evacuation' || tab === 'places'" class="flex flex-wrap items-center gap-3">
      <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold" title="เปิดแล้วแผนที่แสดงเฉพาะสิ่งที่หน้าบ้านเห็นจริง (เผยแพร่แล้ว ตามตั้งค่าหน้าบ้าน) ปิดแล้วเห็นทั้งหมดรวมฉบับร่าง">
        <input v-model="publicView" type="checkbox" class="h-4 w-4">
        <Eye class="h-4 w-4" />
        <span>ดูตามหน้าบ้านจริง</span>
      </label>
      <p :class="mutedClass">{{ publicView ? 'กำลังแสดงเฉพาะที่หน้าบ้านเห็น' : 'กำลังแสดงทั้งหมด รวมฉบับร่างและที่ซ่อนอยู่ (จางกว่าปกติ)' }}</p>
    </div>

    <KokAdminMapOverview v-if="tab === 'overview'" :ctx="ctx" @go="go" />
    <KokAdminHamletsPage v-else-if="tab === 'hamlets'" :ctx="ctx" />
    <div v-else-if="tab === 'samples'">
      <slot name="samples" />
    </div>
    <KokAdminEvacuationPage v-else-if="tab === 'evacuation'" :ctx="ctx" @go="go" />
    <KokAdminPlacesPage v-else :ctx="ctx" />
  </div>
</template>
