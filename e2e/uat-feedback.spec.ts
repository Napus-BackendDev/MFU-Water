import { expect, test, type Page } from '@playwright/test'

const existingWaypoint = {
  id: 'wp-existing-1',
  sample_code: 'KOK-OLD-0001',
  station_name: 'จุดตรวจ KOK-OLD-0001',
  arsenic_level_ppb: 10,
  latitude: 20.0585,
  longitude: 99.3615,
  gps_accuracy_meters: 8,
  created_at: new Date().toISOString(),
  collection_time: new Date().toISOString(),
  water_source: 'แม่น้ำ',
  rain_context: 'ไม่ทราบ',
  contributor_label: 'ต้นไม้ใจดี-112233',
  publication_status: 'auto_published',
  photo_count: 0,
}

async function mockSurveySubmission(page: Page) {
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({ json: [existingWaypoint] }))
  await page.route('**/api/surveys/prepare', (route) =>
    route.fulfill({
      json: {
        surveyId: '00000000-0000-4000-8000-000000000001',
        sampleCode: 'KOK-TEST-NEW1',
        ticket: 'mock.ticket',
        uploads: [],
      },
    }),
  )
  await page.route('**/api/surveys/complete', async (route) => {
    const body = route.request().postDataJSON()
    const ppb = Number(body.arsenicLevelPpb ?? 0)
    const status = ppb > 50 ? 'pending_review' : 'auto_published'
    await route.fulfill({
      status: 201,
      json: {
        id: 'wp-new-1',
        sample_code: 'KOK-TEST-NEW1',
        station_name: 'จุดตรวจ KOK-TEST-NEW1',
        arsenic_level_ppb: ppb,
        latitude: body.coordinates.latitude,
        longitude: body.coordinates.longitude,
        gps_accuracy_meters: body.gpsAccuracyMeters ?? 10,
        created_at: new Date().toISOString(),
        collection_time: body.sampleCollectedAt ?? new Date().toISOString(),
        water_source: 'แม่น้ำ',
        rain_context: 'ไม่ทราบ',
        contributor_label: 'ภูเขาอ่อนโยน-4bf3a7',
        publication_status: status,
        photo_count: 0,
      },
    })
  })
}

test('auto-locates user on entry and selects matching village when GPS is inside a target community', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  // Inside บ้านกะเหรี่ยงรวมมิตร (center ~ 19.9605, 99.7082)
  await context.setGeolocation({ latitude: 19.961, longitude: 99.709, accuracy: 12 })
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({ json: [existingWaypoint] }))

  await page.goto('/?welcome=off')
  await page.waitForSelector('.leaflet-container')

  await expect(page.locator('.kok-user-beacon')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.kok-user-label')).toHaveText('คุณอยู่ที่นี่')
  await expect(page.getByRole('button', { name: 'เลือกพื้นที่ชุมชนเป้าหมาย' })).toContainText('บ้านกะเหรี่ยงรวมมิตร')
})

test('auto-locates user outside target villages without changing default community', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  // Outside the 4 villages (MFU / Chiang Rai area)
  await context.setGeolocation({ latitude: 20.0465, longitude: 99.8926, accuracy: 15 })
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({ json: [existingWaypoint] }))

  await page.goto('/?welcome=off')
  await page.waitForSelector('.leaflet-container')

  await expect(page.locator('.kok-user-beacon')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('button', { name: 'เลือกพื้นที่ชุมชนเป้าหมาย' })).toContainText('บ้านท่าตอน')
  await expect(page.getByRole('button', { name: 'ตำแหน่งฉัน' })).toBeVisible()
})

