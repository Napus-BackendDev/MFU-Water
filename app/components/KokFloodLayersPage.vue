<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, Calendar, CheckCircle2, Droplets, Layers, Map as MapIcon, Satellite } from 'lucide-vue-next'
import {
  loadFloodObservations,
  observationWaterColor,
  observationYears,
  type FloodObservation,
  type ObservationDate,
} from '../utils/flood-observations'

const observationsVisible = defineModel<boolean>('observationsVisible', { required: true })
const date = defineModel<ObservationDate>('date', { required: true })
const emit = defineEmits<{ (e: 'backToMap'): void }>()

const observations = ref<FloodObservation | null>(null)
const loading = ref(false)
const observationFailed = ref(false)

const selectedYear = computed(() => observations.value?.years.find((item) => item.date === date.value))

async function ensureLoaded() {
  if (observations.value || loading.value) return
  loading.value = true
  observationFailed.value = false
  try {
    observations.value = await loadFloodObservations()
  } catch {
    observationFailed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void ensureLoaded()
})

function applyAndReturn() {
  emit('backToMap')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white">
    <!-- Top Header -->
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95">
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-200 dark:hover:bg-[#252525]"
          @click="emit('backToMap')"
        >
          <ArrowLeft class="h-4 w-4" />
          <span>กลับสู่แผนที่</span>
        </button>

        <div class="flex items-center gap-2 min-w-0">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0284C7] text-white">
            <Layers class="h-4 w-4" />
          </div>
          <span class="truncate text-sm font-bold">เลเยอร์น้ำท่วม</span>
        </div>

        <span
          class="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
          :class="observationsVisible
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60'
            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#252525] dark:text-slate-300 dark:border-[#2C2C2E]'"
        >
          <CheckCircle2 v-if="observationsVisible" class="h-3 w-3" />
          <span>{{ observationsVisible ? 'กำลังแสดง' : 'ปิดอยู่' }}</span>
        </span>
      </div>
    </header>

    <!-- Main Body -->
    <main class="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <!-- Toggle Card -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <label class="flex cursor-pointer items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <span
              class="mt-1 inline-block h-4 w-4 shrink-0 rounded-sm border border-black/15"
              :style="{ background: observationWaterColor }"
            />
            <div>
              <div class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                แสดงชั้นข้อมูลน้ำท่วมจริงบนแผนที่
              </div>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">
                เปิดแสดงขอบเขตแม่น้ำและพื้นที่น้ำท่วมรอบนอกจากการวิเคราะห์ภาพถ่ายดาวเทียมย้อนหลัง
              </p>
            </div>
          </div>

          <input
            v-model="observationsVisible"
            type="checkbox"
            class="h-5 w-5 shrink-0 cursor-pointer accent-[#0284C7]"
          >
        </label>
      </section>

      <!-- Year Selection -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-3">
        <div class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">ช่วงเวลาน้ำท่วมย้อนหลัง</h2>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="item in observationYears"
            :key="item.date"
            type="button"
            class="cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition"
            :class="date === item.date
              ? 'border-[#0284C7] bg-[#0284C7] text-white shadow-xs'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-200 dark:hover:bg-[#252525]'"
            @click="date = item.date; observationsVisible = true"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <!-- Satellite Analysis Details -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-4">
        <div class="flex items-center gap-2">
          <Satellite class="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">สรุปพื้นที่น้ำท่วมจากดาวเทียม</h2>
        </div>

        <p v-if="observationFailed" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </p>
        <p v-else-if="!selectedYear" role="status" class="text-xs text-slate-500 dark:text-[#98A2A8]">
          กำลังโหลดข้อมูลดาวเทียม…
        </p>
        <template v-else>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-[#98A2A8]">พื้นที่น้ำเฉลี่ยรวมแม่น้ำ</p>
              <p class="mt-1 font-mono text-xl font-bold text-[#0284C7] dark:text-[#00E5FF]">{{ selectedYear.totalKm2 }} ตร.กม.</p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">ประมาณ {{ selectedYear.totalRai }} ไร่</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-[#98A2A8]">แม่น้ำ</p>
              <p class="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">{{ selectedYear.riverKm2 }} ตร.กม.</p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">พื้นที่ลำน้ำหลัก</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-[#98A2A8]">น้ำท่วมรอบนอก</p>
              <p class="mt-1 font-mono text-xl font-bold text-amber-600 dark:text-amber-400">{{ selectedYear.floodKm2 }} ตร.กม.</p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">พื้นที่เอ่อล้นนอกตลิ่ง</p>
            </div>
          </div>

          <div class="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-700 dark:border-[#2C2C2E] dark:bg-[#141416]/60 dark:text-slate-300">
            <div class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Droplets class="h-4 w-4 text-[#0284C7]" />
              <span>เฉลี่ยจาก {{ selectedYear.eventLabels.length }} เหตุการณ์: {{ selectedYear.eventLabels.join(', ') }}</span>
            </div>
            <p v-if="selectedYear.undetectedLabels.length" class="text-slate-600 dark:text-[#98A2A8]">
              ไม่นับ {{ selectedYear.undetectedLabels.join(', ') }} เพราะดาวเทียมไม่พบน้ำท่วมเกินเกณฑ์
            </p>
            <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
              ข้อมูลจากดาวเทียม Sentinel-1 และ Sentinel-2 ไม่ใช่ค่าความลึกหรือข้อมูลสด
            </p>
          </div>
        </template>
      </section>

      <!-- Action Footer -->
      <div class="flex justify-end pt-1">
        <button
          type="button"
          class="inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0369A1]"
          @click="applyAndReturn"
        >
          <MapIcon class="h-4 w-4" />
          <span>ดูเลเยอร์บนแผนที่</span>
        </button>
      </div>
    </main>
  </div>
</template>
