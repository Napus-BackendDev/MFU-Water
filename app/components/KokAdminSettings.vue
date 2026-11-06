<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import { adminFetch } from '../utils/admin-session'

const activeSubTab = ref<'sponsors' | 'contacts' | 'audit'>('sponsors')
const isSavedToastVisible = ref(false)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

// Tab 1: Sponsors & Funding
const sponsors = ref([
  {
    id: 'SPON-01',
    name: 'Australian Aid (DFAT)',
    program: 'โครงการความร่วมมือเพื่อการพัฒนาลุ่มน้ำโขง-ลุ่มน้ำกก',
    logoUrl: '/sponsors/australian-aid.png',
    isActive: true,
    creditText: 'ได้รับการสนับสนุนงบประมาณจาก Australian Aid ภายใต้โครงการ IP3',
  },
  {
    id: 'SPON-02',
    name: 'Oxfam in Thailand',
    program: 'นวัตกรรมเฝ้าระวังมลพิษทางน้ำและสิทธิชุมชน',
    logoUrl: '/sponsors/oxfam.png',
    isActive: true,
    creditText: 'ร่วมสนับสนุนชุดตรวจสารหนูภาคสนามและการเสริมพลังอาสาสมัครชุมชน',
  },
  {
    id: 'SPON-03',
    name: 'มหาวิทยาลัยแม่ฟ้าหลวง (มฟล.)',
    program: 'สถาบันวิจัยและนวัตกรรมเพื่อการพัฒนาลุ่มน้ำกก',
    logoUrl: '/sponsors/mfu.png',
    isActive: true,
    creditText: 'ศูนย์วิจัยสารพิษและคุณภาพน้ำ มหาวิทยาลัยแม่ฟ้าหลวง',
  },
  {
    id: 'SPON-04',
    name: 'กองทุนเพื่อความเสมอภาคทางการศึกษา (กสศ.)',
    program: 'โครงการเยาวชนอาสาสมัครวิจัยชุมชน',
    logoUrl: '/sponsors/sdc.png',
    isActive: true,
    creditText: 'สนับสนุนการพัฒนาหลักสูตรเยาวชนนักสืบสายน้ำใน 4 ชุมชนเป้าหมาย',
  },
])

// Tab 2: Emergency Contacts
const emergencyContacts = ref([
  {
    agency: 'รพ.สต. บ้านท่าตอน',
    community: 'บ้านท่าตอน (อ.แม่อาย)',
    phone: '053-051-234',
    duty: 'จุดคัดกรองสุขภาพผู้สัมผัสสารหนูและศูนย์ปฐมพยาบาล',
  },
  {
    agency: 'รพ.สต. บ้านรวมมิตร',
    community: 'บ้านกะเหรี่ยงรวมมิตร (อ.เมืองเชียงราย)',
    phone: '053-737-123',
    duty: 'หน่วยพยาบาลเคลื่อนที่และตรวจอาการสะสม',
  },
  {
    agency: 'ปภ. จังหวัดเชียงใหม่ (สาขาฝาง)',
    community: 'ลุ่มน้ำกกตอนบน',
    phone: '053-452-111',
    duty: 'ศูนย์เตือนภัยน้ำหลากฉับพลันและเรือท้องแบนกู้ชีพ',
  },
  {
    agency: 'ปภ. จังหวัดเชียงราย',
    community: 'ลุ่มน้ำกกตอนกลาง-ตอนล่าง',
    phone: '053-152-345',
    duty: 'ศูนย์ประสานงานอพยพภัยพิบัติจังหวัด',
  },
  {
    agency: 'สายด่วนแพทย์ฉุกเฉินกู้ชีพ',
    community: 'ทุกพื้นที่',
    phone: '1669',
    duty: 'สายด่วนกู้ชีพฉุกเฉิน 24 ชั่วโมง',
  },
  {
    agency: 'สายด่วน ปภ. รับแจ้งเตือนภัย',
    community: 'ทุกพื้นที่',
    phone: '1784',
    duty: 'รับแจ้งเหตุน้ำท่วม ดินถล่ม ตลอด 24 ชม.',
  },
])

// Tab 3: Audit Log History
const auditLogs = ref<any[]>([])

async function fetchSettings() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await adminFetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.sponsors) && data.sponsors.length > 0) {
        sponsors.value = data.sponsors
      }
      if (Array.isArray(data.contacts) && data.contacts.length > 0) {
        emergencyContacts.value = data.contacts
      }
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
        auditLogs.value = data.auditLogs
      }
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'เกิดข้อผิดพลาดในการโหลดการตั้งค่า'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSettings()
})

function addContactRow() {
  emergencyContacts.value.push({
    agency: 'หน่วยงานใหม่',
    community: 'ทุกพื้นที่',
    phone: '053-000-000',
    duty: 'ภารกิจช่วยเหลือฉุกเฉิน',
  })
}

function removeContactRow(idx: number) {
  if (confirm('ต้องการลบรายการเบอร์ติดต่อนี้ใช่หรือไม่?')) {
    emergencyContacts.value.splice(idx, 1)
  }
}

