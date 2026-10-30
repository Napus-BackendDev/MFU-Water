import { respond } from '../surveys/_shared.js'
import { reviewSample } from '../surveys/_db.js'
import { getAdminSettings, reviewerName, verifyAdminAuth } from './_admin_shared.js'

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

  if (!verifyAdminAuth(request)) {
    return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const sampleCode = request.query?.sampleCode || body?.sampleCode
    const { decision, reason, reviewer } = body || {}

    if (!sampleCode) {
      return respond(response, 400, { error: 'กรุณาระบุ sampleCode' })
    }
    if (!['approve', 'reject'].includes(decision)) {
      return respond(response, 400, { error: 'กรุณาระบุ decision เป็น approve หรือ reject' })
    }

    const newStatus = await reviewSample(getAdminSettings(), String(sampleCode), decision, reason, reviewerName(reviewer))
    if (!newStatus) return respond(response, 404, { error: 'ไม่พบตัวอย่างน้ำรหัสนี้' })

    return respond(response, 200, {
      success: true,
      sample_code: sampleCode,
      publication_status: newStatus,
    })
  } catch (err) {
    return respond(response, 500, { error: 'จัดการรายการไม่สำเร็จ: ' + (err?.message || '') })
  }
}
