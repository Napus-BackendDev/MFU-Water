export type ObservationDate = '2024-09-05' | '2024-09-10' | '2024-09-15'
export const observationWaterColor = '#A21CAF'
export const observationDates: Array<{date: ObservationDate; label: string}> = [
  { date: '2024-09-05', label: '5 ก.ย. 2024' },
  { date: '2024-09-15', label: '15 ก.ย. 2024' },
]
export type FloodObservation = {
  dates: Array<{date: ObservationDate; usableFraction: number; waterAreaKm2: number | null; capturedBangkok: string; file: string}>
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
