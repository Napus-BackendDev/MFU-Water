import { createHmac, timingSafeEqual } from 'node:crypto'

export const allowedPhotoTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']])
export const safeWaypointColumns = 'id,sample_code,arsenic_level_ppb,latitude,longitude,gps_accuracy_meters,created_at'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function config(requireSubmission = true) {
  const url = new URL(process.env.SUPABASE_URL ?? '')
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password) throw new Error('Invalid database target')
  const settings = {
    url: url.origin,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    signingSecret: process.env.SURVEY_SIGNING_SECRET ?? '',
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? '',
    turnstileHostnames: process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '',
    turnstileEnabled: process.env.VITE_TURNSTILE_ENABLED === 'true',
  }
  if (!settings.key || (requireSubmission && (Buffer.byteLength(settings.signingSecret) < 32 || settings.turnstileEnabled && (!settings.turnstileSecret || !settings.turnstileHostnames)))) throw new Error('Missing server configuration')
  return settings
}

export function readJsonBody(request) {
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 16384) throw new Error('Invalid request body')
  return body
}

export function validateSurvey(body) {
  const point = body?.coordinates
  const validWater = body?.waterSourceType === undefined || body?.waterSourceType === null || ['แม่น้ำ', 'บ่อ', 'ประปา'].includes(body.waterSourceType)
  const validRain = body?.rainContext === undefined || body?.rainContext === null || ['ไม่ทราบ', 'ไม่ตก', 'ตก'].includes(body.rainContext)
  const validMeasured = body?.sampleCollectedAt === undefined || body?.sampleCollectedAt === null || (typeof body.sampleCollectedAt === 'string' && body.sampleCollectedAt.length <= 64)
  return Boolean(body && typeof body === 'object' && !Array.isArray(body)
    && typeof body.fullName === 'string' && body.fullName.trim().length > 0 && body.fullName.length <= 200
    && typeof body.phoneNumber === 'string' && body.phoneNumber.trim().length > 0 && body.phoneNumber.length <= 40
    && [0, 5, 10, 30, 50, 100, 200, 300, 500].includes(body.arsenicLevelPpb)
    && Number.isFinite(point?.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point?.longitude) && Math.abs(point.longitude) <= 180
    && (body.gpsAccuracyMeters === null || Number.isSafeInteger(body.gpsAccuracyMeters) && body.gpsAccuracyMeters >= 0 && body.gpsAccuracyMeters <= 2147483647)
    && validWater && validRain && validMeasured
    && body.publicConsent === true)
}

export function publicSurveyPayload(body) {
  return {
    full_name: body.fullName.trim(),
    phone_number: body.phoneNumber.trim(),
    arsenic_level_ppb: body.arsenicLevelPpb,
    latitude: body.coordinates.latitude,
    longitude: body.coordinates.longitude,
    gps_accuracy_meters: body.gpsAccuracyMeters,
    public_consent_at: new Date().toISOString(),
  }
}

export function hashClientIp(secret, ip) {
  return createHmac('sha256', secret).update(JSON.stringify({ ip })).digest('base64url')
}

export function stableSurveyHash(secret, body, paths) {
  const value = {
    fullName: body.fullName?.trim() || null, phoneNumber: body.phoneNumber?.trim() || null,
    arsenicLevelPpb: body.arsenicLevelPpb, coordinates: body.coordinates && { latitude: body.coordinates.latitude, longitude: body.coordinates.longitude },
    gpsAccuracyMeters: body.gpsAccuracyMeters, paths,
  }
  return createHmac('sha256', secret).update(JSON.stringify(value)).digest('base64url')
}

export function issueTicket(secret, claims) {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`
}

export function readTicket(secret, ticket) {
  try {
    if (typeof ticket !== 'string' || ticket.length > 4096) return null
    const parts = ticket.split('.')
    if (parts.length !== 2) return null
    const expected = createHmac('sha256', secret).update(parts[0]).digest()
    const signature = Buffer.from(parts[1], 'base64url')
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    if (!uuid.test(claims.surveyId) || !/^KOK-\d{8}-\d{4}$/.test(claims.sampleCode)
      || !/^[\w-]{43}$/.test(claims.ipHash) || !/^[\w-]{43}$/.test(claims.payloadHash)
      || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= Date.now() || claims.expiresAt > Date.now() + 600000
      || typeof claims.consentAt !== 'string' || !Number.isFinite(Date.parse(claims.consentAt))
      || !Array.isArray(claims.photoPaths) || claims.photoPaths.length !== 2
      || claims.photoPaths.some((path, index) => path !== null && !new RegExp(`^${claims.surveyId}/${index + 1}\\.(jpg|png|webp)$`).test(path))) return null
    return claims
  } catch { return null }
}

export function clientIp(request) {
  const trusted = process.env.VERCEL === '1' ? request.headers['x-vercel-forwarded-for'] : request.socket?.remoteAddress
  const ip = String(trusted ?? '').split(',')[0].trim()
  if (!ip) throw new Error('Missing request identity')
  return ip
}

export async function verifyCaptcha(secret, token, ip, requestHost, allowedHostnames) {
  if (!token || !allowedHostnames.includes(requestHost)) return false
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: ip }), signal: AbortSignal.timeout(10000),
    })
    const result = await response.json()
    return response.ok && result.success === true && result.hostname === requestHost && result.action === 'survey'
  } catch { return false }
}

export function encodeStoragePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function supabaseRequest(settings, path, options = {}) {
  if (!path.startsWith('/rest/v1/') && !path.startsWith('/storage/v1/')) throw new Error('Invalid API path')
  const target = new URL(path, settings.url)
  if (target.origin !== settings.url) throw new Error('Invalid API origin')
  return fetch(target, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000), headers: {
    'content-type': 'application/json', ...options.headers, apikey: settings.key, authorization: `Bearer ${settings.key}`,
  } })
}

export function respond(response, status, body) {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}
