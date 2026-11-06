import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
// @ts-expect-error shared plain-JS rules, typed by src/lib/map-data.d.ts for the app only
import { buildCommunityReview, classifyHousehold, levelGroups, seedFromReview } from '../src/lib/map-data.js'

// Mocked API built from the real rules and the real survey file: nothing is written, so this is safe against any environment.
const review = JSON.parse(readFileSync('public/mymaps/thaton.json', 'utf8'))
const seed = seedFromReview(review)
const hamlets = seed.hamlets.map((hamlet: Record<string, unknown>) => ({ ...hamlet, household_count: 1 }))
const withLevels = (household: { answers: Record<string, string> }) => ({ ...household, levels: classifyHousehold(household.answers) })
const households = seed.households.map(withLevels)

let places = [
  { id: 'TH-SHELTER-01', community_id: 'thaton', kind: 'shelter', name: 'ศูนย์พักพิงตามแผน', source_section: 'แผนอพยพ', latitude: 20.05842, longitude: 99.35875, location_precision: 'approximate', operational_status: 'unchecked', capacity_planned: null, capacity_available: null, last_checked: null, note: '', status: 'published' },
]
const writes: Array<{ method: string; url: string; body: unknown }> = []

async function mockApi(page: Page) {
  places = places.slice(0, 1)
  writes.length = 0
  await page.route('**/api/map-data/**', (route) => route.fulfill({ status: 503, json: { error: 'down' } }))
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (path.includes('verify-passcode')) return route.fulfill({ json: { ok: true, token: '1.mock' } })
    if (path.includes('/samples') || path.includes('/pending-samples')) return route.fulfill({ json: { samples: [], counts: { total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 }, alerts: [] } })
    if (path.includes('/news')) return route.fulfill({ json: { ok: true, items: [], counts: { total: 0, published: 0, draft: 0, pinned: 0 } } })
    if (!path.includes('/map-data')) return route.fulfill({ json: { ok: true } })
    const body = request.postDataJSON?.() ?? null
    if (request.method() !== 'GET') writes.push({ method: request.method(), url: path, body })
    const segments = path.replace('/api/admin/map-data', '').split('/').filter(Boolean)

    if (!segments.length) return route.fulfill({ json: { ok: true, households: { total: households.length, published: households.length, byLevel: levelGroups(seed.households) }, hamlets: { total: hamlets.length, unassigned: 3 }, places: { total: places.length, published: places.length, waitingLocation: 0 }, seed: {}, layers: [], settings: { hiddenLayers: [], pointsPublic: true, sourceUrl: '', title: '', importedAt: '', surveyDate: null } } })
    if (segments[0] === 'audit') return route.fulfill({ json: { ok: true, items: [] } })
    if (segments[0] === 'preview') return route.fulfill({ json: { ok: true, payload: segments[1] === 'community' ? buildCommunityReview({ households: seed.households, hamlets: seed.hamlets }) : segments[1] === 'places' ? { placed: [], pending: [] } : segments[1] === 'hamlets' ? { hamlets: [] } : { routes: [], alignment: 'manual', source: '' } } })
    if (segments[0] === 'settings') return route.fulfill({ json: { ok: true, settings: { hiddenLayers: [], pointsPublic: true, sourceUrl: '', title: '', importedAt: '', surveyDate: null }, layers: [] } })
    if (segments[0] === 'hamlets') return route.fulfill({ json: { ok: true, items: hamlets, unassigned: 3, suggestions: [] } })
    if (segments[0] === 'profiles') return route.fulfill({ json: { ok: true, items: [] } })
    if (segments[0] === 'evacuation') return route.fulfill({ json: { ok: true, groups: levelGroups(seed.households).map((group: { key: string }) => ({ ...group, inQueue: group.key !== '5' })), inQueue: 68, routes: { routes: [[[20.059, 99.364], [20.058, 99.359]]], alignment: 'manual', source: '' }, destinations: places } })
    if (segments[0] === 'places') {
      if (request.method() === 'GET') return route.fulfill({ json: { ok: true, items: places, counts: { all: places.length, published: places.length, waitingLocation: places.filter((place) => place.latitude === null).length } } })
      if (request.method() === 'POST' && !segments[1]) {
        const created = { id: `PL-000${places.length}`, ...body }
        places.push(created)
        return route.fulfill({ status: 201, json: { ok: true, place: created } })
      }
    }
    if (segments[0] === 'households') {
      if (request.method() === 'GET' && !segments[1]) return route.fulfill({ json: { ok: true, items: households, total: households.length, page: 1, pageSize: 200, counts: { all: households.length, hidden: 0 } } })
      if (request.method() === 'PUT' && segments[1]) {
        const current = households.find((household: { id: string }) => household.id === segments[1])!
        const answers = { ...current.answers, ...body.answers }
        return route.fulfill({ json: { ok: true, household: withLevels({ ...current, answers }), preview: [] } })
      }
    }
    return route.fulfill({ status: 404, json: { error: 'ไม่พบ' } })
  })
}

