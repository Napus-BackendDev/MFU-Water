<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, LogOut, Moon, RefreshCw, ShieldAlert, ShieldCheck, Sun, X } from 'lucide-vue-next'
import { useAdminQueue } from '../composables/useAdminQueue'
import { useSampleFilters } from '../composables/useSampleFilters'
import { exportSamplesCsv } from '../utils/admin-csv'
import type { AdminSample, Decision } from '../utils/admin-types'
import KokAdminDecisionDialog from './KokAdminDecisionDialog.vue'
import KokAdminFilters from './KokAdminFilters.vue'
import KokAdminLogin from './KokAdminLogin.vue'
import KokAdminSampleDetail from './KokAdminSampleDetail.vue'
import KokAdminSampleTable from './KokAdminSampleTable.vue'
import KokKpiCard from './KokKpiCard.vue'
import KokPagination from './KokPagination.vue'

const emit = defineEmits<{ (e: 'backToMap'): void }>()

const queue = useAdminQueue()
const { isUnlocked, counts, feedback, loading, actionLoading } = queue
const { tab, severity, query, page, pageSize, filtered, paged } = useSampleFilters(queue.samples)

const detail = ref<AdminSample | null>(null)
const decision = ref<{ sample: AdminSample; type: Decision } | null>(null)

async function confirmDecision(reason: string) {
  if (!decision.value) return
  if (await queue.review(decision.value.sample.sample_code, decision.value.type, reason)) decision.value = null
}

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const toggleTheme = () => { colorMode.preference = isDark.value ? 'light' : 'dark' }

const headerButton = 'flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] transition'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white flex flex-col">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 shadow-xs">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-[#2E2E30] dark:hover:text-white transition"
            @click="emit('backToMap')"
          >
            <ArrowLeft class="h-4 w-4" />
            <span>กลับสู่แผนที่สาธารณะ</span>
          </button>

          <div class="h-5 w-px bg-slate-200 dark:bg-[#2C2C2E] hidden sm:block" />

          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
              <ShieldAlert class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-900 dark:text-white sm:text-base">ระบบตรวจสอบและจัดการข้อมูลน้ำ (Admin Data Table)</h1>
                <span v-if="isUnlocked" class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hidden md:inline-flex items-center gap-1">
                  <ShieldCheck class="h-3 w-3" /> แอดมินเข้าสู่ระบบแล้ว
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-[#98A2A8]">มหาวิทยาลัยแม่ฟ้าหลวง • โครงการวิจัยและติดตามคุณภาพน้ำลุ่มน้ำกก</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" aria-label="สลับโหมดสี" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525] transition" @click="toggleTheme">
            <Sun v-if="isDark" class="h-4 w-4 text-amber-400" />
            <Moon v-else class="h-4 w-4 text-slate-600" />
          </button>

          <template v-if="isUnlocked">
            <button type="button" :class="headerButton" :disabled="loading" @click="queue.fetchSamples()">
              <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
              <span class="hidden sm:inline">รีเฟรช</span>
            </button>
            <button type="button" :class="headerButton" @click="exportSamplesCsv(filtered)">
              <Download class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ส่งออก CSV</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition"
              @click="queue.logout()"
            >
              <LogOut class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <KokAdminLogin
        v-if="!isUnlocked"
        v-model:passcode="queue.passcode.value"
        v-model:reviewer="queue.reviewer.value"
        :verifying="queue.verifying.value"
        :error="queue.loginError.value"
        @submit="queue.login()"
        @cancel="emit('backToMap')"
      />

      <div v-else class="space-y-5">
        <div
          v-if="feedback"
          class="rounded-xl p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-sm transition"
          :class="feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'"
        >
          <div class="flex items-center gap-2">
            <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <AlertTriangle v-else class="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{{ feedback.message }}</span>
          </div>
          <button type="button" aria-label="ปิดข้อความ" class="text-slate-400 hover:text-slate-600" @click="feedback = null"><X class="h-4 w-4" /></button>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <KokKpiCard label="ตัวอย่างน้ำทั้งหมด" :value="counts.total" />
          <KokKpiCard label="รอตรวจสอบ (>50 ppb)" :value="counts.pending" tone="amber" :highlight="counts.pending > 0" />
          <KokKpiCard label="อนุมัติแล้ว" :value="counts.approved" tone="emerald" />
          <KokKpiCard label="เผยแพร่อัตโนมัติ (<=50 ppb)" :value="counts.autoPublished" tone="sky" />
        </div>

        <KokAdminFilters v-model:tab="tab" v-model:severity="severity" v-model:query="query" :counts="counts" />

        <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
          <KokAdminSampleTable
            :items="paged"
            :loading="loading"
            :action-loading="actionLoading"
            @detail="detail = $event"
            @decide="(sample, type) => (decision = { sample, type })"
          />
          <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />
        </div>
      </div>
    </main>

    <KokAdminDecisionDialog
      v-if="decision"
      :sample="decision.sample"
      :decision="decision.type"
      :saving="actionLoading === decision.sample.sample_code"
      @confirm="confirmDecision"
      @close="decision = null"
    />

    <KokAdminSampleDetail
      v-if="detail"
      :sample="detail"
      @close="detail = null"
      @approve="decision = { sample: detail, type: 'approve' }; detail = null"
    />
  </div>
</template>
