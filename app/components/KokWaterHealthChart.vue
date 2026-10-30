<script setup lang="ts">
import { computed, ref } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import type { SurveyWaypoint } from '../../src/lib/survey'

const props = defineProps<{
  waypoints: SurveyWaypoint[]
}>()

const granularity = ref<'day' | 'month'>('day')
const selectedPeriodKey = ref<string | null>(null)

type HealthPeriod = {
  key: string
  label: string
  fullLabel: string
  normal: number
  watch: number
  critical: number
  total: number
  average: number
}

const periods = computed<HealthPeriod[]>(() => {
  if (!props.waypoints || props.waypoints.length === 0) return []

  const groups = new Map<string, { normal: number; watch: number; critical: number; sum: number; total: number }>()

  for (const wp of props.waypoints) {
    const rawDate = wp.collection_time || wp.created_at
    if (!rawDate) continue
    const d = new Date(rawDate)
    if (Number.isNaN(d.getTime())) continue

    const key =
      granularity.value === 'day'
        ? d.toISOString().slice(0, 10) // YYYY-MM-DD
        : d.toISOString().slice(0, 7) // YYYY-MM

    if (!groups.has(key)) {
      groups.set(key, { normal: 0, watch: 0, critical: 0, sum: 0, total: 0 })
    }

    const g = groups.get(key)!
    const ppb = Number(wp.arsenic_level_ppb ?? 0)
    g.total += 1
    g.sum += ppb

    if (ppb > 10) g.critical += 1
    else if (ppb >= 5) g.watch += 1
    else g.normal += 1
  }

  // เรียงลำดับจากเก่าไปใหม่
  const sortedKeys = Array.from(groups.keys()).sort()

  return sortedKeys.map((k) => {
    const g = groups.get(k)!
    let label = k
    let fullLabel = k

    try {
      if (granularity.value === 'day') {
        const [y, m, d] = k.split('-').map(Number)
        const dateObj = new Date(y!, m! - 1, d!)
        label = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        fullLabel = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
      } else {
        const [y, m] = k.split('-').map(Number)
        const dateObj = new Date(y!, m! - 1, 1)
        label = dateObj.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        fullLabel = dateObj.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
      }
    } catch {}

    return {
      key: k,
      label,
      fullLabel,
      normal: g.normal,
      watch: g.watch,
      critical: g.critical,
      total: g.total,
      average: Number((g.sum / Math.max(1, g.total)).toFixed(1)),
    }
  })
})

const maxTotal = computed(() => {
  if (periods.value.length === 0) return 1
  return Math.max(1, ...periods.value.map((p) => p.total))
})

const selectedPeriod = computed(() => {
  if (selectedPeriodKey.value) {
    const found = periods.value.find((p) => p.key === selectedPeriodKey.value)
    if (found) return found
  }
  return periods.value[periods.value.length - 1] ?? null
})
</script>

