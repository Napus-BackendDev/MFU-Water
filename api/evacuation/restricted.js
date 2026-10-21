import { evacuationPayload, validAccessKey } from './_shared.js'

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0')
  response.setHeader('Vary', 'Authorization')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const hash = process.env.EVACUATION_ACCESS_KEY_SHA256
  if (!/^[a-f0-9]{64}$/.test(hash ?? '')) return response.status(503).json({ error: 'Restricted data unavailable' })
  if (!validAccessKey(request.headers.authorization, hash)) return response.status(401).json({ error: 'Access denied' })
  try {
    const raw = process.env.EVACUATION_DATA_JSON
    if (!raw || raw.length > 1000000) throw new Error('Invalid dataset')
    return response.status(200).json(evacuationPayload(JSON.parse(raw)))
  } catch {
    return response.status(503).json({ error: 'Restricted data unavailable' })
  }
}
