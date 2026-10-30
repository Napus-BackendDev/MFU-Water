import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { config, databaseTarget, respond } from '../surveys/_shared.js'

const tokenLifetimeMs = 12 * 60 * 60 * 1000

export const getAdminSettings = () => config(false)

// The passcode and token secret come only from the server environment; there is no built-in default.
const passcode = () => process.env.ADMIN_PASSCODE?.trim() || ''
const tokenSecret = () => {
  const secret = process.env.SURVEY_SIGNING_SECRET || ''
  return Buffer.byteLength(secret) >= 32 ? secret : ''
}

const digest = (value) => createHash('sha256').update(String(value)).digest()
const sign = (secret, ts) => createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')

// Local development skips the login so the queue opens straight away; never on Vercel or APP_ENV=production.
// Set ADMIN_BYPASS=off to exercise the real login on a laptop.
export const adminBypass = () => databaseTarget().environment === 'development' && process.env.ADMIN_BYPASS !== 'off'

// Returns the HTTP outcome of a passcode login so every entry point (Express, Vercel handler) answers the same way.
export function loginAdmin(input) {
  if (adminBypass()) return { status: 200, body: { ok: true, token: 'dev-bypass', bypass: true } }
  if (!passcode() || !tokenSecret()) return { status: 503, body: { error: 'ระบบผู้ดูแลยังไม่ได้ตั้งรหัสผ่านฝั่งเซิร์ฟเวอร์' } }
  if (typeof input !== 'string' || !input.trim()) return { status: 400, body: { error: 'กรุณากรอกรหัสผ่านผู้ดูแล' } }
  if (!timingSafeEqual(digest(input.trim()), digest(passcode()))) return { status: 401, body: { error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' } }
  const ts = Date.now()
  return { status: 200, body: { ok: true, token: `${ts}.${sign(tokenSecret(), ts)}` } }
}

export function verifyAdminAuth(req) {
  if (adminBypass()) return true
  const headers = req.headers || {}
  const authHeader = headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (headers['x-admin-token'] || '')
  const secret = tokenSecret()
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false

  const [tsText, signature = ''] = token.split('.')
  const ts = Number(tsText)
  if (!Number.isSafeInteger(ts) || ts > Date.now() || Date.now() - ts > tokenLifetimeMs) return false
  const expected = sign(secret, ts)
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// Display name the reviewer typed when unlocking the queue; recorded with every decision.
export function reviewerName(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : null
}

// Wraps an admin API handler: method check, admin auth, server settings and a uniform 503 on failure.
export const adminEndpoint = (method, handle) => async (request, response) => {
  if (request.method !== method) {
    response.setHeader('Allow', method)
    return respond(response, 405, { error: 'Method not allowed' })
  }
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  try {
    return await handle(request, response, getAdminSettings())
  } catch {
    return respond(response, 503, { error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
  }
}
