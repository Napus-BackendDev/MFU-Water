import { getDb } from '../surveys/_db.js'

export const SEED_NEWS_ARTICLES = [
  {
    id: 'NW-2026-014',
    title: 'แจ้งผลตรวจคุณภาพน้ำแม่น้ำกก รอบเดือนตุลาคม 2569 และแผนเฝ้าระวังพื้นที่น้ำท่วมซ้ำซากบ้านท่าตอน',
    category: 'urgent',
    community_id: 'thaton',
    community_name: 'บ้านท่าตอน (หมู่ที่ 3)',
    summary: 'สรุปผลตรวจคัดกรองสารหนูภาคสนามและห้องปฏิบัติการบริเวณจุดเก็บตัวอย่าง KK01–KK03 บ้านท่าตอน พร้อมภาพถ่ายดาวเทียม Sentinel-2 เปรียบเทียบแนวตลิ่งและจุดเสี่ยงน้ำท่วมเพื่อให้ชุมชนเตรียมความพร้อม',
    content: `1. สรุปผลการตรวจติดตามคุณภาพน้ำ:
ทีมวิจัยมหาวิทยาลัยแม่ฟ้าหลวง (MFU Kok Water Watch) ได้ลงพื้นที่เก็บตัวอย่างน้ำผิวดินบริเวณบ้านท่าตอน หมู่ที่ 3 ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่ ประจำเดือนตุลาคม 2569 โดยตรวจพบค่าความเข้มข้นของสารหนูอยู่ในช่วงเฝ้าระวังและมีแนวโน้มลดลงจากช่วงฤดูน้ำหลาก

2. คำแนะนำการใช้น้ำของครัวเรือน:
ขอให้ประชาชนใช้น้ำดื่มบรรจุขวดหรือน้ำผ่านระบบกรองมาตรฐานสำหรับการบริโภค ส่วนการใช้น้ำเพื่อการเกษตรและอุปโภคทั่วไปควรหลีกเลี่ยงช่วงที่น้ำในแม่น้ำกกมีสีขุ่นแดงผิดปกติหลังฝนตกหนัก

3. การเตรียมความพร้อมรับมือน้ำท่วมริมตลิ่ง:
จากข้อมูลภาพถ่ายดาวเทียม Sentinel-1 และ Sentinel-2 พบพื้นที่ลุ่มต่ำริมตลิ่งแม่น้ำกกที่เกิดน้ำท่วมขังซ้ำซาก ขอให้ครัวเรือนใกล้แนวตลิ่งติดตามประกาศแจ้งเตือนจากหอกระจายข่าวหมู่บ้านและผู้นำชุมชนอย่างใกล้ชิด`,
    cover_image_url: '/data/news/thaton-sentinel2-flood.png',
    gallery_image_urls: [
      '/data/news/thaton-normal-sat.png',
      '/data/news/thaton-sar-flood.png',
      '/data/news/thaton-map-preview.png',
    ],
    is_pinned: true,
    status: 'published',
    author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
    published_at: '2026-10-28T10:30:00+07:00',
    created_at: '2026-10-28T10:30:00+07:00',
    updated_at: '2026-10-28T10:30:00+07:00',
  },
  {
    id: 'NW-2026-013',
    title: 'สรุปแนวโน้มค่าสารหนู (ppb) จุดตรวจ KK01 และสะพานแม่นาวาง–ท่าตอน รอบล่าสุด',
    category: 'water',
    community_id: 'thaton',
    community_name: 'บ้านท่าตอน (หมู่ที่ 3)',
    summary: 'ผลการตรวจติดตามคุณภาพน้ำผิวดินพบค่าแนวโน้มลดลงจากช่วงต้นฤดูฝน แนะนำใช้น้ำประปาหมู่บ้านและน้ำดื่มบรรจุขวดตามปกติ',
    content: `รายงานผลการวิเคราะห์ทางห้องปฏิบัติการและชุดทดสอบภาคสนาม ประจำรอบเดือนตุลาคม 2569:
• จุดตรวจ KK01 (ท่าตอน จุดใหม่): ค่าเฉลี่ย 15 ppb (แนวโน้มลดลงต่อเนื่องจากช่วง พ.ค. ที่ 29 ppb)
• จุดตรวจ KK03 (สะพานแม่นาวาง–ท่าตอน): ค่าเฉลี่ย 11 ppb (ใกล้เคียงเกณฑ์มาตรฐานน้ำผิวดิน 10 ppb)

ข้อแนะนำสำหรับชุมชน:
ยังคงแนะนำให้ใช้น้ำดื่มบรรจุขวดสำหรับการบริโภคโดยตรง และใช้น้ำประปาหมู่บ้านสำหรับอุปโภคทั่วไป`,
    cover_image_url: '/data/news/thaton-map-preview.png',
    gallery_image_urls: [
      '/data/news/thaton-map-preview.png',
      '/data/news/thaton-normal-sat.png',
    ],
    is_pinned: true,
    status: 'published',
    author: 'ทีมวิจัยคุณภาพน้ำ มฟล. (SWG6)',
    published_at: '2026-10-25T09:00:00+07:00',
    created_at: '2026-10-25T09:00:00+07:00',
    updated_at: '2026-10-25T09:00:00+07:00',
  },
  {
    id: 'NW-2026-012',
    title: 'ลงพื้นที่คืนข้อมูลชุมชนและอบรมอาสาสมัครชุดทดสอบน้ำภาคสนาม ต.แม่ยาว',
    category: 'event',
    community_id: 'ruammit',
    community_name: 'บ้านกะเหรี่ยงรวมมิตร',
    summary: 'ทีมวิจัยมหาวิทยาลัยแม่ฟ้าหลวงร่วมกับผู้นำชุมชนจัดกิจกรรมฝึกใช้ชุดตรวจน้ำเบื้องต้นและการส่งพิกัด GPS ผ่านมือถือ',
    content: `กิจกรรมการมีส่วนร่วมของชุมชนบ้านกะเหรี่ยงรวมมิตร ต.แม่ยาว อ.เมือง จ.เชียงราย:
ทีมงานวิจัยได้ลงพื้นที่จัดเวทีคืนข้อมูลคุณภาพน้ำแม่น้ำกกช่วงกลางน้ำ พร้อมจัดการอบรมเชิงปฏิบัติการให้อาสาสมัครชุมชนในการใช้ชุดทดสอบสารหนูเบื้องต้น การอ่านแถบสี 9 ระดับ และการส่งบันทึกผลสำรวจผ่านระบบเว็บแอปพลิเคชัน`,
    cover_image_url: '/data/news/ruammit-community.png',
    gallery_image_urls: [
      '/data/news/ruammit-community.png',
    ],
    is_pinned: false,
    status: 'published',
    author: 'ทีมวิจัย มฟล. และผู้นำชุมชนแม่ยาว',
    published_at: '2026-10-19T14:00:00+07:00',
    created_at: '2026-10-19T14:00:00+07:00',
    updated_at: '2026-10-19T14:00:00+07:00',
  },
  {
    id: 'NW-2026-011',
    title: '(ร่าง) กำหนดการประชุมเวทีชาวบ้านเพื่อทบทวนเส้นทางอพยพกลุ่มเปราะบาง',
    category: 'event',
    community_id: 'pongkhong',
    community_name: 'บ้านปงของ',
    summary: 'เตรียมจัดเวทีรับฟังความคิดเห็นชาวบ้านเพื่อปรับปรุงแผนที่จุดรวมพลและเส้นทางอพยพกรณีเกิดน้ำป่าไหลหลาก',
    content: `ร่างกำหนดการเวทีชาวบ้านบ้านปงของ ต.แม่เงิน อ.เชียงแสน:
จัดขึ้นเพื่อร่วมกันทบทวนจุดเสี่ยงดินสไลด์และน้ำหลากริมลำห้วยสาขา พร้อมตรวจสอบรายชื่อกลุ่มเปราะบางและจุดพักพิงปลอดภัยร่วมกับผู้ใหญ่บ้านและฝ่ายปกครอง`,
    cover_image_url: '/data/news/thaton-map-preview.png',
    gallery_image_urls: [],
    is_pinned: false,
    status: 'draft',
    author: 'ผู้ประสานงานพื้นที่บ้านปงของ',
    published_at: '2026-10-16T11:00:00+07:00',
    created_at: '2026-10-16T11:00:00+07:00',
    updated_at: '2026-10-16T11:00:00+07:00',
  },
  {
    id: 'NW-2026-010',
    title: 'คู่มือการอ่านค่าสีระดับความเสี่ยงคุณภาพน้ำ 3 ระดับ และวิธีปฏิบัติตัวเมื่อพบน้ำขุ่นผิดปกติ',
    category: 'knowledge',
    community_id: 'all',
    community_name: 'ทุกชุมชน (4 พื้นที่)',
    summary: 'ทำความเข้าใจเกณฑ์สีเขียว (<5 ppb) สีเหลือง (5–10 ppb) และสีแดง (>10 ppb) พร้อมช่องทางแจ้งผู้ประสานงานพื้นที่',
    content: `แนวทางสังเกตและอ่านค่าคุณภาพน้ำอย่างง่ายสำหรับประชาชน:
1. สีเขียว (ปกติ < 5 ppb): น้ำมีคุณภาพตามมาตรฐาน สามารถใช้อุปโภคได้ตามปกติ
2. สีเหลือง (เฝ้าระวัง 5–10 ppb): ควรสังเกตความขุ่นและการตกตะกอน ไม่แนะนำให้ดื่มโดยตรงโดยไม่ผ่านระบบกรอง
3. สีแดง (เกินเกณฑ์ > 10 ppb): เกินมาตรฐานน้ำผิวดินของกรมควบคุมมลพิษ หลีกเลี่ยงการใช้น้ำโดยตรงและแจ้งผู้ประสานงานพื้นที่เพื่อส่งตรวจยืนยัน`,
    cover_image_url: '/data/news/water-health-guide.png',
    gallery_image_urls: [
      '/data/news/water-health-guide.png',
    ],
    is_pinned: false,
    status: 'published',
    author: 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
    published_at: '2026-10-12T09:30:00+07:00',
    created_at: '2026-10-12T09:30:00+07:00',
    updated_at: '2026-10-12T09:30:00+07:00',
  },
  {
    id: 'NW-2026-009',
    title: 'รายงานการสำรวจผลกระทบน้ำท่วมย้อนบริเวณปากแม่น้ำอิงและลำห้วยสาขา',
    category: 'water',
    community_id: 'pakingtai',
    community_name: 'บ้านปากอิงใต้',
    summary: 'สรุปการสำรวจพื้นที่ลุ่มต่ำริมแม่น้ำอิงช่วงสบแม่น้ำโขง พร้อมแผนผังเฝ้าระวังน้ำหนุนย้อนจากลำน้ำโขง',
    content: `สรุปผลการสำรวจเชิงพื้นที่บ้านปากอิงใต้ ต.ศรีดอนชัย อ.เชียงของ:
พื้นที่ปากแม่น้ำอิงมีลักษณะพิเศษคือเมื่อแม่น้ำโขงมีระดับน้ำสูง จะเกิดสภาวะน้ำท่วมย้อน (Backwater) เข้าสู่พื้นที่เกษตรกรรมและบ้านเรือนริมตลิ่ง ทีมวิจัยจึงได้ติดตั้งจุดสังเกตการณ์ระดับน้ำและประสานข้อมูลร่วมกับผู้นำท้องถิ่น`,
    cover_image_url: '/data/news/thaton-normal-sat.png',
    gallery_image_urls: [],
    is_pinned: false,
    status: 'published',
    author: 'ทีมวิจัย มฟล. (SWG6) และเครือข่ายลุ่มน้ำอิง',
    published_at: '2026-10-05T10:00:00+07:00',
    created_at: '2026-10-05T10:00:00+07:00',
    updated_at: '2026-10-05T10:00:00+07:00',
  },
]

