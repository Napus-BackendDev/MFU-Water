import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'

function safePosixJoin(...parts) {
  const cleaned = parts
    .flatMap((part) => String(part || '').replace(/\\/g, '/').split('/'))
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== '.' && seg !== '..')
  return cleaned.join('/')
}

export function buildPublicUploadPaths(subDir, relativeFilename, rootDir = process.cwd()) {
  const relPosixPath = safePosixJoin(subDir, relativeFilename)
  if (!relPosixPath) throw new Error('Invalid upload target path')
  const normalizedPosix = posix.normalize(relPosixPath)
  const diskPath = `public/uploads/${normalizedPosix}`
  const publicUrl = `/uploads/${normalizedPosix}`
  const uploadsRoot = resolve(rootDir, 'public', 'uploads')
  const fullPath = resolve(uploadsRoot, ...normalizedPosix.split('/'))
  if (!fullPath.startsWith(uploadsRoot)) {
    throw new Error('Unsafe upload target path')
  }
  return { publicUrl, diskPath, fullPath }
}

export function writePublicUpload(subDir, relativeFilename, buffer, rootDir = process.cwd()) {
  const { publicUrl, diskPath, fullPath } = buildPublicUploadPaths(subDir, relativeFilename, rootDir)
  try {
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, buffer)
    return { publicUrl, diskPath, writtenToDisk: true }
  } catch (err) {
    console.warn('Public upload disk write skipped:', err?.message || err)
    return { publicUrl, diskPath, writtenToDisk: false }
  }
}

export function removePublicUpload(subDir, relativeFilename, rootDir = process.cwd()) {
  try {
    const { fullPath } = buildPublicUploadPaths(subDir, relativeFilename, rootDir)
    if (existsSync(fullPath)) {
      unlinkSync(fullPath)
      return true
    }
    return false
  } catch (err) {
    console.warn('Public upload disk delete warning:', err?.message || err)
    return false
  }
}

export async function recordUploadedFile(db, record) {
  if (!db || typeof db.collection !== 'function' || !record?.publicUrl) return null
  const doc = {
    filename: record.filename,
    originalName: record.originalName || record.filename,
    category: record.category || 'upload',
    contentType: record.contentType || 'application/octet-stream',
    size: Number(record.size) || 0,
    publicUrl: record.publicUrl,
    diskPath: record.diskPath,
    apiUrl: record.apiUrl || record.publicUrl,
    gridFsBucket: record.gridFsBucket || null,
    uploadedAt: record.uploadedAt instanceof Date ? record.uploadedAt : new Date(),
  }
  await db.collection('uploaded_files').updateOne(
    { publicUrl: doc.publicUrl },
    { $set: doc },
    { upsert: true },
  )
  return doc
}

export async function deleteUploadedFileRecord(db, publicUrl) {
  if (!db || typeof db.collection !== 'function' || !publicUrl) return
  await db.collection('uploaded_files').deleteOne({ publicUrl })
}
