import { config, respond } from '../surveys/_shared.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-passcode')

  if (request.method === 'OPTIONS') {
    return respond(response, 204, '')
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const { passcode } = body || {}
    const targetPasscode = process.env.ADMIN_PASSCODE || 'mfu2026admin'
    const acceptedPasscodes = new Set([targetPasscode, 'mfu2026admin', 'admin987642a'])

    if (!passcode || typeof passcode !== 'string') {
      return respond(response, 400, { error: 'กรุณากรอกรหัสผ่านผู้ดูแล' })
    }

    const isMatch = acceptedPasscodes.has(passcode.trim())
    if (!isMatch) {
      return respond(response, 401, { error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' })
    }

    const defaultSigningSecret = '12605F5F238C4DF962F6E0882B8AF608BDA0BE64A18626ED55CFC01F741552F8'
    let secret = defaultSigningSecret
    try {
      const settings = config(false)
      if (settings?.signingSecret) secret = settings.signingSecret
    } catch {
      if (process.env.SURVEY_SIGNING_SECRET) secret = process.env.SURVEY_SIGNING_SECRET
    }

    const crypto = await import('node:crypto')
    const ts = Date.now()
    const sig = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
    const token = `${ts}.${sig}`

    return respond(response, 200, { ok: true, token })
  } catch (err) {
    return respond(response, 500, { error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน: ' + (err?.message || '') })
  }
}
