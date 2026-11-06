// ถ่ายต้นแบบ 4 แท็บจากแอปที่รันอยู่ (dev) โดยฉีดข้อมูลตัวอย่างลงหน้าเว็บตอนถ่าย ไม่แก้โค้ดแอป
// ต้องเปิด dev server ที่ :5173 ก่อน แล้วรัน: node docs/mockups/four-tabs-capture.mjs
import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch'
const OUT = path.join(ROOT, 'docs/mockups/shots/four-tabs')
fs.mkdirSync(OUT, { recursive: true })

// ยอดรวมรายหย่อมคำนวณจากชั้นสำรวจ เก็บเฉพาะยอดรวม ไม่ส่งรายบ้านเข้าภาพ
const survey = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/mymaps/thaton.json'), 'utf8'))
const rowsOf = (id) => {
  const layer = survey.layers.find((l) => l.id === id)
  return Object.values(layer).find((v) => Array.isArray(v) && v[0]?.fields)
}
const HAMLETS = [
  ['บ้านดินกี่', [0, 0]],
  ['บ้านใต้', [34, 14]],
  ['สายกองกาด', [-40, -16]],
  ['บ้านเด่นหก', [0, 0]],
  ['บ้านเด่นห้า', [0, 0]],
  ['บ้านใหม่พัฒนา', [0, 0]],
].map(([name, offset]) => {
  const inZone = (id) => rowsOf(id).filter((r) => r.fields['โซน'] === name)
  const base = inZone('layer-1')
  const pts = base.map((r) => [r.latitude, r.longitude])
  const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
  return {
    name, offset, center: c,
    total: base.length,
    flooded: base.filter((r) => r.fields['ประวัติน้ำท่วมบ้าน'] === 'เคยท่วมบ้าน').length,
    deep: inZone('layer-2').filter((r) => /^ระดับ(เอว|ท่วมมิด)/.test(r.fields['ระดับความลึกน้ำท่วมที่บ้าน'])).length,
    noReserve: inZone('layer-4').filter((r) => r.fields['ระบบน้ำสำรองฉุกเฉิน'].startsWith('ไม่มีภาชนะ')).length,
    noWarning: inZone('layer-6').filter((r) => r.fields['เตือนภัยล่วงหน้าน้ำท่วม'] === 'ไม่เคยได้รับ').length,
    noPlan: inZone('layer-6').filter((r) => r.fields['แผนรับมือน้ำท่วม'].startsWith('ไม่มีแผนเลย')).length,
  }
})

const CSS = `
.pt-panel{position:fixed;z-index:1200;background:#fff;color:#0F172A;border:1px solid #E2E8F0;border-radius:16px;box-shadow:0 8px 28px rgba(15,23,42,.16);font-family:'Noto Sans Thai',Inter,Tahoma,sans-serif;padding:14px 16px;font-size:13px;line-height:1.45;overflow:hidden}
.pt-d{right:16px;top:76px;width:352px}
.pt-m{left:8px;right:8px;bottom:70px}
.pt-m .d-only{display:none!important}
.pt-panel h3{margin:0;font-size:16px;font-weight:700}
.pt-sub{color:#64748B;font-size:12px;margin:1px 0 8px}
.pt-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}
.pt-kpi{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:6px 10px}
.pt-kpi b{display:block;font-size:20px;line-height:1.2;font-family:'JetBrains Mono',ui-monospace,monospace}
.pt-kpi span{font-size:11px;color:#64748B}
.pt-row{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid #F1F5F9}
.pt-row:first-of-type{border-top:0}
.pt-dot{width:10px;height:10px;border-radius:50%;flex:none;margin-top:5px}
.pt-tag{display:inline-block;font-size:10.5px;font-weight:600;border-radius:999px;padding:1px 8px;background:#F1F5F9;color:#64748B;white-space:nowrap}
.pt-box{border-radius:10px;padding:8px 10px;margin-top:8px;font-size:12px}
.pt-warn{background:#FFFBEB;border:1px solid #FDE68A;color:#92400E}
.pt-info{background:#F0F9FF;border:1px solid #BAE6FD;color:#075985}
.pt-btns{display:flex;gap:6px;margin-top:8px}
.pt-btn{flex:1;text-align:center;border:1px solid #E2E8F0;border-radius:10px;padding:7px 6px;font-weight:600;font-size:12px;color:#0284C7;background:#fff}
.pt-chip{display:inline-block;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;background:#F1F5F9;color:#334155;margin:0 4px 4px 0}
.pt-chip.on{background:#E0F2FE;color:#0369A1}
.pt-lab{font:700 11.5px 'Noto Sans Thai',sans-serif;color:#0F172A;background:rgba(255,255,255,.92);border-radius:8px;padding:2px 7px;box-shadow:0 1px 4px rgba(0,0,0,.25);text-align:center;white-space:nowrap;transform:translate(-50%,-50%);width:max-content;line-height:1.3}
.pt-lab small{display:block;font-size:10.5px;font-weight:600;color:#475569}
.pt-pin{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:15px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transform:translate(-50%,-50%)}
.pt-dia{width:24px;height:24px;transform:translate(-50%,-50%) rotate(45deg);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);background:#DC2626}
.pt-ribbon{position:fixed;z-index:1300;left:50%;top:10px;transform:translateX(-50%);background:#0F172A;color:#fff;font:600 12px 'Noto Sans Thai',sans-serif;padding:4px 12px;border-radius:999px;white-space:nowrap}
.evacuation-legend,.community-household-review-marker{display:none!important}
.leaflet-control-attribution{font-size:9px}
`

