// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminBypass, loginAdmin, reviewerName, verifyAdminAuth } from './_admin_shared.js'
import photo from './photo.js'
import review from './review.js'
import samples, { parseSampleEdit } from './samples.js'
import { deleteSampleRecords, findSamplePhotoPaths, reviewSample, updateSample } from '../surveys/_db.js'
import { deletePhotos, readPhoto } from '../surveys/_photos.js'

vi.mock('../surveys/_db.js', async (importOriginal) => ({
  statusAfterEdit: (await importOriginal()).statusAfterEdit,
  reviewSample: vi.fn(),
  buildAdminQueue: vi.fn(),
  updateSample: vi.fn(),
  findSamplePhotoPaths: vi.fn(),
  deleteSampleRecords: vi.fn(),
}))
vi.mock('../surveys/_photos.js', () => ({ readPhoto: vi.fn(), deletePhotos: vi.fn() }))

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

describe('admin sample edit and delete', () => {
  const code = 'KOK-20261030-0001'
  const edit = { arsenicPpb: 100, latitude: 20.05, longitude: 99.36, waterSource: 'บ่อ', collectionTime: '2026-10-30T07:30:00.000Z', contactName: ' สมชาย ', contactPhone: '081', reviewer: ' สมหญิง ' }

  it('requires an admin token before changing anything', async () => {
    configure()
    for (const method of ['PUT', 'DELETE']) {
      const response = reply()
      await samples({ method, headers: {}, query: { sampleCode: code }, body: edit }, response)
      expect(response.status).toHaveBeenCalledWith(401)
    }
    expect(updateSample).not.toHaveBeenCalled()
    expect(deleteSampleRecords).not.toHaveBeenCalled()
  })

  it('saves valid values with the editor name, and refuses invalid ones', async () => {
    configure()
    updateSample.mockResolvedValue('pending_review')
    const response = reply()
    await samples({ method: 'PUT', headers: { authorization: tokenFor() }, query: { sampleCode: code }, body: edit }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(updateSample).toHaveBeenCalledWith(expect.anything(), code, expect.objectContaining({ arsenicPpb: 100, contactName: 'สมชาย' }), 'สมหญิง')

    for (const bad of [{ arsenicPpb: '100' }, { arsenicPpb: -1 }, { latitude: 91 }, { longitude: 181 }, { waterSource: '' }, { collectionTime: 'x' }, { contactPhone: 'x'.repeat(41) }]) {
      expect(parseSampleEdit({ ...edit, ...bad })).toBeNull()
    }
  })

  it('answers 404 for an unknown sample', async () => {
    configure()
    updateSample.mockResolvedValue(null)
    findSamplePhotoPaths.mockResolvedValue(null)
    for (const method of ['PUT', 'DELETE']) {
      const response = reply()
      await samples({ method, headers: { authorization: tokenFor() }, query: { sampleCode: code }, body: edit }, response)
      expect(response.status).toHaveBeenCalledWith(404)
    }
    expect(deleteSampleRecords).not.toHaveBeenCalled()
  })

  it('deletes the photos before the records, and keeps the records if the photos fail', async () => {
    configure()
    const paths = ['11111111-1111-4111-8111-111111111111/1.png']
    findSamplePhotoPaths.mockResolvedValue(paths)
    const response = reply()
    await samples({ method: 'DELETE', headers: { authorization: tokenFor() }, query: { sampleCode: code } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(deletePhotos).toHaveBeenCalledWith(expect.anything(), paths)
    expect(deleteSampleRecords).toHaveBeenCalledWith(expect.anything(), code)

    vi.clearAllMocks()
    findSamplePhotoPaths.mockResolvedValue(paths)
    deletePhotos.mockRejectedValue(new Error('down'))
    const failed = reply()
    await samples({ method: 'DELETE', headers: { authorization: tokenFor() }, query: { sampleCode: code } }, failed)
    expect(failed.status).toHaveBeenCalledWith(503)
    expect(deleteSampleRecords).not.toHaveBeenCalled()
  })

  it('re-queues a published sample above 50 ppb and publishes a pending one at or below it', async () => {
    const { statusAfterEdit } = await import('../surveys/_db.js')
    expect(statusAfterEdit('auto_published', 100)).toBe('pending_review')
    expect(statusAfterEdit('pending_review', 50)).toBe('auto_published')
    expect(statusAfterEdit('approved', 500)).toBe('approved')
    expect(statusAfterEdit('rejected', 5)).toBe('rejected')
  })
})
