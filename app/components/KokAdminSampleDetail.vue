<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Camera, ExternalLink, MapPin, ShieldCheck, X } from 'lucide-vue-next'
import { fetchAdminPhoto } from '../utils/admin-session'
import { formatThaiDate, type AdminSample } from '../utils/admin-types'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ sample: AdminSample }>()
defineEmits<{ (e: 'close'): void; (e: 'approve'): void }>()

// Private photos need the admin token, so they are fetched into object URLs. undefined = loading, null = failed.
const photoSrc = ref<Record<string, string | null>>({})
let closed = false
onMounted(async () => {
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
  for (const url of Object.values(photoSrc.value)) if (url) URL.revokeObjectURL(url)
})

const panel = 'rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]'
const tile = 'rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2C2C2E] dark:bg-[#141416]'
</script>

<template>
  <KokModalShell width-class="max-w-2xl" @close="$emit('close')">
    <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
      <div>
        <span class="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">รายละเอียดตัวอย่างน้ำ</span>
        <h3 class="text-base font-bold font-mono mt-1 text-slate-900 dark:text-white">{{ sample.sample_code }}</h3>
      </div>
      <button type="button" aria-label="ปิด" class="text-slate-400 hover:text-slate-600" @click="$emit('close')"><X class="h-5 w-5" /></button>
    </header>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div :class="tile">
        <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">ระดับสารหนู</span>
        <div class="mt-1 flex items-baseline gap-1.5">
          <span class="text-lg font-bold font-mono text-slate-900 dark:text-white">{{ sample.arsenic_ppb }}</span>
          <span class="text-xs text-slate-400">ppb</span>
        </div>
      </div>
      <div :class="tile">
        <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">สถานะการเผยแพร่</span>
        <div class="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">{{ sample.publication_status }}</div>
      </div>
      <div :class="tile">
        <span class="text-[11px] text-slate-500 dark:text-[#98A2A8]">แหล่งน้ำ</span>
        <div class="mt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">{{ sample.sample_nature?.water_source || 'แม่น้ำกก' }}</div>
      </div>
    </div>

    <div class="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-slate-800 dark:border-sky-900/40 dark:bg-[#00E5FF]/10 dark:text-sky-100 space-y-1.5">
      <div class="flex items-center gap-1.5 font-bold text-sky-800 dark:text-[#00E5FF]">
        <ShieldCheck class="h-4 w-4" />
        <span>ข้อมูลติดต่อผู้แจ้ง (เฉพาะผู้ดูแลระบบมองเห็น)</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-200">
        <div><strong>ชื่อ-นามสกุล:</strong> {{ sample.contact_name || '-' }}</div>
        <div><strong>เบอร์โทรศัพท์:</strong> {{ sample.contact_phone || '-' }}</div>
      </div>
    </div>

    <div :class="[panel, 'text-slate-700 dark:text-slate-200 space-y-2']">
      <div class="font-bold flex items-center gap-1.5">
        <MapPin class="h-4 w-4 text-sky-600" />
        <span>ตำแหน่งพิกัดภูมิศาสตร์</span>
      </div>
      <div class="font-mono text-xs">ละติจูด: {{ sample.latitude }}, ลองจิจูด: {{ sample.longitude }}</div>
      <a
        :href="`https://www.google.com/maps?q=${sample.latitude},${sample.longitude}`"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400 font-medium"
      >
        <span>เปิดดูบน Google Maps</span>
        <ExternalLink class="h-3.5 w-3.5" />
      </a>
    </div>

    <div v-if="sample.private_photo_paths?.length" :class="[panel, 'space-y-2']">
      <div class="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
        <Camera class="h-4 w-4 text-sky-600" />
        <span>ภาพถ่ายหลักฐานการเก็บตัวอย่าง ({{ sample.private_photo_paths.length }} ภาพ)</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div
          v-for="(path, index) in sample.private_photo_paths"
          :key="path"
          class="relative rounded-xl border border-slate-200 dark:border-[#2C2C2E] overflow-hidden bg-black/5 dark:bg-white/5 p-2 flex flex-col items-center justify-center"
        >
          <img v-if="photoSrc[path]" :src="photoSrc[path]!" :alt="`ภาพถ่ายที่ ${index + 1}`" class="w-full max-h-48 object-contain rounded-lg shadow-xs">
          <span v-else class="py-6 text-xs text-slate-400">{{ photoSrc[path] === null ? 'โหลดภาพไม่สำเร็จ' : 'กำลังโหลดภาพ…' }}</span>
          <span class="mt-1.5 text-[10px] text-slate-400 font-mono">{{ path }}</span>
        </div>
      </div>
    </div>

    <div v-if="sample.review_reason" :class="panel">
      <div class="font-bold text-slate-800 dark:text-slate-200 mb-1">บันทึกการพิจารณา (Review Reason)</div>
      <p class="text-slate-600 dark:text-[#98A2A8]">{{ sample.review_reason }}</p>
      <div v-if="sample.reviewed_at" class="text-[10px] text-slate-400 mt-1">
        พิจารณาเมื่อ: {{ formatThaiDate(sample.reviewed_at) }}<template v-if="sample.reviewed_by"> · โดย {{ sample.reviewed_by }}</template>
      </div>
    </div>

    <footer class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#2C2C2E]">
      <button type="button" class="wv-btn-secondary" @click="$emit('close')">ปิด</button>
      <button
        v-if="sample.publication_status === 'pending_review'"
        type="button"
        class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        @click="$emit('approve')"
      >
        อนุมัติเผยแพร่
      </button>
    </footer>
  </KokModalShell>
</template>
