// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginAdmin } from '../admin/_admin_shared.js'
import { adminMapDataHandler, publicMapDataHandler, routeFromPath, routeFromQuery } from './_mapdata.js'
import { resetMapDataCache, seedSources } from './_mapdata_db.js'
import { FakeDb } from './_testdb.js'

const fakeDb = new FakeDb()
vi.mock('../surveys/_db.js', async (importOriginal) => ({ ...(await importOriginal()), getDb: vi.fn(async () => fakeDb) }))

const seedUrl = ['../../data/private/thaton.json', '../../public/mymaps/thaton.json'].map((path) => new URL(path, import.meta.url)).find((url) => existsSync(url))
const original = JSON.parse(readFileSync(seedUrl, 'utf8'))

const secret = 'x'.repeat(48)
const tokenFor = () => `Bearer ${loginAdmin('server-passcode').body.token}`

beforeEach(() => {
  vi.stubEnv('VERCEL', '1')
  vi.stubEnv('APP_ENV', '')
  vi.stubEnv('ADMIN_PASSCODE', 'server-passcode')
  vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017')
  fakeDb.reset()
  resetMapDataCache()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}

async function admin(method, path, { body, query = {}, token = tokenFor() } = {}) {
  const response = reply()
  await adminMapDataHandler({ method, query, body, headers: { authorization: token, 'x-admin-name': 'ผู้ตรวจทดสอบ' } }, response, routeFromPath(path))
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0], response }
}

async function pub(target, query = {}) {
  const response = reply()
  await publicMapDataHandler({ method: 'GET', query }, response, target)
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0], response }
}

const completeHousehold = (overrides = {}) => ({
  latitude: 20.0581,
  longitude: 99.3548,
  hamlet_id: 'HM-001',
  answers: { ...original.layers.reduce((all, layer) => ({ ...all, ...layer.records[0].fields }), {}), 'จำนวนสมาชิกเปราะบาง_คน': 0 },
  ...overrides,
})

// The seven My Maps landmarks of ท่าตอน in data/thaton-landmarks.json.
const landmarkIds = ['TH-LM-01', 'TH-LM-02', 'TH-LM-03', 'TH-LM-04', 'TH-LM-05', 'TH-LM-06', 'TH-LM-07']

describe('first use fills the database from the existing files, once', () => {
  it('imports 129 households, hamlets, the two planned places, the seven landmarks and the route', async () => {
    const { status, body } = await admin('GET', '/')
    expect(status).toBe(200)
    expect(body.households).toMatchObject({ total: 129, published: 129 })
    expect(Object.fromEntries(body.households.byLevel.map((level) => [level.key, level.count]))).toEqual({ 1: 4, 2: 8, 4: 56, 5: 61 })
    expect(body.hamlets).toEqual({ total: 10, unassigned: 3 })
    expect(body.places).toEqual({ total: 9, published: 9, waitingLocation: 0 })
    expect(Object.keys(body.seed).sort()).toEqual(['community', 'landmarks', 'places', 'routes'])
  })

  it('does not import twice and does not bring back what the admin deleted', async () => {
    await admin('GET', '/')
    expect((await admin('DELETE', '/places/TH-ASSEMBLY-01')).status).toBe(200)
    resetMapDataCache()
    const { body } = await admin('GET', '/')
    expect(body.places.total).toBe(8)
    expect(body.households.total).toBe(129)
  })

  it('keeps the old ids so evacuation cases and destinations keep working', async () => {
    const { body } = await admin('GET', '/places')
    expect(body.items.map((place) => place.id)).toEqual(['TH-ASSEMBLY-01', ...landmarkIds, 'TH-SHELTER-01'])
    expect((await admin('GET', '/households/MM1-001')).body.household.id).toBe('MM1-001')
  })
})

