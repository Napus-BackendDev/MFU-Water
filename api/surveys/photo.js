import { allowedPhotoTypes, config, respond } from './_shared.js'
import { photoPathPattern, readPhoto } from './_photos.js'
import { findSamplePhotoInfo } from './_db.js'

const sampleCodePattern = /^KOK-\d{8}-[0-9A-F]{4,8}$/i
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
    const row = await findSamplePhotoInfo(settings, code)
    const path = isPublicSample(row) && Array.isArray(row.private_photo_paths) ? row.private_photo_paths[index - 1] : null
    if (typeof path !== 'string' || !photoPathPattern.test(path)) return respond(response, 404, { error: 'ไม่พบภาพถ่าย' })

    const photo = await readPhoto(settings, path)
    if (!photo || !allowedPhotoTypes.has(photo.contentType)) return respond(response, 404, { error: 'ไม่พบภาพถ่าย' })

    response.setHeader('Content-Type', photo.contentType)
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.status(200).send(photo.buffer)
  } catch {
    return respond(response, 503, { error: 'ไม่สามารถโหลดภาพถ่ายได้' })
  }
}
