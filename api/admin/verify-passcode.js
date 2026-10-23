import { config, respond } from '../surveys/_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  response.setHeader('Cache-Control', 'no-store')
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const { passcode } = body || {}
    const targetPasscode = process.env.ADMIN_PASSCODE || 'mfu2026admin'
    if (!passcode || typeof passcode !== 'string') {
      return respond(response, 400, { error: 'กรุณากรอกรหัสผ่านผู้ดูแล' })
    }
    const crypto = await import('node:crypto')
    const bufA = Buffer.from(String(passcode))
    const bufB = Buffer.from(String(targetPasscode))
    const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
    if (!isMatch) {
      return respond(response, 401, { error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' })
    }
    const settings = config(false)
    const secret = settings.signingSecret || 'kok-admin-fallback-secret'
    const ts = Date.now()
    const sig = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
    const token = `${ts}.${sig}`
    return respond(response, 200, { ok: true, token })
  } catch {
    return respond(response, 500, { error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' })
  }
}
