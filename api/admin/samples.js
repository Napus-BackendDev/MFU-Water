import { readJsonBody, respond } from '../surveys/_shared.js'
import { buildAdminQueue, deleteSampleRecords, findSamplePhotoPaths, updateSample } from '../surveys/_db.js'
import { deletePhotos } from '../surveys/_photos.js'
import { adminEndpoint, reviewerName } from './_admin_shared.js'

const notFound = { error: 'ไม่พบตัวอย่างน้ำรหัสนี้' }
const invalid = { error: 'กรุณาตรวจข้อมูลตัวอย่างน้ำอีกครั้ง' }

// sampleCode comes from Express :sampleCode or ?sampleCode= (Vercel rewrite of /api/admin/samples/:sampleCode).
const sampleCodeOf = (request) => {
  const code = request.params?.sampleCode || request.query?.sampleCode
  return typeof code === 'string' && code ? code : null
}

const text = (value, max) => (typeof value === 'string' && value.trim().length <= max ? value.trim() : null)

export function parseSampleEdit(body) {
  const arsenicPpb = body?.arsenicPpb
  const latitude = body?.latitude
  const longitude = body?.longitude
  const waterSource = text(body?.waterSource, 80)
  const contactName = text(body?.contactName ?? '', 200)
  const contactPhone = text(body?.contactPhone ?? '', 40)
  const collectionTime = typeof body?.collectionTime === 'string' ? new Date(body.collectionTime) : null
  const valid = Number.isFinite(arsenicPpb) && arsenicPpb >= 0 && arsenicPpb <= 100000
    && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    && waterSource && contactName !== null && contactPhone !== null
    && collectionTime && !Number.isNaN(collectionTime.getTime())
  return valid ? { arsenicPpb, latitude, longitude, waterSource, contactName, contactPhone, collectionTime: collectionTime.toISOString() } : null
}

const list = adminEndpoint('GET', async (_request, response, settings) => respond(response, 200, await buildAdminQueue(settings)))

const update = adminEndpoint('PUT', async (request, response, settings) => {
  const sampleCode = sampleCodeOf(request)
  const body = readJsonBody(request)
  const values = parseSampleEdit(body)
  if (!sampleCode || !values) return respond(response, 400, invalid)
  const status = await updateSample(settings, sampleCode, values, reviewerName(body.reviewer))
  if (!status) return respond(response, 404, notFound)
  return respond(response, 200, { success: true, sample_code: sampleCode, publication_status: status })
})

// Photos go first: if that fails the record stays and the admin can retry, so no private photo is orphaned.
const remove = adminEndpoint('DELETE', async (request, response, settings) => {
  const sampleCode = sampleCodeOf(request)
  if (!sampleCode) return respond(response, 400, invalid)
  const paths = await findSamplePhotoPaths(settings, sampleCode)
  if (!paths) return respond(response, 404, notFound)
  await deletePhotos(settings, paths)
  await deleteSampleRecords(settings, sampleCode)
  return respond(response, 200, { success: true, sample_code: sampleCode })
})

export default (request, response) => ({ PUT: update, DELETE: remove }[request.method] ?? list)(request, response)
