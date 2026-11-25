<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Printer, RefreshCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, fieldClass, primaryButtonClass } from '../utils/admin-ui'
import { adminFetch } from '../utils/admin-session'
import { communityTargets } from '../utils/kok-contract'
import { isMainMapPlace, loadPublicMapData, publicMapData } from '../utils/map-data-public'
import { arsenicLevel, arsenicLevelMeta, isPublicSample } from '../../src/lib/arsenic'
import { communityOfPoint } from '../../src/lib/community-of-point'
import { fetchSurveyWaypoints, type SurveyWaypoint } from '../../src/lib/survey'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import type { CommunityId } from '../../src/lib/map-data'

// Simple live wall map builder: fetches current samples, places, and evacuation households directly from the system.
const props = defineProps<{ communityId: CommunityId }>()

const community = computed(() => communityTargets.find((c) => c.id === props.communityId) ?? communityTargets[0]!)

type Paper = 'A0' | 'A3' | 'A4'
type PrintHousehold = { id: string; latitude: number; longitude: number; levelKey: string }
const paperMm: Record<Paper, [number, number]> = { A0: [841, 1189], A3: [297, 420], A4: [210, 297] }
const marginMm = 8
const paperSize = ref<Paper>('A3')
const orientation = ref<'landscape' | 'portrait'>('landscape')
const sheetMm = computed(() => {
  const [short, long] = paperMm[paperSize.value]
  const [w, h] = orientation.value === 'landscape' ? [long, short] : [short, long]
  return { w: w - marginMm * 2, h: h - marginMm * 2 }
})

const layers = ref({ water: true, places: true, evacuation: false, grid: false })
const customTitle = ref('')
const defaultTitle = computed(() => `แผนที่ชุมชน${community.value.fullName}`)
const sheetTitle = computed(() => customTitle.value.trim() || defaultTitle.value)

const waypoints = ref<SurveyWaypoint[]>([])
const households = ref<PrintHousehold[]>([])
const refreshing = ref(false)
const loadError = ref(false)
const printedOn = ref('')
const preparing = ref(false)
const ratioText = ref('')
const printBox = ref({ w: 0, h: 0, scale: 1 })
const mmToPx = 96 / 25.4
let fetchSeq = 0

const samples = computed(() => waypoints.value.filter((wp) =>
  isPublicSample(wp.arsenic_level_ppb, wp.publication_status)
  && communityOfPoint(wp.latitude, wp.longitude, communityTargets)?.id === props.communityId))
const clusters = computed(() => clusterSurveyWaypoints(samples.value)
  .sort((a, b) => b.latitude - a.latitude)
  .map((cluster, index) => ({ ...cluster, no: index + 1, level: arsenicLevel(cluster.latest.arsenic_level_ppb) })))
const places = computed(() => publicMapData.places.placed.filter((p) => isMainMapPlace(p) && p.communityId === props.communityId && p.latitude != null && p.longitude != null))

const evacuationColorMap: Record<string, string> = {
  '1': '#B91C1C',
  '2': '#D97706',
  '4': '#7C3AED',
  '5': '#16A34A',
}
const evacuationCounts = computed(() => {
  const counts = { '1': 0, '2': 0, '4': 0, '5': 0 }
  for (const h of households.value) {
    if (h.levelKey in counts) counts[h.levelKey as keyof typeof counts] += 1
  }
  return counts
})

const layerOptions = computed(() => [
  { key: 'water' as const, label: 'จุดตรวจสารหนู', count: clusters.value.length },
  { key: 'places' as const, label: 'สถานที่สำคัญ', count: places.value.length },
  { key: 'evacuation' as const, label: 'กลุ่มอพยพ (ระดับ 1–4)', count: households.value.length },
  { key: 'grid' as const, label: 'เส้นกริด 1 กม.', count: -1 },
])
const visibleLayerOptions = computed(() => layerOptions.value.filter((opt) => opt.count !== 0))

