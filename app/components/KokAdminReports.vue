<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Calendar,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Layers,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import { communityTargets, type CommunityTarget } from '../utils/kok-contract'
import type { CommunityId } from '../../src/lib/map-data'
import { adminFetch } from '../utils/admin-session'

const props = defineProps<{
  communityId: CommunityId
}>()

const currentCommunity = computed(() => {
  return communityTargets.find((c) => c.id === props.communityId) ?? communityTargets[0]!
})

const selectedPeriod = ref<'1m' | '3m' | '6m' | 'all'>('3m')
const enablePdpaMasking = ref(true)
const isExportToastVisible = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

export interface WaterSourceStat {
  name: string
  samples: number
  avgPpb: number
  status: string
}

export interface MonthlyTrendStat {
  month: string
  avgPpb: number
  samples: number
}

export interface ReportAnalytics {
  total: number
  safe: number
  watch: number
  critical: number
  safePct: string
  watchPct: string
  criticalPct: string
  avgPpb: number
  reInspectedCount: number
  waterSources: WaterSourceStat[]
  monthlyTrends: MonthlyTrendStat[]
  rangeLabel?: string
  emptyReason?: string
  isRealData?: boolean
}

// Live reactive analytical dataset loaded from MongoDB backend
const reportData = ref<ReportAnalytics>({
  total: 0,
  safe: 0,
  watch: 0,
  critical: 0,
  safePct: '0',
  watchPct: '0',
  criticalPct: '0',
  avgPpb: 0,
  reInspectedCount: 0,
  waterSources: [],
  monthlyTrends: [],
  rangeLabel: '',
  emptyReason: '',
  isRealData: false,
})

async function fetchAnalytics() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await adminFetch(`/api/admin/reports/analytics?communityId=${props.communityId}&period=${selectedPeriod.value}`)
    if (res.ok) {
      const data = await res.json()
      const payload = data.analytics || data
      reportData.value = {
        total: Number(payload.total) || 0,
        safe: Number(payload.safe) || 0,
        watch: Number(payload.watch) || 0,
        critical: Number(payload.critical) || 0,
        safePct: String(payload.safePct ?? '0'),
        watchPct: String(payload.watchPct ?? '0'),
        criticalPct: String(payload.criticalPct ?? '0'),
        avgPpb: Number(payload.avgPpb) || 0,
        reInspectedCount: Number(payload.reInspectedCount) || 0,
        waterSources: Array.isArray(payload.waterSources) ? payload.waterSources : [],
        monthlyTrends: Array.isArray(payload.monthlyTrends) ? payload.monthlyTrends : [],
        rangeLabel: String(payload.rangeLabel ?? ''),
        emptyReason: String(payload.emptyReason ?? ''),
        isRealData: Boolean(payload.isRealData),
      }
    } else {
      errorMessage.value = 'ไม่สามารถดึงข้อมูลรายงานวิเคราะห์ได้'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAnalytics()
})

watch([() => props.communityId, selectedPeriod], () => {
  fetchAnalytics()
})

function triggerPrint() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}

function exportCsvReport() {
  const headers = ['ลำดับ', 'ชุมชน', 'ช่วงเวลา', 'ยอดตรวจทั้งหมด', 'ปลอดภัย (<5 ppb)', 'เฝ้าระวัง (5-50 ppb)', 'เกินเกณฑ์ (>50 ppb)', 'ค่าเฉลี่ย ppb', 'สถานะ PDPA', 'แหล่งข้อมูล']
  const row = [
    '1',
    currentCommunity.value.fullName,
    selectedPeriod.value,
    reportData.value.total,
    reportData.value.safe,
    reportData.value.watch,
    reportData.value.critical,
    reportData.value.avgPpb,
    enablePdpaMasking.value ? 'Masked (PDPA Safe)' : 'Full Dataset',
    reportData.value.isRealData ? 'นับจากตัวอย่างจริงใน MongoDB' : 'ไม่มีตัวอย่างในช่วงที่เลือก',
  ]
  const csvContent = '\uFEFF' + [headers.join(','), row.join(',')].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `รายงานคุณภาพน้ำ_${currentCommunity.value.id}_${selectedPeriod.value}.csv`
  a.click()
  URL.revokeObjectURL(url)

  isExportToastVisible.value = true
  setTimeout(() => {
    isExportToastVisible.value = false
  }, 2500)
}

