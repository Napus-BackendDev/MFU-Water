<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })
const props = defineProps<{ total: number }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / pageSize.value)))
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
const to = computed(() => Math.min(page.value * pageSize.value, props.total))
const stepClass = 'rounded-lg border border-slate-300 p-1.5 text-slate-600 disabled:opacity-30 dark:border-[#2C2C2E] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252525]'
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-[#2C2C2E] dark:bg-[#141416]/50 text-xs">
    <div class="text-slate-500 dark:text-[#98A2A8]">
      แสดง <span class="font-bold text-slate-800 dark:text-white">{{ from }}</span> ถึง
      <span class="font-bold text-slate-800 dark:text-white">{{ to }}</span> จากทั้งหมด
      <span class="font-bold text-slate-800 dark:text-white">{{ total }}</span> รายการ
    </div>

    <div class="flex items-center gap-3">
      <label class="flex items-center gap-1.5">
        <span class="text-slate-500 dark:text-[#98A2A8]">แถวต่อหน้า:</span>
        <select v-model.number="pageSize" class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white">
          <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>

      <div class="flex items-center gap-1">
        <button type="button" aria-label="หน้าก่อนหน้า" :class="stepClass" :disabled="page <= 1" @click="page--">
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="px-2 font-mono font-medium">{{ page }} / {{ totalPages }}</span>
        <button type="button" aria-label="หน้าถัดไป" :class="stepClass" :disabled="page >= totalPages" @click="page++">
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
