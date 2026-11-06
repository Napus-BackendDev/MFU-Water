import { existsSync, readFileSync } from 'node:fs'
import { getDb } from '../surveys/_db.js'
import {
  buildCommunityReview,
  classifyHousehold,
  evacuationDestinations,
  householdIdOf,
  hamletCounts,
  levelGroups,
  metaFromReview,
  publicHamletSummary,
  publicPlaces,
  seedFromReview,
  COMMUNITY_LAYERS,
  changedKeys,
} from '../../src/lib/map-data.js'

const C = {
  households: 'kok_map_households',
  hamlets: 'kok_map_hamlets',
  places: 'kok_map_places',
  settings: 'kok_map_settings',
  profiles: 'kok_map_profiles',
  audit: 'kok_map_audit',
}

const readSeed = (url) => (existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : null)
// ไฟล์ตั้งต้นอ่านครั้งเดียวตอนฐานข้อมูลยังว่าง (อาจถูกย้ายไป data/private เมื่อปิดข้อมูลรายบ้านจากสาธารณะ)
const loadCommunitySeed = () => readSeed(new URL('../../data/private/thaton.json', import.meta.url)) ?? readSeed(new URL('../../public/mymaps/thaton.json', import.meta.url))
const loadRouteSeed = () => readSeed(new URL('../../public/evacuation/thaton.json', import.meta.url))
const loadPlaceSeed = () => readSeed(new URL('../../data/private/public-evacuation-reference.json', import.meta.url)) ?? readSeed(new URL('../../data/public-evacuation-reference.json', import.meta.url))

// ที่มาของข้อมูลตั้งต้น (เทสต์สลับเป็นค่าว่างเพื่อจำลองว่าไฟล์ไม่ถูกรวมเข้าฟังก์ชัน)
const loadLandmarkSeed = () => readSeed(new URL('../../data/thaton-landmarks.json', import.meta.url))
export const seedSources = { community: loadCommunitySeed, route: loadRouteSeed, place: loadPlaceSeed, landmark: loadLandmarkSeed }

export function plain(doc) {
  if (!doc) return null
  const { _id: _ignored, ...rest } = doc
  for (const [key, value] of Object.entries(rest)) if (value instanceof Date) rest[key] = value.toISOString()
  return rest
}

const upsertAll = (collection, docs, now) => docs.length
  ? collection.bulkWrite(docs.map((doc) => ({ updateOne: { filter: { id: doc.id }, update: { $setOnInsert: { ...doc, created_at: now, updated_at: now, updated_by: 'ระบบ (นำเข้าครั้งแรก)' } }, upsert: true } })), { ordered: false })
  : null

// ตั้งต้นข้อมูลจากไฟล์เดิมครั้งเดียวต่อประเภท แล้วจดไว้ว่าทำแล้ว (ไม่ตั้งซ้ำแม้แอดมินลบทิ้งหมด และไม่ทับสิ่งที่แอดมินแก้)
async function seedOnce(db) {
  const settings = db.collection(C.settings)
  const marker = (await settings.findOne({ _id: 'seed' })) ?? {}
  const done = { ...marker.done }
  const now = new Date()

  if (!done.community) {
    const review = seedSources.community()
    if (review) {
      const { hamlets, households } = seedFromReview(review)
      await upsertAll(db.collection(C.hamlets), hamlets, now)
      await upsertAll(db.collection(C.households), households, now)
      await settings.updateOne({ _id: 'community' }, { $setOnInsert: { ...metaFromReview(review), hiddenLayers: [], pointsPublic: true } }, { upsert: true })
      done.community = now.toISOString()
    }
  }
  // Evacuation points from the PDF, then the landmarks from My Maps; each list is added once and later admin edits are kept.
  for (const [key, load, section] of [
    ['places', seedSources.place, (ref) => `${ref.source ?? 'แผนอพยพ'} หน้า ${ref.page ?? 1}`],
    ['landmarks', seedSources.landmark, (ref) => ref.source],
  ]) {
    if (done[key]) continue
    const reference = load()
    if (!reference?.points?.length) continue
    const places = reference.points.map((point) => ({
      id: point.id,
      community_id: reference.communityId ?? 'thaton',
      kind: point.kind,
      name: point.label,
      source_section: section(reference),
      latitude: point.latitude,
      longitude: point.longitude,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: null,
      capacity_available: null,
      last_checked: null,
      note: point.note ?? '',
      status: 'published',
    }))
    await upsertAll(db.collection(C.places), places, now)
    done[key] = now.toISOString()
  }
  if (!done.routes) {
    const evacuation = seedSources.route()
    if (evacuation?.routes?.length) {
      await settings.updateOne({ _id: 'route:thaton' }, { $setOnInsert: { routes: evacuation.routes, alignment: evacuation.routeAlignment ?? 'manual', source: evacuation.source ?? '', updated_at: now, updated_by: 'ระบบ (นำเข้าครั้งแรก)' } }, { upsert: true })
      done.routes = now.toISOString()
    }
  }
  if (JSON.stringify(done) !== JSON.stringify(marker.done ?? {})) await settings.updateOne({ _id: 'seed' }, { $set: { done } }, { upsert: true })
  return done
}