async function handleSave() {
  saving.value = true
  try {
    if (activeSubTab.value === 'sponsors') {
      const res = await adminFetch('/api/admin/settings/sponsors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsors: sponsors.value }),
      })
      if (!res.ok) throw new Error('บันทึกผู้สนับสนุนไม่สำเร็จ')
    } else if (activeSubTab.value === 'contacts') {
      const res = await adminFetch('/api/admin/settings/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: emergencyContacts.value }),
      })
      if (!res.ok) throw new Error('บันทึกเบอร์ติดต่อไม่สำเร็จ')
    } else {
      await fetchSettings()
    }
    isSavedToastVisible.value = true
    setTimeout(() => {
      isSavedToastVisible.value = false
    }, 2500)
  } catch (err: any) {
    alert(err?.message || 'เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
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
            <Settings class="h-4 w-4" />
          </span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            ตั้งค่าโครงการ ผู้สนับสนุน และ Audit Log (Settings & Audit)
          </h2>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          บริหารจัดการตราสัญลักษณ์ผู้สนับสนุน (R29), รายชื่อหน่วยงานฉุกเฉิน (R12) และบันทึกประวัติการตรวจสอบย้อนหลัง (R10)
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :class="primaryButtonClass"
          :disabled="saving"
          @click="handleSave"
        >
          <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
          <Save v-else class="h-3.5 w-3.5" />
          <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}</span>
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="isSavedToastVisible"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xl dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 transition-all"
    >
      <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>บันทึกการตั้งค่าระบบเรียบร้อย</span>
    </div>

    <!-- Sub-tabs Navigation Bar -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-[#2C2C2E] pb-2">
      <button
        type="button"
        class="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2"
        :class="[
          activeSubTab === 'sponsors'
            ? 'bg-[#0284C7] text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#252525] dark:hover:text-white'
        ]"
        @click="activeSubTab = 'sponsors'"
      >
        <Building2 class="h-3.5 w-3.5" />
        <span>ผู้สนับสนุนและแหล่งทุน (R29)</span>
      </button>

      <button
        type="button"
        class="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2"
        :class="[
          activeSubTab === 'contacts'
            ? 'bg-[#0284C7] text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#252525] dark:hover:text-white'
        ]"
        @click="activeSubTab = 'contacts'"
      >
        <Phone class="h-3.5 w-3.5" />
        <span>หน่วยงานฉุกเฉินและติดต่อ</span>
      </button>

      <button
        type="button"
        class="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2"
        :class="[
          activeSubTab === 'audit'
            ? 'bg-[#0284C7] text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#252525] dark:hover:text-white'
        ]"
        @click="activeSubTab = 'audit'"
      >
        <History class="h-3.5 w-3.5" />
        <span>บันทึกกิจกรรมย้อนหลัง (Audit Log)</span>
      </button>
    </div>

    <!-- TAB 1: Sponsors & Funding -->
    <div v-if="activeSubTab === 'sponsors'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="s in sponsors"
          :key="s.id"
          :class="adminCardClass"
          class="p-5 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 text-xs dark:bg-zinc-800 dark:text-zinc-200">
                {{ s.name.slice(0, 2) }}
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">{{ s.name }}</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ s.program }}</p>
              </div>
            </div>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="s.isActive" type="checkbox" class="h-4 w-4 rounded-sm text-[#0284C7] focus:ring-[#0284C7]" />
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">แสดงบนหน้าเว็บ</span>
            </label>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              ข้อความระบุเครดิต / แหล่งทุน:
            </label>
            <input
              v-model="s.creditText"
              type="text"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-[#0284C7] focus:bg-white dark:border-[#2C2C2E] dark:bg-[#161618] dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Emergency Contacts -->
    <div v-else-if="activeSubTab === 'contacts'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          เบอร์โทรศัพท์และหน่วยงานช่วยเหลือฉุกเฉินที่เผยแพร่บนหน้าต่างติดต่อ (R12)
        </p>
        <button
          type="button"
          :class="actionButtonClass"
          @click="addContactRow"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>เพิ่มเบอร์ติดต่อฉุกเฉิน</span>
        </button>
      </div>

      <div :class="adminCardClass" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-[#2C2C2E] dark:bg-[#141416]/50">
                <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">หน่วยงาน / องค์กร</th>
                <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">พื้นที่รับผิดชอบ</th>
                <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">เบอร์โทรติดต่อ</th>
                <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">ภารกิจหลักในภาวะวิกฤต</th>
                <th class="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
              <tr
                v-for="(c, cIdx) in emergencyContacts"
                :key="cIdx"
                class="hover:bg-slate-50/70 dark:hover:bg-[#252525]/40 transition-colors"
              >
                <td class="py-2.5 px-4">
                  <input
                    v-model="c.agency"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white"
                  />
                </td>
                <td class="py-2.5 px-4">
                  <input
                    v-model="c.community"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300"
                  />
                </td>
                <td class="py-2.5 px-4">
                  <input
                    v-model="c.phone"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#0284C7] outline-none focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-sky-400"
                  />
                </td>
                <td class="py-2.5 px-4">
                  <input
                    v-model="c.duty"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-slate-300"
                  />
                </td>
                <td class="py-2.5 px-4 text-center">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="ลบเบอร์นี้"
                    @click="removeContactRow(cIdx)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: Audit Log -->
    <div v-else-if="activeSubTab === 'audit'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          บันทึกกิจกรรมการตรวจสอบและแก้ไขข้อมูลย้อนหลัง เชื่อมต่อฐานข้อมูลสด (Live Audit Log)
        </p>
        <button
          type="button"
          :class="actionButtonClass"
          :disabled="loading"
          @click="fetchSettings"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          <span>รีเฟรชประวัติ</span>
        </button>
      </div>
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
                <td colspan="6" class="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <span v-if="loading">กำลังโหลดบันทึกกิจกรรม...</span>
                  <span v-else>ยังไม่มีประวัติกิจกรรมล่าสุดในระบบ</span>
                </td>
              </tr>
              <tr
                v-for="log in auditLogs"
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
      </div>
    </div>
  </div>
</template>