describe('what the public sees is what the admin previews', () => {
  it('serves the community payload exactly as the current file', async () => {
    const { status, body, response } = await pub('community')
    expect(status).toBe(200)
    expect(response.setHeader).toHaveBeenCalledWith('Vercel-CDN-Cache-Control', expect.stringContaining('s-maxage'))
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=0, must-revalidate')
    body.layers.forEach((layer, index) => {
      expect(layer.records).toEqual(original.layers[index].records)
      expect(layer.legend).toEqual(original.layers[index].legend)
    })
    expect(body.distinctCoordinates).toBe(original.distinctCoordinates)
  })

  it('shows the same payload in the admin preview for every target', async () => {
    expect((await pub('routes')).body.routes).toHaveLength(1)
    for (const target of ['community', 'places', 'hamlets', 'routes', 'profiles', 'availability']) {
      const publicPayload = (await pub(target)).body
      const preview = await admin('GET', `/preview/${target}`)
      expect(preview.status).toBe(200)
      expect(preview.body.payload).toEqual(publicPayload)
    }
  })

  it('re-levels a household in every layer after an edit and the public follows at once', async () => {
    const target = (await admin('GET', '/households', { query: { layer: 'layer-1', level: '5', pageSize: '1' } })).body.items[0]
    const edit = await admin('PUT', `/households/${target.id}`, { body: { answers: { 'จำนวนสมาชิกเปราะบาง_คน': 2, 'ประวัติน้ำท่วมบ้าน': 'เคยท่วมบ้าน' } } })
    expect(edit.status).toBe(200)
    expect(edit.body.household.levels['layer-1'].key).toBe('1')
    expect(edit.body.preview[0]).toMatchObject({ layerId: 'layer-1', status: original.layers[0].legend[0].label })

    const publicPayload = (await pub('community')).body
    const record = publicPayload.layers[0].records.find((row) => row.id === target.id)
    expect(record.fields['จำนวนสมาชิกเปราะบาง_คน']).toBe('2.0')
    expect(publicPayload.layers[0].legend.find((entry) => entry.label === original.layers[0].legend[0].label).rows).toBe(5)
  })

  it('hides a household from the public without deleting it, and can bring it back', async () => {
    await admin('POST', '/households/MM1-001/publish', { body: { published: false } })
    expect((await pub('community')).body.sourceRowsPerLayer).toBe(128)
    expect((await admin('GET', '/households', { query: { published: 'false' } })).body.total).toBe(1)
    await admin('POST', '/households/MM1-001/publish', { body: { published: true } })
    expect((await pub('community')).body.sourceRowsPerLayer).toBe(129)
  })

  it('can hide one survey topic or all household points from the public', async () => {
    expect((await admin('PUT', '/settings', { body: { hiddenLayers: ['layer-5'] } })).status).toBe(200)
    expect((await pub('community')).body.layers.map((layer) => layer.id)).not.toContain('layer-5')
    expect((await admin('PUT', '/settings', { body: { hiddenLayers: COMMUNITY_LAYER_IDS } })).status).toBe(400)

    await admin('PUT', '/settings', { body: { hiddenLayers: [], pointsPublic: false } })
    const hidden = (await pub('community')).body
    expect(hidden.layers.every((layer) => layer.records.length === 0 && layer.rowCount === 129)).toBe(true)
    expect(hidden.layers[0].legend).toEqual(original.layers[0].legend)
  })
})

const COMMUNITY_LAYER_IDS = ['layer-1', 'layer-2', 'layer-3', 'layer-4', 'layer-5', 'layer-6']

describe('when the seed files are not available to the function', () => {
  it('answers 503 so the public map falls back to its own files instead of showing nothing', async () => {
    const original = { ...seedSources }
    Object.assign(seedSources, { community: () => null, route: () => null, place: () => null, landmark: () => null })
    try {
      expect((await pub('community')).status).toBe(503)
      expect((await pub('places')).status).toBe(503)
      expect((await admin('GET', '/')).body.households.total).toBe(0)
      expect((await pub('profiles')).status).toBe(200)
    } finally {
      Object.assign(seedSources, original)
    }
    resetMapDataCache()
    expect((await pub('community')).status).toBe(200)
  })
})

