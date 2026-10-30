<script setup lang="ts">
// Dimmed overlay + card. Clicking the backdrop emits "close".
withDefaults(defineProps<{ widthClass?: string }>(), { widthClass: 'max-w-lg' })
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @mousedown.self="$emit('close')">
    <div
      class="wv-card w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-white space-y-4"
      :class="widthClass"
    >
      <slot />
    </div>
  </div>
</template>
