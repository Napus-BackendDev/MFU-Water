<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, ImageOff, Pencil, Phone, ShieldCheck, Trash2, User, X } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass } from '../utils/admin-ui'
import { fetchAdminPhoto } from '../utils/admin-session'
import { formatThaiDate, type AdminSample, type Decision } from '../utils/admin-types'
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
  // Below xl this panel is a dialog over the table.
  if (!window.matchMedia('(min-width: 1280px)').matches) closeButton.value?.focus()
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
</script>

<template>
  <section
    :class="adminCardClass"
    class="max-h-[85vh] w-full space-y-4 overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-b-2xl xl:max-h-[calc(100vh-7rem)] xl:max-w-none"
    aria-label="รายละเอียดตัวอย่าง"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-[15px] font-bold text-slate-900 dark:text-white">รายละเอียดตัวอย่าง</h2>
        <p class="mt-0.5 font-mono text-xs text-slate-500 dark:text-[#98A2A8]">{{ sample.sample_code }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <KokStatusBadge :status="sample.publication_status" />
        <button ref="closeButton" type="button" aria-label="ปิดรายละเอียด" class="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-[#252525] dark:hover:text-white" @click="$emit('close')">
          <X class="h-4 w-4" />
        </button>
      </div>
    </header>

    <template v-if="sample.private_photo_paths?.length">
      <figure
        v-for="(path, index) in sample.private_photo_paths"
        :key="path"
        class="flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-[#141416]"
      >
        <img v-if="photoSrc[path]" :src="photoSrc[path]!" :alt="`ภาพถ่ายตัวอย่างที่ ${index + 1}`" class="max-h-64 w-full object-contain">
        <span v-else class="text-xs text-slate-500">{{ photoSrc[path] === null ? 'โหลดภาพไม่สำเร็จ' : 'กำลังโหลดภาพ…' }}</span>
      </figure>
    </template>
    <div v-else class="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs text-slate-500 dark:bg-[#141416] dark:text-[#98A2A8]">
      <ImageOff class="h-5 w-5" />
      <span>ไม่มีภาพถ่ายตัวอย่าง</span>
    </div>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <dt :class="term">ระดับสารหนู</dt>
        <dd :class="value"><span class="font-mono tabular-nums">{{ sample.arsenic_ppb }}</span> ppb</dd>
      </div>
      <div>
        <dt :class="term">แหล่งน้ำ</dt>
        <dd :class="value">{{ sample.sample_nature?.water_source || 'แม่น้ำกก' }}</dd>
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

    <div class="space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-[#2C2C2E]">
      <div class="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
        <ShieldCheck class="h-3.5 w-3.5 text-[#0284C7]" />
        <span>ติดต่อผู้รายงาน (เฉพาะแอดมิน)</span>
      </div>
      <div class="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
        <User class="h-3.5 w-3.5 text-slate-500" />
        <span>{{ sample.contact_name || 'ไม่ระบุชื่อ' }}</span>
      </div>
      <div v-if="sample.contact_phone" class="flex items-center gap-1.5">
        <Phone class="h-3.5 w-3.5 text-slate-500" />
        <a :href="`tel:${sample.contact_phone}`" class="font-mono text-[#0369A1] hover:underline dark:text-sky-400">{{ sample.contact_phone }}</a>
      </div>
    </div>

    <div v-if="sample.review_reason" class="border-t border-slate-100 pt-3 text-xs dark:border-[#2C2C2E]">
      <div class="font-semibold text-slate-700 dark:text-slate-200">บันทึกการตรวจ</div>
      <p class="mt-1 text-slate-600 dark:text-[#98A2A8]">{{ sample.review_reason }}</p>
      <p v-if="sample.reviewed_at" class="mt-1 text-[11px] text-slate-500 dark:text-[#98A2A8]">
        {{ formatThaiDate(sample.reviewed_at) }}<template v-if="sample.reviewed_by"> · โดย {{ sample.reviewed_by }}</template>
      </p>
    </div>

    <p v-if="sample.edited_at" class="text-[11px] text-slate-500 dark:text-[#98A2A8]">
      แก้ไขล่าสุด {{ formatThaiDate(sample.edited_at) }}<template v-if="sample.edited_by"> · โดย {{ sample.edited_by }}</template>
    </p>

    <div v-if="sample.publication_status === 'pending_review'" class="grid grid-cols-2 gap-2.5">
      <button type="button" class="cursor-pointer rounded-xl bg-[#16A34A] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#15803D] disabled:opacity-50" :disabled="saving" @click="$emit('decide', 'approve')">อนุมัติ</button>
      <button type="button" class="cursor-pointer rounded-xl border border-[#DC2626] bg-transparent py-2.5 text-[13px] font-bold text-[#DC2626] transition hover:bg-rose-50 disabled:opacity-50 dark:text-[#FF453A] dark:hover:bg-rose-950/40" :disabled="saving" @click="$emit('decide', 'reject')">ปฏิเสธ</button>
    </div>

    <div class="grid grid-cols-2 gap-2.5">
      <button type="button" :class="actionButtonClass" :disabled="saving" @click="$emit('edit')">
        <Pencil class="h-3.5 w-3.5" /> แก้ไขข้อมูล
      </button>
      <button type="button" :class="actionButtonClass" class="border-rose-300! text-rose-700! hover:bg-rose-50! dark:border-rose-900! dark:text-rose-300! dark:hover:bg-rose-950/40!" :disabled="saving" @click="$emit('delete')">
        <Trash2 class="h-3.5 w-3.5" /> ลบข้อมูล
      </button>
    </div>
  </section>
</template>
