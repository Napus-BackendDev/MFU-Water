<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Volume2 } from 'lucide-vue-next'

// The how-to video. With "autoplay" it starts as soon as it is shown; browsers refuse autoplay with sound
// until the visitor has interacted, so it then starts muted with a button to turn the sound on.
const props = defineProps<{ autoplay?: boolean }>()

const video = ref<HTMLVideoElement | null>(null)
const mutedByBrowser = ref(false)

onMounted(async () => {
  const element = video.value
  if (!props.autoplay || !element) return
  try {
    await element.play()
  } catch {
    element.muted = true
    mutedByBrowser.value = true
    await element.play().catch(() => {})
  }
})

function unmute() {
  if (!video.value) return
  video.value.muted = false
  mutedByBrowser.value = false
}
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-black">
    <video
      ref="video"
      class="block aspect-video w-full"
      src="/videos/survey-tutorial.mp4"
      poster="/videos/survey-tutorial-poster.jpg"
      controls
      playsinline
      preload="metadata"
      aria-label="วิดีโอสอนการใช้งานระบบและการส่งผลตรวจน้ำ"
      @volumechange="mutedByBrowser = mutedByBrowser && !!video?.muted"
    />
    <button
      v-if="mutedByBrowser"
      type="button"
      class="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/85 transition"
      @click="unmute"
    >
      <Volume2 class="h-4 w-4" />
      <span>เปิดเสียง</span>
    </button>
  </div>
</template>
