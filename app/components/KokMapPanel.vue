<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { communityTargets, publicSurveyGridCells, type CommunityTarget, type PublicGridCell } from '../utils/kok-contract'
import { hasPublicMapLayer, publicFloodHistory, publicEvacuationReference, type CommunityMapType } from '../utils/community-map-layers'
import { existingWaterColor, floodDepthLevels, floodImpactStages, loadFloodSimulation, loadFloodScenario, sampleFloodGrid, floodDepthAtPoint, type FloodScenario, type FloodSimulation, type FloodView } from '../utils/flood-simulation'
import { loadMyMapsData, type MyMapsReview, type MyMapsRecord } from '../utils/mymaps-review'
import { loadPublicEvacuation, type EvacuationPoint } from '../utils/public-evacuation'
import { loadObservationRegions, observationDates, observationWaterColor, type ObservationDate, type ObservationRegions } from '../utils/flood-observations'
import { rankEvacuationPriority, priorityTiers, type EvacuationPriority } from '../utils/evacuation-priority'
import KokMyMapsControl from './KokMyMapsControl.vue'

const props = withDefaults(
  defineProps<{
    mapKey: string
    waypoints: SurveyWaypoint[]
    activeThematicLayer: 'arsenic' | 'survey_grid'
    communityMapType: CommunityMapType | null
    floodStage: number
    floodView: FloodView
    floodSensitivity: boolean
    simulationVisible: boolean
    observationsVisible: boolean
    observationDate: ObservationDate
    selectedCommunityId: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'
    zoomScope: 'inner' | 'outer'
    waterwayRequestTrigger: number
    virtualPolygonActive: boolean
    isFullScreen?: boolean
  }>(),
  {
    isFullScreen: false,
  },
)

const emit = defineEmits<{
  (e: 'update:activeThematicLayer', value: 'arsenic' | 'survey_grid'): void
  (e: 'update:zoomScope', value: 'inner' | 'outer'): void
  (e: 'update:floodStage', value: number): void
  (e: 'update:communityMapType', value: CommunityMapType | null): void
  (e: 'update:selectedCommunityId', value: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'): void
  (e: 'selectWaypoint', waypoint: SurveyWaypoint): void
  (e: 'selectGridCell', cell: PublicGridCell): void
  (e: 'waterwayLoaded', message: string): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const evacuationError = ref(false)
const evacuationPoints = ref<EvacuationPoint[]>([])
const evacuationRoutes = ref<Array<Array<[number, number]>>>([])
const routesRoadAligned = ref(false)
const myMapsData = shallowRef<MyMapsReview | null>(null)
const myMapsLayerId = ref('')
const floodSimulationData = shallowRef<FloodSimulation | null>(null)
const floodScenarioData = shallowRef<FloodScenario | null>(null)
let requestedFloodStage: number | null = null
const floodSimulationError = ref(false)
const observationRegions = shallowRef<ObservationRegions | null>(null)
const loadedObservationDate = ref<ObservationDate | null>(null)
const observationError = ref(false)
let requestedObservationDate: ObservationDate | null = null
const reviewSymbols = {
  elderly: { label: 'บ้านที่มีผู้สูงอายุ', color: '#DC2626', path: '<circle cx="12" cy="4" r="2"/><path d="m9 22 2-7-3-4 3-4 4 3 3 1m-7 4 4 7m4-10v10"/>' },
  disability: { label: 'บ้านที่มีคนพิการ', color: '#C2410C', path: '<circle cx="13" cy="4" r="2"/><path d="m12 8-1 7h6l3 6M11 10h6M8 12a5 5 0 1 0 7 7"/>' },
  children: { label: 'บ้านที่มีเด็กอายุต่ำกว่า 15 ปี', color: '#A16207', path: '<circle cx="12" cy="5" r="3"/><path d="m5 10 7 3 7-3m-7 3v5m0 0-4 4m4-4 4 4"/>' },
  children_elderly: { label: 'บ้านที่มีเด็กอายุต่ำกว่า 15 ปีและผู้สูงอายุมากกว่า 1 คนอาศัย', color: '#1F2937', path: '<circle cx="9" cy="6" r="3"/><circle cx="18" cy="9" r="2"/><path d="M3 21v-5a6 6 0 0 1 12 0v5m2-7a4 4 0 0 1 5 4v3"/>' },
}

const priorityShortLabel: Record<EvacuationPoint['kind'], string> = {
  elderly: 'ผู้สูงอายุ',
  disability: 'คนพิการ',
  children: 'เด็ก<15ปี',
  children_elderly: 'เด็ก+ผู้สูงอายุ',
}

// Active mode: ranks the same household points by flood-simulation depth x vulnerability,
// reusing floodSimulationData already loaded for the flood overlay instead of new data.
const prioritizeActive = ref(false)
const evacuationPriorityList = computed<EvacuationPriority[]>(() => {
  const grid = floodSimulationData.value?.grid
  if (!grid || !evacuationPoints.value.length) return []
  return rankEvacuationPriority(evacuationPoints.value, grid, props.floodStage)
})
const evacuationPriorityById = computed(() => new Map(evacuationPriorityList.value.map((item) => [item.point.id, item])))

let L: typeof import('leaflet') | null = null
let mapInstance: import('leaflet').Map | null = null
let baseTileLayer: import('leaflet').TileLayer | null = null
let labelTileLayer: import('leaflet').TileLayer | null = null
let thematicGroup: import('leaflet').LayerGroup | null = null
let communityMapGroup: import('leaflet').LayerGroup | null = null
let simulationMapGroup: import('leaflet').LayerGroup | null = null
let evacuationRenderer: import('leaflet').SVG | null = null
let observationMapGroup: import('leaflet').LayerGroup | null = null
let observationRenderer: import('leaflet').Canvas | null = null
let floodRenderer: import('leaflet').Canvas | null = null
let waterwayGroup: import('leaflet').LayerGroup | null = null
let virtualPolygonLayer: import('leaflet').Polygon | null = null

function levelColor(ppb: number): string {
  if (ppb < 5) return '#32D74B'
  if (ppb <= 10) return '#F7E752'
  return '#FF453A'
}

function updateBaseLayer() {
  if (!L || !mapInstance) return

  if (baseTileLayer) {
    baseTileLayer.remove()
    baseTileLayer = null
  }
  if (labelTileLayer) {
    labelTileLayer.remove()
    labelTileLayer = null
  }

  // Pure OpenStreetMap (OSM)
  baseTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  }).addTo(mapInstance)

  // Ensure vector layers remain on top of base tiles
  thematicGroup?.eachLayer((layer: any) => layer.bringToFront?.())
  waterwayGroup?.eachLayer((layer: any) => layer.bringToFront?.())
}