const mapContainer = ref<HTMLDivElement | null>(null)
const sheet = ref<HTMLDivElement | null>(null)
let L: typeof import('leaflet') | null = null
let map: import('leaflet').Map | null = null
let tiles: import('leaflet').TileLayer | null = null
let overlay: import('leaflet').LayerGroup | null = null
let lineScale = 1

const badgeIcon = (className: string, html: string) => L!.divIcon({ className: 'pm-icon', iconSize: null as never, html: `<div class="${className}">${html}</div>` })

function drawGrid() {
  if (!L || !map || !overlay) return
  const [lat0, lon0] = community.value.center
  const dLat = 1 / 111.32
  const dLon = dLat / Math.cos((lat0 * Math.PI) / 180)
  const style = { color: '#0369A1', weight: lineScale, opacity: 0.4, interactive: false }
  for (let i = -12; i <= 12; i++) {
    L.polyline([[lat0 + i * dLat, lon0 - 12 * dLon], [lat0 + i * dLat, lon0 + 12 * dLon]], style).addTo(overlay)
    L.polyline([[lat0 - 12 * dLat, lon0 + i * dLon], [lat0 + 12 * dLat, lon0 + i * dLon]], style).addTo(overlay)
  }
}

function render() {
  if (!L || !map || !overlay) return
  overlay.clearLayers()
  if (layers.value.grid) drawGrid()
  if (layers.value.evacuation) {
    for (const h of households.value) {
      L.circleMarker([h.latitude, h.longitude], {
        radius: 5 * lineScale,
        color: '#ffffff',
        weight: 1.5 * lineScale,
        fillColor: evacuationColorMap[h.levelKey] ?? '#16A34A',
        fillOpacity: 0.92,
        interactive: false,
      }).addTo(overlay)
    }
  }
  if (layers.value.places) {
    for (const p of places.value) {
      const glyph = `<span class="pm-place-glyph" style="background:${p.evacuationColor}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${p.path}</svg></span>`
      L.marker([p.latitude!, p.longitude!], { icon: badgeIcon('pm-place', glyph), interactive: false }).addTo(overlay)
    }
  }
  if (layers.value.water) {
    for (const c of clusters.value) {
      const meta = arsenicLevelMeta[c.level]
      L.marker([c.latitude, c.longitude], {
        icon: badgeIcon('pm-sample', `<span class="pm-sample-no" style="background:${meta.hex}">${c.no}</span>`),
        interactive: false,
      }).addTo(overlay)
    }
  }
}

function updateRatio() {
  if (!map || !mapContainer.value || !sheet.value) return
  const b = map.getBounds()
  const groundM = map.distance([b.getCenter().lat, b.getWest()], [b.getCenter().lat, b.getEast()])
  const paperM = (mapContainer.value.clientWidth / sheet.value.clientWidth) * (sheetMm.value.w / 1000)
  if (!paperM) return
  if (!preparing.value) sizePrintBox(0)
  const raw = groundM / paperM
  const step = 10 ** Math.floor(Math.log10(raw)) / 2
  ratioText.value = `1 : ${(Math.round(raw / step) * step).toLocaleString('en-US')}`
}

function fitCommunity() {
  if (!map || !L) return
  const points: [number, number][] = [
    ...(layers.value.water ? clusters.value.map((c) => [c.latitude, c.longitude] as [number, number]) : []),
    ...(layers.value.places ? places.value.map((p) => [p.latitude!, p.longitude!] as [number, number]) : []),
    ...(layers.value.evacuation ? households.value.map((h) => [h.latitude, h.longitude] as [number, number]) : []),
  ]
  if (points.length >= 2) map.fitBounds(L.latLngBounds(points).pad(0.22), { animate: false, maxZoom: 17 })
  else map.setView(points[0] ?? community.value.center, 16, { animate: false })
}

