<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle2, X, XCircle } from 'lucide-vue-next'
import type { AdminSample, Decision } from '../utils/admin-types'
import KokModalShell from './KokModalShell.vue'

const props = defineProps<{ sample: AdminSample; decision: Decision; saving: boolean }>()
defineEmits<{ (e: 'confirm', reason: string): void; (e: 'close'): void }>()

const approve = props.decision === 'approve'
const reason = ref(approve ? 'ตรวจสอบแล้ว ข้อมูลถูกต้องและสอดคล้องกับพื้นที่' : 'ข้อมูลไม่สอดคล้อง หรือพิกัดไม่ชัดเจน')
</script>

<template>
  <KokModalShell @close="$emit('close')">
    <header class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl" :class="approve ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'">
          <CheckCircle2 v-if="approve" class="h-5 w-5" />
          <XCircle v-else class="h-5 w-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold">{{ approve ? 'ยืนยันอนุมัติผลตรวจ' : 'ยืนยันปฏิเสธผลตรวจ' }}</h3>
          <p class="text-[11px] text-slate-500 font-mono">รหัส: {{ sample.sample_code }} (ค่าสารหนู {{ sample.arsenic_ppb }} ppb)</p>
        </div>
      </div>
      <button type="button" aria-label="ปิด" class="text-slate-400 hover:text-slate-600" @click="$emit('close')"><X class="h-4 w-4" /></button>
    </header>

    <div>
      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300" for="review-reason">
        หมายเหตุหรือเหตุผลประกอบการพิจารณา (จะบันทึกใน Audit Log)
      </label>
      <textarea id="review-reason" v-model="reason" rows="3" maxlength="500" placeholder="ระบุเหตุผล..." class="wv-input mt-1.5 border-slate-300 bg-white text-slate-900 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white" />
    </div>

    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8]">
      <span v-if="approve">💡 เมื่ออนุมัติแล้ว ระบบจะเปลี่ยนสถานะเป็น <strong class="text-emerald-600">approved</strong> และนำผลตรวจนี้แสดงบนแผนที่สาธารณะทันที</span>
      <span v-else>⚠️ เมื่อปฏิเสธ รายการนี้จะไม่ถูกนำไปแสดงบนแผนที่สาธารณะ แต่จะคงบันทึกไว้ในฐานข้อมูลสำหรับการตรวจสอบภายใน</span>
    </div>

    <footer class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#2C2C2E]">
      <button type="button" class="wv-btn-secondary" @click="$emit('close')">ยกเลิก</button>
      <button
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
        :class="approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'"
        :disabled="saving"
        @click="$emit('confirm', reason)"
      >
        {{ saving ? 'กำลังบันทึก…' : approve ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ' }}
      </button>
    </footer>
  </KokModalShell>
</template>
