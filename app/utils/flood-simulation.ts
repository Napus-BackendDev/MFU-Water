export const floodStages = [
  { id: 1, riseMetres: 2.5, color: '#2563EB' },
  { id: 2, riseMetres: 5, color: '#0891B2' },
  { id: 3, riseMetres: 7.5, color: '#7C3AED' },
]
export const floodDepthLevels = [
  { id: 1, label: 'ท่วมตื้น', depth: 'มากกว่า 0–50 ซม.', color: '#16A34A' },
  { id: 2, label: 'ท่วมปานกลาง', depth: 'มากกว่า 50–100 ซม.', color: '#EAB308' },
  { id: 3, label: 'ท่วมลึก', depth: 'มากกว่า 100 ซม.', color: '#DC2626' },
]
export const floodImpactStages = floodStages
export type FloodView = 'onset' | 'depth'
export type FloodRegion = {
  properties: { level?: number; firstRiseMetres?: number; minDepth: number | null; maxDepth: number | null }
  geometry: { coordinates: number[][][] }
}
export type FloodScenario = {
  riseMetres: number; areasM2: number[]
  potentialAreaM2: number; potentialFeatures: FloodRegion[]
  impactAreasM2: number[]; impactFeatures: FloodRegion[]; features: FloodRegion[]
}
export type FloodGrid = { origin: number[]; cellSize: number[]; width: number; height: number; groundMetres: number[]; heightAboveReferenceMetres?: number[]; possibleHeightAboveReferenceMetres?: number[]; requiredRiseMetres: Array<number | null>; possibleRequiredRiseMetres?: Array<number | null>; terrainSpreadMetres?: number[]; waterMask: number[] }
export const existingWaterColor = '#38BDF8'
export type FloodSimulation = { credit: string; sourceUrl: string; bounds: [[number, number], [number, number]]; waterFeatures: Array<Pick<FloodRegion,'geometry'>>; scenarios: FloodScenario[]; availableStages: number[]; grid: FloodGrid; sensitivity: { sourceDoi: string; rangeMetres: number[] } }
let pending: Promise<FloodSimulation> | null = null
export function loadFloodSimulation() {
  pending ??= fetch('/flood-simulations/thaton.json').then(async (response) => {
    if (!response.ok) throw new Error('Simulation unavailable')
    return await response.json() as FloodSimulation
  }).catch((error) => { pending = null; throw error })
  return pending
}
const scenarioRequests = new Map<number, Promise<FloodScenario>>()
export function loadFloodScenario(rise: number) {
  if (!scenarioRequests.has(rise)) {
    const request = loadFloodSimulation().then(async (data) => {
      if (!data.availableStages.includes(rise)) throw new Error('Unsupported river stage')
      const inline = data.scenarios.find((s) => s.riseMetres === rise)
      if (inline) return inline
      const response = await fetch(`/flood-simulations/thaton-${rise}.json`)
      if (!response.ok) throw new Error('Scenario unavailable')
      return await response.json() as FloodScenario
    }).catch((error) => { scenarioRequests.delete(rise); throw error })
    scenarioRequests.set(rise, request)
  }
  return scenarioRequests.get(rise)!
}

export function sampleFloodGrid(grid: FloodGrid, latitude: number, longitude: number) {
  const x = (longitude-grid.origin[0]!) / grid.cellSize[0]!
  const y = (grid.origin[1]!-latitude) / grid.cellSize[1]!
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < -.5 || y < -.5 || x >= grid.width-.5 || y >= grid.height-.5) return null
  const index = Math.round(y)*grid.width+Math.round(x)
  return { groundMetres: grid.groundMetres[index]!, requiredRiseMetres: grid.requiredRiseMetres[index] ?? null, waterMask: grid.waterMask[index]!,
    possibleRequiredRiseMetres: grid.possibleRequiredRiseMetres?.[index] ?? null, terrainSpreadMetres: grid.terrainSpreadMetres?.[index] ?? null,
    heightAboveReferenceMetres: grid.heightAboveReferenceMetres?.[index] ?? null, possibleHeightAboveReferenceMetres: grid.possibleHeightAboveReferenceMetres?.[index] ?? null }
}

export function floodDepthAtPoint(sample: ReturnType<typeof sampleFloodGrid>, rise: number, sensitivity = false): number | null {
  if (!sample || sample.waterMask !== 0 || !Number.isFinite(rise)) return null
  const threshold = sensitivity ? sample.possibleRequiredRiseMetres : sample.requiredRiseMetres
  const height = sensitivity ? sample.possibleHeightAboveReferenceMetres : sample.heightAboveReferenceMetres
  if (threshold == null || height == null || !Number.isFinite(threshold) || !Number.isFinite(height)) return null
  // Local low ground remains dry until a continuous path from the river is flooded.
  return rise > threshold ? Math.max(0,Math.round((rise-height)*100)/100) : 0
}
