import { config, respond, toSurveyWaypointDto } from './_shared.js'
import { listPublishedSamples, listSurveys } from './_db.js'
import { isPublicSample } from './photo.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const settings = config(false)

    // โหลดข้อมูลจาก kok_water_samples (รายการเดิมและรายการที่ sync) และ water_quality_surveys
    const [kokResult, surveyResult] = await Promise.allSettled([listPublishedSamples(settings), listSurveys(settings)])
    if (kokResult.status === 'rejected' && surveyResult.status === 'rejected') {
      return respond(response, 503, { error: 'บริการผลตรวจยังไม่พร้อมใช้งาน' })
    }
    const kokRows = kokResult.status === 'fulfilled' ? kokResult.value : []
    const surveyRows = surveyResult.status === 'fulfilled' ? surveyResult.value : []

    // ส่งเฉพาะจำนวนภาพ ไม่ส่ง path ของ storage ออกไป
    const photoCounts = new Map()
    for (const k of kokRows) {
      if (isPublicSample(k) && Array.isArray(k.private_photo_paths)) photoCounts.set(k.sample_code, k.private_photo_paths.filter(Boolean).length)
    }

    const waypoints = []
    const seenCodes = new Set()

    for (const s of surveyRows) {
      if (s.arsenic_level_ppb <= 50) {
        waypoints.push(toSurveyWaypointDto(s))
        seenCodes.add(s.sample_code)
      }
    }

    for (const k of kokRows) {
      if (!seenCodes.has(k.sample_code)) {
        const ppb = Number(k?.arsenic_ppb ?? k?.measurements?.arsenic?.value ?? 0)
        if (k.publication_status === 'approved' || (k.publication_status === 'auto_published' && ppb <= 50)) {
          waypoints.push(toSurveyWaypointDto(k))
          seenCodes.add(k.sample_code)
        }
      }
    }

    for (const w of waypoints) w.photo_count = photoCounts.get(w.sample_code) ?? 0

    waypoints.sort((a, b) => new Date(b.created_at || b.collection_time).getTime() - new Date(a.created_at || a.collection_time).getTime())

    return respond(response, 200, waypoints)
  } catch {
    return respond(response, 503, { error: 'บริการผลตรวจยังไม่พร้อมใช้งาน' })
  }
}
