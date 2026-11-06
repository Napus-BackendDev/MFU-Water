import fs from 'node:fs'
import path from 'node:path'
import { readJsonBody, respond } from '../surveys/_shared.js'
import { getDb } from '../surveys/_db.js'
import { getAdminSettings, reviewerName, verifyAdminAuth } from '../admin/_admin_shared.js'

let cachedRecords = null
let cachedDestinations = null

function resolveDataFile(subPath) {
  const candidates = [
    path.join(process.cwd(), subPath),
    path.join(process.cwd(), 'data/private', path.basename(subPath)),
    path.join(process.cwd(), 'public/mymaps', path.basename(subPath)),
    path.join(process.cwd(), 'data', path.basename(subPath)),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

export function getHouseholdRecords() {
  if (cachedRecords) return cachedRecords
  const p1 = resolveDataFile('data/private/thaton.json')
  const pFallback = resolveDataFile('public/mymaps/thaton.json')
  const filePath = fs.existsSync(p1) ? p1 : pFallback
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const l1 = json.layers.find((l) => l.id === 'layer-1')
  cachedRecords = l1.records
  return cachedRecords
}

export function getDestinations() {
  if (cachedDestinations) return cachedDestinations
  const p1 = resolveDataFile('data/private/public-evacuation-reference.json')
  const pFallback = resolveDataFile('data/public-evacuation-reference.json')
  const filePath = fs.existsSync(p1) ? p1 : pFallback
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  cachedDestinations = json.points
  return cachedDestinations
}

export function haversineDistanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestDestination(lat, lon, destinations) {
  if (!destinations || !destinations.length) return null
  let nearest = destinations[0]
  let minMetres = Infinity
  for (const d of destinations) {
    const metres = haversineDistanceMetres(lat, lon, d.latitude, d.longitude)
    if (metres < minMetres) {
      minMetres = metres
      nearest = d
    }
  }
  return { destination: nearest, metres: minMetres }
}

export function extractLevel(status) {
  const match = String(status || '').trim().match(/^([1245])/)
  return match ? parseInt(match[1], 10) : 5
}

export const EVACUATION_LEVEL_GROUPS = {
  1: { label: 'วิกฤตสูงสุด (มีสมาชิกเปราะบาง + บ้านเคยท่วม)', shortLabel: 'วิกฤตสูงสุด', color: '#A52714', inQueue: true },
  2: { label: 'มีสมาชิกเปราะบาง (บ้านไม่เคยท่วม)', shortLabel: 'มีเปราะบาง', color: '#E65100', inQueue: true },
  4: { label: 'เคยท่วมบ้าน (ไม่มีสมาชิกเปราะบาง)', shortLabel: 'เคยท่วม', color: '#673AB7', inQueue: true },
  5: { label: 'ปกติ', shortLabel: 'ปกติ', color: '#0F9D58', inQueue: false },
}

export function buildQueue(records, destinations, casesMap = new Map()) {
  const items = []
  for (const r of records) {
    const level = extractLevel(r.status)
    if (level === 5) continue

    const nearestMatch = findNearestDestination(r.latitude, r.longitude, destinations)
    const destination = nearestMatch?.destination ?? destinations[0]
    const distanceMetres = nearestMatch?.metres ?? 0
    const rawMembers = r.fields?.['จำนวนสมาชิกเปราะบาง_คน']
    const members = typeof rawMembers === 'number' ? rawMembers : parseFloat(String(rawMembers || 0)) || 0
    const accident = (r.fields?.['อุบัติเหตุรุนแรงจากน้ำ'] || '').trim() !== 'ไม่มี'
    const flooded = (r.fields?.['ประวัติน้ำท่วมบ้าน'] || '').trim() === 'เคยท่วมบ้าน'
    const zone = (r.fields?.['โซน'] || 'ไม่ระบุหย่อม').trim()

    const caseData = casesMap.get(r.id)
    const status = caseData?.status ?? 'waiting'
    const manualRank = caseData?.manual_rank ?? null

    items.push({
      id: r.id,
      householdId: r.id,
      rank: 0,
      manualRank,
      level,
      status,
      zone,
      members,
      vulnerableMembers: members,
      flooded,
      accident,
      latitude: r.latitude,
      longitude: r.longitude,
      destinationId: destination.id,
      destinationLabel: destination.label,
      distanceMetres,
      destinationMetres: distanceMetres,
    })
  }

  items.sort((a, b) => {
    const hasManualA = a.manualRank !== null && Number.isFinite(a.manualRank)
    const hasManualB = b.manualRank !== null && Number.isFinite(b.manualRank)
    if (hasManualA && hasManualB) return a.manualRank - b.manualRank
    if (hasManualA) return -1
    if (hasManualB) return 1

    if (a.level !== b.level) return a.level - b.level
    if (b.members !== a.members) return b.members - a.members
    if (a.accident !== b.accident) return (b.accident ? 1 : 0) - (a.accident ? 1 : 0)
    if (Math.abs(b.distanceMetres - a.distanceMetres) > 0.001) return b.distanceMetres - a.distanceMetres
    return a.id.localeCompare(b.id)
  })

  items.forEach((item, idx) => {
    item.rank = idx + 1
  })
  return items
}

export function summarizeHouseholdLevels(records) {
  const counts = { 1: 0, 2: 0, 4: 0, 5: 0 }
  for (const r of records) {
    const level = extractLevel(r.status)
    counts[level] = (counts[level] || 0) + 1
  }
  const groups = [1, 2, 4, 5].map((lvl) => ({
    level: lvl,
    label: EVACUATION_LEVEL_GROUPS[lvl].label,
    shortLabel: EVACUATION_LEVEL_GROUPS[lvl].shortLabel,
    color: EVACUATION_LEVEL_GROUPS[lvl].color,
    count: counts[lvl] || 0,
    inQueue: EVACUATION_LEVEL_GROUPS[lvl].inQueue,
  }))
  return {
    groups,
    level1: counts[1],
    level2: counts[2],
    level4: counts[4],
    level5: counts[5],
  }
}

export function summarizeDestinations(destinations, queue) {
  return destinations.map((d) => {
    const assigned = queue.filter((q) => q.destinationId === d.id)
    const arrived = assigned.filter((q) => q.status === 'arrived')
    const enRoute = assigned.filter((q) => q.status === 'en_route')
    const waiting = assigned.filter((q) => q.status === 'waiting')
    return {
      id: d.id,
      kind: d.kind,
      label: d.label,
      latitude: d.latitude,
      longitude: d.longitude,
      assignedCount: assigned.length,
      arrivedCount: arrived.length,
      enRouteCount: enRoute.length,
      waitingCount: waiting.length,
      capacityLabel: 'ความจุรอยืนยัน',
      verificationStatus: 'approximate_not_field_verified',
    }
  })
}

export function summarizeCounts(queue) {
  const counts = { total: queue.length, waiting: 0, en_route: 0, arrived: 0 }
  for (const q of queue) {
    if (q.status === 'arrived') counts.arrived++
    else if (q.status === 'en_route') counts.en_route++
    else counts.waiting++
  }
  return counts
}

export async function getActiveRun(db) {
  return await db.collection('kok_evacuation_runs').findOne({ community_id: 'thaton', status: 'open' })
}

// 1. GET /api/admin/evacuation
export async function getEvacuationHandler(request, response) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' })

  const settings = getAdminSettings()
  const db = await getDb(settings)
  const run = await getActiveRun(db)
  const records = getHouseholdRecords()
  const destinations = getDestinations()
  const casesMap = new Map()

  if (run) {
    const cases = await db.collection('kok_evacuation_cases').find({ run_id: run.run_id }).toArray()
    for (const c of cases) {
      casesMap.set(c.household_id, c)
    }
  }

  const queue = buildQueue(records, destinations, casesMap)
  const counts = summarizeCounts(queue)
  const destSummary = summarizeDestinations(destinations, queue)
  const levelGroups = summarizeHouseholdLevels(records)

  return respond(response, 200, {
    ok: true,
    run: run
      ? {
          run_id: run.run_id,
          community_id: run.community_id,
          status: run.status,
          started_at: run.started_at,
          started_by: run.started_by,
        }
      : {
          status: 'idle',
          community_id: 'thaton',
        },
    queue,
    counts,
    destinations: destSummary,
    levelGroups,
  })
}

// 2. POST /api/admin/evacuation/start
export async function startEvacuationHandler(request, response) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' })

  const settings = getAdminSettings()
  const db = await getDb(settings)
  const existing = await getActiveRun(db)
  if (existing) {
    return respond(response, 409, { error: 'มีรอบการอพยพที่เปิดอยู่แล้ว กรุณาปิดรอบเดิมก่อนเปิดรอบใหม่' })
  }

  const body = readJsonBody(request) || {}
  const reviewer = reviewerName(body.reviewer) || 'ทีมช่วยเหลือ'
  const runId = `evac-thaton-${Date.now()}`
  const startedAt = new Date().toISOString()

  const runDoc = {
    run_id: runId,
    community_id: 'thaton',
    status: 'open',
    started_at: startedAt,
    started_by: reviewer,
    closed_at: null,
    closed_by: null,
  }
  await db.collection('kok_evacuation_runs').insertOne(runDoc)

  const records = getHouseholdRecords()
  const destinations = getDestinations()
  const defaultQueue = buildQueue(records, destinations)

  const caseDocs = defaultQueue.map((q) => ({
    run_id: runId,
    household_id: q.id,
    manual_rank: null,
    status: 'waiting',
    destination_id: q.destinationId,
    updated_at: startedAt,
    updated_by: reviewer,
  }))

  if (caseDocs.length > 0) {
    await db.collection('kok_evacuation_cases').insertMany(caseDocs)
  }

  return respond(response, 201, {
    ok: true,
    run: {
      run_id: runId,
      community_id: 'thaton',
      status: 'open',
      started_at: startedAt,
      started_by: reviewer,
    },
    queue: defaultQueue,
    counts: summarizeCounts(defaultQueue),
    destinations: summarizeDestinations(destinations, defaultQueue),
    levelGroups: summarizeHouseholdLevels(records),
  })
}

