<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, primaryButtonClass, searchFieldClass } from '../utils/admin-ui'
import { communityTargets, type CommunityTarget } from '../utils/kok-contract'
import type { CommunityId } from '../../src/lib/map-data'
import { adminFetch } from '../utils/admin-session'

const props = defineProps<{
  communityId: CommunityId
}>()

const currentCommunity = computed(() => {
  return communityTargets.find((c) => c.id === props.communityId) ?? communityTargets[0]!
})

const searchQuery = ref('')
const selectedFilter = ref<'all' | 'pending_followup' | 'verified'>('all')
const actionToastMessage = ref<string | null>(null)
const loading = ref(false)
const isCreateModalOpen = ref(false)
const newReporter = ref({
  name: '',
  role: 'ผู้ใหญ่บ้าน / แกนนำ อสม.',
  phone: '',
  hamlet: '',
  notes: '',
})

interface ReporterItem {
  id: string
  name: string
  role: string
  phone: string
  communityId: CommunityId
  hamlet: string
  totalSamples: number
  lastSampleDate: string
  lastPpb: number
  followUpStatus: 'routine' | 'pending_followup' | 'verified'
  notes: string
}

const reportersList = ref<ReporterItem[]>([])

async function loadReporters() {
  loading.value = true
  try {
    const res = await adminFetch(`/api/admin/reporters?communityId=${props.communityId}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.items)) {
        reportersList.value = data.items
      }
    }
  } catch (err) {
    console.error('Failed to load reporters:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadReporters)
watch(() => props.communityId, loadReporters)

// Filtered reporters strictly scoped to selected community
const communityReporters = computed(() => {
  return reportersList.value.filter((r) => r.communityId === props.communityId)
})

const filteredReporters = computed(() => {
  let list = communityReporters.value
  if (selectedFilter.value === 'pending_followup') {
    list = list.filter((r) => r.followUpStatus === 'pending_followup')
  } else if (selectedFilter.value === 'verified') {
    list = list.filter((r) => r.followUpStatus === 'verified')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.hamlet.toLowerCase().includes(q)
    )
  }
  return list
})

const pendingCount = computed(() => {
  return communityReporters.value.filter((r) => r.followUpStatus === 'pending_followup').length
})

function triggerNotify(reporter: ReporterItem) {
  actionToastMessage.value = `บันทึกการส่งต่อการแจ้งเตือนไปยัง ${reporter.name} (หอกระจายข่าว / LINE) สำเร็จ`
  setTimeout(() => {
    actionToastMessage.value = null
  }, 2500)
}

async function triggerAssignTeam(reporter: ReporterItem) {
  reporter.followUpStatus = 'verified'
  try {
    await adminFetch(`/api/admin/reporters/${reporter.id}`, {
      method: 'PUT',
      body: JSON.stringify({ followUpStatus: 'verified' }),
    })
  } catch (err) {
    console.error('Failed to persist assign team:', err)
  }
  actionToastMessage.value = `มอบหมายทีมนักวิจัย มฟล. ลงตรวจแล็บซ้ำจุดของ ${reporter.name} เรียบร้อย`
  setTimeout(() => {
    actionToastMessage.value = null
  }, 2500)
}

async function saveNewReporter() {
  if (!newReporter.value.name.trim()) return
  try {
    const res = await adminFetch('/api/admin/reporters', {
      method: 'POST',
      body: JSON.stringify({
        ...newReporter.value,
        communityId: props.communityId,
      }),
    })
    if (res.ok) {
      isCreateModalOpen.value = false
      newReporter.value = { name: '', role: 'ผู้ใหญ่บ้าน / แกนนำ อสม.', phone: '', hamlet: '', notes: '' }
      actionToastMessage.value = 'เพิ่มรายชื่ออาสาสมัครลงฐานข้อมูลเรียบร้อย'
      setTimeout(() => { actionToastMessage.value = null }, 2500)
      await loadReporters()
    }
  } catch (err) {
    console.error('Failed to create reporter:', err)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-[#2C2C2E]">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-lg bg-sky-100 p-1.5 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300">
            <Users class="h-4 w-4" />
          </span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            ทะเบียนอาสาสมัครและติดตามตรวจซ้ำ (Reporter Directory & Follow-up)
          </h2>
          <span class="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-[#0284C7] border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
            {{ currentCommunity.name }}
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ทะเบียนชาวบ้าน/อสม. ผู้ส่งผลตรวจน้ำ และติดตามภารกิจส่งทีมลงตรวจซ้ำเมื่อพบสารหนูเกินเกณฑ์ (R05)
        </p>
      </div>

      <button
        type="button"
        :class="primaryButtonClass"
        @click="isCreateModalOpen = true"
      >
        <Plus class="h-4 w-4" />
        <span>เพิ่มอาสาสมัคร</span>
      </button>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="actionToastMessage"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 transition-all"
    >
      <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>{{ actionToastMessage }}</span>
    </div>

    <!-- Stat Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div :class="adminCardClass" class="p-4 sm:p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">อาสาสมัครทั้งหมด</span>
          <UserCheck class="h-4 w-4 text-[#0284C7]" />
        </div>
        <div class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          {{ communityReporters.length }} คน
        </div>
        <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          ประจำ {{ currentCommunity.fullName }}
        </p>
      </div>

      <div :class="adminCardClass" class="p-4 sm:p-5 border-l-4 border-l-rose-500">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-rose-700 dark:text-rose-400">ต้องลงตรวจแล็บซ้ำ</span>
          <AlertCircle class="h-4 w-4 text-rose-600" />
        </div>
        <div class="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
          {{ pendingCount }} จุด
        </div>
        <p class="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80">
          พบสารหนู &gt; 50 ppb รอทีมยืนยัน
        </p>
      </div>

      <div :class="adminCardClass" class="p-4 sm:p-5 border-l-4 border-l-emerald-500">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">ส่งต่อการแจ้งเตือนแล้ว</span>
          <Bell class="h-4 w-4 text-emerald-600" />
        </div>
        <div class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          100%
        </div>
        <p class="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
          ผ่านหอกระจายข่าวและกลุ่ม LINE ชุมชน
        </p>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาชื่อผู้รายงาน, เบอร์โทรศัพท์ หรือหมู่บ้าน..."
          :class="searchFieldClass"
        />
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto">
        <button
          v-for="f in [
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'pending_followup', label: 'รอตรวจซ้ำ' },
            { id: 'verified', label: 'ยืนยันแล้ว' },
          ]"
          :key="f.id"
          type="button"
          class="rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
          :class="[
            selectedFilter === f.id
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300'
          ]"
          @click="selectedFilter = f.id as any"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Reporters Table Card -->
    <div :class="adminCardClass" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-[#2C2C2E] dark:bg-[#141416]/50">
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">ชื่อผู้รายงาน / บทบาท</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">เบอร์ติดต่อ</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">หมู่บ้านที่ดูแล</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">ตัวอย่างที่ส่ง</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">ผลตรวจล่าสุด</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">สถานะภารกิจ</th>
              <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <tr
              v-for="rep in filteredReporters"
              :key="rep.id"
              class="hover:bg-slate-50/70 dark:hover:bg-[#252525]/40 transition-colors"
            >
              <td class="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[#0284C7] font-bold text-xs dark:bg-sky-950 dark:text-sky-300">
                    {{ rep.name.slice(0, 1) }}
                  </div>
                  <div>
                    <div class="font-bold">{{ rep.name }}</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ rep.role }}</div>
                  </div>
                </div>
              </td>

              <td class="py-3.5 px-4">
                <a
                  :href="`tel:${rep.phone}`"
                  class="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline dark:text-sky-400"
                >
                  <Phone class="h-3 w-3" />
                  <span>{{ rep.phone }}</span>
                </a>
              </td>

              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                <div class="flex items-center gap-1">
                  <MapPin class="h-3 w-3 text-slate-400 shrink-0" />
                  <span class="truncate max-w-[180px]">{{ rep.hamlet }}</span>
                </div>
              </td>

              <td class="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                {{ rep.totalSamples }} ครั้ง
              </td>

              <td class="py-3.5 px-4">
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="rep.lastPpb > 50 ? 'bg-rose-500 ring-2 ring-rose-200' : rep.lastPpb > 5 ? 'bg-amber-500' : 'bg-emerald-500'"
                  ></span>
                  <span class="font-bold text-slate-900 dark:text-white">{{ rep.lastPpb }} ppb</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ rep.lastSampleDate }}</div>
              </td>

              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="[
                    rep.followUpStatus === 'pending_followup' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' :
                    rep.followUpStatus === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                  ]"
                >
                  <span v-if="rep.followUpStatus === 'pending_followup'">• ต้องลงตรวจซ้ำ</span>
                  <span v-else-if="rep.followUpStatus === 'verified'">✓ ยืนยันแล้ว</span>
                  <span v-else>ปกติ</span>
                </span>
              </td>

              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    title="บันทึกการส่งต่อแจ้งเตือน"
                    class="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-[#252525] dark:hover:text-white"
                    @click="triggerNotify(rep)"
                  >
                    <Send class="h-3.5 w-3.5" />
                  </button>

                  <button
                    v-if="rep.followUpStatus === 'pending_followup'"
                    type="button"
                    class="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-rose-700 transition"
                    @click="triggerAssignTeam(rep)"
                  >
                    มอบหมายทีมตรวจ
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredReporters.length === 0">
              <td colspan="7" class="py-8 text-center text-slate-400 dark:text-slate-500">
                ไม่พบข้อมูลอาสาสมัครตามเงื่อนไขที่เลือก
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal เพิ่มอาสาสมัครใหม่ -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2C2C2E]">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">เพิ่มรายชื่ออาสาสมัครใหม่</h3>
          <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-600" @click="isCreateModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="space-y-3" @submit.prevent="saveNewReporter">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อ - นามสกุล *</label>
            <input
              v-model="newReporter.name"
              type="text"
              required
              placeholder="เช่น นายสมบูรณ์ ปากอิง"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">บทบาท / ตำแหน่ง</label>
            <input
              v-model="newReporter.role"
              type="text"
              placeholder="เช่น แกนนำ อสม. / ผู้ใหญ่บ้าน"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              v-model="newReporter.phone"
              type="tel"
              placeholder="เช่น 081-xxx-xxxx"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">หมู่บ้านที่รับผิดชอบ</label>
            <input
              v-model="newReporter.hamlet"
              type="text"
              placeholder="เช่น หมู่บ้านท่าตอนเหนือ (หมู่ 3)"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              v-model="newReporter.notes"
              rows="2"
              placeholder="บันทึกสภาพแหล่งน้ำหรือจุดตรวจที่รับผิดชอบ..."
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2C2C2E]">
            <button type="button" :class="actionButtonClass" @click="isCreateModalOpen = false">ยกเลิก</button>
            <button type="submit" :class="primaryButtonClass">บันทึกอาสาสมัคร</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
