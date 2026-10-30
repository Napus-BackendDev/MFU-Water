import { respond } from '../surveys/_shared.js'
import { loginAdmin } from './_admin_shared.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token')

  if (request.method === 'OPTIONS') {
    return respond(response, 204, '')
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const { status, body: payload } = loginAdmin(body?.passcode)
    return respond(response, status, payload)
  } catch {
    return respond(response, 500, { error: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' })
  }
}
