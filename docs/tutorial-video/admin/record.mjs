// Records the admin walkthrough against a local app. Every /api/admin call is answered here with demo data,
// so no real sample, contact, or passcode appears and nothing reaches the database.
// Usage: node docs/tutorial-video/admin/record.mjs   (app must be running on BASE_URL)
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'output')
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
mkdirSync(out, { recursive: true })

const narration = JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8'))
const durationsFile = join(out, 'durations.json')
const durations = existsSync(durationsFile) ? JSON.parse(readFileSync(durationsFile, 'utf8')) : {}
const secondsFor = (seg) => (durations[seg.id] ?? seg.text.length / 13) + 0.25

const browser = await chromium.launch()

const photo = join(out, 'demo-photo.png')
const photoPage = await browser.newPage({ viewport: { width: 900, height: 600 } })
await photoPage.setContent('<body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef3c7;font:600 44px sans-serif;color:#0f172a"><div>แผ่นทดสอบเทียบสี</div><div style="font-size:26px;margin-top:16px">ภาพสาธิตสำหรับคลิปแนะนำ</div></body>')
await photoPage.screenshot({ path: photo })
await photoPage.close()

const sample = (code, ppb, status, day, source, name, photos = 1) => ({
  sample_code: `KOK-DEMO-${code}`, latitude: 20.0603, longitude: 99.3633, gps_accuracy_meters: 8,
  collection_time: `2026-10-${day}T09:30:00+07:00`, arsenic_ppb: ppb, publication_status: status,
  sample_nature: { water_source: source }, contact_name: name, contact_phone: '080-000-0000',
  private_photo_paths: Array.from({ length: photos }, (_, index) => `demo/${code}-${index + 1}.png`),
})
const samples = [
  sample('0007', 100, 'pending_review', '28', 'แม่น้ำ', 'ผู้ส่งสาธิต หนึ่ง'),
  sample('0006', 200, 'pending_review', '27', 'บ่อ', 'ผู้ส่งสาธิต สอง'),
  sample('0005', 30, 'auto_published', '25', 'แม่น้ำ', 'ผู้ส่งสาธิต สาม'),
  sample('0004', 10, 'auto_published', '22', 'แม่น้ำ', 'ผู้ส่งสาธิต สี่'),
  sample('0003', 300, 'rejected', '18', 'แม่น้ำ', 'ผู้ส่งสาธิต ห้า'),
  sample('0002', 5, 'auto_published', '15', 'ประปา', 'ผู้ส่งสาธิต หก'),
  sample('0001', 0, 'auto_published', '12', 'แม่น้ำ', 'ผู้ส่งสาธิต เจ็ด'),
]
const sampleCounts = () => {
  const count = (status) => samples.filter((item) => item.publication_status === status).length
  return { total: samples.length, pending: count('pending_review'), approved: count('approved'), autoPublished: count('auto_published'), rejected: count('rejected') }
}

const article = (id, title, category, community_id, community_name, is_pinned, status, cover, day) => ({
  id, title, category, community_id, community_name, summary: title, content: 'เนื้อหาข่าวสาธิต', cover_image_url: `/data/news/${cover}`,
  gallery_image_urls: [], is_pinned, status, author: 'ผู้เขียนสาธิต',
  published_at: `2026-10-${day}T09:00:00+07:00`, created_at: `2026-10-${day}T09:00:00+07:00`, updated_at: `2026-10-${day}T09:00:00+07:00`,
})
const news = [
  article('NEWS-DEMO-04', 'ข่าวสาธิต: แจ้งเตือนคุณภาพน้ำรอบเดือนตุลาคม', 'urgent', 'all', 'ทุกลำน้ำ / ส่วนกลาง', true, 'published', 'thaton-map-preview.png', '26'),
  article('NEWS-DEMO-03', 'ข่าวสาธิต: อบรมการใช้ชุดทดสอบสารหนู', 'event', 'thaton', 'บ้านท่าตอน (หมู่ 3)', false, 'published', 'water-lab-training.png', '20'),
  article('NEWS-DEMO-02', 'ข่าวสาธิต: ภาพดาวเทียมพื้นที่น้ำท่วม', 'flood', 'ruammit', 'บ้านรวมมิตร', false, 'published', 'thaton-sar-flood.png', '14'),
  article('NEWS-DEMO-01', 'ข่าวสาธิต: ร่างแผนลงพื้นที่เดือนหน้า', 'knowledge', 'pongkhong', 'บ้านโป่งขมน', false, 'draft', 'arsenic-kit-guide.png', '08'),
]
const newsCounts = () => ({
  total: news.length,
  published: news.filter((item) => item.status === 'published').length,
  draft: news.filter((item) => item.status === 'draft').length,
  pinned: news.filter((item) => item.is_pinned).length,
})

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
  locale: 'th-TH',
  colorScheme: 'light',
})

