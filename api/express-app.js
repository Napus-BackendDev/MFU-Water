import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import waypointsHandler from './surveys/waypoints.js'
import prepareHandler from './surveys/prepare.js'
import completeHandler from './surveys/complete.js'
import photoHandler from './surveys/photo.js'
import uploadHandler from './surveys/upload.js'
import earthEngineStatusHandler from './earth-engine/status.js'
import { databaseTarget } from './surveys/_shared.js'
import { loginAdmin, reviewerName, verifyAdminAuth } from './admin/_admin_shared.js'

const serverEnvKeys = [
  'ADMIN_PASSCODE',
  'APP_ENV',
  'MONGODB_URI',
  'MONGODB_DB',
  'MONGODB_URI_LOCAL',
  'MONGODB_DB_LOCAL',
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
  for (const filename of ['.env', '.env.local', '.env.mongodb']) {
    const filePath = resolveProjectFile(rootDir, filename)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIndex = line.indexOf('=')
      if (eqIndex <= 0) continue
      let key = line.slice(0, eqIndex).trim()
      let value = line.slice(eqIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      // Atlas credential exports name the connection string differently; accept it by its scheme.
      if (filename === '.env.mongodb' && /^mongodb(\+srv)?:\/\//.test(value) && !serverEnvKeys.includes(key)) key = 'MONGODB_URI'
      if (!serverEnvKeys.includes(key)) continue
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

  app.all('/api/surveys/upload', (req, res) => uploadHandler(req, res))
  app.all('/api/surveys/waypoints', (req, res) => waypointsHandler(req, res))
  app.all('/api/surveys/prepare', (req, res) => prepareHandler(req, res))
  app.all('/api/surveys/complete', (req, res) => completeHandler(req, res))
  app.all('/api/surveys/photo', (req, res) => photoHandler(req, res))
  app.all('/api/earth-engine/status', (req, res) => earthEngineStatusHandler(req, res))

  // Endpoint ตรวจสอบรหัสผ่านแอดมิน (Passcode Login)
  app.post('/api/admin/verify-passcode', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const { status, body } = loginAdmin(req.body?.passcode)
    return res.status(status).json(body)
  })

  // Endpoint ดึงข้อมูลสำหรับ Data Table ผู้ดูแลระบบ (Admin Data Table & Review Queue)
  const handleAdminSamples = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const isAuthed = verifyAdminAuth(req)
    if (!isAuthed) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
    }
    try {
      const { config } = await import('./surveys/_shared.js')
      const { buildAdminQueue } = await import('./surveys/_db.js')
      return res.status(200).json(await buildAdminQueue(config(false)))
    } catch {
      return res.status(503).json({ error: 'ไม่สามารถโหลดข้อมูลคิวแอดมินได้' })
    }
  }

  app.get('/api/admin/pending-samples', handleAdminSamples)
  app.get('/api/admin/samples', handleAdminSamples)

  // Endpoint อนุมัติ (approve) หรือปฏิเสธ (reject) ตัวอย่างน้ำที่รอตรวจสอบ
  app.post('/api/admin/samples/:sampleCode/review', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const isAuthed = verifyAdminAuth(req)
    if (!isAuthed) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
    }
    try {
      const { sampleCode } = req.params
      const { decision, reason, reviewer } = req.body || {}
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'กรุณาระบุ decision เป็น approve หรือ reject' })
      }
      const { config } = await import('./surveys/_shared.js')
      const { reviewSample } = await import('./surveys/_db.js')
      const newStatus = await reviewSample(config(false), String(sampleCode), decision, reason, reviewerName(reviewer))
      if (!newStatus) return res.status(404).json({ error: 'ไม่พบตัวอย่างน้ำรหัสนี้' })

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
    if (!verifyAdminAuth(req)) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
    }
    try {
      const { path: photoPath } = req.query
      if (!photoPath || typeof photoPath !== 'string') {
        return res.status(400).json({ error: 'กรุณาระบุ path ของรูปถ่าย' })
      }
      const { config } = await import('./surveys/_shared.js')
      const { readPhoto } = await import('./surveys/_photos.js')
      const photo = await readPhoto(config(false), photoPath)
      if (!photo) {
        return res.status(404).json({ error: 'ไม่พบไฟล์ภาพถ่าย' })
      }
      res.setHeader('Content-Type', photo.contentType || 'image/png')
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).send(photo.buffer)
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
      stack: 'Nuxt.js + Nuxt UI + Lucide Icons + Express.js + MongoDB (GridFS)',
      environment: databaseTarget().environment,
    })
  })

  return app
}
