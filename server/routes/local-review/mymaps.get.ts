import { createError, defineEventHandler } from 'h3'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { localReviewRoot } from '../../utils/local-review'

export default defineEventHandler(async (event) => {
  const root = localReviewRoot(event)
  try {
    const data = JSON.parse(await readFile(join(root,'MFUKokWaterWatch/restricted/mymaps-20261020/review.json'),'utf8'))
    if (data.visibility !== 'local-review-only' || !Array.isArray(data.layers) || data.layers.length !== 6) throw new Error('Invalid review data')
    return data
  } catch {
    throw createError({statusCode:404,statusMessage:'Local My Maps data unavailable'})
  }
})