// 3. PATCH /api/admin/evacuation/cases/:householdId
export async function updateEvacuationCaseHandler(request, response) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' })

  const householdId = request.params?.householdId || request.query?.householdId
  if (!householdId) return respond(response, 400, { error: 'กรุณาระบุ householdId' })

  const body = readJsonBody(request) || {}
  const { status, reviewer } = body
  if (!['waiting', 'en_route', 'arrived'].includes(status)) {
    return respond(response, 400, { error: 'สถานะไม่ถูกต้อง (ต้องเป็น waiting, en_route หรือ arrived)' })
  }

  const records = getHouseholdRecords()
  const exists = records.some((r) => r.id === householdId)
  if (!exists) return respond(response, 404, { error: 'ไม่พบครัวเรือนรหัสนี้ในระบบ' })

  const settings = getAdminSettings()
  const db = await getDb(settings)
  const run = await getActiveRun(db)
  if (!run) return respond(response, 404, { error: 'ไม่พบรอบการอพยพที่กำลังดำเนินการ' })

  const now = new Date().toISOString()
  const rev = reviewerName(reviewer) || 'ทีมช่วยเหลือ'

  await db.collection('kok_evacuation_cases').updateOne(
    { run_id: run.run_id, household_id: householdId },
    { $set: { status, updated_at: now, updated_by: rev } },
    { upsert: true },
  )

  return respond(response, 200, {
    ok: true,
    household_id: householdId,
    status,
    updated_at: now,
  })
}

