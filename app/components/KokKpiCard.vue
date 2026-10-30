<script setup lang="ts">
// One KPI tile. "card" (admin) shows label, number and unit with an optional alert highlight;
// "subsurface" (public dashboard) is the compact tile where the caller picks the number colour.
type Tone = 'neutral' | 'amber' | 'emerald' | 'sky'

withDefaults(defineProps<{
  label: string
  value: number | string
  unit?: string
  tone?: Tone
  highlight?: boolean
  surface?: 'card' | 'subsurface'
  valueClass?: string
}>(), {
  unit: 'รายการ',
  tone: 'neutral',
  highlight: false,
  surface: 'card',
  valueClass: 'text-slate-900 dark:text-white',
})

const labelClass: Record<Tone, string> = {
  neutral: 'text-slate-500 dark:text-[#98A2A8]',
  amber: 'text-amber-700 dark:text-amber-300',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  sky: 'text-sky-600 dark:text-sky-400',
}
const numberClass: Record<Tone, string> = {
  neutral: 'text-slate-900 dark:text-white',
  amber: 'text-amber-600 dark:text-amber-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  sky: 'text-sky-600 dark:text-sky-400',
}
</script>

<template>
  <div v-if="surface === 'subsurface'" class="wv-subsurface">
    <span class="text-xs text-slate-500 dark:text-[#98A2A8]">{{ label }}</span>
    <div class="wv-kpi-number mt-1" :class="valueClass">{{ value }}</div>
  </div>

  <div
    v-else
    class="rounded-2xl border p-4 shadow-xs transition"
    :class="highlight ? 'border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E]'"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold" :class="labelClass[tone]">{{ label }}</span>
      <span v-if="highlight" class="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
    </div>
    <div class="mt-2 flex items-baseline gap-2">
      <span class="text-2xl font-bold font-mono" :class="numberClass[tone]">{{ value }}</span>
      <span class="text-xs text-slate-400">{{ unit }}</span>
    </div>
  </div>
</template>
