<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CheckCircle2, History, RefreshCw } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass } from '../utils/admin-ui'
import { adminFetch } from '../utils/admin-session'
import { formatErrorWithReason } from '../utils/map-data-admin'
import KokAlertToast from './KokAlertToast.vue'
import KokPagination from './KokPagination.vue'

const loading = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const auditLogs = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const pagedAuditLogs = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return auditLogs.value.slice(start, start + pageSize.value)
})

watch(pageSize, () => {
  page.value = 1
})

watch(() => auditLogs.value.length, (len) => {
  const maxPage = Math.max(1, Math.ceil(len / pageSize.value))
  if (page.value > maxPage) page.value = maxPage
})

async function fetchAuditLogs(manual = false) {
  loading.value = true
  if (manual) feedback.value = null
  try {
    const res = await adminFetch('/api/admin/settings')
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error || `เซิร์ฟเวอร์ตอบกลับ HTTP ${res.status}`)
    }
    if (!data || !Array.isArray(data.auditLogs)) {
      throw new Error('รูปแบบข้อมูลบันทึกกิจกรรมจากเซิร์ฟเวอร์ไม่ถูกต้อง')
    }
    auditLogs.value = data.auditLogs
    if (manual) {
      feedback.value = { type: 'success', message: `รีเฟรชบันทึกกิจกรรมย้อนหลังเรียบร้อยแล้ว (${auditLogs.value.length} รายการ)` }
    }
  } catch (err: any) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('โหลดบันทึกกิจกรรม (Audit Log) ไม่สำเร็จ', err?.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'),
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchAuditLogs(false)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div :class="adminCardClass" class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
          <History class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            บันทึกกิจกรรมย้อนหลัง (Audit Log)
          </h2>
          <p class="text-xs text-slate-500 dark:text-[#98A2A8] truncate">
            บันทึกกิจกรรมการตรวจสอบและแก้ไขข้อมูลย้อนหลัง เชื่อมต่อฐานข้อมูลสด (Live Audit Log)
          </p>
        </div>
      </div>

      <button
        type="button"
        :class="actionButtonClass"
        :disabled="loading"
        @click="fetchAuditLogs(true)"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
        <span>รีเฟรชประวัติ</span>
      </button>
    </div>

    <KokAlertToast :feedback="feedback" @close="feedback = null" />

    <!-- Audit Log Table -->
    <div :class="adminCardClass" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-[#2C2C2E] dark:bg-[#141416]/50">
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">รหัสบันทึก</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">วัน-เวลา</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">ผู้ดำเนินการ</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">การกระทำ / กิจกรรม</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">เป้าหมายข้อมูล</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">ผลลัพธ์</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <tr v-if="auditLogs.length === 0">
              <td colspan="6" class="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                <span v-if="loading">กำลังโหลดบันทึกกิจกรรม...</span>
                <span v-else>ยังไม่มีประวัติกิจกรรมล่าสุดในระบบ</span>
              </td>
            </tr>
            <tr
              v-for="log in pagedAuditLogs"
              :key="log.id"
              class="hover:bg-slate-50/70 dark:hover:bg-[#252525]/40 transition-colors"
            >
              <td class="py-3 px-4 font-mono font-bold text-[#0284C7] dark:text-sky-400">
                {{ log.id }}
              </td>
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {{ log.timestamp }}
              </td>
              <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                {{ log.reviewer }}
              </td>
              <td class="py-3 px-4 font-medium text-slate-900 dark:text-white">
                {{ log.action }}
              </td>
              <td class="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                {{ log.target }}
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 class="h-3 w-3" />
                  สำเร็จ
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <KokPagination v-model:page="page" v-model:page-size="pageSize" :total="auditLogs.length" />
    </div>
  </div>
</template>
