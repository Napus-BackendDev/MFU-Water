import { allowedPhotoTypes, config, encodeStoragePath, respond, supabaseRequest } from './_shared.js'

const sampleCodePattern = /^KOK-\d{8}-[0-9A-F]{4,8}$/i
// รูปแบบ path ที่ระบบสร้าง: <survey-uuid>/<1|2>.<ext> (ฟอร์มปัจจุบัน) และ samples/<uuid>.<ext> (ข้อมูลที่ sync เดิม)
const photoPathPattern = /^(?:[0-9a-f-]{36}\/[12]|samples\/[0-9a-f-]{36})\.(jpg|png|webp)$/i

// ภาพสาธารณะของจุดตรวจ: ใช้กฎเผยแพร่เดียวกับ waypoints.js (approved หรือ auto_published ที่ไม่เกิน 50 ppb)
export function isPublicSample(row) {
  if (!row) return false
  const ppb = Number(row.arsenic_ppb ?? row.measurements?.arsenic?.value ?? 0)
  return row.publication_status === 'approved' || (row.publication_status === 'auto_published' && ppb <= 50)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  const code = String(request.query?.code ?? '')
  const index = Number(request.query?.n ?? 1)
  if (!sampleCodePattern.test(code) || !Number.isInteger(index) || index < 1 || index > 2) {
    return respond(response, 400, { error: 'คำขอภาพไม่ถูกต้อง' })
  }
  try {
    const settings = config(false)
    const rSample = await supabaseRequest(
      settings,
      `/rest/v1/kok_water_samples?select=arsenic_ppb,measurements,publication_status,private_photo_paths&sample_code=eq.${code}&limit=1`,
    )
    if (!rSample.ok) return respond(response, 503, { error: 'ไม่สามารถโหลดภาพถ่ายได้' })
    const [row] = await rSample.json()
    const path = isPublicSample(row) && Array.isArray(row.private_photo_paths) ? row.private_photo_paths[index - 1] : null
    if (typeof path !== 'string' || !photoPathPattern.test(path)) return respond(response, 404, { error: 'ไม่พบภาพถ่าย' })

    const rPhoto = await supabaseRequest(settings, `/storage/v1/object/survey-photos/${encodeStoragePath(path)}`)
    const contentType = (rPhoto.headers.get('content-type') || '').split(';')[0].trim()
    if (!rPhoto.ok || !allowedPhotoTypes.has(contentType)) return respond(response, 404, { error: 'ไม่พบภาพถ่าย' })

    response.setHeader('Content-Type', contentType)
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.status(200).send(Buffer.from(await rPhoto.arrayBuffer()))
  } catch {
    return respond(response, 503, { error: 'ไม่สามารถโหลดภาพถ่ายได้' })
  }
}