const hamletPanel = (h) => `
  <h3 data-n="2">หย่อม${h.name}</h3>
  <div class="pt-sub">ผลสำรวจ ${h.total} ครัวเรือน · ยอดรวม ไม่แสดงรายบ้าน</div>
  <div class="pt-grid" data-n="3">
    <div class="pt-kpi"><b style="color:#DC2626">${h.flooded}</b><span>เคยน้ำท่วมบ้าน</span></div>
    <div class="pt-kpi"><b style="color:#D97706">${h.deep}</b><span>น้ำลึกระดับเอวขึ้นไป</span></div>
    <div class="pt-kpi d-only"><b>${h.noReserve}</b><span>ไม่มีน้ำสำรองเลย</span></div>
    <div class="pt-kpi d-only"><b>${h.noWarning}</b><span>ไม่เคยได้รับการเตือน</span></div>
  </div>
  <div class="pt-box pt-info d-only" data-n="4">ทั้งท่าตอน: เคยท่วม 60 จาก 129 · มีแผนที่เชื่อมกับชุมชนเพียง 6 จาก 129</div>
  <div class="pt-box pt-warn d-only" data-n="5">เป็นผลสำรวจบางครัวเรือน ไม่ใช่ทุกบ้านในหย่อม<br>หย่อมที่มีไม่ถึง 5 แถวรวมเป็น "อื่น ๆ" เพื่อไม่ให้ระบุตัวบ้านได้</div>`

const profilePanel = `
  <h3 data-n="1">รู้จักชุมชน · บ้านปากอิงใต้</h3>
  <div class="pt-sub">ต.ศรีดอนชัย อ.เชียงของ จ.เชียงราย</div>
  <div class="pt-row" data-n="2"><span class="pt-tag">ลุ่มน้ำ</span><div>จุดบรรจบแม่น้ำอิงกับโขง ที่ราบลุ่ม 350–370 ม.</div></div>
  <div class="pt-row"><span class="pt-tag">ผู้คน</span><div>ไทยวน ไทลื้อ</div></div>
  <div class="pt-row"><span class="pt-tag">อาชีพ</span><div>ประมงพื้นบ้าน นาลุ่มน้ำท่วมถึง</div></div>
  <div class="pt-row" data-n="3"><span class="pt-tag">ความเสี่ยง</span><div>น้ำเท้อจากโขงสูง ปลาธรรมชาติลด ผักตบชวา</div></div>
  <div class="pt-box pt-warn" data-n="4">ยังไม่มีขอบเขตหย่อมและผลสำรวจรายหย่อมของชุมชนนี้</div>`

