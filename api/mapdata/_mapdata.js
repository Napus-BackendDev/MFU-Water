import { readJsonBody, respond } from '../surveys/_shared.js'
import { getAdminSettings, reviewerName, verifyAdminAuth } from '../admin/_admin_shared.js'
import {
  COMMUNITY_IDS,
  COMMUNITY_LAYERS,
  buildCommunityReview,
  levelGroups,
  suggestHamletMerges,
  validateHamlet,
  validateHousehold,
  validatePlace,
  validateProfile,
  validateRoutes,
  EVACUATION_DESTINATION_KINDS,
} from '../../src/lib/map-data.js'
import * as store from './_mapdata_db.js'

// ทุกคำขอของ "ข้อมูลแผนที่" (แอดมินและสาธารณะ) เข้าที่นี่ ผ่านฟังก์ชัน Vercel เดิมด้วย ?route=mapdata (Hobby จำกัด 12 ฟังก์ชัน)
const ID = /^[A-Za-z0-9_-]{1,40}$/
const asText = (value) => (typeof value === 'string' ? value : '')

function readBody(request) {
  try {
    return readJsonBody(request)
  } catch {
    return null
  }
}

const bad = (response, message, errors) => respond(response, 400, { error: message, ...(errors ? { errors } : {}) })
const invalid = (response, errors) => bad(response, errors[0].message, errors)
const notFound = (response, what) => respond(response, 404, { error: `ไม่พบ${what}` })
// ชื่อผู้แก้ไขส่งมาใน header แบบ encodeURIComponent (header รับตัวอักษรไทยตรง ๆ ไม่ได้) หรือในช่อง reviewer ของคำขอ
const fromHeader = (value) => {
  if (typeof value !== 'string') return null
  try {
    return reviewerName(decodeURIComponent(value))
  } catch {
    return reviewerName(value)
  }
}
const editor = (request, body) => fromHeader(request.headers?.['x-admin-name']) ?? reviewerName(body?.reviewer) ?? 'ผู้ดูแลระบบ'

// ---------- แอดมิน ----------

async function placesRoute({ request, response, settings, id, action }) {
  const { method, query } = request
  if (method === 'GET' && !id) return respond(response, 200, { ok: true, ...(await store.listPlaces(settings, { kind: asText(query?.kind), status: asText(query?.status), q: asText(query?.q), community: asText(query?.community) })) })
  if (method === 'GET') {
    const place = await store.getPlace(settings, id)
    return place ? respond(response, 200, { ok: true, place }) : notFound(response, 'สถานที่นี้')
  }
  const body = readBody(request)
  if (!body && method !== 'DELETE') return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
  const by = editor(request, body)
  if (method === 'POST' && !id) {
    const result = validatePlace(body)
    if (!result.ok) return invalid(response, result.errors)
    return respond(response, 201, { ok: true, place: await store.createPlace(settings, result.value, by) })
  }
  if (method === 'POST' && action === 'publish') {
    const place = await store.setPlacePublished(settings, id, Boolean(body.published), by)
    return place ? respond(response, 200, { ok: true, place }) : notFound(response, 'สถานที่นี้')
  }
  if (method === 'PUT' && id) {
    if (!(await store.getPlace(settings, id))) return notFound(response, 'สถานที่นี้')
    const result = validatePlace(body)
    if (!result.ok) return invalid(response, result.errors)
    return respond(response, 200, { ok: true, place: await store.updatePlace(settings, id, result.value, by) })
  }
  if (method === 'DELETE' && id) {
    const result = await store.deletePlace(settings, id, editor(request, null))
    if (result.status === 'missing') return notFound(response, 'สถานที่นี้')
    if (result.status === 'in-use') return respond(response, 409, { error: 'สถานที่นี้เป็นที่หมายของรอบอพยพที่เปิดอยู่ ลบไม่ได้ ให้ซ่อนจากหน้าบ้านแทน หรือปิดรอบก่อน' })
    return respond(response, 200, { ok: true, id })
  }
  return null
}