async function refreshLiveData() {
  const seq = ++fetchSeq
  refreshing.value = true
  loadError.value = false
  try {
    await Promise.all([
      fetchSurveyWaypoints()
        .then((list) => { if (seq === fetchSeq) waypoints.value = list })
        .catch(() => { if (seq === fetchSeq) loadError.value = true }),
      loadPublicMapData(true),
      adminFetch(`/api/admin/map-data/households?community=${encodeURIComponent(props.communityId)}&page=1&pageSize=500`)
        .then(async (res) => {
          if (!res.ok) return
          const data = await res.json().catch(() => null)
          if (seq !== fetchSeq || !Array.isArray(data?.items)) return
          households.value = data.items
            .filter((h: any) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude))
            .map((h: any) => ({
              id: String(h.id),
              latitude: Number(h.latitude),
              longitude: Number(h.longitude),
              levelKey: String(h.levels?.['layer-1']?.key ?? '5'),
            }))
        })
        .catch(() => {}),
    ])
  } finally {
    if (seq === fetchSeq) {
      refreshing.value = false
      printedOn.value = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }
}

let pageStyle: HTMLStyleElement | null = null
function applyPageSize() {
  if (!pageStyle) return
  // Browsers know A3 and A4 by name but not A0, so the page size is always given in millimetres.
  const w = sheetMm.value.w + marginMm * 2
  const h = sheetMm.value.h + marginMm * 2
  pageStyle.textContent = `@page { size: ${w}mm ${h}mm; margin: ${marginMm}mm; }`
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Waits until every map tile has either loaded or given up after its retries.
async function tilesSettled(timeoutMs: number) {
  const end = Date.now() + timeoutMs
  await wait(300)
  while (Date.now() < end) {
    const pending = [...(mapContainer.value?.querySelectorAll<HTMLImageElement>('img.leaflet-tile') ?? [])]
      .filter((tile) => !tile.classList.contains('leaflet-tile-loaded') && tile.dataset.gaveUp !== '1')
    if (!pending.length) return
    await wait(250)
  }
}

// The print layout is the preview enlarged by a whole power of two: the map then zooms in by whole levels,
// keeps exactly the area seen in the preview with sharp tiles, and CSS scales the result to the paper.
function sizePrintBox(levels: number) {
  if (!sheet.value) return
  const previewW = sheet.value.offsetWidth
  const paperW = sheetMm.value.w * mmToPx
  const w = previewW * 2 ** levels
  printBox.value = { w, h: (w * sheetMm.value.h) / sheetMm.value.w, scale: paperW / w }
}

async function printMap() {
  if (!map || !sheet.value) return
  const center = map.getCenter()
  const zoom = map.getZoom()
  const ideal = Math.round(Math.log2((sheetMm.value.w * mmToPx) / sheet.value.offsetWidth))
  const levels = Math.max(0, Math.min(ideal, map.getMaxZoom() - zoom))
  sizePrintBox(levels)
  lineScale = 2 ** levels
  preparing.value = true
  await nextTick()
  map.invalidateSize({ animate: false })
  map.setView(center, zoom + levels, { animate: false })
  render()
  await tilesSettled(paperSize.value === 'A0' ? 45000 : 20000)
  window.print()
  preparing.value = false
  await nextTick()
  map.invalidateSize({ animate: false })
  map.setView(center, zoom, { animate: false })
  lineScale = 1
  render()
  sizePrintBox(0)
}

onMounted(async () => {
  printedOn.value = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  document.body.classList.add('kok-print-map')
  pageStyle = document.createElement('style')
  document.head.appendChild(pageStyle)
  applyPageSize()

  const leaflet = await import('leaflet')
  L = (leaflet.default ?? leaflet) as typeof import('leaflet')
  if (!mapContainer.value) return
  map = L.map(mapContainer.value, { center: community.value.center, zoom: 16, zoomControl: false, attributionControl: false })
  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true }).addTo(map)
  // A large sheet asks for many tiles at once and the tile server drops a few; ask again before giving up.
  tiles.on('tileerror', ({ tile }) => {
    const img = tile as HTMLImageElement
    const tries = Number(img.dataset.retry || 0)
    if (tries >= 3) { img.dataset.gaveUp = '1'; return }
    img.dataset.retry = String(tries + 1)
    setTimeout(() => { img.src = `${img.src.split('?')[0]}?retry=${tries + 1}` }, 700 * (tries + 1))
  })
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft', maxWidth: 220 }).addTo(map)
  overlay = L.layerGroup().addTo(map)
  map.on('zoomend moveend resize', updateRatio)

  await refreshLiveData()
  await nextTick()
  map.invalidateSize()
  render()
  fitCommunity()
  updateRatio()
  setTimeout(() => {
    map?.invalidateSize()
    updateRatio()
  }, 80)
})

