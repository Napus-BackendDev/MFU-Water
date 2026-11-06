import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  buildEvacuationQueue,
  summarizeHouseholdLevels,
  type EvacuationDestination,
  type HouseholdSourceRecord,
} from '../app/utils/evacuation-queue'

function getTestData() {
  const thatonJson = JSON.parse(readFileSync('data/private/thaton.json', 'utf8'))
  const l1 = thatonJson.layers.find((l: any) => l.id === 'layer-1')
  const records = l1.records as HouseholdSourceRecord[]

  const destJson = JSON.parse(readFileSync('data/private/public-evacuation-reference.json', 'utf8'))
  const destinations = destJson.points as EvacuationDestination[]

  const initialQueue = buildEvacuationQueue(records, destinations)
  const levelSummary = summarizeHouseholdLevels(records)

  return { destinations, initialQueue, levelSummary }
}

test.describe('Mobile Evacuation Mode (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Start run -> select rank 1 -> click arrived -> progress updates to 1/68', async ({ page }) => {
    const { destinations, initialQueue, levelSummary } = getTestData()

    let runStatus: 'idle' | 'open' = 'idle'
    const queue = JSON.parse(JSON.stringify(initialQueue))

    // Set mock admin token and selected community in session/local storage
    await page.addInitScript(() => {
      localStorage.setItem('kok_selected_community', 'thaton')
      sessionStorage.setItem('kok_admin_token', '1.mock_admin_token')
      sessionStorage.setItem('kok_admin_reviewer', 'ทีมช่วยเหลือ ก')
    })

    // Mock backend evacuation API with stateful transitions
    await page.route('**/api/admin/evacuation**', async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const method = req.method()

      if (url.pathname === '/api/admin/evacuation' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            run: {
              run_id: runStatus === 'open' ? 'evac_thaton_run_1' : undefined,
              community_id: 'thaton',
              status: runStatus,
            },
            queue,
            destinations: destinations.map((d) => ({
              ...d,
              assignedCount: queue.filter((q: any) => q.destinationId === d.id).length,
              arrivedCount: queue.filter((q: any) => q.destinationId === d.id && q.status === 'arrived').length,
              enRouteCount: queue.filter((q: any) => q.destinationId === d.id && q.status === 'en_route').length,
              waitingCount: queue.filter((q: any) => q.destinationId === d.id && q.status === 'waiting').length,
              capacityLabel: 'ความจุรอยืนยัน',
              verificationStatus: 'approximate_not_field_verified',
            })),
            levelGroups: { groups: levelSummary },
          }),
        })
      }

      if (url.pathname === '/api/admin/evacuation/start' && method === 'POST') {
        runStatus = 'open'
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            run: {
              run_id: 'evac_thaton_run_1',
              community_id: 'thaton',
              status: 'open',
              started_at: new Date().toISOString(),
              started_by: 'ทีมช่วยเหลือ ก',
            },
            queue,
            destinations,
          }),
        })
      }

      if (url.pathname.includes('/cases/') && method === 'PATCH') {
        const parts = url.pathname.split('/')
        const householdId = parts[parts.length - 1]
        const body = req.postDataJSON()
        const target = queue.find((q: any) => q.id === householdId)
        if (target) {
          target.status = body.status
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, household_id: householdId, status: body.status }),
        })
      }

      return route.continue()
    })

    // 1. Open app directly with welcome modal off
    await page.goto('/?welcome=off&community=thaton')

    // 2. Switch to evacuation tab from the bottom navigation bar
    const evacTabBtn = page.getByRole('button', { name: /อพยพ/ }).last()
    await evacTabBtn.click()

    // 3. Click the red CTA button to enter evacuation mode
    const enterEvacBtn = page.getByRole('button', { name: /โหมดอพยพ \(ทีม\)/ })
    await expect(enterEvacBtn).toBeVisible()
    await enterEvacBtn.click()

    // 4. Verify evacuation header is visible and normal bottom nav is hidden
    await expect(page.getByText('โหมดอพยพ · บ้านท่าตอน')).toBeVisible()
    await expect(page.getByText('ล็อกอินแล้ว')).toBeVisible()

    // 5. Start View: Assert 68 houses summary and level breakdown
    await expect(page.getByText(/บ้านที่ต้องอพยพ 68 บ้าน/)).toBeVisible()
    await expect(page.getByText(/จากแบบสำรวจ 129 ครัวเรือน/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'เริ่มอพยพตามลำดับ' })).toBeVisible()

    // 6. Click "เริ่มอพยพตามลำดับ" to start active run
    await page.getByRole('button', { name: 'เริ่มอพยพตามลำดับ' }).click()

    // 7. Queue View: Assert progress starts at 0/68 and Rank 1 is displayed
    await expect(page.getByText(/อพยพแล้ว 0\/68/)).toBeVisible()
    const firstRow = page.locator('.ev-row').first()
    await expect(firstRow).toBeVisible()
    await expect(firstRow).toContainText('วิกฤตสูงสุด')
    await expect(firstRow).toContainText('เปราะบาง 2 คน')
    await expect(firstRow).toContainText('รอ')

    // 8. Select Rank 1 case (MM1-054)
    await firstRow.click()

    // 9. Case Detail View: Assert details, privacy warning, and action buttons
    await expect(page.getByText(/อันดับ 1 จาก 68 บ้าน/)).toBeVisible()
    await expect(page.getByText('MM1-054')).toBeVisible()
    await expect(page.getByText('ยังไม่มีในชุดข้อมูล')).toBeVisible() // Privacy requirement: no invented phone numbers
    await expect(page.getByRole('button', { name: 'นำทาง' })).toBeVisible()
    // No dead call button: the screen says plainly that no number was collected.
    await expect(page.getByRole('button', { name: 'โทร' })).toHaveCount(0)
    await expect(page.getByText('ยังไม่มีเบอร์')).toBeVisible()

    // 10. Click "อพยพแล้ว ✓" button
    const arrivedBtn = page.getByRole('button', { name: 'อพยพแล้ว ✓' })
    await arrivedBtn.click()

    // 11. Return to queue list
    const backBtn = page.getByRole('button', { name: 'กลับคิว' })
    await backBtn.click()

    // 12. Verify progress updates to 1/68
    await expect(page.getByText(/อพยพแล้ว 1\/68/)).toBeVisible()
    await expect(page.locator('.ev-row').first()).toContainText('ถึงแล้ว')
  })
})