function communityPinIcon(color: string, path: string, className: string) {
  return L!.divIcon({
    className, iconSize: [24, 30], iconAnchor: [12, 30], popupAnchor: [0, -27],
    html: `<svg width="20" height="27" viewBox="0 0 26 34" style="position:absolute;left:2px;bottom:0" aria-hidden="true"><path d="M13 1C6.4 1 1 6.4 1 13c0 8 12 20 12 20s12-12 12-20C25 6.4 19.6 1 13 1Z" fill="${color}" stroke="white" stroke-width="1.5"/><svg x="6" y="5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></svg>`,
  })
}

function renderObservationLayer() {
  observationMapGroup?.clearLayers()
  if (!L || !observationMapGroup || !props.observationsVisible || (props.selectedCommunityId !== 'thaton' && props.selectedCommunityId !== 'all') || !['flood', 'evacuation'].includes(props.communityMapType ?? '') || myMapsLayerId.value) return
  const date = props.observationDate
  if (loadedObservationDate.value !== date) {
    if (requestedObservationDate !== date) {
      requestedObservationDate = date
      observationError.value = false
      void loadObservationRegions(date).then((data) => {
        if (requestedObservationDate !== date) return
        observationRegions.value = data
        loadedObservationDate.value = date
        renderObservationLayer()
      }).catch(() => { if (requestedObservationDate === date) { observationError.value = true; requestedObservationDate = null } })
    }
    return
  }
  observationRenderer ??= L.canvas({ padding: 0.5, pane: 'flood-observations' })
  for (const feature of observationRegions.value?.features ?? []) {
    const water = feature.properties.kind === 'water'
    const rings: Array<Array<[number,number]>> = feature.geometry.coordinates.map((ring) => ring.map((p) => [p[1]!,p[0]!]))
    const popup = document.createElement('div')
    popup.textContent = `${observationDates.find((item) => item.date === date)?.label} · Sentinel-2 · ${water ? 'พื้นที่น้ำที่ตรวจพบ รวมแหล่งน้ำเดิม ไม่ใช่ความลึกน้ำ' : 'เมฆหรือข้อมูลที่ประเมินไม่ได้ ไม่ได้หมายถึงพื้นที่แห้ง'}`
    L.polygon(rings,{renderer:observationRenderer,stroke:water,color:observationWaterColor,weight:.8,opacity:.85,fillColor:water ? observationWaterColor : '#64748B',fillOpacity:water ? .5 : .3,smoothFactor:0,bubblingMouseEvents:false})
      .bindPopup(popup,{autoPan:false}).addTo(observationMapGroup)
  }
}