onBeforeUnmount(() => {
  document.body.classList.remove('kok-print-map')
  pageStyle?.remove()
  map?.remove()
  map = null
})

watch(() => props.communityId, () => {
  customTitle.value = ''
  void refreshLiveData().then(() => nextTick(() => {
    render()
    fitCommunity()
    updateRatio()
  }))
})
watch([layers, clusters, places, households], render, { deep: true })
watch([paperSize, orientation], async () => {
  applyPageSize()
  await nextTick()
  map?.invalidateSize()
  updateRatio()
})
</script>

<template>
  <div class="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start">
    <!-- Left Control Panel -->
    <aside :class="adminCardClass" class="space-y-4 p-4 xl:sticky xl:top-4 xl:col-span-3" aria-label="ตั้งค่าการพิมพ์แผนที่">
      <button type="button" :class="primaryButtonClass" class="w-full justify-center py-2.5!" :disabled="preparing" @click="printMap">
        <Printer class="h-4 w-4" />
        <span>{{ preparing ? 'กำลังเตรียมแผนที่…' : `พิมพ์แผนที่ / บันทึก PDF (${paperSize})` }}</span>
      </button>

      <!-- Custom Sheet Title -->
      <div class="space-y-1.5 border-t border-slate-100 pt-3.5 dark:border-[#2C2C2E]">
        <label for="print-sheet-title" class="text-xs font-bold text-slate-600 dark:text-slate-300">หัวข้อบนแผ่นพิมพ์</label>
        <input
          id="print-sheet-title"
          v-model="customTitle"
          type="text"
          :placeholder="defaultTitle"
          :class="fieldClass"
          class="text-xs!"
        >
      </div>

      <!-- Paper Size & Orientation -->
      <div class="space-y-2.5 border-t border-slate-100 pt-3.5 dark:border-[#2C2C2E]">
        <div class="text-xs font-bold text-slate-600 dark:text-slate-300">ขนาดกระดาษ</div>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="s in ([['A0', 'บอร์ดใหญ่', '841×1189'], ['A3', 'ติดศาลา', '297×420'], ['A4', 'แจกจ่าย', '210×297']] as const)"
            :key="s[0]"
            type="button"
            :aria-pressed="paperSize === s[0]"
            class="cursor-pointer rounded-xl border px-1.5 py-2 text-center transition"
            :class="paperSize === s[0] ? 'border-[#0284C7] bg-sky-50 font-bold text-[#0284C7] dark:bg-sky-950/50 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300'"
            @click="paperSize = s[0]"
          >
            <div class="text-xs font-bold leading-tight">{{ s[0] }} · {{ s[1] }}</div>
            <div class="mt-0.5 text-[10px] opacity-70">{{ s[2] }}</div>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-[#141416]">
          <button
            v-for="o in ([['landscape', 'แนวนอน'], ['portrait', 'แนวตั้ง']] as const)"
            :key="o[0]"
            type="button"
            :aria-pressed="orientation === o[0]"
            class="cursor-pointer rounded-lg py-1.5 text-center text-xs font-semibold transition"
            :class="orientation === o[0] ? 'bg-white text-[#0284C7] shadow-xs dark:bg-[#252528] dark:text-sky-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
            @click="orientation = o[0]"
          >
            {{ o[1] }}
          </button>
        </div>
      </div>

      <!-- Live Data Layers Checklist -->
      <div class="space-y-2 border-t border-slate-100 pt-3.5 dark:border-[#2C2C2E]">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">ข้อมูลสดจากระบบ</span>
          <button type="button" :class="actionButtonClass" class="px-2! py-1! text-[11px]!" :disabled="refreshing" @click="refreshLiveData">
            <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': refreshing }" />
            <span>รีเฟรชข้อมูลล่าสุด</span>
          </button>
        </div>
        <div class="space-y-1.5">
          <label
            v-for="opt in visibleLayerOptions"
            :key="opt.key"
            class="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 transition hover:border-slate-300 dark:border-[#2C2C2E] dark:bg-[#141416]"
          >
            <span class="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
              <input v-model="layers[opt.key]" type="checkbox" class="h-4 w-4 rounded-sm accent-[#0284C7]">
              <span>{{ opt.label }}</span>
            </span>
            <span
              v-if="opt.count > 0"
              class="shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-2xs dark:bg-[#252528] dark:text-slate-300"
            >
              {{ opt.count }}
            </span>
          </label>
        </div>
        <p v-if="loadError" class="text-xs text-rose-600">โหลดผลตรวจไม่สำเร็จ แผนที่จะยังไม่มีจุดตรวจ</p>
      </div>

      <!-- Scale & Reset Row -->
      <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-[#2C2C2E]">
        <span class="text-[11px] font-medium text-slate-500 dark:text-[#98A2A8]">
          มาตราส่วน ≈ <strong class="font-mono text-slate-800 dark:text-slate-200">{{ ratioText || '-' }}</strong>
        </span>
        <button type="button" :class="actionButtonClass" class="px-2.5! py-1.5! text-[11px]!" @click="fitCommunity">
          <RotateCcw class="h-3 w-3" />
          <span>รีเซ็ตมุมมอง</span>
        </button>
      </div>
    </aside>

    <!-- Right Live Preview Stage -->
    <div class="rounded-2xl border border-slate-200 bg-slate-100/80 p-3 sm:p-5 xl:col-span-9 dark:border-[#2C2C2E] dark:bg-[#141416]">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-[#98A2A8]">
        <span class="font-bold text-slate-700 dark:text-slate-200">
          ตัวอย่างแผ่นพิมพ์ {{ paperSize }} · {{ orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง' }}
        </span>
        <span>ลากหรือซูมในกรอบแผนที่เพื่อจัดพื้นที่ก่อนพิมพ์</span>
      </div>

      <div class="flex justify-center">
        <div
          id="printable-map-canvas"
          ref="sheet"
          class="pm-sheet"
          :class="[orientation === 'landscape' ? 'pm-landscape' : 'pm-portrait', preparing && 'pm-preparing']"
          :style="{ '--print-w': `${printBox.w}px`, '--print-h': `${printBox.h}px`, '--print-scale': printBox.scale, aspectRatio: `${sheetMm.w} / ${sheetMm.h}`, width: `min(100%, calc(72vh * ${sheetMm.w / sheetMm.h}))` }"
        >
          <header class="pm-head">
            <div>
              <div class="pm-kicker">MFU Kok Water Watch · โครงการเฝ้าระวังคุณภาพน้ำลุ่มน้ำกก มหาวิทยาลัยแม่ฟ้าหลวง</div>
              <h1 class="pm-title">{{ sheetTitle }}</h1>
              <div class="pm-sub">{{ community.subdistrict }} {{ community.district }} {{ community.province }} · ข้อมูล ณ วันที่ {{ printedOn }}</div>
            </div>
          </header>

          <!-- Full-Width Map Canvas -->
          <div class="pm-body">
            <div class="pm-map-frame">
              <div ref="mapContainer" class="pm-map" />
              <div class="pm-north" aria-hidden="true">
                <svg viewBox="0 0 24 32"><path d="M12 2 20 28 12 22 4 28Z" fill="#0F172A" /><path d="M12 2 12 22 4 28Z" fill="#fff" stroke="#0F172A" stroke-width="1" /></svg>
                <span>N</span>
              </div>
              <div class="pm-map-controls" data-screen-only>
                <button type="button" :class="actionButtonClass" aria-label="ขยายแผนที่" @click="map?.zoomIn()"><ZoomIn class="h-4 w-4" /></button>
                <button type="button" :class="actionButtonClass" aria-label="ย่อแผนที่" @click="map?.zoomOut()"><ZoomOut class="h-4 w-4" /></button>
                <button type="button" :class="actionButtonClass" aria-label="จัดให้เห็นทั้งชุมชน" @click="fitCommunity"><RotateCcw class="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <!-- Ultra-Simple Bottom Legend Bar (only active layers) -->
          <div
            v-if="(layers.water) || (layers.evacuation && households.length) || (layers.places && places.length)"
            class="pm-legend-bar"
          >
            <div v-if="layers.water" class="pm-bar-group">
              <strong>จุดตรวจ ({{ clusters.length }} จุด · {{ samples.length }} ผลตรวจ):</strong>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#16A34A" />ปกติ &lt;5</span>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#CA8A04" />เฝ้าระวัง 5–10</span>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#DC2626" />เกินเกณฑ์ &gt;10 ppb</span>
            </div>
            <div v-if="layers.evacuation && households.length" class="pm-bar-group">
              <strong>กลุ่มอพยพ ({{ households.length }} หลัง):</strong>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#B91C1C" />ระดับ 1 ({{ evacuationCounts['1'] }})</span>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#D97706" />ระดับ 2 ({{ evacuationCounts['2'] }})</span>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#7C3AED" />ระดับ 3 ({{ evacuationCounts['4'] }})</span>
              <span class="pm-bar-item"><span class="pm-dot" style="background:#16A34A" />ระดับ 4 ({{ evacuationCounts['5'] }})</span>
            </div>
            <div v-if="layers.places && places.length" class="pm-bar-group">
              <strong>สถานที่สำคัญ ({{ places.length }} แห่ง)</strong>
            </div>
          </div>

          <footer class="pm-foot">
            <span>แผนที่ฐาน © OpenStreetMap contributors · ข้อมูลสดจากระบบ MFU Kok Water Watch</span>
            <span>มาตราส่วน ≈ {{ ratioText || '-' }} · พิมพ์ {{ paperSize }} · {{ printedOn }}</span>
          </footer>

          <div v-if="preparing" class="pm-wait" data-screen-only>กำลังโหลดแผนที่ความละเอียดสูงสำหรับกระดาษ {{ paperSize }}…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pm-sheet {
  container-type: inline-size;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.1cqw;
  padding: 1.6cqw;
  background: #fff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  box-shadow: 0 10px 30px rgb(15 23 42 / 0.15);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.pm-portrait { gap: 1.6cqw; padding: 2.2cqw; }
/* While preparing to print, the sheet takes its real paper size so Leaflet loads tiles for the whole page. */
.pm-preparing {
  position: fixed !important;
  left: 0;
  top: 0;
  z-index: 9998;
  width: var(--print-w) !important;
  height: var(--print-h) !important;
  aspect-ratio: auto !important;
}
.pm-wait {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 0.96);
  font: 600 16px/1.4 system-ui, sans-serif;
  color: #0f172a;
}
.pm-head { border-bottom: 0.25cqw solid #0f172a; padding-bottom: 0.8cqw; }
.pm-kicker { font-size: 0.85cqw; font-weight: 700; color: #475569; }
.pm-title { font-size: 2.3cqw; font-weight: 800; line-height: 1.2; margin-top: 0.2cqw; }
.pm-sub { font-size: 1cqw; color: #475569; margin-top: 0.2cqw; }
.pm-portrait .pm-kicker { font-size: 1.2cqw; }
.pm-portrait .pm-title { font-size: 3.4cqw; }
.pm-portrait .pm-sub { font-size: 1.45cqw; }

.pm-body { flex: 1; min-height: 0; display: flex; }
.pm-map-frame { position: relative; flex: 1; min-height: 0; border: 0.15cqw solid #0f172a; overflow: hidden; }
.pm-map { position: absolute; inset: 0; background: #f1f5f9; font-size: 0.95cqw; }
.pm-portrait .pm-map { font-size: 1.4cqw; }
.pm-north { position: absolute; top: 1cqw; right: 1cqw; z-index: 500; display: grid; justify-items: center; padding: 0.4cqw 0.5cqw; background: rgb(255 255 255 / 0.92); border: 1px solid #94a3b8; font-weight: 800; font-size: 1cqw; }
.pm-north svg { width: 1.8cqw; height: 2.4cqw; }
.pm-map-controls { position: absolute; left: 0.8cqw; top: 0.8cqw; z-index: 500; display: flex; flex-direction: column; gap: 4px; }

.pm-legend-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6cqw 1.4cqw; font-size: 0.88cqw; color: #334155; }
.pm-portrait .pm-legend-bar { font-size: 1.25cqw; gap: 0.8cqw 1.8cqw; }
.pm-bar-group { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.55em; }
.pm-bar-item { display: inline-flex; align-items: center; gap: 0.3em; }
.pm-dot { display: inline-block; flex: none; width: 0.85em; height: 0.85em; border-radius: 999px; border: 1px solid rgb(0 0 0 / 0.2); }
.pm-foot { display: flex; justify-content: space-between; gap: 2cqw; border-top: 0.2cqw solid #0f172a; padding-top: 0.5cqw; font-size: 0.8cqw; color: #475569; }
.pm-portrait .pm-foot { font-size: 1.15cqw; }
</style>

<style>
/* Leaflet labels on the sheet; sizes follow the sheet through the map's cqw font size. */
.pm-icon { background: none; border: none; }
.pm-icon > div { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; font-family: inherit; }
.pm-sample { display: flex; align-items: center; }
.pm-sample-no { display: grid; place-items: center; width: 1.85em; height: 1.85em; border-radius: 999px; border: 0.16em solid #fff; color: #fff; font-weight: 800; box-shadow: 0 1px 3px rgb(0 0 0 / 0.45); }
.pm-place { display: flex; align-items: center; }
.pm-place-glyph { display: grid; place-items: center; width: 1.8em; height: 1.8em; border-radius: 0.4em; border: 0.14em solid #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 0.4); }
.pm-place-glyph svg { width: 1.15em; height: 1.15em; }
/* Scaling the sheet to the paper leaves hairline gaps between tiles; a slight overlap closes them. */
.pm-preparing .leaflet-tile { width: 257px !important; height: 257px !important; }
#printable-map-canvas .leaflet-control-scale-line { font-size: 0.8em; border-color: #0f172a; background: rgb(255 255 255 / 0.85); }

/* Print only the sheet: the admin screen is hidden and the sheet fills the page set by @page. */
@media print {
  body.kok-print-map { margin: 0 !important; }
  body.kok-print-map * { visibility: hidden !important; }
  body.kok-print-map #printable-map-canvas,
  body.kok-print-map #printable-map-canvas * { visibility: visible !important; }
  body.kok-print-map #printable-map-canvas .leaflet-tile { width: 257px !important; height: 257px !important; }
  body.kok-print-map #printable-map-canvas [data-screen-only],
  body.kok-print-map #printable-map-canvas [data-screen-only] * { display: none !important; }
  body.kok-print-map #__nuxt { height: 0 !important; overflow: hidden !important; }
  body.kok-print-map #printable-map-canvas {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: var(--print-w) !important;
    height: var(--print-h) !important;
    aspect-ratio: auto !important;
    transform: scale(var(--print-scale)) !important;
    transform-origin: 0 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
}
</style>
