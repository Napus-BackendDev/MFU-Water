import { config, respond, supabaseRequest } from '../surveys/_shared.js'

export async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-admin-token'] || '')
  const directPasscode = req.headers['x-admin-passcode']
  const expectedPasscode = process.env.ADMIN_PASSCODE || 'mfu2026admin'
  if (directPasscode && directPasscode === expectedPasscode) {
    return true
  }
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return false
  }
  const [tsStr, sig] = token.split('.')
  const ts = Number(tsStr)
  if (!Number.isSafeInteger(ts) || Date.now() - ts > 7 * 24 * 3600 * 1000) {
    return false
  }
  const settings = config(false)
  const secret = settings.signingSecret || 'kok-admin-fallback-secret'
  const crypto = await import('node:crypto')
  const expected = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  response.setHeader('Cache-Control', 'no-store')
  const isAuthed = await verifyAdminAuth(request)
  if (!isAuthed) {
    return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }
  try {
    const settings = config(false)

    const rSamples = await supabaseRequest(
      settings,
      '/rest/v1/kok_water_samples?select=sample_code,station_name,latitude,longitude,collection_time,gps_accuracy_meters,arsenic_ppb,measurements,sample_nature,publication_status,created_at,reviewed_at,review_reason,private_photo_paths&order=collection_time.desc&limit=500'
    )
    const allRows = rSamples.ok ? await rSamples.json() : []

    const rContacts = await supabaseRequest(
      settings,
      '/rest/v1/kok_sample_contacts?select=sample_code,name,phone&limit=1000'
    )
    const contactMap = new Map()
    if (rContacts.ok) {
      const contactRows = await rContacts.json()
      for (const c of contactRows) {
        contactMap.set(c.sample_code, { name: c.name, phone: c.phone })
      }
    }

    const enhanced = allRows.map((row) => {
      const contact = contactMap.get(row.sample_code)
      return {
        ...row,
        contact_name: contact?.name || null,
        contact_phone: contact?.phone || null,
      }
    })

    const rAlerts = await supabaseRequest(
      settings,
      '/rest/v1/kok_admin_alerts?select=*&order=created_at.desc&limit=100'
    )
    const alerts = rAlerts.ok ? await rAlerts.json() : []

    const pending = enhanced.filter((r) => r.publication_status === 'pending_review')
    const approved = enhanced.filter((r) => r.publication_status === 'approved')
    const autoPublished = enhanced.filter((r) => r.publication_status === 'auto_published')
    const rejected = enhanced.filter((r) => r.publication_status === 'rejected')

    const counts = {
      total: enhanced.length,
      pending: pending.length,
      approved: approved.length,
      autoPublished: autoPublished.length,
      rejected: rejected.length,
    }

    return respond(response, 200, {
      samples: enhanced,
      pending,
      counts,
      alerts,
    })
  } catch {
    return respond(response, 503, { error: 'ไม่สามารถโหลดข้อมูลคิวแอดมินได้' })
  }
}