describe('community data (households)', () => {
  it('adds a household with the next id and rejects bad input in Thai', async () => {
    const created = await admin('POST', '/households', { body: completeHousehold() })
    expect(created.status).toBe(201)
    expect(created.body.household).toMatchObject({ id: 'MM1-130', seq: 130 })
    expect((await pub('community')).body.sourceRowsPerLayer).toBe(130)

    const outside = await admin('POST', '/households', { body: completeHousehold({ latitude: 48, longitude: 2 }) })
    expect(outside.status).toBe(400)
    expect(outside.body.error).toContain('พิกัด')
    const unknownHamlet = await admin('POST', '/households', { body: completeHousehold({ hamlet_id: 'HM-999' }) })
    expect(unknownHamlet.body.error).toContain('หย่อมบ้าน')
    expect((await admin('POST', '/households', { body: { latitude: 20.05, longitude: 99.35 } })).status).toBe(400)
  })

  it('filters by hamlet, level and id, and pages the list', async () => {
    const byLevel = await admin('GET', '/households', { query: { layer: 'layer-1', level: '1' } })
    expect(byLevel.body.total).toBe(4)
    expect((await admin('GET', '/households', { query: { hamlet: 'none' } })).body.total).toBe(3)
    expect((await admin('GET', '/households', { query: { q: 'mm1-02' } })).body.total).toBe(10)
    const page = (await admin('GET', '/households', { query: { page: '2', pageSize: '50' } })).body
    expect(page.items).toHaveLength(50)
    expect(page.items[0].id).toBe('MM1-051')
  })

  it('assigns unassigned households to a hamlet in one go', async () => {
    const unassigned = (await admin('GET', '/households', { query: { hamlet: 'none' } })).body.items.map((household) => household.id)
    const done = await admin('POST', '/households/assign', { body: { ids: unassigned, hamlet_id: 'HM-001' } })
    expect(done.body.assigned).toBe(3)
    expect((await admin('GET', '/hamlets')).body.unassigned).toBe(0)
    expect((await admin('POST', '/households/assign', { body: { ids: unassigned, hamlet_id: 'HM-999' } })).status).toBe(400)
  })

  it('refuses to delete a household that an open evacuation round is using', async () => {
    await admin('GET', '/')
    fakeDb.collection('kok_evacuation_runs').docs.push({ run_id: 'r1', community_id: 'thaton', status: 'open' })
    fakeDb.collection('kok_evacuation_cases').docs.push({ run_id: 'r1', household_id: 'MM1-001', destination_id: 'TH-SHELTER-01' })
    const blocked = await admin('DELETE', '/households/MM1-001')
    expect(blocked.status).toBe(409)
    expect((await admin('DELETE', '/households/MM1-002')).status).toBe(200)
    expect((await admin('DELETE', '/households/MM1-002')).status).toBe(404)
    expect((await admin('DELETE', '/places/TH-SHELTER-01')).status).toBe(409)
  })
})

describe('hamlets', () => {
  it('suggests merging look-alike names, then merges and keeps the old name as an alias', async () => {
    const list = await admin('GET', '/hamlets')
    const pair = list.body.suggestions.find((group) => group.names.includes('หย่อมบ้านไต'))
    expect(pair).toBeTruthy()
    const into = list.body.items.find((hamlet) => hamlet.name === 'บ้านไต')
    const from = list.body.items.find((hamlet) => hamlet.name === 'หย่อมบ้านไต')

    const merged = await admin('POST', '/hamlets/merge', { body: { from_ids: [from.id], into_id: into.id } })
    expect(merged.status).toBe(200)
    expect(merged.body.moved).toBe(1)
    expect(merged.body.into.aliases).toContain('หย่อมบ้านไต')

    const zones = new Set((await pub('community')).body.layers[0].records.map((record) => record.fields['โซน']))
    expect(zones.has('หย่อมบ้านไต')).toBe(false)
    expect((await admin('GET', '/hamlets')).body.items.find((hamlet) => hamlet.id === into.id).household_count).toBe(4)
  })

  it('creates, renames and deletes, but not a hamlet that still has households or a duplicate name', async () => {
    const created = await admin('POST', '/hamlets', { body: { name: 'หย่อมทดสอบ', note: 'เพิ่มใหม่', center: { latitude: 20.05, longitude: 99.35 } } })
    expect(created.status).toBe(201)
    expect(created.body.hamlet.id).toBe('HM-011')
    expect((await admin('POST', '/hamlets', { body: { name: 'บ้านใต้' } })).status).toBe(400)
    expect((await admin('PUT', `/hamlets/${created.body.hamlet.id}`, { body: { name: 'หย่อมทดสอบ 2', aliases: ['ทดสอบ'] } })).body.hamlet.name).toBe('หย่อมทดสอบ 2')
    expect((await admin('DELETE', '/hamlets/HM-001')).status).toBe(409)
    expect((await admin('DELETE', `/hamlets/${created.body.hamlet.id}`)).status).toBe(200)
  })

  it('shows the public only totals above the privacy threshold', async () => {
    await admin('POST', '/hamlets', { body: { name: 'หย่อมเล็ก' } })
    const rows = (await pub('hamlets')).body.hamlets
    expect(rows.find((row) => row.name === 'หย่อมเล็ก')).toMatchObject({ households: null, householdsLabel: 'น้อยกว่า 5 ครัวเรือน' })
    expect(rows.find((row) => row.name === 'บ้านใต้').households).toBe(33)
  })
})

