import { respond } from '../surveys/_shared.js'
import { adminEndpoint } from './_admin_shared.js'
import { getReportsAnalytics } from './_reports_db.js'

export const getReportsAnalyticsHandler = adminEndpoint('GET', async (request, response, settings) => {
  const communityId = String(request.query?.communityId || request.query?.community || 'thaton')
  const period = String(request.query?.period || '3m')

  const analytics = await getReportsAnalytics(settings, { communityId, period })
  return respond(response, 200, { ok: true, ...analytics, analytics })
})
