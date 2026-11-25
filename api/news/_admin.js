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
}, { page: 'news', level: 'view' })

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
}, { page: 'news', level: 'edit' })

export const updateAdminNewsHandler = adminEndpoint('PUT', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id || request.body?.id
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าวที่ต้องการแก้ไข' })

  const existing = await getNewsById(settings, id)
  if (!existing) return respond(response, 404, { error: 'ไม่พบข่าวสารที่ต้องการแก้ไข' })

  const updated = await updateNewsArticle(settings, id, request.body || {})
  return respond(response, 200, { ok: true, article: updated })
}, { page: 'news', level: 'edit' })

export const deleteAdminNewsHandler = adminEndpoint('DELETE', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าวที่ต้องการลบ' })

  const success = await deleteNewsArticle(settings, id)
  if (!success) return respond(response, 404, { error: 'ไม่พบข่าวสารที่ต้องการลบ' })
  return respond(response, 200, { ok: true, id })
}, { page: 'news', level: 'edit' })

export const toggleAdminPinHandler = adminEndpoint('POST', async (request, response, settings) => {
  const id = request.params?.id || request.query?.id || request.body?.id
  const isPinned = Boolean(request.body?.is_pinned ?? request.body?.isPinned)
  if (!id) return respond(response, 400, { error: 'กรุณาระบุรหัสข่าว' })

  const updated = await toggleNewsPin(settings, id, isPinned)
  if (!updated) return respond(response, 404, { error: 'ไม่พบข่าวสาร' })
  return respond(response, 200, { ok: true, article: updated })
}, { page: 'news', level: 'edit' })

export const uploadAdminNewsPhotoHandler = adminEndpoint('POST', async (request, response, settings) => {
  const kind = String(request.query?.kind || '').toLowerCase() === 'file' ? 'file' : 'image'
  let buffer = null
  let contentType = String(request.headers['content-type'] || '').split(';')[0].toLowerCase()
  let originalName = request.query?.filename || request.query?.name || (kind === 'file' ? 'document.pdf' : 'news-photo.jpg')

  if (request.body && typeof request.body === 'object' && (request.body.dataUrl || request.body.base64)) {
    const dataUrl = request.body.dataUrl || request.body.base64
    const matches = dataUrl.match(/^data:([A-Za-z0-9.+/-]+);base64,(.+)$/)
    if (matches) {
      contentType = matches[1].toLowerCase()
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
    return respond(response, 400, { error: kind === 'file' ? 'ไม่พบข้อมูลไฟล์แนบ' : 'ไม่พบข้อมูลไฟล์ภาพ' })
  }
  if (buffer.length > maxNewsPhotoBytes) {
    return respond(response, 413, { error: kind === 'file' ? 'ไฟล์แนบมีขนาดใหญ่เกิน 10 MB' : 'ไฟล์ภาพมีขนาดใหญ่เกิน 10 MB' })
  }

  const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const fileMimeByExt = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    txt: 'text/plain',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  const allowedFileMimes = new Set([...Object.values(fileMimeByExt), 'application/x-zip-compressed'])

  if (kind === 'file') {
    if (!allowedFileMimes.has(contentType)) {
      const ext = String(originalName).split('.').pop()?.toLowerCase() || ''
      contentType = fileMimeByExt[ext] || 'application/octet-stream'
    }
  } else if (!imageMimes.includes(contentType)) {
    const ext = String(originalName).split('.').pop()?.toLowerCase() || ''
    if (ext === 'png') contentType = 'image/png'
    else if (ext === 'webp') contentType = 'image/webp'
    else if (ext === 'gif') contentType = 'image/gif'
    else contentType = 'image/jpeg'
  }

  const saved = await saveNewsPhoto(settings, originalName, buffer, contentType, { kind })
  return respond(response, 201, { ok: true, ...saved })
}, { page: 'news', level: 'edit' })
