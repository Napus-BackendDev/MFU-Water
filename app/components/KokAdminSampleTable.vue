<script setup lang="ts">
import { Camera, RefreshCw } from 'lucide-vue-next'
import { arsenicLevel } from '../../src/lib/arsenic'
import { formatPpb } from '../../src/lib/survey'
import { communityOfPoint } from '../../src/lib/community-of-point'
import { communityTargets } from '../utils/kok-contract'
import { formatThaiDate, getArsenicMeta, type AdminSample } from '../utils/admin-types'
import KokStatusBadge from './KokStatusBadge.vue'

defineProps<{ items: AdminSample[]; loading: boolean; selected: string | null }>()
defineEmits<{ (e: 'select', sample: AdminSample): void }>()

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
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold sm:table-cell">เวลาเก็บ</th>
          <th scope="col" class="whitespace-nowrap px-3 py-3 font-semibold">ppb</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">แหล่งน้ำ</th>
          <th scope="col" class="hidden whitespace-nowrap px-3 py-3 font-semibold md:table-cell">ผู้รายงาน (ชื่อ / เบอร์)</th>
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

          <!-- 4. แหล่งน้ำ -->
          <td class="hidden px-3 py-3 md:table-cell">
            <span class="whitespace-nowrap">{{ item.sample_nature?.water_source || 'แม่น้ำกก' }}</span>
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
        </tr>
      </tbody>
    </table>
  </div>
</template>
