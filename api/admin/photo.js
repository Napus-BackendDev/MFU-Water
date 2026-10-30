import { respond } from '../surveys/_shared.js'
import { readPhoto } from '../surveys/_photos.js'
import { adminEndpoint } from './_admin_shared.js'

// Private survey photos, served only to an authenticated admin.
export default adminEndpoint('GET', async (request, response, settings) => {
  const path = request.query?.path || new URL(request.url, 'http://localhost').searchParams.get('path')
  if (!path || typeof path !== 'string') return respond(response, 400, { error: 'กรุณาระบุ path ของรูปถ่าย' })

  const photo = await readPhoto(settings, path)
  if (!photo) return respond(response, 404, { error: 'ไม่พบไฟล์ภาพถ่าย' })

  response.setHeader('Content-Type', photo.contentType || 'image/png')
  response.setHeader('Cache-Control', 'private, max-age=3600')
  return response.status(200).send(photo.buffer)
})
