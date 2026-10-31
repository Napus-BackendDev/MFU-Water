import { GridFSBucket } from 'mongodb'
import { getDb } from '../surveys/_db.js'
import { config } from '../surveys/_shared.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const maxNewsPhotoBytes = 10 * 1024 * 1024 // 10 MB

const typeByExtension = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export async function getNewsBucket(settings) {
  const resolved = settings?.mongoUri ? settings : config(false)
  const db = await getDb(resolved)
  return new GridFSBucket(db, { bucketName: 'news_photos' })
}

export function sanitizeFilename(name = '') {
  const parts = name.split('.')
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'jpg'
  const base = parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'photo'
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const safeExt = typeByExtension[ext] ? ext : 'jpg'
  return `news-${Date.now()}-${randomSuffix}-${base}.${safeExt}`
}

export async function saveNewsPhoto(settings, rawFilename, buffer, contentType) {
  const bucket = await getNewsBucket(settings)
  const filename = sanitizeFilename(rawFilename)
  const mime = contentType || typeByExtension[filename.split('.').pop().toLowerCase()] || 'image/jpeg'

  await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mime,
      metadata: {
        contentType: mime,
        originalName: rawFilename,
        uploadedAt: new Date(),
      },
    })
    uploadStream.once('error', reject)
    uploadStream.once('finish', resolve)
    uploadStream.end(buffer)
  })

  return {
    filename,
    url: `/api/news/photo/${encodeURIComponent(filename)}`,
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
