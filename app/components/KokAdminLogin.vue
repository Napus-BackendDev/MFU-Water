<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-vue-next'

const passcode = defineModel<string>('passcode', { required: true })
const reviewer = defineModel<string>('reviewer', { required: true })
defineProps<{ verifying: boolean; error: string | null }>()
defineEmits<{ (e: 'submit'): void; (e: 'cancel'): void }>()

const show = ref(false)
const input = ref<HTMLInputElement | null>(null)
onMounted(() => input.value?.focus())

const field = 'wv-input border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white'
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-200'
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center">
    <div class="wv-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="text-center space-y-3">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 shadow-inner">
          <KeyRound class="h-7 w-7" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">เข้าสู่ระบบผู้ดูแลระบบ (Admin Access)</h2>
          <p class="text-xs text-slate-500 dark:text-[#98A2A8] mt-1">
            โปรดกรอกรหัสผ่านผู้ดูแลระบบ (Passcode) เพื่อปลดล็อกเข้าสู่หน้า Data Table ตรวจสอบผลตรวจเกิน 50 ppb และฐานข้อมูลตัวอย่างน้ำ
          </p>
        </div>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="$emit('submit')">
        <div>
          <label :class="label" for="admin-passcode">รหัสผ่านผู้ดูแลระบบ (Passcode) <span class="text-rose-600">*</span></label>
          <div class="relative mt-1.5">
            <input id="admin-passcode" ref="input" v-model="passcode" :type="show ? 'text' : 'password'" placeholder="ระบุรหัสผ่านแอดมิน..." :class="[field, 'pr-10']" :disabled="verifying">
            <button
              type="button"
              aria-label="เปิด/ปิดการแสดงรหัสผ่าน"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
              @click="show = !show"
            >
              <EyeOff v-if="show" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <label :class="label" for="admin-reviewer">ชื่อผู้ตรวจ (บันทึกพร้อมการอนุมัติ)</label>
          <input id="admin-reviewer" v-model="reviewer" type="text" maxlength="80" autocomplete="name" placeholder="เช่น ชื่อ-นามสกุลของผู้ตรวจ" :class="[field, 'mt-1.5']" :disabled="verifying">
        </div>

        <p v-if="error" role="alert" class="wv-alert-box text-xs font-medium">{{ error }}</p>

        <button
          type="submit"
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition"
          :disabled="verifying || !passcode.trim()"
        >
          <Lock class="h-4 w-4" />
          <span>{{ verifying ? 'กำลังตรวจสอบรหัสผ่าน…' : 'เข้าสู่ระบบ (ปลดล็อก Data Table)' }}</span>
        </button>

        <div class="pt-2 text-center">
          <button type="button" class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white underline" @click="$emit('cancel')">
            ← ยกเลิกและกลับสู่หน้าแผนที่สาธารณะ
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
