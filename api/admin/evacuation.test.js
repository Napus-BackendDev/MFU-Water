// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginAdmin } from './_admin_shared.js'
import {
  getEvacuationHandler,
  startEvacuationHandler,
  updateEvacuationCaseHandler,
  reorderEvacuationHandler,
  closeEvacuationHandler,
} from '../evacuation/_evacuation.js'
import reviewHandler from './review.js'

let mockRuns = []
let mockCases = []

const mockDb = {
  collection: (name) => {
    if (name === 'kok_evacuation_runs') {
      return {
        findOne: vi.fn(async (query) => {
          return mockRuns.find((r) => {
            for (const [k, v] of Object.entries(query)) {
              if (r[k] !== v) return false
            }
            return true
          }) || null
        }),
        insertOne: vi.fn(async (doc) => {
          const item = { ...doc, _id: `id_${Date.now()}` }
          mockRuns.push(item)
          return { insertedId: item._id }
        }),
        updateOne: vi.fn(async (filter, update) => {
          const item = mockRuns.find((r) => {
            for (const [k, v] of Object.entries(filter)) {
              if (r[k] !== v) return false
            }
            return true
          })
          if (item && update.$set) {
            Object.assign(item, update.$set)
          }
          return { matchedCount: item ? 1 : 0, modifiedCount: item ? 1 : 0 }
        }),
      }
    }
    if (name === 'kok_evacuation_cases') {
      return {
        find: vi.fn((query) => ({
          toArray: async () => {
            return mockCases.filter((c) => {
              for (const [k, v] of Object.entries(query)) {
                if (c[k] !== v) return false
              }
              return true
            })
          },
        })),
        insertMany: vi.fn(async (docs) => {
          mockCases.push(...docs)
          return { insertedCount: docs.length }
        }),
        updateOne: vi.fn(async (filter, update, options) => {
          let item = mockCases.find((c) => {
            for (const [k, v] of Object.entries(filter)) {
              if (c[k] !== v) return false
            }
            return true
          })
          if (!item && options?.upsert) {
            item = { ...filter }
            mockCases.push(item)
          }
          if (item && update.$set) {
            Object.assign(item, update.$set)
          }
          return { matchedCount: 1, modifiedCount: 1 }
        }),
        bulkWrite: vi.fn(async (ops) => {
          for (const op of ops) {
            if (op.updateOne) {
              const { filter, update, upsert } = op.updateOne
              let item = mockCases.find((c) => {
                for (const [k, v] of Object.entries(filter)) {
                  if (c[k] !== v) return false
                }
                return true
              })
              if (!item && upsert) {
                item = { ...filter }
                mockCases.push(item)
              }
              if (item && update.$set) {
                Object.assign(item, update.$set)
              }
            }
          }
          return { ok: 1 }
        }),
      }
    }
    throw new Error(`Unexpected collection: ${name}`)
  },
}

vi.mock('../surveys/_db.js', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    getDb: vi.fn(async () => mockDb),
  }
})

const secret = 's'.repeat(40)
const reply = () => {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return response
}

const configure = () => {
  vi.stubEnv('VERCEL', '1')
  vi.stubEnv('APP_ENV', '')
  vi.stubEnv('ADMIN_PASSCODE', 'server-passcode')
  vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017')
}

const tokenFor = () => `Bearer ${loginAdmin('server-passcode').body.token}`

