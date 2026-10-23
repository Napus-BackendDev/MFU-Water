<script setup lang="ts">
import { computed, ref } from 'vue'
import { Activity, AlertTriangle, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-vue-next'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { publicPseudonym } from '../../src/lib/publicPseudonym'

const props = withDefaults(
  defineProps<{
    waypoints: SurveyWaypoint[]
    title?: string
    isCompact?: boolean
  }>(),
  {
    title: 'กราฟแนวโน้มระดับสารหนู (PPB)',
    isCompact: false,
  },
)

const activeIdx = ref<number | null>(null)

export type TrendPoint = {
  index: number
  id: string
  sampleCode: string
  ppb: number
  dateLabel: string
  timeLabel: string
  fullDateLabel: string
  collector: string
  isDanger: boolean
  isWatch: boolean
  isSafe: boolean
  color: string
}

const series = computed<TrendPoint[]>(() => {
  if (!props.waypoints || props.waypoints.length === 0) return []

  const sorted = [...props.waypoints].sort((a, b) => {
    const tA = new Date(a.collection_time || a.created_at || 0).getTime()
    const tB = new Date(b.collection_time || b.created_at || 0).getTime()
    return tA - tB
  })

  return sorted.map((wp, idx) => {
    const ppb = Number(wp.arsenic_level_ppb ?? 0)
    const d = new Date(wp.collection_time || wp.created_at || Date.now())
    const validDate = !Number.isNaN(d.getTime())
    const dateLabel = validDate
      ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      : `#${idx + 1}`
    const timeLabel = validDate
      ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : ''
    const fullDateLabel = validDate
      ? `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} เวลา ${timeLabel} น.`
      : '-'

    const isDanger = ppb > 10
    const isWatch = ppb >= 5 && ppb <= 10
    const isSafe = !isDanger && !isWatch
    const color = isDanger ? '#FF453A' : isWatch ? '#FF9F0A' : '#32D74B'

    return {
      index: idx + 1,
      id: wp.id || wp.sample_code,
      sampleCode: wp.sample_code,
      ppb,
      dateLabel,
      timeLabel,
      fullDateLabel,
      collector: wp.contributor_label || publicPseudonym(wp.sample_code),
      isDanger,
      isWatch,
      isSafe,
      color,
    }
  })
})

const stats = computed(() => {
  if (series.value.length === 0) return { min: 0, max: 0, avg: 0, trend: 'flat' as const, diff: 0 }
  const vals = series.value.map((s) => s.ppb)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const avg = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
  const first = series.value[0]?.ppb ?? 0
  const last = series.value[series.value.length - 1]?.ppb ?? 0
  const diff = Number((last - first).toFixed(1))
  const trend = diff > 0 ? ('up' as const) : diff < 0 ? ('down' as const) : ('flat' as const)
  return { min, max, avg, trend, diff }
})

// พารามิเตอร์พื้นที่วาดกราฟ (SVG ViewBox)
const svgWidth = computed(() => (props.isCompact ? 340 : 560))
const svgHeight = computed(() => (props.isCompact ? 110 : 180))
const paddingLeft = computed(() => (props.isCompact ? 32 : 46))
const paddingRight = computed(() => (props.isCompact ? 20 : 32))
const paddingTop = computed(() => (props.isCompact ? 18 : 26))
const paddingBottom = computed(() => (props.isCompact ? 24 : 34))

const plotWidth = computed(() => svgWidth.value - paddingLeft.value - paddingRight.value)
const plotHeight = computed(() => svgHeight.value - paddingTop.value - paddingBottom.value)

const yCeil = computed(() => Math.max(20, Math.ceil((stats.value.max * 1.25) / 10) * 10))
const yFloor = 0

function getYCoord(val: number) {
  const clamped = Math.max(yFloor, Math.min(yCeil.value, val))
  const ratio = (clamped - yFloor) / (yCeil.value - yFloor)
  return paddingTop.value + plotHeight.value - ratio * plotHeight.value
}

function getXCoord(idx: number, total: number) {
  if (total <= 1) return paddingLeft.value + plotWidth.value / 2
  return paddingLeft.value + (idx / (total - 1)) * plotWidth.value
}

const points = computed(() => {
  const total = series.value.length
  return series.value.map((s, idx) => ({
    ...s,
    x: getXCoord(idx, total),
    y: getYCoord(s.ppb),
  }))
})

const linePath = computed(() => {
  if (points.value.length === 0) return ''
  if (points.value.length === 1) {
    const pt = points.value[0]!
    return `M ${pt.x - 20} ${pt.y} L ${pt.x + 20} ${pt.y}`
  }
  return points.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
})

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const bottomY = getYCoord(0)
  if (points.value.length === 1) {
    const pt = points.value[0]!
    return `M ${pt.x - 20} ${bottomY} L ${pt.x - 20} ${pt.y} L ${pt.x + 20} ${pt.y} L ${pt.x + 20} ${bottomY} Z`
  }
  const first = points.value[0]!
  const last = points.value[points.value.length - 1]!
  return `${linePath.value} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`
})