function renderFloodSimulationLayer() {
  simulationMapGroup?.clearLayers()
  if (!L || !simulationMapGroup || !props.simulationVisible || (props.selectedCommunityId !== 'thaton' && props.selectedCommunityId !== 'all') || !['flood', 'evacuation'].includes(props.communityMapType ?? '') || myMapsLayerId.value) return
  if (!floodSimulationData.value) {
    if (!floodSimulationError.value) void loadFloodSimulation().then((data) => {
      floodSimulationData.value = data
      renderFloodSimulationLayer()
    }).catch(() => { floodSimulationError.value = true })
    return
  }
  const data = floodSimulationData.value
  const stage = props.floodStage
  const scenario = floodScenarioData.value
  if (!scenario || scenario.riseMetres !== stage) {
    if (requestedFloodStage !== stage) {
      requestedFloodStage = stage
      floodSimulationError.value = false
      void loadFloodScenario(stage).then((result) => {
        if (props.floodStage === stage) {
          floodScenarioData.value = result
          renderFloodSimulationLayer()
        }
      }).catch(() => { if (props.floodStage === stage) floodSimulationError.value = true })
    }
    return
  }
  floodRenderer ??= L.canvas({ padding: 0.5, pane: 'flood-simulation' })
  const [[south,west],[north,east]] = data.bounds
  L.polygon([
    [[-85,-180],[-85,180],[85,180],[85,-180]],
    [[south,west],[north,west],[north,east],[south,east]],
  ], { renderer:floodRenderer,stroke:false,fillColor:'#64748B',fillOpacity:.16,bubblingMouseEvents:false })
    .on('click',inspectFloodPoint).addTo(simulationMapGroup)
  for (const feature of data.waterFeatures) {
    const rings: Array<Array<[number,number]>> = feature.geometry.coordinates.map((ring) => ring.map((p) => [p[1]!,p[0]!]))
    L.polygon(rings,{renderer:floodRenderer,stroke:false,fillColor:existingWaterColor,fillOpacity:.65,smoothFactor:0,bubblingMouseEvents:false})
      .on('click',inspectFloodPoint).addTo(simulationMapGroup)
  }
  if (props.floodSensitivity) {
    for (const feature of scenario.potentialFeatures) {
      const rings: Array<Array<[number,number]>> = feature.geometry.coordinates.map((ring) => ring.map((p) => [p[1]!,p[0]!]))
      L.polygon(rings,{renderer:floodRenderer,color:'#A16207',weight:1.6,dashArray:'6 5',opacity:.9,fillColor:'#EAB308',fillOpacity:.07,smoothFactor:0,bubblingMouseEvents:false})
        .on('click',inspectFloodPoint).addTo(simulationMapGroup)
    }
  }
  const onset = props.floodView === 'onset'
  for (const feature of (onset ? scenario?.impactFeatures : scenario?.features) ?? []) {
    const level = floodDepthLevels.find((item) => item.id === feature.properties.level)
    const first = floodImpactStages.find((item) => item.riseMetres === feature.properties.firstRiseMetres)
    const color = onset ? first!.color : level!.color
    const bounds: Array<Array<[number, number]>> = feature.geometry.coordinates.map((ring) => ring.map((p) => [p[1]!, p[0]!]))
    L.polygon(bounds, { renderer: floodRenderer, stroke: false, color, fillColor: color, fillOpacity: 0.30, smoothFactor: 0, bubblingMouseEvents: false })
      .on('click',inspectFloodPoint).addTo(simulationMapGroup)
  }
}

