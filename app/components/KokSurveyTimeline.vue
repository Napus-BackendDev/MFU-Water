<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Play, Pause, RotateCcw, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-vue-next'
import type { SurveyWaypoint } from '../../src/lib/survey'

const props = defineProps<{
  waypoints: SurveyWaypoint[]
  // Timestamp ms or null (null = show all)
  modelValue?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

// Extract and normalize unique sorted date steps from waypoints
const timeSteps = computed(() => {
  const dates = props.waypoints
    .map((wp) => {
      const raw = wp.collection_time || wp.created_at
      const ms = Date.parse(raw)
      return Number.isFinite(ms) ? ms : null
    })
    .filter((ms): ms is number => ms !== null)

  if (dates.length === 0) {
    // Default fallback dates if no points yet
    const now = Date.now()
    const oneMonthAgo = now - 30 * 24 * 3600 * 1000
    return [oneMonthAgo, now]
  }

  // Sort ascending and deduplicate by date day (YYYY-MM-DD)
  const sorted = [...dates].sort((a, b) => a - b)
  const uniqueDays: number[] = []
  const seenDays = new Set<string>()

  for (const ms of sorted) {
    const d = new Date(ms)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!seenDays.has(key)) {
      seenDays.add(key)
      uniqueDays.push(ms)
    }
  }

  return uniqueDays.length > 0 ? uniqueDays : sorted
})

// Index in timeSteps. timeSteps.length means "All time (Show all)"
const currentIndex = ref(timeSteps.value.length)
const isPlaying = ref(false)
let playTimer: ReturnType<typeof setInterval> | null = null

// Keep index in sync with props
watch(
  () => props.modelValue,
  (val) => {
    if (val === null || val === undefined) {
      currentIndex.value = timeSteps.value.length
    } else {
      // Find closest index
      let closestIdx = 0
      let minDiff = Infinity
      timeSteps.value.forEach((ts, idx) => {
        const diff = Math.abs(ts - val)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = idx
        }
      })
      currentIndex.value = closestIdx
    }
  },
  { immediate: true },
)

// Sync slider change to modelValue
function onSliderChange() {
  if (currentIndex.value >= timeSteps.value.length) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', timeSteps.value[currentIndex.value] ?? null)
  }
}

function stopPlaying() {
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
  isPlaying.value = false
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlaying()
    return
  }

  // If at the end, wrap to beginning
  if (currentIndex.value >= timeSteps.value.length) {
    currentIndex.value = 0
    onSliderChange()
  }

  isPlaying.value = true
  playTimer = setInterval(() => {
    if (currentIndex.value < timeSteps.value.length - 1) {
      currentIndex.value += 1
      onSliderChange()
    } else if (currentIndex.value === timeSteps.value.length - 1) {
      currentIndex.value = timeSteps.value.length
      onSliderChange()
      stopPlaying()
    } else {
      stopPlaying()
    }
  }, 1000)
}

function stepBack() {
  stopPlaying()
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
    onSliderChange()
  }
}

function stepForward() {
  stopPlaying()
  if (currentIndex.value < timeSteps.value.length) {
    currentIndex.value += 1
    onSliderChange()
  }
}

function resetToAll() {
  stopPlaying()
  currentIndex.value = timeSteps.value.length
  onSliderChange()
}

onBeforeUnmount(() => {
  stopPlaying()
})

const isAllSelected = computed(() => currentIndex.value >= timeSteps.value.length)

