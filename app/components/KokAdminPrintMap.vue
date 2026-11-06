<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Printer, RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { actionButtonClass, adminCardClass, primaryButtonClass } from '../utils/admin-ui'
import { communityTargets } from '../utils/kok-contract'
import { loadPublicMapData, publicMapData } from '../utils/map-data-public'
import { arsenicLevel, arsenicLevelMeta, isPublicSample } from '../../src/lib/arsenic'
import { communityOfPoint } from '../../src/lib/community-of-point'
import { fetchSurveyWaypoints, type SurveyWaypoint } from '../../src/lib/survey'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import type { CommunityId } from '../../src/lib/map-data'

// A wall map for the village office: the same real data as the public map, laid out as one sheet of paper.
// Printing hides the admin screen and prints only the sheet, at the chosen paper size.

const props = defineProps<{ communityId: CommunityId }>()

const community = computed(() => communityTargets.find((c) => c.id === props.communityId) ?? communityTargets[0]!)

type Paper = 'A0' | 'A3' | 'A4'
const paperMm: Record<Paper, [number, number]> = { A0: [841, 1189], A3: [297, 420], A4: [210, 297] }
const marginMm = 8
const paperSize = ref<Paper>('A3')
const orientation = ref<'landscape' | 'portrait'>('landscape')
const sheetMm = computed(() => {
  const [short, long] = paperMm[paperSize.value]
  const [w, h] = orientation.value === 'landscape' ? [long, short] : [short, long]
  return { w: w - marginMm * 2, h: h - marginMm * 2 }
})

const layers = ref({ water: true, places: true, routes: true, hamlets: true, grid: false })

const waypoints = ref<SurveyWaypoint[]>([])
const loadError = ref(false)
const printedOn = ref('')
const preparing = ref(false)
const ratioText = ref('')
// Size of the sheet while printing, in CSS px, and the scale that fits it to the paper.
const printBox = ref({ w: 0, h: 0, scale: 1 })
const mmToPx = 96 / 25.4

const samples = computed(() => waypoints.value.filter((wp) =>
  isPublicSample(wp.arsenic_level_ppb, wp.publication_status)
  && communityOfPoint(wp.latitude, wp.longitude, communityTargets)?.id === props.communityId))
// Numbered north to south so the wall table reads in the same order as the map.
const clusters = computed(() => clusterSurveyWaypoints(samples.value)
  .sort((a, b) => b.latitude - a.latitude)
  .map((cluster, index) => ({ ...cluster, no: index + 1, level: arsenicLevel(cluster.latest.arsenic_level_ppb) })))
const places = computed(() => publicMapData.places.placed.filter((p) => p.communityId === props.communityId && p.latitude != null && p.longitude != null))
const evacuationPlaces = computed(() => places.value.filter((p) => p.kind === 'shelter' || p.kind === 'assembly'))
const landmarks = computed(() => places.value.filter((p) => p.kind !== 'shelter' && p.kind !== 'assembly'))
const hamlets = computed(() => publicMapData.hamlets.filter((h) => h.center && communityOfPoint(h.center.latitude, h.center.longitude, communityTargets)?.id === props.communityId))
// The edited evacuation routes exist for ท่าตอน only.
const routes = computed(() => (props.communityId === 'thaton' ? publicMapData.routes?.routes ?? [] : []))

const layerOptions = computed(() => [
  { key: 'water' as const, label: 'จุดตรวจสารหนูที่เผยแพร่', count: clusters.value.length },
  { key: 'places' as const, label: 'สถานที่สำคัญ ศูนย์พักพิง และจุดรวมพล', count: places.value.length },
  { key: 'routes' as const, label: 'เส้นทางอพยพ', count: routes.value.length },
  { key: 'hamlets' as const, label: 'หมู่บ้านที่ปักตำแหน่งแล้ว', count: hamlets.value.length },
  { key: 'grid' as const, label: 'เส้นกริด 1 กิโลเมตร', count: -1 },
])

const levelRows = (['normal', 'watch', 'over'] as const).map((id) => ({ id, ...arsenicLevelMeta[id] }))
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

