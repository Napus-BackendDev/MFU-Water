<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Calendar,
  Clock,
  Compass,
  Droplets,
  ExternalLink,
  Filter,
  ListFilter,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-vue-next'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { publicPseudonym } from '../../src/lib/publicPseudonym'

const props = defineProps<{
  open: boolean
  waypoints: SurveyWaypoint[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'selectWaypoint', waypoint: SurveyWaypoint): void
  (e: 'focusWaypoint', waypoint: SurveyWaypoint): void
}>()

const searchQuery = ref('')
const selectedStatus = ref<'all' | 'normal' | 'watch' | 'critical'>('all')
const selectedTimeframe = ref<'all' | '24h' | '7d' | '30d'>('all')

const filteredList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const now = Date.now()

  return props.waypoints.filter((wp) => {
    const ppb = Number(wp.arsenic_level_ppb ?? 0)

    // Status filter
    if (selectedStatus.value === 'normal' && ppb > 5) return false
    if (selectedStatus.value === 'watch' && (ppb < 5 || ppb > 10)) return false
    if (selectedStatus.value === 'critical' && ppb <= 10) return false

    // Timeframe filter
    if (selectedTimeframe.value !== 'all') {
      const rawDate = wp.collection_time || wp.created_at
      const d = new Date(rawDate)
      if (!Number.isNaN(d.getTime())) {
        const diffHours = (now - d.getTime()) / (1000 * 3600)
        if (selectedTimeframe.value === '24h' && diffHours > 24) return false
        if (selectedTimeframe.value === '7d' && diffHours > 24 * 7) return false
        if (selectedTimeframe.value === '30d' && diffHours > 24 * 30) return false
      }
    }

    // Search query
    if (query) {
      const code = (wp.sample_code || '').toLowerCase()
      const station = (wp.station_name || '').toLowerCase()
      const contrib = (wp.contributor_label || publicPseudonym(wp.sample_code)).toLowerCase()
      const source = (wp.water_source || '').toLowerCase()
      const match = code.includes(query) || station.includes(query) || contrib.includes(query) || source.includes(query)
      if (!match) return false
    }

    return true
  })
})

function onSelect(wp: SurveyWaypoint) {
  emit('selectWaypoint', wp)
}

