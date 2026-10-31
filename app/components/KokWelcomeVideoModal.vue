<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import KokModalShell from './KokModalShell.vue'
import KokTutorialVideo from './KokTutorialVideo.vue'

// Shown on every visit: just the video, large, with a way to close it.
const emit = defineEmits<{ (e: 'close'): void }>()

const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<template>
  <KokModalShell overlay-class="z-[1060] p-3 sm:p-6" width-class="max-w-5xl !p-0 !bg-black !overflow-hidden" :spaced="false" @close="emit('close')">
    <div class="relative" aria-label="วิดีโอสอนการใช้งาน">
      <KokTutorialVideo autoplay />
      <button
        type="button"
        aria-label="ปิดวิดีโอ"
        class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black/90 transition"
        @click="emit('close')"
      >
        <X class="h-5 w-5" />
      </button>
    </div>
  </KokModalShell>
</template>
