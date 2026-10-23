import {
  clientIp,
  config,
  hashClientIp,
  encodeStoragePath,
  publicSurveyPayload,
  readJsonBody,
  readTicket,
  respond,
  safeWaypointColumns,
  stableSurveyHash,
  supabaseRequest,
  toSurveyWaypointDto,
  validateSurvey,
} from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const settings = config()
    const body = readJsonBody(request)
    if (!validateSurvey({ ...body, publicConsent: true })) return respond(response, 400, { error: 'ข้อมูลแบบสำรวจไม่ถูกต้อง' })
    const claims = readTicket(settings.signingSecret, body.ticket)
    const ipHash = hashClientIp(settings.signingSecret, clientIp(request))
    if (!claims || claims.ipHash !== ipHash) return respond(response, 403, { error: 'รายการสำรวจหมดอายุหรือไม่ถูกต้อง กรุณาเริ่มใหม่' })

    if (stableSurveyHash(settings.signingSecret, body, claims.photoPaths) !== claims.payloadHash) {
      return respond(response, 400, { error: 'ข้อมูลแบบสำรวจเปลี่ยนหลังยืนยัน CAPTCHA กรุณาเริ่มใหม่' })
    }
    const existing = await supabaseRequest(settings,
      `/rest/v1/water_quality_surveys?id=eq.${claims.surveyId}&select=${safeWaypointColumns}`)
    if (!existing.ok) return respond(response, 503, { error: 'ตรวจรายการสำรวจไม่สำเร็จ' })
    const [saved] = await existing.json()
    if (saved) return respond(response, 200, saved)

    for (const path of claims.photoPaths.filter(Boolean)) {
      const check = await supabaseRequest(settings, `/storage/v1/object/survey-photos/${encodeStoragePath(path)}`, { method: 'HEAD' })
      if (!check.ok) return respond(response, 400, { error: 'อัปโหลดรูปภาพไม่ครบ กรุณาลองใหม่' })
      const contentType = check.headers.get('content-type')
      const contentLength = Number(check.headers.get('content-length'))
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType ?? '')) {
        return respond(response, 400, { error: 'ชนิดรูปภาพที่อัปโหลดไม่ถูกต้อง' })
      }
      if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > 10 * 1024 * 1024) {
        return respond(response, 400, { error: 'ขนาดรูปภาพไม่ถูกต้อง' })
      }
      const image = await supabaseRequest(settings, `/storage/v1/object/survey-photos/${encodeStoragePath(path)}`, { headers: { range: 'bytes=0-11' } })
      if (image.status !== 206) { await image.body?.cancel(); return respond(response, 503, { error: 'ตรวจไฟล์ภาพไม่สำเร็จ' }) }
      const bytes = new Uint8Array(await image.arrayBuffer())
      const validImage = contentType === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : contentType === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
          : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
      if (!validImage) return respond(response, 400, { error: 'เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพ' })
    }

    // กำหนด publication_status: ค่าเกิน 50 ppb จะต้องรอแอดมินยืนยัน (pending_review)
    const publicationStatus = body.arsenicLevelPpb > 50 ? 'pending_review' : 'auto_published'

    const values = publicSurveyPayload(body)
    values.id = claims.surveyId
    values.sample_code = claims.sampleCode
    values.public_consent_at = claims.consentAt
    values.photo_1_path = claims.photoPaths[0]
    values.photo_2_path = claims.photoPaths[1]

    const inserted = await supabaseRequest(settings,
      `/rest/v1/water_quality_surveys?select=${safeWaypointColumns}`, {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify(values),
      })
    if (!inserted.ok) {
      return respond(response, 503, { error: 'บันทึกแบบสำรวจไม่สำเร็จ กรุณาลองใหม่' })
    }
    const [waypoint] = await inserted.json()

    // ซิงค์เข้าตาราง kok_water_samples
    try {
      const samplePayload = {
        sample_code: claims.sampleCode,
        station_id: 'COORDINATE-POINT',
        station_name: `จุดตรวจ ${claims.sampleCode}`,
        latitude: Number(body.coordinates.latitude),
        longitude: Number(body.coordinates.longitude),
        collection_time: body.sampleCollectedAt || new Date().toISOString(),
        gps_accuracy_meters: body.gpsAccuracyMeters,
        entry_type: 'realtime',
        sample_nature: {
          water_source: body.waterSourceType || 'แม่น้ำกก',
          water_appearance: body.rainContext ? `บริบทฝน: ${body.rainContext}` : ''
        },
        measurements: {
          arsenic: {
            value: body.arsenicLevelPpb,
            unit: 'ppb',
            status: body.arsenicLevelPpb > 10 ? 'danger' : body.arsenicLevelPpb >= 5 ? 'watch' : 'normal'
          }
        },
        arsenic_ppb: body.arsenicLevelPpb,
        publication_status: publicationStatus,
        revision: 1,
        approved_revision: publicationStatus === 'auto_published' ? 1 : null,
        private_photo_paths: claims.photoPaths.filter(Boolean)
      }
      await supabaseRequest(settings, '/rest/v1/kok_water_samples', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(samplePayload)
      })

      // เก็บข้อมูลติดต่อภายใน kok_sample_contacts
      await supabaseRequest(settings, '/rest/v1/kok_sample_contacts', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          sample_code: claims.sampleCode,
          name: body.fullName.trim(),
          phone: body.phoneNumber.trim()
        })
      })

      // หากค่าเกิน 50 ppb ให้สร้างแจ้งเตือนแอดมินใน kok_admin_alerts
      if (body.arsenicLevelPpb > 50) {
        await supabaseRequest(settings, '/rest/v1/kok_admin_alerts', {
          method: 'POST',
          body: JSON.stringify({
            sample_code: claims.sampleCode,
            arsenic_ppb: body.arsenicLevelPpb,
            publication_status: 'pending_review',
            email_status: 'queued'
          })
        })
      }
    } catch {
      // Non-fatal sync error; citizen survey already recorded in water_quality_surveys
    }

    const responseDto = toSurveyWaypointDto({
      ...waypoint,
      water_source_type: body.waterSourceType,
      rain_context: body.rainContext,
      publication_status: publicationStatus,
    })

    return respond(response, 201, responseDto)
  } catch {
    return respond(response, 503, { error: 'บริการบันทึกแบบสำรวจยังไม่พร้อมใช้งาน' })
  }
}
