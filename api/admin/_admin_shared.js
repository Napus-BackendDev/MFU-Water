import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { config, databaseTarget, respond } from '../surveys/_shared.js'
import {
  DEFAULT_ROLES,
  canAccessCommunity,
  hasPageAccess,
  makePermissions,
  normalizeAllowedCommunities,
} from '../../src/lib/admin-rbac.js'
import { checkLoginLock, clearLoginFailures, recordLoginFailure, throttleKey } from './_login_throttle.js'
import {
  getRoleById,
  getUserById,
  getUserByUsername,
  recordUserLogin,
  verifyPassword,
} from './_users_db.js'

const tokenLifetimeMs = 12 * 60 * 60 * 1000

export const getAdminSettings = () => config(false)

// The passcode and token secret come only from the server environment; there is no built-in default.
const passcode = () => process.env.ADMIN_PASSCODE?.trim() || ''
const tokenSecret = () => {
  const secret = process.env.SURVEY_SIGNING_SECRET || ''
  return Buffer.byteLength(secret) >= 32 ? secret : ''
}
const signingKey = () => tokenSecret() || (adminBypass() ? 'dev-local-only-signing-key-32-bytes-min' : '')

const digest = (value) => createHash('sha256').update(String(value)).digest()
const sign = (secret, payload) => createHmac('sha256', secret).update(String(payload)).digest('hex')

export function issueUserToken(userId) {
  const key = signingKey()
  if (!key) return null
  const encoded = Buffer.from(JSON.stringify({ ts: Date.now(), userId }), 'utf8').toString('base64url')
  return `u.${encoded}.${sign(key, `user:${encoded}`)}`
}

export function signOAuthState(payload) {
  const key = signingKey()
  if (!key) return null
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() }), 'utf8').toString('base64url')
  return `${encoded}.${sign(key, `oauth:${encoded}`)}`
}

export function verifyOAuthState(state, maxAgeMs = 10 * 60 * 1000) {
  const key = signingKey()
  if (!key || typeof state !== 'string' || !state.includes('.')) return null
  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) return null
  const expected = sign(key, `oauth:${encoded}`)
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!Number.isSafeInteger(data?.ts) || data.ts > Date.now() || Date.now() - data.ts > maxAgeMs) return null
    return data
  } catch {
    return null
  }
}

// Local development skips the login so the queue opens straight away; never on Vercel or APP_ENV=production.
// Set ADMIN_BYPASS=off to exercise the real login on a laptop.
export const adminBypass = () => databaseTarget().environment === 'development' && process.env.ADMIN_BYPASS !== 'off'

function superAdminContext(bypass = false) {
  return {
    authorized: true,
    bypass,
    isSuperAdmin: true,
    userId: null,
    username: null,
    displayName: 'ผู้ดูแลระบบ (Super Admin)',
    roleId: 'super-admin',
    roleName: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    permissions: makePermissions('edit'),
    allowedCommunities: ['all'],
  }
}

