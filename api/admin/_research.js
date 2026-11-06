import { respond } from '../surveys/_shared.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'
import { listResearchTeams, updateResearchTeam, recordDownload } from './_research_db.js'

export const getResearchHubHandler = adminEndpoint('GET', async (_request, response, settings) => {
  const teams = await listResearchTeams(settings)
  return respond(response, 200, { ok: true, teams })
})

export const updateResearchTeamHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const id = request.params?.id || request.body?.id || request.query?.id
  if (!id) {
    return respond(response, 400, { error: 'ไม่พบรหัสทีมวิจัย' })
  }

  const author = reviewerName(request.headers?.['x-reviewer-name']) || 'แอดมิน'
  const updated = await updateResearchTeam(settings, id, request.body, author)
  if (!updated) {
    return respond(response, 404, { error: 'ไม่พบข้อมูลทีมวิจัยในระบบ' })
  }
  return respond(response, 200, { ok: true, team: updated })
})

export const downloadResearchDocHandler = async (request, response, settings) => {
  const id = request.params?.id || request.query?.id
  if (id) {
    try {
      await recordDownload(settings, id)
    } catch {
      // ignore non-critical metric failure
    }
  }
  return respond(response, 200, { ok: true, message: 'บันทึกสถิติดาวน์โหลดสำเร็จ' })
}
