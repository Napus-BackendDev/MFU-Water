<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

// Full-screen photo viewer on a black backdrop; with more than one photo it pages with arrows, keys or a swipe.
const props = defineProps<{ images: string[]; alt?: string }>()
const index = defineModel<number>('index', { default: 0 })
const emit = defineEmits<{ (e: 'close'): void }>()

const total = computed(() => props.images.length)
const current = computed(() => props.images[index.value] ?? '')

function step(delta: number) {
  if (total.value < 2) return
  index.value = (index.value + delta + total.value) % total.value
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowRight') step(1)
  else if (event.key === 'ArrowLeft') step(-1)
}

let touchStartX: number | null = null
const onTouchStart = (event: TouchEvent) => { touchStartX = event.touches[0]?.clientX ?? null }
function onTouchEnd(event: TouchEvent) {
  const endX = event.changedTouches[0]?.clientX
  if (touchStartX !== null && endX !== undefined && Math.abs(endX - touchStartX) > 50) step(endX < touchStartX ? 1 : -1)
  touchStartX = null
}

// Warm the neighbouring photos so paging feels instant.
watch([index, () => props.images], () => {
  for (const delta of [1, -1]) {
    const url = props.images[(index.value + delta + total.value) % total.value]
    if (url) new Image().src = url
  }
}, { immediate: true })

let previousOverflow = ''
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousOverflow
})

const roundButton = 'absolute flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/25 transition cursor-pointer'
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[1070] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="ดูภาพขยาย"
      @click.self="emit('close')"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <img :src="current" :alt="alt || `ภาพที่ ${index + 1}`" class="max-h-[100svh] max-w-full select-none object-contain" draggable="false" @click.self="emit('close')" />

      <button type="button" aria-label="ปิดภาพ" :class="[roundButton, 'right-3 top-3']" @click="emit('close')">
        <X class="h-5 w-5" />
      </button>

      <template v-if="total > 1">
        <button type="button" aria-label="ภาพก่อนหน้า" :class="[roundButton, 'left-3 top-1/2 -translate-y-1/2']" @click="step(-1)">
          <ChevronLeft class="h-6 w-6" />
        </button>
        <button type="button" aria-label="ภาพถัดไป" :class="[roundButton, 'right-3 top-1/2 -translate-y-1/2']" @click="step(1)">
          <ChevronRight class="h-6 w-6" />
        </button>
        <span class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white" data-testid="lightbox-counter">
          {{ index + 1 }} / {{ total }}
        </span>
      </template>
    </div>
  </Teleport>
</template>
