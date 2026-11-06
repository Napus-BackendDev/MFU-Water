<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// Dimmed overlay + dialog card. Clicking the backdrop or pressing Escape emits "close".
withDefaults(defineProps<{ widthClass?: string; overlayClass?: string; spaced?: boolean }>(), {
  widthClass: 'max-w-lg',
  overlayClass: 'z-50 p-4',
  spaced: true,
})
const emit = defineEmits<{ (e: 'close'): void }>()

// Only the dialog opened last answers Escape, so a dialog over another closes alone.
const openShells: symbol[] = (globalThis as { __kokOpenShells?: symbol[] }).__kokOpenShells ??= []
const id = Symbol('modal')
const card = ref<HTMLElement | null>(null)
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && openShells.at(-1) === id) emit('close')
}

onMounted(async () => {
  openShells.push(id)
  window.addEventListener('keydown', onKey)
  await nextTick()
  if (!card.value?.contains(document.activeElement)) card.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  openShells.splice(openShells.indexOf(id), 1)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" :class="overlayClass" @mousedown.self="emit('close')">
    <section
      ref="card"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="wv-card w-full max-h-[90vh] max-h-[90dvh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl outline-none dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
      :class="[widthClass, { 'space-y-4': spaced }]"
    >
      <slot />
    </section>
  </div>
</template>