describe('important places', () => {
  it('keeps a place without coordinates in the waiting list and puts it on the map once located', async () => {
    const created = await admin('POST', '/places', { body: { name: 'ศาลาประชาคม', kind: 'community_hall', source_section: 'F1 ข้อ 1.6', status: 'published' } })
    expect(created.status).toBe(201)
    expect(created.body.place.id).toBe('PL-0001')

    let payload = (await pub('places', { community: 'thaton' })).body
    expect(payload.placed.map((place) => place.id).sort()).toEqual(['TH-ASSEMBLY-01', ...landmarkIds, 'TH-SHELTER-01'])
    expect(payload.pending.map((place) => place.name)).toEqual(['ศาลาประชาคม'])

    await admin('PUT', '/places/PL-0001', { body: { name: 'ศาลาประชาคม', kind: 'community_hall', latitude: 20.0575, longitude: 99.3561, location_precision: 'field_verified', capacity_planned: 100, status: 'published' } })
    payload = (await pub('places', { community: 'thaton' })).body
    expect(payload.pending).toEqual([])
    const placed = payload.placed.find((place) => place.id === 'PL-0001')
    expect(placed.precisionLabel).toBe('ยืนยันตำแหน่งภาคสนามแล้ว')
    expect(placed.capacityLabel).toContain('ยังไม่ยืนยันความพร้อมวันนี้')
    expect((await admin('GET', '/places/PL-0001')).body.place.verified_at).toBeTruthy()
  })

  it('hides unpublished places and stores no phone number', async () => {
    const created = await admin('POST', '/places', { body: { name: 'จุดทดสอบ', kind: 'temple', latitude: 20.06, longitude: 99.36, phone: '081-111-2222' } })
    expect(created.body.place.status).toBe('draft')
    expect(created.body.place).not.toHaveProperty('phone')
    expect((await pub('places')).body.placed.some((place) => place.name === 'จุดทดสอบ')).toBe(false)
    await admin('POST', `/places/${created.body.place.id}/publish`, { body: { published: true } })
    expect((await pub('places')).body.placed.some((place) => place.name === 'จุดทดสอบ')).toBe(true)
  })

  it('turns the public places tab on only when there is something to show', async () => {
    const before = (await pub('availability')).body
    expect(before).toMatchObject({ places: 9, placesPending: 0, evacuationDestinations: 2 })
    for (const id of ['TH-SHELTER-01', 'TH-ASSEMBLY-01', ...landmarkIds]) await admin('POST', `/places/${id}/publish`, { body: { published: false } })
    expect((await pub('availability')).body).toMatchObject({ places: 0, evacuationDestinations: 0 })
  })

  it('validates kind, name and the pair of coordinates', async () => {
    expect((await admin('POST', '/places', { body: { name: '', kind: 'nope' } })).status).toBe(400)
    expect((await admin('POST', '/places', { body: { name: 'x', kind: 'temple', latitude: 20.05 } })).status).toBe(400)
    expect((await admin('PUT', '/places/PL-9999', { body: { name: 'x', kind: 'temple' } })).status).toBe(404)
  })
})

describe('evacuation group', () => {
  it('shows the level groups, who is in the queue, the route and the destinations', async () => {
    const { body } = await admin('GET', '/evacuation')
    expect(body.groups.map((group) => [group.key, group.count, group.inQueue])).toEqual([['1', 4, true], ['2', 8, true], ['4', 56, true], ['5', 61, false]])
    expect(body.inQueue).toBe(68)
    expect(body.routes.routes).toHaveLength(1)
    expect(body.destinations.map((place) => place.kind).sort()).toEqual(['assembly', 'shelter'])
  })

  it('saves a corrected route and serves it publicly', async () => {
    const route = [[20.0592, 99.3641], [20.0581, 99.3601], [20.0575, 99.3561]]
    const saved = await admin('PUT', '/evacuation/route', { body: { routes: [route], alignment: 'manual', source: 'แก้โดยแอดมิน' } })
    expect(saved.status).toBe(200)
    expect((await pub('routes')).body.routes).toEqual([route])
    expect((await admin('PUT', '/evacuation/route', { body: { routes: [[[20.05, 99.35]]] } })).status).toBe(400)
  })
})

