<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { communityTargets, publicSurveyGridCells, type CommunityTarget, type PublicGridCell } from '../utils/kok-contract'
import { arsenicLevel, arsenicLevelMeta } from '../../src/lib/arsenic'
import { buildChemicalPopup } from '../utils/chemical-popup'
import { hasPublicMapLayer, publicFloodHistory, publicEvacuationReference, type CommunityMapType } from '../utils/community-map-layers'
import { existingWaterColor, floodDepthLevels, floodImpactStages, loadFloodSimulation, loadFloodScenario, sampleFloodGrid, floodDepthAtPoint, type FloodScenario, type FloodSimulation, type FloodView } from '../utils/flood-simulation'
import { loadMyMapsData, type MyMapsReview } from '../utils/mymaps-review'
import { loadPublicEvacuation } from '../utils/public-evacuation'
import { publicMapData, loadPublicMapData } from '../utils/map-data-public'
import { pinIconOptions } from '../utils/map-pin'
import { PLACE_KINDS } from '../../src/lib/map-data'
import { loadObservationRegions, observationYears, observationWaterColor, type ObservationDate, type ObservationRegions } from '../utils/flood-observations'
import { rankEvacuationPriority, priorityTiers, type EvacuationPriority, type PriorityPoint } from '../utils/evacuation-priority'

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
    waterwayRequestTrigger: number
    virtualPolygonActive: boolean
    isFullScreen?: boolean
    evacuationModeActive?: boolean
    evacuationQueue?: any[]
    selectedEvacuationCase?: any | null
    evacuationDestinations?: any[]
  }>(),
  {
    isFullScreen: false,
    evacuationModeActive: false,
    evacuationQueue: () => [],
    selectedEvacuationCase: null,
    evacuationDestinations: () => [],
  },
)

const emit = defineEmits<{
  (e: 'update:activeThematicLayer', value: 'arsenic' | 'survey_grid'): void
  (e: 'update:floodStage', value: number): void
  (e: 'update:selectedCommunityId', value: 'all' | 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'): void
  (e: 'selectWaypoint', waypoint: SurveyWaypoint): void
  (e: 'selectGridCell', cell: PublicGridCell): void
  (e: 'waterwayLoaded', message: string): void
  (e: 'selectEvacuationCase', item: any): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const evacuationError = ref(false)
const evacuationRoutes = ref<Array<Array<[number, number]>>>([])
const routesRoadAligned = ref(false)
const myMapsData = shallowRef<MyMapsReview | null>(null)
const floodSimulationData = shallowRef<FloodSimulation | null>(null)
const floodScenarioData = shallowRef<FloodScenario | null>(null)
let requestedFloodStage: number | null = null
const floodSimulationError = ref(false)
const observationRegions = shallowRef<ObservationRegions | null>(null)
const loadedObservationDate = ref<ObservationDate | null>(null)
const observationError = ref(false)
let requestedObservationDate: ObservationDate | null = null
// The evacuation tab shows the households of My Maps layer-1 "กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต" (the same data as ข้อมูลชุมชน).
// Level 5 (ปกติ) is left out, as in the evacuation queue. Weight = how early the household should be helped.
const householdWeight: Record<string, number> = { '1': 4, '2': 3, '4': 2 }
const householdLevel = (text: string) => text.trim().charAt(0)
const householdLayer = computed(() => myMapsData.value?.layers.find((layer) => layer.id === 'layer-1') ?? null)
const evacuationHouseholds = computed(() => (householdLayer.value?.records ?? []).filter((record) => householdLevel(record.status) in householdWeight))
const evacuationLegend = computed(() => (householdLayer.value?.legend ?? []).filter((item) => householdLevel(item.label) in householdWeight))
const priorityPoints = computed<PriorityPoint[]>(() => evacuationHouseholds.value.map((record) => ({
  id: record.id,
  latitude: record.latitude,
  longitude: record.longitude,
  weight: householdWeight[householdLevel(record.status)]!,
  label: record.status.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)$/, ''),
})))