async function hamletsRoute({ request, response, settings, id }) {
  const { method } = request
  if (method === 'GET') {
    const { items, unassigned } = await store.listHamlets(settings)
    return respond(response, 200, { ok: true, items, unassigned, suggestions: suggestHamletMerges(items) })
  }
  const body = readBody(request)
  if (!body && method !== 'DELETE') return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
  const by = editor(request, body)
  const items = await store.listHamletDocs(settings)
  if (method === 'POST' && id === 'merge') {
    const fromIds = Array.isArray(body.from_ids) ? body.from_ids.filter((value) => typeof value === 'string' && ID.test(value)) : []
    if (!fromIds.length || !ID.test(asText(body.into_id)) || fromIds.includes(body.into_id)) return bad(response, 'กรุณาเลือกหย่อมที่จะรวม และหย่อมปลายทางที่ไม่ซ้ำกัน')
    const merged = await store.mergeHamlets(settings, fromIds, body.into_id, by)
    return merged ? respond(response, 200, { ok: true, ...merged }) : notFound(response, 'หย่อมบ้านที่เลือก')
  }
  if (method === 'POST' && !id) {
    const result = validateHamlet(body, { others: items })
    if (!result.ok) return invalid(response, result.errors)
    return respond(response, 201, { ok: true, hamlet: await store.createHamlet(settings, result.value, by) })
  }
  if (method === 'PUT' && id) {
    if (!items.some((hamlet) => hamlet.id === id)) return notFound(response, 'หย่อมบ้านนี้')
    const result = validateHamlet(body, { others: items.filter((hamlet) => hamlet.id !== id) })
    if (!result.ok) return invalid(response, result.errors)
    return respond(response, 200, { ok: true, hamlet: await store.updateHamlet(settings, id, result.value, by) })
  }
  if (method === 'DELETE' && id) {
    const result = await store.deleteHamlet(settings, id, editor(request, null))
    if (result.status === 'missing') return notFound(response, 'หย่อมบ้านนี้')
    if (result.status === 'in-use') return respond(response, 409, { error: `มีครัวเรือน ${result.count} หลังอยู่ในหย่อมนี้ ให้ย้ายหรือรวมหย่อมก่อนลบ` })
    return respond(response, 200, { ok: true, id })
  }
  return null
}

// พรีวิวของครัวเรือน = สิ่งที่หน้าบ้านแสดงในป๊อปอัปของแต่ละหัวข้อ (ผ่านฟังก์ชันสร้างข้อมูลสาธารณะตัวเดียวกัน)
async function householdPreview(settings, household) {
  const hamlets = await store.listHamletDocs(settings)
  const review = buildCommunityReview({ households: [{ ...household, published: true }], hamlets, meta: {} })
  return review.layers.map((layer) => ({ layerId: layer.id, label: layer.label, ...layer.records[0] }))
}

async function householdsRoute({ request, response, settings, id, action }) {
  const { method, query } = request
  if (method === 'GET' && !id) {
    return respond(response, 200, {
      ok: true,
      ...(await store.listHouseholds(settings, { hamlet: asText(query?.hamlet), layer: asText(query?.layer) || 'layer-1', level: asText(query?.level), q: asText(query?.q), published: asText(query?.published), page: asText(query?.page), pageSize: asText(query?.pageSize) })),
    })
  }
  if (method === 'GET') {
    const household = await store.getHousehold(settings, id)
    return household ? respond(response, 200, { ok: true, household, preview: await householdPreview(settings, household) }) : notFound(response, 'ครัวเรือนนี้')
  }
  const body = readBody(request)
  if (!body && method !== 'DELETE') return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
  const by = editor(request, body)
  const hamletIds = new Set((await store.listHamletDocs(settings)).map((hamlet) => hamlet.id))
  if (method === 'POST' && id === 'assign') {
    const ids = Array.isArray(body.ids) ? body.ids.filter((value) => typeof value === 'string' && ID.test(value)).slice(0, 200) : []
    const hamletId = body.hamlet_id === null ? null : asText(body.hamlet_id)
    if (!ids.length || (hamletId !== null && !hamletIds.has(hamletId))) return bad(response, 'กรุณาเลือกครัวเรือนและหย่อมบ้านที่มีอยู่ในทะเบียน')
    return respond(response, 200, { ok: true, assigned: await store.assignHamlet(settings, ids, hamletId, by) })
  }
  if (method === 'POST' && !id) {
    const result = validateHousehold(body, { hamletIds })
    if (!result.ok) return invalid(response, result.errors)
    const household = await store.createHousehold(settings, result.value, by)
    return respond(response, 201, { ok: true, household, preview: await householdPreview(settings, household) })
  }
  if (method === 'POST' && action === 'publish') {
    const household = await store.setHouseholdPublished(settings, id, Boolean(body.published), by)
    return household ? respond(response, 200, { ok: true, household }) : notFound(response, 'ครัวเรือนนี้')
  }
  if (method === 'PUT' && id) {
    if (!(await store.getHousehold(settings, id))) return notFound(response, 'ครัวเรือนนี้')
    const result = validateHousehold(body, { hamletIds, partial: true })
    if (!result.ok) return invalid(response, result.errors)
    const household = await store.updateHousehold(settings, id, result.value, by)
    return respond(response, 200, { ok: true, household, preview: await householdPreview(settings, household) })
  }
  if (method === 'DELETE' && id) {
    const result = await store.deleteHousehold(settings, id, editor(request, null))
    if (result.status === 'missing') return notFound(response, 'ครัวเรือนนี้')
    if (result.status === 'in-use') return respond(response, 409, { error: 'ครัวเรือนนี้อยู่ในรอบอพยพที่เปิดอยู่ ลบไม่ได้ ให้ซ่อนจากหน้าบ้านแทน หรือปิดรอบก่อน' })
    return respond(response, 200, { ok: true, id })
  }
  return null
}