function plain(doc) {
  if (!doc) return null
  const { _id: _ignored, ...rest } = doc
  for (const [k, v] of Object.entries(rest)) {
    if (v instanceof Date) rest[k] = v.toISOString()
  }
  return rest
}

export async function getNewsCollection(settings) {
  const db = await getDb(settings)
  const col = db.collection('kok_news_articles')
  const count = await col.estimatedDocumentCount()
  if (count === 0) {
    try {
      await col.insertMany(SEED_NEWS_ARTICLES.map(a => ({
        ...a,
        created_at: new Date(a.created_at),
        published_at: new Date(a.published_at),
        updated_at: new Date(a.updated_at),
      })))
      await col.createIndexes([
        { key: { id: 1 }, unique: true },
        { key: { is_pinned: -1, published_at: -1 } },
        { key: { status: 1 } },
        { key: { category: 1 } },
        { key: { community_id: 1 } },
      ])
    } catch (e) {
      // index or duplicate error in concurrent worker
      console.warn('News seed warning:', e?.message)
    }
  }
  return col
}

export async function listPublicNews(settings, { category, communityId, search, limit = 20 } = {}) {
  const col = await getNewsCollection(settings)
  const query = { status: 'published' }
  if (category && category !== 'all') {
    query.category = category
  }
  if (communityId && communityId !== 'all') {
    query.$or = [{ community_id: communityId }, { community_id: 'all' }]
  }
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim()
    query.$and = (query.$and || []).concat([
      {
        $or: [
          { title: { $regex: s, $options: 'i' } },
          { summary: { $regex: s, $options: 'i' } },
          { content: { $regex: s, $options: 'i' } },
        ]
      }
    ])
  }
  const cursor = col.find(query).sort({ is_pinned: -1, published_at: -1 }).limit(Math.min(limit, 50))
  const docs = await cursor.toArray()
  return docs.map(plain)
}

