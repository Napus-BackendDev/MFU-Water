// ถ่ายต้นแบบ flow อพยพกลุ่มเปราะบาง (โหมดทีมช่วยเหลือบนมือถือ) จากแอปที่รันอยู่ ฉีด UI ตอนถ่ายเท่านั้น ไม่แก้โค้ดแอป
// ไม่ใช้แบบจำลองน้ำ: คิวมาจากชั้นกลุ่มเปราะบางและเหตุฉุกเฉินวิกฤตของข้อมูลชุมชน
// รัน: node docs/mockups/evac-flow-capture.mjs   (ต้องมี dev server ที่ :5173)
import { chromium } from 'file:///C:/Users/asus/Desktop/Fastwork/mfu%20kok%20water%20watch/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch'
const OUT = path.join(ROOT, 'docs/mockups/shots/evac-flow')
fs.mkdirSync(OUT, { recursive: true })

const CSS = `
header.no-print,.mymaps-control,.evacuation-legend,nav[aria-label="เมนูประเภทแผนที่"],.map-types-control{display:none!important}
.ev{position:fixed;z-index:1200;font-family:'Noto Sans Thai',Inter,Tahoma,sans-serif;color:#0F172A}
.ev-bar{top:0;left:0;right:0;height:56px;background:#7C2D12;color:#fff;display:flex;align-items:center;gap:10px;padding:0 14px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.ev-bar b{font-size:16px}.ev-bar small{opacity:.85;font-size:11.5px;display:block}
.ev-bar .x{margin-left:auto;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:16px}
.ev-lock{background:#FEF3C7;color:#92400E;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700}
.ev-sheet{left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -6px 24px rgba(15,23,42,.18);padding:10px 16px 18px}
.ev-grip{width:40px;height:4px;border-radius:4px;background:#CBD5E1;margin:0 auto 10px}
.ev h3{margin:0;font-size:17px}.ev .sub{color:#64748B;font-size:12px;margin:2px 0 10px}
.seg{display:flex;background:#F1F5F9;border-radius:12px;padding:3px;gap:3px}
.seg span{flex:1;text-align:center;padding:8px 0;border-radius:10px;font-weight:700;font-size:13.5px;color:#475569}
.seg .on{background:#fff;color:#7C2D12;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
.tier{border-radius:12px;padding:8px 10px;color:#fff}
.tier b{display:block;font-size:26px;line-height:1.1;font-family:'JetBrains Mono',monospace}.tier span{font-size:12px;font-weight:600}
.cta{display:block;text-align:center;border-radius:14px;padding:14px;font-weight:800;font-size:16px;color:#fff;background:#B91C1C;box-shadow:0 4px 14px rgba(185,28,28,.35)}
.note{font-size:11.5px;color:#64748B;margin-top:8px}
.prog{height:8px;border-radius:8px;background:#F1F5F9;overflow:hidden;margin:6px 0 10px}.prog i{display:block;height:100%;background:#16A34A}
.row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #F1F5F9}
.rk{width:30px;height:30px;border-radius:9px;color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;flex:none}
.row .m{flex:1;min-width:0}.row .m b{font-size:14px}.row .m div{font-size:12px;color:#64748B}
.chip{font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap}
.c-wait{background:#F1F5F9;color:#475569}.c-go{background:#DBEAFE;color:#1D4ED8}.c-done{background:#DCFCE7;color:#15803D}
.why{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:8px 12px;margin:10px 0}
.why div{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:3px 0}.why span{color:#64748B}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.btn{text-align:center;border-radius:12px;padding:12px 6px;font-weight:800;font-size:14px;border:1.5px solid #E2E8F0;color:#0284C7;background:#fff}
.btn.p{background:#16A34A;border-color:#16A34A;color:#fff;grid-column:1/-1}
.dest{border:1px solid #E2E8F0;border-radius:14px;padding:10px 12px;margin-top:8px}
.dest .t{display:flex;justify-content:space-between;align-items:center}.dest b{font-size:14.5px}
.cap{height:10px;border-radius:10px;background:#F1F5F9;overflow:hidden;margin:7px 0 4px}.cap i{display:block;height:100%;background:#0284C7}
.pin{transform:translate(-50%,-50%);width:26px;height:26px;border-radius:8px;color:#fff;font:800 13px 'Noto Sans Thai',sans-serif;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.pin.sel{width:36px;height:36px;font-size:16px;outline:4px solid rgba(37,99,235,.45)}
.dpin{transform:translate(-50%,-100%);background:#0F766E;color:#fff;border-radius:10px;padding:4px 9px;font:700 12px 'Noto Sans Thai',sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.dpin.sel{background:#1D4ED8}
.ev-tag{top:64px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;font:600 11.5px 'Noto Sans Thai',sans-serif;padding:4px 12px;border-radius:999px;white-space:nowrap}
.side{top:72px;bottom:16px;background:#fff;border-radius:16px;box-shadow:0 8px 28px rgba(15,23,42,.16);padding:14px 16px;overflow:hidden}
.side.l{left:16px;width:380px}.side.r{right:16px;width:330px;bottom:auto}
`

