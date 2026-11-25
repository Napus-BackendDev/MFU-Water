<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Sparkles, User } from 'lucide-vue-next'
import type { AdminRole } from '../../src/lib/admin-rbac'

const mode = defineModel<'user' | 'passcode'>('mode', { default: 'user' })
const username = defineModel<string>('username', { default: '' })
const password = defineModel<string>('password', { default: '' })
const passcode = defineModel<string>('passcode', { required: true })
const reviewer = defineModel<string>('reviewer', { required: true })
defineProps<{
  verifying: boolean
  error: string | null
  devBypass?: boolean
  devRoles?: AdminRole[]
  googleOauthEnabled?: boolean
}>()
defineEmits<{
  (e: 'submit'): void
  (e: 'cancel'): void
  (e: 'devLogin', roleId: string, communities: string[]): void
  (e: 'oauthLogin'): void
}>()

const showPassword = ref(false)
const showPasscode = ref(false)
const userInput = ref<HTMLInputElement | null>(null)
onMounted(() => userInput.value?.focus())

const field = 'wv-input border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white'
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-200'
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center p-4">
    <div class="wv-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
      <div class="text-center space-y-3">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50 shadow-inner">
          <ShieldCheck class="h-7 w-7" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">เข้าสู่ระบบหลังบ้าน (Admin Access)</h2>
          <p class="text-xs text-slate-500 dark:text-[#98A2A8] mt-1">
            ระบบจัดการสิทธิ์ตามบทบาทและพื้นที่ชุมชน — กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ หรือใช้รหัสผ่านฉุกเฉิน
          </p>
        </div>
      </div>

      <!-- Google OAuth Login (Localhost / Developer) -->
      <div v-if="googleOauthEnabled" class="mt-5">
        <button
          type="button"
          :disabled="verifying"
          class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-sky-400 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-white dark:hover:border-sky-700 cursor-pointer disabled:opacity-50"
          @click="$emit('oauthLogin')"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
          </svg>
          <span>เข้าสู่ระบบด้วย Google (OAuth)</span>
        </button>
      </div>

      <!-- Localhost Dev Quick Role Login -->
      <div
        v-if="devBypass && devRoles?.length"
        class="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-3 dark:border-amber-900/50 dark:bg-amber-950/20"
      >
        <div class="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
          <Sparkles class="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>เลือกบทบาทเข้าสู่ระบบ (Localhost)</span>
        </div>

        <div class="grid grid-cols-1 gap-2">
          <button
            v-for="r in devRoles"
            :key="r.id"
            type="button"
            :disabled="verifying"
            class="group flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white px-3.5 py-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50/40 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:border-sky-700 cursor-pointer disabled:opacity-50"
            @click="$emit('devLogin', r.id, ['all'])"
          >
            <div class="min-w-0">
              <div class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ r.name }}</div>
              <div class="text-[11px] text-slate-500 dark:text-[#98A2A8] line-clamp-1">{{ r.description || r.id }}</div>
            </div>
            <ArrowRight class="h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
          </button>
        </div>
      </div>

      <div v-if="devBypass && devRoles?.length" class="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
        <div class="h-px flex-1 bg-slate-200 dark:bg-[#2C2C2E]"></div>
        <span>หรือเข้าสู่ระบบด้วยบัญชี / รหัสผ่าน</span>
        <div class="h-px flex-1 bg-slate-200 dark:bg-[#2C2C2E]"></div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-[#141416]">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer"
          :class="mode === 'user' ? 'bg-white text-sky-700 shadow-sm dark:bg-[#252525] dark:text-sky-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          @click="mode = 'user'"
        >
          <User class="h-3.5 w-3.5" />
          บัญชีผู้ใช้งาน
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer"
          :class="mode === 'passcode' ? 'bg-white text-rose-700 shadow-sm dark:bg-[#252525] dark:text-rose-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          @click="mode = 'passcode'"
        >
          <KeyRound class="h-3.5 w-3.5" />
          รหัสผ่านฉุกเฉิน
        </button>
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="$emit('submit')">
        <template v-if="mode === 'user'">
          <div>
            <label :class="label" for="admin-username">ชื่อผู้ใช้ (Username) <span class="text-rose-600">*</span></label>
            <input
              id="admin-username"
              ref="userInput"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="เช่น researcher01"
              :class="[field, 'mt-1.5']"
              :disabled="verifying"
            >
          </div>

          <div>
            <label :class="label" for="admin-password">รหัสผ่าน (Password) <span class="text-rose-600">*</span></label>
            <div class="relative mt-1.5">
              <input
                id="admin-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="ระบุรหัสผ่าน..."
                :class="[field, 'pr-10']"
                :disabled="verifying"
              >
              <button
                type="button"
                aria-label="เปิด/ปิดการแสดงรหัสผ่าน"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div>
            <label :class="label" for="admin-passcode">รหัสผ่านผู้ดูแลระบบสูงสุด (Passcode) <span class="text-rose-600">*</span></label>
            <div class="relative mt-1.5">
              <input
                id="admin-passcode"
                v-model="passcode"
                :type="showPasscode ? 'text' : 'password'"
                placeholder="ระบุรหัสผ่านแอดมิน..."
                :class="[field, 'pr-10']"
                :disabled="verifying"
              >
              <button
                type="button"
                aria-label="เปิด/ปิดการแสดงรหัสผ่าน"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white"
                @click="showPasscode = !showPasscode"
              >
                <EyeOff v-if="showPasscode" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label :class="label" for="admin-reviewer">ชื่อผู้ตรวจ (บันทึกพร้อมการอนุมัติ)</label>
            <input id="admin-reviewer" v-model="reviewer" type="text" maxlength="80" autocomplete="name" placeholder="เช่น ชื่อ-นามสกุลของผู้ตรวจ" :class="[field, 'mt-1.5']" :disabled="verifying">
          </div>
        </template>

        <p v-if="error" role="alert" class="wv-alert-box text-xs font-medium">{{ error }}</p>

        <button
          type="submit"
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer"
          :disabled="verifying || (mode === 'user' ? (!username.trim() || !password) : !passcode.trim())"
        >
          <Lock class="h-4 w-4" />
          <span>{{ verifying ? 'กำลังตรวจสอบสิทธิ์…' : 'เข้าสู่ระบบหลังบ้าน' }}</span>
        </button>

        <div class="pt-2 text-center">
          <button type="button" class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white underline cursor-pointer" @click="$emit('cancel')">
            ← ยกเลิกและกลับสู่หน้าแผนที่สาธารณะ
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