export async function getNewsById(settings, id) {
  const col = await getNewsCollection(settings)
  const doc = await col.findOne({ id })
  return plain(doc)
}

export async function listAdminNews(settings, { category, communityId, status, search, limit = 50 } = {}) {
  const col = await getNewsCollection(settings)
  const query = {}
  if (category && category !== 'all') query.category = category
  if (communityId && communityId !== 'all') query.community_id = communityId
  if (status && status !== 'all') query.status = status
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim()
    query.$or = [
      { id: { $regex: s, $options: 'i' } },
      { title: { $regex: s, $options: 'i' } },
      { summary: { $regex: s, $options: 'i' } },
    ]
  }
  const docs = await col.find(query).sort({ is_pinned: -1, updated_at: -1 }).limit(limit).toArray()
  const total = await col.countDocuments({})
  const published = await col.countDocuments({ status: 'published' })
  const pinned = await col.countDocuments({ is_pinned: true })
  const draft = await col.countDocuments({ status: 'draft' })
  return {
    items: docs.map(plain),
    counts: { total, published, pinned, draft }
  }
}

export async function createNewsArticle(settings, data) {
  const col = await getNewsCollection(settings)
  const now = new Date()
  const year = now.getFullYear()
  // Next number after the highest id this year; counting articles would reuse ids once news are deleted.
  const [latest] = await col.find({ id: { $regex: `^NW-${year}-\\d+$` } }, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).toArray()
  const next = latest ? Number(latest.id.split('-')[2]) + 1 : 1
  const id = data.id || `NW-${year}-${String(next).padStart(3, '0')}`
  const doc = {
    id,
    title: String(data.title || '').trim(),
    category: data.category || 'water',
    community_id: data.community_id || 'all',
    community_name: data.community_name || 'ทุกชุมชน',
    summary: String(data.summary || (data.content ? data.content.slice(0, 160) + '...' : '')).trim(),
    content: String(data.content || '').trim(),
    cover_image_url: data.cover_image_url || '/data/news/thaton-sentinel2-flood.png',
    gallery_image_urls: Array.isArray(data.gallery_image_urls) ? data.gallery_image_urls : [],
    is_pinned: Boolean(data.is_pinned),
    status: data.status === 'draft' ? 'draft' : 'published',
    author: data.author || 'ศูนย์ประสานงานวิจัยลุ่มน้ำกก มฟล.',
    published_at: data.status === 'draft' ? null : now,
    created_at: now,
    updated_at: now,
  }
  await col.insertOne(doc)
  return plain(doc)
}