const ready = new Map()
export const resetMapDataCache = () => ready.clear()

async function prepare(settings) {
  const db = await getDb(settings)
  await Promise.allSettled([
    db.collection(C.households).createIndexes([{ key: { id: 1 }, unique: true }, { key: { seq: 1 }, unique: true }, { key: { hamlet_id: 1 } }]),
    db.collection(C.hamlets).createIndexes([{ key: { id: 1 }, unique: true }]),
    db.collection(C.places).createIndexes([{ key: { id: 1 }, unique: true }, { key: { status: 1, kind: 1 } }]),
    db.collection(C.profiles).createIndex({ community_id: 1 }, { unique: true }),
    db.collection(C.audit).createIndex({ at: -1 }),
  ]).then((results) => results.forEach((result) => result.status === 'rejected' && console.error('MAPDATA INDEX ERROR:', result.reason?.message)))
  await seedOnce(db)
  return db
}

// ฐานข้อมูลที่ตั้งดัชนีและข้อมูลตั้งต้นแล้ว (ทำครั้งเดียวต่อ process; ล้มเหลวแล้วลองใหม่รอบหน้า)
export function getMapDb(settings) {
  const key = `${settings.mongoUri}|${settings.dbName}`
  if (!ready.has(key)) ready.set(key, prepare(settings).catch((error) => { ready.delete(key); throw error }))
  return ready.get(key)
}

async function audit(db, entry) {
  try {
    await db.collection(C.audit).insertOne({ ...entry, at: new Date() })
  } catch (error) {
    console.error('MAPDATA AUDIT ERROR:', error?.message)
  }
}

const nextNumber = async (collection, prefix, width) => {
  const [latest] = await collection.find({ id: { $regex: `^${prefix}-\\d+$` } }, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).toArray()
  return `${prefix}-${String((latest ? Number(latest.id.split('-')[1]) : 0) + 1).padStart(width, '0')}`
}

// ---------- ข้อมูลชุมชน (ครัวเรือน) ----------

const withLevels = (household) => ({ ...plain(household), levels: classifyHousehold(household.answers ?? {}) })

export async function listHouseholds(settings, { hamlet, layer = 'layer-1', level, q, published, page = 1, pageSize = 25, community } = {}) {
  const db = await getMapDb(settings)
  const all = (await db.collection(C.households).find({}).sort({ seq: 1 }).toArray()).map(withLevels)
  const text = String(q ?? '').trim().toLowerCase()
  const filtered = all.filter((household) => {
    if (community && community !== 'all' && (household.community_id ?? 'thaton') !== community) return false
    if (hamlet === 'none' ? household.hamlet_id : hamlet && household.hamlet_id !== hamlet) return false
    if (level && household.levels[layer]?.key !== String(level)) return false
    if (published === 'true' && household.published === false) return false
    if (published === 'false' && household.published !== false) return false
    return !text || household.id.toLowerCase().includes(text)
  })
  const size = Math.min(Math.max(Number(pageSize) || 25, 1), 200)
  const current = Math.max(Number(page) || 1, 1)
  return { items: filtered.slice((current - 1) * size, current * size), total: filtered.length, page: current, pageSize: size, counts: { all: all.length, hidden: all.filter((household) => household.published === false).length } }
}

export async function getHousehold(settings, id) {
  const db = await getMapDb(settings)
  const doc = await db.collection(C.households).findOne({ id })
  return doc ? withLevels(doc) : null
}

