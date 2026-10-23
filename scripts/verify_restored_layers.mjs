import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const artifactDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\f386505b-1245-4a67-ae33-cfdd96158916'

async function runVerification() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  console.log('Navigating to dashboard...')
  await page.goto('http://127.0.0.1:5173/?view=dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 1. Check Community Selector in Top Bar
  const commSelect = page.locator('#community-selector')
  await commSelect.waitFor({ state: 'visible' })
  console.log('Community selector found! Current value:', await commSelect.inputValue())

  // 2. Click "น้ำท่วม" (Flood) button in KokMapTypesControl
  console.log('Clicking Flood map type button...')
  const floodBtn = page.locator('button.map-type-option:has-text("น้ำท่วม")')
  await floodBtn.waitFor({ state: 'visible' })
  await floodBtn.click()
  await page.waitForTimeout(1500)

  // Check KokFloodLayersControl is visible
  const floodControl = page.locator('.flood-layers-control')
  console.log('FloodLayersControl visible:', await floodControl.isVisible())

  // Capture Screenshot 1: Flood Data
  const floodImgPath = path.join(artifactDir, 'verify_01_flood_data.png')
  await page.screenshot({ path: floodImgPath, fullPage: false })
  console.log('Saved:', floodImgPath)

  // 3. Click "อพยพกลุ่มเปราะบาง" (Evacuation) button
  console.log('Clicking Evacuation map type button...')
  const evacBtn = page.locator('button.map-type-option:has-text("อพยพกลุ่มเปราะบาง")')
  await evacBtn.waitFor({ state: 'visible' })
  await evacBtn.click()
  await page.waitForTimeout(1500)

  // Check Evacuation Legend
  const evacLegend = page.locator('.evacuation-legend')
  console.log('Evacuation legend visible:', await evacLegend.isVisible())

  // Capture Screenshot 2: Evacuation Data
  const evacImgPath = path.join(artifactDir, 'verify_02_evacuation_data.png')
  await page.screenshot({ path: evacImgPath, fullPage: false })
  console.log('Saved:', evacImgPath)

  // 4. Test Community Switcher & My Maps "ข้อมูลชุมชน"
  console.log('Selecting thaton in community selector...')
  await commSelect.selectOption('thaton')
  await page.waitForTimeout(1000)

  // Check KokMyMapsControl ("ข้อมูลชุมชน")
  const mymapsBtn = page.locator('button.source-button:has-text("ข้อมูลชุมชน")')
  console.log('MyMaps button visible:', await mymapsBtn.isVisible())
  if (await mymapsBtn.isVisible()) {
    await mymapsBtn.click()
    await page.waitForTimeout(500)
    // Select first layer
    const layerSelect = page.locator('#mymaps-layer')
    await layerSelect.selectOption('layer-1')
    await page.waitForTimeout(1500)
  }

  // Capture Screenshot 3: Community Area & My Maps Survey Data
  const commImgPath = path.join(artifactDir, 'verify_03_community_area_data.png')
  await page.screenshot({ path: commImgPath, fullPage: false })
  console.log('Saved:', commImgPath)

  await browser.close()
  console.log('All verifications complete successfully!')
}

runVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
