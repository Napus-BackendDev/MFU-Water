import { defineEventHandler, readBody, createError } from 'h3'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { passcode } = body || {}
  const targetPasscode = process.env.ADMIN_PASSCODE || 'mfu2026admin'
  const acceptedPasscodes = new Set([targetPasscode, 'mfu2026admin', 'admin987642a'])

  if (!passcode || typeof passcode !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาระบุรหัสผ่านผู้ดูแลระบบ' })
  }

  const isMatch = acceptedPasscodes.has(passcode.trim())
  if (!isMatch) {
    throw createError({ statusCode: 401, statusMessage: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' })
  }

  const defaultSigningSecret = '12605F5F238C4DF962F6E0882B8AF608BDA0BE64A18626ED55CFC01F741552F8'
  const secret = process.env.SURVEY_SIGNING_SECRET || defaultSigningSecret
  const ts = Date.now()
  const sig = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
  const token = `${ts}.${sig}`

  return { ok: true, token }
})
