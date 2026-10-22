import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { publicMyMapsPayload } from '../../scripts/publish-mymaps.mjs'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('publishes all 6 approved My Maps layers without sensitive household fields', () => {
  const data = JSON.parse(readFileSync('public/mymaps/thaton.json', 'utf8'))
  expect(data.visibility).toBe('public')
  expect(data.layers).toHaveLength(6)
  expect(data.sourceRowsPerLayer).toBe(129)
  expect(data.distinctCoordinates).toBe(125)

  for (const layer of data.layers) {
    expect(layer.records).toHaveLength(129)
    expect(layer.legend.length).toBeGreaterThan(0)
    for (const record of layer.records) {
      expect(record.id).toMatch(/^MM\d-\d{3}$/)
      expect(record.latitude).toBeGreaterThan(19)
      expect(record.latitude).toBeLessThan(21)
      expect(record.longitude).toBeGreaterThan(99)
      expect(record.longitude).toBeLessThan(100)
      expect(record.status).toBeTruthy()
      expect(record.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      // Must not expose private fields
      expect(record.fields).not.toHaveProperty('เลขที่บ้าน')
      expect(record.fields).not.toHaveProperty('Latitude')
      expect(record.fields).not.toHaveProperty('Longitude')
    }
  }
})

it('validates layer count and rows count in public payload helper', () => {
  expect(() => publicMyMapsPayload({ layers: [] })).toThrow('Invalid My Maps dataset')
})

it('loads public My Maps data without credentials and caches promise', async () => {
  const data = JSON.parse(readFileSync('public/mymaps/thaton.json', 'utf8'))
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: false }) // /mymaps/thaton.json fails
    .mockResolvedValueOnce({ ok: false }) // /local-review/mymaps fallback fails
    .mockResolvedValue({ ok: true, json: async () => data }) // retry succeeds
  vi.stubGlobal('fetch', fetchMock)
  const { loadMyMapsData } = await import('../../app/utils/mymaps-review')

  await expect(loadMyMapsData()).rejects.toThrow()
  const [a, b] = await Promise.all([loadMyMapsData(), loadMyMapsData()])
  expect(a.layers).toHaveLength(6)
  expect(a).toBe(b)
  expect(fetchMock).toHaveBeenCalledWith('/mymaps/thaton.json')
})
