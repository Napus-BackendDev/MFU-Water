import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { supabaseRequest } from '../../../utils/admin-helper'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const photoPath = String(query.path || '')

  if (!photoPath) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาระบุ path ของรูปถ่าย' })
  }

  const encodedPath = photoPath.split('/').map(encodeURIComponent).join('/')
  const rPhoto = await supabaseRequest(`/storage/v1/object/survey-photos/${encodedPath}`)

  if (!rPhoto.ok) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบไฟล์ภาพถ่าย' })
  }

  const contentType = rPhoto.headers.get('content-type') || 'image/png'
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'private, max-age=3600')

  const arrayBuffer = await rPhoto.arrayBuffer()
  return Buffer.from(arrayBuffer)
})