test('existing survey points pulse, and submitting <= 50 ppb pans to the point, switches village, and opens popup', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  // Submit coordinates in บ้านปงของ while starting in บ้านท่าตอน
  await context.setGeolocation({ latitude: 20.308, longitude: 100.21, accuracy: 8 })
  await mockSurveySubmission(page)

  await page.goto('/?welcome=off&community=thaton')
  await page.waitForSelector('.leaflet-container')

  // Existing survey pin also has pulse animation
  await expect(page.locator('.kok-pin-pulse').first()).toBeVisible()

  await page.getByRole('button', { name: 'ทำแบบสำรวจ' }).first().click()
  const form = page.getByRole('dialog', { name: 'ทำแบบสำรวจ' })
  await form.getByPlaceholder('ระบุชื่อ-นามสกุลผู้เก็บตัวอย่าง').fill('ผู้ทดสอบ อพยพ')
  await form.getByPlaceholder('08X-XXX-XXXX').fill('0812345678')
  await form.getByLabel('ชุดตรวจที่ใช้').selectOption('ADPC')
  await form.getByRole('radio', { name: '4: 30 ppb' }).click()
  await form.getByRole('button', { name: /พิกัด GPS/ }).click()
  await expect(form.getByText(/ความแม่นยำ GPS/)).toBeVisible()
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }).click()

  await expect(form).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'เลือกพื้นที่ชุมชนเป้าหมาย' })).toContainText('บ้านปงของ')
  await expect(page.locator('.kok-pin-tag')).toHaveText('จุดที่บันทึกใหม่')
  const popup = page.locator('.kok-popup').last()
  await expect(popup).toBeVisible({ timeout: 10000 })
  await expect(popup.locator('.kok-pop-badge-new')).toContainText('จุดที่คุณเพิ่งบันทึก')
  await expect(popup).toContainText('30 ppb')
})

test('submitting > 50 ppb pans to coordinates, renders temporary pending beacon, and opens popup', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 20.0592, longitude: 99.3622, accuracy: 9 })
  await mockSurveySubmission(page)

  await page.goto('/?welcome=off&community=thaton')
  await page.waitForSelector('.leaflet-container')

  await page.getByRole('button', { name: 'ทำแบบสำรวจ' }).first().click()
  const form = page.getByRole('dialog', { name: 'ทำแบบสำรวจ' })
  await form.getByPlaceholder('ระบุชื่อ-นามสกุลผู้เก็บตัวอย่าง').fill('ผู้ทดสอบ สูง')
  await form.getByPlaceholder('08X-XXX-XXXX').fill('0812345678')
  await form.getByLabel('ชุดตรวจที่ใช้').selectOption('Oxfam')
  await form.getByRole('radio', { name: '6: 100 ppb' }).click()
  await form.getByRole('button', { name: /พิกัด GPS/ }).click()
  await expect(form.getByText(/ความแม่นยำ GPS/)).toBeVisible()
  await form.getByRole('checkbox').check()
  await form.getByRole('button', { name: 'ส่งข้อมูลบันทึก' }).click()

  await expect(form).toHaveCount(0)
  await expect(page.locator('.kok-pin-tag.is-pending')).toContainText('รอแอดมินตรวจ')
  const popup = page.locator('.kok-popup').last()
  await expect(popup).toBeVisible({ timeout: 10000 })
  await expect(popup.locator('.kok-pop-badge-pending')).toContainText('รอแอดมินตรวจ')
  await expect(popup).toContainText('100 ppb')
})

test('enlarged public fonts do not overflow horizontally on mobile (375px) or desktop (1280px)', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 20.058, longitude: 99.361, accuracy: 10 })
  await page.route('**/api/surveys/waypoints', (route) => route.fulfill({ json: [existingWaypoint] }))

  for (const vp of [{ width: 375, height: 812, name: 'mobile' }, { width: 1280, height: 800, name: 'desktop' }]) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/?welcome=off')
    await page.waitForSelector('.leaflet-container')
    await expect(page.locator('.kok-user-beacon')).toBeVisible({ timeout: 10000 })
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    expect(fits).toBe(true)
    await page.screenshot({ path: `C:/Users/asus/.gemini/antigravity/brain/a1eec811-5268-4bf2-892a-a2dc8fba79f9/uat-verify-${vp.name}.png` })
  }
})
