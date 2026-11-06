<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Home,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  X,
} from 'lucide-vue-next'
import { getAdminToken, getReviewerName } from '../utils/admin-session'
import type { EvacuationCaseStatus, EvacuationLevelGroup, EvacuationQueueItem } from '../utils/evacuation-queue'

export interface EvacuationDestinationSummary {
  id: string
  kind: 'shelter' | 'assembly'
  label: string
  latitude: number
  longitude: number
  assignedCount: number
  arrivedCount: number
  enRouteCount: number
  waitingCount: number
  capacityLabel: string
  verificationStatus: string
}

export interface EvacuationRunState {
  run_id?: string
  community_id: string
  status: 'idle' | 'open' | 'closed'
  started_at?: string
  started_by?: string
  closed_at?: string
  closed_by?: string
}

const props = defineProps<{
  active: boolean
  isDesktop?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:queue', queue: EvacuationQueueItem[]): void
  (e: 'select-case', item: EvacuationQueueItem | null): void
  (e: 'update:destinations', destinations: EvacuationDestinationSummary[]): void
}>()

// UI State
const currentTab = ref<'queue' | 'destinations'>('queue')
const selectedCase = ref<EvacuationQueueItem | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const summaryCopied = ref(false)

// Data from API
const run = ref<EvacuationRunState>({ status: 'idle', community_id: 'thaton' })
const queue = ref<EvacuationQueueItem[]>([])
const destinations = ref<EvacuationDestinationSummary[]>([])
const levelGroups = ref<EvacuationLevelGroup[]>([
  { level: 1, label: 'วิกฤตสูงสุด', shortLabel: 'วิกฤตสูงสุด', color: '#A52714', count: 4, inQueue: true },
  { level: 2, label: 'มีสมาชิกเปราะบาง', shortLabel: 'มีเปราะบาง', color: '#E65100', count: 8, inQueue: true },
  { level: 4, label: 'เคยน้ำท่วมบ้าน', shortLabel: 'เคยท่วม', color: '#673AB7', count: 56, inQueue: true },
  { level: 5, label: 'ปกติ', shortLabel: 'ปกติ', color: '#0F9D58', count: 61, inQueue: false },
])
const totalCount = ref(68)
const allSurveyCount = ref(129)

// Computed
const arrivedCount = computed(() => queue.value.filter((q) => q.status === 'arrived').length)
const enRouteCount = computed(() => queue.value.filter((q) => q.status === 'en_route').length)
const waitingCount = computed(() => queue.value.filter((q) => q.status === 'waiting').length)
const progressPercent = computed(() => {
  if (!queue.value.length) return 0
  return Math.round((arrivedCount.value / queue.value.length) * 100)
})

const levelColorMap: Record<number, string> = {
  1: '#A52714',
  2: '#E65100',
  4: '#673AB7',
  5: '#0F9D58',
}

const levelNameMap: Record<number, string> = {
  1: 'วิกฤตสูงสุด',
  2: 'มีสมาชิกเปราะบาง',
  4: 'เคยน้ำท่วมบ้าน',
  5: 'ปกติ',
}

function getLevelColor(lvl: number) {
  return levelColorMap[lvl] || '#64748B'
}

function getLevelName(lvl: number) {
  return levelNameMap[lvl] || `ระดับ ${lvl}`
}

// Network headers
function authHeaders() {
  const token = getAdminToken()
  return {
    'content-type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Fetch evacuation queue and run status
async function fetchEvacuationData(silent = false) {
  if (!silent) loading.value = true
  errorMessage.value = null
  try {
    const res = await fetch('/api/admin/evacuation?community=thaton', {
      headers: authHeaders(),
    })
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('กรุณาเข้าสู่ระบบแอดมินก่อนใช้งานโหมดอพยพ')
      }
      throw new Error(`โหลดข้อมูลไม่สำเร็จ (HTTP ${res.status})`)
    }
    const data = await res.json()
    if (data.ok) {
      run.value = data.run || { status: 'idle', community_id: 'thaton' }
      queue.value = data.queue || []
      destinations.value = data.destinations || []
      if (data.levelGroups?.groups) {
        levelGroups.value = data.levelGroups.groups
        allSurveyCount.value = data.levelGroups.groups.reduce((acc: number, g: EvacuationLevelGroup) => acc + g.count, 0)
      }
      totalCount.value = queue.value.length

      emit('update:queue', queue.value)
      emit('update:destinations', destinations.value)

      // Keep selected case sync if present
      if (selectedCase.value) {
        const found = queue.value.find((q) => q.id === selectedCase.value?.id)
        if (found) {
          selectedCase.value = found
          emit('select-case', found)
        }
      }
    }
  } catch (err: any) {
    if (!silent) {
      errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    }
  } finally {
    if (!silent) loading.value = false
  }
}