const SCREENS = [
  { key: 'm1-start', device: 'm' },
  { key: 'm2-queue', device: 'm' },
  { key: 'm3-case', device: 'm' },
  { key: 'm4-destinations', device: 'm' },
  { key: 'd1-command', device: 'd' },
]

// ข้อมูลจากชั้น "กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต" ของข้อมูลชุมชน (public/mymaps/thaton.json layer-1)
// ลำดับตามระดับในชั้นนั้น สีตาม legend เดิม; ระดับ 5 ปกติไม่เข้าคิว
const GROUPS = {
  '1': { label: 'วิกฤตสูงสุด', short: 'วิกฤตสูงสุด', color: '#A52714' },
  '2': { label: 'มีสมาชิกเปราะบาง', short: 'มีเปราะบาง', color: '#E65100' },
  '4': { label: 'เคยน้ำท่วมบ้าน', short: 'เคยท่วม', color: '#673AB7' },
  '5': { label: 'ปกติ', short: 'ปกติ', color: '#0F9D58' },
}

async function shoot(browser, screen) {
  const mobile = screen.device === 'm'
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile })
  await page.addInitScript(() => localStorage.setItem('kok_selected_community', 'thaton'))
  await page.goto('http://localhost:5173/?welcome=off', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('.leaflet-container')?.__vueParentComponent?.setupState?.mapInstance, null, { timeout: 90000 })
  await page.waitForTimeout(2000)
  await page.addStyleTag({ content: CSS + '.community-household-review-marker{display:none!important}' })

  const data = await page.evaluate(async ({ screen, mobile, GROUPS }) => {
    const panelEl = document.querySelector('.leaflet-container')
    const panel = panelEl.__vueParentComponent.setupState
    let c = panelEl.__vueParentComponent
    while (c && !(c.setupState && 'activeCommunityMapType' in c.setupState)) c = c.parent
    c.setupState.activeCommunityMapType = 'evacuation'
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const layer = (await fetch('/mymaps/thaton.json').then((r) => r.json())).layers.find((l) => l.id === 'layer-1')
    const rows = Object.values(layer).find((v) => Array.isArray(v) && v[0]?.fields)
    await wait(1200)
    const { mapInstance: map, L } = panel

    const destinations = [
      { label: 'ศูนย์พักพิงตามแผน', latlng: [20.05842, 99.35875] },
      { label: 'จุดรวมพลตามแผน', latlng: [20.04983, 99.36727] },
    ]
    // กลุ่มเปราะบางก่อน แล้วบ้านที่ไกลที่หมายกว่าไปก่อนเพราะใช้เวลานานกว่า
    const all = rows.map((r) => {
      const from = L.latLng(r.latitude, r.longitude)
      const near = destinations.map((d) => ({ ...d, metres: from.distanceTo(d.latlng) })).sort((a, b) => a.metres - b.metres)[0]
      const level = r.status[0]
      return {
        level, from, near, group: GROUPS[level], zone: r.fields['โซน'] || 'ไม่ระบุหย่อม',
        members: Number(r.fields['จำนวนสมาชิกเปราะบาง_คน']) || 0,
        flooded: r.fields['ประวัติน้ำท่วมบ้าน'] === 'เคยท่วมบ้าน',
        accident: r.fields['อุบัติเหตุรุนแรงจากน้ำ'] !== 'ไม่มี',
      }
    })
    // ระดับ 1 → 2 → 4 แล้วสมาชิกเปราะบางมากกว่า เคยเกิดเหตุรุนแรง และบ้านไกลที่หมายกว่าไปก่อน
    const queue = all.filter((q) => q.level !== '5')
      .sort((a, b) => a.level - b.level || b.members - a.members || b.accident - a.accident || b.near.metres - a.near.metres)
    queue.forEach((q, i) => { q.rank = i + 1 })
    const total = queue.length
    const byGroup = Object.fromEntries(Object.keys(GROUPS).map((k) => [k, all.filter((q) => q.level === k).length]))
    const demo = screen.key === 'm4-destinations' || screen.key === 'd1-command'
    const status = (rank) => demo ? (rank <= 3 ? 'done' : rank <= 5 ? 'go' : 'wait') : 'wait'
    const chip = (s) => s === 'done' ? '<span class="chip c-done">ถึงแล้ว</span>' : s === 'go' ? '<span class="chip c-go">กำลังไป</span>' : '<span class="chip c-wait">รอ</span>'
    const icon = (html) => L.divIcon({ html, className: '', iconSize: [0, 0] })
    const notes = []
    const sel = queue[0]

    if (screen.key !== 'm1-start') {
      for (const q of queue.slice(0, 15)) {
        const s = status(q.rank)
        L.marker(q.from, { icon: icon(`<div class="pin ${screen.key === 'm3-case' && q === sel ? 'sel' : ''}" style="background:${s === 'done' ? '#16A34A' : q.group.color}">${s === 'done' ? '✓' : q.rank}</div>`), zIndexOffset: 1000 - q.rank }).addTo(map)
      }
    } else {
      for (const q of all) L.circleMarker(q.from, { radius: 6, color: '#fff', weight: 1.5, fillColor: q.group.color, fillOpacity: 1 }).addTo(map)
    }
    for (const d of destinations) {
      const on = screen.key === 'm3-case' && d.label === sel.near.label
      L.marker(d.latlng, { icon: icon(`<div class="dpin ${on ? 'sel' : ''}">⌂ ${d.label}</div>`), zIndexOffset: 2000 }).addTo(map)
    }
    const fit = L.latLngBounds([...queue.map((q) => q.from), ...destinations.map((d) => d.latlng)])
    if (screen.key === 'm3-case') {
      L.polyline([sel.from, sel.near.latlng], { color: '#1D4ED8', weight: 4, dashArray: '8 6' }).addTo(map)
      map.fitBounds(L.latLngBounds([sel.from, sel.near.latlng]), { paddingTopLeft: [40, 110], paddingBottomRight: [40, 470], animate: false })
      notes.push({ n: 1, latlng: sel.from }, { n: 2, latlng: sel.near.latlng })
    } else if (mobile) {
      map.fitBounds(fit, { paddingTopLeft: [24, 100], paddingBottomRight: [24, 460], animate: false })
    } else {
      map.fitBounds(fit, { paddingTopLeft: [420, 80], paddingBottomRight: [360, 40], animate: false })
    }
    if (screen.key === 'm2-queue') notes.push({ n: 1, latlng: queue[0].from })
    if (screen.key === 'd1-command') notes.push({ n: 5, latlng: queue[0].from })

    const add = (cls, html) => { const el = document.createElement('div'); el.className = `ev ${cls}`; el.innerHTML = html; document.body.appendChild(el) }
    add('ev-bar', `<div><b>โหมดอพยพ · บ้านท่าตอน</b><small>ทีมช่วยเหลือ · ผู้ใหญ่บ้าน อปพร. รพ.สต.</small></div><span class="ev-lock" data-n="${screen.key === 'm1-start' ? 1 : ''}">ล็อกอินแล้ว</span><span class="x">✕</span>`)
    add('ev-tag', 'ต้นแบบ · ยังไม่อยู่ในระบบจริง')
    const row = (q, s) => `<div class="row"><span class="rk" style="background:${s === 'done' ? '#16A34A' : q.group.color}">${q.rank}</span><div class="m"><b>${q.group.label}${q.members ? ` · เปราะบาง ${q.members} คน` : ''}</b><div>หย่อม${q.zone.replace(/^บ้าน/, '')} · ไป${q.near.label} ${Math.round(q.near.metres)} ม.</div></div>${chip(s)}</div>`
    const tile = (k) => `<div class="tier" style="background:${GROUPS[k].color}"><b>${byGroup[k]}</b><span>${GROUPS[k].short}</span></div>`

    if (screen.key === 'm1-start') {
      add('ev-sheet', `<div class="ev-grip"></div><h3>บ้านที่ต้องอพยพ ${total} บ้าน</h3><div class="sub">จากแบบสำรวจ ${all.length} ครัวเรือน · ข้อมูลชุมชน</div>
        <div class="tiers" data-n="2" style="grid-template-columns:repeat(4,1fr)">${['1', '2', '4', '5'].map(tile).join('')}</div>
        <span class="cta" data-n="3">เริ่มอพยพตามลำดับ</span>
        <div class="note" data-n="4">ลำดับ: วิกฤตสูงสุด → มีสมาชิกเปราะบาง → เคยท่วม · กลุ่มเดียวกันคนเปราะบางมากกว่าและบ้านไกลกว่าไปก่อน · บ้านปกติไม่เข้าคิว</div>`)
    }
    if (screen.key === 'm2-queue') {
      add('ev-sheet', `<div class="ev-grip"></div><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>คิวอพยพ</h3><span class="sub" style="margin:0">อพยพแล้ว 0/${total}</span></div>
        <div class="prog" data-n="2"><i style="width:2%"></i></div>
        <div data-n="3">${queue.slice(0, 5).map((q) => row(q, 'wait')).join('')}</div>
        <div class="note" data-n="4">กดค้างแล้วลากเพื่อสลับลำดับเองได้ เมื่อหน้างานต่างจากที่ระบบเรียง</div>`)
    }
    if (screen.key === 'm3-case') {
      add('ev-sheet', `<div class="ev-grip"></div><div style="display:flex;gap:10px;align-items:center"><span class="rk" style="background:${sel.group.color};width:40px;height:40px;font-size:18px">1</span><div><h3>${sel.group.label}</h3><div class="sub" style="margin:0">อันดับ 1 จาก ${total} บ้าน</div></div></div>
        <div class="why" data-n="3"><div><span>หย่อม</span><b>${sel.zone}</b></div><div><span>สมาชิกเปราะบาง</span><b>${sel.members} คน</b></div><div><span>บ้านเคยน้ำท่วม</span><b>${sel.flooded ? 'เคย' : 'ไม่เคย'}</b></div><div><span>ไปที่</span><b>${sel.near.label} · ${Math.round(sel.near.metres)} ม.</b></div></div>
        <div class="why" data-n="4" style="background:#FFFBEB;border-color:#FDE68A"><div><span>ผู้ติดต่อ · ประเภทความเปราะบาง · ต้องใช้รถ/เปล</span><b style="color:#92400E">ยังไม่มีข้อมูล</b></div></div>
        <div class="btns" data-n="5"><span class="btn">นำทาง</span><span class="btn">☎ โทร</span><span class="btn p">อพยพแล้ว ✓</span></div>`)
    }
    if (screen.key === 'm4-destinations') {
      const sent = (label) => queue.filter((q) => q.near.label === label && q.rank <= 3).length
      add('ev-sheet', `<div class="ev-grip"></div><h3>ที่หมาย</h3><div class="sub">อพยพแล้ว 3/${total} บ้าน · กำลังไป 2 (ตัวอย่างสถานะ)</div>
        <div class="dest" data-n="2"><div class="t"><b>⌂ ศูนย์พักพิงตามแผน</b><span class="chip c-go">ถึงแล้ว ${sent('ศูนย์พักพิงตามแผน')} บ้าน</span></div><div class="cap"><i style="width:6%"></i></div><div class="note" style="margin:0">ความจุ: รอยืนยันว่าเป็นศาลาประชาคม (100) หรือวัด (300)</div></div>
        <div class="dest" data-n="5"><div class="t"><b>⌂ จุดรวมพลตามแผน</b><span class="chip c-go">ถึงแล้ว ${sent('จุดรวมพลตามแผน')} บ้าน</span></div><div class="note" style="margin:4px 0 0">จุดพักชั่วคราว ก่อนส่งต่อที่พักพิง</div></div>
        <div class="dest" data-n="3" style="background:#FEF2F2;border-color:#FECACA"><b>ยังไม่มีพิกัด</b><div class="note" style="margin:2px 0 0">ศาลาประชาคม 100 คน · วัดท่าตอน 300 คน · รพ.สต.</div></div>
        <div class="btns" style="margin-top:10px" data-n="4"><span class="btn" style="grid-column:1/-1">ส่งสรุปให้ อบต. / ปภ.</span></div>`)
    }
    if (screen.key === 'd1-command') {
      add('side l', `<h3>คิวอพยพ</h3><div class="sub">อพยพแล้ว 3/${total} · กำลังไป 2 (ตัวอย่างสถานะ)</div>
        <div class="prog" data-n="1"><i style="width:${Math.round(300 / total)}%"></i></div>
        <div data-n="2">${queue.slice(0, 10).map((q) => row(q, status(q.rank))).join('')}</div>`)
      add('side r', `<h3>ที่หมาย</h3><div class="dest" data-n="3"><div class="t"><b>⌂ ศูนย์พักพิงตามแผน</b></div><div class="cap"><i style="width:6%"></i></div><div class="note" style="margin:0">ความจุรอยืนยัน</div></div>
        <div class="dest"><b>⌂ จุดรวมพลตามแผน</b><div class="note" style="margin:2px 0 0">พักชั่วคราว</div></div>
        <div class="dest" data-n="4" style="background:#FEF2F2;border-color:#FECACA"><b>ทีมในพื้นที่</b><div class="note" style="margin:2px 0 0">ใครรับเคสไหน · ยังไม่มีรายชื่อทีม</div></div>`)
    }
    await wait(2500)
    const box = panelEl.getBoundingClientRect()
    const rects = notes.map((a) => { const p = map.latLngToContainerPoint(a.latlng); return { n: a.n, x: p.x + box.left, y: p.y + box.top } })
    document.querySelectorAll('[data-n]').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && e.dataset.n) rects.push({ n: Number(e.dataset.n), x: r.left, y: r.top + r.height / 2 }) })
    return { rects, total, byGroup, surveyed: all.length, queue: queue.map((q) => ({ rank: q.rank, level: q.level, members: q.members, zone: q.zone, dest: q.near.label, metres: Math.round(q.near.metres) })) }
  }, { screen, mobile, GROUPS })

  await page.screenshot({ path: path.join(OUT, `${screen.key}.jpg`), type: 'jpeg', quality: 85 })
  await page.close()
  return data
}

const browser = await chromium.launch()
const result = {}
for (const screen of SCREENS) {
  result[screen.key] = await shoot(browser, screen)
  console.log('shot', screen.key)
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(result, null, 1))
const { total, byGroup, queue } = result['m2-queue']
console.log(total, JSON.stringify(byGroup), JSON.stringify(queue.slice(0, 4)), Math.max(...queue.map((q) => q.metres)))