const mapContainer = ref<HTMLDivElement | null>(null)
const sheet = ref<HTMLDivElement | null>(null)
let L: typeof import('leaflet') | null = null
let map: import('leaflet').Map | null = null
let tiles: import('leaflet').TileLayer | null = null
let overlay: import('leaflet').LayerGroup | null = null
// Lines are drawn in screen pixels; while the sheet is enlarged for print they grow with it.
let lineScale = 1

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const label = (className: string, html: string) => L!.divIcon({ className: 'pm-icon', iconSize: null as never, html: `<div class="${className}">${html}</div>` })

function drawGrid() {
  if (!L || !map || !overlay) return
  const [lat0, lon0] = community.value.center
  const dLat = 1 / 111.32
  const dLon = dLat / Math.cos((lat0 * Math.PI) / 180)
  const style = { color: '#0369A1', weight: lineScale, opacity: 0.45, interactive: false }
  for (let i = -12; i <= 12; i++) {
    L.polyline([[lat0 + i * dLat, lon0 - 12 * dLon], [lat0 + i * dLat, lon0 + 12 * dLon]], style).addTo(overlay)
    L.polyline([[lat0 - 12 * dLat, lon0 + i * dLon], [lat0 + 12 * dLat, lon0 + i * dLon]], style).addTo(overlay)
  }
}

function render() {
  if (!L || !map || !overlay) return
  overlay.clearLayers()
  if (layers.value.grid) drawGrid()
  if (layers.value.routes) {
    for (const line of routes.value) {
      L.polyline(line, { color: '#ffffff', weight: 7 * lineScale, opacity: 0.95, interactive: false }).addTo(overlay)
      L.polyline(line, { color: '#E11D48', weight: 3.5 * lineScale, dashArray: `${9 * lineScale} ${6 * lineScale}`, interactive: false }).addTo(overlay)
    }
  }
  if (layers.value.hamlets) {
    for (const h of hamlets.value) {
      L.marker([h.center!.latitude, h.center!.longitude], { icon: label('pm-hamlet', escapeHtml(h.name)), interactive: false }).addTo(overlay)
    }
  }
  if (layers.value.places) {
    for (const p of places.value) {
      const glyph = `<span class="pm-place-glyph" style="background:${p.evacuationColor}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${p.path}</svg></span>`
      L.marker([p.latitude!, p.longitude!], { icon: label('pm-place', `${glyph}<span class="pm-place-name">${escapeHtml(p.name)}</span>`), interactive: false }).addTo(overlay)
    }
  }
  if (layers.value.water) {
    for (const c of clusters.value) {
      const meta = arsenicLevelMeta[c.level]
      L.marker([c.latitude, c.longitude], {
        icon: label('pm-sample', `<span class="pm-sample-no" style="background:${meta.hex}">${c.no}</span><span class="pm-sample-ppb">${c.latest.arsenic_level_ppb} ppb</span>`),
        interactive: false,
      }).addTo(overlay)
    }
  }
}

// Map scale on paper: ground distance across the map divided by the map's printed width.
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
    ...clusters.value.map((c) => [c.latitude, c.longitude] as [number, number]),
    ...places.value.map((p) => [p.latitude!, p.longitude!] as [number, number]),
    ...hamlets.value.map((h) => [h.center!.latitude, h.center!.longitude] as [number, number]),
  ]
  if (points.length >= 2) map.fitBounds(L.latLngBounds(points).pad(0.25), { animate: false, maxZoom: 17 })
  else map.setView(points[0] ?? community.value.center, 16, { animate: false })
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

  const [list] = await Promise.all([fetchSurveyWaypoints().catch(() => { loadError.value = true; return [] }), loadPublicMapData()])
  waypoints.value = list
  await nextTick()
  map.invalidateSize()
  render()
  fitCommunity()
  updateRatio()
})

onBeforeUnmount(() => {
  document.body.classList.remove('kok-print-map')
  pageStyle?.remove()
  map?.remove()
  map = null
})

