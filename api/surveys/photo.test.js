// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import photo from './photo.js'

const reply = () => {
  const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}
const path = '11111111-1111-4111-8111-111111111111/1.png'
const row = (extra) => new Response(JSON.stringify([{ arsenic_ppb: 5, publication_status: 'auto_published', private_photo_paths: [path], ...extra }]))
const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('public sample photo endpoint', () => {
  it('rejects malformed codes and indexes without querying storage', async () => {
    vi.stubGlobal('fetch', vi.fn())
    for (const query of [{ code: '../x', n: '1' }, { code: 'KOK-20261023-0010', n: '3' }]) {
      const response = reply()
      await photo({ method: 'GET', query }, response)
      expect(response.status).toHaveBeenCalledWith(400)
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('streams photos only for published samples', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(row()).mockResolvedValueOnce(png()))
    const response = reply()
    await photo({ method: 'GET', query: { code: 'KOK-20261023-0010', n: '1' } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(String(fetch.mock.calls[1][0])).toContain(`/storage/v1/object/survey-photos/${path}`)
  })

  it('hides photos of pending, rejected, or over-50 auto-published samples', async () => {
    for (const extra of [{ publication_status: 'pending_review' }, { publication_status: 'rejected' }, { arsenic_ppb: 80 }]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(row(extra)))
      const response = reply()
      await photo({ method: 'GET', query: { code: 'KOK-20261023-0010', n: '1' } }, response)
      expect(response.status).toHaveBeenCalledWith(404)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  })
})
