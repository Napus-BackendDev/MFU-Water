<script setup lang="ts">
import { Camera, ChevronDown, ChevronUp, Eye, Pencil, RefreshCw, Trash2 } from 'lucide-vue-next'
import { arsenicLevel } from '../../src/lib/arsenic'
import { formatPpb } from '../../src/lib/survey'
import { communityOfPoint } from '../../src/lib/community-of-point'
import { communityTargets } from '../utils/kok-contract'
import { formatThaiDate, getArsenicMeta, type AdminSample } from '../utils/admin-types'
import type { TimeOrder } from '../composables/useSampleFilters'
import KokStatusBadge from './KokStatusBadge.vue'

defineProps<{ items: AdminSample[]; loading: boolean; selected: string | null; readOnly?: boolean; timeOrder?: TimeOrder }>()
defineEmits<{
  (e: 'select', sample: AdminSample): void
  (e: 'edit', sample: AdminSample): void
  (e: 'delete', sample: AdminSample): void
  (e: 'toggleTimeOrder'): void
}>()

function getCommunityName(item: AdminSample): string {
  const matched = communityOfPoint(item.latitude, item.longitude, communityTargets, 25)
  if (matched) return matched.name
  if (item.station_name && !item.station_name.startsWith('จุดตรวจ KOK-')) return item.station_name
  return 'ลุ่มน้ำกก'
}