// 1. Start run
async function startRun() {
  actionLoading.value = 'start'
  errorMessage.value = null
  try {
    const reviewer = getReviewerName() || 'ทีมช่วยเหลือ'
    const res = await fetch('/api/admin/evacuation/start', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ community: 'thaton', reviewer }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'เริ่มการอพยพไม่สำเร็จ')
    }
    run.value = data.run
    queue.value = data.queue || []
    destinations.value = data.destinations || []
    emit('update:queue', queue.value)
    emit('update:destinations', destinations.value)
  } catch (err: any) {
    errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการเริ่มการอพยพ'
  } finally {
    actionLoading.value = null
  }
}

// 2. Update case status (waiting -> en_route -> arrived)
async function updateCaseStatus(householdId: string, status: EvacuationCaseStatus) {
  actionLoading.value = `status-${householdId}`
  errorMessage.value = null
  try {
    const reviewer = getReviewerName() || 'ทีมช่วยเหลือ'
    const res = await fetch(`/api/admin/evacuation/cases/${householdId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, reviewer }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'อัปเดตสถานะไม่สำเร็จ')
    }

    // Local state update
    const item = queue.value.find((q) => q.id === householdId)
    if (item) {
      item.status = status
      if (selectedCase.value?.id === householdId) {
        selectedCase.value = { ...item }
        emit('select-case', selectedCase.value)
      }
    }
    emit('update:queue', [...queue.value])
    successMessage.value = `อัปเดตสถานะเป็น "${status === 'arrived' ? 'ถึงแล้ว' : status === 'en_route' ? 'กำลังไป' : 'รอ'}" เรียบร้อย`
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err: any) {
    errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ'
  } finally {
    actionLoading.value = null
  }
}

// 3. Move case up/down in queue
async function moveCase(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= queue.value.length) return

  const newQueue = [...queue.value]
  const [removed] = newQueue.splice(index, 1)
  newQueue.splice(targetIndex, 0, removed)

  // Recalculate rank locally
  newQueue.forEach((item, idx) => {
    item.rank = idx + 1
  })
  queue.value = newQueue
  emit('update:queue', newQueue)

  // Persist order to API
  try {
    const ids = newQueue.map((q) => q.id)
    await fetch('/api/admin/evacuation/order', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ household_ids: ids }),
    })
  } catch {
    // If background sync fails, silently retry on next poll
  }
}

// Navigation to Google Maps directions
function navigateToCase(item: EvacuationQueueItem) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
  window.open(url, '_blank')
}

// Select case for detail view
function onSelectCase(item: EvacuationQueueItem) {
  selectedCase.value = item
  emit('select-case', item)
}

function closeDetail() {
  selectedCase.value = null
  emit('select-case', null)
}

// Copy summary for disaster agency
function copySummary() {
  const lines = [
    `สรุปสถานการณ์การอพยพ บ้านท่าตอน (ทีมช่วยเหลือ)`,
    `เวลา: ${new Date().toLocaleString('th-TH')}`,
    `อพยพแล้ว: ${arrivedCount.value}/${queue.value.length} ครัวเรือน (${progressPercent.value}%)`,
    `กำลังเดินทาง: ${enRouteCount.value} ครัวเรือน`,
    `รอการช่วยเหลือ: ${waitingCount.value} ครัวเรือน`,
    ``,
    `จุดหมายปลายทาง:`,
    ...destinations.value.map((d) => `- ${d.label}: ถึงแล้ว ${d.arrivedCount} บ้าน, กำลังไป ${d.enRouteCount} บ้าน (${d.capacityLabel})`),
  ]
  const text = lines.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    summaryCopied.value = true
    setTimeout(() => { summaryCopied.value = false }, 3000)
  })
}

// Close entire evacuation mode
function onCloseMode() {
  emit('select-case', null)
  emit('close')
}

// 15-second polling timer
let pollInterval: any = null

onMounted(() => {
  void fetchEvacuationData()
  pollInterval = setInterval(() => {
    if (props.active) {
      void fetchEvacuationData(true)
    }
  }, 15000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

watch(() => props.active, (val) => {
  if (val) {
    void fetchEvacuationData()
  } else {
    selectedCase.value = null
  }
})
</script>

<template>
  <div class="ev-root text-slate-900 select-none">
    <!-- Top Header Bar -->
    <header class="ev-bar">
      <div class="flex flex-col">
        <b class="text-[15px] font-bold leading-tight">โหมดอพยพ · บ้านท่าตอน</b>
        <small class="text-[11px] opacity-85">ทีมช่วยเหลือ · ผู้ใหญ่บ้าน อปพร. รพ.สต.</small>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <span class="ev-lock">ล็อกอินแล้ว</span>
        <button
          type="button"
          aria-label="ปิดโหมดอพยพ"
          class="x"
          @click="onCloseMode"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Notification Toast if any -->
    <div
      v-if="errorMessage"
      class="fixed top-16 left-4 right-4 z-[1300] bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs"
    >
      <span>{{ errorMessage }}</span>
      <button type="button" @click="errorMessage = null" class="ml-2 font-bold">✕</button>
    </div>
    <div
      v-if="successMessage"
      class="fixed top-16 left-4 right-4 z-[1300] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs"
    >
      <span>{{ successMessage }}</span>
      <button type="button" @click="successMessage = null" class="ml-2 font-bold">✕</button>
    </div>

    <!-- DESKTOP 3-COLUMN COMMAND LAYOUT (>= 1024px) -->
    <template v-if="isDesktop">
      <!-- Left Column: Queue List -->
      <aside class="ev-side ev-side-l">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-base">คิวอพยพ</h3>
          <span class="text-xs text-slate-500">
            อพยพแล้ว {{ arrivedCount }}/{{ totalCount }} · กำลังไป {{ enRouteCount }}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="prog">
          <i :style="{ width: `${progressPercent}%` }"></i>
        </div>

        <!-- Desktop Segmented Controls -->
        <div class="seg my-2">
          <span
            :class="{ on: currentTab === 'queue' }"
            @click="currentTab = 'queue'"
            class="cursor-pointer"
          >
            คิวอพยพ ({{ queue.length }})
          </span>
          <span
            :class="{ on: currentTab === 'destinations' }"
            @click="currentTab = 'destinations'"
            class="cursor-pointer"
          >
            ที่หมาย ({{ destinations.length }})
          </span>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto pr-1">
          <!-- Start View Prompt if idle -->
          <div v-if="run.status === 'idle'" class="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-xs">
            <b class="text-amber-900 block mb-1">ยังไม่เริ่มรอบการอพยพอย่างเป็นทางการ</b>
            <p class="text-amber-800 text-[11.5px] mb-2">ระบบเตรียมคิว 68 หลังคาเรือนไว้พร้อมแล้ว สามารถกดเริ่มเพื่อบันทึกสถานะเรียลไทม์</p>
            <button
              type="button"
              class="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow"
              :disabled="actionLoading === 'start'"
              @click="startRun"
            >
              {{ actionLoading === 'start' ? 'กำลังเริ่ม...' : 'เริ่มอพยพตามลำดับ' }}
            </button>
          </div>

          <!-- Queue Tab Content -->
          <template v-if="currentTab === 'queue'">
            <div
              v-for="(item, idx) in queue"
              :key="item.id"
              class="ev-row cursor-pointer transition-colors hover:bg-slate-50"
              :class="{ 'bg-blue-50/70 border-l-4 border-l-blue-600 pl-2': selectedCase?.id === item.id }"
              @click="onSelectCase(item)"
            >
              <span
                class="rk"
                :style="{ background: item.status === 'arrived' ? '#16A34A' : getLevelColor(item.level) }"
              >
                {{ item.status === 'arrived' ? '✓' : item.rank }}
              </span>

              <div class="m">
                <b>
                  {{ getLevelName(item.level) }}
                  <span v-if="item.members > 0" class="font-normal text-slate-700">· เปราะบาง {{ item.members }} คน</span>
                </b>
                <div>
                  หย่อม{{ item.zone.replace(/^บ้าน/, '') }} · ไป{{ item.destinationLabel }} {{ Math.round(item.destinationMetres) }} ม.
                </div>
              </div>

              <!-- Status chip -->
              <span
                class="chip shrink-0"
                :class="{
                  'c-done': item.status === 'arrived',
                  'c-go': item.status === 'en_route',
                  'c-wait': item.status === 'waiting',
                }"
              >
                {{ item.status === 'arrived' ? 'ถึงแล้ว' : item.status === 'en_route' ? 'กำลังไป' : 'รอ' }}
              </span>

              <!-- Move buttons for desktop -->
              <div class="flex flex-col gap-0.5 ml-1 shrink-0" @click.stop>
                <button
                  type="button"
                  :disabled="idx === 0"
                  class="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 text-[10px]"
                  title="เลื่อนขึ้น"
                  @click="moveCase(idx, 'up')"
                >
                  <ArrowUp class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  :disabled="idx === queue.length - 1"
                  class="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 text-[10px]"
                  title="เลื่อนลง"
                  @click="moveCase(idx, 'down')"
                >
                  <ArrowDown class="w-3 h-3" />
                </button>
              </div>
            </div>
          </template>

          <!-- Destinations Tab Content -->
          <template v-else>
            <div
              v-for="dest in destinations"
              :key="dest.id"
              class="dest mb-2.5"
            >
              <div class="t">
                <b>⌂ {{ dest.label }}</b>
                <span class="chip c-go">ถึงแล้ว {{ dest.arrivedCount }} บ้าน</span>
              </div>
              <div class="cap">
                <i :style="{ width: `${queue.length ? Math.round((dest.arrivedCount / queue.length) * 100) : 0}%` }"></i>
              </div>
              <div class="note">
                กำลังเดินทาง {{ dest.enRouteCount }} บ้าน · {{ dest.capacityLabel }}
              </div>
            </div>

            <!-- Missing Coordinates Warning -->
            <div class="dest bg-red-50 border-red-200 mt-2 text-red-900">
              <b class="flex items-center gap-1 text-red-700">
                <AlertTriangle class="w-3.5 h-3.5" /> ยังไม่มีพิกัด
              </b>
              <div class="note text-red-700 mt-1">
                ศาลาประชาคม 100 คน · วัดท่าตอน 300 คน · รพ.สต.
              </div>
            </div>

            <button
              type="button"
              class="btn w-full mt-3 py-2 text-xs"
              @click="copySummary"
            >
              {{ summaryCopied ? 'คัดลอกสรุปแล้ว ✓' : 'ส่งสรุปให้ อบต. / ปภ.' }}
            </button>
          </template>
        </div>
      </aside>

      <!-- Right Column: Case Detail or Destination Inspector -->
      <aside v-if="selectedCase" class="ev-side ev-side-r">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span
              class="rk"
              :style="{ background: getLevelColor(selectedCase.level), width: '34px', height: '34px', fontSize: '16px' }"
            >
              {{ selectedCase.rank }}
            </span>
            <div>
              <h3 class="font-bold text-sm">{{ getLevelName(selectedCase.level) }}</h3>
              <div class="text-[11px] text-slate-500">รหัส {{ selectedCase.id }} · อันดับ {{ selectedCase.rank }} จาก {{ totalCount }} บ้าน</div>
            </div>
          </div>
          <button type="button" @click="closeDetail" class="text-slate-400 hover:text-slate-600 p-1">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="why mt-3">
          <div><span>หย่อม</span><b>{{ selectedCase.zone }}</b></div>
          <div><span>สมาชิกเปราะบาง</span><b>{{ selectedCase.members }} คน</b></div>
          <div><span>บ้านเคยน้ำท่วม</span><b>{{ selectedCase.flooded ? 'เคย' : 'ไม่เคย' }}</b></div>
          <div><span>อุบัติเหตุจากน้ำ</span><b>{{ selectedCase.accident ? 'เคยเกิดเหตุ' : 'ไม่มี' }}</b></div>
          <div><span>ไปที่</span><b>{{ selectedCase.destinationLabel }} · {{ Math.round(selectedCase.destinationMetres) }} ม.</b></div>
        </div>

        <!-- Privacy warning for contact info -->
        <div class="why bg-amber-50 border-amber-200">
          <div>
            <span>ผู้ติดต่อ · ประเภทความเปราะบาง · ต้องใช้รถ/เปล</span>
            <b class="text-amber-800">ยังไม่มีในชุดข้อมูล</b>
          </div>
            <p class="text-[11px] text-amber-800">ชุดสำรวจ My Maps มีเฉพาะตำแหน่งและจำนวนสมาชิกเปราะบาง ต้องเก็บชื่อและเบอร์ติดต่อเพิ่มก่อนใช้งานจริงหน้างาน</p>
        </div>

        <!-- Action buttons -->
        <div class="btns mt-3">
          <button type="button" class="btn flex items-center justify-center gap-1" @click="navigateToCase(selectedCase)">
            <Navigation class="w-3.5 h-3.5" /> นำทาง
          </button>
          <span class="btn flex items-center justify-center gap-1 cursor-default text-slate-500 border-dashed">
            <Phone class="w-3.5 h-3.5" /> ยังไม่มีเบอร์
          </span>
          <button
            v-if="selectedCase.status !== 'arrived'"
            type="button"
            class="btn p"
            :disabled="actionLoading === `status-${selectedCase.id}`"
            @click="updateCaseStatus(selectedCase.id, 'arrived')"
          >
            {{ actionLoading === `status-${selectedCase.id}` ? 'กำลังบันทึก...' : 'อพยพแล้ว ✓' }}
          </button>
          <button
            v-else
            type="button"
            class="btn bg-slate-100 text-slate-700 hover:bg-slate-200"
            :disabled="actionLoading === `status-${selectedCase.id}`"
            @click="updateCaseStatus(selectedCase.id, 'waiting')"
          >
            เปลี่ยนกลับเป็น "รอ"
          </button>
        </div>
      </aside>
    </template>

    <!-- MOBILE VIEW (BottomSheet UI) -->
    <template v-else>
      <div class="ev-sheet">
        <div class="ev-grip"></div>

        <!-- VIEW 1: START VIEW (if idle and no case selected) -->
        <template v-if="run.status === 'idle' && !selectedCase">
          <h3 class="font-bold text-base">บ้านที่ต้องอพยพ {{ totalCount }} บ้าน</h3>
          <div class="sub">จากแบบสำรวจ {{ allSurveyCount }} ครัวเรือน</div>

          <div class="tiers">
            <div
              v-for="grp in levelGroups"
              :key="grp.level"
              class="tier"
              :style="{ background: grp.color }"
            >
              <b>{{ grp.count }}</b>
              <span>{{ grp.shortLabel }}</span>
            </div>
          </div>

          <button
            type="button"
            class="cta w-full"
            :disabled="actionLoading === 'start'"
            @click="startRun"
          >
            {{ actionLoading === 'start' ? 'กำลังเริ่มการอพยพ...' : 'เริ่มอพยพตามลำดับ' }}
          </button>

          <div class="note">
            ลำดับ: วิกฤตสูงสุด → มีสมาชิกเปราะบาง → เคยท่วม · กลุ่มเดียวกันคนเปราะบางมากกว่าและบ้านไกลกว่าไปก่อน · บ้านปกติไม่เข้าคิว
          </div>
        </template>

        <!-- VIEW 3: CASE DETAIL VIEW (when case is selected) -->
        <template v-else-if="selectedCase">
          <div class="flex items-center justify-between pb-1">
            <button
              type="button"
              class="text-xs text-blue-600 font-bold flex items-center gap-1 py-1"
              @click="closeDetail"
            >
              <ArrowLeft class="w-3.5 h-3.5" /> กลับคิว
            </button>
            <span class="text-xs text-slate-500">รหัส {{ selectedCase.id }}</span>
          </div>

          <div class="flex gap-2.5 items-center mt-1">
            <span
              class="rk"
              :style="{ background: getLevelColor(selectedCase.level), width: '40px', height: '40px', fontSize: '18px' }"
            >
              {{ selectedCase.rank }}
            </span>
            <div>
              <h3 class="font-bold text-base leading-tight">{{ getLevelName(selectedCase.level) }}</h3>
              <div class="sub" style="margin:0">อันดับ {{ selectedCase.rank }} จาก {{ totalCount }} บ้าน</div>
            </div>
          </div>

          <div class="why">
            <div><span>หย่อม</span><b>{{ selectedCase.zone }}</b></div>
            <div><span>สมาชิกเปราะบาง</span><b>{{ selectedCase.members }} คน</b></div>
            <div><span>บ้านเคยน้ำท่วม</span><b>{{ selectedCase.flooded ? 'เคย' : 'ไม่เคย' }}</b></div>
            <div><span>อุบัติเหตุจากน้ำ</span><b>{{ selectedCase.accident ? 'เคยเกิดเหตุ' : 'ไม่มี' }}</b></div>
            <div><span>ไปที่</span><b>{{ selectedCase.destinationLabel }} · {{ Math.round(selectedCase.destinationMetres) }} ม.</b></div>
          </div>

          <div class="why bg-amber-50 border-amber-200">
            <div>
              <span>ผู้ติดต่อ · ประเภทความเปราะบาง · ต้องใช้รถ/เปล</span>
              <b class="text-amber-800">ยังไม่มีในชุดข้อมูล</b>
            </div>
            <p class="text-[11px] text-amber-800">ชุดสำรวจ My Maps มีเฉพาะตำแหน่งและจำนวนสมาชิกเปราะบาง ต้องเก็บชื่อและเบอร์ติดต่อเพิ่มก่อนใช้งานจริงหน้างาน</p>
          </div>

          <div class="btns">
            <button type="button" class="btn flex items-center justify-center gap-1" @click="navigateToCase(selectedCase)">
              <Navigation class="w-3.5 h-3.5" /> นำทาง
            </button>
            <span class="btn flex items-center justify-center gap-1 cursor-default text-slate-500 border-dashed">
              <Phone class="w-3.5 h-3.5" /> ยังไม่มีเบอร์
            </span>
            <button
              v-if="selectedCase.status !== 'arrived'"
              type="button"
              class="btn p"
              :disabled="actionLoading === `status-${selectedCase.id}`"
              @click="updateCaseStatus(selectedCase.id, 'arrived')"
            >
              {{ actionLoading === `status-${selectedCase.id}` ? 'กำลังบันทึก...' : 'อพยพแล้ว ✓' }}
            </button>
            <button
              v-else
              type="button"
              class="btn p bg-slate-200 text-slate-800 border-slate-300"
              :disabled="actionLoading === `status-${selectedCase.id}`"
              @click="updateCaseStatus(selectedCase.id, 'waiting')"
            >
              เปลี่ยนกลับเป็น "รอ"
            </button>
          </div>
        </template>

        <!-- VIEW 2 & 4: QUEUE & DESTINATIONS VIEW (Run is active) -->
        <template v-else>
          <!-- Segmented Tab -->
          <div class="seg mb-2">
            <span
              :class="{ on: currentTab === 'queue' }"
              @click="currentTab = 'queue'"
              class="cursor-pointer"
            >
              คิวอพยพ ({{ queue.length }})
            </span>
            <span
              :class="{ on: currentTab === 'destinations' }"
              @click="currentTab = 'destinations'"
              class="cursor-pointer"
            >
              ที่หมาย ({{ destinations.length }})
            </span>
          </div>

          <!-- TAB: QUEUE (View 2) -->
          <template v-if="currentTab === 'queue'">
            <div class="flex justify-between items-baseline">
              <h3 class="font-bold text-base">คิวอพยพ</h3>
              <span class="sub" style="margin:0">อพยพแล้ว {{ arrivedCount }}/{{ totalCount }}</span>
            </div>

            <!-- Progress bar -->
            <div class="prog">
              <i :style="{ width: `${progressPercent}%` }"></i>
            </div>

            <!-- Queue rows -->
            <div class="max-h-[220px] overflow-y-auto">
              <div
                v-for="(item, idx) in queue"
                :key="item.id"
                class="ev-row cursor-pointer"
                @click="onSelectCase(item)"
              >
                <span
                  class="rk"
                  :style="{ background: item.status === 'arrived' ? '#16A34A' : getLevelColor(item.level) }"
                >
                  {{ item.status === 'arrived' ? '✓' : item.rank }}
                </span>

                <div class="m">
                  <b>
                    {{ getLevelName(item.level) }}
                    <span v-if="item.members > 0" class="font-normal text-slate-700">· เปราะบาง {{ item.members }} คน</span>
                  </b>
                  <div>
                    หย่อม{{ item.zone.replace(/^บ้าน/, '') }} · ไป{{ item.destinationLabel }} {{ Math.round(item.destinationMetres) }} ม.
                  </div>
                </div>

                <span
                  class="chip shrink-0"
                  :class="{
                    'c-done': item.status === 'arrived',
                    'c-go': item.status === 'en_route',
                    'c-wait': item.status === 'waiting',
                  }"
                >
                  {{ item.status === 'arrived' ? 'ถึงแล้ว' : item.status === 'en_route' ? 'กำลังไป' : 'รอ' }}
                </span>

                <!-- Reorder buttons -->
                <div class="flex flex-col gap-0.5 ml-1 shrink-0" @click.stop>
                  <button
                    type="button"
                    :disabled="idx === 0"
                    class="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                    title="เลื่อนขึ้น"
                    @click="moveCase(idx, 'up')"
                  >
                    <ArrowUp class="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    :disabled="idx === queue.length - 1"
                    class="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                    title="เลื่อนลง"
                    @click="moveCase(idx, 'down')"
                  >
                    <ArrowDown class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div class="note">
              กดเลื่อนลำดับขึ้น/ลงได้เมื่อหน้างานจำเป็นต้องปรับลำดับ
            </div>
          </template>

          <!-- TAB: DESTINATIONS (View 4) -->
          <template v-else>
            <div class="flex justify-between items-baseline">
              <h3 class="font-bold text-base">ที่หมาย</h3>
              <div class="sub" style="margin:0">
                อพยพแล้ว {{ arrivedCount }}/{{ totalCount }} บ้าน · กำลังไป {{ enRouteCount }}
              </div>
            </div>

            <div class="max-h-[240px] overflow-y-auto">
              <div
                v-for="dest in destinations"
                :key="dest.id"
                class="dest"
              >
                <div class="t">
                  <b>⌂ {{ dest.label }}</b>
                  <span class="chip c-go">ถึงแล้ว {{ dest.arrivedCount }} บ้าน</span>
                </div>
                <div class="cap">
                  <i :style="{ width: `${queue.length ? Math.round((dest.arrivedCount / queue.length) * 100) : 0}%` }"></i>
                </div>
                <div class="note" style="margin:0">
                  กำลังเดินทาง {{ dest.enRouteCount }} บ้าน · {{ dest.capacityLabel }}
                </div>
              </div>

              <!-- Missing coords warning -->
              <div class="dest bg-red-50 border-red-200 mt-2 text-red-900">
                <b class="flex items-center gap-1 text-red-700">
                  <AlertTriangle class="w-3.5 h-3.5" /> ยังไม่มีพิกัด
                </b>
                <div class="note text-red-700 mt-1" style="margin:2px 0 0">
                  ศาลาประชาคม 100 คน · วัดท่าตอน 300 คน · รพ.สต.
                </div>
              </div>

              <div class="btns mt-3">
                <button type="button" class="btn w-full col-span-2" @click="copySummary">
                  {{ summaryCopied ? 'คัดลอกสรุปแล้ว ✓' : 'ส่งสรุปให้ อบต. / ปภ.' }}
                </button>
              </div>
            </div>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ev-root {
  font-family: 'Noto Sans Thai', Inter, Tahoma, sans-serif;
  color: #0F172A;
}

.ev-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #7C2D12;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  z-index: 1200;
}

.ev-bar .x {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-size: 16px;
  cursor: pointer;
  border: none;
  color: #fff;
}

.ev-lock {
  background: #FEF3C7;
  color: #92400E;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 700;
}

.ev-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -6px 24px rgba(15, 23, 42, 0.18);
  padding: 10px 16px 18px;
  z-index: 1200;
  max-height: 80vh;
}

.ev-grip {
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: #CBD5E1;
  margin: 0 auto 10px;
}

.ev-side {
  position: fixed;
  top: 72px;
  bottom: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.16);
  padding: 14px 16px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
}

.ev-side-l {
  left: 16px;
  width: 380px;
}

.ev-side-r {
  right: 16px;
  width: 340px;
  bottom: auto;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
}

.seg {
  display: flex;
  background: #F1F5F9;
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
}

.seg span {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13.5px;
  color: #475569;
}

.seg .on {
  background: #fff;
  color: #7C2D12;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.tiers {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.tier {
  border-radius: 12px;
  padding: 8px 6px;
  color: #fff;
  text-align: center;
}

.tier b {
  display: block;
  font-size: 22px;
  line-height: 1.1;
  font-family: 'JetBrains Mono', monospace;
}

.tier span {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.cta {
  display: block;
  text-align: center;
  border-radius: 14px;
  padding: 14px;
  font-weight: 800;
  font-size: 16px;
  color: #fff;
  background: #B91C1C;
  box-shadow: 0 4px 14px rgba(185, 28, 28, 0.35);
  border: none;
  cursor: pointer;
}

.cta:hover {
  background: #991B1B;
}

.note {
  font-size: 11.5px;
  color: #64748B;
  margin-top: 8px;
}

.prog {
  height: 8px;
  border-radius: 8px;
  background: #F1F5F9;
  overflow: hidden;
  margin: 6px 0 10px;
}

.prog i {
  display: block;
  height: 100%;
  background: #16A34A;
  transition: width 0.3s ease;
}

.ev-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid #F1F5F9;
}

.rk {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  flex: none;
}

.ev-row .m {
  flex: 1;
  min-width: 0;
}

.ev-row .m b {
  font-size: 13.5px;
  display: block;
}

.ev-row .m div {
  font-size: 11.5px;
  color: #64748B;
}

.chip {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
}

.c-wait {
  background: #F1F5F9;
  color: #475569;
}

.c-go {
  background: #DBEAFE;
  color: #1D4ED8;
}

.c-done {
  background: #DCFCE7;
  color: #15803D;
}

.why {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 8px 12px;
  margin: 10px 0;
}

.why div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  padding: 3px 0;
}

.why span {
  color: #64748B;
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn {
  text-align: center;
  border-radius: 12px;
  padding: 12px 6px;
  font-weight: 800;
  font-size: 14px;
  border: 1.5px solid #E2E8F0;
  color: #0284C7;
  background: #fff;
  cursor: pointer;
}

.btn:hover:not(:disabled) {
  background: #F8FAFC;
}

.btn.p {
  background: #16A34A;
  border-color: #16A34A;
  color: #fff;
  grid-column: 1 / -1;
}

.btn.p:hover:not(:disabled) {
  background: #15803D;
}

.dest {
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 10px 12px;
  margin-top: 8px;
}

.dest .t {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dest b {
  font-size: 14px;
}

.cap {
  height: 8px;
  border-radius: 8px;
  background: #F1F5F9;
  overflow: hidden;
  margin: 7px 0 4px;
}

.cap i {
  display: block;
  height: 100%;
  background: #0284C7;
  transition: width 0.3s ease;
}

.sub {
  color: #64748B;
  font-size: 12px;
  margin: 2px 0 10px;
}
</style>