export async function createHousehold(settings, value, by) {
  const db = await getMapDb(settings)
  const collection = db.collection(C.households)
  const [latest] = await collection.find({}, { projection: { seq: 1 } }).sort({ seq: -1 }).limit(1).toArray()
  const seq = (latest?.seq ?? 0) + 1
  const now = new Date()
  const doc = { id: householdIdOf(seq), seq, community_id: 'thaton', ...value, created_at: now, updated_at: now, updated_by: by }
  await collection.insertOne(doc)
  await audit(db, { kind: 'households', id: doc.id, action: 'create', by, changed: Object.keys(value) })
  return withLevels(doc)
}

export async function updateHousehold(settings, id, value, by) {
  const db = await getMapDb(settings)
  const collection = db.collection(C.households)
  const current = await collection.findOne({ id })
  if (!current) return null
  const next = { ...value, answers: value.answers ? { ...current.answers, ...value.answers } : undefined }
  if (next.answers === undefined) delete next.answers
  const changed = changedKeys(current, next)
  await collection.updateOne({ id }, { $set: { ...next, updated_at: new Date(), updated_by: by } })
  await audit(db, { kind: 'households', id, action: 'update', by, changed: changed.flatMap((key) => (key === 'answers' ? changedKeys(current.answers, next.answers).map((field) => `answers.${field}`) : [key])) })
  return getHousehold(settings, id)
}

export async function setHouseholdPublished(settings, id, published, by) {
  return updateHousehold(settings, id, { published }, by)
}

export async function assignHamlet(settings, ids, hamletId, by) {
  const db = await getMapDb(settings)
  const result = await db.collection(C.households).updateMany({ id: { $in: ids } }, { $set: { hamlet_id: hamletId, updated_at: new Date(), updated_by: by } })
  await audit(db, { kind: 'households', id: ids.join(','), action: 'assign-hamlet', by, changed: [`hamlet_id=${hamletId ?? 'none'}`] })
  return result.matchedCount ?? ids.length
}

// ครัวเรือนที่ทีมอพยพกำลังใช้งานอยู่ในรอบที่เปิดอยู่ลบไม่ได้ (ให้ซ่อนจากหน้าบ้านแทน)
export async function deleteHousehold(settings, id, by) {
  const db = await getMapDb(settings)
  const current = await db.collection(C.households).findOne({ id })
  if (!current) return { status: 'missing' }
  const run = await db.collection('kok_evacuation_runs').findOne({ community_id: 'thaton', status: 'open' })
  if (run && (await db.collection('kok_evacuation_cases').findOne({ run_id: run.run_id, household_id: id }))) return { status: 'in-use' }
  await db.collection(C.households).deleteOne({ id })
  await audit(db, { kind: 'households', id, action: 'delete', by, changed: [] })
  return { status: 'deleted' }
}

// ---------- หย่อมบ้าน ----------

export async function listHamlets(settings) {
  const db = await getMapDb(settings)
  const hamlets = (await db.collection(C.hamlets).find({}).sort({ id: 1 }).toArray()).map(plain)
  const households = (await db.collection(C.households).find({}).toArray()).map(plain)
  const { counts, unassigned } = hamletCounts(households, hamlets)
  return { items: hamlets.map((hamlet) => ({ ...hamlet, household_count: counts.get(hamlet.id) ?? 0 })), unassigned }
}

export async function listHamletDocs(settings) {
  const db = await getMapDb(settings)
  return (await db.collection(C.hamlets).find({}).sort({ id: 1 }).toArray()).map(plain)
}

export async function allHouseholds(settings, community) {
  const db = await getMapDb(settings)
  const rows = (await db.collection(C.households).find({}).sort({ seq: 1 }).toArray()).map(plain)
  if (!community || community === 'all') return rows
  return rows.filter((r) => (r.community_id ?? 'thaton') === community)
}

export async function getHamlet(settings, id) {
  const db = await getMapDb(settings)
  return plain(await db.collection(C.hamlets).findOne({ id }))
}

export async function createHamlet(settings, value, by) {
  const db = await getMapDb(settings)
  const collection = db.collection(C.hamlets)
  const doc = { id: await nextNumber(collection, 'HM', 3), ...value, created_at: new Date(), updated_at: new Date(), updated_by: by }
  await collection.insertOne(doc)
  await audit(db, { kind: 'hamlets', id: doc.id, action: 'create', by, changed: Object.keys(value) })
  return plain(doc)
}

