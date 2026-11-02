<script setup lang="ts">
import { ref } from 'vue'
import { Camera, Check, Copy, RefreshCw } from 'lucide-vue-next'
import { formatThaiDate, getArsenicMeta, type AdminSample } from '../utils/admin-types'
import KokStatusBadge from './KokStatusBadge.vue'

defineProps<{ items: AdminSample[]; loading: boolean; selected: string | null }>()
defineEmits<{ (e: 'select', sample: AdminSample): void }>()

const copied = ref<string | null>(null)
function copyCode(code: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  void navigator.clipboard.writeText(code)
  copied.value = code
  setTimeout(() => { if (copied.value === code) copied.value = null }, 2000)
}

const ppbClass = (ppb: number) => (ppb > 50 ? 'text-[#DC2626] dark:text-[#FF453A]' : ppb > 10 ? 'text-[#B45309] dark:text-amber-400' : 'text-[#16A34A] dark:text-emerald-400')
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs">
      <thead class="border-b border-slate-200 text-slate-500 dark:border-[#2C2C2E] dark:text-[#98A2A8]">
        <tr>
          <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">รหัสตัวอย่าง</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold sm:table-cell">เวลาเก็บ</th>
          <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ppb</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">แหล่งน้ำ</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">ผู้รายงาน</th>
          <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">สถานะ</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-800 dark:divide-[#2C2C2E]/60 dark:text-slate-200">
        <tr v-if="loading && !items.length">
          <td colspan="6" class="py-12 text-center text-slate-500">
            <RefreshCw class="mx-auto mb-2 h-6 w-6 animate-spin text-[#0284C7]" />
            กำลังโหลดตัวอย่างน้ำ…
          </td>
        </tr>
        <tr v-else-if="!items.length">
          <td colspan="6" class="py-12 text-center text-slate-500">ไม่พบตัวอย่างน้ำตามเงื่อนไขที่ค้นหา</td>
        </tr>

        <tr
          v-for="item in items"
          :key="item.sample_code"
          class="cursor-pointer transition"
          :class="selected === item.sample_code ? 'bg-sky-50 dark:bg-sky-950/30' : 'hover:bg-slate-50 dark:hover:bg-[#252525]/60'"
          @click="$emit('select', item)"
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-1.5 whitespace-nowrap font-mono font-semibold text-slate-900 dark:text-white">
              <button type="button" class="cursor-pointer hover:underline" :aria-pressed="selected === item.sample_code" @click.stop="$emit('select', item)">{{ item.sample_code }}</button>
              <button type="button" aria-label="คัดลอกรหัส" class="hidden text-slate-400 hover:text-slate-700 sm:block dark:hover:text-slate-200" @click.stop="copyCode(item.sample_code)">
                <Check v-if="copied === item.sample_code" class="h-3.5 w-3.5 text-emerald-600" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
            </div>
          </td>

          <td class="hidden min-w-24 px-3 py-3 text-slate-600 sm:table-cell dark:text-[#98A2A8]">{{ formatThaiDate(item.collection_time || item.created_at || '') }}</td>

          <td class="px-3 py-3">
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20" :style="{ backgroundColor: getArsenicMeta(item.arsenic_ppb).hex }" />
              <span class="font-mono font-bold tabular-nums" :class="ppbClass(item.arsenic_ppb)">{{ item.arsenic_ppb }}</span>
            </div>
          </td>

          <td class="hidden px-3 py-3 md:table-cell">
            <span class="whitespace-nowrap">{{ item.sample_nature?.water_source || 'แม่น้ำกก' }}</span>
            <span v-if="item.private_photo_paths?.length" class="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-500 dark:text-[#98A2A8]">
              <Camera class="h-3 w-3" /> {{ item.private_photo_paths.length }}
            </span>
          </td>

          <td class="hidden max-w-36 truncate px-3 py-3 md:table-cell">{{ item.contact_name || 'ไม่ระบุชื่อ' }}</td>

          <td class="px-4 py-3"><KokStatusBadge :status="item.publication_status" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
