<script setup lang="ts">
import { watch } from 'vue'
import { House, Waves, MapPin, Accessibility } from 'lucide-vue-next'
import { hasPublicMapLayer, type CommunityMapType } from '../utils/community-map-layers'

const props = defineProps<{ communityId: string }>()
const selectedId = defineModel<CommunityMapType | null>({ default: null })
const mapTypes: Array<{ id: CommunityMapType; label: string; icon: typeof House; color: string }> = [
  { id: 'hamlets', label: 'หย่อมบ้าน', icon: House, color: '#6D28D9' },
  { id: 'flood', label: 'น้ำท่วม', icon: Waves, color: '#0369A1' },
  { id: 'places', label: 'สถานที่สำคัญ', icon: MapPin, color: '#047857' },
  { id: 'evacuation', label: 'อพยพกลุ่มเปราะบาง', icon: Accessibility, color: '#B45309' },
]
watch(() => props.communityId, () => {
  if (selectedId.value && hasPublicMapLayer(props.communityId, selectedId.value)) return
  selectedId.value = mapTypes.find((type) => hasPublicMapLayer(props.communityId, type.id))?.id ?? null
}, { immediate: true })

function label(id: CommunityMapType, name: string) {
  const status = hasPublicMapLayer(props.communityId, id)
    ? id === 'evacuation' ? 'จุดศูนย์พักพิงและรวมพล ตำแหน่งประมาณจากภาพ PDF' : 'แบบจำลองคาดการณ์ตามระดับน้ำ ไม่ใช่น้ำท่วมสด'
    : 'ปิดระบบชั่วคราว (ยังไม่มีพิกัดสาธารณะพร้อมแสดง)'
  return `แผนที่${name}: ${status}`
}
</script>

<template>
  <div class="map-types-control pointer-events-auto" role="group" aria-label="เลือกประเภทแผนที่">
    <button
      v-for="type in mapTypes" :key="type.id" type="button"
      class="map-type-option" :class="{ selected: selectedId === type.id, disabled: !hasPublicMapLayer(communityId, type.id) }"
      :style="{ '--type-color': hasPublicMapLayer(communityId, type.id) ? type.color : '#DC2626' }"
      :disabled="!hasPublicMapLayer(communityId, type.id)"
      :aria-pressed="selectedId === type.id" :aria-label="label(type.id, type.label)" :title="label(type.id, type.label)"
      @click="selectedId = selectedId === type.id ? null : type.id"
    >
      <component :is="type.icon" :size="18" class="map-type-icon" aria-hidden="true" />
      <span>{{ type.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.map-types-control { display: grid; grid-template-columns: repeat(4, max-content); gap: 8px; padding: 6px; border-radius: 14px; background: var(--wv-card, #fff); box-shadow: 0 4px 20px #0002; }
.map-type-option { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 8px 12px; border-radius: 10px; border: 2px solid transparent; color: var(--type-color); background: color-mix(in srgb, var(--type-color) 6%, transparent); cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; transition: all 0.15s ease; }
.map-type-icon { flex-shrink: 0; }
.map-type-option:hover:not(:disabled) { background: color-mix(in srgb, var(--type-color) 13%, transparent); }
.map-type-option:disabled { cursor: not-allowed; border-color: color-mix(in srgb, var(--type-color) 35%, transparent); background: color-mix(in srgb, var(--type-color) 12%, transparent); color: var(--type-color); opacity: 0.9; }
.map-type-option.selected { border-color: var(--type-color); background: color-mix(in srgb, var(--type-color) 14%, transparent); }
.map-type-option:focus-visible { outline: 3px solid #0284c7; outline-offset: 2px; }
:global(html.dark) .map-type-option { color: color-mix(in srgb, var(--type-color) 55%, white); }
:global(html.dark) .map-type-option:disabled { color: #F87171; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.12); }
@media (max-width: 767px) {
  .map-types-control { width: min(340px, calc(100vw - 24px)); grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .map-type-option { padding: 8px 6px; }
}
</style>
