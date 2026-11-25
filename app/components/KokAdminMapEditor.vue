<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Maximize2, Minimize2 } from 'lucide-vue-next'
import type { CommunityId } from '../../src/lib/map-data'
import { pinIconOptions, type EditorMarker } from '../utils/map-pin'

const communityCenters: Record<string, [number, number]> = {
  thaton: [20.058, 99.361],
  ruammit: [19.9605, 99.7082],
  pongkhong: [20.3076, 100.2102],
  pakingtai: [20.203878, 100.449169],
}

// แผนที่ที่หน้าแอดมินใช้ดูและแก้ตำแหน่ง ใช้ไอคอนหมุดและแผนที่ฐาน OpenStreetMap เดียวกับหน้าบ้าน
const props = withDefaults(defineProps<{
  markers: EditorMarker[]
  lines?: Array<Array<[number, number]>>
  routeDraft?: Array<[number, number]> | null
  pickMode?: boolean
  fitToken?: number
  focusArea?: { points: Array<[number, number]>; zoom?: number; nonce: number } | null
  heightClass?: string
  community?: CommunityId
  center?: [number, number]
}>(), { lines: () => [], routeDraft: null, pickMode: false, fitToken: 0, focusArea: null, heightClass: 'h-[440px]' })

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'pick', latitude: number, longitude: number): void
  (e: 'routeChange', points: Array<[number, number]>): void
}>()

const container = ref<HTMLDivElement | null>(null)
let L: typeof import('leaflet') | null = null
let map: import('leaflet').Map | null = null
let markerGroup: import('leaflet').LayerGroup | null = null
let lineGroup: import('leaflet').LayerGroup | null = null
let draftGroup: import('leaflet').LayerGroup | null = null
const defaultCenter: [number, number] = [20.058, 99.36]

const activeCenter = computed<[number, number]>(() => {
  if (props.center) return props.center
  if (props.community && communityCenters[props.community]) return communityCenters[props.community]
  return defaultCenter
})

function renderMarkers() {
  if (!L || !markerGroup) return
  markerGroup.clearLayers()
  for (const marker of props.markers) {
    const icon = L.divIcon(pinIconOptions(marker.color, marker.path, 'admin-map-marker', { dimmed: marker.dimmed, selected: marker.selected }))
    L.marker([marker.latitude, marker.longitude], { icon, title: marker.label, alt: marker.label, zIndexOffset: marker.selected ? 1000 : 0 })
      .on('click', () => emit('select', marker.id))
      .addTo(markerGroup)
  }
}

function renderLines() {
  if (!L || !lineGroup) return
  lineGroup.clearLayers()
  for (const line of props.lines) {
    L.polyline(line, { color: '#FFFFFF', weight: 6, opacity: 0.85, interactive: false, smoothFactor: 0 }).addTo(lineGroup)
    L.polyline(line, { color: '#D97706', weight: 3.5, dashArray: '7 5', smoothFactor: 0, interactive: false }).addTo(lineGroup)
  }
}

// โหมดแก้เส้นทาง: คลิกแผนที่เพื่อเพิ่มจุด ลากจุดเพื่อย้าย
function renderDraft() {
  if (!L || !draftGroup) return
  draftGroup.clearLayers()
  const points = props.routeDraft
  if (!points) return
  L.polyline(points, { color: '#0284C7', weight: 4, interactive: false, smoothFactor: 0 }).addTo(draftGroup)
  points.forEach((point, index) => {
    const handle = L!.marker(point, {
      draggable: true,
      title: `จุดที่ ${index + 1} (ลากเพื่อย้าย)`,
      icon: L!.divIcon({ className: 'admin-route-handle', iconSize: [14, 14], iconAnchor: [7, 7], html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${index === 0 ? '#16A34A' : index === points.length - 1 ? '#DC2626' : '#0284C7'};border:2px solid #fff;box-shadow:0 1px 4px #0006"></span>` }),
    })
    handle.on('dragend', () => {
      const next = points.map((item) => [...item] as [number, number])
      const { lat, lng } = handle.getLatLng()
      next[index] = [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]
      emit('routeChange', next)
    })
    handle.addTo(draftGroup!)
  })
}

function fit() {
  if (!L || !map) return
  const points: Array<[number, number]> = [...props.markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]), ...props.lines.flat(), ...(props.routeDraft ?? [])]
  if (points.length) {
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17, animate: false })
  } else {
    map.setView(activeCenter.value, 15, { animate: false })
  }
}

