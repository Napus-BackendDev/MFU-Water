import { allowedPhotoTypes, config, respond } from './_shared.js'
import { maxPhotoBytes, photoPathPattern, savePhoto, verifyUploadToken } from './_photos.js'

// Reads the raw request body, stopping once it exceeds the photo size limit.
async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxPhotoBytes) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Photos are uploaded here with a signed, short-lived token and stored in MongoDB GridFS.
export default async function handler(request, response) {
  if (request.method !== 'PUT') {
    response.setHeader('Allow', 'PUT')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const settings = config(false)
    const url = new URL(request.url, 'http://localhost')
    const path = url.searchParams.get('path') ?? ''
    const type = String(request.headers['content-type'] ?? '').split(';')[0]
    if (!photoPathPattern.test(path) || !allowedPhotoTypes.has(type)
      || !verifyUploadToken(settings.signingSecret, path, url.searchParams.get('token') ?? '')) {
      return respond(response, 400, { error: 'อัปโหลดรูปภาพไม่สำเร็จ' })
    }
    const body = await readBody(request)
    if (!body?.length) return respond(response, 400, { error: 'อัปโหลดรูปภาพไม่สำเร็จ' })
    if (!await savePhoto(settings, path, body, type)) return respond(response, 409, { error: 'อัปโหลดรูปภาพซ้ำ' })
    return respond(response, 200, { ok: true })
  } catch {
    return respond(response, 503, { error: 'อัปโหลดรูปภาพไม่สำเร็จ' })
  }
}
