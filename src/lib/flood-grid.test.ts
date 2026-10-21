import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals() })

it('publishes exact 2.5 / 5 / 7.5 metre presets without truncating fractional stages', async () => {
  const { floodStages, loadFloodScenario } = await import('../../app/utils/flood-simulation')
  const data = JSON.parse(readFileSync('public/flood-simulations/thaton.json','utf8'))
  expect(floodStages.map((stage) => stage.riseMetres)).toEqual([2.5,5,7.5])
  expect(data.availableStages).toEqual([2.5,5,7.5])
  expect(data.scenarios.map((s: { riseMetres: number }) => s.riseMetres)).toEqual([2.5,5,7.5])
  const fetchMock = vi.fn().mockResolvedValue({ok:true,json:async () => data})
  vi.stubGlobal('fetch',fetchMock)
  for (const rise of [2.5,5,7.5]) expect((await loadFloodScenario(rise)).riseMetres).toBe(rise)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

describe('flood grid inspection', () => {
  it('samples cell centres, keeps missing paths and rejects out-of-bounds points', async () => {
    const { sampleFloodGrid } = await import('../../app/utils/flood-simulation')
    const grid = { origin: [100, 20], cellSize: [1, 1], width: 2, height: 2,
      groundMetres: [10, 20, 30, 40], requiredRiseMetres: [0, 7.3, null, 6], waterMask: [3, 0, 0, 0] }
    expect(sampleFloodGrid(grid, 20, 101)).toEqual({ groundMetres: 20, requiredRiseMetres: 7.3, waterMask: 0, possibleRequiredRiseMetres: null, terrainSpreadMetres: null, heightAboveReferenceMetres: null, possibleHeightAboveReferenceMetres: null })
    expect(sampleFloodGrid(grid, 19, 100)?.requiredRiseMetres).toBeNull()
    expect(sampleFloodGrid(grid, 20.49, 99.51)?.waterMask).toBe(3)
    for (const [lat, lon] of [[20, 101.5], [18.5, 100], [20.51, 100], [20, 99.49], [NaN, 100]]) {
      expect(sampleFloodGrid(grid, lat!, lon!)).toBeNull()
    }
  })
  it('keeps sensitivity thresholds separate from the main result', async () => {
    const { sampleFloodGrid } = await import('../../app/utils/flood-simulation')
    const grid = { origin: [100,20],cellSize: [1,1],width:1,height:1,groundMetres:[450],requiredRiseMetres:[7.3],waterMask:[0],
      possibleRequiredRiseMetres:[5.4],terrainSpreadMetres:[1.9] }
    expect(sampleFloodGrid(grid,20,100)).toMatchObject({requiredRiseMetres:7.3,possibleRequiredRiseMetres:5.4,terrainSpreadMetres:1.9})
  })
})

describe('water depth at the clicked point', () => {
  it('uses local height and keeps low ground dry until a connected path opens', async () => {
    const { sampleFloodGrid, floodDepthAtPoint } = await import('../../app/utils/flood-simulation')
    const grid = { origin:[100,20],cellSize:[1,1],width:2,height:1,groundMetres:[450,452],requiredRiseMetres:[2,2.6],waterMask:[0,0],
      heightAboveReferenceMetres:[.2,2.6],possibleRequiredRiseMetres:[1,2],possibleHeightAboveReferenceMetres:[-.3,2] }
    const low = sampleFloodGrid(grid,20,100)
    expect(floodDepthAtPoint(low,2)).toBe(0)
    expect(floodDepthAtPoint(low,3)).toBe(2.8)
    expect(floodDepthAtPoint(low,3,true)).toBe(3.3)
    const high = sampleFloodGrid(grid,20,101)
    expect(floodDepthAtPoint(high,3)).toBe(.4)
    expect(floodDepthAtPoint(high,5)).toBe(2.4)
    expect(floodDepthAtPoint(high,2.6)).toBe(0)
  })

  it('does not invent river-bed depth or fill missing data with zero', async () => {
    const { sampleFloodGrid, floodDepthAtPoint } = await import('../../app/utils/flood-simulation')
    const grid = {origin:[100,20],cellSize:[1,1],width:1,height:1,groundMetres:[440],requiredRiseMetres:[0],waterMask:[3],heightAboveReferenceMetres:[-2]}
    expect(floodDepthAtPoint(sampleFloodGrid(grid,20,100),3)).toBeNull()
    expect(floodDepthAtPoint(null,3)).toBeNull()
    grid.waterMask = [0]
    expect(floodDepthAtPoint(sampleFloodGrid(grid,20,100),NaN)).toBeNull()
    expect(floodDepthAtPoint(sampleFloodGrid({...grid,heightAboveReferenceMetres:undefined},20,100),3)).toBeNull()
  })
})

describe('precomputed flood scenarios', () => {
  it('shares downloads, uses inline stages and rejects unsupported stages', async () => {
    const inline = { riseMetres: 1 }
    const advanced = { riseMetres: 8 }
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ availableStages: [1, 8], scenarios: [inline] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => advanced })
    vi.stubGlobal('fetch', fetchMock)
    const { loadFloodScenario } = await import('../../app/utils/flood-simulation')
    expect(await loadFloodScenario(1)).toEqual(inline)
    expect(await Promise.all([loadFloodScenario(8), loadFloodScenario(8)])).toEqual([advanced, advanced])
    await expect(loadFloodScenario(9)).rejects.toThrow('Unsupported river stage')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/flood-simulations/thaton.json', '/flood-simulations/thaton-8.json'])
  })

  it('retries a failed scenario without redownloading the manifest', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ availableStages: [8], scenarios: [] }) })
      .mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ riseMetres: 8 }) })
    vi.stubGlobal('fetch', fetchMock)
    const { loadFloodScenario } = await import('../../app/utils/flood-simulation')
    await expect(loadFloodScenario(8)).rejects.toThrow('Scenario unavailable')
    expect(await loadFloodScenario(8)).toEqual({ riseMetres: 8 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
