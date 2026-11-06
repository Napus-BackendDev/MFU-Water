// Records the survey walkthrough against a local app. All survey writes are mocked, nothing reaches the database.
// Usage: node docs/tutorial-video/record.mjs   (app must be running on BASE_URL)
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
// Before the voice exists, estimate from text length; afterwards use real clip lengths.
const durations = existsSync(durationsFile) ? JSON.parse(readFileSync(durationsFile, 'utf8')) : {}
const secondsFor = (seg) => (durations[seg.id] ?? seg.text.length / 11) + 0.5

const browser = await chromium.launch()

async function demoPhoto(title, background, file) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
  await page.setContent(`<body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${background};font:600 44px sans-serif;color:#0f172a"><div>${title}</div><div style="font-size:26px;margin-top:16px">ภาพสาธิตสำหรับคลิปแนะนำ</div></body>`)
  await page.screenshot({ path: file })
  await page.close()
}
const photo1 = join(out, 'demo-test-strip.png')
const photo2 = join(out, 'demo-sampling.png')
await demoPhoto('แผ่นทดสอบเทียบสี', '#fef3c7', photo1)
await demoPhoto('จุดเก็บตัวอย่างน้ำ', '#bae6fd', photo2)

// A single sample draws a one-point chart, so the clip uses demo rounds at the demo GPS position.
const demoGps = { latitude: 20.0603, longitude: 99.3633 }
const demoHistory = [
  ['0004', 10, '2026-10-20T09:30:00+07:00'],
  ['0003', 5, '2026-09-22T10:00:00+07:00'],
  ['0002', 0, '2026-08-25T09:15:00+07:00'],
  ['0001', 5, '2026-07-28T09:45:00+07:00'],
].map(([code, ppb, time]) => ({
  id: `demo-${code}`, sample_code: `KOK-DEMO-${code}`, arsenic_level_ppb: ppb, ...demoGps,
  gps_accuracy_meters: 8, created_at: time, collection_time: time,
  contributor_label: 'ภูเขาอ่อนโยน-4bf3a7', publication_status: 'auto_published', photo_count: 2,
}))

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
  geolocation: { ...demoGps, accuracy: 8 },
  permissions: ['geolocation'],
  locale: 'th-TH',
  colorScheme: 'light',
})

// Visible cursor and step label, Playwright video shows neither by default.
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
    label.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:#0f172a;color:#fff;font:600 19px sans-serif;z-index:999998;pointer-events:none;display:none'
    document.documentElement.append(label)
  })
})

await context.route('**/api/**', (route) => {
  const request = route.request()
  const path = new URL(request.url()).pathname
  if (path === '/api/surveys/prepare') {
    return route.fulfill({ json: { ticket: 'demo', uploads: JSON.parse(request.postData()).photoTypes.flatMap((type, index) => (type ? [{ index, path: `demo/${index}`, token: 'demo', url: `/api/demo-upload/${index}` }] : [])) } })
  }
  if (path.startsWith('/api/demo-upload/')) return route.fulfill({ status: 200, json: {} })
  if (path === '/api/surveys/waypoints') return route.fulfill({ json: demoHistory })
  if (path === '/api/surveys/photo') {
    return route.fulfill({ path: new URL(request.url()).searchParams.get('n') === '2' ? photo2 : photo1 })
  }
  if (path === '/api/surveys/complete') {
    const body = JSON.parse(request.postData())
    return route.fulfill({
      json: {
        id: 'demo-5', sample_code: 'KOK-DEMO-0005', arsenic_level_ppb: body.arsenicLevelPpb,
        latitude: body.coordinates.latitude, longitude: body.coordinates.longitude,
        gps_accuracy_meters: body.gpsAccuracyMeters, created_at: new Date().toISOString(),
        contributor_label: 'ภูเขาอ่อนโยน-4bf3a7', publication_status: 'auto_published', photo_count: 2,
      },
    })
  }
  if (request.method() !== 'GET') return route.abort()
  return route.continue()
})

const page = await context.newPage()
const wait = (seconds) => page.waitForTimeout(seconds * 1000)

await page.goto(`${baseUrl}/?welcome=off`)
await page.getByRole('button', { name: 'ทำแบบสำรวจ' }).first().waitFor({ state: 'visible', timeout: 60000 })
await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 30000 }).catch(() => {})
await wait(2.5)

async function moveTo(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await wait(0.6)
  const box = await locator.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 })
  await wait(0.15)
}
async function click(locator) {
  await moveTo(locator)
  await page.mouse.down()
  await wait(0.08)
  await page.mouse.up()
}

const dialog = page.getByRole('dialog', { name: 'ทำแบบสำรวจ' })
const actions = {
  open: async () => {
    await wait(3.2)
    await click(page.getByRole('button', { name: 'ทำแบบสำรวจ' }).first())
    await dialog.waitFor()
  },
  contact: async () => {
    await click(page.getByRole('textbox', { name: /ชื่อ-นามสกุล/ }))
    await page.keyboard.type('สมมติ ตัวอย่าง', { delay: 45 })
    await click(page.getByRole('textbox', { name: /เบอร์โทรศัพท์/ }))
    await page.keyboard.type('080-000-0000', { delay: 45 })
  },
  level: async () => {
    const swatches = page.getByRole('radio')
    await moveTo(swatches.nth(0))
    await click(swatches.nth(2))
  },
  gps: async () => {
    await click(page.getByRole('button', { name: /พิกัด GPS/ }))
    await page.getByText(/ความแม่นยำ GPS/).waitFor()
  },
  photos: async () => {
    await moveTo(page.getByText('แนบรูปถ่ายการเก็บตัวอย่าง'))
    await page.getByLabel('เลือกภาพที่ 1').setInputFiles(photo1)
    await wait(1.4)
    await page.getByLabel('เลือกภาพที่ 2').setInputFiles(photo2)
    await page.getByAltText('ตัวอย่างภาพที่ 2').waitFor()
  },
  consent: async () => {
    await click(page.getByRole('checkbox'))
    // Stay on the consent text while it is explained; reach the submit button as the narration ends.
    await wait(Math.max(1.2, secondsFor(narration.find((seg) => seg.id === 'consent')) - 4))
    await moveTo(page.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }))
  },
  result: async () => {
    await click(page.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }))
    await page.getByText('KOK-DEMO-0005').first().waitFor({ timeout: 15000 })
  },
  detail: async () => {
    // Leaflet paths must not be scrolled into view, so this skips moveTo.
    const box = await page.locator('path[stroke="#121212"]').last().boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 })
    await wait(0.2)
    await page.mouse.down()
    await wait(0.08)
    await page.mouse.up()
    await page.getByText(/ภาพถ่ายจุดตรวจ/).waitFor()
    const hold = Math.max(1.5, (secondsFor(narration.find((seg) => seg.id === 'detail')) - 2.5) / 3)
    await wait(hold)
    await moveTo(page.getByText(/ภาพถ่ายจุดตรวจ/))
    await wait(hold)
    await moveTo(page.getByText(/แนวโน้มสารหนูในรัศมี/))
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
await wait(2)
const total =(Date.now() - started) / 1000
const video = page.video()
await context.close()
await browser.close()

const raw = join(out, 'screen.webm')
renameSync(await video.path(), raw)
writeFileSync(join(out, 'timeline.json'), JSON.stringify({ total, timeline }, null, 2))
console.log(JSON.stringify({ total, timeline }, null, 2))
