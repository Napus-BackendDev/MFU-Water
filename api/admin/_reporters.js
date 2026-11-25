import { respond } from '../surveys/_shared.js'
import { canAccessCommunity } from '../../src/lib/admin-rbac.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'
import {
  getReporterCommunity,
  listReporters,
  createReporter,
  updateReporter,
  deleteReporter,
} from './_reporters_db.js'

const noAccess = (response) => respond(response, 403, { error: 'บัญชีนี้ไม่มีสิทธิ์ในชุมชนนี้' })

export const getReportersHandler = adminEndpoint('GET', async (request, response, settings, ctx) => {
  let communityId = String(request.query?.communityId || request.query?.community || 'all')
  if (!canAccessCommunity(ctx.allowedCommunities, 'all')) {
    // An account with some villages never gets a list that spans all of them.
    if (communityId === 'all') {
      if (ctx.allowedCommunities.length !== 1) return respond(response, 403, { error: 'กรุณาระบุชุมชนที่ต้องการดู' })
      communityId = ctx.allowedCommunities[0]
    }
    if (!canAccessCommunity(ctx.allowedCommunities, communityId)) return noAccess(response)
  }
  const status = String(request.query?.status || 'all')
  const search = String(request.query?.search || request.query?.q || '')

  const items = await listReporters(settings, { communityId, status, search })
  return respond(response, 200, { ok: true, items })
}, { page: 'reporters', level: 'view' })

export const createReporterHandler = adminEndpoint('POST', async (request, response, settings, ctx) => {
  const body = request.body || {}
  if (!canAccessCommunity(ctx.allowedCommunities, body.communityId || 'thaton')) return noAccess(response)
  if (!body.name || !String(body.name).trim()) {
    return respond(response, 400, { error: 'กรุณาระบุชื่ออาสาสมัคร' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const created = await createReporter(settings, body, author)
  return respond(response, 201, { ok: true, reporter: created })
}, { page: 'reporters', level: 'edit' })

export const updateReporterHandler = adminEndpoint('PUT', async (request, response, settings, ctx) => {
  const id = request.params?.id || request.body?.id
  if (!id) {
    return respond(response, 400, { error: 'ไม่พบรหัสอาสาสมัคร' })
  }
  const owner = await getReporterCommunity(settings, id)
  if (owner && !canAccessCommunity(ctx.allowedCommunities, owner)) return noAccess(response)
  if (request.body?.communityId && !canAccessCommunity(ctx.allowedCommunities, request.body.communityId)) return noAccess(response)

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const updated = await updateReporter(settings, id, request.body, author)
  if (!updated) {
    return respond(response, 404, { error: 'ไม่พบข้อมูลอาสาสมัครในระบบ' })
  }
  return respond(response, 200, { ok: true, reporter: updated })
}, { page: 'reporters', level: 'edit' })

export const deleteReporterHandler = adminEndpoint('DELETE', async (request, response, settings, ctx) => {
  const id = request.params?.id || request.query?.id
  if (!id) {
    return respond(response, 400, { error: 'ไม่พบรหัสอาสาสมัคร' })
  }
  const owner = await getReporterCommunity(settings, id)
  if (owner && !canAccessCommunity(ctx.allowedCommunities, owner)) return noAccess(response)

  const ok = await deleteReporter(settings, id)
  if (!ok) {
    return respond(response, 404, { error: 'ไม่พบข้อมูลอาสาสมัคร หรือถูกลบไปแล้ว' })
  }
  return respond(response, 200, { ok: true, message: 'ลบข้อมูลอาสาสมัครเรียบร้อย' })
}, { page: 'reporters', level: 'edit' })
