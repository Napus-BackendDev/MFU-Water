<script setup lang="ts">
import { ref } from 'vue'
import { Camera, Check, Copy, Eye, MapPin, Phone, RefreshCw, User } from 'lucide-vue-next'
import { formatThaiDate, getArsenicMeta, type AdminSample, type Decision } from '../utils/admin-types'
import KokStatusBadge from './KokStatusBadge.vue'

defineProps<{ items: AdminSample[]; loading: boolean; actionLoading: string | null }>()
defineEmits<{ (e: 'detail', sample: AdminSample): void; (e: 'decide', sample: AdminSample, decision: Decision): void }>()

const copied = ref<string | null>(null)
function copyCode(code: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  void navigator.clipboard.writeText(code)
  copied.value = code
  setTimeout(() => { if (copied.value === code) copied.value = null }, 2000)
}

const ppbClass = (ppb: number) => (ppb > 50 ? 'text-rose-600 dark:text-[#FF453A]' : ppb > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white')
const headers = ['รหัสตัวอย่าง', 'วัน-เวลาเก็บตัวอย่าง', 'ระดับสารหนู', 'พิกัด & แหล่งน้ำ', 'ผู้แจ้ง & ข้อมูลติดต่อ', 'สถานะเผยแพร่']
const decideButton = 'rounded-lg px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50 transition'
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs">
      <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-[#2C2C2E] dark:bg-[#141416]/80 text-slate-600 dark:text-[#98A2A8]">
        <tr>
          <th v-for="header in headers" :key="header" scope="col" class="px-4 py-3.5 font-semibold">{{ header }}</th>
          <th scope="col" class="px-4 py-3.5 font-semibold text-right">การจัดการ</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]/60 text-slate-800 dark:text-slate-200">
        <tr v-if="loading">
          <td colspan="7" class="py-12 text-center text-slate-500">
            <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-sky-600" />
            กำลังโหลดข้อมูล Data Table…
          </td>
        </tr>
        <tr v-else-if="!items.length">
          <td colspan="7" class="py-12 text-center text-slate-500">ไม่พบข้อมูลตัวอย่างน้ำตามเงื่อนไขที่ค้นหา</td>
        </tr>

        <tr v-for="item in items" :key="item.sample_code" class="hover:bg-slate-50/80 dark:hover:bg-[#252525]/60 transition">
          <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
            <div class="flex items-center gap-1.5">
              <span>{{ item.sample_code }}</span>
              <button type="button" aria-label="คัดลอกรหัส" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" @click="copyCode(item.sample_code)">
                <Check v-if="copied === item.sample_code" class="h-3.5 w-3.5 text-emerald-600" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
          </td>

          <td class="px-4 py-3 text-slate-600 dark:text-[#98A2A8]">{{ formatThaiDate(item.collection_time || item.created_at || '') }}</td>

          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full border shrink-0" :style="{ backgroundColor: getArsenicMeta(item.arsenic_ppb).hex, borderColor: 'rgba(0,0,0,0.2)' }" />
              <span class="font-mono font-bold text-sm" :class="ppbClass(item.arsenic_ppb)">{{ item.arsenic_ppb }} ppb</span>
              <span v-if="item.arsenic_ppb > 50" class="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">เกิน 50</span>
            </div>
          </td>

          <td class="px-4 py-3">
            <div class="space-y-0.5">
              <div class="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <MapPin class="h-3 w-3 text-slate-400" />
                <span>{{ item.latitude.toFixed(4) }}, {{ item.longitude.toFixed(4) }}</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                <span>{{ item.sample_nature?.water_source || 'แม่น้ำกก' }}</span>
                <span v-if="item.private_photo_paths?.length" class="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.2 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Camera class="h-2.5 w-2.5" /> {{ item.private_photo_paths.length }} ภาพ
                </span>
              </div>
            </div>
          </td>

          <td class="px-4 py-3">
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <User class="h-3 w-3 text-slate-400" />
                <span>{{ item.contact_name || 'ไม่ระบุชื่อ' }}</span>
              </div>
              <div v-if="item.contact_phone" class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                <Phone class="h-3 w-3 text-slate-400" />
                <a :href="`tel:${item.contact_phone}`" class="hover:underline font-mono text-sky-600 dark:text-sky-400">{{ item.contact_phone }}</a>
              </div>
            </div>
          </td>

          <td class="px-4 py-3"><KokStatusBadge :status="item.publication_status" /></td>

          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <template v-if="item.publication_status === 'pending_review'">
                <button type="button" :class="[decideButton, 'bg-emerald-600 hover:bg-emerald-700']" :disabled="actionLoading === item.sample_code" @click="$emit('decide', item, 'approve')">อนุมัติ</button>
                <button type="button" :class="[decideButton, 'bg-rose-600 hover:bg-rose-700']" :disabled="actionLoading === item.sample_code" @click="$emit('decide', item, 'reject')">ปฏิเสธ</button>
              </template>
              <button
                type="button"
                aria-label="ดูรายละเอียด"
                class="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#2E2E30] transition"
                @click="$emit('detail', item)"
              >
                <Eye class="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
