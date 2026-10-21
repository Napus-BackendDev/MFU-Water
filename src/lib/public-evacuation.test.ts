import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { publicEvacuationPayload } from '../../scripts/publish-evacuation.mjs'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
it('publishes all approved map points and routes with no extra household fields', () => {
  const data = JSON.parse(readFileSync('public/evacuation/thaton.json','utf8'))
  expect(data.visibility).toBe('public')
  expect(data.verificationStatus).toBe('approximate_not_field_verified')
  expect(data.points).toHaveLength(67)
  expect(data.routes).toHaveLength(1)
  for (const point of data.points) {
    expect(Object.keys(point).sort()).toEqual(['id','kind','latitude','longitude'])
    expect(['elderly','disability','children','children_elderly']).toContain(point.kind)
    expect(point.latitude).toBeGreaterThan(20)
    expect(point.latitude).toBeLessThan(20.12)
    expect(point.longitude).toBeGreaterThan(99.3)
    expect(point.longitude).toBeLessThan(99.45)
  }
})
it('drops names and source IDs without moving points or routes', () => {
  const input = {points:[{id:'source-private-id',name:'private-name',kind:'elderly',latitude:20.06,longitude:99.36}],routes:[[[20.06,99.36],[20.061,99.361]]],sourceRoutes:['internal'],routeAlignment:{method:'offline_osm_road_alignment'}}
  const output = publicEvacuationPayload(input)
  expect(output.points[0]).toEqual({id:'TH-R-1',kind:'elderly',latitude:20.06,longitude:99.36})
  expect(output.routes).toEqual(input.routes)
  expect(JSON.stringify(output)).not.toMatch(/private-name|source-private-id|sourceRoutes/)
})
it('does not publish unsupported points', () => {
  expect(() => publicEvacuationPayload({points:[{kind:'unknown',latitude:20.06,longitude:99.36}],routes:[]})).toThrow()
})
it('loads public geometry without credentials and retries network failures', async () => {
  const data = JSON.parse(readFileSync('public/evacuation/thaton.json','utf8'))
  const fetchMock = vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValue({ok:true,json:async()=>data})
  vi.stubGlobal('fetch',fetchMock)
  const {loadPublicEvacuation} = await import('../../app/utils/public-evacuation')
  await expect(loadPublicEvacuation()).rejects.toThrow()
  const [a,b] = await Promise.all([loadPublicEvacuation(),loadPublicEvacuation()])
  expect(a.points).toHaveLength(67)
  expect(a).toBe(b)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock).toHaveBeenCalledWith('/evacuation/thaton.json')
})
