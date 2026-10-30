import { randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'

const clientKey = Symbol.for('kok.mongo.client')
const indexedKey = Symbol.for('kok.mongo.indexed')

const surveyFields = { _id: 0, id: 1, sample_code: 1, arsenic_level_ppb: 1, latitude: 1, longitude: 1, gps_accuracy_meters: 1, created_at: 1 }
const publishedSampleFields = {
  _id: 0, sample_code: 1, station_name: 1, latitude: 1, longitude: 1, collection_time: 1, gps_accuracy_meters: 1,
  arsenic_ppb: 1, measurements: 1, sample_nature: 1, publication_status: 1, created_at: 1, private_photo_paths: 1,
}
const adminSampleFields = { ...publishedSampleFields, reviewed_at: 1, reviewed_by: 1, review_reason: 1 }

// Serverless instances reuse one connection pool; a failed connect is dropped so the next call retries.
export async function getDb(settings) {
  const holder = globalThis
  if (!holder[clientKey] || holder[clientKey].uri !== settings.mongoUri) {
    const client = new MongoClient(settings.mongoUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
    holder[clientKey] = { uri: settings.mongoUri, ready: client.connect().catch((error) => { holder[clientKey] = null; throw error }) }
    holder[indexedKey] = false
  }
  const client = await holder[clientKey].ready
  const db = client.db(settings.dbName)
  if (!holder[indexedKey]) {
    await Promise.allSettled([
      db.collection('water_quality_surveys').createIndexes([{ key: { id: 1 }, unique: true }, { key: { created_at: -1 } }]),
      db.collection('kok_water_samples').createIndexes([{ key: { sample_code: 1 }, unique: true }, { key: { collection_time: -1 } }]),
      db.collection('kok_sample_contacts').createIndex({ sample_code: 1 }, { unique: true }),
      db.collection('kok_admin_alerts').createIndexes([{ key: { sample_code: 1 } }, { key: { created_at: -1 } }]),
      db.collection('survey_rate_limits').createIndex({ ip_hash: 1 }, { unique: true }),
      db.collection('survey_daily_sequences').createIndex({ sequence_date: 1 }, { unique: true }),
    ]).then((results) => results.forEach((result) => result.status === 'rejected' && console.error('MONGO INDEX ERROR:', result.reason?.message)))
    holder[indexedKey] = true
  }
  return db
}

// Rows leave this layer in the same shape the REST API used: no _id, ISO strings for dates.
function plain(doc) {
  if (!doc) return doc
  const { _id: _ignored, ...rest } = doc
  for (const [key, value] of Object.entries(rest)) if (value instanceof Date) rest[key] = value.toISOString()
  return rest
}

function toDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const isDuplicateKey = (error) => error?.code === 11000

export async function reserveSurvey(settings, ipHash) {
  const db = await getDb(settings)
  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000)
  const limits = db.collection('survey_rate_limits')

  const bump = async () => {
    const reset = await limits.findOneAndUpdate(
      { ip_hash: ipHash, window_started_at: { $lt: windowStart } },
      { $set: { window_started_at: windowStart, submission_count: 1 } },
      { returnDocument: 'after' },
    )
    if (reset) return reset
    return limits.findOneAndUpdate(
      { ip_hash: ipHash },
      { $inc: { submission_count: 1 }, $setOnInsert: { window_started_at: windowStart } },
      { upsert: true, returnDocument: 'after' },
    )
  }
  let limit
  try { limit = await bump() } catch (error) {
    if (!isDuplicateKey(error)) throw error
    limit = await bump()
  }
  if (limit.submission_count > 5) {
    return { allowed: false, retry_after_seconds: Math.max(1, Math.floor(3600 - (now.getTime() - windowStart.getTime()) / 1000)) }
  }

  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now)
  const sequence = await db.collection('survey_daily_sequences').findOneAndUpdate(
    { sequence_date: day },
    { $inc: { last_value: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  if (sequence.last_value > 9999) return { allowed: false, retry_after_seconds: 86400 }
  return {
    allowed: true,
    retry_after_seconds: 0,
    survey_id: randomUUID(),
    sample_code: `KOK-${day.replaceAll('-', '')}-${String(sequence.last_value).padStart(4, '0')}`,
  }
}

export async function findSurveyById(settings, id) {
  const db = await getDb(settings)
  return plain(await db.collection('water_quality_surveys').findOne({ id }, { projection: surveyFields }))
}

export async function insertSurvey(settings, values) {
  const db = await getDb(settings)
  const doc = { ...values, created_at: new Date() }
  try {
    await db.collection('water_quality_surveys').insertOne(doc)
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    return findSurveyById(settings, values.id)
  }
  return plain({ id: doc.id, sample_code: doc.sample_code, arsenic_level_ppb: doc.arsenic_level_ppb, latitude: doc.latitude, longitude: doc.longitude, gps_accuracy_meters: doc.gps_accuracy_meters, created_at: doc.created_at })
}

export async function saveSample(settings, sample) {
  const db = await getDb(settings)
  const { sample_code: code, ...fields } = sample
  await db.collection('kok_water_samples').updateOne(
    { sample_code: code },
    { $set: { ...fields, collection_time: toDate(fields.collection_time) }, $setOnInsert: { sample_code: code, created_at: new Date() } },
    { upsert: true },
  )
}

export async function saveContact(settings, contact) {
  const db = await getDb(settings)
  await db.collection('kok_sample_contacts').updateOne({ sample_code: contact.sample_code }, { $set: contact }, { upsert: true })
}

export async function saveAlert(settings, alert) {
  const db = await getDb(settings)
  await db.collection('kok_admin_alerts').insertOne({ ...alert, created_at: new Date() })
}

export async function listPublishedSamples(settings) {
  const db = await getDb(settings)
  const rows = await db.collection('kok_water_samples')
    .find({ publication_status: { $in: ['auto_published', 'approved'] } }, { projection: publishedSampleFields })
    .sort({ collection_time: -1 }).limit(1000).toArray()
  return rows.map(plain)
}

export async function listSurveys(settings) {
  const db = await getDb(settings)
  const rows = await db.collection('water_quality_surveys').find({}, { projection: surveyFields }).sort({ created_at: -1 }).limit(1000).toArray()
  return rows.map(plain)
}

export async function findSamplePhotoInfo(settings, code) {
  const db = await getDb(settings)
  return plain(await db.collection('kok_water_samples').findOne(
    { sample_code: code },
    { projection: { _id: 0, arsenic_ppb: 1, measurements: 1, publication_status: 1, private_photo_paths: 1 } },
  ))
}

export async function buildAdminQueue(settings) {
  const db = await getDb(settings)
  const rows = (await db.collection('kok_water_samples').find({}, { projection: adminSampleFields }).sort({ collection_time: -1 }).limit(500).toArray()).map(plain)
  const contacts = await db.collection('kok_sample_contacts')
    .find({ sample_code: { $in: rows.map((row) => row.sample_code) } }, { projection: { _id: 0, sample_code: 1, name: 1, phone: 1 } }).toArray()
  const contactMap = new Map(contacts.map((contact) => [contact.sample_code, contact]))
  const samples = rows.map((row) => ({ ...row, contact_name: contactMap.get(row.sample_code)?.name || null, contact_phone: contactMap.get(row.sample_code)?.phone || null }))
  const alerts = (await db.collection('kok_admin_alerts').find({}).sort({ created_at: -1 }).limit(100).toArray()).map(plain)

  const withStatus = (status) => samples.filter((row) => row.publication_status === status)
  const pending = withStatus('pending_review')
  return {
    samples,
    pending,
    counts: { total: samples.length, pending: pending.length, approved: withStatus('approved').length, autoPublished: withStatus('auto_published').length, rejected: withStatus('rejected').length },
    alerts,
  }
}

export async function reviewSample(settings, sampleCode, decision, reason, reviewer = null) {
  const db = await getDb(settings)
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const update = {
    publication_status: status,
    reviewed_at: new Date(),
    reviewed_by: reviewer,
    review_reason: (typeof reason === 'string' && reason.trim().slice(0, 500)) || (decision === 'approve' ? 'อนุมัติการเผยแพร่โดยแอดมิน' : 'ไม่อนุมัติโดยแอดมิน'),
  }
  if (decision === 'approve') update.approved_revision = 1
  const result = await db.collection('kok_water_samples').updateOne({ sample_code: sampleCode }, { $set: update })
  if (result.matchedCount === 0) return null
  await db.collection('kok_admin_alerts').updateMany({ sample_code: sampleCode }, { $set: { publication_status: status } }).catch(() => {})
  return status
}
