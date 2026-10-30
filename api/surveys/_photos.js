import { createHmac, timingSafeEqual } from 'node:crypto'
import { GridFSBucket } from 'mongodb'
import { getDb } from './_db.js'

export const maxPhotoBytes = 10 * 1024 * 1024

// รูปแบบ path ที่ระบบสร้าง: <survey-uuid>/<1|2>.<ext> (ฟอร์มปัจจุบัน) และ samples/<uuid>.<ext> (ข้อมูลที่ sync เดิม)
export const photoPathPattern = /^(?:[0-9a-f-]{36}\/[12]|samples\/[0-9a-f-]{36})\.(jpg|png|webp)$/i

const typeByExtension = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

// Photos live in MongoDB GridFS (bucket "survey_photos"), keyed by the same path the survey record stores.
const bucketFor = async (settings) => new GridFSBucket(await getDb(settings), { bucketName: 'survey_photos' })

const signature = (secret, path, expiresAt) => createHmac('sha256', secret).update(`photo:${path}:${expiresAt}`).digest('base64url')

// Short-lived token that lets the browser upload exactly one photo path.
export function createUploadTarget(settings, path) {
  const expiresAt = Date.now() + 10 * 60 * 1000
  const token = `${expiresAt}.${signature(settings.signingSecret, path, expiresAt)}`
  return { token, url: `/api/surveys/upload?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}` }
}

export function verifyUploadToken(secret, path, token) {
  const [expiresText, given = ''] = String(token).split('.')
  const expiresAt = Number(expiresText)
  if (!secret || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
  const expected = Buffer.from(signature(secret, path, expiresAt))
  const actual = Buffer.from(given)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Returns false when the path already holds a photo (uploads never overwrite).
export async function savePhoto(settings, path, buffer, contentType) {
  const bucket = await bucketFor(settings)
  if (await bucket.find({ filename: path }, { limit: 1 }).hasNext()) return false
  await new Promise((resolve, reject) => {
    bucket.openUploadStream(path, { contentType, metadata: { uploadedAt: new Date() } }).once('error', reject).once('finish', resolve).end(buffer)
  })
  return true
}

async function findPhoto(settings, path) {
  if (!photoPathPattern.test(path)) return null
  const bucket = await bucketFor(settings)
  const file = await bucket.find({ filename: path }, { limit: 1 }).next()
  return file ? { bucket, file } : null
}

const contentTypeOf = (file, path) => file.contentType || typeByExtension[path.split('.').pop().toLowerCase()] || ''

async function readBytes(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// Type, size and the first 12 bytes (enough for the JPEG/PNG/WebP signature check).
export async function inspectPhoto(settings, path) {
  const found = await findPhoto(settings, path)
  if (!found) return null
  const head = await readBytes(found.bucket.openDownloadStreamByName(path, { start: 0, end: 12 }))
  return { contentType: contentTypeOf(found.file, path), size: found.file.length, bytes: Uint8Array.from(head) }
}

export async function readPhoto(settings, path) {
  const found = await findPhoto(settings, path)
  if (!found) return null
  return { contentType: contentTypeOf(found.file, path), buffer: await readBytes(found.bucket.openDownloadStreamByName(path)) }
}
