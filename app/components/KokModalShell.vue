<script setup lang="ts">
// Dimmed overlay + dialog card. Clicking the backdrop emits "close".
withDefaults(defineProps<{ widthClass?: string; overlayClass?: string; spaced?: boolean }>(), {
  widthClass: 'max-w-lg',
  overlayClass: 'z-50 p-4',
  spaced: true,
})
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" :class="overlayClass" @mousedown.self="$emit('close')">
    <section
      role="dialog"
      aria-modal="true"
      class="wv-card w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white"
      :class="[widthClass, { 'space-y-4': spaced }]"
    >
      <slot />
    </section>
  </div>
</template>
