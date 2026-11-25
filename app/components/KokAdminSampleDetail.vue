<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, ImageOff, Pencil, Phone, ShieldCheck, Trash2, User, X } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass } from '../utils/admin-ui'
import { fetchAdminPhoto } from '../utils/admin-session'
import { formatPpb } from '../../src/lib/survey'
import { formatThaiDate, getArsenicMeta, type AdminSample, type Decision } from '../utils/admin-types'
import KokStatusBadge from './KokStatusBadge.vue'

const props = defineProps<{ sample: AdminSample; saving: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'decide', decision: Decision): void; (e: 'edit'): void; (e: 'delete'): void }>()

const closeButton = ref<HTMLButtonElement | null>(null)
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') emit('close') }

// Private photos need the admin token, so they are fetched into object URLs. undefined = loading, null = failed.
const photoSrc = ref<Record<string, string | null>>({})
let closed = false
onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  closeButton.value?.focus()
  for (const path of props.sample.private_photo_paths ?? []) {
    const url = await fetchAdminPhoto(path)
    if (closed) {
      if (url) URL.revokeObjectURL(url)
      return
    }
    photoSrc.value = { ...photoSrc.value, [path]: url }
  }
})
onBeforeUnmount(() => {
  closed = true
  window.removeEventListener('keydown', onKeydown)
  for (const url of Object.values(photoSrc.value)) if (url) URL.revokeObjectURL(url)
})

const term = 'text-[11px] text-slate-500 dark:text-[#98A2A8]'
const value = 'mt-0.5 text-[13px] font-semibold text-slate-900 dark:text-white'

const photoSlots = [
  { index: 0, badge: 'ภาพที่ 1', label: 'เครื่องมือการเทสต์น้ำ' },
  { index: 1, badge: 'ภาพที่ 2', label: 'ภาพสถานที่เก็บตัวอย่าง' },
] as const
</script>

