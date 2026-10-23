import { encodeStoragePath, config, supabaseRequest } from '../surveys/_shared.js'

export default async function handler(request, response) {
  try {
    const photoPath = request.query?.path
    if (!photoPath || typeof photoPath !== 'string') {
      return response.status(400).json({ error: 'กรุณาระบุ path ของรูปถ่าย' })
    }
    const settings = config(false)
    const rPhoto = await supabaseRequest(
      settings,
      `/storage/v1/object/survey-photos/${encodeStoragePath(photoPath)}`
    )
    if (!rPhoto.ok) {
      return response.status(404).json({ error: 'ไม่พบไฟล์ภาพถ่าย' })
    }
    const contentType = rPhoto.headers.get('content-type') || 'image/png'
    response.setHeader('Content-Type', contentType)
    response.setHeader('Cache-Control', 'private, max-age=3600')
    const buffer = Buffer.from(await rPhoto.arrayBuffer())
    return response.status(200).send(buffer)
  } catch {
    return response.status(503).json({ error: 'ไม่สามารถโหลดภาพถ่ายได้' })
  }
}
