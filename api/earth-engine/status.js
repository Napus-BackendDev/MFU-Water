import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

let initialization

function loadEarthEngine() {
  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis
  }
  const req = createRequire(import.meta.url)
  return req('@google/earthengine')
}

async function getServiceAccount() {
  const inlineJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (inlineJson) return JSON.parse(inlineJson)

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentialsPath) throw new Error('Earth Engine credentials are not configured')

  return JSON.parse(await readFile(credentialsPath, 'utf8'))
}

function initializeEarthEngine(serviceAccount) {
  const ee = loadEarthEngine()
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      serviceAccount,
      () => ee.initialize(null, null, resolve, reject, null, serviceAccount.project_id),
      reject,
    )
  })
}

async function ensureInitialized() {
  if (!initialization) {
    initialization = getServiceAccount().then(initializeEarthEngine).catch((error) => {
      initialization = undefined
      throw error
    })
  }
  return initialization
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureInitialized()
    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json({ ok: true })
  } catch {
    return response.status(503).json({ error: 'Earth Engine is not available' })
  }
}
