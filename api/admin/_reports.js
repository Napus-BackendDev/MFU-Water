import { respond } from '../surveys/_shared.js'
import { canAccessCommunity } from '../../src/lib/admin-rbac.js'
import { adminEndpoint } from './_admin_shared.js'
import { getReportsAnalytics } from './_reports_db.js'

export const getReportsAnalyticsHandler = adminEndpoint('GET', async (request, response, settings, ctx) => {
  const communityId = String(request.query?.communityId || request.query?.community || 'thaton')
  if (!canAccessCommunity(ctx.allowedCommunities, communityId)) return respond(response, 403, { error: 'บัญชีนี้ไม่มีสิทธิ์ในชุมชนนี้' })
  const period = String(request.query?.period || '3m')

  const analytics = await getReportsAnalytics(settings, { communityId, period })
  return respond(response, 200, { ok: true, ...analytics, analytics })
}, { page: 'reports', level: 'view' })