const chemicalPanel = `
  <h3 data-n="3">KK02 · สะพานแม่นาวาง-ท่าตอน</h3>
  <div class="pt-sub">ผลทางการ กรมควบคุมมลพิษ · รอบ 22 (3–7 ส.ค. 2569)</div>
  <div class="pt-grid">
    <div class="pt-kpi"><b style="color:#DC2626">11 ppb</b><span>สารหนู 0.011 mg/L · เกณฑ์ 10</span></div>
    <div class="pt-kpi"><b>334–437</b><span>ความขุ่น KK01–02 (NTU)</span></div>
  </div>
  <div class="pt-box pt-info" data-n="4"><b>กินอยู่อย่างไรให้ปลอดภัย</b><br>• เลี่ยงหอยน้ำจืด (สารหนูสูงสุด 7.75 เกณฑ์ 2.0 mg/kg)<br>• เนื้อปลากินได้ เลี่ยงเครื่องใน<br><span class="d-only">• ประปาหมู่บ้านผ่านเกณฑ์ ครั้งที่ 11 (17–19 ส.ค. 69)</span></div>
  <div class="pt-row d-only" data-n="5" style="margin-top:6px"><span class="pt-dot" style="background:#0284C7"></span><div><b>WORA ท่าเรือท่าตอน</b> วัดความขุ่นทุก 30 นาที<br><span class="pt-tag">รอเชื่อมข้อมูล</span></div></div>
  <div class="pt-sub d-only" data-n="6" style="margin:6px 0 0">ชุดตรวจชาวบ้านวัดเฉพาะสารหนู · ● ชาวบ้าน ◆ ทางการ</div>`

const placesPanel = `
  <h3>สถานที่ต้องรู้ · ท่าตอน</h3>
  <div style="margin:8px 0 4px" data-n="2">
    <span class="pt-chip on">ทั้งหมด</span><span class="pt-chip">สุขภาพ</span><span class="pt-chip">น้ำ</span><span class="pt-chip">ที่พักพิง</span><span class="pt-chip">เดินทาง</span>
  </div>
  <div class="pt-row d-only" data-n="3"><span class="pt-dot" style="background:#047857"></span><div><b>มีพิกัดแล้ว 5 แห่ง</b><br>ท่าเรือสาธารณะ · Wat Matukaram · Masjid Al-Rahmah · ศูนย์พักพิงตามแผน · จุดรวมพลตามแผน</div></div>
  <div class="pt-row" data-n="4"><span class="pt-dot" style="background:#94A3B8"></span><div><b>อยู่ในแผน ยังไม่มีพิกัด</b><br>รพ.สต. · ประปาชุมชน · ศาลาประชาคม (100 คน) · วัดท่าตอน (300 คน)</div></div>
  <div class="pt-box pt-warn d-only" data-n="5">ไม่ปักหมุดเดา รายการเต็ม 14 ประเภทอยู่ในแผน F1 และ Google Earth ของ SWG5 ซึ่งยังไม่อยู่ในเครื่อง</div>
  <div class="pt-btns" data-n="6"><span class="pt-btn">☎ โทร</span><span class="pt-btn">นำทาง</span></div>`

const evacuationPanel = `
  <h3>เมื่อน้ำมา · ท่าตอน</h3>
  <div class="pt-grid" data-n="4">
    <div class="pt-kpi"><b>100</b><span>ศาลาประชาคม (คน)</span></div>
    <div class="pt-kpi"><b>300</b><span>วัดท่าตอน (คน)</span></div>
  </div>
  <div class="pt-row d-only" data-n="5"><span class="pt-tag">กลุ่มเปราะบาง</span><div>รวม 67 บ้าน: เด็กและผู้สูงอายุ 25 · เด็ก 21 · ผู้สูงอายุ 15 · ผู้พิการ 6</div></div>
  <div class="pt-row d-only" data-n="6"><span class="pt-tag">ขั้นตอน</span><div style="color:#92400E">รอเนื้อหา 12 ขั้นและข้อควรทำจากแผน F1</div></div>
  <div class="pt-row" data-n="7"><span class="pt-tag">ผู้ประสาน</span><div style="color:#92400E">รอชื่อ เบอร์ และความยินยอม</div></div>
  <div class="pt-btns" data-n="8"><span class="pt-btn">Thai Water</span><span class="pt-btn">Windy</span></div>
  <div class="pt-sub d-only" style="margin:6px 0 0">สีม่วง = น้ำจากดาวเทียม ปี 2567 รวมแม่น้ำเดิม ไม่ใช่ความลึก</div>
  <div class="pt-box pt-warn d-only">ตำแหน่งที่พักและเส้นทางเป็นค่าประมาณ ยังไม่ตรวจภาคสนาม · พิกัดรายบ้านอยู่หลังล็อกอินสำหรับผู้ช่วยเหลือ</div>`