// 4. PUT /api/admin/evacuation/order
export async function reorderEvacuationHandler(request, response) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' })

  const body = readJsonBody(request) || {}
  const { household_ids } = body
  if (!Array.isArray(household_ids) || household_ids.length === 0) {
    return respond(response, 400, { error: 'กรุณาระบุ household_ids เป็นอาร์เรย์' })
  }

  const settings = getAdminSettings()
  const db = await getDb(settings)
  const run = await getActiveRun(db)
  if (!run) return respond(response, 404, { error: 'ไม่พบรอบการอพยพที่กำลังดำเนินการ' })

  const now = new Date().toISOString()
  const ops = household_ids.map((id, index) => ({
    updateOne: {
      filter: { run_id: run.run_id, household_id: id },
      update: { $set: { manual_rank: index + 1, updated_at: now } },
      upsert: true,
    },
  }))

  await db.collection('kok_evacuation_cases').bulkWrite(ops)
  return respond(response, 200, { ok: true, count: household_ids.length })
}

// 5. POST /api/admin/evacuation/close
export async function closeEvacuationHandler(request, response) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' })

  const body = readJsonBody(request) || {}
  const settings = getAdminSettings()
  const db = await getDb(settings)
  const run = await getActiveRun(db)
  if (!run) return respond(response, 404, { error: 'ไม่พบรอบการอพยพที่กำลังดำเนินการ' })

  const now = new Date().toISOString()
  const rev = reviewerName(body.reviewer) || 'ผู้ดูแลระบบ'

  await db.collection('kok_evacuation_runs').updateOne(
    { _id: run._id },
    { $set: { status: 'closed', closed_at: now, closed_by: rev } },
  )

  return respond(response, 200, {
    ok: true,
    run_id: run.run_id,
    status: 'closed',
    closed_at: now,
    closed_by: rev,
  })
}

// Central handler for Vercel query-routed requests
export default async function evacuationDispatcher(request, response) {
  const route = request.query?.route
  switch (route) {
    case 'evacuation-start':
      if (request.method !== 'POST') return respond(response, 405, { error: 'Method not allowed' })
      return startEvacuationHandler(request, response)
    case 'evacuation-case':
      if (request.method !== 'PATCH') return respond(response, 405, { error: 'Method not allowed' })
      return updateEvacuationCaseHandler(request, response)
    case 'evacuation-order':
      if (request.method !== 'PUT') return respond(response, 405, { error: 'Method not allowed' })
      return reorderEvacuationHandler(request, response)
    case 'evacuation-close':
      if (request.method !== 'POST') return respond(response, 405, { error: 'Method not allowed' })
      return closeEvacuationHandler(request, response)
    case 'evacuation':
    default:
      if (request.method !== 'GET') return respond(response, 405, { error: 'Method not allowed' })
      return getEvacuationHandler(request, response)
  }
}
