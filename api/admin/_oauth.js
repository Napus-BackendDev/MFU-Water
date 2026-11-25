import { randomBytes } from 'node:crypto'
import { respond } from '../surveys/_shared.js'
import { issueUserToken, signOAuthState, verifyOAuthState } from './_admin_shared.js'
import { findOrUpsertOAuthUser } from './_users_db.js'

function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || ''
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || ''
  const superAdmins = (process.env.GOOGLE_OAUTH_SUPER_ADMINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return { clientId, clientSecret, superAdmins }
}

function requestOrigin(req) {
  const protoHeader = req.headers?.['x-forwarded-proto']
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)?.split(',')[0]?.trim() || 'http'
  const hostHeader = req.headers?.['x-forwarded-host'] || req.headers?.host || '127.0.0.1:5173'
  const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader).split(',')[0].trim()
  return `${proto}://${host}`
}

function redirect(res, location) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Location', location)
  res.statusCode = 302
  return res.end()
}

export async function oauthStatusHandler(_req, res) {
  const { clientId, clientSecret } = googleOAuthConfig()
  return respond(res, 200, {
    ok: true,
    googleEnabled: Boolean(clientId && clientSecret),
  })
}

export async function googleOAuthStartHandler(req, res) {
  const { clientId, clientSecret } = googleOAuthConfig()
  if (!clientId || !clientSecret) {
    return respond(res, 503, { error: 'ยังไม่ได้ตั้งค่า Google OAuth บนเซิร์ฟเวอร์' })
  }
  const origin = requestOrigin(req)
  const redirectUri = `${origin}/api/auth/google/callback`
  const state = signOAuthState({ nonce: randomBytes(12).toString('hex'), origin, redirectUri })
  if (!state) {
    return respond(res, 503, { error: 'ระบบยังไม่ได้ตั้งค่าคีย์ลงนามเซสชัน (SURVEY_SIGNING_SECRET)' })
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}

export async function googleOAuthCallbackHandler(req, res) {
  const fallbackOrigin = requestOrigin(req)
  const oauthError = typeof req.query?.error === 'string' ? req.query.error : ''
  const stateRaw = typeof req.query?.state === 'string' ? req.query.state : ''
  const code = typeof req.query?.code === 'string' ? req.query.code : ''

  const state = verifyOAuthState(stateRaw)
  const origin = state?.origin || fallbackOrigin
  const fail = (message) => redirect(res, `${origin}/?view=admin&oauth_error=${encodeURIComponent(message)}`)

  if (oauthError) return fail('ยกเลิกการเข้าสู่ระบบด้วย Google')
  if (!state || !code) return fail('สถานะการยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่')

  const { clientId, clientSecret, superAdmins } = googleOAuthConfig()
  if (!clientId || !clientSecret) return fail('ยังไม่ได้ตั้งค่า Google OAuth บนเซิร์ฟเวอร์')

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: state.redirectUri || `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok || !tokenData.access_token) {
      return fail('ไม่สามารถแลกโทเคนจาก Google ได้ กรุณาลองใหม่')
    }

    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await userRes.json().catch(() => ({}))
    const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : ''
    if (!userRes.ok || !email || profile.email_verified !== true) {
      return fail('บัญชี Google นี้ยังไม่ได้ยืนยันอีเมล')
    }

    const isSuperAdmin = superAdmins.includes(email)
    const { user } = await findOrUpsertOAuthUser({
      email,
      displayName: profile.name || email,
      isSuperAdmin,
    })

    const token = issueUserToken(user.id)
    if (!token) return fail('ไม่สามารถสร้างโทเคนผู้ดูแลระบบได้')

    return redirect(res, `${origin}/?view=admin#oauth_token=${encodeURIComponent(token)}`)
  } catch (error) {
    return fail(error?.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ')
  }
}
