// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import photo from './photo.js'
import { readPhoto } from './_photos.js'
import { findSamplePhotoInfo } from './_db.js'

vi.mock('./_db.js', () => ({ findSamplePhotoInfo: vi.fn() }))
vi.mock('./_photos.js', async (importOriginal) => ({ ...await importOriginal(), readPhoto: vi.fn() }))

const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}
const path = '11111111-1111-4111-8111-111111111111/1.png'
const row = (extra) => ({ arsenic_ppb: 5, publication_status: 'auto_published', private_photo_paths: [path], ...extra })
const png = () => ({ contentType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) })

beforeEach(() => {
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017')
})
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('public sample photo endpoint', () => {
  it('rejects malformed codes and indexes without querying storage', async () => {
    for (const query of [{ code: '../x', n: '1' }, { code: 'KOK-20261023-0010', n: '3' }]) {
      const response = reply()
      await photo({ method: 'GET', query }, response)
      expect(response.status).toHaveBeenCalledWith(400)
    }
    expect(findSamplePhotoInfo).not.toHaveBeenCalled()
  })

  it('streams photos only for published samples', async () => {
    findSamplePhotoInfo.mockResolvedValue(row())
    readPhoto.mockResolvedValue(png())
    const response = reply()
    await photo({ method: 'GET', query: { code: 'KOK-20261023-0010', n: '1' } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(readPhoto).toHaveBeenCalledWith(expect.anything(), path)
    expect(response.send).toHaveBeenCalledWith(Buffer.from([137, 80, 78, 71]))
  })

  it('hides photos of pending, rejected, or over-50 auto-published samples', async () => {
    for (const extra of [{ publication_status: 'pending_review' }, { publication_status: 'rejected' }, { arsenic_ppb: 80 }]) {
      findSamplePhotoInfo.mockResolvedValue(row(extra))
      const response = reply()
      await photo({ method: 'GET', query: { code: 'KOK-20261023-0010', n: '1' } }, response)
      expect(response.status).toHaveBeenCalledWith(404)
      expect(readPhoto).not.toHaveBeenCalled()
    }
  })
})