onMounted(async () => {
  if (!container.value) return
  const leaflet = await import('leaflet')
  if (!container.value) return
  L = (leaflet.default ?? leaflet) as typeof import('leaflet')
  map = L.map(container.value, { center: activeCenter.value, zoom: 15, zoomControl: true, attributionControl: true })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  }).addTo(map)
  lineGroup = L.layerGroup().addTo(map)
  markerGroup = L.layerGroup().addTo(map)
  draftGroup = L.layerGroup().addTo(map)
  map.on('click', (event: import('leaflet').LeafletMouseEvent) => {
    const latitude = Math.round(event.latlng.lat * 1e6) / 1e6
    const longitude = Math.round(event.latlng.lng * 1e6) / 1e6
    if (props.routeDraft) emit('routeChange', [...props.routeDraft, [latitude, longitude]])
    else if (props.pickMode) emit('pick', latitude, longitude)
  })
  renderLines()
  renderMarkers()
  renderDraft()
  setTimeout(() => {
    map?.invalidateSize()
    fit()
  }, 60)
})

watch(() => props.markers, renderMarkers, { deep: true })
watch(() => props.lines, renderLines, { deep: true })
watch(() => props.routeDraft, renderDraft, { deep: true })
watch(() => props.fitToken, () => setTimeout(fit, 0))
watch(() => props.focusArea?.nonce, () => {
  const focus = props.focusArea
  if (!L || !map || !focus?.points.length) return
  if (focus.points.length === 1) {
    map.setView(focus.points[0]!, focus.zoom ?? 17, { animate: true })
  } else {
    map.fitBounds(L.latLngBounds(focus.points), { padding: [36, 36], maxZoom: focus.zoom ?? 17, animate: true })
  }
})
watch(activeCenter, (next) => {
  if (!map) return
  const points: Array<[number, number]> = [...props.markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]), ...props.lines.flat(), ...(props.routeDraft ?? [])]
  if (points.length) {
    fit()
  } else {
    map.setView(next, 15, { animate: true })
  }
})

const isExpanded = ref(false)
async function toggleExpand() {
  isExpanded.value = !isExpanded.value
  await nextTick()
  setTimeout(() => {
    map?.invalidateSize()
  }, 60)
}

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div v-if="isExpanded" class="fixed inset-0 z-[1039] bg-slate-900/55 backdrop-blur-[1px]" @click="toggleExpand" />
  <div
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2C2C2E] dark:bg-[#1E1E1E]"
    :class="[
      isExpanded ? 'fixed inset-3 z-[1040] h-auto! shadow-2xl sm:inset-5' : ['relative isolate', heightClass],
      { 'kok-map-pick': pickMode || Boolean(routeDraft) },
    ]"
  >
    <div ref="container" role="region" aria-label="แผนที่แก้ไขข้อมูล" class="h-full w-full" />
    <p
      v-if="pickMode || routeDraft"
      class="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-[#0284C7] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg"
    >
      {{ routeDraft ? 'คลิกบนแผนที่เพื่อเพิ่มจุดเส้นทาง · ลากจุดเพื่อย้าย' : 'คลิกบนแผนที่เพื่อเลือกตำแหน่ง' }}
    </p>
    <button
      type="button"
      :aria-label="isExpanded ? 'ย่อแผนที่' : 'ขยายแผนที่'"
      :aria-pressed="isExpanded"
      class="absolute right-3 top-3 z-[1000] inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-xs transition hover:bg-slate-50 hover:text-[#0284C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7] dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 dark:text-slate-100 dark:hover:bg-[#252525]"
      @click.stop="toggleExpand"
    >
      <Minimize2 v-if="isExpanded" class="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
      <Maximize2 v-else class="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
      <span>{{ isExpanded ? 'ย่อแผนที่' : 'ขยายแผนที่' }}</span>
    </button>
    <slot />
  </div>
</template>

<style scoped>
/* Keep :class off the Leaflet mount element so Vue patching does not strip .leaflet-container. */
.kok-map-pick :deep(.leaflet-container),
.kok-map-pick :deep(.leaflet-grab) {
  cursor: crosshair;
}
</style>
