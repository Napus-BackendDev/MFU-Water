<script setup lang="ts">
import { Crosshair, MapPin } from 'lucide-vue-next'

const lat = defineModel<string>('lat', { required: true })
const lon = defineModel<string>('lon', { required: true })
defineProps<{ accuracy: number | null; state: 'idle' | 'loading' | 'error'; disabled?: boolean }>()
defineEmits<{ (e: 'capture'): void; (e: 'edit'): void }>()

const input = 'wv-input wv-mono mt-0.5 border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white'
</script>

<template>
  <fieldset :disabled="disabled" class="space-y-2">
    <legend class="text-xs font-semibold text-slate-800 dark:text-white">
      ระบุพิกัดที่ตั้ง (Location) <span class="text-rose-600 dark:text-[#FF453A]">*ต้องระบุพิกัดที่ตั้ง</span>
    </legend>
    <button
      type="button"
      class="wv-btn-secondary w-full justify-center border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white transition py-1.5"
      :disabled="state === 'loading'"
      @click="$emit('capture')"
    >
      <MapPin class="h-4 w-4 text-sky-600 dark:text-[#00E5FF]" />
      <span>{{ state === 'loading' ? 'กำลังค้นหาตำแหน่ง…' : 'กดปุ่มเพื่อพิกัด GPS ปัจจุบัน' }}</span>
      <Crosshair class="h-4 w-4 text-emerald-600 dark:text-[#32D74B]" />
    </button>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <label class="block text-xs font-semibold text-slate-700 dark:text-[#98A2A8]">
        ละติจูด
        <input v-model="lat" aria-label="ละติจูด" type="number" step="any" placeholder="ยังไม่ทราบ" :class="input" @input="$emit('edit')">
      </label>
      <label class="block text-xs font-semibold text-slate-700 dark:text-[#98A2A8]">
        ลองจิจูด
        <input v-model="lon" aria-label="ลองจิจูด" type="number" step="any" placeholder="ยังไม่ทราบ" :class="input" @input="$emit('edit')">
      </label>
    </div>
    <p v-if="accuracy !== null" class="text-xs text-emerald-600 dark:text-[#32D74B]">ความแม่นยำ GPS ประมาณ {{ accuracy }} เมตร</p>
  </fieldset>
</template>
