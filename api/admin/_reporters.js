import { respond } from '../surveys/_shared.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'
import {
  listReporters,
  createReporter,
  updateReporter,
  deleteReporter,
} from './_reporters_db.js'

export const getReportersHandler = adminEndpoint('GET', async (request, response, settings) => {
  const communityId = String(request.query?.communityId || request.query?.community || 'all')
  const status = String(request.query?.status || 'all')
  const search = String(request.query?.search || request.query?.q || '')

  const items = await listReporters(settings, { communityId, status, search })
  return respond(response, 200, { ok: true, items })
})

export const createReporterHandler = adminEndpoint('POST', async (request, response, settings) => {
  const body = request.body || {}
  if (!body.name || !String(body.name).trim()) {
    return respond(response, 400, { error: 'กรุณาระบุชื่ออาสาสมัคร' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const created = await createReporter(settings, body, author)
  return respond(response, 201, { ok: true, reporter: created })
})

export const updateReporterHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const id = request.params?.id || request.body?.id
  if (!id) {
    return respond(response, 400, { error: 'ไม่พบรหัสอาสาสมัคร' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const updated = await updateReporter(settings, id, request.body, author)
  if (!updated) {
    return respond(response, 404, { error: 'ไม่พบข้อมูลอาสาสมัครในระบบ' })
  }
  return respond(response, 200, { ok: true, reporter: updated })
})

export const deleteReporterHandler = adminEndpoint('DELETE', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id
  if (!id) {
    return respond(response, 400, { error: 'ไม่พบรหัสอาสาสมัคร' })
  }

  const ok = await deleteReporter(settings, id)
  if (!ok) {
    return respond(response, 404, { error: 'ไม่พบข้อมูลอาสาสมัคร หรือถูกลบไปแล้ว' })
  }
  return respond(response, 200, { ok: true, message: 'ลบข้อมูลอาสาสมัครเรียบร้อย' })
})
