import { respond, encodeStoragePath } from '../surveys/_shared.js'
import { supabaseRequest } from './_admin_shared.js'

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    return respond(response, 204, '')
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  // Allow either direct photo path or query parameter
  const photoPath = request.query?.path || (new URL(request.url, 'http://localhost')).searchParams.get('path')
  if (!photoPath || typeof photoPath !== 'string') {
    return respond(response, 400, { error: 'กรุณาระบุ path ของรูปถ่าย' })
  }

  try {
    const rPhoto = await supabaseRequest(
      `/storage/v1/object/survey-photos/${encodeStoragePath(photoPath)}`
    )
    if (!rPhoto.ok) {
      return respond(response, 404, { error: 'ไม่พบไฟล์ภาพถ่าย' })
    }

    const contentType = rPhoto.headers.get('content-type') || 'image/png'
    response.setHeader('Content-Type', contentType)
    response.setHeader('Cache-Control', 'private, max-age=3600')
    const buffer = Buffer.from(await rPhoto.arrayBuffer())
    return response.status(200).send(buffer)
  } catch (err) {
    return respond(response, 503, { error: 'ไม่สามารถโหลดภาพถ่ายได้: ' + (err?.message || '') })
  }
}
