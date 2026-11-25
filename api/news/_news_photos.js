import { GridFSBucket } from 'mongodb'
import { getDb } from '../surveys/_db.js'
import { config } from '../surveys/_shared.js'
import { recordUploadedFile, writePublicUpload } from '../_public_uploads.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const maxNewsPhotoBytes = 10 * 1024 * 1024 // 10 MB

const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']

const typeByExtension = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
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
}

export async function getNewsBucket(settings) {
  const resolved = settings?.mongoUri ? settings : config(false)
  const db = await getDb(resolved)
  return new GridFSBucket(db, { bucketName: 'news_photos' })
}

export function sanitizeFilename(name = '', kind = 'image') {
  const parts = String(name || '').split('.')
  const defaultExt = kind === 'file' ? 'pdf' : 'jpg'
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : defaultExt
  const base = parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || (kind === 'file' ? 'file' : 'photo')
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const allowedExts = kind === 'file' ? Object.keys(typeByExtension) : imageExtensions
  const safeExt = allowedExts.includes(ext) ? ext : defaultExt
  const prefix = kind === 'file' ? 'news-file' : 'news'
  return `${prefix}-${Date.now()}-${randomSuffix}-${base}.${safeExt}`
}

export async function saveNewsPhoto(settings, rawFilename, buffer, contentType, options = {}) {
  const resolved = settings?.mongoUri ? settings : config(false)
  const db = await getDb(resolved)
  const bucket = new GridFSBucket(db, { bucketName: 'news_photos' })
  const kind = options?.kind === 'file' ? 'file' : 'image'
  const filename = sanitizeFilename(rawFilename, kind)
  const ext = filename.split('.').pop().toLowerCase()
  const mime = contentType || typeByExtension[ext] || (kind === 'file' ? 'application/octet-stream' : 'image/jpeg')
  const subDir = kind === 'file' ? 'news/files' : 'news/images'
  const apiUrl = `/api/news/photo/${encodeURIComponent(filename)}`
  const uploadedAt = new Date()

  const { publicUrl, diskPath } = writePublicUpload(subDir, filename, buffer, options?.rootDir)

  await new Promise((resolvePromise, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mime,
      metadata: {
        contentType: mime,
        originalName: rawFilename,
        kind,
        publicUrl,
        diskPath,
        uploadedAt,
      },
    })
    uploadStream.once('error', reject)
    uploadStream.once('finish', resolvePromise)
    uploadStream.end(buffer)
  })

  await recordUploadedFile(db, {
    filename,
    originalName: rawFilename,
    category: kind === 'file' ? 'news_file' : 'news_image',
    contentType: mime,
    size: buffer.length,
    publicUrl,
    diskPath,
    apiUrl,
    gridFsBucket: 'news_photos',
    uploadedAt,
  })

  return {
    filename,
    url: apiUrl,
    publicUrl,
    diskPath,
    apiUrl,
    contentType: mime,
    size: buffer.length,
  }
}

export async function readNewsPhoto(settings, filename) {
  const bucket = await getNewsBucket(settings)
  const file = await bucket.find({ filename }, { limit: 1 }).next()
  if (!file) return null

  const stream = bucket.openDownloadStreamByName(filename)
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  return {
    contentType: file.contentType || file.metadata?.contentType || typeByExtension[filename.split('.').pop().toLowerCase()] || 'image/jpeg',
    buffer,
    length: file.length,
  }
}

export async function seedDefaultNewsPhotosToGridFs(settings, rootDir = process.cwd()) {
  try {
    const bucket = await getNewsBucket(settings)
    const count = await bucket.find({}, { limit: 1 }).toArray()
    if (count.length > 0) return // already seeded or has images

    const newsDir = resolve(rootDir, 'public/data/news')
    if (!existsSync(newsDir)) return

    const defaultImages = [
      'thaton-sentinel2-flood.png',
      'thaton-normal-sat.png',
      'thaton-sar-flood.png',
      'thaton-map-preview.png',
      'water-lab-training.png',
      'ruammit-field-survey.png',
      'arsenic-kit-guide.png',
    ]

    for (const imgName of defaultImages) {
      const filePath = resolve(newsDir, imgName)
      if (existsSync(filePath)) {
        const buf = readFileSync(filePath)
        const uploadStream = bucket.openUploadStream(imgName, {
          contentType: 'image/png',
          metadata: { isDefault: true, uploadedAt: new Date() },
        })
        await new Promise((res, rej) => {
          uploadStream.once('error', rej).once('finish', res).end(buf)
        })
      }
    }
  } catch (err) {
    console.warn('Default news photos seed warning:', err?.message)
  }
}
