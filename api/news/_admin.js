import { respond } from '../surveys/_shared.js'
import { adminEndpoint, reviewerName } from '../admin/_admin_shared.js'
import {
  listAdminNews,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  toggleNewsPin,
  getNewsById
} from './_news_db.js'
import { saveNewsPhoto, maxNewsPhotoBytes } from './_news_photos.js'

async function readBody(request, maxBytes = maxNewsPhotoBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export const getAdminNewsHandler = adminEndpoint('GET', async (request, response, settings) => {
  const category = String(request.query?.category || 'all')
  const communityId = String(request.query?.community || request.query?.community_id || 'all')
  const status = String(request.query?.status || 'all')
  const search = String(request.query?.search || request.query?.q || '')

  const data = await listAdminNews(settings, { category, communityId, status, search })
  return respond(response, 200, { ok: true, ...data })
})

export const createAdminNewsHandler = adminEndpoint('POST', async (request, response, settings) => {
  const body = request.body || {}
  if (!body.title || !String(body.title).trim()) {
    return respond(response, 400, { error: 'กรุณาระบุหัวข้อข่าวสาร' })
  }

  const article = await createNewsArticle(settings, {
    ...body,
    author: reviewerName(request.headers['x-admin-name']) || body.author || 'แอดมินโครงการ มฟล.'
  })
  return respond(response, 201, { ok: true, article })
})

export const updateAdminNewsHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id || request.body?.id
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าวที่ต้องการแก้ไข' })

  const existing = await getNewsById(settings, id)
  if (!existing) return respond(response, 404, { error: 'ไม่พบข่าวสารที่ต้องการแก้ไข' })

  const updated = await updateNewsArticle(settings, id, request.body || {})
  return respond(response, 200, { ok: true, article: updated })
})

export const deleteAdminNewsHandler = adminEndpoint('DELETE', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าวที่ต้องการลบ' })

  const success = await deleteNewsArticle(settings, id)
  if (!success) return respond(response, 404, { error: 'ไม่พบข่าวสารที่ต้องการลบ' })
  return respond(response, 200, { ok: true, id })
})

export const toggleAdminPinHandler = adminEndpoint('POST', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id || request.body?.id
  const isPinned = Boolean(request.body?.is_pinned ?? request.body?.isPinned)
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าว' })

  const updated = await toggleNewsPin(settings, id, isPinned)
  if (!updated) return respond(response, 404, { error: 'ไม่พบข่าวสาร' })
  return respond(response, 200, { ok: true, article: updated })
})

export const uploadAdminNewsPhotoHandler = adminEndpoint('POST', async (request, response, settings) => {
  let buffer = null
  let contentType = String(request.headers['content-type'] || '').split(';')[0].toLowerCase()
  let originalName = request.query?.filename || request.query?.name || 'news-photo.jpg'

  if (request.body && typeof request.body === 'object' && (request.body.dataUrl || request.body.base64)) {
    const dataUrl = request.body.dataUrl || request.body.base64
    const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (matches) {
      contentType = matches[1]
      buffer = Buffer.from(matches[2], 'base64')
    } else {
      buffer = Buffer.from(dataUrl, 'base64')
    }
    if (request.body.filename) originalName = request.body.filename
  } else if (Buffer.isBuffer(request.body)) {
    buffer = request.body
  } else {
    buffer = await readBody(request)
  }

  if (!buffer || buffer.length === 0) {
    return respond(response, 400, { error: 'ไม่พบข้อมูลไฟล์ภาพ' })
  }
  if (buffer.length > maxNewsPhotoBytes) {
    return respond(response, 413, { error: 'ไฟล์ภาพมีขนาดใหญ่เกิน 10 MB' })
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimes.includes(contentType)) {
    const ext = originalName.split('.').pop()?.toLowerCase()
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'webp') contentType = 'image/webp'
    else if (ext === 'gif') contentType = 'image/gif'
    else contentType = 'image/jpeg'
  }

  const saved = await saveNewsPhoto(settings, originalName, buffer, contentType)
  return respond(response, 201, { ok: true, ...saved })
})
