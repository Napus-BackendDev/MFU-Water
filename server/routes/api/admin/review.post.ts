import { defineEventHandler, readBody, getQuery, createError } from 'h3'
import { verifyAdminToken, supabaseRequest } from '../../../utils/admin-helper'

export default defineEventHandler(async (event) => {
  const isAuthed = verifyAdminToken(event)
  if (!isAuthed) {
    throw createError({ statusCode: 401, statusMessage: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  }

  const query = getQuery(event)
  const body = await readBody(event).catch(() => ({}))
  const sampleCode = String(query.sampleCode || body?.sampleCode || '')
  const { decision, reason } = body || {}

  if (!sampleCode) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาระบุ sampleCode' })
  }
  if (!['approve', 'reject'].includes(decision)) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาระบุ decision เป็น approve หรือ reject' })
  }

  const newStatus = decision === 'approve' ? 'approved' : 'rejected'
  const updatePayload: Record<string, any> = {
    publication_status: newStatus,
    reviewed_at: new Date().toISOString(),
    review_reason: reason || (decision === 'approve' ? 'อนุมัติการเผยแพร่โดยแอดมิน' : 'ไม่อนุมัติโดยแอดมิน'),
  }
  if (decision === 'approve') {
    updatePayload.approved_revision = 1
  }

  const updateSample = await supabaseRequest(
    `/rest/v1/kok_water_samples?sample_code=eq.${sampleCode}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(updatePayload),
    }
  )

  if (!updateSample.ok) {
    throw createError({ statusCode: 503, statusMessage: 'อัปเดตสถานะตัวอย่างน้ำไม่สำเร็จ' })
  }

  await supabaseRequest(
    `/rest/v1/kok_admin_alerts?sample_code=eq.${sampleCode}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ publication_status: newStatus }),
    }
  ).catch(() => {})

  return {
    success: true,
    sample_code: sampleCode,
    publication_status: newStatus,
  }
})