function renderCommunityMapLayer() {
  communityMapGroup?.clearLayers()
  mapInstance?.closePopup()
  renderObservationLayer()
  renderFloodSimulationLayer()
  const sourceLayer = (props.selectedCommunityId==='thaton' || props.selectedCommunityId==='all') && myMapsData.value?.layers.find((layer) => layer.id===myMapsLayerId.value)
  if (sourceLayer && L && communityMapGroup) {
    // Preserve overlapping source rows in one popup, never move household coordinates.
    const groups = new Map<string,MyMapsRecord[]>()
    for (const record of sourceLayer.records) {
      const key = `${record.latitude},${record.longitude}`
      groups.set(key,[...(groups.get(key) ?? []),record])
    }
    for (const records of groups.values()) {
      const point = records[0]!
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = sourceLayer.label
      popup.append(heading)
      for (const record of records) {
        const section = document.createElement('section')
        const status = document.createElement('p')
        status.textContent = `${record.id} · ${record.status}`
        const swatch = document.createElement('span')
        swatch.setAttribute('aria-hidden','true')
        swatch.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:${record.color}`
        status.prepend(swatch)
        section.append(status)
        for (const [key,value] of Object.entries(record.fields)) {
          const row = document.createElement('p')
          row.textContent = `${key}: ${value || 'ไม่ระบุ'}`
          section.append(row)
        }
        popup.append(section)
      }
      const footer = document.createElement('p')
      footer.textContent = 'ที่มา: My Maps · ข้อมูลสำรวจตามต้นฉบับ ไม่ใช่ข้อมูลสด'
      popup.append(footer)
      const label = records.length>1 ? `ข้อมูลสำรวจ ${records.length} แถวที่พิกัดเดียวกัน` : `ข้อมูลสำรวจ ${point.id} · ${point.status}`
      const icon = communityPinIcon(point.color,'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>','community-mymaps-marker')
      L.marker([point.latitude,point.longitude],{icon,title:label,alt:label})
        .bindPopup(popup,{autoPan:false,maxWidth:290,maxHeight:280}).addTo(communityMapGroup)
    }
    return
  }
  if (!L || !communityMapGroup || !props.communityMapType || !hasPublicMapLayer(props.selectedCommunityId, props.communityMapType)) return

  if (props.communityMapType === 'flood') {
    for (const feature of publicFloodHistory.features) {
      const ring = feature.geometry.coordinates[0]!
      const bounds: Array<[number, number]> = ring.map((coord) => [coord[1]!, coord[0]!])
      const popup = document.createElement('div')
      popup.style.maxWidth = '260px'
      popup.textContent = `ประวัติน้ำท่วมจากแบบสำรวจ · ${feature.properties.id}: รายงานน้ำท่วม ${feature.properties.floodedRows} จาก ${feature.properties.records} แถวสำรวจในกริด 1 กม. (Web Mercator) ไม่ใช่จำนวนบ้านหรือขอบเขตน้ำท่วมจริง ไม่ใช่ข้อมูลสด ไม่ทราบวันสำรวจต้นฉบับ แสดงเฉพาะกลุ่มที่ผ่านเกณฑ์ปกปิดข้อมูล ที่มา: ชั้นข้อมูลน้ำท่วม MyMaps KML (คนละชุดพิกัดกับกริด E04)`
      const center = L.latLngBounds(bounds).getCenter()
      const icon = communityPinIcon('#0369A1', '<path d="M2 6c3-4 7 4 10 0s7 4 10 0M2 12c3-4 7 4 10 0s7 4 10 0M2 18c3-4 7 4 10 0s7 4 10 0"/>', 'community-flood-marker')
      L.marker(center, { icon, title: 'ประวัติน้ำท่วมจากแบบสำรวจ ไม่ใช่น้ำท่วมสด', alt: 'เปิดข้อมูลประวัติน้ำท่วมระดับกริด' })
        .bindPopup(popup, { autoPan: false, maxHeight: 180 }).addTo(communityMapGroup)
    }
    return
  }

  if (props.communityMapType === 'evacuation') {
    evacuationRenderer ??= L.svg({ pane: 'evacuation-routes' })
    for (const route of evacuationRoutes.value) {
      L.polyline(route, { renderer: evacuationRenderer, color: '#FFFFFF', weight: 6, opacity: 0.85, interactive: false, smoothFactor:0 }).addTo(communityMapGroup)
      const popup = document.createElement('div')
      popup.textContent = routesRoadAligned.value
        ? 'เส้นทางตามแผน PDF และช่วงเชื่อมตามถนน OpenStreetMap · ยังไม่ยืนยันภาคสนาม ไม่ใช่การนำทางหรือการยืนยันว่าถนนปลอดภัยในปัจจุบัน'
        : 'เส้นทางอพยพตามภาพ PDF · ตำแหน่งประมาณ ยังไม่ยืนยันภาคสนาม ไม่ใช่เส้นทางนำทางหรือประกาศความปลอดภัยปัจจุบัน'
      L.polyline(route, { renderer: evacuationRenderer, color: '#D97706', weight: 3.5, dashArray: '7 5', smoothFactor:0, className: 'community-evacuation-route' })
        .bindPopup(popup, { autoPan: false }).addTo(communityMapGroup)
    }
    for (const point of publicEvacuationReference.points) {
      const shelter = point.kind === 'shelter'
      const color = shelter ? '#B45309' : '#047857'
      const path = shelter
        ? '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>'
        : '<path d="M4 22V3m0 0c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>'
      const icon = communityPinIcon(color, path, 'community-evacuation-marker')
      const label = `${point.label} · ตำแหน่งประมาณ`
      L.marker([point.latitude, point.longitude], { icon, alt: label, interactive:false, keyboard:false })
        .addTo(communityMapGroup)
    }
    const priorityRank = new Map(evacuationPriorityList.value.map((item, index) => [item.point.id, index + 1]))
    for (const point of evacuationPoints.value) {
      const symbol = reviewSymbols[point.kind]
      if (!symbol) continue
      const priority = prioritizeActive.value ? evacuationPriorityById.value.get(point.id) : null
      const color = priority ? priority.tier.color : symbol.color
      const label = priority
        ? `${symbol.label} · ลำดับอพยพ ${priorityRank.get(point.id)} · ${priority.tier.label} (คะแนน ${priority.score})`
        : symbol.label
      const icon = communityPinIcon(color, symbol.path, 'community-household-review-marker')
      L.marker([point.latitude, point.longitude], { icon, alt: label, title: label, interactive: false, keyboard: false })
        .addTo(communityMapGroup)
    }
    return
  }

  if (props.communityMapType === 'hamlets') {
    for (const cell of publicSurveyGridCells) {
      const poly = L.polygon(cell.latLngBounds, {
        color: '#6D28D9',
        weight: 2,
        dashArray: '5 5',
        fillColor: '#8B5CF6',
        fillOpacity: 0.15,
      })
      poly.bindPopup(
        `<strong>โซนหย่อมบ้าน / กริดสำรวจ 1 กม. ${cell.cellId}</strong><br/>` +
        `จำนวนแถวสำรวจ: <strong>${cell.records}</strong> ครัวเรือน (${cell.unit})<br/>` +
        `เกณฑ์ปกป้องข้อมูลส่วนบุคคล k>=5 (อ้างอิงแผนเผชิญเหตุ 9 หย่อมบ้าน R05/R15)`,
      )
      poly.addTo(communityMapGroup)
    }
    return
  }

  if (props.communityMapType === 'places') {
    for (const point of publicEvacuationReference.points) {
      const isShelter = point.kind === 'shelter'
      const icon = communityPinIcon(
        isShelter ? '#047857' : '#0369A1',
        isShelter
          ? '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>'
          : '<path d="M4 22V3m0 0c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>',
        'community-place-marker',
      )
      const popup = document.createElement('div')
      popup.innerHTML = `<strong>${point.label}</strong><br/><span style="color:#64748b;font-size:11px;">สถานที่สำคัญตามแผนเผชิญเหตุท่าตอน</span>`
      L.marker([point.latitude, point.longitude], { icon, title: point.label })
        .bindPopup(popup)
        .addTo(communityMapGroup)
    }
    return
  }
}

function inspectFloodPoint(event: import('leaflet').LeafletMouseEvent) {
  const data = floodSimulationData.value
  if (!L || !mapInstance || !data || (props.selectedCommunityId !== 'thaton' && props.selectedCommunityId !== 'all') || props.communityMapType !== 'flood' || !props.simulationVisible) return
  const sample = sampleFloodGrid(data.grid, event.latlng.lat, event.latlng.lng)
  const content = document.createElement('div')
  if (!sample) content.textContent = 'จุดนี้อยู่นอกขอบเขตข้อมูลแบบจำลอง'
  else if (sample.waterMask !== 0) content.textContent = 'แหล่งน้ำเดิมตามข้อมูลแบบจำลอง · สีฟ้าไม่ใช่พื้นที่แห้ง ยังไม่คำนวณความลึกท้องน้ำ เพราะไม่มีข้อมูลท้องน้ำสำรวจ'
  else if (sample.requiredRiseMetres == null) content.textContent = 'ยังคำนวณทางน้ำเชื่อมถึงจุดนี้ไม่ได้'
  else {
    const depth = floodDepthAtPoint(sample,props.floodStage)
    const possibleDepth = floodDepthAtPoint(sample,props.floodStage,true)
    const formatDepth = (value: number) => value < .1 ? 'น้อยกว่า 0.1 เมตร' : `${value.toFixed(1)} เมตร`
    const title = document.createElement('strong')
    title.className = 'block text-base'
    title.textContent = depth == null ? 'ยังไม่มีค่าความลึกสำหรับจุดนี้' : depth > 0 ? `ความลึกประมาณ ${formatDepth(depth)}` : 'ยังไม่พบท่วมในผลหลักที่ระดับนี้'
    content.append(title,document.createElement('br'),`เมื่อแม่น้ำเพิ่ม +${props.floodStage} ม. · น้ำเหนือพื้นดินบริเวณนี้`)
    if (props.floodSensitivity && possibleDepth != null && possibleDepth > 0) {
      content.append(document.createElement('br'),`กรณีเผื่อพื้นดินต่ำลง: ลึกประมาณ ${formatDepth(possibleDepth)} (สมมติฐานแยกจากผลหลัก)`)
    }
    content.append(document.createElement('br'),'ค่าประมาณของเซลล์ใกล้จุดที่กด ขนาดประมาณ 30 ม. ยังไม่ใช่ผลวัดจริง')
    const next = data.availableStages.find((rise) => rise > sample.requiredRiseMetres!)
    if (depth === 0 && next != null && next > props.floodStage) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = `ทดลองน้ำเพิ่ม +${next} ม.`
      button.className = 'mt-3 rounded-lg bg-sky-100 px-3 py-2 font-semibold text-sky-900'
      button.addEventListener('click', () => emit('update:floodStage', next))
      content.append(document.createElement('br'),button)
    }
  }
  L.popup({autoPan:false,maxWidth:280}).setLatLng(event.latlng).setContent(content).openOn(mapInstance)
}

function renderThematicLayers() {
  if (!L || !mapInstance || !thematicGroup) return
  thematicGroup.clearLayers()

  // ซ่อนจุดตรวจสารเคมีเมื่อผู้ใช้เลือกแท็บอื่น (หย่อมบ้าน, สถานที่สำคัญ, อพยพกลุ่มเปราะบาง)
  if (props.communityMapType && props.communityMapType !== 'chemical') {
    return
  }

  // Community landmark rings removed upon user request

  if (props.activeThematicLayer === 'survey_grid') {
    for (const cell of publicSurveyGridCells) {
      const ratio = cell.records / 57
      const fillOpacity = 0.25 + ratio * 0.45
      const poly = L.polygon(cell.latLngBounds, {
        color: '#00E5FF',
        weight: 2,
        fillColor: '#00E5FF',
        fillOpacity,
      })
      poly.bindPopup(
        `<strong>กริดสำรวจ 1 กม. ช่อง ${cell.cellId}</strong><br/>` +
          `จำนวนแถวสำรวจ: <strong>${cell.records}</strong> แถว (${cell.unit})<br/>` +
          `เกณฑ์ปกป้องข้อมูลส่วนบุคคล k>=5 (ไม่แสดงพิกัดบ้านรายหลัง R05/R15)`,
      )
      poly.on('click', () => emit('selectGridCell', cell))
      poly.addTo(thematicGroup)
    }
    return
  }

  const clusters = clusterSurveyWaypoints(props.waypoints)
  if (typeof window !== 'undefined') {
    ;(window as any).__selectKokWaypoint = (code: string) => {
      const target = props.waypoints.find((w) => w.sample_code === code)
      if (target) emit('selectWaypoint', target)
    }
  }

  for (const cluster of clusters) {
    const color = levelColor(cluster.maxPpb)
    const circle = L.circleMarker([cluster.latitude, cluster.longitude], {
      radius: cluster.sampleCount > 1 ? 7 : 5,
      color: '#121212',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.92,
    })

    const sampleCode = cluster.latest.sample_code
    const contributor = cluster.latest.contributor_label || 'ผู้ส่งผลตรวจ'
    const statusText = cluster.maxPpb > 10 ? 'เกินเกณฑ์ คพ.' : cluster.maxPpb >= 5 ? 'เฝ้าระวัง' : 'ปกติ'
    const statusColor = cluster.maxPpb > 10 ? '#FF453A' : cluster.maxPpb >= 5 ? '#FF9F0A' : '#32D74B'

    circle.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1e293b; min-width: 210px;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #0f172a;">
          ${cluster.latest.station_name || `จุดตรวจ ${sampleCode}`}
        </div>
        <div style="margin-bottom: 3px;">
          รหัส: <code style="font-weight: bold; background: #f1f5f9; padding: 1px 4px; border-radius: 4px;">${sampleCode}</code>
        </div>
        <div style="margin-bottom: 3px;">
          สารหนู: <strong style="font-size: 14px; color: ${statusColor};">${cluster.maxPpb} ppb</strong>
          <span style="font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 4px; background: ${statusColor}22; color: ${statusColor}; margin-left: 4px;">${statusText}</span>
        </div>
        <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">
          เกณฑ์ คพ.: &le; 10 ppb (น้ำผิวดิน)
        </div>
        <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
          ผู้บันทึก: <span style="color: #0284c7; font-weight: 500;">${contributor}</span>
        </div>
        ${cluster.sampleCount > 1 ? `<div style="font-size: 11px; color: #d97706; margin-bottom: 6px; font-weight: bold;">🔥 ตรวจแล้ว ${cluster.sampleCount} ครั้งในบริเวณนี้</div>` : ''}
        <button
          onclick="window.__selectKokWaypoint && window.__selectKokWaypoint('${sampleCode}')"
          style="width: 100%; background: #0284C7; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;"
        >
          ดูรายละเอียดและกราฟ &rarr;
        </button>
      </div>
    `)

    circle.on('click', () => emit('selectWaypoint', cluster.latest))
    circle.addTo(thematicGroup)
  }
}

async function loadOsmWaterways() {
  if (!L || !mapInstance || !waterwayGroup) return
  try {
    const bounds = mapInstance.getBounds()
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`
    const query = `[out:json][timeout:15];way["waterway"~"river|stream"](${bbox});out geom;`
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    })
    if (!response.ok) {
      emit('waterwayLoaded', 'โหลดเส้นทางน้ำจาก OpenStreetMap ไม่สำเร็จ')
      return
    }
    const data = await response.json()
    waterwayGroup.clearLayers()
    const elements = Array.isArray(data?.elements) ? data.elements : []
    let count = 0
    for (const el of elements) {
      if (Array.isArray(el.geometry) && el.geometry.length > 1) {
        const coords = el.geometry.map((pt: { lat: number; lon: number }) => [pt.lat, pt.lon] as [number, number])
        L.polyline(coords, { color: '#00E5FF', weight: 3, opacity: 0.85 }).addTo(waterwayGroup)
        count += 1
      }
    }
    emit('waterwayLoaded', `แสดงเส้นทางน้ำ ${count} เส้นจาก OpenStreetMap`)
  } catch {
    emit('waterwayLoaded', 'ไม่สามารถเชื่อมต่อ Overpass API ในขณะนี้')
  }
}

function updateVirtualPolygon(active: boolean) {
  if (!L || !mapInstance) return
  if (virtualPolygonLayer) {
    virtualPolygonLayer.remove()
    virtualPolygonLayer = null
  }
  if (active) {
    virtualPolygonLayer = L.polygon(
      [
        [20.052, 99.352],
        [20.052, 99.372],
        [20.066, 99.372],
        [20.066, 99.352],
      ],
      {
        color: '#32D74B',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#32D74B',
        fillOpacity: 0.16,
      },
    )
    virtualPolygonLayer.addTo(mapInstance)
  }
}

function applyScopeAndCommunity() {
  if (!mapInstance) return
  if (props.selectedCommunityId === 'all') {
    mapInstance.flyTo([20.08, 99.85], 9, { duration: 0.6 })
    return
  }
  const target: CommunityTarget | undefined =
    communityTargets.find((item) => item.id === props.selectedCommunityId) ?? communityTargets[0]
  if (!target) return
  const zoom = props.zoomScope === 'inner' ? target.zoomInner : target.zoomOuter
  mapInstance.flyTo(target.center, zoom, { duration: 0.6 })
}

onMounted(async () => {
  if (!mapContainer.value) return
  const leafletModule = await import('leaflet')
  L = (leafletModule.default ?? leafletModule) as typeof import('leaflet')
  // The view can change while Leaflet loads (e.g. ?view=landing), which unmounts this panel.
  if (!mapContainer.value) return

  const initialTarget =
    props.selectedCommunityId === 'all'
      ? communityTargets[0]
      : communityTargets.find((item) => item.id === props.selectedCommunityId) ?? communityTargets[0]
  const initialCenter = initialTarget?.center ?? [20.058, 99.361]
  const initialZoom = props.zoomScope === 'inner' ? (initialTarget?.zoomInner ?? 15) : (initialTarget?.zoomOuter ?? 12)

  mapInstance = L.map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    zoomControl: false,
    attributionControl: false,
  })

  L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(mapInstance)
  mapInstance.on('click', inspectFloodPoint)
  thematicGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('flood-simulation').style.zIndex = '390'
  simulationMapGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('evacuation-routes').style.zIndex = '475'
  communityMapGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('flood-observations').style.zIndex = '450'
  observationMapGroup = L.layerGroup().addTo(mapInstance)
  waterwayGroup = L.layerGroup().addTo(mapInstance)

  updateBaseLayer()
  renderThematicLayers()
  renderCommunityMapLayer()
  applyScopeAndCommunity()

  void loadMyMapsData().then((data) => {
    myMapsData.value = data
  }).catch(() => { /* My Maps data unavailable */ })

  void loadPublicEvacuation().then((data) => {
    evacuationPoints.value = data.points
    evacuationRoutes.value = data.routes
    routesRoadAligned.value = data.routeAlignment === 'offline_osm_road_alignment'
    renderCommunityMapLayer()
  }).catch(() => { evacuationError.value = true })

  const resizeHandler = () => {
    mapInstance?.invalidateSize()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeHandler)
  }
  setTimeout(() => {
    mapInstance?.invalidateSize()
    applyScopeAndCommunity()
  }, 100)
})

watch(() => [props.communityMapType, props.selectedCommunityId, props.floodStage, props.simulationVisible, props.observationsVisible, props.floodView, props.floodSensitivity, props.observationDate], renderCommunityMapLayer)
watch(prioritizeActive, renderCommunityMapLayer)
watch(
  () => props.communityMapType,
  (type) => {
    // Priority ranking needs the flood-simulation grid even when the flood overlay itself is off.
    if (type === 'evacuation' && !floodSimulationData.value && !floodSimulationError.value) {
      void loadFloodSimulation().then((data) => {
        floodSimulationData.value = data
        renderCommunityMapLayer()
      }).catch(() => { floodSimulationError.value = true })
    }
  },
  { immediate: true },
)
watch(myMapsLayerId,(id) => {
  if (id) emit('update:communityMapType',null)
  renderCommunityMapLayer()
})
watch(() => props.communityMapType,(type) => { if (type) myMapsLayerId.value = '' })

watch(
  () => [props.waypoints, props.activeThematicLayer, props.selectedCommunityId, props.communityMapType],
  () => {
    renderThematicLayers()
  },
  { deep: true },
)

watch(
  () => [props.selectedCommunityId, props.zoomScope],
  () => {
      applyScopeAndCommunity()
  },
)

watch(
  () => props.waterwayRequestTrigger,
  (val) => {
    if (val > 0) void loadOsmWaterways()
  },
)

watch(
  () => props.virtualPolygonActive,
  (active) => {
    updateVirtualPolygon(active)
  },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', () => mapInstance?.invalidateSize())
  }
  mapInstance?.remove()
  mapInstance = null
})
</script>

<template>
  <div class="relative w-full h-full" :class="{ 'fixed inset-0': isFullScreen }">
    <KokMyMapsControl v-if="(selectedCommunityId === 'thaton' || selectedCommunityId === 'all') && myMapsData" v-model="myMapsLayerId" :data="myMapsData" />
    <section
      ref="mapContainer"
      role="region"
      aria-label="แผนที่ Leaflet (OpenStreetMap)"
      :class="isFullScreen ? 'h-full w-full rounded-none border-0' : 'wv-map-frame'"
    />
    <aside v-if="(selectedCommunityId === 'thaton' || selectedCommunityId === 'all') && communityMapType === 'evacuation'"
      class="evacuation-legend" aria-label="สีและสัญลักษณ์อพยพ">
      <label class="active-toggle" :class="{ disabled: !evacuationPriorityList.length }">
        <input type="checkbox" v-model="prioritizeActive" :disabled="!evacuationPriorityList.length">
        ⚡ โหมด Active · จัดลำดับอพยพ
      </label>
      <small v-if="!evacuationPriorityList.length" class="active-hint">กำลังโหลดแบบจำลองน้ำท่วมเพื่อคำนวณลำดับ…</small>
      <small v-if="prioritizeActive && evacuationPriorityList.length" class="active-hint">คำนวณจากแบบจำลองน้ำท่วม (ไม่ใช่เซนเซอร์สด) ไม่ใช่การแจ้งเตือนอพยพจริง</small>

      <template v-if="prioritizeActive && evacuationPriorityList.length">
        <section class="priority-list" aria-label="คิวอพยพเรียงตามความเสี่ยง">
          <strong>คิวอพยพ (คะแนน = ความลึกน้ำ × ความเปราะบาง)</strong>
          <ol>
            <li v-for="(item, index) in evacuationPriorityList.filter((p) => p.score > 0).slice(0, 8)" :key="item.point.id">
              <span class="rank" :style="{ background: item.tier.color }">{{ index + 1 }}</span>
              <span class="row-label">{{ priorityShortLabel[item.point.kind] }} · น้ำลึก {{ item.depthMetres }} ม.</span>
              <span class="tier-dot" :style="{ background: item.tier.color }" :title="item.tier.label" />
            </li>
          </ol>
        </section>
        <div v-for="tier in priorityTiers" :key="tier.id"><span :style="{ background: tier.color }" />{{ tier.label }}</div>
      </template>
      <template v-else>
        <strong>สีและสัญลักษณ์</strong>
        <div><span style="background:#B45309" />ศูนย์พักพิง</div>
        <div><span style="background:#047857" />จุดรวมพล</div>
        <template v-if="evacuationPoints.length">
          <div><span :style="{background:reviewSymbols.elderly.color}" />บ้านที่มีผู้สูงอายุ</div>
          <div><span :style="{background:reviewSymbols.disability.color}" />บ้านที่มีคนพิการ</div>
          <div><span :style="{background:reviewSymbols.children.color}" />บ้านที่มีเด็กอายุต่ำกว่า 15 ปี</div>
          <div><span :style="{background:reviewSymbols.children_elderly.color}" />เด็ก &lt;15 ปี และผู้สูงอายุ &gt;1 คน</div>
        </template>
      </template>
      <div v-if="evacuationRoutes.length"><span class="route-swatch" />เส้นทางตามแผน</div>
      <section v-if="simulationVisible || observationsVisible" class="water-legend" aria-label="สีน้ำท่วม">
        <template v-if="simulationVisible">
          <strong>น้ำจำลอง +{{ floodStage }} ม.</strong>
          <div v-for="level in floodDepthLevels" :key="level.id"><span :style="{background:level.color}" />{{ level.label }}</div>
          <small v-if="floodSimulationError">โหลดแบบจำลองไม่สำเร็จ</small>
        </template>
        <div v-if="observationsVisible"><span :style="{background:observationWaterColor}" />ข้อมูลน้ำท่วมจริง</div>
      </section>

    </aside>

  </div>
</template>

<style scoped>
.evacuation-legend { position:absolute; right:16px; bottom:96px; z-index:1000; width:max-content; max-width:calc(100vw - 32px); padding:10px 12px; border-radius:12px; background:var(--wv-card,white); color:var(--wv-text,#0f172a); box-shadow:0 4px 18px #0002; font-size:11px; line-height:1.5; pointer-events:none; }
.evacuation-legend strong { display:block; margin-bottom:6px; font-size:12px; }
.evacuation-legend div { display:flex; align-items:center; gap:7px; margin-top:4px; }
.evacuation-legend span { width:10px; height:10px; flex-shrink:0; border-radius:50%; }
.water-legend { margin-top:8px; padding-top:8px; border-top:1px solid #94a3b844; }
.evacuation-legend .route-swatch { height:0; border-top:2px dashed #D97706; border-radius:0; }
.active-toggle { display:flex; align-items:center; gap:7px; font-weight:700; font-size:12px; pointer-events:auto; cursor:pointer; margin-bottom:4px; }
.active-toggle.disabled { opacity:.5; cursor:not-allowed; }
.active-toggle input { pointer-events:auto; }
.active-hint { display:block; color:#64748b; margin-bottom:6px; }
.priority-list { pointer-events:auto; margin:6px 0 8px; padding-top:6px; border-top:1px solid #94a3b844; max-width:280px; }
.priority-list ol { list-style:none; margin:6px 0 0; padding:0; max-height:220px; overflow-y:auto; }
.priority-list li { display:flex; align-items:center; gap:7px; margin-top:5px; min-width:0; }
.priority-list .rank { width:16px; height:16px; border-radius:5px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px; font-weight:800; }
.priority-list .row-label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.priority-list .tier-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
@media (max-width:767px) { .evacuation-legend { bottom:208px; right:12px; padding:8px 10px; font-size:10px; } }
</style>
