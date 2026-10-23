<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  MapPin,
  ShieldCheck,
  User,
  X,
} from 'lucide-vue-next'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { publicPseudonym } from '../../src/lib/publicPseudonym'
import KokPPBTrendChart from './KokPPBTrendChart.vue'

const props = defineProps<{
  open: boolean
  waypoint: SurveyWaypoint | null
  allWaypoints: SurveyWaypoint[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'focus', waypoint: SurveyWaypoint): void
}>()

// หาตัวอย่างทั้งหมดที่อยู่ในบริเวณเดียวกัน (รัศมี ~250 ม. หรือละติจูด/ลองจิจูดใกล้กัน)
const nearbySamples = computed<SurveyWaypoint[]>(() => {
  if (!props.waypoint) return []
  const lat = props.waypoint.latitude
  const lon = props.waypoint.longitude

  return props.allWaypoints.filter((wp) => {
    const dLat = Math.abs(wp.latitude - lat)
    const dLon = Math.abs(wp.longitude - lon)
    return dLat <= 0.0025 && dLon <= 0.0025
  })
})

const isCluster = computed(() => nearbySamples.value.length > 1)

// ภาพถ่ายของทุกรอบตรวจในบริเวณนี้ (เฉพาะรายการที่เผยแพร่แล้ว ภาพโหลดผ่าน /api/surveys/photo)
const samplePhotos = computed(() => {
  const source = nearbySamples.value.length > 0 ? nearbySamples.value : props.waypoint ? [props.waypoint] : []
  return source.flatMap((wp) =>
    Array.from({ length: Math.min(wp.photo_count ?? 0, 2) }, (_, i) => ({
      key: `${wp.sample_code}-${i + 1}`,
      code: wp.sample_code,
      src: `/api/surveys/photo?code=${encodeURIComponent(wp.sample_code)}&n=${i + 1}`,
    })),
  )
})

const ppb = computed(() => Number(props.waypoint?.arsenic_level_ppb ?? 0))
const isDanger = computed(() => ppb.value > 10)
const isWatch = computed(() => ppb.value >= 5 && ppb.value <= 10)
const isSafe = computed(() => !isDanger.value && !isWatch.value)