await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div')
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:rgba(2,132,199,.55);border:2px solid #fff;box-shadow:0 0 0 1px #0284c7;z-index:999999;pointer-events:none;transition:transform .12s'
    document.documentElement.append(cursor)
    addEventListener('mousemove', (e) => { cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px` }, true)
    addEventListener('mousedown', () => { cursor.style.transform = 'scale(1.7)' }, true)
    addEventListener('mouseup', () => { cursor.style.transform = '' }, true)
    const label = document.createElement('div')
    label.id = 'tutorial-label'
    label.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:#0f172a;color:#fff;font:600 19px sans-serif;z-index:999998;pointer-events:none;display:none;white-space:nowrap'
    document.documentElement.append(label)
  })
})

await context.route('**/api/**', (route) => {
  const request = route.request()
  const method = request.method()
  const path = new URL(request.url()).pathname
  const body = () => JSON.parse(request.postData() || '{}')

  if (path === '/api/surveys/waypoints') return route.fulfill({ json: [] })
  if (path === '/api/admin/verify-passcode') {
    // An empty passcode is the app's local bypass check; refuse it so the login form shows.
    return body().passcode ? route.fulfill({ json: { token: 'demo-token' } }) : route.fulfill({ status: 401, json: { error: 'demo' } })
  }
  if (path === '/api/admin/samples') return route.fulfill({ json: { samples, counts: sampleCounts() } })
  if (path === '/api/admin/photo') return route.fulfill({ path: photo })
  const review = path.match(/^\/api\/admin\/samples\/([^/]+)\/review$/)
  if (review) {
    const { decision, reviewer, reason } = body()
    const item = samples.find((entry) => entry.sample_code === decodeURIComponent(review[1]))
    item.publication_status = decision === 'approve' ? 'approved' : 'rejected'
    Object.assign(item, { reviewed_by: reviewer, review_reason: reason, reviewed_at: new Date().toISOString() })
    return route.fulfill({ json: { ok: true } })
  }
  if (path === '/api/admin/news' && method === 'GET') return route.fulfill({ json: { ok: true, items: news, counts: newsCounts() } })
  if (path === '/api/admin/news' && method === 'POST') {
    const now = new Date().toISOString()
    const created = { ...body(), id: 'NEWS-DEMO-05', published_at: now, created_at: now, updated_at: now }
    news.unshift(created)
    return route.fulfill({ json: { ok: true, article: created } })
  }
  const pin = path.match(/^\/api\/admin\/news\/([^/]+)\/pin$/)
  if (pin) {
    const item = news.find((entry) => entry.id === decodeURIComponent(pin[1]))
    item.is_pinned = body().is_pinned
    return route.fulfill({ json: { ok: true, article: item } })
  }
  if (method !== 'GET' || path.startsWith('/api/admin/')) return route.abort()
  return route.continue()
})

const page = await context.newPage()
const wait = (seconds) => page.waitForTimeout(seconds * 1000)

await page.goto(`${baseUrl}/?welcome=off`)
const adminButton = page.getByRole('button', { name: /ระบบแอดมิน/ })
await adminButton.waitFor({ state: 'visible', timeout: 60000 })
await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 30000 }).catch(() => {})
await wait(2)

async function moveTo(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await wait(0.5)
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 })
  await wait(0.12)
}
async function click(locator) {
  await moveTo(locator)
  await page.mouse.down()
  await wait(0.08)
  await page.mouse.up()
}
async function type(locator, text, delay = 28) {
  await click(locator)
  await page.keyboard.type(text, { delay })
}

const actions = {
  login: async () => {
    await wait(3.4)
    await click(adminButton)
    const passcode = page.locator('#admin-passcode')
    await passcode.waitFor()
    await wait(1)
    await type(passcode, 'demo-passcode', 40)
    await type(page.locator('#admin-reviewer'), 'ผู้ตรวจสาธิต', 40)
    await click(page.getByRole('button', { name: /เข้าสู่ระบบ \(ปลดล็อก/ }))
    await page.getByRole('button', { name: /KOK-DEMO-0007/ }).waitFor()
  },
  overview: async () => {
    await moveTo(page.getByText('รอตรวจ > 50 ppb'))
    await wait(1.6)
    await click(page.getByRole('button', { name: /^รอตรวจ \(\d+\)$/ }))
    await wait(1)
    await moveTo(page.getByLabel('ค้นหาตัวอย่างน้ำ'))
    await wait(0.8)
    await moveTo(page.getByRole('button', { name: 'Export CSV' }))
  },
  detail: async () => {
    await click(page.getByRole('button', { name: 'KOK-DEMO-0007', exact: true }))
    const panel = page.getByRole('region', { name: 'รายละเอียดตัวอย่าง' })
    await panel.getByAltText('ภาพถ่ายตัวอย่างที่ 1').waitFor()
    await wait(1.6)
    await moveTo(panel.getByText('ระดับสารหนู'))
    await wait(1)
    await moveTo(panel.getByText('ติดต่อผู้รายงาน (เฉพาะแอดมิน)'))
  },
  decide: async () => {
    const panel = page.getByRole('region', { name: 'รายละเอียดตัวอย่าง' })
    await click(panel.getByRole('button', { name: 'อนุมัติ', exact: true }))
    await page.locator('#review-reason').waitFor()
    await wait(2.2)
    await moveTo(page.locator('#review-reason'))
    await wait(1.2)
    await click(page.getByRole('button', { name: 'ยืนยันอนุมัติ' }))
    await page.getByText(/อนุมัติรหัส KOK-DEMO-0007 เรียบร้อยแล้ว/).waitFor()
    await wait(1)
    await click(page.getByRole('button', { name: /^รอตรวจ \(\d+\)$/ }))
    await wait(0.4)
    await click(page.getByRole('button', { name: 'KOK-DEMO-0006', exact: true }))
    await moveTo(page.getByRole('region', { name: 'รายละเอียดตัวอย่าง' }).getByRole('button', { name: 'ปฏิเสธ', exact: true }))
  },
  edit: async () => {
    const panel = page.getByRole('region', { name: 'รายละเอียดตัวอย่าง' })
    await click(panel.getByRole('button', { name: 'แก้ไขข้อมูล' }))
    await page.locator('#sample-ppb').waitFor()
    await wait(1.8)
    await click(page.getByRole('button', { name: 'ยกเลิก' }))
    await wait(0.3)
    await click(panel.getByRole('button', { name: 'ลบข้อมูล' }))
    await page.getByRole('heading', { name: 'ยืนยันการลบข้อมูลตัวอย่างน้ำ' }).waitFor()
    await wait(2)
    await click(page.getByRole('button', { name: 'ยกเลิก' }))
  },
  newsList: async () => {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
    await click(page.getByRole('button', { name: /จัดการข่าวสาร/ }))
    await page.getByText('NEWS-DEMO-04').waitFor()
    await wait(1.5)
    await click(page.getByRole('button', { name: /^เผยแพร่แล้ว \(\d+\)$/ }))
    await wait(0.8)
    await click(page.getByRole('button', { name: /^ทั้งหมด \(\d+\)$/ }))
    await wait(0.5)
    await click(page.getByRole('button', { name: 'ปกติ', exact: true }).first())
  },
  newsForm: async () => {
    await click(page.getByRole('button', { name: 'สร้างข่าวใหม่' }))
    await page.locator('#news-title').waitFor()
    await type(page.locator('#news-title'), 'ข่าวสาธิต: แจ้งผลตรวจคุณภาพน้ำ', 22)
    await moveTo(page.locator('#news-category'))
    await page.locator('#news-category').selectOption('water')
    await moveTo(page.locator('#news-community'))
    await page.locator('#news-community').selectOption('thaton')
    await type(page.locator('#news-content'), 'เนื้อหาข่าวสาธิตสำหรับคลิปคู่มือ', 22)
    await click(page.getByRole('button', { name: 'ชุดทดสอบสารหนู' }))
  },
  newsPublish: async () => {
    await click(page.getByRole('radio', { name: 'เก็บเป็นฉบับร่าง' }).locator('..'))
    await wait(1.2)
    await click(page.getByRole('radio', { name: 'เผยแพร่ทันที' }).locator('..'))
    await wait(1)
    await click(page.getByRole('button', { name: 'บันทึกและเผยแพร่ข่าว' }))
    await page.getByText('NEWS-DEMO-05').waitFor()
  },
  wrap: async () => {
    await moveTo(page.getByRole('button', { name: 'แก้ไข', exact: true }).first())
    await wait(0.8)
    await click(page.getByRole('button', { name: 'ลบ', exact: true }).first())
    await page.getByRole('heading', { name: 'ยืนยันการลบข่าวสารประชาสัมพันธ์' }).waitFor()
    await wait(1.5)
    await click(page.getByRole('button', { name: 'ยกเลิก' }))
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }))
    await moveTo(page.getByRole('button', { name: 'ออกจากระบบ' }))
  },
}

const started = Date.now()
const timeline = []
for (const seg of narration) {
  const start = (Date.now() - started) / 1000
  await page.evaluate((text) => {
    const label = document.getElementById('tutorial-label')
    label.textContent = text
    label.style.display = 'block'
  }, seg.label)
  await actions[seg.id]()
  const elapsed = (Date.now() - started) / 1000 - start
  const remaining = secondsFor(seg) - elapsed
  if (remaining > 0) await wait(remaining)
  timeline.push({ id: seg.id, start, overran: remaining < 0 ? -remaining : 0 })
}
await wait(0.5)
const total =(Date.now() - started) / 1000
const video = page.video()
await context.close()
await browser.close()

renameSync(await video.path(), join(out, 'screen.webm'))
writeFileSync(join(out, 'timeline.json'), JSON.stringify({ total, timeline }, null, 2))
console.log(JSON.stringify({ total, timeline }))
