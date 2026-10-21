// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import handler from './restricted.js'

const key = 'a'.repeat(64)
const data = { points: [{ id: 'private-id', kind: 'elderly', latitude: 20.06, longitude: 99.36, name: 'private-name' }], routes: [[[20.06,99.36],[20.061,99.361]]], sourceRoutes: ['private'], routeAlignment: { method: 'offline_osm_road_alignment' } }
function call(authorization, method = 'GET') {
  const res = { statusCode: 0, headers: {}, body: null, setHeader(k,v) { this.headers[k] = v }, status(n) { this.statusCode = n; return this }, json(body) { this.body = body; return this } }
  handler({ method, headers: { authorization } },res)
  return res
}
function configured() {
  vi.stubEnv('EVACUATION_ACCESS_KEY_SHA256',createHash('sha256').update(key).digest('hex'))
  vi.stubEnv('EVACUATION_DATA_JSON',JSON.stringify(data))
}
afterEach(() => vi.unstubAllEnvs())
describe('Restricted evacuation API', () => {
  it('fails closed without configuration', () => {
    vi.stubEnv('EVACUATION_ACCESS_KEY_SHA256','')
    expect(call(`Bearer ${key}`).statusCode).toBe(503)
  })
  it.each([undefined, '', `Bearer ${'b'.repeat(64)}`, `Bearer ${key}extra`, key])('denies missing or incorrect credentials: %s', (authorization) => {
    configured()
    const res = call(authorization)
    expect(res.statusCode).toBe(401)
    expect(JSON.stringify(res.body)).not.toContain('20.06')
    expect(res.headers['Cache-Control']).toContain('no-store')
  })
  it('returns only geometry after valid authorization', () => {
    configured()
    const res = call(`Bearer ${key}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.points).toEqual([{ id:'TH-R-1', kind:'elderly', latitude:20.06, longitude:99.36 }])
    expect(res.body.routes).toEqual(data.routes)
    expect(JSON.stringify(res.body)).not.toMatch(/private-name|private-id|sourceRoutes/)
    expect(res.headers.Vary).toBe('Authorization')
  })
  it.each([
    '{',
    JSON.stringify({...data, points:[{...data.points[0],kind:'unknown'}]}),
    JSON.stringify({...data, points:[{...data.points[0],latitude:0}]}),
    JSON.stringify({...data, routes:[[[20.06,99.36],[0,0]]]}),
  ])('does not leak invalid datasets', (raw) => {
    configured(); vi.stubEnv('EVACUATION_DATA_JSON',raw)
    const res = call(`Bearer ${key}`)
    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({error:'Restricted data unavailable'})
  })
  it('rejects writes', () => {
    configured()
    expect(call(`Bearer ${key}`,'POST').statusCode).toBe(405)
  })
})
