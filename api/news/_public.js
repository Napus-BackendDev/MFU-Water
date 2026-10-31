import { config, respond } from '../surveys/_shared.js'
import { listPublicNews, getNewsById } from './_news_db.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return respond(response, 405, { error: 'Method not allowed' })
  }

  try {
    const settings = config(false)
    const id = request.params?.id || request.query?.id

    if (id) {
      const article = await getNewsById(settings, String(id))
      if (!article || article.status !== 'published') {
        return respond(response, 404, { error: 'ไม่พบข่าวสารที่ต้องการ' })
      }
      return respond(response, 200, { ok: true, article })
    }

    const category = String(request.query?.category || 'all')
    const communityId = String(request.query?.community || request.query?.community_id || 'all')
    const search = String(request.query?.search || request.query?.q || '')
    const limit = Number(request.query?.limit) || 20

    const items = await listPublicNews(settings, { category, communityId, search, limit })
    const pinned = items.filter(a => a.is_pinned)

    return respond(response, 200, {
      ok: true,
      items,
      pinned,
      total: items.length
    })
  } catch (err) {
    console.error('Public news error:', err)
    return respond(response, 503, { error: 'ไม่สามารถโหลดข้อมูลข่าวสารได้ในขณะนี้' })
  }
}
