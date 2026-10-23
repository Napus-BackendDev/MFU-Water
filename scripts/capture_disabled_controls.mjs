import { chromium } from 'playwright'
import path from 'path'

const artifactDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\f386505b-1245-4a67-ae33-cfdd96158916'

async function captureDisabledButtons() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  console.log('Opening dashboard...')
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Verify hamlets and places buttons are disabled
  const hamletsBtn = page.locator('button.map-type-option:has-text("หย่อมบ้าน")')
  const placesBtn = page.locator('button.map-type-option:has-text("สถานที่สำคัญ")')
  const floodBtn = page.locator('button.map-type-option:has-text("น้ำท่วม")')
  const evacBtn = page.locator('button.map-type-option:has-text("อพยพกลุ่มเปราะบาง")')

  console.log('หย่อมบ้าน disabled:', await hamletsBtn.isDisabled())
  console.log('สถานที่สำคัญ disabled:', await placesBtn.isDisabled())
  console.log('น้ำท่วม disabled:', await floodBtn.isDisabled())
  console.log('อพยพกลุ่มเปราะบาง disabled:', await evacBtn.isDisabled())

  // Take screenshot of overview with bottom control
  const imgPath = path.join(artifactDir, 'verify_04_disabled_red_buttons.png')
  await page.screenshot({ path: imgPath, fullPage: false })
  console.log('Screenshot saved to:', imgPath)

  // Click on "น้ำท่วม" to see flood layer active
  await floodBtn.click()
  await page.waitForTimeout(1500)
  const floodActiveImgPath = path.join(artifactDir, 'verify_05_flood_active_red_others.png')
  await page.screenshot({ path: floodActiveImgPath, fullPage: false })
  console.log('Screenshot saved to:', floodActiveImgPath)

  await browser.close()
}

captureDisabledButtons().catch((e) => {
  console.error(e)
  process.exit(1)
})
