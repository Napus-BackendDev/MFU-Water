import { arsenicLevel } from '../../src/lib/arsenic.js'
import { getDb } from '../surveys/_db.js'

const COLLECTION = 'kok_admin_reporters'


function plain(doc) {
  if (!doc) return doc
  const { _id: _ignored, ...rest } = doc
  for (const [key, value] of Object.entries(rest)) {
    if (value instanceof Date) rest[key] = value.toISOString()
  }
  return rest
}

// The directory is built from people who actually submitted a result; nothing is seeded.
// Admin edits are kept: only the counted figures are refreshed, and follow-up is escalated,
// never silently cleared.
async function syncReportersFromSubmissions(db, collection) {
  const contacts = await db.collection('kok_sample_contacts').find({}).toArray()
  if (!contacts.length) return

  const codes = contacts.map((contact) => contact.sample_code).filter(Boolean)
  const samples = await db.collection('kok_water_samples').find({ sample_code: { $in: codes } }).toArray()
  const sampleByCode = new Map(samples.map((sample) => [sample.sample_code, sample]))

  /** @type {Map<string, { name: string; phone: string; count: number; latest: Date | null; lastPpb: number; station: string; community: string }>} */
  const people = new Map()
  for (const contact of contacts) {
    const phone = String(contact.phone ?? '').trim()
    const name = String(contact.name ?? '').trim()
    if (!phone && !name) continue
    const key = phone || name
    const sample = sampleByCode.get(contact.sample_code)
    const when = sample?.collection_time ? new Date(sample.collection_time) : null
    const entry = people.get(key) ?? { name: name || 'ไม่ระบุชื่อ', phone, count: 0, latest: null, lastPpb: 0, station: '', community: 'thaton' }
    entry.count += 1
    if (name) entry.name = name
    if (when && (!entry.latest || when > entry.latest)) {
      entry.latest = when
      entry.lastPpb = Number(sample?.arsenic_ppb) || 0
      entry.station = sample?.station_name || entry.station
    }
    people.set(key, entry)
  }

  for (const [key, entry] of people) {
    const existing = await collection.findOne({ $or: [...(entry.phone ? [{ phone: entry.phone }] : []), { name: entry.name }] })
    const now = new Date().toISOString()
    const stats = {
      totalSamples: entry.count,
      lastSampleDate: entry.latest ? entry.latest.toISOString() : now,
      lastPpb: entry.lastPpb,
      updated_at: now,
    }
    const overLimit = arsenicLevel(entry.lastPpb) === 'over'
    if (existing) {
      const updates = { ...stats, updated_by: 'ระบบนับจากผลตรวจที่ส่งเข้ามา' }
      if (overLimit && existing.followUpStatus === 'routine') updates.followUpStatus = 'pending_followup'
      await collection.updateOne({ id: existing.id }, { $set: updates })
      continue
    }
    const count = await collection.countDocuments()
    await collection.insertOne({
      id: `REP-${String(count + 1).padStart(3, '0')}`,
      name: entry.name,
      role: 'ผู้ส่งผลตรวจสารหนูภาคสนาม',
      phone: entry.phone,
      communityId: entry.community,
      hamlet: entry.station || 'ไม่ระบุหมู่บ้าน',
      ...stats,
      followUpStatus: overLimit ? 'pending_followup' : 'routine',
      notes: `ระบบนับจากผลตรวจที่ส่งเข้ามา ${entry.count} รายการ (รหัสผู้ส่ง ${key})`,
      source: 'system_detected',
      created_at: now,
      updated_by: 'ระบบนับจากผลตรวจที่ส่งเข้ามา',
    })
  }
}

export async function listReporters(settings, { communityId = 'all', search = '', status = 'all' } = {}) {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  try {
    await syncReportersFromSubmissions(db, collection)
  } catch (error) {
    console.error('Reporters sync error:', error.message)
  }

  const query = {}
  if (communityId && communityId !== 'all') {
    query.communityId = communityId
  }
  if (status && status !== 'all') {
    query.followUpStatus = status
  }
  if (search) {
    const s = String(search).trim()
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { hamlet: { $regex: s, $options: 'i' } },
      { notes: { $regex: s, $options: 'i' } },
    ]
  }

  const docs = await collection.find(query).sort({ totalSamples: -1, updated_at: -1 }).toArray()
  return docs.map(plain)
}

export async function createReporter(settings, payload, author = 'แอดมิน') {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  const count = await collection.countDocuments()
  const id = `REP-${String(count + 1).padStart(3, '0')}`
  const now = new Date().toISOString()

  const doc = {
    id,
    name: String(payload.name || '').trim(),
    role: String(payload.role || 'อาสาสมัครชุมชน').trim(),
    phone: String(payload.phone || '').trim(),
    communityId: payload.communityId || 'thaton',
    hamlet: String(payload.hamlet || '').trim(),
    totalSamples: Number(payload.totalSamples) || 0,
    lastSampleDate: payload.lastSampleDate || now,
    lastPpb: Number(payload.lastPpb) || 0,
    followUpStatus: payload.followUpStatus || 'routine',
    notes: String(payload.notes || '').trim(),
    source: 'manual',
    created_at: now,
    updated_at: now,
    updated_by: author,
  }

  await collection.insertOne(doc)
  return plain(doc)
}

export async function updateReporter(settings, id, patch, author = 'แอดมิน') {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  const now = new Date().toISOString()

  const allowed = ['name', 'role', 'phone', 'communityId', 'hamlet', 'followUpStatus', 'notes', 'totalSamples', 'lastPpb', 'lastSampleDate']
  const updates = {}
  for (const key of allowed) {
    if (patch[key] !== undefined) updates[key] = patch[key]
  }
  updates.updated_at = now
  updates.updated_by = author

  const res = await collection.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return plain(res)
}

export async function deleteReporter(settings, id) {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  const res = await collection.deleteOne({ id })
  return res.deletedCount > 0
}