<template>
  <div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white">
    <!-- Header with Toggle -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
      <div class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
        <div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">กราฟสุขภาพน้ำรายวันและรายเดือน</h4>
          <p class="text-xs text-slate-500 dark:text-[#98A2A8]">
            สัดส่วนผลตรวจแยกตามระดับความเสี่ยง ({{ granularity === 'day' ? 'รายวัน' : 'รายเดือน' }})
          </p>
        </div>
      </div>

      <!-- Segmented Buttons: รายวัน / รายเดือน -->
      <div class="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-bold transition"
          :class="granularity === 'day' ? 'bg-sky-600 text-white font-bold shadow dark:bg-[#00E5FF] dark:text-black' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
          @click="granularity = 'day'; selectedPeriodKey = null"
        >
          รายวัน
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-bold transition"
          :class="granularity === 'month' ? 'bg-sky-600 text-white font-bold shadow dark:bg-[#00E5FF] dark:text-black' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
          @click="granularity = 'month'; selectedPeriodKey = null"
        >
          รายเดือน
        </button>
      </div>
    </div>

    <!-- Chart Bars -->
    <div v-if="periods.length > 0" class="space-y-3">
      <div class="overflow-x-auto pb-2">
        <div class="flex items-end gap-3 pt-6" style="min-width: 320px; height: 160px;">
          <div
            v-for="p in periods"
            :key="p.key"
            class="group flex flex-1 flex-col items-center justify-end cursor-pointer transition-all"
            @click="selectedPeriodKey = p.key"
          >
            <!-- จำนวนรวมเหนือแท่ง -->
            <span
              class="mb-1 font-mono text-[10px] font-bold"
              :class="selectedPeriod?.key === p.key ? 'text-sky-600 dark:text-[#00E5FF]' : 'text-slate-400 dark:text-[#98A2A8]'"
            >
              {{ p.total }}
            </span>

            <!-- แท่งกราฟ Stacked Bar -->
            <div
              class="w-full max-w-[36px] overflow-hidden rounded-t-md transition-all group-hover:opacity-90"
              :class="selectedPeriod?.key === p.key ? 'ring-2 ring-sky-500 dark:ring-[#00E5FF]' : ''"
              :style="{ height: `${Math.max(12, (p.total / maxTotal) * 110)}px` }"
            >
              <!-- เกินเกณฑ์ (>10 ppb) -->
              <div
                v-if="p.critical > 0"
                class="bg-rose-500 dark:bg-[#FF453A]"
                :style="{ height: `${(p.critical / p.total) * 100}%` }"
                title="เกินเกณฑ์ (>10 ppb)"
              />
              <!-- เฝ้าระวัง (10 ppb) -->
              <div
                v-if="p.watch > 0"
                class="bg-amber-500 dark:bg-[#FF9F0A]"
                :style="{ height: `${(p.watch / p.total) * 100}%` }"
                title="เฝ้าระวัง (10 ppb)"
              />
              <!-- ปกติ (<= 5 ppb) -->
              <div
                v-if="p.normal > 0"
                class="bg-emerald-500 dark:bg-[#32D74B]"
                :style="{ height: `${(p.normal / p.total) * 100}%` }"
                title="ปกติ (<= 5 ppb)"
              />
            </div>

            <!-- ป้ายวัน/เดือนใต้แท่ง -->
            <span
              class="mt-1.5 whitespace-nowrap text-[10px]"
              :class="selectedPeriod?.key === p.key ? 'font-bold text-sky-700 dark:text-[#00E5FF]' : 'text-slate-500 dark:text-[#98A2A8]'"
            >
              {{ p.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-[#32D74B]" />
          <span class="text-slate-600 dark:text-[#98A2A8]">ปกติ (0–5 ppb)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-[#FF9F0A]" />
          <span class="text-slate-600 dark:text-[#98A2A8]">เฝ้าระวัง (10 ppb)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-rose-500 dark:bg-[#FF453A]" />
          <span class="text-slate-600 dark:text-[#98A2A8]">เกินเกณฑ์ คพ. (&gt; 10 ppb)</span>
        </div>
      </div>

      <!-- Detail Box ของวัน/เดือนที่เลือก -->
      <div v-if="selectedPeriod" class="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-2 font-bold">
          <span class="text-sky-700 dark:text-[#00E5FF]">{{ selectedPeriod.fullLabel }}</span>
          <span class="font-mono text-slate-500 dark:text-[#98A2A8]">
            รวม {{ selectedPeriod.total }} ตัวอย่าง · เฉลี่ย {{ selectedPeriod.average }} ppb
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 pt-2 text-center">
          <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-1.5 text-emerald-700 dark:bg-[#142318] dark:border-transparent dark:text-[#32D74B]">
            <span class="block text-[10px]">ปกติ</span>
            <span class="font-mono text-sm font-bold">{{ selectedPeriod.normal }}</span>
          </div>
          <div class="rounded-lg bg-amber-50 border border-amber-200 p-1.5 text-amber-700 dark:bg-[#2A2216] dark:border-transparent dark:text-[#FF9F0A]">
            <span class="block text-[10px]">เฝ้าระวัง</span>
            <span class="font-mono text-sm font-bold">{{ selectedPeriod.watch }}</span>
          </div>
          <div class="rounded-lg bg-rose-50 border border-rose-200 p-1.5 text-rose-700 dark:bg-[#2A1616] dark:border-transparent dark:text-[#FF453A]">
            <span class="block text-[10px]">เกินเกณฑ์</span>
            <span class="font-mono text-sm font-bold">{{ selectedPeriod.critical }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-8 text-center text-xs text-slate-400 dark:text-[#98A2A8]">
      ไม่มีรายการตัวอย่างน้ำในช่วงที่เลือก
    </div>
  </div>
</template>
