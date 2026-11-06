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
import adminPhotoHandler from './admin/photo.js'
import adminReviewHandler from './admin/review.js'
import adminSamplesHandler from './admin/samples.js'
import verifyPasscodeHandler from './admin/verify-passcode.js'
import newsIndexHandler from './news/_public.js'
import newsPhotoHandler from './news/_photo.js'
import {
  getAdminNewsHandler,
  createAdminNewsHandler,
  updateAdminNewsHandler,
  deleteAdminNewsHandler,
  toggleAdminPinHandler,
  uploadAdminNewsPhotoHandler,
} from './news/_admin.js'
import { seedDefaultNewsPhotosToGridFs } from './news/_news_photos.js'
import {
  getEvacuationHandler,
  startEvacuationHandler,
  updateEvacuationCaseHandler,
  reorderEvacuationHandler,
  closeEvacuationHandler,
} from './evacuation/_evacuation.js'
import { adminMapDataHandler, publicMapDataHandler, routeFromPath } from './mapdata/_mapdata.js'
import {
  getReportersHandler,
  createReporterHandler,
  updateReporterHandler,
  deleteReporterHandler,
} from './admin/_reporters.js'
import { getReportsAnalyticsHandler } from './admin/_reports.js'
import {
  getResearchHubHandler,
  updateResearchTeamHandler,
  downloadResearchDocHandler,
} from './admin/_research.js'
import {
  getProjectSettingsHandler,
  updateSponsorsHandler,
  updateContactsHandler,
} from './admin/_settings.js'

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

  const routes = {
    '/api/surveys/upload': uploadHandler,
    '/api/surveys/waypoints': waypointsHandler,
    '/api/surveys/prepare': prepareHandler,
    '/api/surveys/complete': completeHandler,
    '/api/surveys/photo': photoHandler,
    '/api/earth-engine/status': earthEngineStatusHandler,
  }
  for (const [path, handler] of Object.entries(routes)) app.all(path, (req, res) => handler(req, res))

  app.post('/api/admin/verify-passcode', verifyPasscodeHandler)
  app.get('/api/admin/samples', adminSamplesHandler)
  app.get('/api/admin/pending-samples', adminSamplesHandler)
  app.put('/api/admin/samples/:sampleCode', adminSamplesHandler)
  app.delete('/api/admin/samples/:sampleCode', adminSamplesHandler)
  app.post('/api/admin/review', adminReviewHandler)
  app.post('/api/admin/samples/:sampleCode/review', (req, res) => {
    req.body = { ...req.body, sampleCode: req.params.sampleCode }
    return adminReviewHandler(req, res)
  })
  app.get('/api/admin/photo', adminPhotoHandler)

  // Public News API
  app.get('/api/news/photo/:filename', (req, res) => {
    return newsPhotoHandler(req, res)
  })
  app.get('/api/news/photo', newsPhotoHandler)
  app.get('/api/news', newsIndexHandler)
  app.get('/api/news/:id', (req, res) => {
    req.query.id = req.params.id
    return newsIndexHandler(req, res)
  })

  // Admin News API
  app.get('/api/admin/news', getAdminNewsHandler)
  app.post('/api/admin/news/upload', uploadAdminNewsPhotoHandler)
  app.post('/api/admin/news', createAdminNewsHandler)
  app.put('/api/admin/news/:id', (req, res) => {
    return updateAdminNewsHandler(req, res)
  })
  app.put('/api/admin/news', updateAdminNewsHandler)
  app.delete('/api/admin/news/:id', (req, res) => {
    return deleteAdminNewsHandler(req, res)
  })
  app.delete('/api/admin/news', deleteAdminNewsHandler)
  app.post('/api/admin/news/:id/pin', (req, res) => {
    return toggleAdminPinHandler(req, res)
  })

  // Admin Evacuation Mode API
  app.get('/api/admin/evacuation', getEvacuationHandler)
  app.post('/api/admin/evacuation/start', startEvacuationHandler)
  app.patch('/api/admin/evacuation/cases/:householdId', updateEvacuationCaseHandler)
  app.put('/api/admin/evacuation/order', reorderEvacuationHandler)
  app.post('/api/admin/evacuation/close', closeEvacuationHandler)

  // Map data: hamlets, community survey, evacuation group and important places (public read, admin edit)
  app.get('/api/map-data/:target', (req, res) => publicMapDataHandler(req, res, req.params.target))
  app.use('/api/admin/map-data', (req, res) => adminMapDataHandler(req, res, routeFromPath(req.path)))

  // Admin Reporters & Follow-up API
  app.get('/api/admin/reporters', getReportersHandler)
  app.post('/api/admin/reporters', createReporterHandler)
  app.put('/api/admin/reporters/:id', updateReporterHandler)
  app.put('/api/admin/reporters', updateReporterHandler)
  app.delete('/api/admin/reporters/:id', deleteReporterHandler)
  app.delete('/api/admin/reporters', deleteReporterHandler)

  // Admin Reports & Real-time Analytics API
  app.get('/api/admin/reports/analytics', getReportsAnalyticsHandler)

  // Admin Research Hub (SWG 1-7) API
  app.get('/api/admin/research', getResearchHubHandler)
  app.put('/api/admin/research/:id', updateResearchTeamHandler)
  app.put('/api/admin/research', updateResearchTeamHandler)
  app.post('/api/admin/research/:id/download', downloadResearchDocHandler)

  // Admin Project Settings (Sponsors, Contacts, Audit) API
  app.get('/api/admin/settings', getProjectSettingsHandler)
  app.put('/api/admin/settings/sponsors', updateSponsorsHandler)
  app.put('/api/admin/settings/contacts', updateContactsHandler)

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

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      ok: true,
      stack: 'Nuxt.js + Nuxt UI + Lucide Icons + Express.js + MongoDB (GridFS)',
      environment: databaseTarget().environment,
    })
  })

  void seedDefaultNewsPhotosToGridFs({}, rootDir)
  return app
}
