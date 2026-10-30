// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminBypass, loginAdmin, reviewerName, verifyAdminAuth } from './_admin_shared.js'
import photo from './photo.js'
import review from './review.js'
import { reviewSample } from '../surveys/_db.js'
import { readPhoto } from '../surveys/_photos.js'

vi.mock('../surveys/_db.js', () => ({ reviewSample: vi.fn(), buildAdminQueue: vi.fn() }))
vi.mock('../surveys/_photos.js', () => ({ readPhoto: vi.fn() }))

const secret = 's'.repeat(40)
const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() }
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
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('admin login', () => {
  it('has no built-in passcode: refuses to log in until the server sets one', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ADMIN_PASSCODE', '')
    vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
    for (const old of ['mfu2026admin', 'admin987642a']) expect(loginAdmin(old).status).toBe(503)
    vi.stubEnv('ADMIN_PASSCODE', 'server-passcode')
    vi.stubEnv('SURVEY_SIGNING_SECRET', '')
    expect(loginAdmin('server-passcode').status).toBe(503)
  })
  it('accepts only the configured passcode', () => {
    configure()
    expect(loginAdmin('mfu2026admin').status).toBe(401)
    expect(loginAdmin(123).status).toBe(400)
    expect(loginAdmin('  ').status).toBe(400)
    const ok = loginAdmin(' server-passcode ')
    expect(ok.status).toBe(200)
    expect(ok.body.token).toMatch(/^\d+\.[0-9a-f]{64}$/)
  })
  it('verifies tokens, rejects forged, expired and passcode-in-header requests', () => {
    configure()
    const bearer = tokenFor()
    expect(verifyAdminAuth({ headers: { authorization: bearer } })).toBe(true)
    expect(verifyAdminAuth({ headers: { 'x-admin-token': bearer.slice(7) } })).toBe(true)
    expect(verifyAdminAuth({ headers: { authorization: `${bearer}0` } })).toBe(false)
    expect(verifyAdminAuth({ headers: { 'x-admin-passcode': 'server-passcode' } })).toBe(false)
    expect(verifyAdminAuth({ headers: {} })).toBe(false)
    const [ts] = bearer.slice(7).split('.')
    expect(verifyAdminAuth({ headers: { authorization: `Bearer ${ts}.${'0'.repeat(64)}` } })).toBe(false)
    vi.useFakeTimers({ now: Date.now() + 13 * 60 * 60 * 1000 })
    expect(verifyAdminAuth({ headers: { authorization: bearer } })).toBe(false)
    vi.useRealTimers()
  })
  it('normalizes the reviewer display name', () => {
    expect(reviewerName('  สมหญิง ใจดี ')).toBe('สมหญิง ใจดี')
    expect(reviewerName('x'.repeat(200))).toHaveLength(80)
    for (const value of ['', '   ', null, 42, { a: 1 }]) expect(reviewerName(value)).toBeNull()
  })
})

describe('development bypass', () => {
  it('opens the admin pages without a passcode on a local run only', () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('ADMIN_BYPASS', '')
    vi.stubEnv('ADMIN_PASSCODE', 'server-passcode')
    vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
    expect(adminBypass()).toBe(true)
    expect(loginAdmin('')).toMatchObject({ status: 200, body: { bypass: true } })
    expect(verifyAdminAuth({ headers: {} })).toBe(true)
    vi.stubEnv('ADMIN_BYPASS', 'off')
    expect(adminBypass()).toBe(false)
    expect(verifyAdminAuth({ headers: {} })).toBe(false)
  })
  it('is never active on Vercel or with APP_ENV=production', () => {
    for (const production of [{ VERCEL: '1', APP_ENV: '' }, { VERCEL: '', APP_ENV: 'production' }]) {
      for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value)
      vi.stubEnv('ADMIN_BYPASS', '')
      expect(adminBypass()).toBe(false)
      expect(verifyAdminAuth({ headers: {} })).toBe(false)
    }
  })
})

describe('admin photo endpoint', () => {
  const path = '11111111-1111-4111-8111-111111111111/1.png'
  it('requires an admin token before touching storage', async () => {
    configure()
    const response = reply()
    await photo({ method: 'GET', headers: {}, query: { path } }, response)
    expect(response.status).toHaveBeenCalledWith(401)
    expect(readPhoto).not.toHaveBeenCalled()
  })
  it('streams the private photo to an authenticated admin', async () => {
    configure()
    readPhoto.mockResolvedValue({ contentType: 'image/png', buffer: Buffer.from([137, 80]) })
    const response = reply()
    await photo({ method: 'GET', headers: { authorization: tokenFor() }, query: { path } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.send).toHaveBeenCalledWith(Buffer.from([137, 80]))
  })
})

describe('admin review endpoint', () => {
  it('records who approved and when, and rejects unauthenticated calls', async () => {
    configure()
    const denied = reply()
    await review({ method: 'POST', headers: {}, query: {}, body: { sampleCode: 'KOK-20261030-0001', decision: 'approve' } }, denied)
    expect(denied.status).toHaveBeenCalledWith(401)
    expect(reviewSample).not.toHaveBeenCalled()

    reviewSample.mockResolvedValue('approved')
    const response = reply()
    await review({ method: 'POST', headers: { authorization: tokenFor() }, query: {}, body: { sampleCode: 'KOK-20261030-0001', decision: 'approve', reason: 'ตรวจแล้ว', reviewer: ' สมหญิง ' } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(reviewSample).toHaveBeenCalledWith(expect.anything(), 'KOK-20261030-0001', 'approve', 'ตรวจแล้ว', 'สมหญิง')
  })
})
