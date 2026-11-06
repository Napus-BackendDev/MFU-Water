<script setup lang="ts">
import { computed } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { pillClass, searchFieldClass, selectInPillClass, selectPillClass } from '../utils/admin-ui'
import { statusMeta, type AdminCounts } from '../utils/admin-types'
import type { SampleTab, SeverityFilter } from '../composables/useSampleFilters'

const tab = defineModel<SampleTab>('tab', { required: true })
const severity = defineModel<SeverityFilter>('severity', { required: true })
const query = defineModel<string>('query', { required: true })
const props = defineProps<{ counts: AdminCounts }>()

const tabs = computed(() => [
  { id: 'all' as const, label: 'ทั้งหมด', count: props.counts.total },
  { id: 'pending_review' as const, label: statusMeta.pending_review.label, count: props.counts.pending },
  { id: 'approved' as const, label: statusMeta.approved.label, count: props.counts.approved + props.counts.autoPublished },
  { id: 'rejected' as const, label: statusMeta.rejected.label, count: props.counts.rejected },
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="item in tabs"
      :key="item.id"
      type="button"
      :class="pillClass(tab === item.id)"
      :aria-pressed="tab === item.id"
      @click="tab = item.id"
    >
      {{ item.label }} ({{ item.count }})
    </button>

    <label :class="selectPillClass">
      <span>ระดับ</span>
      <select v-model="severity" :class="selectInPillClass">
        <option value="all">ทั้งหมด</option>
        <option value="normal">ปกติ (&lt; 5 ppb)</option>
        <option value="watch">เฝ้าระวัง (5–10 ppb)</option>
        <option value="over">เกินเกณฑ์ คพ. (&gt; 10 ppb)</option>
      </select>
    </label>

    <div class="flex w-full items-center gap-2 xl:ml-auto xl:w-auto">
      <div class="relative min-w-0 flex-1 xl:w-72 xl:flex-none">
        <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input v-model="query" type="text" aria-label="ค้นหาตัวอย่างน้ำ" placeholder="ค้นหารหัส ชื่อผู้ส่ง เบอร์ พิกัด หรือค่า ppb..." :class="searchFieldClass">
        <button v-if="query" type="button" aria-label="ล้างคำค้นหา" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800" @click="query = ''">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
