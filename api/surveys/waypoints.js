import { config, respond, safeWaypointColumns, supabaseRequest } from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const settings = config(false)
    const result = await supabaseRequest(settings,
      `/rest/v1/water_quality_surveys?select=${safeWaypointColumns}&public_consent_at=not.is.null&arsenic_level_ppb=lte.50&order=created_at.desc&limit=1000`)
    if (!result.ok) return respond(response, 503, { error: 'โหลดจุดสำรวจไม่สำเร็จ' })
    return respond(response, 200, await result.json())
  } catch {
    return respond(response, 503, { error: 'บริการผลตรวจยังไม่พร้อมใช้งาน' })
  }
}