describe('community introduction card', () => {
  const profile = { title: 'บ้านท่าตอน', basin: 'ลุ่มน้ำกกตอนบน', people: 'ไทยวน ไทใหญ่', livelihood: 'ท่องเที่ยวเชิงนิเวศ', risk: 'น้ำหลากเร็ว' }

  it('saves an edit, shows it publicly and can go back to the original text', async () => {
    expect((await admin('PUT', '/profiles/thaton', { body: profile })).status).toBe(200)
    expect((await pub('profiles')).body.profiles.thaton.risk).toBe('น้ำหลากเร็ว')
    expect((await admin('DELETE', '/profiles/thaton')).status).toBe(200)
    expect((await pub('profiles')).body.profiles).toEqual({})
    expect((await admin('DELETE', '/profiles/thaton')).status).toBe(404)
  })

  it('needs every text and a known community', async () => {
    expect((await admin('PUT', '/profiles/thaton', { body: { ...profile, risk: '' } })).status).toBe(400)
    expect((await admin('PUT', '/profiles/atlantis', { body: profile })).status).toBe(400)
  })
})

describe('access and routing', () => {
  it('rejects every admin call without a valid token but keeps the public API open', async () => {
    expect((await admin('GET', '/', { token: '' })).status).toBe(401)
    expect((await admin('PUT', '/places/TH-SHELTER-01', { token: 'Bearer nope', body: {} })).status).toBe(401)
    expect((await pub('places')).status).toBe(200)
  })

  it('answers 404 for unknown pages, 405 for unsupported methods and 400 for bad bodies', async () => {
    expect((await admin('GET', '/nothing')).status).toBe(404)
    expect((await admin('GET', '/constructor')).status).toBe(404)
    expect((await admin('PATCH', '/places')).status).toBe(405)
    expect((await admin('POST', '/places', { body: null })).status).toBe(400)
    expect((await pub('secrets')).status).toBe(404)
    const post = reply()
    await publicMapDataHandler({ method: 'POST', query: {} }, post, 'places')
    expect(post.status).toHaveBeenCalledWith(405)
  })

  it('records who changed what, newest first', async () => {
    await admin('PUT', '/households/MM1-001', { body: { answers: { 'อุบัติเหตุรุนแรงจากน้ำ': 'เคยประสบเหตุรุนแรง' } } })
    await admin('POST', '/places/TH-SHELTER-01/publish', { body: { published: false } })
    const { items } = (await admin('GET', '/audit')).body
    expect(items[0]).toMatchObject({ kind: 'places', id: 'TH-SHELTER-01', action: 'unpublish', by: 'ผู้ตรวจทดสอบ' })
    expect(items[1]).toMatchObject({ kind: 'households', id: 'MM1-001', action: 'update', changed: ['answers.อุบัติเหตุรุนแรงจากน้ำ'] })
  })

  it('reads the route from the Vercel rewrite query or from the Express path', () => {
    expect(routeFromPath('/households/MM1-001/publish')).toEqual({ kind: 'households', id: 'MM1-001', action: 'publish' })
    expect(routeFromPath('/places')).toEqual({ kind: 'places', id: '', action: '' })
    expect(routeFromPath('')).toEqual({ kind: '', id: '', action: '' })
    expect(routeFromQuery({ kind: 'places', id: 'PL-0001' })).toEqual({ kind: 'places', id: 'PL-0001', action: '' })
    expect(routeFromQuery({ kind: 'places', id: ['a', 'b'], action: '../x' })).toEqual({ kind: 'places', id: '', action: '' })
  })
})

describe('deployment limits', () => {
  const functionFiles = (directory) => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return functionFiles(path)
    return /\.(js|ts)$/.test(name) && !name.startsWith('_') && !/\.test\.|\.d\.ts$/.test(name) ? [path] : []
  })

  it('adds no Vercel function (Hobby allows 12 in total)', () => {
    expect(functionFiles(fileURLToPath(new URL('..', import.meta.url)))).toHaveLength(12)
  })

  it('routes every map-data URL through the existing functions with a ?route= rewrite', () => {
    const { rewrites } = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
    const admin = rewrites.filter((rewrite) => rewrite.source.startsWith('/api/admin/map-data'))
    expect(admin.map((rewrite) => rewrite.destination)).toEqual([
      '/api/admin/review?route=mapdata&kind=:kind&id=:id&action=:action',
      '/api/admin/review?route=mapdata&kind=:kind&id=:id',
      '/api/admin/review?route=mapdata&kind=:kind',
      '/api/admin/review?route=mapdata',
    ])
    expect(rewrites.find((rewrite) => rewrite.source === '/api/map-data/:target').destination).toBe('/api/surveys/waypoints?route=mapdata&target=:target')
  })
})
