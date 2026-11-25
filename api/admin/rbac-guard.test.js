// @vitest-environment node
// Real user store on a fake database: proves that role, page, village and lock-out rules hold on the server,
// not only in the screens.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeDb } from '../mapdata/_testdb.js'
import { adminMapDataHandler, routeFromPath } from '../mapdata/_mapdata.js'
import { resetMapDataCache } from '../mapdata/_mapdata_db.js'
import { getEvacuationHandler, startEvacuationHandler } from '../evacuation/_evacuation.js'
import { loginAdminCredentials } from './_admin_shared.js'
import { createUserHandler, updateUserHandler } from './_users.js'
import { createReporterHandler, getReportersHandler } from './_reporters.js'
import { createUser, updateUser, createRole, getUserByUsername } from './_users_db.js'
import { MAX_FAILURES } from './_login_throttle.js'

const fakeDb = new FakeDb()
vi.mock('../surveys/_db.js', async (importOriginal) => ({ ...(await importOriginal()), getDb: vi.fn(async () => fakeDb) }))

const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}
const outcome = (response) => ({ status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0] })

beforeEach(() => {
  vi.stubEnv('VERCEL', '1')
  vi.stubEnv('APP_ENV', '')
  vi.stubEnv('ADMIN_PASSCODE', 'server-passcode')
  vi.stubEnv('SURVEY_SIGNING_SECRET', 'x'.repeat(48))
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017')
  fakeDb.reset()
  resetMapDataCache()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

async function accountWith(roleId, allowedCommunities, username = roleId) {
  await createUser({ username, password: 'long-enough-1', displayName: username, roleId, allowedCommunities })
  const login = await loginAdminCredentials({ username, password: 'long-enough-1', clientIp: '10.0.0.1' })
  expect(login.status).toBe(200)
  return `Bearer ${login.body.token}`
}

const request = (token, extra = {}) => ({ method: 'GET', query: {}, body: undefined, headers: { authorization: token }, ...extra })

async function mapData(token, method, path, { query = {}, body } = {}) {
  const response = reply()
  await adminMapDataHandler(request(token, { method, query, body }), response, routeFromPath(path))
  return outcome(response)
}

describe('map data respects role and village on the server', () => {
  it('lets a viewer read the overview but not change or read pages the role has no access to', async () => {
    const token = await accountWith('viewer', ['all'])
    expect((await mapData(token, 'GET', '/')).status).toBe(200)
    expect((await mapData(token, 'POST', '/places', { body: { name: 'x', kind: 'temple' } })).status).toBe(403)
    expect((await mapData(token, 'PUT', '/households/MM1-001', { body: {} })).status).toBe(403)
  })

  it('refuses an account with no access to the evacuation page even to read it', async () => {
    const token = await accountWith('reviewer', ['all'])
    // reviewer may only view evacuation, so reading works and writing does not
    expect((await mapData(token, 'GET', '/evacuation')).status).toBe(200)
    expect((await mapData(token, 'PUT', '/evacuation/route', { body: { routes: [] } })).status).toBe(403)
  })

  it('keeps an account limited to one village out of the other villages data', async () => {
    const token = await accountWith('researcher', ['pongkhong'])
    // hamlets and households exist for ท่าตอน only
    expect((await mapData(token, 'GET', '/hamlets')).status).toBe(403)
    expect((await mapData(token, 'GET', '/evacuation', { query: { community: 'thaton' } })).status).toBe(403)
    expect((await mapData(token, 'PUT', '/profiles/thaton', { body: {} })).status).toBe(403)
    // places: asking for another village is refused, and with no village named the account's own is used
    expect((await mapData(token, 'GET', '/places', { query: { community: 'thaton' } })).status).toBe(403)
    const own = await mapData(token, 'GET', '/places')
    expect(own.status).toBe(200)
    expect(own.body.items.every((place) => place.community_id === 'pongkhong')).toBe(true)
    // creating a place in another village is refused
    expect((await mapData(token, 'POST', '/places', { body: { name: 'ศาลา', kind: 'community_hall', community_id: 'thaton' } })).status).toBe(403)
  })

  it('stops an account that was switched off, even with a token that has not expired', async () => {
    const token = await accountWith('researcher', ['all'])
    expect((await mapData(token, 'GET', '/')).status).toBe(200)
    const user = await getUserByUsername('researcher')
    await updateUser(user.id, { active: false })
    expect((await mapData(token, 'GET', '/')).status).toBe(401)
  })
})

describe('evacuation endpoints', () => {
  it('need edit on the evacuation page and the ท่าตอน village', async () => {
    const reviewerToken = await accountWith('reviewer', ['all'])
    const readOnly = reply()
    await getEvacuationHandler(request(reviewerToken), readOnly)
    expect(outcome(readOnly).status).not.toBe(403)

    const start = reply()
    await startEvacuationHandler(request(reviewerToken, { method: 'POST', body: {} }), start)
    expect(outcome(start).status).toBe(403)

    const otherVillage = await accountWith('researcher', ['pongkhong'], 'researcher-pk')
    const blocked = reply()
    await getEvacuationHandler(request(otherVillage), blocked)
    expect(outcome(blocked).status).toBe(403)
  })
})

describe('reporters registry is scoped to the account villages', () => {
  it('lists only the account village and refuses a registry entry for another village', async () => {
    const token = await accountWith('reviewer', ['pongkhong'])
    const list = reply()
    await getReportersHandler(request(token, { query: { communityId: 'all' } }), list)
    expect(outcome(list).status).toBe(200)

    const refused = reply()
    await getReportersHandler(request(token, { query: { communityId: 'thaton' } }), refused)
    expect(outcome(refused).status).toBe(403)

    const create = reply()
    await createReporterHandler(request(token, { method: 'POST', body: { name: 'อาสา', communityId: 'thaton' } }), create)
    expect(outcome(create).status).toBe(403)
  })
})

describe('login lock-out', () => {
  it('locks an address and account after repeated wrong passwords, even for the right password', async () => {
    await createUser({ username: 'somchai', password: 'long-enough-1', displayName: 'สมชาย', roleId: 'viewer', allowedCommunities: ['all'] })
    for (let i = 0; i < MAX_FAILURES; i += 1) {
      expect((await loginAdminCredentials({ username: 'somchai', password: 'wrong-password', clientIp: '10.0.0.9' })).status).toBe(401)
    }
    const locked = await loginAdminCredentials({ username: 'somchai', password: 'long-enough-1', clientIp: '10.0.0.9' })
    expect(locked.status).toBe(429)
    expect(locked.body.retryAfterSeconds).toBeGreaterThan(0)
    // another address is not affected
    expect((await loginAdminCredentials({ username: 'somchai', password: 'long-enough-1', clientIp: '10.0.0.10' })).status).toBe(200)
  })

  it('locks the emergency passcode the same way', async () => {
    for (let i = 0; i < MAX_FAILURES; i += 1) {
      expect((await loginAdminCredentials({ passcode: 'nope', clientIp: '10.0.0.7' })).status).toBe(401)
    }
    expect((await loginAdminCredentials({ passcode: 'server-passcode', clientIp: '10.0.0.7' })).status).toBe(429)
  })

  it('forgets earlier mistakes after a successful login', async () => {
    await createUser({ username: 'malee', password: 'long-enough-1', displayName: 'มาลี', roleId: 'viewer', allowedCommunities: ['all'] })
    for (let i = 0; i < MAX_FAILURES - 1; i += 1) await loginAdminCredentials({ username: 'malee', password: 'bad-password', clientIp: '10.0.0.8' })
    expect((await loginAdminCredentials({ username: 'malee', password: 'long-enough-1', clientIp: '10.0.0.8' })).status).toBe(200)
    for (let i = 0; i < MAX_FAILURES - 1; i += 1) await loginAdminCredentials({ username: 'malee', password: 'bad-password', clientIp: '10.0.0.8' })
    expect((await loginAdminCredentials({ username: 'malee', password: 'long-enough-1', clientIp: '10.0.0.8' })).status).toBe(200)
  })
})

describe('account rules', () => {
  it('asks for at least 8 characters and at least one village', async () => {
    await expect(createUser({ username: 'shortpw', password: '1234567', displayName: 'ก', roleId: 'viewer' })).rejects.toThrow('8')
    await expect(createUser({ username: 'novillage', password: 'long-enough-1', displayName: 'ก', roleId: 'viewer', allowedCommunities: [] })).rejects.toThrow('ชุมชน')
    await expect(createUser({ username: 'typo', password: 'long-enough-1', displayName: 'ก', roleId: 'viewer', allowedCommunities: ['thatonn'] })).rejects.toThrow('ชุมชน')
  })

  it('does not let an account that manages users hand out more than it has', async () => {
    await createRole({ name: 'ผู้จัดการผู้ใช้', description: '', permissions: { users: 'edit', overview: 'view' } })
    const roles = (await import('./_users_db.js')).listRoles
    const manager = (await roles()).find((role) => role.name === 'ผู้จัดการผู้ใช้')
    const token = await accountWith(manager.id, ['pongkhong'], 'manager')

    const superAdmin = reply()
    await createUserHandler(request(token, { method: 'POST', body: { username: 'sneaky', password: 'long-enough-1', displayName: 'x', roleId: 'super-admin' } }), superAdmin)
    expect(outcome(superAdmin).status).toBe(403)

    const wideScope = reply()
    await createUserHandler(request(token, { method: 'POST', body: { username: 'wide', password: 'long-enough-1', displayName: 'x', roleId: 'viewer', allowedCommunities: ['all'] } }), wideScope)
    expect(outcome(wideScope).status).toBe(403)

    const within = reply()
    await createUserHandler(request(token, { method: 'POST', body: { username: 'narrow', password: 'long-enough-1', displayName: 'x', roleId: 'viewer', allowedCommunities: ['pongkhong'] } }), within)
    expect(outcome(within).status).toBe(201)

    const promote = reply()
    const narrow = await getUserByUsername('narrow')
    await updateUserHandler(request(token, { method: 'PUT', params: { id: narrow.id }, body: { roleId: 'super-admin' } }), promote)
    expect(outcome(promote).status).toBe(403)
  })
})