const statusBadge = computed(() => {
  if (isDanger.value) return { text: 'เกินเกณฑ์ คพ. (> 10 ppb)', bg: 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-[#3A1C1C] dark:border-transparent dark:text-[#FF453A]' }
  if (isWatch.value) return { text: 'เฝ้าระวัง (5–10 ppb)', bg: 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-[#3A2C1C] dark:border-transparent dark:text-[#FF9F0A]' }
  return { text: 'ปกติ (0–5 ppb)', bg: 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-[#1C3A24] dark:border-transparent dark:text-[#32D74B]' }
})

const formattedDate = computed(() => {
  if (!props.waypoint) return '-'
  const raw = props.waypoint.collection_time || props.waypoint.created_at
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
})

const contributorName = computed(() => {
  if (!props.waypoint) return 'ผู้ไม่เปิดเผยชื่อ'
  return props.waypoint.contributor_label || publicPseudonym(props.waypoint.sample_code)
})

function closeModal() {
  emit('close')
}

function handleFlyTo() {
  if (props.waypoint) {
    emit('focus', props.waypoint)
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="open && waypoint"
    class="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
    @mousedown.self="closeModal"
  >
    <section
      role="dialog"
      aria-modal="true"
      class="wv-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
    >
      <!-- Header -->
      <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-4">
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            :class="
              isDanger
                ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-[#3A1C1C] dark:text-[#FF453A] dark:border-transparent'
                : isWatch
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-[#3A2C1C] dark:text-[#FF9F0A] dark:border-transparent'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-[#1C3A24] dark:text-[#32D74B] dark:border-transparent'
            "
          >
            <Flame v-if="isCluster" class="h-6 w-6" />
            <MapPin v-else class="h-6 w-6" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="
                  isCluster
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-[#FF9F0A] dark:text-black dark:border-transparent'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#2C2C2E] dark:text-white dark:border-transparent'
                "
              >
                {{ isCluster ? `🔥 กลุ่มจุดตรวจ (${nearbySamples.length} รอบตรวจ)` : '📍 จุดตรวจเดี่ยว' }}
              </span>
              <span class="font-mono text-xs text-slate-500 dark:text-[#98A2A8]">{{ waypoint.sample_code }}</span>
            </div>
            <h3 class="mt-1 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {{ waypoint.station_name || `จุดตรวจ ${waypoint.sample_code}` }}
            </h3>
            <p class="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-[#98A2A8]">
              <Compass class="h-3.5 w-3.5 text-sky-600 dark:text-[#00E5FF]" />
              <span>พิกัด: {{ waypoint.latitude.toFixed(5) }}, {{ waypoint.longitude.toFixed(5) }}</span>
              <span v-if="waypoint.gps_accuracy_meters" class="text-[11px] text-emerald-600 dark:text-[#32D74B]">
                (±{{ waypoint.gps_accuracy_meters }} ม.)
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="ปิดหน้าต่าง"
          class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#98A2A8] dark:hover:bg-[#252525] dark:hover:text-white transition"
          @click="closeModal"
        >
          <X class="h-5 w-5" />
        </button>
      </header>

      <!-- 3-Column KPI Summary Cards -->
      <div class="mt-4 grid grid-cols-3 gap-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-[#2C2C2E] dark:bg-[#141416]">
          <span class="block text-[11px] text-slate-500 dark:text-[#98A2A8]">สารหนู (As)</span>
          <span
            class="font-mono text-xl font-bold"
            :class="isDanger ? 'text-rose-600 dark:text-[#FF453A]' : isWatch ? 'text-amber-600 dark:text-[#FF9F0A]' : 'text-emerald-600 dark:text-[#32D74B]'"
          >
            {{ ppb }} ppb
          </span>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-[#2C2C2E] dark:bg-[#141416]">
          <span class="block text-[11px] text-slate-500 dark:text-[#98A2A8]">สถานะน้ำ</span>
          <span
            class="mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-bold"
            :class="statusBadge.bg"
          >
            {{ isDanger ? 'เกินเกณฑ์' : isWatch ? 'เฝ้าระวัง' : 'ปกติ' }}
          </span>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-[#2C2C2E] dark:bg-[#141416]">
          <span class="block text-[11px] text-slate-500 dark:text-[#98A2A8]">เกณฑ์ คพ.</span>
          <span class="font-mono text-xs font-bold text-emerald-600 dark:text-[#32D74B]">
            &le; 10 ppb
          </span>
          <span class="block text-[9px] text-slate-400 dark:text-[#98A2A8]">(น้ำผิวดิน)</span>
        </div>
      </div>

      <!-- Point Details Information Grid -->
      <div class="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white sm:grid-cols-2">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
          <div>
            <span class="block text-[10px] text-slate-500 dark:text-[#98A2A8]">วันและเวลาเก็บตัวอย่าง</span>
            <span class="font-mono font-medium">{{ formattedDate }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <User class="h-4 w-4 text-emerald-600 dark:text-[#32D74B]" />
          <div>
            <span class="block text-[10px] text-slate-500 dark:text-[#98A2A8]">ผู้ส่งผลตรวจ (ชื่อสมมติคุ้มครองสิทธิ)</span>
            <span class="font-medium text-sky-700 dark:text-[#00E5FF]">{{ contributorName }}</span>
          </div>
        </div>
      </div>

      <!-- Sample Photos -->
      <div v-if="samplePhotos.length" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-[#2C2C2E] dark:bg-[#141416]">
        <h4 class="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#98A2A8]">
          <Camera class="h-3.5 w-3.5 text-sky-600 dark:text-[#00E5FF]" />
          <span>ภาพถ่ายจุดตรวจ ({{ samplePhotos.length }} ภาพ)</span>
        </h4>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <a
            v-for="photo in samplePhotos"
            :key="photo.key"
            :href="photo.src"
            target="_blank"
            rel="noopener"
            class="group block overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E]"
            :title="`เปิดภาพขนาดเต็ม ${photo.code}`"
          >
            <img
              :src="photo.src"
              :alt="`ภาพถ่ายตัวอย่างน้ำ ${photo.code}`"
              loading="lazy"
              class="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
            />
            <span class="block truncate px-2 py-1 font-mono text-[10px] text-slate-500 dark:text-[#98A2A8]">{{ photo.code }}</span>
          </a>
        </div>
      </div>

      <!-- Embedded PPB Trend Chart for this Station / Hotspot -->
      <div class="mt-4">
        <KokPPBTrendChart
          :waypoints="nearbySamples.length > 0 ? nearbySamples : [waypoint]"
          :title="isCluster ? `แนวโน้มสารหนูในรัศมี 250 ม. (${nearbySamples.length} ครั้งที่ตรวจ)` : 'ประวัติค่าตรวจวัดในจุดนี้'"
          :is-compact="true"
        />
      </div>

      <!-- Historical Rounds List at this Point -->
      <div v-if="nearbySamples.length > 1" class="mt-4 space-y-2">
        <h4 class="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#98A2A8]">
          <Calendar class="h-3.5 w-3.5 text-sky-600 dark:text-[#00E5FF]" />
          <span>ประวัติการตรวจทั้งหมดในจุดนี้ ({{ nearbySamples.length }} ครั้ง)</span>
        </h4>
        <div class="max-h-48 space-y-1.5 overflow-y-auto">
          <div
            v-for="(item, idx) in nearbySamples"
            :key="item.id || item.sample_code"
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs transition hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:bg-[#252525]"
          >
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] text-slate-400 dark:text-[#98A2A8]">#{{ idx + 1 }}</span>
              <div>
                <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.sample_code }}</span>
                <span class="ml-2 text-[11px] text-slate-500 dark:text-[#98A2A8]">
                  {{ item.collection_time ? new Date(item.collection_time).toLocaleDateString('th-TH') : '-' }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="font-mono font-bold"
                :class="item.arsenic_level_ppb > 10 ? 'text-rose-600 dark:text-[#FF453A]' : item.arsenic_level_ppb >= 5 ? 'text-amber-600 dark:text-[#FF9F0A]' : 'text-emerald-600 dark:text-[#32D74B]'"
              >
                {{ item.arsenic_level_ppb }} ppb
              </span>
              <span
                class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                :class="
                  item.arsenic_level_ppb > 10
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-[#3A1C1C] dark:border-transparent dark:text-[#FF453A]'
                    : item.arsenic_level_ppb >= 5
                      ? 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-[#3A2C1C] dark:border-transparent dark:text-[#FF9F0A]'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-[#1C3A24] dark:border-transparent dark:text-[#32D74B]'
                "
              >
                {{ item.arsenic_level_ppb > 10 ? 'เกินเกณฑ์' : item.arsenic_level_ppb >= 5 ? 'เฝ้าระวัง' : 'ปกติ' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <footer class="mt-5 flex items-center justify-between border-t border-slate-200 dark:border-[#2C2C2E] pt-4">
        <button
          type="button"
          class="wv-btn-secondary text-xs"
          @click="handleFlyTo"
        >
          <MapPin class="h-3.5 w-3.5 text-sky-600 dark:text-[#00E5FF]" />
          <span>บินไปยังจุดนี้บนแผนที่</span>
        </button>

        <button
          type="button"
          class="wv-btn-secondary text-xs"
          @click="closeModal"
        >
          ปิดหน้าต่าง
        </button>
      </footer>
    </section>
  </div>
</template>
