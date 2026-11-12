<script setup lang="ts">
// One KPI tile. "card" (admin) shows label, coloured number and an optional caption;
// "subsurface" (public dashboard) is the compact tile where the caller picks the number colour.
type Tone = 'sky' | 'rose' | 'amber' | 'emerald' | 'slate'

withDefaults(defineProps<{
  label: string
  value: number | string
  caption?: string
  tone?: Tone
  surface?: 'card' | 'subsurface'
  valueClass?: string
}>(), {
  caption: '',
  tone: 'sky',
  surface: 'card',
  valueClass: 'text-slate-900 dark:text-white',
})

const numberClass: Record<Tone, string> = {
  sky: 'text-[#0284C7] dark:text-sky-400',
  rose: 'text-[#DC2626] dark:text-[#FF453A]',
  amber: 'text-[#D97706] dark:text-amber-400',
  emerald: 'text-[#16A34A] dark:text-emerald-400',
  slate: 'text-slate-500 dark:text-slate-300',
}
</script>

<template>
  <div v-if="surface === 'subsurface'" class="wv-subsurface">
    <span class="text-sm font-medium text-slate-600 dark:text-[#98A2A8]">{{ label }}</span>
    <div class="wv-kpi-number mt-1" :class="valueClass">{{ value }}</div>
  </div>

  <div v-else class="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
    <span class="text-xs text-slate-500 dark:text-[#98A2A8]">{{ label }}</span>
    <div class="mt-0.5 font-mono text-[26px] font-bold leading-tight tabular-nums" :class="numberClass[tone]">{{ value }}</div>
    <p v-if="caption" class="mt-0.5 hidden text-[11px] text-slate-500 sm:block dark:text-[#98A2A8]">{{ caption }}</p>
  </div>
</template>