// Format Thai date
const currentDisplayDate = computed(() => {
  if (isAllSelected.value) {
    return 'ข้อมูลทั้งหมด (สะสมถึงปัจจุบัน)'
  }
  const currentMs = timeSteps.value[currentIndex.value]
  if (!currentMs) return 'ไม่ระบุวันที่'
  const d = new Date(currentMs)
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  const thaiYear = d.getFullYear() + 543
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${thaiYear}`
})

// Number of points active at current step
const activePointsCount = computed(() => {
  if (isAllSelected.value) return props.waypoints.length
  const currentMs = timeSteps.value[currentIndex.value]
  if (!currentMs) return props.waypoints.length

  // All points up to this day (23:59:59 of selected day)
  const targetDate = new Date(currentMs)
  targetDate.setHours(23, 59, 59, 999)
  const endOfDayMs = targetDate.getTime()

  return props.waypoints.filter((wp) => {
    const raw = wp.collection_time || wp.created_at
    const wpMs = Date.parse(raw)
    return Number.isFinite(wpMs) && wpMs <= endOfDayMs
  }).length
})
</script>

<template>
  <div
    class="survey-timeline-card border border-slate-200/90 dark:border-[#2C2C2E] bg-white/95 dark:bg-[#1C1C1E]/95 shadow-xl backdrop-blur-xl rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 transition-all text-slate-800 dark:text-zinc-100"
    role="region"
    aria-label="แถบเลื่อนเวลาผลตรวจสารเคมีปนเปื้อน"
  >
    <!-- Top Row: Date Display, Point Count, and All-Time Quick Button -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Calendar class="h-3.5 w-3.5" />
        </span>
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-bold truncate text-slate-900 dark:text-white">
            {{ currentDisplayDate }}
          </span>
          <span class="text-[10px] text-slate-500 dark:text-zinc-400 leading-none">
            {{ isAllSelected ? 'แสดงจุดตรวจทุกช่วงเวลา' : 'แสดงจุดตรวจที่บันทึกสะสมถึงวันนี้' }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Count badge -->
        <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-700/60">
          <span class="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse"></span>
          <span>{{ activePointsCount }} / {{ waypoints.length }} จุด</span>
        </span>

        <!-- Reset to All Button -->
        <button
          v-if="!isAllSelected"
          type="button"
          class="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-medium border border-sky-200 dark:border-sky-800/60 transition"
          title="แสดงผลตรวจทั้งหมด"
          @click="resetToAll"
        >
          <RotateCcw class="h-3 w-3" />
          <span>ทั้งหมด</span>
        </button>
      </div>
    </div>

    <!-- Bottom Row: Controls & Timeline Slider -->
    <div class="flex items-center gap-2">
      <!-- Play / Pause Button -->
      <button
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition shadow-xs"
        :class="[
          isPlaying
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'
        ]"
        :title="isPlaying ? 'หยุดเล่น' : 'เล่นลำดับเวลาอัตโนมัติ'"
        :aria-label="isPlaying ? 'หยุดเล่น' : 'เล่นลำดับเวลาอัตโนมัติ'"
        @click="togglePlay"
      >
        <Pause v-if="isPlaying" class="h-3.5 w-3.5" />
        <Play v-else class="h-3.5 w-3.5 ml-0.5" />
      </button>

      <!-- Step Back Button -->
      <button
        type="button"
        class="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition"
        :disabled="currentIndex === 0"
        title="ก้าวถอยหลัง 1 วัน"
        aria-label="ก้าวถอยหลัง 1 วัน"
        @click="stepBack"
      >
        <ChevronLeft class="h-3.5 w-3.5" />
      </button>

      <!-- The Range Slider -->
      <div class="relative flex-1 flex items-center">
        <input
          type="range"
          :min="0"
          :max="timeSteps.length"
          :step="1"
          v-model.number="currentIndex"
          class="timeline-slider w-full h-2 rounded-lg cursor-pointer accent-sky-600 dark:accent-sky-400 bg-slate-200 dark:bg-zinc-700"
          aria-label="สไลเดอร์เลือกช่วงเวลา"
          @input="onSliderChange"
        />
      </div>

      <!-- Step Forward Button -->
      <button
        type="button"
        class="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition"
        :disabled="currentIndex >= timeSteps.length"
        title="ก้าวไปข้างหน้า 1 วัน"
        aria-label="ก้าวไปข้างหน้า 1 วัน"
        @click="stepForward"
      >
        <ChevronRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.survey-timeline-card {
  user-select: none;
}

.timeline-slider {
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  transition: opacity 0.2s;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  border: 2px solid #ffffff;
  transition: transform 0.15s ease;
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.timeline-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  border: 2px solid #ffffff;
  transition: transform 0.15s ease;
}
</style>
