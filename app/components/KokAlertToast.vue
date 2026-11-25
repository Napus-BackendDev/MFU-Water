<script setup lang="ts">
import { watch } from 'vue'
import { AlertTriangle, CheckCircle2, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  feedback: { type: 'success' | 'error'; message: string } | null
  autoHideMs?: number
}>(), {
  autoHideMs: 5000,
})

const emit = defineEmits<{ (e: 'close'): void }>()

let timer: ReturnType<typeof setTimeout> | null = null
watch(() => props.feedback, (val) => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (val && props.autoHideMs > 0) {
    timer = setTimeout(() => emit('close'), props.autoHideMs)
  }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="feedback"
        role="alert"
        aria-live="polite"
        class="fixed right-4 bottom-16 sm:bottom-5 z-[1200] flex w-[calc(100vw-2rem)] max-w-sm items-start justify-between gap-3 rounded-2xl border border-l-4 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md sm:w-auto sm:min-w-[320px] dark:bg-[#1E1E1E]/95"
        :class="feedback.type === 'success'
          ? 'border-slate-200 border-l-emerald-500 text-slate-900 dark:border-[#2C2C2E] dark:border-l-emerald-400 dark:text-white'
          : 'border-slate-200 border-l-rose-500 text-slate-900 dark:border-[#2C2C2E] dark:border-l-rose-400 dark:text-white'"
      >
        <div class="flex min-w-0 items-start gap-2.5">
          <div
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
            :class="feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'"
          >
            <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4" />
            <AlertTriangle v-else class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <p
              class="text-[11px] font-bold uppercase tracking-wider"
              :class="feedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'"
            >
              {{ feedback.type === 'success' ? 'แจ้งเตือนระบบ' : 'แจ้งเตือนข้อผิดพลาด' }}
            </p>
            <p class="mt-0.5 text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100">
              {{ feedback.message }}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="ปิดข้อความ"
          class="shrink-0 cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#2A2A2D] dark:hover:text-white"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
