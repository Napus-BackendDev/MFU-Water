import { config, respond } from '../surveys/_shared.js'
import { readNewsPhoto } from './_news_photos.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  const url = new URL(request.url, 'http://localhost')
  const filename = request.params?.filename || request.query?.filename || url.searchParams.get('name') || url.pathname.split('/').pop() || ''

  if (!filename || filename === 'photo') {
    return respond(response, 400, { error: 'กรุณาระบุชื่อไฟล์ภาพ' })
  }

  try {
    const settings = config(false)
    const photo = await readNewsPhoto(settings, filename)

    if (photo) {
      response.setHeader('Content-Type', photo.contentType)
      response.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      return response.status(200).send(photo.buffer)
    }

    // Fallback: check static public/data/news/ directory if not found in GridFS
    const localFallback = resolve(process.cwd(), 'public/data/news', filename)
    if (existsSync(localFallback)) {
      const buf = readFileSync(localFallback)
      const ext = filename.split('.').pop()?.toLowerCase()
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      response.setHeader('Content-Type', mime)
      response.setHeader('Cache-Control', 'public, max-age=86400')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      return response.status(200).send(buf)
    }

    return respond(response, 404, { error: 'ไม่พบภาพข่าวสาร' })
  } catch {
    return respond(response, 503, { error: 'ไม่สามารถโหลดภาพข่าวสารได้' })
  }
}
