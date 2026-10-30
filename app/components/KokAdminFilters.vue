<script setup lang="ts">
import { computed } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { statusMeta, type AdminCounts } from '../utils/admin-types'
import type { SampleTab, SeverityFilter } from '../composables/useSampleFilters'

const tab = defineModel<SampleTab>('tab', { required: true })
const severity = defineModel<SeverityFilter>('severity', { required: true })
const query = defineModel<string>('query', { required: true })
const props = defineProps<{ counts: AdminCounts }>()

const idle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30]'
const tabs = computed(() => [
  { id: 'all' as const, label: 'ทั้งหมด', count: props.counts.total, active: 'bg-sky-600 text-white shadow-xs', idle },
  { id: 'pending_review' as const, label: statusMeta.pending_review.label, count: props.counts.pending, active: `${statusMeta.pending_review.tab} text-white shadow-xs`, idle: 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60' },
  { id: 'approved' as const, label: statusMeta.approved.label, count: props.counts.approved, active: `${statusMeta.approved.tab} text-white shadow-xs`, idle },
  { id: 'auto_published' as const, label: statusMeta.auto_published.label, count: props.counts.autoPublished, active: `${statusMeta.auto_published.tab} text-white shadow-xs`, idle },
  { id: 'rejected' as const, label: statusMeta.rejected.label, count: props.counts.rejected, active: `${statusMeta.rejected.tab} text-white shadow-xs`, idle },
])
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] shadow-xs space-y-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
          :class="tab === item.id ? item.active : item.idle"
          @click="tab = item.id"
        >
          {{ item.label }} ({{ item.count }})
        </button>
      </div>

      <label class="flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500 dark:text-[#98A2A8]">ระดับสารหนู:</span>
        <select v-model="severity" class="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white focus:outline-none">
          <option value="all">ทุกระดับ</option>
          <option value="safe">เกณฑ์ปกติ (&lt;=10 ppb)</option>
          <option value="watch">เฝ้าระวัง (10-50 ppb)</option>
          <option value="critical">วิกฤติ (&gt;50 ppb)</option>
        </select>
      </label>
    </div>

    <div class="relative">
      <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        v-model="query"
        type="text"
        placeholder="ค้นหารหัสตัวอย่าง, ชื่อผู้ส่ง, เบอร์โทรศัพท์, พิกัด, หรือค่า ppb..."
        class="wv-input pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
      >
      <button v-if="query" type="button" aria-label="ล้างคำค้นหา" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" @click="query = ''">
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
