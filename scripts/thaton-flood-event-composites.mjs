// Per-event cloud-free before/peak composites and maximum flood extent for Ban Tha Ton (Earth Engine).
// Observation-based screening only: extent is detected surface water, not depth or a verified flood boundary.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=<service-account.json> node scripts/thaton-flood-event-composites.mjs [eventId...]
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

globalThis.self ??= globalThis
const ee = createRequire(import.meta.url)('@google/earthengine')
const OUT = new URL('../KokData/thaton-flood-events-2022-2026/', import.meta.url)
await initialize()

// Same AOI and grid as KokData/thaton-flood-satellites-2022-2026 (EPSG:32647, 10 m).
const BOUNDS = [99.3446, 20.0399, 99.3851, 20.0801]
const AOI = ee.Geometry.Rectangle(BOUNDS, null, false)
const CRS = 'EPSG:32647'
const SCALE = 10
const THUMB_WIDTH = 1344 // 3x the 448 px analysis grid

// Reported event dates from the period folders of thaton-flood-satellites-2022-2026.
const EVENTS = [
  { id: '01_2022-07', label: 'น้ำท่วม 21–22 ก.ค. 2565', start: '2022-07-21', end: '2022-07-22' },
  { id: '02_2022-08', label: 'น้ำท่วม 7–8 ส.ค. 2565', start: '2022-08-07', end: '2022-08-08' },
  { id: '03_2023-08', label: 'น้ำท่วม ส.ค. 2566', start: '2023-08-01', end: '2023-08-31' },
  { id: '04_2024-08', label: 'น้ำท่วม 14 ส.ค. 2567', start: '2024-08-14', end: '2024-08-14' },
  { id: '05_2024-09', label: 'น้ำท่วม 11–12 ก.ย. 2567 (พายุยางิ)', start: '2024-09-11', end: '2024-09-12' },
  { id: '06_2025-07', label: 'น้ำท่วม 23–28 ก.ค. 2568', start: '2025-07-23', end: '2025-07-28' },
  { id: '07_2026-07', label: 'น้ำท่วม 30 ก.ค. 2569', start: '2026-07-30', end: '2026-07-30' },
  { id: '08_2026-10', label: 'น้ำท่วม ต.ค. 2569', start: '2026-10-01', end: '2026-10-25' },
]

const SEARCH_BEFORE_DAYS = 20
const SEARCH_AFTER_DAYS = 25
const MIN_FLOOD_KM2 = 0.05 // new water below this is treated as noise / minor bank change
const S2_MIN_CLEAR = 0.5
const NEAR_WATER_METRES = 1000

const days = (date, n) => ee.Date(date).advance(n, 'day')

// Low-lying, gentle terrain where flood water can sit; excludes hill slopes that fool radar.
const dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(AOI).select('DEM').mosaic().setDefaultProjection(CRS, null, 30)
const floodplain = ee.Terrain.slope(dem).lt(5).and(ee.Image('MERIT/Hydro/v1_0_1').select('hnd').lt(15))
const permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').unmask(0).gt(25)
// Static river corridor from JRC (native 30 m grid, so cheap to dilate once).
const nearWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').unmask(0).gt(10)
  .focalMax({ radius: NEAR_WATER_METRES, kernelType: 'circle', units: 'meters' }).reproject({ crs: CRS, scale: 30 })
const candidate = floodplain.and(permanentWater.not())

const csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')

function s2Collection(from, to) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(AOI).filterDate(from, to)
    .linkCollection(csPlus, ['cs_cdf']).map((image) => {
      const scl = image.select('SCL')
      const clear = image.select('cs_cdf').gte(0.7)
        .and(scl.neq(3)).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(1))
      return image.updateMask(clear).set('clearMask', clear)
    })
}

function s2Water(image) {
  const mndwi = image.normalizedDifference(['B3', 'B11'])
  const ndvi = image.normalizedDifference(['B8', 'B4'])
  return mndwi.gt(0).and(ndvi.lt(0.3))
}

