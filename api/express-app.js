import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import waypointsHandler from './surveys/waypoints.js'
import prepareHandler from './surveys/prepare.js'
import completeHandler from './surveys/complete.js'
import photoHandler from './surveys/photo.js'
import earthEngineStatusHandler from './earth-engine/status.js'

const serverEnvKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SURVEY_SIGNING_SECRET',
  'VITE_TURNSTILE_ENABLED',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_ALLOWED_HOSTNAMES',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
]

function resolveProjectFile(rootDir, relativePath) {
  const candidates = [resolve(rootDir, relativePath), resolve(rootDir, '..', relativePath)]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return candidates[0]
}

export function loadServerEnv(rootDir = process.cwd()) {
  for (const filename of ['.env', '.env.local']) {
    const filePath = resolveProjectFile(rootDir, filename)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIndex = line.indexOf('=')
      if (eqIndex <= 0) continue
      const key = line.slice(0, eqIndex).trim()
      if (!serverEnvKeys.includes(key)) continue
      let value = line.slice(eqIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (value && !process.env[key]) process.env[key] = value
    }
  }
}

export function createExpressApp(rootDir = process.cwd()) {
  loadServerEnv(rootDir)
  const app = express()
  app.disable('x-powered-by')

  app.use('/api', express.json({ limit: '16kb' }))

  app.use('/api', (err, _req, res, next) => {
    if (err && (err.status === 413 || err.type === 'entity.too.large')) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(413).json({ error: 'Request body too large' })
    }
    if (err instanceof SyntaxError) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(400).json({ error: 'Invalid JSON payload' })
    }
    return next(err)
  })

  app.all('/api/surveys/waypoints', (req, res) => waypointsHandler(req, res))
  app.all('/api/surveys/prepare', (req, res) => prepareHandler(req, res))
  app.all('/api/surveys/complete', (req, res) => completeHandler(req, res))
  app.all('/api/surveys/photo', (req, res) => photoHandler(req, res))
  app.all('/api/earth-engine/status', (req, res) => earthEngineStatusHandler(req, res))

  // ฟังก์ชันตรวจสอบสิทธิ์แอดมิน (Admin Authentication Guard)
  const verifyAdminAuth = async (req) => {
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
    const { config } = await import('./surveys/_shared.js')
    const settings = config(false)
    const secret = settings.signingSecret || 'kok-admin-fallback-secret'
    const crypto = await import('node:crypto')
    const expected = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  }

  // Endpoint ตรวจสอบรหัสผ่านแอดมิน (Passcode Login)
  app.post('/api/admin/verify-passcode', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const { passcode } = req.body || {}
      const targetPasscode = process.env.ADMIN_PASSCODE || 'mfu2026admin'
      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านผู้ดูแล' })
      }
      const crypto = await import('node:crypto')
      const bufA = Buffer.from(String(passcode))
      const bufB = Buffer.from(String(targetPasscode))
      const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
      if (!isMatch) {
        return res.status(401).json({ error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' })
      }
      const { config } = await import('./surveys/_shared.js')
      const settings = config(false)
      const secret = settings.signingSecret || 'kok-admin-fallback-secret'
      const ts = Date.now()
      const sig = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex')
      const token = `${ts}.${sig}`
      return res.status(200).json({ ok: true, token })
    } catch {
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' })
    }
  })

  // Endpoint ดึงข้อมูลสำหรับ Data Table ผู้ดูแลระบบ (Admin Data Table & Review Queue)
  const handleAdminSamples = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const isAuthed = await verifyAdminAuth(req)
    if (!isAuthed) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
    }
    try {
      const { config, supabaseRequest } = await import('./surveys/_shared.js')
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

      return res.status(200).json({
        samples: enhanced,
        pending,
        counts,
        alerts,
      })
    } catch {
      return res.status(503).json({ error: 'ไม่สามารถโหลดข้อมูลคิวแอดมินได้' })
    }
  }

  app.get('/api/admin/pending-samples', handleAdminSamples)
  app.get('/api/admin/samples', handleAdminSamples)

  // Endpoint อนุมัติ (approve) หรือปฏิเสธ (reject) ตัวอย่างน้ำที่รอตรวจสอบ
  app.post('/api/admin/samples/:sampleCode/review', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const isAuthed = await verifyAdminAuth(req)
    if (!isAuthed) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
    }
    try {
      const { sampleCode } = req.params
      const { decision, reason } = req.body || {}
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'กรุณาระบุ decision เป็น approve หรือ reject' })
      }
      const newStatus = decision === 'approve' ? 'approved' : 'rejected'
      const { config, supabaseRequest } = await import('./surveys/_shared.js')
      const settings = config(false)

      const updatePayload = {
        publication_status: newStatus,
        reviewed_at: new Date().toISOString(),
        review_reason: reason || (decision === 'approve' ? 'อนุมัติการเผยแพร่โดยแอดมิน' : 'ไม่อนุมัติโดยแอดมิน'),
      }
      if (decision === 'approve') {
        updatePayload.approved_revision = 1
      }

      const updateSample = await supabaseRequest(
        settings,
        `/rest/v1/kok_water_samples?sample_code=eq.${sampleCode}`,
        {
          method: 'PATCH',
          headers: { prefer: 'return=representation' },
          body: JSON.stringify(updatePayload),
        }
      )
      if (!updateSample.ok) {
        return res.status(503).json({ error: 'อัปเดตสถานะตัวอย่างน้ำไม่สำเร็จ' })
      }

      await supabaseRequest(
        settings,
        `/rest/v1/kok_admin_alerts?sample_code=eq.${sampleCode}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ publication_status: newStatus }),
        }
      ).catch(() => {})

      return res.status(200).json({
        success: true,
        sample_code: sampleCode,
        publication_status: newStatus,
      })
    } catch {
      return res.status(503).json({ error: 'จัดการรายการไม่สำเร็จ' })
    }
  })

  // Endpoint ดูรูปภาพที่จัดเก็บเป็นความลับ (Admin Private Photo Stream)
  app.get('/api/admin/photo', async (req, res) => {
    try {
      const { path: photoPath } = req.query
      if (!photoPath || typeof photoPath !== 'string') {
        return res.status(400).json({ error: 'กรุณาระบุ path ของรูปถ่าย' })
      }
      const { config, supabaseRequest, encodeStoragePath } = await import('./surveys/_shared.js')
      const settings = config(false)
      const rPhoto = await supabaseRequest(
        settings,
        `/storage/v1/object/survey-photos/${encodeStoragePath(photoPath)}`
      )
      if (!rPhoto.ok) {
        return res.status(404).json({ error: 'ไม่พบไฟล์ภาพถ่าย' })
      }
      const contentType = rPhoto.headers.get('content-type') || 'image/png'
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      const buffer = Buffer.from(await rPhoto.arrayBuffer())
      return res.status(200).send(buffer)
    } catch {
      return res.status(503).json({ error: 'ไม่สามารถโหลดภาพถ่ายได้' })
    }
  })

  app.get('/api/contract', (_req, res) => {
    try {
      const filePath = resolveProjectFile(rootDir, 'data/contract-v5.json')
      const data = JSON.parse(readFileSync(filePath, 'utf8'))
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(data)
    } catch {
      return res.status(503).json({ error: 'Contract data unavailable' })
    }
  })

  app.get('/api/aggregate', (_req, res) => {
    try {
      const filePath = resolveProjectFile(rootDir, 'data/public-aggregate.json')
      const data = JSON.parse(readFileSync(filePath, 'utf8'))
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(data)
    } catch {
      return res.status(503).json({ error: 'Aggregate data unavailable' })
    }
  })

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      ok: true,
      stack: 'Nuxt.js + Nuxt UI + Lucide Icons + Express.js + Supabase',
    })
  })

  return app
}
