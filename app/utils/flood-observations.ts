export type ObservationYear = '2022' | '2023' | '2024' | '2025' | '2026'
export type ObservationDate = '2024-09-05' | '2024-09-10' | '2024-09-15' | ObservationYear
export const observationWaterColor = '#A21CAF'
export const observationYears: Array<{date: ObservationYear; label: string}> = [
  { date: '2026', label: 'ปี 2569' },
  { date: '2025', label: 'ปี 2568' },
  { date: '2024', label: 'ปี 2567' },
  { date: '2023', label: 'ปี 2566' },
  { date: '2022', label: 'ปี 2565' },
]
export type FloodYear = {
  date: ObservationYear
  labelYear: number
  file: string
  totalKm2: number
  totalRai: number
  riverKm2: number
  floodKm2: number
  analysedFloodKm2: number
  eventLabels: string[]
  undetectedLabels: string[]
}
export type FloodObservation = {
  years: FloodYear[]
}
export type ObservationRegions = { features: Array<{
  properties: {kind: 'water' | 'unobservable'}
  geometry: {type: 'Polygon'; coordinates: number[][][]}
}> }
let pending: Promise<FloodObservation> | undefined
export function loadFloodObservations() {
  pending ??= fetch('/flood-observations/thaton.json').then(async (response) => {
    if (!response.ok) throw new Error('Observation unavailable')
    return await response.json() as FloodObservation
  }).catch((error) => { pending = undefined; throw error })
  return pending
}
const requests = new Map<ObservationDate,Promise<ObservationRegions>>()
export function loadObservationRegions(date: ObservationDate) {
  if (!requests.has(date)) requests.set(date,fetch(`/flood-observations/thaton-${date}-display.json`).then(async (response) => {
    if (!response.ok) throw new Error('Observation regions unavailable')
    return await response.json() as ObservationRegions
  }).catch((error) => { requests.delete(date); throw error }))
  return requests.get(date)!
}
