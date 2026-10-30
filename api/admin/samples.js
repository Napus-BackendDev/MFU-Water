import { respond } from '../surveys/_shared.js'
import { buildAdminQueue } from '../surveys/_db.js'
import { getAdminSettings, verifyAdminAuth } from './_admin_shared.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')

  if (request.method === 'OPTIONS') {
    return respond(response, 204, '')
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  if (!verifyAdminAuth(request)) {
    return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }

  try {
    return respond(response, 200, await buildAdminQueue(getAdminSettings()))
  } catch (err) {
    return respond(response, 503, { error: 'ไม่สามารถโหลดข้อมูลคิวแอดมินได้: ' + (err?.message || '') })
  }
}