const pcd10Y = computed(() => getYCoord(10))
const watch5Y = computed(() => getYCoord(5))

const selectedPoint = computed(() => {
  if (activeIdx.value !== null && points.value[activeIdx.value]) {
    return points.value[activeIdx.value]
  }
  return points.value[points.value.length - 1] ?? null
})
</script>

<template>
  <div v-if="series.length > 0" class="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-2">
      <div class="flex items-center gap-2">
        <Activity class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
        <h4 class="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">{{ title }}</h4>
      </div>
      <div class="flex items-center gap-2">
        <!-- Badge แนวโน้ม -->
        <span
          class="flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
          :class="
            stats.trend === 'up'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-[#3A1C1C] dark:text-[#FF453A] dark:border-transparent'
              : stats.trend === 'down'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[#1C3A24] dark:text-[#32D74B] dark:border-transparent'
                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#252525] dark:text-[#98A2A8] dark:border-transparent'
          "
        >
          <TrendingUp v-if="stats.trend === 'up'" class="h-3 w-3" />
          <TrendingDown v-else-if="stats.trend === 'down'" class="h-3 w-3" />
          <span>{{ stats.trend === 'up' ? `แนวโน้มขึ้น +${stats.diff} ppb` : stats.trend === 'down' ? `แนวโน้มลดลง ${stats.diff} ppb` : 'แนวโน้มคงที่' }}</span>
        </span>
      </div>
    </div>

    <!-- SVG Area & Line Chart -->
    <div class="relative overflow-x-auto">
      <svg
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        class="w-full select-none"
        style="min-width: 280px; max-height: 220px;"
      >
        <defs>
          <linearGradient id="asAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284C7" stop-opacity="0.30" />
            <stop offset="100%" stop-color="#0284C7" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- เส้นอ้างอิง 10 ppb (เกณฑ์ คพ.) -->
        <line
          :x1="paddingLeft"
          :y1="pcd10Y"
          :x2="svgWidth - paddingRight"
          :y2="pcd10Y"
          stroke="#DC2626"
          stroke-dasharray="4 3"
          stroke-width="1.5"
          opacity="0.8"
        />
        <text
          :x="svgWidth - paddingRight + 4"
          :y="pcd10Y + 3"
          fill="#DC2626"
          font-size="9"
          font-weight="bold"
          font-family="monospace"
        >
          10 (เกณฑ์ คพ.)
        </text>

        <!-- เส้นอ้างอิง 5 ppb (เฝ้าระวัง) -->
        <line
          :x1="paddingLeft"
          :y1="watch5Y"
          :x2="svgWidth - paddingRight"
          :y2="watch5Y"
          stroke="#D97706"
          stroke-dasharray="3 3"
          stroke-width="1.2"
          opacity="0.75"
        />
        <text
          :x="svgWidth - paddingRight + 4"
          :y="watch5Y + 3"
          fill="#D97706"
          font-size="9"
          font-family="monospace"
        >
          5 ppb
        </text>

        <!-- เส้นแกน 0 ppb -->
        <line
          :x1="paddingLeft"
          :y1="getYCoord(0)"
          :x2="svgWidth - paddingRight"
          :y2="getYCoord(0)"
          stroke="#94A3B8"
          stroke-width="1"
          opacity="0.5"
        />
        <text
          :x="paddingLeft - 6"
          :y="getYCoord(0) + 3"
          text-anchor="end"
          fill="#64748B"
          font-size="9"
          font-family="monospace"
        >
          0
        </text>

        <!-- เส้นแกนบน -->
        <text
          :x="paddingLeft - 6"
          :y="paddingTop + 8"
          text-anchor="end"
          fill="#64748B"
          font-size="9"
          font-family="monospace"
        >
          {{ yCeil }}
        </text>

        <!-- พื้นที่ Area Gradient -->
        <path :d="areaPath" fill="url(#asAreaGrad)" />

        <!-- เส้นกราฟเชื่อมต่อ -->
        <path
          :d="linePath"
          fill="none"
          stroke="#0284C7"
          :stroke-width="isCompact ? 2 : 2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- จุดข้อมูล (Data Dots) -->
        <g
          v-for="(p, idx) in points"
          :key="p.id"
          class="cursor-pointer transition-transform"
          @mouseenter="activeIdx = idx"
          @click="activeIdx = idx"
        >
          <!-- Hover Glow -->
          <circle
            v-if="activeIdx === idx"
            :cx="p.x"
            :cy="p.y"
            :r="isCompact ? 9 : 12"
            fill="#0284C7"
            opacity="0.25"
          />

          <!-- Dot วงกลมหลัก -->
          <circle
            :cx="p.x"
            :cy="p.y"
            :r="activeIdx === idx ? 6 : (isCompact ? 4 : 5)"
            :fill="p.color"
            stroke="#FFFFFF"
            stroke-width="2"
          />

          <!-- ตัวเลขค่า PPB เหนือจุด -->
          <text
            :x="p.x"
            :y="p.y - 8"
            text-anchor="middle"
            :font-size="isCompact ? 9 : 11"
            font-weight="bold"
            :fill="p.color"
            font-family="monospace"
          >
            {{ p.ppb }}
          </text>

          <!-- วันที่ใต้จุด -->
          <text
            :x="p.x"
            :y="getYCoord(0) + 14"
            text-anchor="middle"
            font-size="9"
            :fill="activeIdx === idx ? '#0284C7' : '#64748B'"
            font-family="monospace"
          >
            {{ p.dateLabel }}
          </text>
        </g>
      </svg>
    </div>

    <!-- แถบรายละเอียดจุดที่เลือก -->
    <div v-if="selectedPoint" class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-xs border border-slate-200 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="flex items-center gap-2">
        <span
          class="h-3 w-3 shrink-0 rounded-full"
          :style="{ backgroundColor: selectedPoint.color }"
        />
        <div>
          <span class="font-bold text-slate-800 dark:text-white">ครั้งที่ {{ selectedPoint.index }} ({{ selectedPoint.sampleCode }}): </span>
          <strong class="font-mono text-sm" :style="{ color: selectedPoint.color }">{{ selectedPoint.ppb }} ppb</strong>
          <span
            class="ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            :class="
              selectedPoint.isDanger
                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-[#3A1C1C] dark:text-[#FF453A] dark:border-transparent'
                : selectedPoint.isWatch
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-[#3A2C1C] dark:text-[#FF9F0A] dark:border-transparent'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[#1C3A24] dark:text-[#32D74B] dark:border-transparent'
            "
          >
            {{ selectedPoint.isDanger ? 'เกินเกณฑ์ คพ.' : selectedPoint.isWatch ? 'เฝ้าระวัง' : 'ปกติ' }}
          </span>
        </div>
      </div>
      <div class="text-[11px] text-slate-500 dark:text-[#98A2A8] font-mono">
        <span>{{ selectedPoint.fullDateLabel }}</span>
        <span class="ml-2 text-sky-700 dark:text-[#00E5FF] font-medium">• ผู้บันทึก: {{ selectedPoint.collector }}</span>
      </div>
    </div>

    <!-- สรุปสถิติ 3 ช่อง (ต่ำสุด / เฉลี่ย / สูงสุด) -->
    <div v-if="series.length > 1" class="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
      <div class="rounded-lg border border-emerald-200 bg-emerald-50/70 p-1.5 dark:border-[#1C3A24] dark:bg-[#142318]">
        <span class="block text-[10px] text-emerald-700 dark:text-[#32D74B]">ต่ำสุด</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ stats.min }} ppb</span>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-1.5 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <span class="block text-[10px] text-slate-500 dark:text-[#98A2A8]">เฉลี่ย</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ stats.avg }} ppb</span>
      </div>
      <div
        class="rounded-lg border p-1.5"
        :class="
          stats.max > 10
            ? 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-[#3A1C1C] dark:bg-[#2A1616] dark:text-[#FF453A]'
            : stats.max >= 5
              ? 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-[#3A2C1C] dark:bg-[#2A2216] dark:text-[#FF9F0A]'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-[#1C3A24] dark:bg-[#142318] dark:text-[#32D74B]'
        "
      >
        <span class="block text-[10px] opacity-80">สูงสุด</span>
        <span class="font-mono font-bold">{{ stats.max }} ppb</span>
      </div>
    </div>
  </div>
</template>
