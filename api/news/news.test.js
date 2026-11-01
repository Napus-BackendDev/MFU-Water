// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import newsDispatcher, { pickNewsHandler } from './index.js'
import newsIndexHandler from './_public.js'
import newsPhotoHandler from './_photo.js'
import {
  getAdminNewsHandler,
  createAdminNewsHandler,
  updateAdminNewsHandler,
  deleteAdminNewsHandler,
  toggleAdminPinHandler,
  uploadAdminNewsPhotoHandler,
} from './_admin.js'

const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('public news api', () => {
  it('returns seeded news list when called without filters', async () => {
    const req = { method: 'GET', query: {} }
    const res = reply()
    await newsIndexHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalled()
    const payload = res.json.mock.calls[0][0]
    expect(payload.ok).toBe(true)
    expect(payload.items.length).toBeGreaterThanOrEqual(1)
  })

  it('retrieves single article by id', async () => {
    const list = reply()
    await newsIndexHandler({ method: 'GET', query: {} }, list)
    const { id } = list.json.mock.calls[0][0].items[0]

    const req = { method: 'GET', query: { id } }
    const res = reply()
    await newsIndexHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.ok).toBe(true)
    expect(payload.article.id).toBe(id)
  })

  it('returns 404 for non-existent article', async () => {
    const req = { method: 'GET', query: { id: 'NW-NON-EXISTENT' } }
    const res = reply()
    await newsIndexHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    const payload = res.json.mock.calls[0][0]
    expect(payload.error).toBe('ไม่พบข่าวสารที่ต้องการ')
  })
})

describe('admin news api and MongoDB GridFS photo upload', () => {
  it('allows access in dev bypass mode', async () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('APP_ENV', 'development')
    const req = { method: 'GET', headers: {} }
    const res = reply()
    await getAdminNewsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.ok).toBe(true)
    expect(payload.counts).toBeDefined()
  })

  it('uploads a news photo to MongoDB GridFS and serves it via public endpoint', async () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('APP_ENV', 'development')

    const fakeJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const uploadReq = {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      query: { filename: 'test-satellite.jpg' },
      body: fakeJpg,
    }
    const uploadRes = reply()
    await uploadAdminNewsPhotoHandler(uploadReq, uploadRes)

    expect(uploadRes.status).toHaveBeenCalledWith(201)
    const result = uploadRes.json.mock.calls[0][0]
    expect(result.ok).toBe(true)
    expect(result.url).toMatch(/^\/api\/news\/photo\//)
    expect(result.filename).toBeDefined()

    // Test public photo retrieval from GridFS
    const photoReq = {
      method: 'GET',
      params: { filename: result.filename },
      url: `/api/news/photo/${result.filename}`,
      headers: {},
    }
    const photoRes = reply()
    await newsPhotoHandler(photoReq, photoRes)
    expect(photoRes.status).toHaveBeenCalledWith(200)
    expect(photoRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg')
    expect(photoRes.send).toHaveBeenCalled()
  })

  it('creates, updates, pins, and deletes article', async () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('APP_ENV', 'development')

    // Create
    const createReq = {
      method: 'POST',
      headers: {},
      body: {
        title: 'ข่าวด่วนทดสอบระบบ',
        category: 'urgent',
        community_id: 'thaton',
        summary: 'สรุปการทดสอบ',
        content: 'เนื้อหาทดสอบระบบข่าว',
      },
    }
    const createRes = reply()
    await createAdminNewsHandler(createReq, createRes)
    expect(createRes.status).toHaveBeenCalledWith(201)
    const createdId = createRes.json.mock.calls[0][0].article.id
    expect(createdId).toMatch(/^NW-/)
    const publishedAt = createRes.json.mock.calls[0][0].article.published_at

    // The next article takes the number after the highest id, not the article count
    const secondRes = reply()
    await createAdminNewsHandler({ method: 'POST', headers: {}, body: { title: 'ข่าวทดสอบที่สอง', content: 'เนื้อหา' } }, secondRes)
    expect(secondRes.status).toHaveBeenCalledWith(201)
    const secondId = secondRes.json.mock.calls[0][0].article.id
    expect(Number(secondId.split('-')[2])).toBe(Number(createdId.split('-')[2]) + 1)
    await deleteAdminNewsHandler({ method: 'DELETE', headers: {}, params: { id: secondId } }, reply())

    // Toggle Pin
    const pinReq = { method: 'POST', headers: {}, params: { id: createdId }, body: { is_pinned: true } }
    const pinRes = reply()
    await toggleAdminPinHandler(pinReq, pinRes)
    expect(pinRes.status).toHaveBeenCalledWith(200)
    expect(pinRes.json.mock.calls[0][0].article.is_pinned).toBe(true)

    // Editing a published article keeps its publish date
    const keepDateRes = reply()
    await updateAdminNewsHandler({ method: 'PUT', headers: {}, params: { id: createdId }, body: { status: 'published' } }, keepDateRes)
    expect(keepDateRes.json.mock.calls[0][0].article.published_at).toBe(new Date(publishedAt).toISOString())

    // Update
    const updateReq = {
      method: 'PUT',
      headers: {},
      params: { id: createdId },
      body: { title: 'ข่าวด่วนทดสอบระบบ (อัปเดต)' },
    }
    const updateRes = reply()
    await updateAdminNewsHandler(updateReq, updateRes)
    expect(updateRes.status).toHaveBeenCalledWith(200)

    // Delete
    const deleteReq = { method: 'DELETE', headers: {}, params: { id: createdId } }
    const deleteRes = reply()
    await deleteAdminNewsHandler(deleteReq, deleteRes)
    expect(deleteRes.status).toHaveBeenCalledWith(200)
  })
})

