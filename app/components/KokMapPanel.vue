<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Check, ChevronDown, Layers } from 'lucide-vue-next'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { communityTargets, publicSurveyGridCells, type CommunityTarget, type PublicGridCell } from '../utils/kok-contract'
import { arsenicLevel, arsenicLevelMeta } from '../../src/lib/arsenic'
import { buildChemicalPopup } from '../utils/chemical-popup'
import { hasPublicMapLayer, publicFloodHistory, publicEvacuationReference, type CommunityMapType } from '../utils/community-map-layers'
import { existingWaterColor, floodDepthLevels, floodImpactStages, loadFloodSimulation, loadFloodScenario, sampleFloodGrid, floodDepthAtPoint, type FloodScenario, type FloodSimulation, type FloodView } from '../utils/flood-simulation'
import { loadMyMapsData, type MyMapsReview } from '../utils/mymaps-review'
import { publicMapData, loadPublicMapData, isMainMapPlace, mapNameOfPlace } from '../utils/map-data-public'
import { pinIconOptions } from '../utils/map-pin'
import { DEFAULT_PLACE_MAP, PLACE_KINDS } from '../../src/lib/map-data'
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
    userLocation?: { latitude: number; longitude: number; accuracy: number | null } | null
    focusRequest?: { latitude: number; longitude: number; zoom: number; sampleCode?: string; nonce: number } | null
    highlightedSampleCode?: string | null
    pendingSubmission?: SurveyWaypoint | null
  }>(),
  {
    isFullScreen: false,
    evacuationModeActive: false,
    evacuationQueue: () => [],
    selectedEvacuationCase: null,
    evacuationDestinations: () => [],
    userLocation: null,
    focusRequest: null,
    highlightedSampleCode: null,
    pendingSubmission: null,
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
let observationMapGroup: import('leaflet').LayerGroup | null = null
let observationRenderer: import('leaflet').Canvas | null = null
let floodRenderer: import('leaflet').Canvas | null = null
let waterwayGroup: import('leaflet').LayerGroup | null = null
let virtualPolygonLayer: import('leaflet').Polygon | null = null
let communityOverviewGroup: import('leaflet').LayerGroup | null = null
let userLocationGroup: import('leaflet').LayerGroup | null = null
const markerBySampleCode = new Map<string, import('leaflet').CircleMarker>()
let lastFocusNonce = 0
let handledFocusInCurrentFlush = false

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

// Important places come as several maps (the main one plus the survey topics); one is shown at a time.
const selectedPlaceMap = ref(DEFAULT_PLACE_MAP)
const placeMapDropdownOpen = ref(false)
const placeMapDropdownRef = ref<HTMLDivElement | null>(null)
const placeMapsHere = computed(() => {
  const counts = new Map<string, number>([[DEFAULT_PLACE_MAP, 0]])
  for (const place of publicMapData.places.placed) {
    if (props.selectedCommunityId !== 'all' && place.communityId !== props.selectedCommunityId) continue
    const name = mapNameOfPlace(place)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts].filter(([name, count]) => count > 0 || name === DEFAULT_PLACE_MAP).map(([name, count]) => ({ name, count }))
})
const activePlaceMapCount = computed(() => placeMapsHere.value.find((m) => m.name === selectedPlaceMap.value)?.count ?? 0)
function choosePlaceMap(name: string) {
  selectedPlaceMap.value = name
  placeMapDropdownOpen.value = false
  renderCommunityMapLayer()
}
function handlePlaceMapOutsideClick(event: MouseEvent) {
  if (placeMapDropdownRef.value && !placeMapDropdownRef.value.contains(event.target as Node)) {
    placeMapDropdownOpen.value = false
  }
}
function handlePlaceMapEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') placeMapDropdownOpen.value = false
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
      return
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
      if (mapNameOfPlace(place) !== selectedPlaceMap.value) continue
      const icon = communityPinIcon(place.color, place.path, 'community-place-marker')
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = place.name
      popup.append(heading)
      // A surveyed household has no capacity or readiness to report: show its map, status and answers only.
      const lines = isMainMapPlace(place)
        ? [`${place.kindLabel}${place.sourceSection ? ` · ที่มา ${place.sourceSection}` : ''}`, place.precisionLabel, place.capacityLabel, place.operationalLabel, place.note]
        : [place.mapName, place.note]
      for (const line of lines) {
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

function renderUserLocation() {
  if (!L || !mapInstance || !userLocationGroup) return
  userLocationGroup.clearLayers()
  const loc = props.userLocation
  if (!loc) return

  const html = `
    <div class="kok-user-beacon">
      <span class="kok-user-pulse"></span>
      <span class="kok-user-dot"></span>
      <span class="kok-user-label">คุณอยู่ที่นี่</span>
    </div>
  `
  const popup = document.createElement('div')
  popup.className = 'kok-pop'
  const heading = document.createElement('h3')
  heading.textContent = 'ตำแหน่งปัจจุบันของคุณ'
  const coordsText = document.createElement('p')
  coordsText.className = 'kok-pop-sub'
  coordsText.textContent = `พิกัด: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}${loc.accuracy ? ` (±${loc.accuracy} ม.)` : ''}`
  popup.append(heading, coordsText)

  L.marker([loc.latitude, loc.longitude], {
    pane: 'user-location',
    icon: L.divIcon({ html, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
    title: 'คุณอยู่ที่นี่ (ตำแหน่ง GPS ปัจจุบัน)',
    alt: 'คุณอยู่ที่นี่',
    zIndexOffset: 2500,
  })
    .bindPopup(popup, { className: 'kok-popup', autoPan: false })
    .addTo(userLocationGroup)
}

function addSurveyClusterPin(
  cluster: ReturnType<typeof clusterSurveyWaypoints>[number],
  options: { isHighlighted: boolean; pendingReview: boolean },
) {
  if (!L || !thematicGroup) return
  if (!Number.isFinite(cluster.latitude) || !Number.isFinite(cluster.longitude)) return
  const color = levelColor(cluster.maxPpb)
  const { isHighlighted, pendingReview } = options
  const badgeText = pendingReview
    ? 'จุดที่คุณส่ง • รอแอดมินตรวจ'
    : isHighlighted
      ? 'จุดที่บันทึกใหม่'
      : ''

  const haloHtml = `
    <div class="kok-pin-pulse-wrap ${isHighlighted ? 'is-featured' : ''}" style="--pin-color: ${color}">
      <span class="kok-pin-pulse"></span>
      ${isHighlighted ? '<span class="kok-pin-pulse-outer"></span>' : ''}
      ${cluster.sampleCount > 1 ? `<span class="kok-cluster-count">${cluster.sampleCount}</span>` : ''}
      ${badgeText ? `<span class="kok-pin-tag ${pendingReview ? 'is-pending' : ''}">${badgeText}</span>` : ''}
    </div>
  `

  L.marker([cluster.latitude, cluster.longitude], {
    icon: L.divIcon({ html: haloHtml, className: '', iconSize: [34, 34], iconAnchor: [17, 17] }),
    interactive: false,
    keyboard: false,
    zIndexOffset: isHighlighted ? 1800 : 300,
  }).addTo(thematicGroup)

  const circle = L.circleMarker([cluster.latitude, cluster.longitude], {
    radius: isHighlighted ? 15 : cluster.sampleCount > 1 ? 13 : 11,
    color: pendingReview ? '#FDE047' : '#FFFFFF',
    weight: isHighlighted ? 3.5 : 3,
    fillColor: color,
    fillOpacity: 0.96,
    className: isHighlighted ? 'kok-arsenic-dot is-featured' : 'kok-arsenic-dot',
  })

  circle.bindPopup(
    buildChemicalPopup(
      cluster,
      color,
      () => emit('selectWaypoint', cluster.latest),
      { justSubmitted: isHighlighted, pendingReview },
    ),
    {
      className: 'kok-popup',
      minWidth: 280,
      maxWidth: 340,
      autoPanPaddingTopLeft: [12, window.innerWidth < 640 ? 220 : 80],
      autoPanPaddingBottomRight: [12, 160],
    },
  )
  circle.addTo(thematicGroup)
  if (isHighlighted) circle.bringToFront()

  for (const member of cluster.members) {
    markerBySampleCode.set(member.sample_code, circle)
  }
}

function renderThematicLayers() {
  if (!L || !mapInstance || !thematicGroup) return
  thematicGroup.clearLayers()
  markerBySampleCode.clear()

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
    const isHighlighted = Boolean(
      props.highlightedSampleCode &&
      cluster.members.some((m) => m.sample_code === props.highlightedSampleCode),
    )
    addSurveyClusterPin(cluster, { isHighlighted, pendingReview: false })
  }

  // Temporary local-only pin for a >50 ppb submission waiting on admin review (R10)
  if (props.pendingSubmission) {
    const pendingCluster = clusterSurveyWaypoints([props.pendingSubmission])[0]
    if (pendingCluster) {
      addSurveyClusterPin(pendingCluster, { isHighlighted: true, pendingReview: true })
    }
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
  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(zoom)) return
  const cur = mapInstance.getCenter()
  const curZoom = mapInstance.getZoom()
  if (Math.abs(cur.lat - center[0]) < 1e-6 && Math.abs(cur.lng - center[1]) < 1e-6 && curZoom === zoom) return
  const { x, y } = mapInstance.invalidateSize({ pan: false }).getSize()
  // flyTo computes NaN on a zero-size map or redundant same-target calls, so guard both.
  if (x && y) {
    mapInstance.stop()
    mapInstance.flyTo(center, zoom, { duration: 0.6 })
  } else {
    mapInstance.setView(center, zoom, { animate: false })
  }
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

function openMarkerPopupWhenReady(sampleCode?: string) {
  if (!sampleCode || !mapInstance) return
  const tryOpen = () => {
    const marker = markerBySampleCode.get(sampleCode)
    if (marker && mapInstance?.hasLayer(marker)) {
      marker.openPopup()
    }
  }
  mapInstance.once('moveend', () => setTimeout(tryOpen, 80))
  setTimeout(tryOpen, 750)
}

function applyFocusRequest(req: NonNullable<typeof props.focusRequest>) {
  if (!mapInstance) return
  handledFocusInCurrentFlush = true
  queueMicrotask(() => { handledFocusInCurrentFlush = false })
  moveMap([req.latitude, req.longitude], req.zoom)
  if (req.sampleCode) openMarkerPopupWhenReady(req.sampleCode)
}

let mobileLegendMedia: MediaQueryList | null = null
const syncLegendForViewport = (e?: MediaQueryListEvent | MediaQueryList) => {
  const isMobile = e ? e.matches : Boolean(mobileLegendMedia?.matches)
  legendOpen.value = !isMobile
}

onMounted(async () => {
  mobileLegendMedia = window.matchMedia('(max-width: 767px)')
  syncLegendForViewport(mobileLegendMedia)
  mobileLegendMedia.addEventListener?.('change', syncLegendForViewport)
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

  L.control.zoom({ position: 'topright', zoomInTitle: 'ขยายเข้า', zoomOutTitle: 'ถอยออก' }).addTo(mapInstance)
  L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(mapInstance)
  mapInstance.on('click', inspectFloodPoint)
  thematicGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('flood-simulation').style.zIndex = '390'
  simulationMapGroup = L.layerGroup().addTo(mapInstance)
  communityMapGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('flood-observations').style.zIndex = '450'
  observationMapGroup = L.layerGroup().addTo(mapInstance)
  waterwayGroup = L.layerGroup().addTo(mapInstance)
  communityOverviewGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.createPane('user-location').style.zIndex = '620'
  userLocationGroup = L.layerGroup().addTo(mapInstance)
  mapInstance.on('zoomend', renderCommunityOverview)

  updateBaseLayer()
  renderCommunityOverview()
  renderThematicLayers()
  renderCommunityMapLayer()
  renderUserLocation()
  if (props.focusRequest) {
    lastFocusNonce = props.focusRequest.nonce
    applyFocusRequest(props.focusRequest)
  }

  void loadMyMapsData().then((data) => {
    myMapsData.value = data
    renderCommunityMapLayer()
  }).catch(() => { /* My Maps data unavailable */ })

  void loadPublicMapData().then(() => {
    renderCommunityMapLayer()
  })

  const resizeHandler = () => {
    mapInstance?.invalidateSize()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeHandler)
    document.addEventListener('click', handlePlaceMapOutsideClick)
    document.addEventListener('keydown', handlePlaceMapEscape)
  }
  setTimeout(() => {
    mapInstance?.invalidateSize()
    if (props.focusRequest && props.focusRequest.nonce === lastFocusNonce) {
      moveMap([props.focusRequest.latitude, props.focusRequest.longitude], props.focusRequest.zoom)
    } else {
      applyScopeAndCommunity()
    }
  }, 100)
})

watch(() => [props.communityMapType, props.selectedCommunityId, props.floodStage, props.simulationVisible, props.observationsVisible, props.floodView, props.floodSensitivity, props.observationDate], renderCommunityMapLayer)
watch(() => [props.evacuationModeActive, props.selectedEvacuationCase, props.evacuationQueue], () => {
  if (props.communityMapType === 'evacuation') renderCommunityMapLayer()
}, { deep: true })
watch(prioritizeActive, renderCommunityMapLayer)
watch(() => props.selectedCommunityId, renderCommunityOverview)
watch(() => publicMapData.hamlets, renderCommunityMapLayer, { deep: true })
watch(placeMapsHere, (maps) => {
  if (!maps.some((map) => map.name === selectedPlaceMap.value)) selectedPlaceMap.value = DEFAULT_PLACE_MAP
  if (props.communityMapType === 'places') renderCommunityMapLayer()
})
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
  () => [props.waypoints, props.activeThematicLayer, props.selectedCommunityId, props.communityMapType, props.highlightedSampleCode, props.pendingSubmission],
  () => {
    renderThematicLayers()
  },
  { deep: true },
)

watch(() => props.userLocation, renderUserLocation, { deep: true })

watch(
  () => props.focusRequest,
  (req) => {
    if (!req || req.nonce === lastFocusNonce) return
    lastFocusNonce = req.nonce
    applyFocusRequest(req)
  },
  { deep: true },
)

watch(() => props.selectedCommunityId, () => {
  if (handledFocusInCurrentFlush) return
  applyScopeAndCommunity()
})

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
  mobileLegendMedia?.removeEventListener?.('change', syncLegendForViewport)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', () => mapInstance?.invalidateSize())
    document.removeEventListener('click', handlePlaceMapOutsideClick)
    document.removeEventListener('keydown', handlePlaceMapEscape)
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
      :class="isFullScreen ? 'isolate h-full w-full rounded-none border-0' : 'wv-map-frame isolate'"
    />
    <div
      v-if="communityMapType === 'places' && placeMapsHere.length > 1"
      ref="placeMapDropdownRef"
      class="place-map-dropdown pointer-events-auto"
    >
      <button
        type="button"
        class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-md transition-all hover:border-[#0284C7] focus:outline-hidden focus:ring-2 focus:ring-[#0284C7]/40 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]/95 dark:hover:border-[#00E5FF] dark:focus:ring-[#00E5FF]/40 sm:px-3"
        :aria-expanded="placeMapDropdownOpen"
        aria-haspopup="listbox"
        aria-label="เลือกแผนที่สถานที่สำคัญ"
        @click.stop="placeMapDropdownOpen = !placeMapDropdownOpen"
      >
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0284C7]/15 text-[#0284C7] sm:h-8 sm:w-8 dark:bg-[#00E5FF]/20 dark:text-[#00E5FF]">
          <Layers class="h-4 w-4" />
        </div>
        <div class="flex min-w-0 flex-col text-left leading-tight">
          <span class="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            เลือกแผนที่
          </span>
          <div class="my-0.5 flex items-center gap-1.5">
            <span class="max-w-[155px] truncate text-xs font-bold tracking-tight text-slate-900 sm:max-w-[230px] sm:text-sm dark:text-white">
              {{ selectedPlaceMap }}
            </span>
            <span class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-[#2C2C2E] dark:text-zinc-300">
              {{ activePlaceMapCount }}
            </span>
          </div>
        </div>
        <ChevronDown
          class="ml-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-zinc-400"
          :class="{ 'rotate-180': placeMapDropdownOpen }"
        />
      </button>

      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="placeMapDropdownOpen"
          class="absolute left-0 top-full z-[1050] mt-1.5 w-72 max-h-80 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 p-2 shadow-2xl backdrop-blur-xl sm:w-84 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]/98"
          role="listbox"
          aria-label="รายชื่อแผนที่สถานที่สำคัญ"
        >
          <div class="mb-1 border-b border-slate-100 px-2.5 py-1.5 dark:border-zinc-800">
            <span class="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              เลือกแผนที่ที่ต้องการแสดง ({{ placeMapsHere.length }} แผนที่)
            </span>
          </div>
          <button
            v-for="map in placeMapsHere"
            :key="map.name"
            type="button"
            role="option"
            :aria-selected="selectedPlaceMap === map.name"
            class="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition"
            :class="selectedPlaceMap === map.name
              ? 'bg-sky-50/90 font-bold text-[#0369A1] dark:bg-sky-950/50 dark:text-[#00E5FF]'
              : 'font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-[#252528]'"
            @click="choosePlaceMap(map.name)"
          >
            <span class="min-w-0 flex-1 leading-snug">{{ map.name }}</span>
            <span class="flex shrink-0 items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                :class="selectedPlaceMap === map.name
                  ? 'bg-[#0284C7]/15 text-[#0369A1] dark:bg-[#00E5FF]/20 dark:text-[#00E5FF]'
                  : 'bg-slate-100 text-slate-500 dark:bg-[#2C2C2E] dark:text-zinc-400'"
              >
                {{ map.count }}
              </span>
              <Check v-if="selectedPlaceMap === map.name" class="h-3.5 w-3.5 shrink-0" />
            </span>
          </button>
        </div>
      </transition>
    </div>
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
          <div v-for="item in evacuationLegend" :key="item.label"><span :style="{background:item.color}" />{{ item.label.replace(/^4\./, '3.').replace(/\s*\(.*\)$/, '') }} ({{ item.rows }})</div>
        </template>
      </template>
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
.evacuation-legend { position:absolute; right:16px; bottom:96px; z-index:1000; width:max-content; max-width:calc(100vw - 32px); padding:12px 14px; border-radius:12px; background:var(--wv-card,white); color:var(--wv-text,#0f172a); box-shadow:0 4px 18px #0002; font-size:13.5px; line-height:1.5; pointer-events:none; }
/* Floating dropdown chooser for important-places maps, aligned beside KokCommunityDropdown. */
.place-map-dropdown { position:absolute; z-index:15; top:12px; left:272px; }
@media (max-width:899px) { .place-map-dropdown { top:84px; left:12px; max-width:calc(100vw - 84px); } }
.evacuation-legend strong { display:block; margin-bottom:6px; font-size:15px; }
.evacuation-legend div { display:flex; align-items:center; gap:8px; margin-top:5px; }
.evacuation-legend span { width:11px; height:11px; flex-shrink:0; border-radius:50%; }
.water-legend { margin-top:8px; padding-top:8px; border-top:1px solid #94a3b844; }
.active-toggle { display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px; pointer-events:auto; cursor:pointer; margin-bottom:4px; }
.active-toggle.disabled { opacity:.5; cursor:not-allowed; }
.active-toggle input { pointer-events:auto; }
.active-hint { display:block; color:#64748b; margin-bottom:6px; font-size:13px; }
.priority-list { pointer-events:auto; margin:6px 0 8px; padding-top:6px; border-top:1px solid #94a3b844; max-width:300px; }
.priority-list ol { list-style:none; margin:6px 0 0; padding:0; max-height:220px; overflow-y:auto; }
.priority-list li { display:flex; align-items:center; gap:8px; margin-top:6px; min-width:0; }
.priority-list .rank { width:20px; height:20px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:800; }
.priority-list .row-label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.priority-list .tier-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
/* On a phone the legend folds to one button so it does not cover the pins; it opens on tap. */
.legend-toggle { display:none; pointer-events:auto; font-weight:700; font-size:13px; padding:2px 4px; min-height:32px; white-space:nowrap; }
@media (max-width:767px) {
  .evacuation-legend { bottom:92px; left:12px; right:auto; padding:8px 12px; font-size:13px; max-width:calc(100vw - 24px); max-height:calc(100dvh - 230px); overflow-y:auto; pointer-events:auto; }
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
/* Zoom buttons sit on the right, styled to match the floating round controls. */
[aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-top.leaflet-right .leaflet-control-zoom {
  margin-top: 76px;
  margin-right: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
  background: var(--wv-card, #ffffff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}
[aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-zoom a {
  width: 42px;
  height: 40px;
  line-height: 38px;
  color: var(--wv-text, #0f172a);
  background: transparent;
  border: 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 18px;
  font-weight: 600;
  transition: background-color 0.15s ease, color 0.15s ease;
}
[aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-zoom a:last-child { border-bottom: 0; }
[aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-zoom a:hover {
  background: var(--wv-hover, #f8fafc);
  color: #0284c7;
}
html.dark [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-top.leaflet-right .leaflet-control-zoom { border-color: #2c2c2e; }
html.dark [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-zoom a { border-bottom-color: #2c2c2e; }
@media (max-width: 639px) {
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-top.leaflet-right .leaflet-control-zoom { margin-top: 286px; margin-right: 12px; }
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-zoom a { width: 38px; height: 36px; line-height: 34px; font-size: 17px; }
}
/* On a phone, place the OpenStreetMap credit cleanly right above the bottom footer bar. */
@media (max-width: 639px) {
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-bottom.leaflet-left { top: auto; bottom: 64px; }
  [aria-label="แผนที่ Leaflet (OpenStreetMap)"] .leaflet-control-attribution { margin: 0 0 0 8px; padding: 1px 6px; font-size: 10px; line-height: 1.3; border-radius: 6px; }
}

/* Community markers shown when the map is zoomed out past a single village. */
.kok-community-pin {
  display: inline-block;
  transform: translate(-50%, -50%);
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--wv-card, #fff);
  color: var(--wv-text, #0f172a);
  border: 2px solid #0284c7;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.28);
  font: 700 14px 'Noto Sans Thai', sans-serif;
  white-space: nowrap;
  cursor: pointer;
}
.kok-community-pin.current { background: #0284c7; color: #fff; }

/* Pulsing / blinking survey markers (both existing and newly submitted points) */
.kok-pin-pulse-wrap {
  position: relative;
  width: 34px;
  height: 34px;
  pointer-events: none;
}
.kok-pin-pulse,
.kok-pin-pulse-outer {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  background: var(--pin-color, #0284c7);
  opacity: 0.65;
  transform: translate(-50%, -50%) scale(0.7);
  animation: kok-pin-pulse-anim 1.9s ease-out infinite;
  will-change: transform, opacity;
}
.kok-pin-pulse-wrap.is-featured .kok-pin-pulse {
  width: 48px;
  height: 48px;
  animation-duration: 1.3s;
}
.kok-pin-pulse-outer {
  width: 62px;
  height: 62px;
  border: 2.5px solid var(--pin-color, #0284c7);
  background: transparent;
  animation: kok-pin-pulse-anim 1.3s ease-out 0.4s infinite;
}
.kok-cluster-count {
  position: absolute;
  left: calc(50% + 10px);
  top: calc(50% - 17px);
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #0F172A;
  color: #FFFFFF;
  border: 2px solid #FFFFFF;
  font: 800 11px/16px 'JetBrains Mono', monospace;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.kok-pin-tag {
  position: absolute;
  left: 50%;
  top: calc(50% - 26px);
  transform: translate(-50%, -100%);
  padding: 4px 10px;
  border-radius: 9999px;
  background: #0284C7;
  color: #FFFFFF;
  border: 2px solid #FFFFFF;
  font: 700 13px/1.2 'Noto Sans Thai', sans-serif;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);
  animation: kok-tag-bob 1.5s ease-in-out infinite;
}
.kok-pin-tag.is-pending {
  background: #D97706;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);
}
path.kok-arsenic-dot {
  filter: drop-shadow(0 2px 6px rgba(15, 23, 42, 0.45));
  animation: kok-dot-blink 2.2s ease-in-out infinite;
}
path.kok-arsenic-dot.is-featured {
  filter: drop-shadow(0 0 10px rgba(2, 132, 199, 0.7));
  animation: kok-dot-blink 1.2s ease-in-out infinite;
}

/* Current user GPS location marker ("คุณอยู่ที่นี่") */
.kok-user-beacon {
  position: relative;
  width: 24px;
  height: 24px;
  cursor: pointer;
}
.kok-user-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background: rgba(37, 99, 235, 0.38);
  transform: translate(-50%, -50%) scale(0.5);
  animation: kok-pin-pulse-anim 1.8s ease-out infinite;
  pointer-events: none;
}
.kok-user-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #2563EB;
  border: 3px solid #FFFFFF;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.6);
}
.kok-user-label {
  position: absolute;
  left: 50%;
  top: calc(50% - 16px);
  transform: translate(-50%, -100%);
  padding: 4px 10px;
  border-radius: 9999px;
  background: #1D4ED8;
  color: #FFFFFF;
  border: 2px solid #FFFFFF;
  font: 700 13px/1.2 'Noto Sans Thai', sans-serif;
  white-space: nowrap;
  box-shadow: 0 3px 12px rgba(29, 78, 216, 0.45);
}

@keyframes kok-pin-pulse-anim {
  0% { transform: translate(-50%, -50%) scale(0.65); opacity: 0.85; }
  75% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; }
}
@keyframes kok-dot-blink {
  0%, 100% { fill-opacity: 0.98; stroke-opacity: 1; }
  50% { fill-opacity: 0.68; stroke-opacity: 0.85; }
}
@keyframes kok-tag-bob {
  0%, 100% { transform: translate(-50%, -100%) translateY(0); }
  50% { transform: translate(-50%, -100%) translateY(-4px); }
}
</style>
