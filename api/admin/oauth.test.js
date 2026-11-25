import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./_users_db.js', () => ({
  getRoleById: vi.fn(),
  getUserById: vi.fn(),
  getUserByUsername: vi.fn(),
  recordUserLogin: vi.fn(),
  verifyPassword: vi.fn(),
  findOrUpsertOAuthUser: vi.fn(),
}))

import { googleOAuthCallbackHandler, googleOAuthStartHandler, oauthStatusHandler } from './_oauth.js'
import { findOrUpsertOAuthUser } from './_users_db.js'

function mockRes() {
  const headers = {}
  return {
    statusCode: 200,
    headers,
    body: '',
    setHeader(k, v) { headers[k.toLowerCase()] = v },
    status(s) { this.statusCode = s; return this },
    json(b) { this.body = JSON.stringify(b); return this },
    end(payload = '') { this.body = payload; return this },
  }
}

describe('Google OAuth admin login', () => {
  const prevEnv = { ...process.env }

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_OAUTH_SUPER_ADMINS = 'napus.dev@gmail.com'
    process.env.SURVEY_SIGNING_SECRET = '12345678901234567890123456789012'
  })

  afterEach(() => {
    process.env = { ...prevEnv }
    vi.restoreAllMocks()
  })

  it('reports googleEnabled in oauthStatusHandler', async () => {
    const res = mockRes()
    await oauthStatusHandler({}, res)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ ok: true, googleEnabled: true })
  })

  it('redirects start handler to Google OAuth with signed state and issues token on callback for super admin', async () => {
    const startRes = mockRes()
    await googleOAuthStartHandler({ headers: { host: '127.0.0.1:5173' } }, startRes)
    expect(startRes.statusCode).toBe(302)
    const authUrl = new URL(startRes.headers.location)
    expect(authUrl.origin + authUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(authUrl.searchParams.get('client_id')).toBe('test-client-id')
    expect(authUrl.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5173/api/auth/google/callback')
    const state = authUrl.searchParams.get('state')
    expect(state).toBeTruthy()

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'goog-access' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ email: 'napus.dev@gmail.com', email_verified: true, name: 'Napus' }) }))

    vi.mocked(findOrUpsertOAuthUser).mockResolvedValueOnce({
      user: { id: 'usr-napus', username: 'napus.dev@gmail.com', roleId: 'super-admin' },
      role: { id: 'super-admin', name: 'ผู้ดูแลระบบสูงสุด (Super Admin)' },
    })

    const cbRes = mockRes()
    await googleOAuthCallbackHandler({ headers: { host: '127.0.0.1:5173' }, query: { code: 'auth-code', state } }, cbRes)
    expect(cbRes.statusCode).toBe(302)
    expect(findOrUpsertOAuthUser).toHaveBeenCalledWith({
      email: 'napus.dev@gmail.com',
      displayName: 'Napus',
      isSuperAdmin: true,
    })
    expect(cbRes.headers.location).toMatch(/^http:\/\/127\.0\.0\.1:5173\/\?view=admin#oauth_token=u\./)
  })

  it('rejects tampered state on callback', async () => {
    const cbRes = mockRes()
    await googleOAuthCallbackHandler({ headers: { host: '127.0.0.1:5173' }, query: { code: 'x', state: 'bad.state' } }, cbRes)
    expect(cbRes.statusCode).toBe(302)
    expect(cbRes.headers.location).toContain('oauth_error=')
  })
})
