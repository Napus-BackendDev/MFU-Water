import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import waypointsHandler from './surveys/waypoints.js'
import prepareHandler from './surveys/prepare.js'
import completeHandler from './surveys/complete.js'
import earthEngineStatusHandler from './earth-engine/status.js'
import evacuationHandler from './evacuation/restricted.js'

const serverEnvKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SURVEY_SIGNING_SECRET',
  'VITE_TURNSTILE_ENABLED',
  'TURNSTILE_SECRET_KEY',
  'TURNSTILE_ALLOWED_HOSTNAMES',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'EVACUATION_ACCESS_KEY_SHA256',
  'EVACUATION_DATA_JSON',
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
  app.all('/api/evacuation/restricted', (req, res) => evacuationHandler(req, res))
  app.all('/api/earth-engine/status', (req, res) => earthEngineStatusHandler(req, res))

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