export async function updateHamlet(settings, id, value, by) {
  const db = await getMapDb(settings)
  const current = await db.collection(C.hamlets).findOne({ id })
  if (!current) return null
  await db.collection(C.hamlets).updateOne({ id }, { $set: { ...value, updated_at: new Date(), updated_by: by } })
  await audit(db, { kind: 'hamlets', id, action: 'update', by, changed: changedKeys(current, value) })
  return plain(await db.collection(C.hamlets).findOne({ id }))
}

export async function deleteHamlet(settings, id, by) {
  const db = await getMapDb(settings)
  if (!(await db.collection(C.hamlets).findOne({ id }))) return { status: 'missing' }
  const count = await db.collection(C.households).countDocuments({ hamlet_id: id })
  if (count > 0) return { status: 'in-use', count }
  await db.collection(C.hamlets).deleteOne({ id })
  await audit(db, { kind: 'hamlets', id, action: 'delete', by, changed: [] })
  return { status: 'deleted' }
}

// รวมหลายหย่อมเป็นหนึ่ง: ย้ายครัวเรือน เก็บชื่อเดิมไว้เป็นชื่อเรียกอื่น แล้วลบหย่อมที่ถูกรวม
export async function mergeHamlets(settings, fromIds, intoId, by) {
  const db = await getMapDb(settings)
  const hamlets = db.collection(C.hamlets)
  const target = await hamlets.findOne({ id: intoId })
  const sources = (await hamlets.find({ id: { $in: fromIds } }).toArray())
  if (!target || sources.length !== fromIds.length) return null
  const aliases = [...new Set([...(target.aliases ?? []), ...sources.flatMap((source) => [source.name, ...(source.aliases ?? [])])])].filter((name) => name !== target.name)
  const moved = await db.collection(C.households).updateMany({ hamlet_id: { $in: fromIds } }, { $set: { hamlet_id: intoId, updated_at: new Date(), updated_by: by } })
  await hamlets.updateOne({ id: intoId }, { $set: { aliases: aliases.slice(0, 10), updated_at: new Date(), updated_by: by } })
  await hamlets.deleteMany({ id: { $in: fromIds } })
  await audit(db, { kind: 'hamlets', id: intoId, action: 'merge', by, changed: fromIds })
  return { moved: moved.matchedCount ?? 0, into: plain(await hamlets.findOne({ id: intoId })) }
}

// ---------- สถานที่สำคัญ ----------

const standardCommunityPlaces = {
  pongkhong: [
    {
      id: 'PK-SHELTER-01',
      community_id: 'pongkhong',
      kind: 'shelter',
      name: 'ศาลาประชาคมบ้านปงของ',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปงของ (มฟล. SWG 5)',
      latitude: 20.3080,
      longitude: 100.2105,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 120,
      capacity_available: 120,
      last_checked: null,
      note: 'ศูนย์พักพิงหลักประจำชุมชน',
      status: 'published',
    },
    {
      id: 'PK-ASSEMBLY-01',
      community_id: 'pongkhong',
      kind: 'assembly',
      name: 'วัดปงของ',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปงของ (มฟล. SWG 5)',
      latitude: 20.3065,
      longitude: 100.2090,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 200,
      capacity_available: 200,
      last_checked: null,
      note: 'จุดรวมพลและพื้นที่ปลอดภัยน้ำหลาก',
      status: 'published',
    },
  ],
  ruammit: [
    {
      id: 'RM-SHELTER-01',
      community_id: 'ruammit',
      kind: 'shelter',
      name: 'ศาลาประชาคมบ้านรวมมิตร',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนกะเหรี่ยงรวมมิตร (มฟล. SWG 5)',
      latitude: 19.9605,
      longitude: 99.7082,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 150,
      capacity_available: 150,
      last_checked: null,
      note: 'ศูนย์ประสานงานและพักพิงประจำหมู่บ้าน',
      status: 'published',
    },
    {
      id: 'RM-ASSEMBLY-01',
      community_id: 'ruammit',
      kind: 'assembly',
      name: 'วัดรวมมิตร',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนกะเหรี่ยงรวมมิตร (มฟล. SWG 5)',
      latitude: 19.9580,
      longitude: 99.7060,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 250,
      capacity_available: 250,
      last_checked: null,
      note: 'จุดรวมพลฉุกเฉินและพื้นที่ดอนปลอดภัย',
      status: 'published',
    },
  ],
  pakingtai: [
    {
      id: 'PT-SHELTER-01',
      community_id: 'pakingtai',
      kind: 'shelter',
      name: 'ศาลาอเนกประสงค์บ้านปากอิงใต้',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปากอิงใต้ (มฟล. SWG 5)',
      latitude: 20.2585,
      longitude: 100.4155,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 100,
      capacity_available: 100,
      last_checked: null,
      note: 'ศูนย์พักพิงและจุดจ่ายน้ำสะอาด',
      status: 'published',
    },
    {
      id: 'PT-ASSEMBLY-01',
      community_id: 'pakingtai',
      kind: 'assembly',
      name: 'โรงเรียนบ้านปากอิง',
      source_section: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปากอิงใต้ (มฟล. SWG 5)',
      latitude: 20.2560,
      longitude: 100.4130,
      location_precision: 'approximate',
      operational_status: 'unchecked',
      capacity_planned: 180,
      capacity_available: 180,
      last_checked: null,
      note: 'จุดรวมพลหลักบนเนินสูง',
      status: 'published',
    },
  ],
}