const SCREENS = [
  { key: 'hamlets', community: 'thaton', tab: 'hamlets', center: [20.0568, 99.3618], zoom: 16, panel: hamletPanel(HAMLETS[0]), tabNote: 1 },
  { key: 'hamlets-other', community: 'pakingtai', tab: 'hamlets', panel: profilePanel, tabNote: 0, ribbon: 'ชุมชนที่ยังไม่มีข้อมูลหย่อม' },
  { key: 'chemical', community: 'thaton', tab: 'chemical', center: [20.0595, 99.3640], zoom: 16, panel: chemicalPanel, tabNote: 0 },
  { key: 'places', community: 'thaton', tab: 'places', center: [20.0555, 99.3620], zoom: 16, panel: placesPanel, tabNote: 0 },
  { key: 'evacuation', community: 'thaton', tab: 'evacuation', center: [20.0560, 99.3640], zoom: 15, panel: evacuationPanel, tabNote: 0 },
]

const COLORS = { hamlets: '#6D28D9', chemical: '#0284C7', places: '#047857', evacuation: '#B45309' }
const ORDER = ['hamlets', 'chemical', 'places', 'evacuation']

async function shoot(browser, screen, device) {
  const mobile = device === 'm'
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: mobile,
  })
  await page.addInitScript((id) => localStorage.setItem('kok_selected_community', id), screen.community)
  await page.goto('http://localhost:5173/?welcome=off', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.leaflet-container', { timeout: 90000, state: 'attached' })
  await page.waitForFunction(() => document.querySelector('.leaflet-container')?.__vueParentComponent?.setupState?.mapInstance)
  await page.waitForTimeout(2500)
  await page.addStyleTag({ content: CSS })

  await page.evaluate(async ({ screen, mobile, COLORS, ORDER }) => {
    const el = document.querySelector('.leaflet-container')
    let c = el.__vueParentComponent
    while (c && !(c.setupState && 'activeCommunityMapType' in c.setupState)) c = c.parent
    const app = c.setupState
    app.selectedCommunityId = screen.community
    app.activeCommunityMapType = screen.tab
    if (screen.tab === 'evacuation') { app.observationDate = '2024'; app.observationsVisible = true }
    if (screen.tab === 'chemical') app.selectedTimeRange = '30d'
    await new Promise((r) => setTimeout(r, 1200))
    // ต้นแบบเปิดครบ 4 แท็บ: ปลดสถานะปิดเฉพาะในภาพนี้
    document.querySelectorAll('.map-type-option').forEach((b, i) => {
      b.disabled = false
      b.classList.remove('disabled')
      b.style.setProperty('--type-color', COLORS[ORDER[i]])
    })
    document.querySelectorAll('nav[aria-label="เมนูประเภทแผนที่"] button').forEach((b, i) => {
      b.disabled = false
      b.classList.remove('opacity-40', 'cursor-not-allowed', 'text-slate-400')
      if (ORDER[i] === screen.tab) {
        b.style.color = COLORS[ORDER[i]]
        b.style.backgroundColor = `color-mix(in srgb, ${COLORS[ORDER[i]]} 14%, transparent)`
      } else b.classList.add('text-slate-600')
    })
  }, { screen, mobile, COLORS, ORDER })

  await page.evaluate(({ screen, mobile, HAMLETS }) => {
    const panelComp = document.querySelector('.leaflet-container').__vueParentComponent.setupState
    const { mapInstance: map, L } = panelComp
    if (screen.center) map.setView(screen.center, mobile ? screen.zoom - 1 : screen.zoom, { animate: false })
    const notes = window.__notes = []
    const icon = (html) => L.divIcon({ html, className: '', iconSize: [0, 0] })
    const pin = (latlng, color, glyph, n) => {
      L.marker(latlng, { icon: icon(`<div class="pt-pin" style="background:${color}">${glyph}</div>`) }).addTo(map)
      if (n) notes.push({ n, latlng })
    }
    if (screen.key === 'hamlets') {
      for (const h of HAMLETS) {
        const r = h.flooded / h.total
        const color = r >= 0.7 ? '#DC2626' : r >= 0.3 ? '#D97706' : '#16A34A'
        L.circle(h.center, { radius: 45 + h.total * 4.5, color: h === HAMLETS[0] ? '#0F172A' : color, weight: h === HAMLETS[0] ? 3 : 2, fillColor: color, fillOpacity: 0.3, interactive: false }).addTo(map)
        const p = map.latLngToLayerPoint(h.center).add(h.offset)
        L.marker(map.layerPointToLatLng(p), { icon: icon(`<div class="pt-lab">${h.name}<small>ท่วม ${h.flooded}/${h.total}</small></div>`), interactive: false }).addTo(map)
      }
      notes.push({ n: 1, latlng: HAMLETS[0].center })
      notes.push({ n: 6, latlng: HAMLETS[3].center })
    }
    if (screen.key === 'chemical') {
      const bridge = [20.0613, 99.3630]
      L.marker(bridge, { icon: icon('<div class="pt-dia"></div>') }).addTo(map)
      notes.push({ n: 2, latlng: bridge })
      pin([20.06022, 99.36254], '#0284C7', '≈', 0)
    }
    if (screen.key === 'places') {
      const named = (latlng, color, glyph, name, dy = 26) => {
        pin(latlng, color, glyph, 0)
        L.marker(latlng, { icon: icon(`<div class="pt-lab" style="margin-top:${dy}px">${name}</div>`), interactive: false }).addTo(map)
      }
      pin([20.06022, 99.36254], '#0369A1', '⚓', 1)
      named([20.06022, 99.36254], '#0369A1', '⚓', 'ท่าเรือสาธารณะ', -30)
      named([20.0567, 99.35827], '#047857', '⌂', 'Wat Matukaram')
      named([20.05962, 99.3624], '#047857', '⌂', 'Masjid Al-Rahmah')
      named([20.05842, 99.35875], '#B45309', '⌂', 'ศูนย์พักพิงตามแผน')
      named([20.04983, 99.36727], '#B45309', '⚑', 'จุดรวมพลตามแผน')
    }
    if (screen.key === 'evacuation') {
      notes.push({ n: 1, latlng: [20.0600, 99.3660] })
      notes.push({ n: 2, latlng: [20.05842, 99.35875] })
      notes.push({ n: 3, latlng: [20.04983, 99.36727] })
    }
    const panel = document.createElement('div')
    panel.className = `pt-panel ${mobile ? 'pt-m' : 'pt-d'}`
    panel.innerHTML = screen.panel
    document.body.appendChild(panel)
    const rb = document.createElement('div')
    rb.className = 'pt-ribbon'
    rb.textContent = screen.ribbon ? `ต้นแบบ · ${screen.ribbon}` : 'ต้นแบบ · ยังไม่อยู่ในระบบจริง'
    document.body.appendChild(rb)
  }, { screen, mobile, HAMLETS })

  await page.waitForTimeout(2500)
  const rects = await page.evaluate(() => {
    const map = document.querySelector('.leaflet-container').__vueParentComponent.setupState.mapInstance
    const box = document.querySelector('.leaflet-container').getBoundingClientRect()
    const out = (window.__notes || []).map((a) => {
      const p = map.latLngToContainerPoint(a.latlng)
      return { n: a.n, x: p.x + box.left, y: p.y + box.top }
    })
    document.querySelectorAll('[data-n]').forEach((e) => {
      const r = e.getBoundingClientRect()
      if (r.width) out.push({ n: Number(e.dataset.n), x: r.left, y: r.top + r.height / 2 })
    })
    const survey = document.querySelector('.survey-button')
    if (survey?.getBoundingClientRect().width && !window.__noSurveyNote) { const r = survey.getBoundingClientRect(); out.push({ n: 1, x: r.left, y: r.top + r.height / 2 }) }
    const tab = [...document.querySelectorAll('.map-type-option')].find((b) => b.getAttribute('aria-pressed') === 'true')
    if (tab) { const r = tab.getBoundingClientRect(); out.push({ n: 'tab', x: r.left + r.width / 2, y: r.top }) }
    return out
  })
  const file = `${screen.key}-${device}.jpg`
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 84 })
  await page.close()
  return { file, rects }
}

const browser = await chromium.launch()
const result = {}
for (const screen of SCREENS) {
  for (const device of ['d', 'm']) {
    result[`${screen.key}-${device}`] = await shoot(browser, screen, device)
    console.log('shot', screen.key, device)
  }
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(result, null, 1))
