import { respond } from '../surveys/_shared.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'
import { getProjectSettings, updateSponsors, updateContacts } from './_settings_db.js'

export const getProjectSettingsHandler = adminEndpoint('GET', async (_request, response, settings) => {
  const data = await getProjectSettings(settings)
  return respond(response, 200, { ok: true, ...data })
})

export const updateSponsorsHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const items = Array.isArray(request.body?.sponsors)
    ? request.body.sponsors
    : (Array.isArray(request.body?.items) ? request.body.items : (Array.isArray(request.body) ? request.body : null))
  if (!items) {
    return respond(response, 400, { error: 'กรุณาส่งรายการผู้สนับสนุนในรูปแบบ Array' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const updated = await updateSponsors(settings, items, author)
  return respond(response, 200, { ok: true, sponsors: updated })
})

export const updateContactsHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const items = Array.isArray(request.body?.contacts)
    ? request.body.contacts
    : (Array.isArray(request.body?.items) ? request.body.items : (Array.isArray(request.body) ? request.body : null))
  if (!items) {
    return respond(response, 400, { error: 'กรุณาส่งรายการเบอร์ติดต่อฉุกเฉินในรูปแบบ Array' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const updated = await updateContacts(settings, items, author)
  return respond(response, 200, { ok: true, contacts: updated })
})