export async function listPlaces(settings, { kind, status, q, community } = {}) {
  const db = await getMapDb(settings)
  const text = String(q ?? '').trim().toLowerCase()
  let dbPlaces = (await db.collection(C.places).find({}).sort({ id: 1 }).toArray()).map(plain)
  if (community && community !== 'thaton' && !dbPlaces.some((p) => p.community_id === community)) {
    const defaults = standardCommunityPlaces[community] || []
    dbPlaces = [...dbPlaces, ...defaults]
  }
  const items = dbPlaces.filter((place) => {
    if (kind && place.kind !== kind) return false
    if (status && place.status !== status) return false
    if (community && place.community_id !== community) return false
    return !text || place.name.toLowerCase().includes(text) || place.id.toLowerCase().includes(text)
  })
  return { items, counts: { all: items.length, published: items.filter((place) => place.status === 'published').length, waitingLocation: items.filter((place) => place.latitude === null).length } }
}


export async function getPlace(settings, id) {
  const db = await getMapDb(settings)
  return plain(await db.collection(C.places).findOne({ id }))
}

const verifiedStamp = (value, current) => (value.location_precision === 'field_verified' && current?.location_precision !== 'field_verified' ? { verified_at: new Date().toISOString() } : {})

export async function createPlace(settings, value, by) {
  const db = await getMapDb(settings)
  const collection = db.collection(C.places)
  const doc = { id: await nextNumber(collection, 'PL', 4), ...value, ...verifiedStamp(value, null), created_at: new Date(), updated_at: new Date(), updated_by: by }
  await collection.insertOne(doc)
  await audit(db, { kind: 'places', id: doc.id, action: 'create', by, changed: Object.keys(value) })
  return plain(doc)
}

export async function updatePlace(settings, id, value, by) {
  const db = await getMapDb(settings)
  const current = await db.collection(C.places).findOne({ id })
  if (!current) return null
  await db.collection(C.places).updateOne({ id }, { $set: { ...value, ...verifiedStamp(value, current), updated_at: new Date(), updated_by: by } })
  await audit(db, { kind: 'places', id, action: 'update', by, changed: changedKeys(current, value) })
  return plain(await db.collection(C.places).findOne({ id }))
}

export async function setPlacePublished(settings, id, published, by) {
  const db = await getMapDb(settings)
  const status = published ? 'published' : 'draft'
  const current = await db.collection(C.places).findOne({ id })
  if (!current) return null
  await db.collection(C.places).updateOne({ id }, { $set: { status, updated_at: new Date(), updated_by: by } })
  await audit(db, { kind: 'places', id, action: published ? 'publish' : 'unpublish', by, changed: ['status'] })
  return plain(await db.collection(C.places).findOne({ id }))
}

export async function deletePlace(settings, id, by) {
  const db = await getMapDb(settings)
  const run = await db.collection('kok_evacuation_runs').findOne({ community_id: 'thaton', status: 'open' })
  const used = run && (await db.collection('kok_evacuation_cases').findOne({ run_id: run.run_id, destination_id: id }))
  if (used) return { status: 'in-use' }
  const result = await db.collection(C.places).deleteOne({ id })
  if (!result.deletedCount) return { status: 'missing' }
  await audit(db, { kind: 'places', id, action: 'delete', by, changed: [] })
  return { status: 'deleted' }
}