async function openMapData(page: Page) {
  await mockApi(page)
  await page.goto('/?view=admin')
  await page.locator('input[type=password]').fill('mock')
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
}

async function selectSidebarMenu(page: Page, name: string) {
  const nav = page.getByRole('navigation', { name: 'ส่วนงานแอดมิน' })
  const target = nav.getByRole('button', { name: new RegExp(`^${name}`) }).first()
  if (!(await target.isVisible())) {
    const menu = page.getByRole('button', { name: 'เปิดเมนูนำทาง' })
    if (await menu.isVisible()) await menu.click()
  }
  await target.click()
}

test('the overview shows what the public sees and the privacy reminder', async ({ page }) => {
  await openMapData(page)
  await selectSidebarMenu(page, 'ภาพรวม')
  await expect(page.getByText('อยู่ในคิวอพยพ')).toBeVisible()
  await expect(page.getByText('หมู่บ้านในทะเบียน')).toBeVisible()
  await expect(page.getByText('สถานที่สำคัญที่เผยแพร่')).toBeVisible()
  await expect(page.getByText('หน้าบ้านกำลังแสดงหมุดตำแหน่งรายครัวเรือน')).toHaveCount(0)
})

test('a place without coordinates is saved as waiting to be located and no contact is sent', async ({ page }) => {
  await openMapData(page)
  await selectSidebarMenu(page, 'สถานที่สำคัญ')
  await expect(page.getByText('ศูนย์พักพิงตามแผน').first()).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มสถานที่' }).click()
  await page.getByLabel('ชื่อสถานที่ *').fill('ศาลาประชาคม')
  await page.getByLabel('ชนิด *').selectOption('community_hall')
  await expect(page.getByText('ฉบับร่าง: หน้าบ้านยังไม่เห็น')).toBeVisible()
  await page.getByLabel('สถานะบนหน้าบ้าน').selectOption('published')
  await expect(page.getByText('หน้าบ้านแสดงในรายการ “รอผูกจุด” ไม่ปักบนแผนที่')).toBeVisible()
  await page.getByLabel('สถานะบนหน้าบ้าน').selectOption('draft')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page.getByText('บันทึกสถานที่เรียบร้อย')).toBeVisible()
  const sent = writes.find((write) => write.method === 'POST')!.body as Record<string, unknown>
  expect(sent).toMatchObject({ name: 'ศาลาประชาคม', kind: 'community_hall', latitude: null, longitude: null, status: 'draft' })
  expect(Object.keys(sent).some((key) => /phone|tel|contact/i.test(key))).toBe(false)
})

test.skip('changing an answer re-levels the household live and saves only through the form', async ({ page }) => {
  await openMapData(page)
  await selectSidebarMenu(page, 'ข้อมูลชุมชน')
  const normal = households.find((household: { levels: Record<string, { key: string }> }) => household.levels['layer-1']!.key === '5')!
  await page.getByRole('button', { name: normal.id, exact: true }).first().click()
  const summary = page.locator('summary', { hasText: 'กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต' })
  await expect(summary).toContainText('ระดับ 5')
  await page.locator('#hh-members').fill('2')
  await page.locator('#hh-ประวัติน้ำท่วมบ้าน').selectOption('เคยท่วมบ้าน')
  await expect(summary).toContainText('ระดับ 1')
  await expect(page.getByText('ป๊อปอัปที่หน้าบ้านเห็น')).toBeVisible()
  expect(writes).toHaveLength(0)
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page.getByText(/หน้าบ้านเห็นผลทันที.*ระดับ 5 → 1/)).toBeVisible()
  expect(writes[0]).toMatchObject({ method: 'PUT', url: `/api/admin/map-data/households/${normal.id}` })
})

for (const width of [375, 768, 1024, 1440]) {
  test(`the map data pages do not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openMapData(page)
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    for (const name of ['ภาพรวม', 'หมู่บ้าน', 'ตรวจตัวอย่างน้ำ', 'กลุ่มอพยพ', 'สถานที่สำคัญ']) {
      await selectSidebarMenu(page, name)
      await page.waitForTimeout(400)
      expect(await fits(), `${name} at ${width}px`).toBe(true)
    }
  })
}