function s1Collection(from, to) {
  return ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(AOI).filterDate(from, to)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .select('VV')
    .map((image) => ee.Image(image.focalMedian({ radius: 20, kernelType: 'circle', units: 'meters' })
      .copyProperties(image, ['system:time_start', 'relativeOrbitNumber_start', 'orbitProperties_pass', 'platform_number', 'system:index'])))
}

const areaKm2 = (mask) => ee.Number(ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: AOI, crs: CRS, scale: SCALE, maxPixels: 1e9,
}).values().get(0))

const fraction = (mask) => ee.Number(mask.unmask(0).reduceRegion({
  reducer: ee.Reducer.mean(), geometry: AOI, crs: CRS, scale: SCALE * 2, maxPixels: 1e9,
}).values().get(0))

const rgb = (image) => image.select(['B4', 'B3', 'B2']).visualize({ min: 0, max: 2800, gamma: 1.25 })

// Clear-sky composite: images nearest to `target` win per pixel; gaps filled from `fill`.
function cloudFree(from, to, target, fill) {
  const collection = s2Collection(from, to).map((image) =>
    image.set('distance', ee.Number(image.date().difference(ee.Date(target), 'day')).abs()))
  const nearestOnTop = collection.sort('distance', false).select(['B2', 'B3', 'B4', 'B8', 'B11']).mosaic()
  return fill ? nearestOnTop.unmask(fill) : nearestOnTop
}

// Calm-period composite: per-pixel median of clear views removes leftover haze; gaps filled from `fill`.
function medianClear(from, to, fill) {
  const median = s2Collection(from, to).select(['B2', 'B3', 'B4', 'B8', 'B11']).median()
  return fill ? median.unmask(fill) : median
}

const evaluate = (obj) => new Promise((resolve, reject) => obj.evaluate((value, error) => (error ? reject(new Error(error)) : resolve(value))))
const thumbUrl = (image) => new Promise((resolve, reject) => image.getThumbURL(
  { region: AOI, crs: CRS, dimensions: THUMB_WIDTH, format: 'png' }, (url, error) => (error ? reject(new Error(error)) : resolve(url))))

async function savePng(image, path) {
  const response = await fetch(await thumbUrl(image))
  if (!response.ok) throw new Error(`thumbnail ${path}: HTTP ${response.status}`)
  await writeFile(new URL(path, OUT), Buffer.from(await response.arrayBuffer()))
}

