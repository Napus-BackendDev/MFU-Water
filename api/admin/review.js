import { respond } from '../surveys/_shared.js'
import { reviewSample } from '../surveys/_db.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'
import evacuationDispatcher from '../evacuation/_evacuation.js'
import { adminMapDataHandler } from '../mapdata/_mapdata.js'
import {
  getReportersHandler,
  createReporterHandler,
  updateReporterHandler,
  deleteReporterHandler,
} from './_reporters.js'
import { getReportsAnalyticsHandler } from './_reports.js'
import {
  getResearchHubHandler,
  updateResearchTeamHandler,
  downloadResearchDocHandler,
} from './_research.js'
import {
  getProjectSettingsHandler,
  updateSponsorsHandler,
  updateContactsHandler,
} from './_settings.js'

const sampleReviewHandler = adminEndpoint('POST', async (request, response, settings) => {
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  const sampleCode = request.query?.sampleCode || body?.sampleCode
  const { decision, reason, reviewer } = body || {}

  if (!sampleCode) return respond(response, 400, { error: 'กรุณาระบุ sampleCode' })
  if (!['approve', 'reject'].includes(decision)) return respond(response, 400, { error: 'กรุณาระบุ decision เป็น approve หรือ reject' })

  const status = await reviewSample(settings, String(sampleCode), decision, reason, reviewerName(reviewer))
  if (!status) return respond(response, 404, { error: 'ไม่พบตัวอย่างน้ำรหัสนี้' })
  return respond(response, 200, { success: true, sample_code: sampleCode, publication_status: status })
})

// Dispatcher for sample review, evacuation management, map data, reporters, reports, research and settings (Hobby 12-function cap)
export default async function handler(request, response) {
  const route = request.query?.route
  if (route === 'mapdata') return adminMapDataHandler(request, response)
  if (route?.startsWith('evacuation')) {
    return evacuationDispatcher(request, response)
  }
  if (route === 'reporters') {
    if (request.method === 'POST') return createReporterHandler(request, response)
    if (request.method === 'PUT') return updateReporterHandler(request, response)
    if (request.method === 'DELETE') return deleteReporterHandler(request, response)
    return getReportersHandler(request, response)
  }
  if (route === 'reports') {
    return getReportsAnalyticsHandler(request, response)
  }
  if (route === 'research') {
    if (request.method === 'PUT') return updateResearchTeamHandler(request, response)
    if (request.method === 'POST') return downloadResearchDocHandler(request, response)
    return getResearchHubHandler(request, response)
  }
  if (route === 'settings') {
    if (request.query?.sub === 'sponsors' || (request.method === 'PUT' && request.body?.sponsors)) return updateSponsorsHandler(request, response)
    if (request.query?.sub === 'contacts' || (request.method === 'PUT' && request.body?.contacts)) return updateContactsHandler(request, response)
    return getProjectSettingsHandler(request, response)
  }
  return sampleReviewHandler(request, response)
}
