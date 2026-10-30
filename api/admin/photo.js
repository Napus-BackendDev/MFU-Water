import { respond } from '../surveys/_shared.js'
import { readPhoto } from '../surveys/_photos.js'
import { getAdminSettings, verifyAdminAuth } from './_admin_shared.js'

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, x-admin-token')
    return respond(response, 204, '')
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  if (!verifyAdminAuth(request)) {
    return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }

  // Allow either direct photo path or query parameter
  const photoPath = request.query?.path || (new URL(request.url, 'http://localhost')).searchParams.get('path')
  if (!photoPath || typeof photoPath !== 'string') {
    return respond(response, 400, { error: 'กรุณาระบุ path ของรูปถ่าย' })
  }

  try {
    const photo = await readPhoto(getAdminSettings(), photoPath)
    if (!photo) {
      return respond(response, 404, { error: 'ไม่พบไฟล์ภาพถ่าย' })
    }

    response.setHeader('Content-Type', photo.contentType || 'image/png')
    response.setHeader('Cache-Control', 'private, max-age=3600')
    return response.status(200).send(photo.buffer)
  } catch {
    return respond(response, 503, { error: 'ไม่สามารถโหลดภาพถ่ายได้' })
  }
}
