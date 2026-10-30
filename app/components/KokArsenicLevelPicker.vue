<script setup lang="ts">
import { computed } from 'vue'
import { contractData } from '../utils/kok-contract'

const level = defineModel<number | null>({ required: true })
defineProps<{ disabled?: boolean }>()

const levels = contractData.levels
const selected = computed(() => levels.find((item) => item.ppb === level.value) ?? null)
</script>

<template>
  <fieldset :disabled="disabled" class="space-y-2">
    <legend class="text-xs font-semibold text-slate-800 dark:text-white">
      โปรดเลือกสีที่ตรงกับผลตรวจของท่าน (Arsenic Level 9 ระดับ) <span class="text-rose-600 dark:text-[#FF453A]">*ต้องระบุ</span>
    </legend>
    <div role="radiogroup" aria-label="ระดับสารหนู (As) หน่วย ppb" class="grid grid-cols-3 gap-2 sm:grid-cols-9">
      <button
        v-for="(item, index) in levels"
        :key="item.ppb"
        type="button"
        role="radio"
        :aria-checked="level === item.ppb"
        :aria-label="`${index + 1}: ${item.ppb} ppb`"
        class="flex flex-col items-center justify-between rounded-xl border p-1.5 text-center transition"
        :class="level === item.ppb
          ? 'border-2 border-sky-600 bg-sky-50 shadow-sm dark:border-[#00E5FF] dark:bg-[#252525]'
          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:bg-[#252525]'"
        @click="level = item.ppb"
      >
        <span class="wv-mono text-[11px] text-slate-400 dark:text-[#98A2A8]">#{{ index + 1 }}</span>
        <span class="my-1 block h-5.5 w-full rounded-md border shadow-inner" :style="{ backgroundColor: item.color || item.hex, borderColor: item.borderColor || 'rgba(0,0,0,0.2)' }" />
        <span class="wv-mono text-xs font-bold text-slate-900 dark:text-white">{{ item.ppb }} ppb</span>
      </button>
    </div>

    <div v-if="selected" class="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="font-semibold text-slate-800 dark:text-white">
          ผลที่เลือก: <strong class="wv-mono text-sky-700 dark:text-[#00E5FF]">{{ selected.ppb }} ppb</strong>
          ({{ selected.status === 'auto_published' ? 'เผยแพร่อัตโนมัติ <= 50 ppb' : 'เข้าคิวรอแอดมินตรวจ > 50 ppb' }})
        </span>
        <span
          class="rounded-md px-2 py-0.5 font-semibold"
          :class="selected.ppb > 50 ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-[#3A1C1C] dark:text-[#FF453A]' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-[#32D74B]/20 dark:text-[#32D74B]'"
        >
          {{ selected.action }}
        </span>
      </div>
      <p class="mt-0.5 text-slate-500 dark:text-[#98A2A8]">
        หมายเหตุ: หากค่าเกิน 50 ppb จะต้องรอผู้ดูแลระบบตรวจสอบก่อนแสดงบนแผนที่ (เกณฑ์มาตรฐานน้ำผิวดิน กรมควบคุมมลพิษ คือ 10 ppb)
      </p>
    </div>
  </fieldset>
</template>