beforeEach(() => {
  mockRuns = []
  mockCases = []
  configure()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Backend Evacuation API', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = reply()
    await getEvacuationHandler({ query: { community: 'thaton' }, headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })

  it('GET /api/admin/evacuation returns 68 queued items and preview run status when no active run exists', async () => {
    const res = reply()
    const req = {
      method: 'GET',
      headers: { authorization: tokenFor() },
      query: { community: 'thaton' },
    }
    await getEvacuationHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.run.status).toBe('idle')
    expect(data.queue).toHaveLength(68)
    expect(data.queue[0].householdId).toBe('MM1-054')
    expect(data.queue[0].level).toBe(1)
    expect(data.queue[0].vulnerableMembers).toBe(2)
    expect(data.queue[0].zone).toBe('สายกองกาด')
    expect(data.destinations).toHaveLength(2)
    expect(data.levelGroups.level1).toBe(4)
    expect(data.levelGroups.level2).toBe(8)
    expect(data.levelGroups.level4).toBe(56)
    expect(data.levelGroups.level5).toBe(61)
  })

  it('POST /api/admin/evacuation/start creates a new run and seeds 68 cases, returning 201', async () => {
    const res = reply()
    const req = {
      method: 'POST',
      headers: { authorization: tokenFor() },
      body: { reviewer: 'ผู้ใหญ่บ้าน', community: 'thaton' },
    }
    await startEvacuationHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.run.status).toBe('open')
    expect(data.run.started_by).toBe('ผู้ใหญ่บ้าน')
    expect(data.queue).toHaveLength(68)
    expect(mockRuns).toHaveLength(1)
    expect(mockCases).toHaveLength(68)
  })

  it('POST /api/admin/evacuation/start returns 409 conflict if a run is already open', async () => {
    mockRuns.push({
      run_id: 'evac_thaton_existing',
      community_id: 'thaton',
      status: 'open',
      started_at: new Date().toISOString(),
      started_by: 'ผู้ใหญ่บ้าน',
    })

    const res = reply()
    const req = {
      method: 'POST',
      headers: { authorization: tokenFor() },
      body: { reviewer: 'ผู้ใหญ่บ้าน' },
    }
    await startEvacuationHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('เปิดอยู่แล้ว') }))
  })

  it('PATCH /api/admin/evacuation/cases/:householdId updates status to en_route and arrived', async () => {
    mockRuns.push({
      run_id: 'evac_thaton_test',
      community_id: 'thaton',
      status: 'open',
      started_at: new Date().toISOString(),
    })
    mockCases.push({
      run_id: 'evac_thaton_test',
      household_id: 'MM1-054',
      status: 'waiting',
      manual_rank: null,
    })

    const res = reply()
    const req = {
      method: 'PATCH',
      headers: { authorization: tokenFor() },
      params: { householdId: 'MM1-054' },
      body: { status: 'arrived', reviewer: 'กู้ภัย 1' },
    }
    await updateEvacuationCaseHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.status).toBe('arrived')

    const updated = mockCases.find((c) => c.household_id === 'MM1-054')
    expect(updated.status).toBe('arrived')
    expect(updated.updated_by).toBe('กู้ภัย 1')
  })

  it('PATCH /api/admin/evacuation/cases/:householdId validates status and household existence', async () => {
    mockRuns.push({
      run_id: 'evac_thaton_test',
      community_id: 'thaton',
      status: 'open',
    })

    const res1 = reply()
    await updateEvacuationCaseHandler({
      headers: { authorization: tokenFor() },
      params: { householdId: 'MM1-054' },
      body: { status: 'invalid_status' },
    }, res1)
    expect(res1.status).toHaveBeenCalledWith(400)

    const res2 = reply()
    await updateEvacuationCaseHandler({
      headers: { authorization: tokenFor() },
      params: { householdId: 'NON_EXISTENT_HOUSE' },
      body: { status: 'arrived' },
    }, res2)
    expect(res2.status).toHaveBeenCalledWith(404)
  })

  it('PUT /api/admin/evacuation/order reorders cases and updates manual_rank', async () => {
    mockRuns.push({
      run_id: 'evac_thaton_test',
      community_id: 'thaton',
      status: 'open',
    })

    const res = reply()
    const req = {
      method: 'PUT',
      headers: { authorization: tokenFor() },
      body: { household_ids: ['MM1-068', 'MM1-054'] },
    }
    await reorderEvacuationHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.count).toBe(2)

    const c1 = mockCases.find((c) => c.household_id === 'MM1-068')
    const c2 = mockCases.find((c) => c.household_id === 'MM1-054')
    expect(c1.manual_rank).toBe(1)
    expect(c2.manual_rank).toBe(2)
  })

  it('POST /api/admin/evacuation/close marks run as closed', async () => {
    mockRuns.push({
      _id: 'run_123',
      run_id: 'evac_thaton_test',
      community_id: 'thaton',
      status: 'open',
    })

    const res = reply()
    const req = {
      method: 'POST',
      headers: { authorization: tokenFor() },
      body: { reviewer: 'หัวหน้าศูนย์' },
    }
    await closeEvacuationHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.status).toBe('closed')
    expect(data.closed_by).toBe('หัวหน้าศูนย์')

    expect(mockRuns[0].status).toBe('closed')
  })

  it('Routes correctly through review.js dispatcher when route=evacuation*', async () => {
    const res = reply()
    const req = {
      method: 'GET',
      headers: { authorization: tokenFor() },
      query: { route: 'evacuation', community: 'thaton' },
    }
    await reviewHandler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const data = res.json.mock.calls[0][0]
    expect(data.ok).toBe(true)
    expect(data.queue).toHaveLength(68)
  })
})
