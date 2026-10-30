import { respond } from '../surveys/_shared.js'
import { reviewSample } from '../surveys/_db.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'

// sampleCode comes from ?sampleCode= (Vercel rewrite of /api/admin/samples/:sampleCode/review) or the JSON body.
export default adminEndpoint('POST', async (request, response, settings) => {
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  const sampleCode = request.query?.sampleCode || body?.sampleCode
  const { decision, reason, reviewer } = body || {}

  if (!sampleCode) return respond(response, 400, { error: 'กรุณาระบุ sampleCode' })
  if (!['approve', 'reject'].includes(decision)) return respond(response, 400, { error: 'กรุณาระบุ decision เป็น approve หรือ reject' })

  const status = await reviewSample(settings, String(sampleCode), decision, reason, reviewerName(reviewer))
  if (!status) return respond(response, 404, { error: 'ไม่พบตัวอย่างน้ำรหัสนี้' })
  return respond(response, 200, { success: true, sample_code: sampleCode, publication_status: status })
})
