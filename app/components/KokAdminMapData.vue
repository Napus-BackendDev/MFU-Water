<script setup lang="ts">
import { watch } from 'vue'
import type { CommunityId } from '../../src/lib/map-data'
import type { AdminSample } from '../utils/admin-types'
import { useAdminMapData } from '../composables/useAdminMapData'
import KokAlertToast from './KokAlertToast.vue'
import KokAdminEvacuationPage from './KokAdminEvacuationPage.vue'
import KokAdminHamletsPage from './KokAdminHamletsPage.vue'
import KokAdminMapOverview from './KokAdminMapOverview.vue'
import KokAdminPlacesPage from './KokAdminPlacesPage.vue'

// หน้า “ข้อมูลแผนที่” ของแอดมิน: ภาพรวม หมู่บ้าน ตรวจตัวอย่างน้ำ กลุ่มอพยพ สถานที่สำคัญ
export type MapTab = 'overview' | 'hamlets' | 'samples' | 'evacuation' | 'places'

const props = withDefaults(defineProps<{
  community?: CommunityId
  pendingSamplesCount?: number
  samples?: AdminSample[]
  selectedSampleCode?: string | null
  readOnlySamples?: boolean
}>(), {
  community: 'thaton',
  pendingSamplesCount: 0,
  samples: () => [],
  selectedSampleCode: null,
  readOnlySamples: false,
})

const emit = defineEmits<{
  (e: 'sessionExpired', message: string): void
  (e: 'update:community', value: CommunityId): void
  (e: 'goNews'): void
  (e: 'selectSample', sample: AdminSample): void
  (e: 'editSample', sample: AdminSample): void
  (e: 'deleteSample', sample: AdminSample): void
}>()
const ctx = useAdminMapData((message) => emit('sessionExpired', message), props.community)
const { feedback } = ctx

watch(() => props.community, (next) => {
  if (next && ctx.community.value !== next) {
    ctx.community.value = next
  }
})

watch(ctx.community, (next) => {
  if (next !== props.community) {
    emit('update:community', next)
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
    <KokAlertToast :feedback="feedback" @close="feedback = null" />

    <KokAdminMapOverview
      v-if="tab === 'overview'"
      :ctx="ctx"
      :pending-samples-count="pendingSamplesCount"
      :samples="samples"
      :selected-sample-code="selectedSampleCode"
      :read-only-samples="readOnlySamples"
      @go="go"
      @go-news="emit('goNews')"
      @select-sample="emit('selectSample', $event)"
      @edit-sample="emit('editSample', $event)"
      @delete-sample="emit('deleteSample', $event)"
    />
    <KokAdminHamletsPage v-else-if="tab === 'hamlets'" :ctx="ctx" />
    <div v-else-if="tab === 'samples'" class="space-y-4">
      <slot name="samples" />
    </div>
    <KokAdminEvacuationPage v-else-if="tab === 'evacuation'" :ctx="ctx" @go="go" />
    <KokAdminPlacesPage v-else :ctx="ctx" />
  </div>
</template>
