import { config, respond, supabaseRequest } from '../surveys/_shared.js'
import { verifyAdminAuth } from './samples.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  response.setHeader('Cache-Control', 'no-store')
  const isAuthed = await verifyAdminAuth(request)
  if (!isAuthed) {
    return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }
  try {
    const sampleCode = request.query?.sampleCode || (typeof request.body === 'string' ? JSON.parse(request.body) : request.body)?.sampleCode
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {}
    const { decision, reason } = body
    if (!sampleCode) {
      return respond(response, 400, { error: 'กรุณาระบุ sampleCode' })
    }
    if (!['approve', 'reject'].includes(decision)) {
      return respond(response, 400, { error: 'กรุณาระบุ decision เป็น approve หรือ reject' })
    }
    const newStatus = decision === 'approve' ? 'approved' : 'rejected'
    const settings = config(false)

    const updatePayload = {
      publication_status: newStatus,
      reviewed_at: new Date().toISOString(),
      review_reason: reason || (decision === 'approve' ? 'อนุมัติการเผยแพร่โดยแอดมิน' : 'ไม่อนุมัติโดยแอดมิน'),
    }
    if (decision === 'approve') {
      updatePayload.approved_revision = 1
    }

    const updateSample = await supabaseRequest(
      settings,
      `/rest/v1/kok_water_samples?sample_code=eq.${sampleCode}`,
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
      settings,
      `/rest/v1/kok_admin_alerts?sample_code=eq.${sampleCode}`,
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
  } catch {
    return respond(response, 503, { error: 'จัดการรายการไม่สำเร็จ' })
  }
}