export async function updateNewsArticle(settings, id, data) {
  const col = await getNewsCollection(settings)
  const now = new Date()
  const update = { updated_at: now }
  if (data.title !== undefined) update.title = String(data.title).trim()
  if (data.category !== undefined) update.category = data.category
  if (data.community_id !== undefined) update.community_id = data.community_id
  if (data.community_name !== undefined) update.community_name = data.community_name
  if (data.summary !== undefined) update.summary = String(data.summary).trim()
  if (data.content !== undefined) update.content = String(data.content).trim()
  if (data.cover_image_url !== undefined) update.cover_image_url = data.cover_image_url
  if (data.gallery_image_urls !== undefined) update.gallery_image_urls = data.gallery_image_urls
  if (data.is_pinned !== undefined) update.is_pinned = Boolean(data.is_pinned)
  if (data.status !== undefined) {
    update.status = data.status
    // Keep the original date when an already published article is edited.
    if (data.status === 'published') {
      const existing = await col.findOne({ id }, { projection: { published_at: 1 } })
      if (!existing?.published_at) update.published_at = now
    }
  }
  if (data.author !== undefined) update.author = data.author

  const res = await col.findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: 'after' }
  )
  return plain(res)
}

export async function deleteNewsArticle(settings, id) {
  const col = await getNewsCollection(settings)
  const res = await col.deleteOne({ id })
  return res.deletedCount > 0
}

export async function toggleNewsPin(settings, id, isPinned) {
  const col = await getNewsCollection(settings)
  const res = await col.findOneAndUpdate(
    { id },
    { $set: { is_pinned: isPinned, updated_at: new Date() } },
    { returnDocument: 'after' }
  )
  return plain(res)
}