watch(() => props.communityId, () => nextTick(() => { render(); fitCommunity() }))
watch([layers, clusters, places, hamlets, routes], render, { deep: true })
watch([paperSize, orientation], async () => {
  applyPageSize()
  await nextTick()
  map?.invalidateSize()
  updateRatio()
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#2C2C2E]">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-lg bg-sky-100 p-1.5 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300"><Printer class="h-4 w-4" /></span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">จัดทำแผนที่ฉบับพิมพ์ติดผนังชุมชน</h2>
          <span class="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-[#0284C7] dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">{{ community.name }}</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          ขยับและซูมแผนที่ในกรอบตัวอย่างให้ได้พื้นที่ที่ต้องการ แล้วกดพิมพ์ ระบบจะพิมพ์เฉพาะแผ่นแผนที่ตามขนาดกระดาษที่เลือก
        </p>
      </div>
      <button type="button" :class="primaryButtonClass" :disabled="preparing" @click="printMap">
        <Printer class="h-3.5 w-3.5" />
        <span>{{ preparing ? 'กำลังเตรียมแผนที่…' : `พิมพ์แผนที่ / บันทึก PDF (${paperSize})` }}</span>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
      <div :class="adminCardClass" class="space-y-3 p-4 sm:p-5 md:col-span-5">
        <div class="text-xs font-bold text-slate-500 dark:text-slate-400">ขนาดกระดาษ</div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="s in ([['A0', 'บอร์ดใหญ่', '841×1189 มม.'], ['A3', 'ติดศาลา', '297×420 มม.'], ['A4', 'แจกจ่าย', '210×297 มม.']] as const)"
            :key="s[0]"
            type="button"
            :aria-pressed="paperSize === s[0]"
            class="cursor-pointer rounded-xl border p-2 text-center transition"
            :class="paperSize === s[0] ? 'border-[#0284C7] bg-sky-50 font-bold text-[#0284C7] dark:bg-sky-950/50 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300'"
            @click="paperSize = s[0]"
          >
            <div class="text-xs font-bold">{{ s[0] }} · {{ s[1] }}</div>
            <div class="mt-0.5 text-[10px] opacity-75">{{ s[2] }}</div>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="o in ([['landscape', 'แนวนอน'], ['portrait', 'แนวตั้ง']] as const)"
            :key="o[0]"
            type="button"
            :aria-pressed="orientation === o[0]"
            class="cursor-pointer rounded-xl border p-2 text-center text-xs transition"
            :class="orientation === o[0] ? 'border-[#0284C7] bg-sky-50 font-bold text-[#0284C7] dark:bg-sky-950/50 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#1E1E1E] dark:text-slate-300'"
            @click="orientation = o[0]"
          >
            {{ o[1] }}
          </button>
        </div>
      </div>

      <div :class="adminCardClass" class="space-y-3 p-4 sm:p-5 md:col-span-7">
        <div class="text-xs font-bold text-slate-500 dark:text-slate-400">ข้อมูลที่แสดงบนแผนที่ (ดึงจากข้อมูลจริงในระบบ)</div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            v-for="opt in layerOptions"
            :key="opt.key"
            class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-[#2C2C2E] dark:bg-[#161618]"
            :class="opt.count === 0 ? 'opacity-60' : ''"
          >
            <input v-model="layers[opt.key]" type="checkbox" class="h-4 w-4 rounded-sm" :disabled="opt.count === 0">
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200">
              {{ opt.label }}
              <span v-if="opt.count > 0" class="text-slate-500">({{ opt.count }})</span>
              <span v-else-if="opt.count === 0" class="text-slate-500">· ยังไม่มีข้อมูล</span>
            </span>
          </label>
        </div>
        <p v-if="loadError" class="text-xs text-rose-600">โหลดผลตรวจไม่สำเร็จ แผนที่จะยังไม่มีจุดตรวจ</p>
      </div>
    </div>

    <div class="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
      <span class="font-bold">ตัวอย่างแผ่นพิมพ์ {{ paperSize }} {{ orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง' }}</span>
      <span v-if="ratioText">มาตราส่วนบนกระดาษ ≈ {{ ratioText }}</span>
    </div>

    <div class="flex justify-center">
      <div
        id="printable-map-canvas"
        ref="sheet"
        class="pm-sheet"
        :class="[orientation === 'landscape' ? 'pm-landscape' : 'pm-portrait', preparing && 'pm-preparing']"
        :style="{ '--print-w': `${printBox.w}px`, '--print-h': `${printBox.h}px`, '--print-scale': printBox.scale, aspectRatio: `${sheetMm.w} / ${sheetMm.h}`, width: `min(100%, calc(78vh * ${sheetMm.w / sheetMm.h}))` }"
      >
        <header class="pm-head">
          <div>
            <div class="pm-kicker">MFU Kok Water Watch · โครงการเฝ้าระวังคุณภาพน้ำลุ่มน้ำกก มหาวิทยาลัยแม่ฟ้าหลวง</div>
            <h1 class="pm-title">แผนที่ชุมชน{{ community.fullName }}</h1>
            <div class="pm-sub">{{ community.subdistrict }} {{ community.district }} {{ community.province }} · ข้อมูล ณ วันที่ {{ printedOn }}</div>
          </div>
        </header>

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

          <aside class="pm-legend">
            <section>
              <h2>ระดับสารหนูจากชุดตรวจ</h2>
              <div v-for="row in levelRows" :key="row.id" class="pm-row"><span class="pm-dot" :style="{ background: row.hex }" />{{ row.label }} · {{ row.note }}</div>
            </section>
            <section v-if="layers.places && evacuationPlaces.length || layers.routes && routes.length">
              <h2>การอพยพ</h2>
              <div v-for="p in (layers.places ? evacuationPlaces : [])" :key="p.id" class="pm-row">
                <span class="pm-dot" :style="{ background: p.evacuationColor }" />{{ p.kindLabel }}: {{ p.name }}
              </div>
              <div v-if="layers.routes && routes.length" class="pm-row"><span class="pm-route" />เส้นทางอพยพ</div>
            </section>
            <section v-if="layers.places && landmarks.length">
              <h2>สถานที่สำคัญ</h2>
              <div v-for="p in landmarks" :key="p.id" class="pm-row">
                <span class="pm-dot" :style="{ background: p.evacuationColor }" />{{ p.kind === 'other' ? p.name : `${p.kindLabel}: ${p.name}` }}
              </div>
            </section>
            <section v-if="layers.water">
              <h2>จุดตรวจ ({{ clusters.length }} จุด · {{ samples.length }} ผลตรวจ)</h2>
              <p v-if="!clusters.length" class="pm-note">ยังไม่มีผลตรวจที่เผยแพร่ในชุมชนนี้</p>
              <table v-else class="pm-table">
                <thead><tr><th>จุด</th><th>ค่าล่าสุด</th><th>ตรวจ</th><th>ล่าสุด</th></tr></thead>
                <tbody>
                  <tr v-for="c in clusters" :key="c.id">
                    <td><span class="pm-dot pm-dot-no" :style="{ background: arsenicLevelMeta[c.level].hex }">{{ c.no }}</span></td>
                    <td>{{ c.latest.arsenic_level_ppb }} ppb</td>
                    <td>{{ c.sampleCount }} ครั้ง</td>
                    <td>{{ formatDate(c.latest.collection_time || c.latest.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <section class="pm-note">
              ค่าจากชุดตรวจภาคสนาม ใช้เพื่อเฝ้าระวัง ไม่ใช่คำรับรองว่าน้ำดื่มได้ หากพบค่าเกินเกณฑ์ให้แจ้ง อสม. หรือ รพ.สต.
            </section>
          </aside>
        </div>

        <footer class="pm-foot">
          <span>แผนที่ฐาน © OpenStreetMap contributors · ตำแหน่งสถานที่เป็นตำแหน่งประมาณจากแผนที่ชุมชนและ My Maps ยังไม่ยืนยันภาคสนาม</span>
          <span>มาตราส่วน ≈ {{ ratioText || '-' }} · พิมพ์ {{ paperSize }} · {{ printedOn }}</span>
        </footer>

        <div v-if="preparing" class="pm-wait" data-screen-only>กำลังโหลดแผนที่ความละเอียดสูงสำหรับกระดาษ {{ paperSize }}…</div>
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

.pm-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 23%; gap: 1.2cqw; }
.pm-portrait .pm-body { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
.pm-map-frame { position: relative; min-height: 0; border: 0.15cqw solid #0f172a; overflow: hidden; }
.pm-map { position: absolute; inset: 0; background: #f1f5f9; font-size: 0.95cqw; }
.pm-portrait .pm-map { font-size: 1.4cqw; }
.pm-north { position: absolute; top: 1cqw; right: 1cqw; z-index: 500; display: grid; justify-items: center; padding: 0.4cqw 0.5cqw; background: rgb(255 255 255 / 0.92); border: 1px solid #94a3b8; font-weight: 800; font-size: 1cqw; }
.pm-north svg { width: 1.8cqw; height: 2.4cqw; }
.pm-map-controls { position: absolute; left: 0.8cqw; top: 0.8cqw; z-index: 500; display: flex; flex-direction: column; gap: 4px; }

.pm-legend { display: flex; flex-direction: column; gap: 1cqw; font-size: 0.9cqw; min-height: 0; overflow: hidden; }
.pm-portrait .pm-legend { display: grid; grid-template-columns: repeat(2, 1fr); font-size: 1.35cqw; gap: 1.2cqw 2.4cqw; }
.pm-legend h2 { font-size: 1.05em; font-weight: 800; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25em; margin-bottom: 0.35em; }
.pm-row { display: flex; align-items: center; gap: 0.5em; line-height: 1.35; margin-bottom: 0.25em; }
.pm-dot { display: inline-block; flex: none; width: 1em; height: 1em; border-radius: 999px; border: 1px solid rgb(0 0 0 / 0.25); }
.pm-dot-no { width: 1.6em; height: 1.6em; display: inline-grid; place-items: center; color: #fff; font-weight: 800; font-size: 0.85em; }
.pm-route { flex: none; width: 2em; height: 0; border-top: 0.25em dashed #e11d48; }
.pm-table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
.pm-table th { text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; padding: 0.2em 0.2em; }
.pm-table td { border-bottom: 1px solid #e2e8f0; padding: 0.25em 0.2em; white-space: nowrap; }
.pm-note { font-size: 0.9em; color: #475569; line-height: 1.4; }
.pm-foot { display: flex; justify-content: space-between; gap: 2cqw; border-top: 0.25cqw solid #0f172a; padding-top: 0.6cqw; font-size: 0.8cqw; color: #475569; }
.pm-portrait .pm-foot { font-size: 1.15cqw; }
</style>

<style>
/* Leaflet labels on the sheet; sizes follow the sheet through the map's cqw font size. */
.pm-icon { background: none; border: none; }
.pm-icon > div { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; font-family: inherit; }
.pm-sample { display: flex; align-items: center; gap: 0.25em; }
.pm-sample-no { display: grid; place-items: center; width: 1.9em; height: 1.9em; border-radius: 999px; border: 0.18em solid #fff; color: #fff; font-weight: 800; box-shadow: 0 1px 3px rgb(0 0 0 / 0.45); }
.pm-sample-ppb { background: rgb(255 255 255 / 0.92); border-radius: 0.3em; padding: 0 0.3em; font-weight: 700; font-size: 0.85em; color: #0f172a; }
.pm-icon > .pm-sample { transform: translate(-0.95em, -50%); }
.pm-place { display: flex; align-items: center; gap: 0.3em; }
.pm-icon > .pm-place { transform: translate(-1em, -50%); }
.pm-place-glyph { display: grid; place-items: center; width: 2em; height: 2em; border-radius: 0.4em; border: 0.15em solid #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 0.45); }
.pm-place-glyph svg { width: 1.25em; height: 1.25em; }
.pm-place-name { background: rgb(255 255 255 / 0.92); border-radius: 0.3em; padding: 0 0.35em; font-weight: 700; color: #065f46; }
.pm-hamlet { background: #1e293b; color: #fff; border: 0.12em solid #fff; border-radius: 999px; padding: 0.1em 0.6em; font-weight: 700; }
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