const ppbClass = (ppb: number) => {
  const level = arsenicLevel(ppb)
  return level === 'over' ? 'text-[#DC2626] dark:text-[#FF453A]' : level === 'watch' ? 'text-[#B45309] dark:text-amber-400' : 'text-[#16A34A] dark:text-emerald-400'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs">
      <thead class="border-b border-slate-200 text-slate-500 dark:border-[#2C2C2E] dark:text-[#98A2A8]">
        <tr>
          <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">ชุมชน</th>
          <th
            scope="col"
            :aria-sort="timeOrder === 'asc' ? 'ascending' : timeOrder === 'desc' ? 'descending' : undefined"
            class="hidden whitespace-nowrap px-3 py-2 font-semibold sm:table-cell"
          >
            <button
              v-if="timeOrder"
              type="button"
              :aria-label="timeOrder === 'desc' ? 'เรียงเวลาเก็บ: ใหม่ขึ้นก่อน (คลิกเพื่อเอาเก่าขึ้นก่อน)' : 'เรียงเวลาเก็บ: เก่าขึ้นก่อน (คลิกเพื่อเอาใหม่ขึ้นก่อน)'"
              :title="timeOrder === 'desc' ? 'ใหม่ขึ้นก่อน — คลิกเพื่อเอาเก่าขึ้นก่อน' : 'เก่าขึ้นก่อน — คลิกเพื่อเอาใหม่ขึ้นก่อน'"
              class="inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-slate-600 transition hover:bg-slate-100 hover:text-[#0284C7] dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-[#00E5FF]"
              @click="$emit('toggleTimeOrder')"
            >
              <span>เวลาเก็บ</span>
              <span class="inline-flex flex-col leading-none" aria-hidden="true">
                <ChevronUp class="-mb-1 h-3 w-3" :class="timeOrder === 'asc' ? 'text-[#0284C7] dark:text-[#00E5FF]' : 'text-slate-300 dark:text-slate-600'" />
                <ChevronDown class="-mt-0.5 h-3 w-3" :class="timeOrder === 'desc' ? 'text-[#0284C7] dark:text-[#00E5FF]' : 'text-slate-300 dark:text-slate-600'" />
              </span>
            </button>
            <span v-else>เวลาเก็บ</span>
          </th>
          <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ppb</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">ชุดตรวจ</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">ผู้รายงาน (ชื่อ / เบอร์)</th>
          <th scope="col" class="whitespace-nowrap px-4 py-3 font-semibold">สถานะ</th>
          <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-semibold">จัดการ</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-slate-800 dark:divide-[#2C2C2E]/60 dark:text-slate-200">
        <tr v-if="loading && !items.length">
          <td colspan="7" class="py-12 text-center text-slate-500">
            <RefreshCw class="mx-auto mb-2 h-6 w-6 animate-spin text-[#0284C7]" />
            กำลังโหลดตัวอย่างน้ำ…
          </td>
        </tr>
        <tr v-else-if="!items.length">
          <td colspan="7" class="py-12 text-center text-slate-500">ไม่พบตัวอย่างน้ำตามเงื่อนไขที่ค้นหา</td>
        </tr>

        <tr
          v-for="item in items"
          :key="item.sample_code"
          class="cursor-pointer transition"
          :class="selected === item.sample_code ? 'bg-sky-50 dark:bg-sky-950/30' : 'hover:bg-slate-50 dark:hover:bg-[#252525]/60'"
          @click="$emit('select', item)"
        >
          <!-- 1. ชุมชน -->
          <td class="px-4 py-3">
            <button
              type="button"
              :aria-label="item.sample_code"
              class="cursor-pointer text-left font-semibold text-slate-900 hover:text-[#0284C7] hover:underline dark:text-white"
              :aria-pressed="selected === item.sample_code"
              @click.stop="$emit('select', item)"
            >
              {{ getCommunityName(item) }}
            </button>
          </td>

          <!-- 2. เวลาเก็บ -->
          <td class="hidden min-w-24 px-3 py-3 text-slate-600 sm:table-cell dark:text-[#98A2A8]">
            {{ formatThaiDate(item.collection_time || item.created_at || '') }}
          </td>

          <!-- 3. ppb -->
          <td class="px-3 py-3">
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20" :style="{ backgroundColor: getArsenicMeta(item.arsenic_ppb).hex }" />
              <span class="font-mono font-bold tabular-nums" :class="ppbClass(item.arsenic_ppb)">
                {{ formatPpb(item.arsenic_ppb).replace(' ppb', '') }}
              </span>
            </div>
          </td>

          <!-- 4. ชุดตรวจ -->
          <td class="hidden px-3 py-3 md:table-cell">
            <span class="whitespace-nowrap">{{ item.sample_nature?.test_kit || 'Oxfam' }}</span>
            <span v-if="item.private_photo_paths?.length" class="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-500 dark:text-[#98A2A8]">
              <Camera class="h-3 w-3" /> {{ item.private_photo_paths.length }}
            </span>
          </td>

          <!-- 5. ผู้รายงาน (ชื่อ / เบอร์) -->
          <td class="hidden px-3 py-3 md:table-cell">
            <div class="flex flex-col min-w-0">
              <span class="max-w-44 truncate font-medium text-slate-900 dark:text-white">
                {{ item.contact_name || 'ไม่ระบุชื่อ' }}
              </span>
              <span v-if="item.contact_phone" class="font-mono text-[11px] text-slate-500 dark:text-[#98A2A8]">
                {{ item.contact_phone }}
              </span>
              <span v-else class="text-[11px] text-slate-400 dark:text-slate-600">
                -
              </span>
            </div>
          </td>

          <!-- 6. สถานะ -->
          <td class="px-4 py-3">
            <KokStatusBadge :status="item.publication_status" />
          </td>

          <!-- 7. จัดการ (View / Edit / Delete) -->
          <td class="px-4 py-3 text-right">
            <div class="inline-flex items-center justify-end gap-1.5">
              <button
                type="button"
                aria-label="ดูรายละเอียดตัวอย่างน้ำ"
                title="ดูรายละเอียด (View)"
                class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                @click.stop="$emit('select', item)"
              >
                <Eye class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">ดูข้อมูล</span>
              </button>
              <button
                v-if="!readOnly"
                type="button"
                aria-label="แก้ไขข้อมูลตัวอย่างน้ำ"
                title="แก้ไข (Edit)"
                class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-amber-600 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-200 dark:hover:bg-[#252525]"
                @click.stop="$emit('edit', item)"
              >
                <Pencil class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">แก้ไข</span>
              </button>
              <button
                v-if="!readOnly"
                type="button"
                aria-label="ลบข้อมูลตัวอย่างน้ำ"
                title="ลบ (Delete)"
                class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                @click.stop="$emit('delete', item)"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">ลบ</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
