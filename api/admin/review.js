import { respond } from '../surveys/_shared.js'
import { verifyAdminAuth, supabaseRequest } from './_admin_shared.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-passcode')

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
    const { decision, reason } = body || {}

    if (!sampleCode) {
      return respond(response, 400, { error: 'กรุณาระบุ sampleCode' })
    }
    if (!['approve', 'reject'].includes(decision)) {
      return respond(response, 400, { error: 'กรุณาระบุ decision เป็น approve หรือ reject' })
    }

    const newStatus = decision === 'approve' ? 'approved' : 'rejected'
    const updatePayload = {
      publication_status: newStatus,
      reviewed_at: new Date().toISOString(),
      review_reason: reason || (decision === 'approve' ? 'อนุมัติการเผยแพร่โดยแอดมิน' : 'ไม่อนุมัติโดยแอดมิน'),
    }
    if (decision === 'approve') {
      updatePayload.approved_revision = 1
    }

    const updateSample = await supabaseRequest(
      `/rest/v1/kok_water_samples?sample_code=eq.${encodeURIComponent(sampleCode)}`,
      {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify(updatePayload),
      }
    )

    if (!updateSample.ok) {
      return respond(response, 503, { error: 'อัปเดตสถานะตัวอย่างน้ำไม่สำเร็จ' })
    }

    await supabaseRequest(
      `/rest/v1/kok_admin_alerts?sample_code=eq.${encodeURIComponent(sampleCode)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ publication_status: newStatus }),
      }
    ).catch(() => {})

    return respond(response, 200, {
      success: true,
      sample_code: sampleCode,
      publication_status: newStatus,
    })
  } catch (err) {
    return respond(response, 500, { error: 'จัดการรายการไม่สำเร็จ: ' + (err?.message || '') })
  }
}