// กลุ่มอพยพ = ระดับของครัวเรือนในหัวข้อ "กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต" + เส้นทางตามแผน + ที่หมาย (สถานที่ชนิดศูนย์พักพิง/จุดรวมพล)
async function evacuationRoute({ request, response, settings, id }) {
  const { method, query } = request
  const comm = asText(query?.community) || 'thaton'
  if (method === 'GET') {
    const [households, routes, places] = await Promise.all([
      store.allHouseholds(settings, comm),
      store.getRoutes(settings, comm),
      store.listPlaces(settings, { community: comm }),
    ])
    const groups = levelGroups(households)
    const destinationKinds = new Set(EVACUATION_DESTINATION_KINDS)
    return respond(response, 200, {
      ok: true,
      groups: groups.map((group) => ({ ...group, inQueue: group.key !== '5' })),
      inQueue: groups.filter((group) => group.key !== '5').reduce((sum, group) => sum + group.count, 0),
      routes,
      destinations: places.items.filter((place) => destinationKinds.has(place.kind)),
    })
  }
  if (method === 'PUT' && id === 'route') {
    const body = readBody(request)
    if (!body) return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
    const result = validateRoutes(body)
    if (!result.ok) return invalid(response, result.errors)
    const comm = asText(body?.community || query?.community) || 'thaton'
    return respond(response, 200, { ok: true, routes: await store.saveRoutes(settings, result.value, editor(request, body), comm) })
  }
  return null
}

async function profilesRoute({ request, response, settings, id }) {
  const { method } = request
  if (method === 'GET') return respond(response, 200, { ok: true, items: await store.listProfiles(settings) })
  if (!COMMUNITY_IDS.includes(id)) return bad(response, 'ไม่รู้จักรหัสชุมชนนี้')
  if (method === 'PUT') {
    const body = readBody(request)
    if (!body) return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
    const result = validateProfile({ ...body, community_id: id })
    if (!result.ok) return invalid(response, result.errors)
    return respond(response, 200, { ok: true, profile: await store.saveProfile(settings, result.value, editor(request, body)) })
  }
  if (method === 'DELETE') {
    return (await store.resetProfile(settings, id, editor(request, null))) ? respond(response, 200, { ok: true, id }) : notFound(response, 'ข้อความที่แก้ไว้ของชุมชนนี้')
  }
  return null
}

async function settingsRoute({ request, response, settings }) {
  const { method } = request
  if (method === 'GET') return respond(response, 200, { ok: true, settings: await store.getCommunitySettings(settings), layers: COMMUNITY_LAYERS.map((layer) => ({ id: layer.id, label: layer.label })) })
  if (method === 'PUT') {
    const body = readBody(request)
    if (!body) return bad(response, 'ข้อมูลที่ส่งมาไม่ถูกต้อง')
    const layerIds = COMMUNITY_LAYERS.map((layer) => layer.id)
    const value = {}
    if (body.hiddenLayers !== undefined) {
      if (!Array.isArray(body.hiddenLayers) || body.hiddenLayers.some((layer) => !layerIds.includes(layer))) return bad(response, 'หัวข้อที่เลือกซ่อนไม่ถูกต้อง')
      if (body.hiddenLayers.length === layerIds.length) return bad(response, 'ต้องเหลือหัวข้อที่แสดงบนหน้าบ้านอย่างน้อย 1 หัวข้อ')
      value.hiddenLayers = [...new Set(body.hiddenLayers)]
    }
    if (body.pointsPublic !== undefined) value.pointsPublic = Boolean(body.pointsPublic)
    if (body.surveyDate !== undefined) value.surveyDate = body.surveyDate === null || body.surveyDate === '' ? null : asText(body.surveyDate).slice(0, 10)
    if (!Object.keys(value).length) return bad(response, 'ไม่มีค่าที่ต้องการแก้ไข')
    return respond(response, 200, { ok: true, settings: await store.saveCommunitySettings(settings, value, editor(request, body)) })
  }
  return null
}

