import { beforeEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

it('serves display contours derived from the unchanged source geometry, including the missing date', () => {
  for (const date of ['2024-09-05','2024-09-10','2024-09-15']) {
    const raw = readFileSync(`public/flood-observations/thaton-${date}.json`)
    const display = JSON.parse(readFileSync(`public/flood-observations/thaton-${date}-display.json`,'utf8'))
    expect(display.displayOnly).toBe(true)
    expect(display.sourceSha256).toBe(createHash('sha256').update(raw).digest('hex'))
    if (date === '2024-09-10') expect(display.features.every((f: {properties:{kind:string}}) => f.properties.kind === 'unobservable')).toBe(true)
    else expect(display.features.some((f: {properties:{kind:string}}) => f.properties.kind === 'water')).toBe(true)
  }
})

it('keeps a fully cloudy date missing rather than claiming zero flood', () => {
  const manifest = JSON.parse(readFileSync('public/flood-observations/thaton.json','utf8'))
  expect(manifest.dates.map((item: {date:string}) => item.date)).toEqual(['2024-09-05','2024-09-10','2024-09-15'])
  expect(manifest.dates[1].usableFraction).toBe(0)
  expect(manifest.dates[1].waterAreaKm2).toBeNull()
  const cloudy = JSON.parse(readFileSync('public/flood-observations/thaton-2024-09-10.json','utf8'))
  expect(cloudy.features.length).toBeGreaterThan(0)
  expect(cloudy.features.every((feature: {properties:{kind:string}}) => feature.properties.kind === 'unobservable')).toBe(true)
})

it('publishes each year as river plus surrounding flood without counting the overlap twice', () => {
  const { years } = JSON.parse(readFileSync('public/flood-observations/thaton.json','utf8'))
  expect(years.map((item: {date:string}) => item.date)).toEqual(['2022','2023','2024','2025','2026'])
  for (const year of years) {
    const display = JSON.parse(readFileSync(`public${year.file}`,'utf8'))
    expect(display.displayOnly).toBe(true)
    expect(display.features.length).toBeGreaterThan(0)
    expect(year.floodKm2).toBeGreaterThan(0)
    expect(year.totalKm2).toBeCloseTo(year.riverKm2 + year.floodKm2,2)
    expect(year.eventLabels.length).toBeGreaterThan(0)
  }
  expect(years.find((item: {date:string}) => item.date === '2026').undetectedLabels).toHaveLength(1)
})

it('offers exactly the published years in the menu', async () => {
  const { observationYears } = await import('../../app/utils/flood-observations')
  const { years } = JSON.parse(readFileSync('public/flood-observations/thaton.json','utf8'))
  expect(observationYears.map((item) => item.date).sort()).toEqual(years.map((item: {date:string}) => item.date))
})

it('does not reuse the previous date geometry and caches successful dates', async () => {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => ({ok:true,json:async () => ({url})}))
  vi.stubGlobal('fetch',fetchMock)
  const { loadObservationRegions } = await import('../../app/utils/flood-observations')
  const first = await loadObservationRegions('2024-09-05')
  expect(await loadObservationRegions('2024-09-15')).not.toEqual(first)
  expect(await loadObservationRegions('2024-09-05')).toBe(first)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith('/flood-observations/thaton-2024-09-15-display.json')
})

it('allows retry after a failed download instead of caching a broken request', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async () => ({features:[]})})
  vi.stubGlobal('fetch',fetchMock)
  const { loadObservationRegions } = await import('../../app/utils/flood-observations')
  await expect(loadObservationRegions('2024-09-05')).rejects.toThrow('Observation regions unavailable')
  await expect(loadObservationRegions('2024-09-05')).resolves.toEqual({features:[]})
})
