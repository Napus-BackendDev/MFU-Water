// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, issueTicket, readTicket, stableSurveyHash, validateSurvey, verifyCaptcha, clientIp, hashClientIp } from './_shared.js'
import complete from './complete.js'
import waypoints from './waypoints.js'
import prepare from './prepare.js'

const secret = 'a'.repeat(32)
const body = { fullName: 'สมชาย ใจดี', phoneNumber: '0812345678', arsenicLevelPpb: 5, coordinates: { latitude: 20, longitude: 99 }, gpsAccuracyMeters: null, publicConsent: true }
const id = '11111111-1111-4111-8111-111111111111'
const claims = () => ({ surveyId: id, sampleCode: 'KOK-20261012-0001', ipHash: hashClientIp(secret, '127.0.0.1'), payloadHash: stableSurveyHash(secret, body, [null, null]), photoPaths: [null, null], consentAt: new Date().toISOString(), expiresAt: Date.now() + 60000 })
const reply = () => { const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() }; response.status.mockReturnValue(response); return response }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('survey server security', () => {
  it('validates values, required internal contact fields (R05), and explicit consent before reserving a survey', () => {
    expect(validateSurvey(body)).toBe(true)
    expect(validateSurvey({ ...body, waterSourceType: 'แม่น้ำ', rainContext: 'ไม่ทราบ', sampleCollectedAt: '2026-10-16T09:00' })).toBe(true)
    for (const invalid of [{ publicConsent: false }, { fullName: null }, { fullName: '   ' }, { phoneNumber: null }, { phoneNumber: '' }, { arsenicLevelPpb: 6 }, { coordinates: { latitude: NaN, longitude: 99 } }, { gpsAccuracyMeters: -1 }, { fullName: 'x'.repeat(201) }, { waterSourceType: 'ทะเล' }, { rainContext: 'พายุ' }]) expect(validateSurvey({ ...body, ...invalid })).toBe(false)
  })
  it('hashes the persisted payload consistently across prepare and complete', () => {
    expect(stableSurveyHash(secret, { ...body, turnstileToken: 'captcha' }, [null, null])).toBe(stableSurveyHash(secret, { ...body, publicConsent: undefined, ticket: 'ticket' }, [null, null]))
    expect(stableSurveyHash(secret, { ...body, arsenicLevelPpb: 10 }, [null, null])).not.toBe(stableSurveyHash(secret, body, [null, null]))
  })
  it('rejects tampered, expired and invalid-path signed tickets', () => {
    expect(readTicket(secret, issueTicket(secret, claims()))?.surveyId).toBe(id)
    expect(readTicket(secret, issueTicket(secret, claims()) + 'x')).toBeNull()
    expect(readTicket(secret, issueTicket(secret, { ...claims(), expiresAt: Date.now() - 1 }))).toBeNull()
    expect(readTicket(secret, issueTicket(secret, { ...claims(), photoPaths: ['../other/file.jpg', null] }))).toBeNull()
  })
  it('cannot bypass payload binding with an attacker-supplied ip field', () => {
    const original = { ...body, ip: 'attacker' }
    expect(stableSurveyHash(secret, original, [null, null])).toBe(stableSurveyHash(secret, body, [null, null]))
    expect(stableSurveyHash(secret, { ...original, arsenicLevelPpb: 500 }, [null, null])).not.toBe(stableSurveyHash(secret, original, [null, null]))
  })
  it('requires server settings for submission, but not CAPTCHA for read-only endpoints', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('VITE_TURNSTILE_ENABLED', 'true')
    expect(config(false).url).toBe('https://example.supabase.co')
    expect(() => config()).toThrow('Missing server configuration')
  })
  it('verifies CAPTCHA hostname and action at the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, hostname: 'localhost', action: 'other' }))))
    expect(await verifyCaptcha('secret', 'token', '127.0.0.1', 'localhost', ['localhost'])).toBe(false)
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true, hostname: 'localhost', action: 'survey' })))
    expect(await verifyCaptcha('secret', 'token', '127.0.0.1', 'localhost', ['localhost'])).toBe(true)
  })
  it('ignores spoofed forwarded IPs on the local server', () => {
    vi.stubEnv('VERCEL', '')
    expect(clientIp({ headers: { 'x-forwarded-for': 'attacker' }, socket: { remoteAddress: '127.0.0.1' } })).toBe('127.0.0.1')
  })
  it('keeps server rate limits active when CAPTCHA is disabled', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test')
    vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
    vi.stubEnv('VITE_TURNSTILE_ENABLED', 'false')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', '')
    vi.stubEnv('VERCEL', '')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ allowed: false, retry_after_seconds: 120 }]))))
    const response = reply()
    await prepare({ method: 'POST', headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' }, body: { ...body, photoTypes: [null, null] } }, response)
    expect(response.status).toHaveBeenCalledWith(429)
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '120')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(fetch.mock.calls[0][0])).toContain('/rpc/reserve_water_quality_survey')
  })
  it('returns a committed survey on retry without deleting its photos', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test')
    vi.stubEnv('SURVEY_SIGNING_SECRET', secret)
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'captcha-test')
    vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', 'localhost')
    vi.stubEnv('VERCEL', '')
    const paths = [`${id}/1.jpg`, null]
    const ticket = issueTicket(secret, { ...claims(), photoPaths: paths, payloadHash: stableSurveyHash(secret, body, paths) })
    const saved = { id, sample_code: 'KOK-20261012-0001' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([saved]))))
    const response = reply()
    await complete({ method: 'POST', headers: {}, socket: { remoteAddress: '127.0.0.1' }, body: { ...body, ticket } }, response)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith(saved)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].method).toBeUndefined()
  })
  it('fails closed when the waypoint database is unavailable', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    const response = reply()
    await waypoints({ method: 'GET' }, response)
    expect(response.status).toHaveBeenCalledWith(503)
  })
})