function onFlyTo(wp: SurveyWaypoint) {
  emit('focusWaypoint', wp)
  emit('close')
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
    @mousedown.self="emit('close')"
  >
    <section
      role="dialog"
      aria-modal="true"
      class="wv-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
    >
      <!-- Header -->
      <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-4">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200 dark:bg-[#00E5FF]/15 dark:text-[#00E5FF] dark:border-transparent">
            <ListFilter class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              รายการผลตรวจที่บันทึกไว้ในระบบ ({{ waypoints.length }} รายการ)
            </h3>
            <p class="text-xs text-slate-500 dark:text-[#98A2A8]">
              ข้อมูลผลตรวจคุณภาพน้ำจริงที่บันทึกใน Supabase พร้อมตัวกรองและการค้นหา
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="ปิดหน้าต่าง"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white transition"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </header>

      <!-- Filters & Search Toolbar -->
      <div class="mt-4 space-y-3">
        <!-- Search Input -->
        <div class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-[#98A2A8]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาด้วยรหัสตัวอย่าง (KOK-...), ชื่อจุดตรวจ, ชื่อผู้บันทึก หรือแหล่งน้ำ..."
            class="wv-input pl-9 text-xs border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:text-white"
            @click="searchQuery = ''"
          >
            ล้าง
          </button>
        </div>

        <!-- Filter Buttons (Status & Timeframe) -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <!-- Status Filters -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">สถานะ:</span>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedStatus === 'all' ? 'bg-sky-600 text-white font-bold dark:bg-[#00E5FF] dark:text-black' : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8] dark:hover:text-white'"
              @click="selectedStatus = 'all'"
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedStatus === 'normal' ? 'bg-emerald-600 text-white font-bold dark:bg-[#32D74B] dark:text-black' : 'border border-slate-200 bg-slate-50 text-emerald-700 hover:bg-emerald-100 dark:border-[#1C3A24] dark:bg-[#141416] dark:text-[#32D74B]'"
              @click="selectedStatus = 'normal'"
            >
              ปกติ (&le;5)
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedStatus === 'watch' ? 'bg-amber-600 text-white font-bold dark:bg-[#FF9F0A] dark:text-black' : 'border border-slate-200 bg-slate-50 text-amber-700 hover:bg-amber-100 dark:border-[#3A2C1C] dark:bg-[#141416] dark:text-[#FF9F0A]'"
              @click="selectedStatus = 'watch'"
            >
              เฝ้าระวัง (10)
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedStatus === 'critical' ? 'bg-rose-600 text-white font-bold dark:bg-[#FF453A] dark:text-black' : 'border border-slate-200 bg-slate-50 text-rose-700 hover:bg-rose-100 dark:border-[#3A1C1C] dark:bg-[#141416] dark:text-[#FF453A]'"
              @click="selectedStatus = 'critical'"
            >
              เกินเกณฑ์ (&gt;10)
            </button>
          </div>

          <!-- Timeframe Filters -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">ช่วงเวลา:</span>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedTimeframe === 'all' ? 'bg-slate-800 text-white font-bold dark:bg-[#2C2C2E] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
              @click="selectedTimeframe = 'all'"
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedTimeframe === '24h' ? 'bg-slate-800 text-white font-bold dark:bg-[#2C2C2E] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
              @click="selectedTimeframe = '24h'"
            >
              24 ชม.
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedTimeframe === '7d' ? 'bg-slate-800 text-white font-bold dark:bg-[#2C2C2E] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
              @click="selectedTimeframe = '7d'"
            >
              7 วัน
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
              :class="selectedTimeframe === '30d' ? 'bg-slate-800 text-white font-bold dark:bg-[#2C2C2E] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#98A2A8] dark:hover:text-white'"
              @click="selectedTimeframe = '30d'"
            >
              30 วัน
            </button>
          </div>
        </div>
      </div>

      <!-- Result Count Banner -->
      <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#98A2A8]">
        <span>พบ {{ filteredList.length }} จาก {{ waypoints.length }} รายการ</span>
        <span class="text-[11px]">คลิกรายการเพื่อดูรายละเอียดกราฟและประวัติ</span>
      </div>

      <!-- Samples List -->
      <div class="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        <div v-if="filteredList.length === 0" class="py-12 text-center text-xs text-slate-400 dark:text-[#98A2A8]">
          ไม่พบผลตรวจที่ตรงกับเงื่อนไขการค้นหา
        </div>

        <div
          v-for="wp in filteredList"
          :key="wp.id || wp.sample_code"
          class="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs transition hover:border-sky-400 hover:bg-white hover:shadow-sm dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:border-[#00E5FF]/50 dark:hover:bg-[#1A1A1C] sm:flex-row sm:items-center sm:justify-between"
        >
          <!-- Left: Sample Info -->
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-slate-900 dark:text-white">{{ wp.sample_code }}</span>
              <span
                class="rounded-md px-2 py-0.5 text-[10px] font-bold"
                :class="
                  wp.arsenic_level_ppb > 10
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-[#3A1C1C] dark:border-transparent dark:text-[#FF453A]'
                    : wp.arsenic_level_ppb >= 5
                      ? 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-[#3A2C1C] dark:border-transparent dark:text-[#FF9F0A]'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-[#1C3A24] dark:border-transparent dark:text-[#32D74B]'
                "
              >
                {{ wp.arsenic_level_ppb > 10 ? 'เกินเกณฑ์ คพ.' : wp.arsenic_level_ppb >= 5 ? 'เฝ้าระวัง' : 'ปกติ' }}
              </span>
            </div>

            <p class="font-semibold text-slate-800 dark:text-white truncate max-w-md">
              {{ wp.station_name || `จุดตรวจ ${wp.sample_code}` }}
            </p>

            <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-[#98A2A8]">
              <span class="flex items-center gap-1 font-mono">
                <Clock class="h-3 w-3 text-sky-600 dark:text-[#00E5FF]" />
                <span>{{ wp.collection_time ? new Date(wp.collection_time).toLocaleString('th-TH') : '-' }}</span>
              </span>
              <span class="flex items-center gap-1 text-sky-700 dark:text-[#00E5FF] font-medium">
                <User class="h-3 w-3" />
                <span>{{ wp.contributor_label || publicPseudonym(wp.sample_code) }}</span>
              </span>
              <span class="flex items-center gap-1">
                <Compass class="h-3 w-3 text-emerald-600 dark:text-[#32D74B]" />
                <span class="font-mono">{{ wp.latitude.toFixed(4) }}, {{ wp.longitude.toFixed(4) }}</span>
              </span>
            </div>
          </div>

          <!-- Right: Value & Actions -->
          <div class="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-[#2C2C2E] pt-2 sm:border-t-0 sm:pt-0">
            <div class="text-right">
              <span
                class="font-mono text-lg font-black"
                :class="
                  wp.arsenic_level_ppb > 10
                    ? 'text-rose-600 dark:text-[#FF453A]'
                    : wp.arsenic_level_ppb >= 5
                      ? 'text-amber-600 dark:text-[#FF9F0A]'
                      : 'text-emerald-600 dark:text-[#32D74B]'
                "
              >
                {{ wp.arsenic_level_ppb }} ppb
              </span>
              <span class="block text-[9px] text-slate-400 dark:text-[#98A2A8]">เกณฑ์ คพ. &le;10</span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-[#00E5FF] dark:hover:bg-[#252525] transition"
                title="บินไปยังหมุดบนแผนที่"
                @click="onFlyTo(wp)"
              >
                <MapPin class="h-3.5 w-3.5 inline mr-1" />
                <span>แผนที่</span>
              </button>

              <button
                type="button"
                class="rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-600 hover:text-white dark:border-[#00E5FF]/40 dark:bg-[#00E5FF]/10 dark:text-[#00E5FF] dark:hover:bg-[#00E5FF] dark:hover:text-black transition"
                @click="onSelect(wp)"
              >
                <span>รายละเอียด</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="mt-5 flex items-center justify-between border-t border-slate-200 dark:border-[#2C2C2E] pt-4">
        <span class="text-xs text-slate-500 dark:text-[#98A2A8]">ข้อมูลซิงค์กับฐานข้อมูล Supabase Cloud</span>
        <button
          type="button"
          class="wv-btn-secondary text-xs"
          @click="emit('close')"
        >
          ปิดหน้าต่าง
        </button>
      </footer>
    </section>
  </div>
</template>
