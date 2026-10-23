import {
  allowedPhotoTypes,
  clientIp,
  config,
  hashClientIp,
  issueTicket,
  publicSurveyPayload,
  readJsonBody,
  respond,
  stableSurveyHash,
  supabaseRequest,
  validateSurvey,
  verifyCaptcha,
} from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const settings = config()
    const body = readJsonBody(request)
    if (!validateSurvey(body) || settings.turnstileEnabled && (typeof body.turnstileToken !== 'string' || body.turnstileToken.length > 2048)
      || !Array.isArray(body.photoTypes) || body.photoTypes.length !== 2
      || body.photoTypes.some((type) => type !== null && !allowedPhotoTypes.has(type))) {
      return respond(response, 400, { error: 'กรุณาตรวจข้อมูลแบบสำรวจและรูปภาพก่อนส่ง' })
    }
    const ip = clientIp(request)
    const requestHost = String(request.headers.host ?? '').split(':')[0].toLowerCase()
    const allowedHostnames = settings.turnstileHostnames.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
    if (settings.turnstileEnabled && (!allowedHostnames.includes(requestHost)
      || !await verifyCaptcha(settings.turnstileSecret, body.turnstileToken, ip, requestHost, allowedHostnames))) {
      return respond(response, 403, { error: 'ยืนยัน CAPTCHA ไม่สำเร็จ กรุณาลองใหม่' })
    }
    const ipHash = hashClientIp(settings.signingSecret, ip)
    const reservation = await supabaseRequest(settings, '/rest/v1/rpc/reserve_water_quality_survey', {
      method: 'POST',
      body: JSON.stringify({ p_ip_hash: ipHash }),
    })
    if (!reservation.ok) return respond(response, 503, { error: 'เตรียมรายการสำรวจไม่สำเร็จ' })
    const [reserved] = await reservation.json()
    if (!reserved?.allowed) {
      response.setHeader('Retry-After', String(reserved?.retry_after_seconds ?? 3600))
      return respond(response, 429, { error: 'ส่งแบบสำรวจครบจำนวนชั่วคราวแล้ว กรุณารอสักครู่' })
    }

    const paths = body.photoTypes.map((type, index) => type ? `${reserved.survey_id}/${index + 1}.${allowedPhotoTypes.get(type)}` : null)
    const uploads = []
    for (const [index, path] of paths.entries()) {
      if (!path) continue
      const result = await supabaseRequest(settings, `/storage/v1/object/upload/sign/survey-photos/${path}`, {
        method: 'POST',
        body: JSON.stringify({ upsert: false }),
      })
      if (!result.ok) return respond(response, 503, { error: 'สร้างช่องอัปโหลดรูปภาพไม่สำเร็จ' })
      const signed = await result.json()
      if (typeof signed.token !== 'string') return respond(response, 503, { error: 'บริการอัปโหลดรูปภาพตอบกลับไม่ถูกต้อง' })
      uploads.push({ index, path, token: signed.token })
    }

    const survey = publicSurveyPayload(body)
    const ticket = issueTicket(settings.signingSecret, {
      surveyId: reserved.survey_id,
      sampleCode: reserved.sample_code,
      ipHash,
      photoPaths: paths,
      payloadHash: stableSurveyHash(settings.signingSecret, body, paths),
      expiresAt: Date.now() + 10 * 60 * 1000,
      consentAt: survey.public_consent_at,
    })
    return respond(response, 200, { ticket, uploads })
  } catch (err) {
    console.error('PREPARE CATCH ERROR:', err)
    return respond(response, 503, { error: 'บริการส่งแบบสำรวจยังไม่พร้อมใช้งาน', details: err?.message })
  }
}
