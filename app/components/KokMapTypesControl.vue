<script setup lang="ts">
import { watch } from 'vue'
import { House, FlaskConical, MapPin, Accessibility } from 'lucide-vue-next'
import { hasPublicMapLayer, type CommunityMapType } from '../utils/community-map-layers'

const props = withDefaults(
  defineProps<{
    communityId: string
    variant?: 'pill' | 'bottom-nav'
  }>(),
  {
    variant: 'pill',
  },
)
const selectedId = defineModel<CommunityMapType | null>({ default: 'chemical' })
const mapTypes: Array<{ id: CommunityMapType; label: string; shortLabel: string; icon: typeof House; color: string }> = [
  { id: 'hamlets', label: 'หย่อมบ้าน', shortLabel: 'หย่อมบ้าน', icon: House, color: '#6D28D9' },
  { id: 'chemical', label: 'สารเคมีปนเปื้อน', shortLabel: 'สารเคมี', icon: FlaskConical, color: '#0284C7' },
  { id: 'places', label: 'สถานที่สำคัญ', shortLabel: 'สถานที่', icon: MapPin, color: '#047857' },
  { id: 'evacuation', label: 'อพยพกลุ่มเปราะบาง', shortLabel: 'อพยพ', icon: Accessibility, color: '#B45309' },
]

function selectType(id: CommunityMapType) {
  if (!hasPublicMapLayer(props.communityId, id)) return
  selectedId.value = selectedId.value === id ? null : id
}

watch(() => props.communityId, () => {
  if (selectedId.value && hasPublicMapLayer(props.communityId, selectedId.value)) return
  selectedId.value = 'chemical'
}, { immediate: true })

function label(id: CommunityMapType, name: string) {
  const status = hasPublicMapLayer(props.communityId, id)
    ? id === 'chemical' ? 'จุดสำรวจคุณภาพน้ำและสารเคมีปนเปื้อนตามช่วงเวลา'
      : id === 'evacuation' ? 'จุดศูนย์พักพิงและรวมพล ตำแหน่งประมาณจากภาพ PDF'
      : 'ข้อมูลชุมชน'
    : 'ปิดการใช้งาน (ไม่สามารถกดได้)'
  return `แผนที่${name}: ${status}`
}
</script>

<template>
  <!-- Variant 1: Mobile Bottom Navigation Bar (4-Button Menu Bar) -->
  <nav
    v-if="variant === 'bottom-nav'"
    class="w-full border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl pointer-events-auto dark:border-[#2C2C2E] dark:bg-[#1C1C1E]/95"
    role="navigation"
    aria-label="เมนูประเภทแผนที่"
  >
    <div class="grid grid-cols-4 gap-1 w-full max-w-md mx-auto">
      <button
        v-for="type in mapTypes"
        :key="type.id"
        type="button"
        class="flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all"
        :class="[
          selectedId === type.id
            ? 'font-bold shadow-xs'
            : !hasPublicMapLayer(communityId, type.id)
              ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-zinc-600'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
        ]"
        :style="selectedId === type.id && hasPublicMapLayer(communityId, type.id) ? { color: type.color, backgroundColor: `color-mix(in srgb, ${type.color} 14%, transparent)` } : {}"
        :disabled="!hasPublicMapLayer(communityId, type.id)"
        :aria-pressed="selectedId === type.id"
        :aria-label="label(type.id, type.label)"
        :title="label(type.id, type.label)"
        @click="selectType(type.id)"
      >
        <component :is="type.icon" :size="20" class="mb-0.5" />
        <span class="text-[11px] leading-tight font-medium">{{ type.shortLabel }}</span>
      </button>
    </div>
  </nav>

  <!-- Variant 2: Desktop Horizontal Capsule Pill Bar -->
  <div v-else class="map-types-control pointer-events-auto" role="group" aria-label="เลือกประเภทแผนที่">
    <button
      v-for="type in mapTypes" :key="type.id" type="button"
      class="map-type-option" :class="{ selected: selectedId === type.id, disabled: !hasPublicMapLayer(communityId, type.id) }"
      :style="{ '--type-color': hasPublicMapLayer(communityId, type.id) ? type.color : '#94A3B8' }"
      :disabled="!hasPublicMapLayer(communityId, type.id)"
      :aria-pressed="selectedId === type.id" :aria-label="label(type.id, type.label)" :title="label(type.id, type.label)"
      @click="selectType(type.id)"
    >
      <component :is="type.icon" :size="16" class="map-type-icon" aria-hidden="true" />
      <span class="hidden sm:inline">{{ type.label }}</span>
      <span class="sm:hidden">{{ type.shortLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.map-types-control {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 14px;
  background: var(--wv-card, #fff);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  max-width: calc(100vw - 20px);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.map-types-control::-webkit-scrollbar {
  display: none;
}

.map-type-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 2px solid transparent;
  color: var(--type-color);
  background: color-mix(in srgb, var(--type-color) 6%, transparent);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.map-type-icon {
  flex-shrink: 0;
}
.map-type-option:hover:not(:disabled) {
  background: color-mix(in srgb, var(--type-color) 13%, transparent);
}
.map-type-option:disabled {
  cursor: not-allowed;
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(148, 163, 184, 0.08);
  color: #94A3B8;
  opacity: 0.55;
}
.map-type-option.selected {
  border-color: var(--type-color);
  background: color-mix(in srgb, var(--type-color) 14%, transparent);
}
.map-type-option:focus-visible {
  outline: 3px solid #0284c7;
  outline-offset: 2px;
}
:global(html.dark) .map-type-option {
  color: color-mix(in srgb, var(--type-color) 55%, white);
}
:global(html.dark) .map-type-option:disabled {
  color: #71717A;
  border-color: rgba(113, 113, 122, 0.25);
  background: rgba(113, 113, 122, 0.1);
  opacity: 0.55;
}
@media (max-width: 639px) {
  .map-type-option {
    padding: 6px 8px;
    font-size: 11px;
    gap: 4px;
    min-height: 38px;
  }
}
</style>