<template>
  <section
    :class="adminCardClass"
    class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl"
    aria-label="รายละเอียดตัวอย่าง"
  >
    <!-- Header -->
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-[#2C2C2E]">
      <div class="flex min-w-0 flex-wrap items-center gap-2.5">
        <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">รายละเอียดตัวอย่างน้ำ</h2>
      </div>
      <div class="flex shrink-0 items-center gap-2.5">
        <KokStatusBadge :status="sample.publication_status" />
        <button
          ref="closeButton"
          type="button"
          aria-label="ปิดรายละเอียด"
          class="cursor-pointer rounded-xl border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-[#2C2C2E] dark:hover:bg-[#252525] dark:hover:text-white"
          @click="$emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Scrollable Vertical Body -->
    <div class="space-y-4 overflow-y-auto p-5 sm:p-6">
      <!-- Row 1: Photo 1 (Left) | Photo 2 (Right) -->
      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div
          v-for="slot in photoSlots"
          :key="slot.index"
          class="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#2C2C2E] dark:bg-[#141416]"
        >
          <div class="mb-2 flex items-center gap-2">
            <span class="rounded-md bg-[#0284C7]/10 px-2 py-0.5 text-[11px] font-bold text-[#0284C7] dark:bg-sky-950/70 dark:text-sky-300">
              {{ slot.badge }}
            </span>
            <span class="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
              {{ slot.label }}
            </span>
          </div>
          <figure
            v-if="sample.private_photo_paths?.[slot.index]"
            class="relative flex h-44 items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-white sm:h-48 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]"
          >
            <img
              v-if="photoSrc[sample.private_photo_paths[slot.index]!]"
              :src="photoSrc[sample.private_photo_paths[slot.index]!]!"
              :alt="`${slot.badge} · ${slot.label}`"
              class="h-full w-full object-cover"
            >
            <span v-else class="text-xs text-slate-500">
              {{ photoSrc[sample.private_photo_paths[slot.index]!] === null ? 'โหลดภาพไม่สำเร็จ' : 'กำลังโหลดภาพ…' }}
            </span>
          </figure>
          <div
            v-else
            class="flex h-44 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400 sm:h-48 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-[#98A2A8]"
          >
            <ImageOff class="h-5 w-5" />
            <span>ไม่ได้แนบภาพนี้</span>
          </div>
        </div>
      </div>

      <!-- Row 2: Sample Metadata Box (Arsenic, Test Kit, Collection Time, Coordinates) -->
      <dl class="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-4 dark:border-[#2C2C2E] dark:bg-[#141416]">
        <div>
          <dt :class="term">ระดับสารหนู</dt>
          <dd class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
            <span
              class="h-3 w-3 shrink-0 rounded-full border border-black/20"
              :style="{ backgroundColor: getArsenicMeta(sample.arsenic_ppb).hex }"
            />
            <span class="font-mono tabular-nums">{{ formatPpb(sample.arsenic_ppb, true) }}</span>
          </dd>
        </div>
        <div>
          <dt :class="term">ชุดตรวจ</dt>
          <dd :class="value">{{ sample.sample_nature?.test_kit || 'Oxfam' }}</dd>
        </div>
        <div>
          <dt :class="term">เวลาเก็บ</dt>
          <dd :class="value">{{ formatThaiDate(sample.collection_time || sample.created_at || '') }}</dd>
        </div>
        <div>
          <dt :class="term">พิกัด</dt>
          <dd :class="value">
            <a
              :href="`https://www.google.com/maps?q=${sample.latitude},${sample.longitude}`"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 font-mono text-xs text-[#0369A1] hover:underline dark:text-sky-400"
            >
              {{ sample.latitude.toFixed(4) }}, {{ sample.longitude.toFixed(4) }}
              <ExternalLink class="h-3 w-3 shrink-0" />
            </a>
          </dd>
        </div>
      </dl>

      <!-- Row 3: Reporter Contact Box -->
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]/50">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <ShieldCheck class="h-4 w-4 text-[#0284C7]" />
            <span>ติดต่อผู้รายงาน (เฉพาะแอดมิน)</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div class="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <User class="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{{ sample.contact_name || 'ไม่ระบุชื่อ' }}</span>
            </div>
            <div v-if="sample.contact_phone" class="flex items-center gap-1.5">
              <Phone class="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a :href="`tel:${sample.contact_phone}`" class="font-mono font-semibold text-[#0369A1] hover:underline dark:text-sky-400">
                {{ sample.contact_phone }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Optional Review / Edit Audit Note -->
      <div v-if="sample.review_reason || sample.edited_at" class="space-y-1 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]/40">
        <template v-if="sample.review_reason">
          <div class="font-semibold text-slate-700 dark:text-slate-200">บันทึกการตรวจ: <span class="font-normal text-slate-600 dark:text-[#98A2A8]">{{ sample.review_reason }}</span></div>
          <p v-if="sample.reviewed_at" class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
            {{ formatThaiDate(sample.reviewed_at) }}<template v-if="sample.reviewed_by"> · โดย {{ sample.reviewed_by }}</template>
          </p>
        </template>
        <p v-if="sample.edited_at" class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
          แก้ไขล่าสุด {{ formatThaiDate(sample.edited_at) }}<template v-if="sample.edited_by"> · โดย {{ sample.edited_by }}</template>
        </p>
      </div>
    </div>

    <!-- Footer Modal Actions -->
    <footer class="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:px-6 dark:border-[#2C2C2E] dark:bg-[#141416]/80">
      <div class="flex items-center gap-2">
        <button type="button" :class="actionButtonClass" :disabled="saving" @click="$emit('edit')">
          <Pencil class="h-3.5 w-3.5" /> แก้ไขข้อมูล
        </button>
        <button type="button" :class="actionButtonClass" class="border-rose-300! text-rose-700! hover:bg-rose-50! dark:border-rose-900! dark:text-rose-300! dark:hover:bg-rose-950/40!" :disabled="saving" @click="$emit('delete')">
          <Trash2 class="h-3.5 w-3.5" /> ลบข้อมูล
        </button>
      </div>

      <div v-if="sample.publication_status === 'pending_review'" class="flex items-center gap-2">
        <button type="button" class="cursor-pointer rounded-xl border border-[#DC2626] bg-white px-4 py-2 text-xs font-bold text-[#DC2626] transition hover:bg-rose-50 disabled:opacity-50 dark:bg-transparent dark:text-[#FF453A] dark:hover:bg-rose-950/40" :disabled="saving" @click="$emit('decide', 'reject')">
          ปฏิเสธ
        </button>
        <button type="button" class="cursor-pointer rounded-xl bg-[#16A34A] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#15803D] disabled:opacity-50" :disabled="saving" @click="$emit('decide', 'approve')">
          อนุมัติ
        </button>
      </div>
    </footer>
  </section>
</template>