async function processEvent(event, nextStart) {
  const from = days(event.start, -SEARCH_BEFORE_DAYS)
  // The search window never reaches into the next event, so floods are not counted twice.
  const to = nextStart ? ee.Date(Math.min(Date.parse(event.end) + (SEARCH_AFTER_DAYS + 1) * 864e5, Date.parse(nextStart)))
    : days(event.end, SEARCH_AFTER_DAYS + 1)
  const year = event.start.slice(0, 4)

  // "Normal" water = same-season river seen in the cloud-free pre-event composite (+ JRC water).
  const before = medianClear(days(event.start, -75), days(event.start, -1),
    medianClear(days(event.start, -180), days(event.start, -1)))
  const normalWater = s2Water(before).unmask(0).or(permanentWater)
  const dryS1 = s1Collection(`${year}-01-01`, `${year}-05-01`)
  const s1Water = (image) => {
    const baseline = dryS1.filter(ee.Filter.eq('relativeOrbitNumber_start', image.get('relativeOrbitNumber_start'))).median()
    return image.lt(-16).and(image.subtract(baseline).lt(-3))
  }
  // Pixels already wet in at least half of the pre-event radar passes (e.g. flooded paddies) are not event flooding.
  const preRadar = s1Collection(from, event.start)
  const preWet = ee.Image(ee.Algorithms.If(preRadar.size().gt(0),
    preRadar.map((image) => s1Water(image).unmask(0)).mean().gte(0.5), ee.Image(0)))
  // River flooding spreads from the channel; isolated irrigated paddies far from any water are excluded.
  const newWaterBase = candidate.and(normalWater.not()).and(preWet.not()).and(nearWater)

  const s1Obs = s1Collection(from, to).map((image) => {
    const water = s1Water(image).and(newWaterBase).selfMask()
    return water.rename('water').set({
      sensor: 'S1', time: image.get('system:time_start'), id: image.get('system:index'),
      orbit: image.get('relativeOrbitNumber_start'), pass: image.get('orbitProperties_pass'),
      clear: 1, areaKm2: areaKm2(water),
    })
  })
  const s2Obs = s2Collection(from, to).map((image) => {
    const water = s2Water(image).and(newWaterBase).selfMask()
    return water.rename('water').set({
      sensor: 'S2', time: image.get('system:time_start'), id: image.get('system:index'),
      clear: fraction(ee.Image(image.get('clearMask')).clip(AOI)), areaKm2: areaKm2(water),
    })
  })
  const observations = s1Obs.merge(s2Obs)
  const table = await evaluate(observations.toList(200).map((image) => {
    image = ee.Image(image)
    return ee.Dictionary({ sensor: image.get('sensor'), time: image.get('time'), id: image.get('id'),
      orbit: image.get('orbit'), pass: image.get('pass'), clear: image.get('clear'), areaKm2: image.get('areaKm2') })
  }))

  const rows = table.map((row) => ({
    ...row,
    dateBangkok: new Date(row.time + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' '),
    usable: row.sensor === 'S1' || row.clear >= S2_MIN_CLEAR,
  })).sort((a, b) => a.time - b.time)
  // Threshold adapts to pre-event noise: median pre-event "new water" area + MIN_FLOOD_KM2.
  const preAreas = rows.filter((row) => row.usable && row.time < Date.parse(event.start)).map((row) => row.areaKm2).sort((a, b) => a - b)
  const preMedian = preAreas.length ? preAreas[Math.floor(preAreas.length / 2)] : 0
  const threshold = preMedian + MIN_FLOOD_KM2
  // The event is the unbroken run of flooded usable observations around the largest one.
  const usable = rows.filter((row) => row.usable)
  const peakIndex = usable.reduce((best, row, i) => (row.areaKm2 > (usable[best]?.areaKm2 ?? -1) ? i : best), -1)
  let first = peakIndex
  let last = peakIndex
  while (first > 0 && usable[first - 1].areaKm2 >= threshold) first--
  while (last < usable.length - 1 && usable[last + 1].areaKm2 >= threshold) last++
  const flooded = peakIndex >= 0 && usable[peakIndex].areaKm2 >= threshold ? usable.slice(first, last + 1) : []
  const peak = flooded.length ? usable[peakIndex] : null

  const result = {
    id: event.id, label: event.label, reportedStart: event.start, reportedEnd: event.end,
    searchWindow: [await evaluate(from.format('YYYY-MM-dd')), await evaluate(to.advance(-1, 'day').format('YYYY-MM-dd'))],
    floodThresholdKm2: threshold,
    observations: rows.map(({ time, ...row }) => row),
    detected: peak !== null,
  }

  const peakTime = peak ? peak.time : Date.parse(event.start)
  const clearViews = rows.filter((row) => row.sensor === 'S2' && row.clear >= 0.8)
  const nearestClear = clearViews.reduce((best, row) =>
    (!best || Math.abs(row.time - peakTime) < Math.abs(best.time - peakTime) ? row : best), null)
  result.peakImageMainS2Date = nearestClear ? nearestClear.dateBangkok : null
  const peakRgb = cloudFree(days(peakTime, -10), days(peakTime, 16), ee.Date(peakTime), before)
  await savePng(rgb(before), `${event.id}/01_before_cloudfree.png`)
  await savePng(rgb(peakRgb), `${event.id}/02_peak_cloudfree.png`)

  if (peak) {
    const floodIds = new Set(flooded.map((row) => row.id))
    const maxExtent = observations.filter(ee.Filter.inList('id', [...floodIds])).max().unmask(0).focalMode(1).selfMask()
    const overlay = ee.ImageCollection([
      rgb(peakRgb),
      normalWater.or(permanentWater).selfMask().visualize({ palette: ['1e88e5'], opacity: 0.55 }),
      maxExtent.visualize({ palette: ['e53935'], opacity: 0.6 }),
    ]).mosaic()
    await savePng(overlay, `${event.id}/03_peak_with_max_flood_extent.png`)
    await savePng(maxExtent.visualize({ palette: ['e53935'] }), `${event.id}/04_max_flood_extent_mask.png`)
    Object.assign(result, {
      floodFirstObserved: flooded[0].dateBangkok,
      floodLastObserved: flooded.at(-1).dateBangkok,
      peak: { sensor: peak.sensor, dateBangkok: peak.dateBangkok, areaKm2: peak.areaKm2, rai: peak.areaKm2 * 625 },
      maxExtentKm2: await evaluate(areaKm2(maxExtent)),
      observationsInExtent: [...floodIds],
    })
    result.maxExtentRai = result.maxExtentKm2 * 625
  }
  return result
}