// Highest month of the months that actually have samples; no label when there are none.
const peakMonth = computed(() => reportData.value.monthlyTrends.reduce<MonthlyTrendStat | null>((best, item) => (!best || item.avgPpb > best.avgPpb ? item : best), null))
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-[#2C2C2E]">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-lg bg-sky-100 p-1.5 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
            <BarChart3 class="h-4 w-4" />
          </span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            ศูนย์วิเคราะห์ข้อมูลและออกรายงานวิจัย (Analytics & Reports)
          </h2>
          <span class="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-[#0284C7] border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
            {{ currentCommunity.name }}
          </span>
          <span
            v-if="reportData.isRealData"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1"
          >
            <Database class="h-3 w-3" />
            นับจากตัวอย่างจริง
          </span>
          <span v-if="reportData.rangeLabel" class="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-[#2C2C2E] dark:text-slate-300">
            {{ reportData.rangeLabel }}
          </span>
          <span
            v-if="loading"
            class="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1 animate-pulse"
          >
            <Loader2 class="h-3 w-3 animate-spin" />
            กำลังประมวลผล...
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ประมวลผลสถิติแนวโน้มสารหนูเชิงพื้นที่และฤดูกาล พร้อมเครื่องมือออกรายงานสรุปสำหรับหน่วยงานและชุมชน (R09)
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :class="actionButtonClass"
          @click="triggerPrint"
        >
          <Printer class="h-3.5 w-3.5" />
          <span>พิมพ์รายงานฉบับย่อ</span>
        </button>

        <button
          type="button"
          :class="primaryButtonClass"
          @click="exportCsvReport"
        >
          <Download class="h-3.5 w-3.5" />
          <span>ส่งออกรายงาน CSV</span>
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="isExportToastVisible"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 transition-all"
    >
      <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>ส่งออกรายงานวิจัยเรียบร้อย พร้อมคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
    </div>

    <!-- Filters & Period Bar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="flex items-center gap-1.5 overflow-x-auto">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
          <Calendar class="h-3.5 w-3.5" />
          ช่วงเวลา:
        </span>
        <button
          v-for="p in [
            { id: '1m', label: '1 เดือนล่าสุด' },
            { id: '3m', label: '3 เดือนล่าสุด' },
            { id: '6m', label: '6 เดือน (รอบฤดูกาล)' },
            { id: 'all', label: 'ข้อมูลทั้งหมด' }
          ]"
          :key="p.id"
          type="button"
          class="rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="[
            selectedPeriod === p.id
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#252525]'
          ]"
          @click="selectedPeriod = p.id as any"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- PDPA Switch -->
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          v-model="enablePdpaMasking"
          type="checkbox"
          class="h-4 w-4 rounded-sm border-slate-300 text-[#0284C7] focus:ring-[#0284C7]"
        />
        <div class="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <ShieldCheck class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>เปิดใช้ PDPA Safe Mode (ซ่อนข้อมูลติดต่อส่วนบุคคล)</span>
        </div>
      </label>
    </div>

    <!-- KPI Summary Cards Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div :class="adminCardClass" class="p-4 sm:p-5">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          ตัวอย่างตรวจทั้งหมด
        </div>
        <div class="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {{ reportData.total }}
        </div>
        <div class="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {{ currentCommunity.fullName }}
        </div>
      </div>

      <div :class="adminCardClass" class="p-4 sm:p-5 border-l-4 border-l-emerald-500">
        <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          ปกติ (&lt; 5 ppb)
        </div>
        <div class="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
          {{ reportData.safe }}
        </div>
        <div class="mt-2 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
          {{ reportData.safePct }}% ของตัวอย่างทั้งหมด
        </div>
      </div>

      <div :class="adminCardClass" class="p-4 sm:p-5 border-l-4 border-l-amber-500">
        <div class="text-xs font-semibold text-amber-700 dark:text-amber-400">
          เฝ้าระวัง (5–10 ppb)
        </div>
        <div class="mt-1 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
          {{ reportData.watch }}
        </div>
        <div class="mt-2 text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
          {{ reportData.watchPct }}% ของตัวอย่างทั้งหมด
        </div>
      </div>

      <div :class="adminCardClass" class="p-4 sm:p-5 border-l-4 border-l-rose-500">
        <div class="text-xs font-semibold text-rose-700 dark:text-rose-400">
          เกินเกณฑ์ คพ. (&gt; 10 ppb)
        </div>
        <div class="mt-1 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
          {{ reportData.critical }}
        </div>
        <div class="mt-2 text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
          จุดที่เก็บตัวอย่างซ้ำมากกว่า 1 ครั้ง: {{ reportData.reInspectedCount }} จุด
        </div>
      </div>
    </div>

    <!-- Monthly Trend & Water Source Analysis Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: Monthly Arsenic Trend Table / Chart -->
      <div class="lg:col-span-7 space-y-4">
        <div :class="adminCardClass" class="p-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                แนวโน้มสารหนูเฉลี่ยตามฤดูกาล (Monthly Trends)
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ค่าเฉลี่ย (ppb) ของเดือนที่มีตัวอย่างจริงเท่านั้น
              </p>
            </div>
            <div v-if="peakMonth" class="flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
              <TrendingUp class="h-3.5 w-3.5" />
              <span>สูงสุด {{ peakMonth.month }}</span>
            </div>
          </div>

          <p v-if="!reportData.monthlyTrends.length" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            {{ reportData.emptyReason || 'ยังไม่มีตัวอย่างพอสำหรับแสดงแนวโน้มรายเดือน' }}
          </p>

          <div class="space-y-3">
            <div
              v-for="item in reportData.monthlyTrends"
              :key="item.month"
              class="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-[#2C2C2E] dark:bg-[#161618]"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ item.month }}</span>
                <span class="text-xs font-bold text-[#0284C7] dark:text-sky-400">{{ item.avgPpb }} ppb</span>
              </div>
              <!-- Progress Bar -->
              <div class="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="item.avgPpb > 20 ? 'bg-amber-500' : 'bg-[#0284C7]'"
                  :style="{ width: `${Math.min((item.avgPpb / 30) * 100, 100)}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span>จำนวนตัวอย่าง: {{ item.samples }} รายการ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Analysis by Water Source -->
      <div class="lg:col-span-5 space-y-4">
        <div :class="adminCardClass" class="p-5 sm:p-6">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">
            จำแนกตามประเภทแหล่งน้ำ (Water Sources)
          </h3>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            สัดส่วนการตรวจวัดและการปนเปื้อนแยกรายแหล่งน้ำ
          </p>

          <div class="space-y-3">
            <div
              v-for="src in reportData.waterSources"
              :key="src.name"
              class="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-[#2C2C2E] dark:bg-[#161618]"
            >
              <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-200">{{ src.name }}</p>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">ตรวจแล้ว {{ src.samples }} ตัวอย่าง</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-slate-900 dark:text-white">{{ src.avgPpb }} ppb</p>
                <span
                  class="inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold"
                  :class="[
                    src.status === 'ปลอดภัย' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    src.status === 'เฝ้าระวัง' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  ]"
                >
                  {{ src.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