const publicLoaders = {
  community: (settings) => store.publicCommunityPayload(settings),
  places: (settings, community) => store.publicPlacesPayload(settings, community),
  hamlets: (settings) => store.publicHamletsPayload(settings),
  routes: (settings, community) => store.publicRoutesPayload(settings, community === 'all' ? 'thaton' : community),
  profiles: (settings) => store.publicProfilesPayload(settings),
  availability: (settings) => store.publicAvailability(settings),
}

// พรีวิวของแอดมินคือข้อมูลชุดเดียวกับที่ API สาธารณะส่งให้หน้าบ้านทุกตัวอักษร
async function previewRoute({ request, response, settings, id }) {
  if (request.method !== 'GET') return null
  const load = publicLoaders[id]
  if (!load) return bad(response, 'ไม่รู้จักหน้าที่ต้องการดูพรีวิว')
  return respond(response, 200, { ok: true, target: id, payload: await load(settings, communityOf(request)) })
}

async function summaryRoute({ request, response, settings }) {
  if (request.method !== 'GET') return null
  return respond(response, 200, { ok: true, ...(await store.mapDataSummary(settings)), settings: await store.getCommunitySettings(settings) })
}

async function auditRoute({ request, response, settings }) {
  if (request.method !== 'GET') return null
  return respond(response, 200, { ok: true, items: await store.listAudit(settings, Number(asText(request.query?.limit)) || 50) })
}

const adminRoutes = { '': summaryRoute, audit: auditRoute, settings: settingsRoute, places: placesRoute, hamlets: hamletsRoute, households: householdsRoute, evacuation: evacuationRoute, profiles: profilesRoute, preview: previewRoute }

export function routeFromQuery(query = {}) {
  const part = (value) => (typeof value === 'string' && ID.test(value) ? value : '')
  return { kind: typeof query.kind === 'string' ? query.kind : '', id: part(query.id), action: part(query.action) }
}

// /places/PL-0001/publish → { kind: 'places', id: 'PL-0001', action: 'publish' } (Express ตัดคำนำหน้า /api/admin/map-data ออกแล้ว)
export function routeFromPath(path = '') {
  const [kind = '', id = '', action = ''] = String(path).split('/').filter(Boolean)
  return routeFromQuery({ kind, id: decodeURIComponent(id), action })
}

export async function adminMapDataHandler(request, response, route = routeFromQuery(request.query)) {
  if (!verifyAdminAuth(request)) return respond(response, 401, { error: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านแอดมินก่อน' })
  const handle = Object.hasOwn(adminRoutes, route.kind) ? adminRoutes[route.kind] : null
  if (!handle) return notFound(response, 'หน้านี้')
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  try {
    const done = await handle({ request, response, settings: getAdminSettings(), id: route.id, action: route.action })
    if (done === null) {
      response.setHeader('Allow', 'GET, POST, PUT, DELETE')
      return respond(response, 405, { error: 'Method not allowed' })
    }
    return done
  } catch (error) {
    console.error('MAPDATA ADMIN ERROR:', error?.message)
    return respond(response, 503, { error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' })
  }
}

// ---------- สาธารณะ ----------

const communityOf = (request) => {
  const value = asText(request.query?.community)
  return COMMUNITY_IDS.includes(value) ? value : 'all'
}

// แคชสั้น ๆ ที่ CDN ของ Vercel เพื่อลดภาระฐานข้อมูล (หน้าบ้านเห็นสิ่งที่แอดมินแก้ภายใน 20 วินาที) ส่วนเบราว์เซอร์ต้องถามใหม่ทุกครั้ง
// ไม่ใช้ stale-while-revalidate ใน Cache-Control เพราะเบราว์เซอร์จะเอาของเก่ามาแสดงได้นานถึง 2 นาที
export async function publicMapDataHandler(request, response, target = asText(request.query?.target)) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }
  const load = Object.hasOwn(publicLoaders, target) ? publicLoaders[target] : null
  if (!load) return notFound(response, 'ข้อมูลแผนที่ชุดนี้')
  try {
    const payload = await load(getAdminSettings(), communityOf(request))
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    response.setHeader('Vercel-CDN-Cache-Control', 's-maxage=20, stale-while-revalidate=120')
    return response.status(200).json(payload)
  } catch (error) {
    console.error('MAPDATA PUBLIC ERROR:', error?.message)
    return respond(response, 503, { error: 'บริการข้อมูลแผนที่ยังไม่พร้อมใช้งาน' })
  }
}
