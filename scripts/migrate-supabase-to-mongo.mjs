// One-off, re-runnable copy of the survey tables and photos from Supabase into MongoDB (photos go to GridFS).
// Usage: node scripts/migrate-supabase-to-mongo.mjs [--apply] [--to=atlas|local]   (default: dry run, Atlas)
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment, and MONGODB_URI via .env.local/.env.mongodb for Atlas.
// Existing Mongo documents and photos are never overwritten, so re-running is safe.
import dns from 'node:dns'
import { resolve } from 'node:path'
import { GridFSBucket, MongoClient } from 'mongodb'
import { loadServerEnv } from '../api/express-app.js'

const apply = process.argv.includes('--apply')
const local = process.argv.includes('--to=local')
const root = resolve(import.meta.dirname, '..')
loadServerEnv(root)
if (process.env.MIGRATE_PUBLIC_DNS === '1') dns.setServers(['8.8.8.8', '1.1.1.1'])

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const mongoUri = local ? (process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017') : process.env.MONGODB_URI
const dbName = local ? (process.env.MONGODB_DB_LOCAL || 'kok_water_watch_dev') : (process.env.MONGODB_DB || 'kok_water_watch')
if (!supabaseUrl || !supabaseKey || !mongoUri) throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and MONGODB_URI')

const tables = [
  { name: 'water_quality_surveys', key: 'id', dates: ['created_at'] },
  { name: 'kok_water_samples', key: 'sample_code', dates: ['created_at', 'collection_time', 'reviewed_at'] },
  { name: 'kok_sample_contacts', key: 'sample_code', dates: ['created_at'] },
  { name: 'kok_admin_alerts', key: null, dates: ['created_at'] },
]

async function fetchAll(table) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}`, range: `${from}-${from + 999}` },
    })
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`)
    const page = await response.json()
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

const client = await new MongoClient(mongoUri, { serverSelectionTimeoutMS: 15000 }).connect()
const db = client.db(dbName)
console.log(`target: ${local ? 'local' : 'atlas'} / ${dbName}`)
const photoPaths = new Set()

for (const { name, key, dates } of tables) {
  const rows = await fetchAll(name)
  let inserted = 0
  for (const row of rows) {
    const doc = { ...row }
    for (const field of dates) if (doc[field]) doc[field] = new Date(doc[field])
    for (const path of [doc.photo_1_path, doc.photo_2_path, ...(doc.private_photo_paths ?? [])]) if (path) photoPaths.add(path)
    if (!apply) continue
    const filter = key ? { [key]: doc[key] } : { sample_code: doc.sample_code, created_at: doc.created_at }
    const result = await db.collection(name).updateOne(filter, { $setOnInsert: doc }, { upsert: true })
    inserted += result.upsertedCount
  }
  console.log(`${name}: ${rows.length} rows in Supabase${apply ? `, ${inserted} added to MongoDB` : ''}`)
}

const bucket = new GridFSBucket(db, { bucketName: 'survey_photos' })
let copied = 0
let existing = 0
let missing = 0
for (const path of photoPaths) {
  if (await bucket.find({ filename: path }, { limit: 1 }).hasNext()) { existing += 1; continue }
  if (!apply) continue
  const response = await fetch(`${supabaseUrl}/storage/v1/object/survey-photos/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
  })
  if (!response.ok) { missing += 1; console.log(`  missing in Supabase: ${path} (HTTP ${response.status})`); continue }
  const contentType = (response.headers.get('content-type') || '').split(';')[0]
  const buffer = Buffer.from(await response.arrayBuffer())
  await new Promise((done, fail) => bucket.openUploadStream(path, { contentType, metadata: { uploadedAt: new Date(), migratedFrom: 'supabase' } }).once('error', fail).once('finish', done).end(buffer))
  copied += 1
}
console.log(`photos: ${photoPaths.size} referenced${apply ? `, ${copied} copied, ${existing} already in MongoDB, ${missing} missing in Supabase` : `, ${existing} already in MongoDB`}`)
console.log(apply ? 'applied' : 'dry run only; add --apply to write')
await client.close()