// ---------- ตั้งค่า เส้นทาง การ์ดชุมชน ----------

export async function getCommunitySettings(settings) {
  const db = await getMapDb(settings)
  const doc = plain(await db.collection(C.settings).findOne({ _id: 'community' })) ?? {}
  return { sourceUrl: '', title: '', importedAt: '', surveyDate: null, hiddenLayers: [], pointsPublic: true, ...doc }
}

export async function saveCommunitySettings(settings, value, by) {
  const db = await getMapDb(settings)
  const current = await getCommunitySettings(settings)
  await db.collection(C.settings).updateOne({ _id: 'community' }, { $set: { ...value, updated_at: new Date(), updated_by: by } }, { upsert: true })
  await audit(db, { kind: 'settings', id: 'community', action: 'update', by, changed: changedKeys(current, value) })
  return getCommunitySettings(settings)
}

const standardCommunityRoutes = {
  pongkhong: {
    routes: [
      [[20.3065, 100.2090], [20.3072, 100.2098], [20.3080, 100.2105]],
    ],
    alignment: 'manual',
    source: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปงของ (มฟล. SWG 5)',
  },
  ruammit: {
    routes: [
      [[19.9580, 99.7060], [19.9592, 99.7071], [19.9605, 99.7082]],
    ],
    alignment: 'manual',
    source: 'แผนจัดการความเสี่ยงภัยชุมชนกะเหรี่ยงรวมมิตร (มฟล. SWG 5)',
  },
  pakingtai: {
    routes: [
      [[20.2560, 100.4130], [20.2572, 100.4142], [20.2585, 100.4155]],
    ],
    alignment: 'manual',
    source: 'แผนจัดการความเสี่ยงภัยชุมชนบ้านปากอิงใต้ (มฟล. SWG 5)',
  },
}

export async function getRoutes(settings, community = 'thaton') {
  const db = await getMapDb(settings)
  const saved = plain(await db.collection(C.settings).findOne({ _id: `route:${community}` }))
  if (saved) return saved
  if (community === 'thaton') {
    const defaultRoute = seedSources.route()
    return defaultRoute ?? { routes: [], alignment: 'manual', source: '' }
  }
  return standardCommunityRoutes[community] ?? { routes: [], alignment: 'manual', source: '' }
}

export async function saveRoutes(settings, value, by, community = 'thaton') {
  const db = await getMapDb(settings)
  await db.collection(C.settings).updateOne({ _id: `route:${community}` }, { $set: { ...value, updated_at: new Date(), updated_by: by } }, { upsert: true })
  await audit(db, { kind: 'routes', id: community, action: 'update', by, changed: ['routes'] })
  return getRoutes(settings, community)
}

export async function listProfiles(settings) {
  const db = await getMapDb(settings)
  return (await db.collection(C.profiles).find({}).toArray()).map(plain)
}

export async function saveProfile(settings, value, by) {
  const db = await getMapDb(settings)
  await db.collection(C.profiles).updateOne({ community_id: value.community_id }, { $set: { ...value, updated_at: new Date(), updated_by: by } }, { upsert: true })
  await audit(db, { kind: 'profiles', id: value.community_id, action: 'update', by, changed: Object.keys(value) })
  return plain(await db.collection(C.profiles).findOne({ community_id: value.community_id }))
}

export async function resetProfile(settings, communityId, by) {
  const db = await getMapDb(settings)
  const result = await db.collection(C.profiles).deleteOne({ community_id: communityId })
  if (result.deletedCount) await audit(db, { kind: 'profiles', id: communityId, action: 'reset', by, changed: [] })
  return result.deletedCount > 0
}

// ---------- สรุป ประวัติการแก้ไข ----------

export async function listAudit(settings, limit = 50) {
  const db = await getMapDb(settings)
  return (await db.collection(C.audit).find({}).sort({ at: -1, _id: -1 }).limit(Math.min(limit, 200)).toArray()).map(plain)
}

