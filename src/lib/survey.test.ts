import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { arsenicLevels, fetchSurveyWaypoints, submitWaterSurvey, validateSurveyPhoto, type WaterSurveyInput } from './survey'

const coordinates = { latitude: 20.0451, longitude: 99.8912 }
const waypoint = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sample_code: 'KOK-20260925-0001',
  arsenic_level_ppb: 5,
  latitude: coordinates.latitude,
  longitude: coordinates.longitude,
  gps_accuracy_meters: null,
  created_at: '2026-09-25T08:00:00.000Z',
}

function input(overrides: Partial<WaterSurveyInput> = {}): WaterSurveyInput {
  return {
    fullName: 'สมชาย ใจดี', phoneNumber: '0812345678', arsenicLevelPpb: 5, coordinates, gpsAccuracyMeters: null,
    photos: [null, null], turnstileToken: 'captcha-token', publicConsent: true, ...overrides,
  }
}

function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 400): Response {
  return { ok, status, json: async () => payload } as Response
}

afterEach(() => vi.unstubAllGlobals())

describe('water survey submission', () => {
  it.each(arsenicLevels)('sends approved arsenic level %i ppb through protected server API', async (level) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ticket: 'signed-ticket', uploads: [] }))
      .mockResolvedValueOnce(jsonResponse({ ...waypoint, arsenic_level_ppb: level }, true, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitWaterSurvey(null, input({ arsenicLevelPpb: level }))).resolves.toMatchObject({ arsenic_level_ppb: level })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/surveys/prepare', expect.objectContaining({ method: 'POST' }))
    const prepared = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(prepared).toMatchObject({ arsenicLevelPpb: level, turnstileToken: 'captcha-token', publicConsent: true })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/surveys/complete', expect.objectContaining({ method: 'POST' }))
  })

  it('rejects unlisted levels, missing contact info (R05), missing coordinates, or public consent before network calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(submitWaterSurvey(null, input({ arsenicLevelPpb: 6 }))).rejects.toThrow('กรุณาเลือกระดับสารหนู')
    await expect(submitWaterSurvey(null, input({ fullName: '   ' }))).rejects.toThrow('กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์')
    await expect(submitWaterSurvey(null, input({ phoneNumber: '' }))).rejects.toThrow('กรุณากรอกชื่อ-นามสกุลและเบอร์โทรศัพท์')
    await expect(submitWaterSurvey(null, input({ coordinates: null }))).rejects.toThrow('กรุณาบันทึกพิกัด GPS')
    await expect(submitWaterSurvey(null, input({ publicConsent: false }))).rejects.toThrow('ยินยอมเผยแพร่')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('submits without a CAPTCHA token while Turnstile is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ ticket: 'signed-ticket', uploads: [] })).mockResolvedValueOnce(jsonResponse(waypoint, true, 201))
    vi.stubGlobal('fetch', fetchMock)
    await expect(submitWaterSurvey(null, input({ turnstileToken: '' }))).resolves.toMatchObject(waypoint)
  })

  it('validates real image content before requesting an upload slot', async () => {
    const fakePng = new File(['not a png'], 'sample.png', { type: 'image/png' })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(validateSurveyPhoto(fakePng)).resolves.toContain('ไม่ตรงกับชนิด')
    await expect(submitWaterSurvey(null, input({ photos: [fakePng, null] }))).rejects.toThrow('ไม่ตรงกับชนิด')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads an optional image through a short-lived signed URL, then completes submission', async () => {
    const uploadToSignedUrl = vi.fn().mockResolvedValue({ error: null })
    const client = { storage: { from: vi.fn(() => ({ uploadToSignedUrl })) } } as unknown as SupabaseClient
    const photo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])], 'water.png', { type: 'image/png' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ticket: 'signed-ticket', uploads: [{ index: 0, path: `${waypoint.id}/1.png`, token: 'upload-token' }] }))
      .mockResolvedValueOnce(jsonResponse(waypoint, true, 201))
    vi.stubGlobal('fetch', fetchMock)

    await submitWaterSurvey(client, input({ photos: [photo, null] }))

    expect(uploadToSignedUrl).toHaveBeenCalledWith(`${waypoint.id}/1.png`, 'upload-token', photo, { contentType: 'image/png', upsert: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not contact hosted Supabase directly to read public waypoint data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([waypoint]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchSurveyWaypoints(null)).resolves.toEqual([waypoint])
    expect(fetchMock).toHaveBeenCalledWith('/api/surveys/waypoints', { headers: { accept: 'application/json' } })
  })

  it('reports API errors without disclosing response internals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'ส่งแบบสำรวจครบจำนวนชั่วคราวแล้ว กรุณารอสักครู่' }, false, 429))
    vi.stubGlobal('fetch', fetchMock)
    await expect(submitWaterSurvey(null, input())).rejects.toThrow('ส่งแบบสำรวจครบจำนวนชั่วคราวแล้ว')
  })
})
