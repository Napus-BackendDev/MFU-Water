// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUploadTarget, photoPathPattern, verifyUploadToken } from './_photos.js'

vi.mock('./_db.js', () => ({ getDb: vi.fn() }))

const secret = 's'.repeat(40)
const path = '11111111-1111-4111-8111-111111111111/1.png'
afterEach(() => vi.useRealTimers())

describe('upload token', () => {
  it('points at the upload endpoint and is bound to the photo path', () => {
    const { token, url } = createUploadTarget({ signingSecret: secret }, path)
    expect(url).toBe(`/api/surveys/upload?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`)
    expect(verifyUploadToken(secret, path, token)).toBe(true)
    expect(verifyUploadToken(secret, '22222222-2222-4222-8222-222222222222/1.png', token)).toBe(false)
    expect(verifyUploadToken('x'.repeat(40), path, token)).toBe(false)
    expect(verifyUploadToken(secret, path, `${token}0`)).toBe(false)
    expect(verifyUploadToken('', path, token)).toBe(false)
  })
  it('expires after ten minutes', () => {
    const { token } = createUploadTarget({ signingSecret: secret }, path)
    vi.useFakeTimers({ now: Date.now() + 11 * 60 * 1000 })
    expect(verifyUploadToken(secret, path, token)).toBe(false)
  })
})

describe('photo paths', () => {
  it('accepts only system-made paths', () => {
    expect(photoPathPattern.test(path)).toBe(true)
    expect(photoPathPattern.test('samples/11111111-1111-4111-8111-111111111111.jpg')).toBe(true)
    for (const bad of ['../x.png', `${path}/..`, '11111111-1111-4111-8111-111111111111/3.png', 'a/1.gif']) expect(photoPathPattern.test(bad)).toBe(false)
  })
})