// Active mode: ranks the same household points by flood-simulation depth x vulnerability,
// reusing floodSimulationData already loaded for the flood overlay instead of new data.
const prioritizeActive = ref(false)
// Evacuation legend: open on a wide screen, folded on a phone (set once mounted, so server and browser agree).
const legendOpen = ref(true)
const evacuationPriorityList = computed<EvacuationPriority[]>(() => {
  const grid = floodSimulationData.value?.grid
  if (!grid || !priorityPoints.value.length) return []
  return rankEvacuationPriority(priorityPoints.value, grid, props.floodStage)
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
let communityOverviewGroup: import('leaflet').LayerGroup | null = null

function levelColor(ppb: number): string {
  return arsenicLevelMeta[arsenicLevel(ppb)].hex
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
  return L!.divIcon(pinIconOptions(color, path, className))
}

// ที่หมายอพยพ: ใช้ทะเบียนสถานที่ที่ผู้ดูแลแก้ได้เมื่อ API ตอบแล้ว ไม่งั้นใช้ไฟล์เดิม (หน้าบ้านไม่พังเมื่อฐานข้อมูลล่ม)
function evacuationDestinationList() {
  if (publicMapData.placesOk) {
    return publicMapData.places.placed
      .filter((place) => (place.kind === 'shelter' || place.kind === 'assembly') && place.communityId === 'thaton')
      .map((place) => ({ label: place.name, latitude: place.latitude!, longitude: place.longitude!, color: place.evacuationColor, path: place.path }))
  }
  return publicEvacuationReference.points.map((point) => {
    const kind = PLACE_KINDS[point.kind === 'shelter' ? 'shelter' : 'assembly']
    return { label: point.label, latitude: point.latitude, longitude: point.longitude, color: kind.evacuationColor ?? kind.color, path: kind.path }
  })
}

const placesPendingHere = computed(() => publicMapData.places.pending.filter((place) => props.selectedCommunityId === 'all' || place.communityId === props.selectedCommunityId))

function renderObservationLayer() {
  observationMapGroup?.clearLayers()
  if (!L || !observationMapGroup || !props.observationsVisible || (props.selectedCommunityId !== 'thaton' && props.selectedCommunityId !== 'all') || !['flood', 'evacuation'].includes(props.communityMapType ?? '')) return
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
    popup.textContent = `${observationYears.find((item) => item.date === date)?.label} · Sentinel-1/2 · ค่าเฉลี่ยพื้นที่น้ำรวมแม่น้ำและน้ำท่วมรอบนอก ไม่ใช่ความลึกน้ำ`
    L.polygon(rings,{renderer:observationRenderer,stroke:water,color:observationWaterColor,weight:.8,opacity:.85,fillColor:water ? observationWaterColor : '#64748B',fillOpacity:water ? .5 : .3,smoothFactor:0,bubblingMouseEvents:false})
      .bindPopup(popup,{autoPan:false}).addTo(observationMapGroup)
  }
}

function renderFloodSimulationLayer() {
  simulationMapGroup?.clearLayers()
  if (!L || !simulationMapGroup || !props.simulationVisible || (props.selectedCommunityId !== 'thaton' && props.selectedCommunityId !== 'all') || !['flood', 'evacuation'].includes(props.communityMapType ?? '')) return
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
    if (props.evacuationModeActive && L) {
      const queue = props.evacuationQueue || []
      const destinations = props.evacuationDestinations || []
      const sel = props.selectedEvacuationCase
      const levelColors: Record<number, string> = {
        1: '#A52714',
        2: '#E65100',
        4: '#673AB7',
        5: '#0F9D58',
      }

      for (const q of queue) {
        const isArrived = q.status === 'arrived'
        const isSel = sel && sel.id === q.id
        const color = isArrived ? '#16A34A' : (levelColors[q.level] || '#A52714')
        const iconHtml = `<div class="ev-pin ${isSel ? 'sel' : ''}" style="background:${color}">${isArrived ? '✓' : q.rank}</div>`
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [0, 0] })
        const marker = L.marker([q.latitude, q.longitude], { icon, zIndexOffset: isSel ? 3000 : 1000 - q.rank })
        marker.on('click', () => {
          emit('selectEvacuationCase', q)
        })
        marker.addTo(communityMapGroup)
      }

      for (const d of destinations) {
        const isDestSel = sel && (sel.destinationId === d.id || sel.destinationLabel === d.label)
        const iconHtml = `<div class="ev-dpin ${isDestSel ? 'sel' : ''}">⌂ ${d.label}</div>`
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [0, 0] })
        L.marker([d.latitude, d.longitude], { icon, zIndexOffset: 2000 }).addTo(communityMapGroup)
      }

      if (sel) {
        const dest = destinations.find((d: any) => d.id === sel.destinationId || d.label === sel.destinationLabel)
        if (dest) {
          L.polyline([[sel.latitude, sel.longitude], [dest.latitude, dest.longitude]], {
            color: '#1D4ED8',
            weight: 4,
            dashArray: '8 6',
          }).addTo(communityMapGroup)
        }
      }
      return
    }

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
    for (const point of evacuationDestinationList()) {
      const icon = communityPinIcon(point.color, point.path, 'community-evacuation-marker')
      const label = `${point.label} · ตำแหน่งประมาณ`
      L.marker([point.latitude, point.longitude], { icon, alt: label, interactive:false, keyboard:false })
        .addTo(communityMapGroup)
    }
    const priorityRank = new Map(evacuationPriorityList.value.map((item, index) => [item.point.id, index + 1]))
    for (const record of evacuationHouseholds.value) {
      const priority = prioritizeActive.value ? evacuationPriorityById.value.get(record.id) : null
      const color = priority ? priority.tier.color : record.color
      const label = priority
        ? `ครัวเรือน ${record.id} · ลำดับอพยพ ${priorityRank.get(record.id)} · ${priority.tier.label} (คะแนน ${priority.score})`
        : `ครัวเรือน ${record.id} · ${record.status}`
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = `ครัวเรือน ${record.id}`
      popup.append(heading)
      for (const [key, value] of [['ระดับ', record.status], ...Object.entries(record.fields)]) {
        const row = document.createElement('p')
        row.textContent = `${key.replace(/_/g, ' ')}: ${String(value).replace(/\.0$/, '') || 'ไม่ระบุ'}`
        popup.append(row)
      }
      if (priority) {
        const rank = document.createElement('p')
        rank.textContent = `ลำดับอพยพจากแบบจำลอง: ${priorityRank.get(record.id)} · ${priority.tier.label}`
        popup.append(rank)
      }
      const footer = document.createElement('p')
      footer.textContent = 'ที่มา: ข้อมูลชุมชน (My Maps) · แบบสำรวจไม่ระบุวันที่ ไม่ใช่ข้อมูลสด'
      popup.append(footer)
      const icon = communityPinIcon(color, '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>', 'community-household-review-marker')
      L.marker([record.latitude, record.longitude], { icon, alt: label, title: label })
        .bindPopup(popup, { autoPan: false, maxWidth: 290, maxHeight: 280 }).addTo(communityMapGroup)
    }
    return
  }

  if (props.communityMapType === 'hamlets') {
    for (const hamlet of publicMapData.hamlets) {
      if (!hamlet.center) continue
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = hamlet.name
      popup.append(heading)
      const households = document.createElement('p')
      households.textContent = hamlet.householdsLabel || `${hamlet.households} ครัวเรือน`
      popup.append(households)
      if (hamlet.note) {
        const note = document.createElement('p')
        note.textContent = hamlet.note
        popup.append(note)
      }
      const source = document.createElement('p')
      source.textContent = 'ที่มา: ทะเบียนหมู่บ้านที่ผู้ดูแลระบบบันทึก'
      popup.append(source)
      const icon = communityPinIcon('#6D28D9', '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>', 'community-hamlet-marker')
      L.marker([hamlet.center.latitude, hamlet.center.longitude], { icon, title: hamlet.name, alt: hamlet.name })
        .bindPopup(popup, { autoPan: false, maxWidth: 260 }).addTo(communityMapGroup)
    }
    return
  }

  if (props.communityMapType === 'places') {
    for (const place of publicMapData.places.placed) {
      if (props.selectedCommunityId !== 'all' && place.communityId !== props.selectedCommunityId) continue
      const icon = communityPinIcon(place.color, place.path, 'community-place-marker')
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = place.name
      popup.append(heading)
      for (const line of [`${place.kindLabel}${place.sourceSection ? ` · ที่มา ${place.sourceSection}` : ''}`, place.precisionLabel, place.capacityLabel, place.operationalLabel, place.note]) {
        if (!line) continue
        const row = document.createElement('p')
        row.textContent = line
        popup.append(row)
      }
      L.marker([place.latitude!, place.longitude!], { icon, title: place.name })
        .bindPopup(popup, { autoPan: false, maxWidth: 270 })
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
  for (const cluster of clusters) {
    const color = levelColor(cluster.maxPpb)
    const circle = L.circleMarker([cluster.latitude, cluster.longitude], {
      radius: cluster.sampleCount > 1 ? 7 : 5,
      color: '#121212',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.92,
    })

    circle.bindPopup(buildChemicalPopup(cluster, color, () => emit('selectWaypoint', cluster.latest)), { className: 'kok-popup', minWidth: 260, maxWidth: 320, autoPanPaddingTopLeft: [12, window.innerWidth < 640 ? 220 : 76], autoPanPaddingBottomRight: [12, 150] })
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

// Zoomed out past a single village, the map still shows where the four target communities are,
// so a visitor is never left on an empty map with no way to orient.
const overviewZoom = 13
function renderCommunityOverview() {
  if (!L || !mapInstance || !communityOverviewGroup) return
  communityOverviewGroup.clearLayers()
  if (mapInstance.getZoom() >= overviewZoom) return
  for (const target of communityTargets) {
    const current = target.id === props.selectedCommunityId
    const label = `${target.fullName} · ${target.subdistrict} ${target.district} ${target.province}`
    const html = `<span class="kok-community-pin${current ? ' current' : ''}">${target.name}</span>`
    L.marker(target.center, {
      icon: L!.divIcon({ html, className: '', iconSize: [0, 0] }),
      title: label,
      alt: label,
      zIndexOffset: current ? 900 : 800,
    })
      .on('click', () => {
        emit('update:selectedCommunityId', target.id)
      })
      .addTo(communityOverviewGroup)
  }
}

function moveMap(center: [number, number], zoom: number) {
  if (!mapInstance) return
  const { x, y } = mapInstance.invalidateSize({ pan: false }).getSize()
  // flyTo computes NaN on a zero-size map (hidden tab or pane), so jump there instead.
  if (x && y) mapInstance.flyTo(center, zoom, { duration: 0.6 })
  else mapInstance.setView(center, zoom, { animate: false })
}

function applyScopeAndCommunity() {
  if (!mapInstance) return
  if (props.selectedCommunityId === 'all') {
    moveMap([20.08, 99.85], 9)
    return
  }
  const target: CommunityTarget | undefined =
    communityTargets.find((item) => item.id === props.selectedCommunityId) ?? communityTargets[0]
  if (!target) return
  moveMap(target.center, target.zoomInner)
}

onMounted(async () => {
  legendOpen.value = !window.matchMedia('(max-width: 767px)').matches
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
  const initialZoom = initialTarget?.zoomInner ?? 15

  mapInstance = L.map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    // The data covers the Kok basin only, so zoom 8 is as far out as the map stays meaningful.
    minZoom: 8,
    maxZoom: 19,
    zoomControl: false,
    attributionControl: false,
  })

  L.control.zoom({ position: 'topleft', zoomInTitle: 'ขยายเข้า', zoomOutTitle: 'ถอยออก' }).addTo(mapInstance)
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
  communityOverviewGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.on('zoomend', renderCommunityOverview)

  updateBaseLayer()
  renderCommunityOverview()
  renderThematicLayers()
  renderCommunityMapLayer()
  applyScopeAndCommunity()

  void loadMyMapsData().then((data) => {
    myMapsData.value = data
    renderCommunityMapLayer()
  }).catch(() => { /* My Maps data unavailable */ })

  void loadPublicEvacuation().then((data) => {
    evacuationRoutes.value = data.routes
    routesRoadAligned.value = data.routeAlignment === 'offline_osm_road_alignment'
    renderCommunityMapLayer()
  }).catch(() => { evacuationError.value = true })

  void loadPublicMapData().then(() => {
    const edited = publicMapData.routes
    if (edited) {
      evacuationRoutes.value = edited.routes
      routesRoadAligned.value = edited.alignment === 'offline_osm_road_alignment'
    }
    renderCommunityMapLayer()
  })

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
watch(() => [props.evacuationModeActive, props.selectedEvacuationCase, props.evacuationQueue], () => {
  if (props.communityMapType === 'evacuation') renderCommunityMapLayer()
}, { deep: true })
watch(prioritizeActive, renderCommunityMapLayer)
watch(() => props.selectedCommunityId, renderCommunityOverview)
watch(() => publicMapData.hamlets, renderCommunityMapLayer, { deep: true })
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

watch(
  () => [props.waypoints, props.activeThematicLayer, props.selectedCommunityId, props.communityMapType],
  () => {
    renderThematicLayers()
  },
  { deep: true },
)

watch(() => props.selectedCommunityId, applyScopeAndCommunity)

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
    <section
      ref="mapContainer"
      role="region"
      aria-label="แผนที่ Leaflet (OpenStreetMap)"
      :class="isFullScreen ? 'h-full w-full rounded-none border-0' : 'wv-map-frame'"
    />
    <aside v-if="communityMapType === 'places' && placesPendingHere.length" class="evacuation-legend" aria-label="สถานที่ที่ยังไม่มีพิกัด">
      <strong>รอผูกจุด (ยังไม่ปักบนแผนที่)</strong>
      <div v-for="place in placesPendingHere" :key="place.id"><span :style="{ background: place.color }" />{{ place.name }} · {{ place.kindLabel }}</div>
    </aside>
    <aside v-if="!evacuationModeActive && (selectedCommunityId === 'thaton' || selectedCommunityId === 'all') && communityMapType === 'evacuation'"
      class="evacuation-legend" aria-label="สีและสัญลักษณ์อพยพ">
      <button type="button" class="legend-toggle" :aria-expanded="legendOpen" @click="legendOpen = !legendOpen">
        {{ legendOpen ? 'ซ่อนสัญลักษณ์ ▾' : 'ดูสีและสัญลักษณ์ ▸' }}
      </button>
      <section v-show="legendOpen" class="legend-body">
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
              <span class="row-label">{{ item.point.label }} · น้ำลึก {{ item.depthMetres }} ม.</span>
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
        <template v-if="evacuationLegend.length">
          <div v-for="item in evacuationLegend" :key="item.label"><span :style="{background:item.color}" />{{ item.label.replace(/\s*\(.*\)$/, '') }} ({{ item.rows }})</div>
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
/* On a phone the legend folds to one button so it does not cover the pins; it opens on tap. */
.legend-toggle { display:none; pointer-events:auto; font-weight:700; font-size:12px; padding:4px 2px; min-height:32px; }
@media (max-width:767px) {
  .evacuation-legend { bottom:208px; right:12px; padding:6px 10px; font-size:11px; max-height:calc(100dvh - 300px); overflow-y:auto; pointer-events:auto; }
  .legend-toggle { display:block; }
}

:deep(.ev-pin) {
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: #fff;
  font: 800 13px 'Noto Sans Thai', sans-serif;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: transform 0.2s, width 0.2s, height 0.2s;
}
:deep(.ev-pin.sel) {
  width: 36px;
  height: 36px;
  font-size: 16px;
  outline: 4px solid rgba(37, 99, 235, 0.45);
  z-index: 1000 !important;
}
:deep(.ev-dpin) {
  transform: translate(-50%, -100%);
  background: #0F766E;
  color: #fff;
  border-radius: 10px;
  padding: 4px 9px;
  font: 700 12px 'Noto Sans Thai', sans-serif;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
:deep(.ev-dpin.sel) {
  background: #1D4ED8;
}
</style>

<style>
/* Zoom buttons sit under the community-data button on the left, clear of the floating panels. */
.leaflet-top.leaflet-left .leaflet-control-zoom {
  margin-top: 164px;
  margin-left: 12px;
  border: 0;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.18);
}
.leaflet-control-zoom a {
  width: 36px;
  height: 36px;
  line-height: 36px;
  color: var(--wv-text, #0f172a);
  background: var(--wv-card, #fff);
  border-color: rgba(203, 213, 225, 0.9);
  font-size: 18px;
}
.leaflet-control-zoom a:hover { background: var(--wv-hover, #f1f5f9); }
html.dark .leaflet-control-zoom a { border-color: #2c2c2e; }
@media (max-width: 639px) {
  .leaflet-top.leaflet-left .leaflet-control-zoom { margin-top: 160px; margin-left: 10px; }
}
/* On a phone the bottom menu covers the map's lower edge, so the OpenStreetMap credit moves under the area picker. */
@media (max-width: 767px) {
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-bottom.leaflet-left { bottom: auto; top: 68px; }
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-attribution { margin: 0 0 0 12px; border-radius: 6px; }
}

/* Community markers shown when the map is zoomed out past a single village. */
.kok-community-pin {
  display: inline-block;
  transform: translate(-50%, -50%);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--wv-card, #fff);
  color: var(--wv-text, #0f172a);
  border: 1.5px solid #0284c7;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.25);
  font: 700 12px 'Noto Sans Thai', sans-serif;
  white-space: nowrap;
  cursor: pointer;
}
.kok-community-pin.current { background: #0284c7; color: #fff; }
</style>
