<script setup lang="ts">
import { Camera } from 'lucide-vue-next'
import type { SurveyPhoto } from '../../src/lib/survey'

defineProps<{
  photos: [SurveyPhoto, SurveyPhoto]
  previews: [string | null, string | null]
  errors: [string | null, string | null]
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'select', slot: 0 | 1, input: HTMLInputElement): void; (e: 'remove', slot: 0 | 1): void }>()

const onChange = (slot: 0 | 1, event: Event) => emit('select', slot, event.target as HTMLInputElement)
</script>

<template>
  <fieldset :disabled="disabled" class="space-y-2">
    <legend class="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-white">
      <Camera class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
      <span>แนบรูปถ่ายการเก็บตัวอย่าง (สูงสุด 2 ภาพ เก็บเป็นความลับ)</span>
    </legend>
    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <div
        v-for="slot in ([0, 1] as const)"
        :key="slot"
        class="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2C2C2E] dark:bg-[#141416] flex flex-col justify-between gap-1.5"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-800 dark:text-white">ภาพที่ {{ slot + 1 }}</span>
          <span v-if="photos[slot]" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">แนบไฟล์แล้ว</span>
        </div>

        <div v-if="previews[slot]" class="relative my-1 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
          <img :src="previews[slot]!" :alt="`ตัวอย่างภาพที่ ${slot + 1}`" class="h-14 w-14 shrink-0 rounded-md object-cover border border-slate-200 dark:border-[#2C2C2E]">
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{{ photos[slot]?.name }}</p>
            <p class="text-[10px] text-slate-500 dark:text-[#98A2A8]">{{ photos[slot] ? (photos[slot]!.size / 1024).toFixed(1) + ' KB' : '' }}</p>
          </div>
        </div>

        <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-600 hover:border-sky-500 hover:bg-sky-50/50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8] dark:hover:border-[#00E5FF] dark:hover:text-white transition">
          <input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="`เลือกภาพที่ ${slot + 1}`" class="sr-only" @change="onChange(slot, $event)">
          <Camera class="h-4 w-4 shrink-0 text-sky-600 dark:text-[#00E5FF]" />
          <span class="truncate">{{ photos[slot] ? 'เปลี่ยนภาพใหม่' : 'คลิกเพื่อเลือกภาพ (JPG, PNG, WebP <= 10MB)' }}</span>
        </label>
        <button v-if="photos[slot]" type="button" :aria-label="`ลบภาพที่ ${slot + 1}`" class="self-start text-xs text-rose-600 dark:text-[#FF453A] underline" @click="emit('remove', slot)">
          ลบภาพนี้
        </button>
        <p v-if="errors[slot]" role="alert" class="text-xs text-rose-600 dark:text-[#FF453A]">{{ errors[slot] }}</p>
      </div>
    </div>
  </fieldset>
</template>
