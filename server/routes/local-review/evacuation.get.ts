import { createError, defineEventHandler } from 'h3'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { localReviewRoot } from '../../utils/local-review'

export default defineEventHandler(async (event) => {
  const root = localReviewRoot(event)
  try {
    const data = JSON.parse(await readFile(join(root, 'MFUKokWaterWatch/restricted/evacuation-review.json'), 'utf8'))
    // Never return source pixel locations, paths or unrelated household fields.
    return { visibility: 'local-review-only', routeAlignment: data.routeAlignment?.method ?? null, routes: data.routes ?? [], points: data.points.map((p: Record<string, unknown>) => ({
      id: p.id, kind: p.kind, latitude: p.latitude, longitude: p.longitude,
    })) }
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Local review data unavailable' })
  }
})