const only = process.argv.slice(2)
const metadata = {
  description: 'Per-event cloud-free Sentinel-2 composites and maximum detected flood extent, Ban Tha Ton',
  bounds: { west: BOUNDS[0], south: BOUNDS[1], east: BOUNDS[2], north: BOUNDS[3] },
  crs: CRS, scaleMetres: SCALE, imageWidthPx: THUMB_WIDTH,
  method: {
    sentinel2: 'S2_SR_HARMONIZED, clear = Cloud Score+ cs_cdf >= 0.7 and SCL not cloud/shadow/snow/saturated; water = MNDWI > 0 and NDVI < 0.3',
    sentinel1: 'S1_GRD IW VV, 20 m focal median; water = VV < -16 dB and drop > 3 dB vs same-orbit Jan–Apr median',
    newWater: `floodplain (GLO30 slope < 5°, MERIT HAND < 15 m), excluding JRC occurrence > 25%, water in the pre-event cloud-free composite, and pixels wet in >= 50% of pre-event radar passes; only within ${NEAR_WATER_METRES} m of JRC surface water (occurrence > 10%) (excludes irrigated paddies far from the river)`,
    floodObservation: `usable observation with new water >= median pre-event area + ${MIN_FLOOD_KM2} km² (S2 needs >= ${S2_MIN_CLEAR * 100}% clear AOI); the event is the unbroken run of such observations around the largest one; the search window stops at the next event`,
    maxExtent: 'union of the event run observations, 1-pixel majority smoothing',
    cloudFree: 'per-pixel nearest clear S2 observation to the target date, gaps filled from a wider window',
  },
  limitations: [
    'Detected surface water, not depth, volume, or a verified flood boundary.',
    'First/last observed dates are bounded by satellite revisit; the real start/end may fall between passes.',
    'The peak cloud-free image is the nearest clear view; it can be a few days after the true peak.',
    'Water hidden under vegetation or buildings is missed; radar can confuse wet bare soil or shadow with water.',
    'Thresholds are uncalibrated screening values.',
  ],
  files: {
    '01_before_cloudfree.png': 'cloud-free true colour before the event',
    '02_peak_cloudfree.png': 'cloud-free true colour nearest the peak observation',
    '03_peak_with_max_flood_extent.png': 'peak composite + max flood extent (red) + normal water (blue)',
    '04_max_flood_extent_mask.png': 'max flood extent only, transparent background, same bounds (map overlay)',
  },
  events: [],
}

await mkdir(OUT, { recursive: true })
for (const [index, event] of EVENTS.entries()) {
  if (only.length && !only.includes(event.id)) continue
  await mkdir(new URL(`${event.id}/`, OUT), { recursive: true })
  const result = await processEvent(event, EVENTS[index + 1]?.start)
  await writeFile(new URL(`${event.id}/event.json`, OUT), JSON.stringify(result, null, 2) + '\n')
  metadata.events.push(result)
  console.log(event.id, result.detected ? `${result.floodFirstObserved} → ${result.floodLastObserved}, peak ${result.peak.dateBangkok} (${result.peak.sensor}), max ${result.maxExtentKm2.toFixed(3)} km²` : 'no flood detected')
}
if (!only.length) await writeFile(new URL('events.json', OUT), JSON.stringify(metadata, null, 2) + '\n')

async function initialize() {
  const key = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  await new Promise((resolve, reject) => ee.data.authenticateViaPrivateKey(key,
    () => ee.initialize(null, null, resolve, reject, null, key.project_id), reject))
}