export async function mapDataSummary(settings) {
  const db = await getMapDb(settings)
  const [households, hamlets, places, seed] = await Promise.all([
    db.collection(C.households).find({}).toArray().then((rows) => rows.map(plain)),
    db.collection(C.hamlets).find({}).toArray().then((rows) => rows.map(plain)),
    db.collection(C.places).find({}).toArray().then((rows) => rows.map(plain)),
    db.collection(C.settings).findOne({ _id: 'seed' }),
  ])
  const { unassigned } = hamletCounts(households, hamlets)
  return {
    households: { total: households.length, published: households.filter((household) => household.published !== false).length, byLevel: levelGroups(households) },
    hamlets: { total: hamlets.length, unassigned },
    places: { total: places.length, published: places.filter((place) => place.status === 'published').length, waitingLocation: places.filter((place) => place.latitude === null).length },
    seed: seed?.done ?? {},
    layers: COMMUNITY_LAYERS.map((layer) => ({ id: layer.id, label: layer.label })),
  }
}

// ---------- สิ่งที่หน้าบ้านเห็น (ใช้ทั้ง API สาธารณะและพรีวิวของแอดมิน) ----------

// ฐานข้อมูลว่างเพราะยังไม่เคยนำเข้า (เช่น ไฟล์ตั้งต้นไม่ถูกรวมเข้าฟังก์ชัน) ต้องตอบ 503 ให้หน้าบ้านถอยไปใช้ไฟล์เดิม ไม่ใช่ส่งข้อมูลว่างไปแทน
// ถ้านำเข้าแล้วแต่แอดมินลบหมดเอง ถือเป็นเจตนา ส่งข้อมูลว่างตามจริง
async function requireSeeded(db, key, count) {
  if (count > 0) return
  const marker = await db.collection(C.settings).findOne({ _id: 'seed' })
  if (!marker?.done?.[key]) throw new Error(`ยังไม่มีข้อมูลตั้งต้นของ ${key}`)
}

export async function publicCommunityPayload(settings) {
  const db = await getMapDb(settings)
  const [households, hamlets, community] = await Promise.all([
    db.collection(C.households).find({}).toArray().then((rows) => rows.map(plain)),
    db.collection(C.hamlets).find({}).toArray().then((rows) => rows.map(plain)),
    getCommunitySettings(settings),
  ])
  await requireSeeded(db, 'community', households.length)
  return buildCommunityReview({ households, hamlets, meta: community, hiddenLayers: community.hiddenLayers, pointsPublic: community.pointsPublic })
}

export async function publicPlacesPayload(settings, community) {
  const db = await getMapDb(settings)
  const places = (await db.collection(C.places).find(community && community !== 'all' ? { community_id: community } : {}).sort({ id: 1 }).toArray()).map(plain)
  await requireSeeded(db, 'places', (community && community !== 'all') ? await db.collection(C.places).countDocuments({}) : places.length)
  return publicPlaces(places)
}

export async function publicHamletsPayload(settings) {
  const db = await getMapDb(settings)
  const [households, hamlets] = await Promise.all([
    db.collection(C.households).find({}).toArray().then((rows) => rows.map(plain)),
    db.collection(C.hamlets).find({}).sort({ id: 1 }).toArray().then((rows) => rows.map(plain)),
  ])
  return { hamlets: publicHamletSummary(households, hamlets) }
}

export async function publicRoutesPayload(settings, community = 'thaton') {
  const { routes, alignment, source } = await getRoutes(settings, community)
  return { routes, alignment, source }
}

export async function publicProfilesPayload(settings) {
  const profiles = await listProfiles(settings)
  return { profiles: Object.fromEntries(profiles.map(({ community_id: id, title, basin, people, livelihood, risk }) => [id, { title, basin, people, livelihood, risk }])) }
}

export async function publicAvailability(settings) {
  const db = await getMapDb(settings)
  const places = (await db.collection(C.places).find({}).toArray()).map(plain)
  const { placed, pending } = publicPlaces(places)
  const hamlets = await db.collection(C.hamlets).countDocuments({ status: { $ne: 'draft' } })
  const placesByCommunity = {}
  for (const place of [...placed, ...pending]) placesByCommunity[place.communityId] = (placesByCommunity[place.communityId] ?? 0) + 1
  return { places: placed.length, placesPending: pending.length, placesByCommunity, hamlets, evacuationDestinations: evacuationDestinations(places).length }
}

// ให้คิวอพยพอ่านที่หมายจากทะเบียนสถานที่แทนไฟล์ (ถ้ายังไม่มีที่หมายในฐานข้อมูลให้ผู้เรียกใช้ไฟล์เดิมต่อ)
export async function listEvacuationDestinations(settings) {
  const db = await getMapDb(settings)
  return evacuationDestinations((await db.collection(C.places).find({}).toArray()).map(plain))
}
