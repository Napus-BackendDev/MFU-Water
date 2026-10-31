<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

// Compact pager for short lists: shows nothing until there is more than one page.
const page = defineModel<number>('page', { required: true })
const props = withDefaults(defineProps<{ total: number; pageSize?: number }>(), { pageSize: 5 })

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
watch(totalPages, (pages) => { if (page.value > pages) page.value = pages })

const stepClass = 'rounded-lg border border-slate-300 p-1 text-slate-600 disabled:opacity-30 hover:bg-slate-100 dark:border-[#2C2C2E] dark:text-slate-300 dark:hover:bg-[#252525]'
</script>

<template>
  <div v-if="totalPages > 1" class="mt-2 flex items-center justify-center gap-2 text-xs">
    <button type="button" aria-label="หน้าก่อนหน้า" :class="stepClass" :disabled="page <= 1" @click="page--">
      <ChevronLeft class="h-4 w-4" />
    </button>
    <span class="font-mono font-medium text-slate-600 dark:text-slate-300">{{ page }} / {{ totalPages }}</span>
    <button type="button" aria-label="หน้าถัดไป" :class="stepClass" :disabled="page >= totalPages" @click="page++">
      <ChevronRight class="h-4 w-4" />
    </button>
  </div>
</template>