describe('single Vercel news function', () => {
  it('routes rewritten URLs to the right handler by ?route= and method', () => {
    expect(pickNewsHandler({ method: 'GET', query: {} })).toBeTypeOf('function')
    expect(pickNewsHandler({ method: 'GET', query: { route: 'photo' } })).toBe(newsPhotoHandler)
    expect(pickNewsHandler({ method: 'POST', query: { route: 'admin-upload' } })).toBe(uploadAdminNewsPhotoHandler)
    expect(pickNewsHandler({ method: 'POST', query: { route: 'admin-pin' } })).toBe(toggleAdminPinHandler)
    expect(pickNewsHandler({ method: 'GET', query: { route: 'admin' } })).toBe(getAdminNewsHandler)
    expect(pickNewsHandler({ method: 'POST', query: { route: 'admin' } })).toBe(createAdminNewsHandler)
    expect(pickNewsHandler({ method: 'PUT', query: { route: 'admin' } })).toBe(updateAdminNewsHandler)
    expect(pickNewsHandler({ method: 'DELETE', query: { route: 'admin' } })).toBe(deleteAdminNewsHandler)
    expect(pickNewsHandler({ method: 'PATCH', query: { route: 'admin' } })).toBeUndefined()
  })

  it('rejects unsupported admin methods with 405', async () => {
    const res = reply()
    await newsDispatcher({ method: 'PATCH', query: { route: 'admin' } }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('has a vercel.json rewrite for every news URL the app uses, mapping to the one function', () => {
    const { rewrites } = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'))
    const target = (source) => rewrites.find((rule) => rule.source === source)?.destination
    expect(target('/api/news/photo/:filename')).toBe('/api/news?route=photo&filename=:filename')
    expect(target('/api/news/:id')).toBe('/api/news?id=:id')
    expect(target('/api/admin/news')).toBe('/api/news?route=admin')
    expect(target('/api/admin/news/:id')).toBe('/api/news?route=admin&id=:id')
    expect(target('/api/admin/news/:id/pin')).toBe('/api/news?route=admin-pin&id=:id')
    expect(target('/api/admin/news/upload')).toBe('/api/news?route=admin-upload')
    // static "upload" must come before the generic :id rule
    const order = rewrites.map((rule) => rule.source)
    expect(order.indexOf('/api/admin/news/upload')).toBeLessThan(order.indexOf('/api/admin/news/:id'))
  })
})