// Returns the HTTP outcome of a passcode login so every entry point (Express, Vercel handler) answers the same way.
export function loginAdmin(input) {
  if (adminBypass()) return { status: 200, body: { ok: true, token: 'dev-bypass', bypass: true } }
  if (!passcode() || !tokenSecret()) return { status: 503, body: { error: 'ระบบผู้ดูแลยังไม่ได้ตั้งรหัสผ่านฝั่งเซิร์ฟเวอร์' } }
  if (typeof input !== 'string' || !input.trim()) return { status: 400, body: { error: 'กรุณากรอกรหัสผ่านผู้ดูแล' } }
  if (!timingSafeEqual(digest(input.trim()), digest(passcode()))) return { status: 401, body: { error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' } }
  const ts = Date.now()
  return { status: 200, body: { ok: true, token: `${ts}.${sign(tokenSecret(), `admin:${ts}`)}` } }
}

// Supports both Username+Password user accounts and the emergency ADMIN_PASSCODE.
export async function loginAdminCredentials({ username, password, passcode: passcodeInput, clientIp = '' } = {}) {
  if (adminBypass()) return loginAdminCredentialsUnthrottled({ username, password, passcode: passcodeInput })
  const key = throttleKey(clientIp, typeof username === 'string' && username.trim() ? username.trim() : 'passcode')
  const lock = await checkLoginLock(key)
  if (lock.locked) {
    return { status: 429, body: { error: `ลองเข้าสู่ระบบผิดหลายครั้ง กรุณารอ ${Math.ceil(lock.retryAfterSeconds / 60)} นาทีแล้วลองใหม่`, retryAfterSeconds: lock.retryAfterSeconds } }
  }
  const result = await loginAdminCredentialsUnthrottled({ username, password, passcode: passcodeInput })
  if (result.status === 401) await recordLoginFailure(key)
  else if (result.status === 200) await clearLoginFailures(key)
  return result
}

async function loginAdminCredentialsUnthrottled({ username, password, passcode: passcodeInput } = {}) {
  if (typeof username === 'string' && username.trim()) {
    const key = signingKey()
    if (!key) return { status: 503, body: { error: 'ระบบยังไม่ได้ตั้งค่า SURVEY_SIGNING_SECRET' } }
    if (typeof password !== 'string' || !password) {
      return { status: 400, body: { error: 'กรุณากรอกรหัสผ่าน' } }
    }
    const user = await getUserByUsername(username)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { status: 401, body: { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' } }
    }
    if (user.active === false) {
      return { status: 403, body: { error: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' } }
    }
    const role = await getRoleById(user.roleId)
    if (!role) {
      return { status: 403, body: { error: 'ไม่พบข้อมูลบทบาทของบัญชีนี้' } }
    }
    await recordUserLogin(user.id).catch(() => {})
    const encoded = Buffer.from(JSON.stringify({ ts: Date.now(), userId: user.id }), 'utf8').toString('base64url')
    const token = `u.${encoded}.${sign(key, `user:${encoded}`)}`
    return {
      status: 200,
      body: {
        ok: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          roleId: role.id,
          roleName: role.name,
          permissions: role.permissions,
          allowedCommunities: normalizeAllowedCommunities(user.allowedCommunities),
        },
      },
    }
  }
  return loginAdmin(passcodeInput)
}

function readToken(req) {
  const headers = req.headers || {}
  const authHeader = headers.authorization || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (headers['x-admin-token'] || '')
}

export function verifyAdminAuth(req) {
  if (adminBypass()) return true
  const token = readToken(req)
  const secret = tokenSecret()
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false

  if (token.startsWith('u.')) {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [, encoded, signature] = parts
    const expected = sign(secret, `user:${encoded}`)
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
      if (!Number.isSafeInteger(payload?.ts) || payload.ts > Date.now() || Date.now() - payload.ts > tokenLifetimeMs) return false
      return Boolean(payload?.userId)
    } catch {
      return false
    }
  }

  const [tsText, signature = ''] = token.split('.')
  const ts = Number(tsText)
  if (!Number.isSafeInteger(ts) || ts > Date.now() || Date.now() - ts > tokenLifetimeMs) return false
  const expected = sign(secret, `admin:${ts}`)
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function resolveAdminContext(req) {
  const token = readToken(req)

  // Signed user token (works in both production and dev when explicitly logged in as user)
  if (typeof token === 'string' && token.startsWith('u.')) {
    const key = signingKey()
    if (!key) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [, encoded, signature] = parts
    const expected = sign(key, `user:${encoded}`)
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
    let payload
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    } catch {
      return null
    }
    if (!Number.isSafeInteger(payload?.ts) || payload.ts > Date.now() || Date.now() - payload.ts > tokenLifetimeMs) return null
    const user = await getUserById(payload.userId)
    if (!user || user.active === false) return null
    const role = await getRoleById(user.roleId)
    if (!role) return null
    return {
      authorized: true,
      bypass: false,
      isSuperAdmin: role.id === 'super-admin',
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      roleId: role.id,
      roleName: role.name,
      permissions: role.permissions,
      allowedCommunities: normalizeAllowedCommunities(user.allowedCommunities),
    }
  }

  if (adminBypass()) {
    const headers = req.headers || {}
    const devRoleId = typeof headers['x-dev-role-id'] === 'string' ? headers['x-dev-role-id'].trim() : ''
    const devCommunitiesRaw = typeof headers['x-dev-communities'] === 'string' ? headers['x-dev-communities'].trim() : ''
    if (devRoleId && devRoleId !== 'super-admin') {
      const role = (await getRoleById(devRoleId).catch(() => null)) || DEFAULT_ROLES.find((r) => r.id === devRoleId) || null
      if (role) {
        const communities = devCommunitiesRaw
          ? normalizeAllowedCommunities(devCommunitiesRaw.split(','))
          : ['all']
        return {
          authorized: true,
          bypass: true,
          isSuperAdmin: false,
          userId: null,
          username: 'dev-preview',
          displayName: `ทดลองบทบาท: ${role.name}`,
          roleId: role.id,
          roleName: role.name,
          permissions: role.permissions,
          allowedCommunities: communities,
        }
      }
    }
    const base = superAdminContext(true)
    if (devCommunitiesRaw) {
      base.allowedCommunities = normalizeAllowedCommunities(devCommunitiesRaw.split(','))
    }
    return base
  }

  if (!verifyAdminAuth(req)) return null
  return superAdminContext(false)
}

// For handlers that are not wrapped by adminEndpoint (map data, evacuation): one place that checks
// the signed-in account, its role's access to the page, and (optionally) its village scope.
// Sends the 401/403 itself and returns null when the request must stop.
export async function requireAdmin(request, response, { page, level, community } = {}) {
  const ctx = await resolveAdminContext(request)
  if (!ctx) {
    respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลก่อน' })
    return null
  }
  if (page && !hasPageAccess(ctx.permissions, page, level || (request.method === 'GET' ? 'view' : 'edit'))) {
    respond(response, 403, { error: 'บทบาทของคุณไม่มีสิทธิ์ใช้งานในส่วนนี้' })
    return null
  }
  if (community && !canAccessCommunity(ctx.allowedCommunities, community)) {
    respond(response, 403, { error: 'บัญชีนี้ไม่มีสิทธิ์ในชุมชนนี้' })
    return null
  }
  request.adminContext = ctx
  return ctx
}

// Display name the reviewer typed when unlocking the queue; recorded with every decision.
export function reviewerName(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return decodeURIComponent(value.trim()).slice(0, 80)
  } catch {
    return value.trim().slice(0, 80)
  }
}

// Wraps an admin API handler: method check, admin auth, RBAC page/level check, server settings and a uniform 503 on failure.
export const adminEndpoint = (method, handle, options = {}) => async (request, response) => {
  if (request.method !== method) {
    response.setHeader('Allow', method)
    return respond(response, 405, { error: 'Method not allowed' })
  }
  const ctx = await resolveAdminContext(request)
  if (!ctx) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลก่อน' })

  if (options.page) {
    const requiredLevel = options.level || (method === 'GET' ? 'view' : 'edit')
    if (!hasPageAccess(ctx.permissions, options.page, requiredLevel)) {
      return respond(response, 403, { error: 'บทบาทของคุณไม่มีสิทธิ์ใช้งานในส่วนนี้' })
    }
  }

  request.adminContext = ctx
  try {
    return await handle(request, response, getAdminSettings(), ctx)
  } catch (error) {
    console.error('ADMIN ENDPOINT ERROR:', error?.message)
    return respond(response, 503, { error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
  }
}
