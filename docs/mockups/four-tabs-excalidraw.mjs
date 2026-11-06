// สร้างบอร์ดต้นแบบ 4 แท็บจากภาพที่ four-tabs-capture.mjs ถ่ายไว้ แล้วเขียน docs/four-tabs-prototype.excalidraw
// รัน: node docs/mockups/four-tabs-excalidraw.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch'
const SHOTS = path.join(ROOT, 'docs/mockups/shots/four-tabs')
const rects = JSON.parse(fs.readFileSync(path.join(SHOTS, 'rects.json'), 'utf8'))
const X0 = Number(process.argv[2] || 0)

const STATUS = {
  have: { label: 'มีในระบบแล้ว', stroke: '#16A34A', bg: '#F0FDF4' },
  convert: { label: 'มีข้อมูล ต้องแปลงเข้าระบบ', stroke: '#0284C7', bg: '#F0F9FF' },
  check: { label: 'มีแล้ว แต่ต้องตรวจก่อนใช้', stroke: '#D97706', bg: '#FFFBEB' },
  missing: { label: 'ยังไม่มี ต้องขอเพิ่ม', stroke: '#DC2626', bg: '#FEF2F2' },
}

const SECTIONS = [
  {
    key: 'hamlets', title: '1. หย่อมบ้าน · ท่าตอน', ask: 'ตอบคำถาม: ชุมชนของฉันเสี่ยงแค่ไหน',
    notes: [
      [1, 'convert', 'วงกลมยอดรวมรายหย่อม', 'สีตามสัดส่วนบ้านที่เคยท่วม ขนาดตามจำนวนแถวสำรวจ', 'public/mymaps/thaton.json ชั้น 1 (ฟิลด์ โซน, ประวัติน้ำท่วมบ้าน)'],
      [2, 'check', 'ชื่อหย่อม', 'ข้อมูลมีมากกว่า 9 ชื่อ ขณะที่ SWG5 รายงาน 9 หย่อม ต้องเทียบชื่อก่อน', 'ฟิลด์ โซน ใน thaton.json · ชีต SWG5 ใน MFU_IP3_SWG_6M-Progress.xlsx'],
      [3, 'convert', 'ตัวเลข 4 ช่อง', 'นับรวมจากคำตอบรายบ้าน ไม่ส่งรายบ้านเข้าหน้าเว็บ', 'thaton.json ชั้น 1, 2, 4 และ 6'],
      [4, 'convert', 'ภาพรวมทั้งหมู่บ้าน', 'เคยท่วม 60 จาก 129 และมีแผนเชื่อมชุมชน 6 จาก 129', 'thaton.json ชั้น 1 และ 6'],
      [5, 'check', 'ข้อจำกัดของแบบสำรวจ', 'เป็นบางครัวเรือน 123 รหัสไม่ซ้ำจาก 129 แถว ไม่ระบุวันสำรวจ หย่อมที่มีไม่ถึง 5 แถวต้องรวมกลุ่ม', 'thaton.json (surveyDate ว่าง)'],
      [6, 'missing', 'เส้นขอบเขตหย่อมจริง', 'ภาพนี้ใช้วงกลมแทน เพราะยังไม่มีเส้นจริง ได้ไฟล์แล้วจึงเปลี่ยนเป็นขอบเขต', 'Google Earth ของ SWG5 ชุดที่ 1 ต้องขออาจารย์'],
    ],
  },
  {
    key: 'hamlets-other', title: '1.1 หย่อมบ้าน · ชุมชนที่ยังไม่มีข้อมูลหย่อม', ask: 'ปงของ รวมมิตร และปากอิงใต้ จะเห็นแบบนี้',
    notes: [
      [1, 'check', 'การ์ดรู้จักชุมชน', 'เปิดใช้ได้ทั้ง 3 ชุมชน โดยไม่ต้องรอข้อมูลหย่อม', 'ชีต Village ใน MFU_IP3_SWG_6M-Progress.xlsx'],
      [2, 'check', 'ลุ่มน้ำ ผู้คน และอาชีพ', 'ผมแปลจากต้นฉบับภาษาอังกฤษ ต้องให้ทีมตรวจคำ', 'ชีต Village แถว 3–7'],
      [3, 'check', 'ความเสี่ยงของชุมชน', 'เป็นคำบรรยาย ไม่ใช่ผลวัด พิกัดในชีตยังต่างจากเว็บ เช่น ปงของห่างราว 17 กม.', 'ชีต Village แถว 8'],
      [4, 'missing', 'ขอบเขตและยอดรายหย่อม', 'ต้องสำรวจหรือขอเพิ่ม ถ้าไม่มีก็คงการ์ดนี้ไว้', 'ไม่พบในคลัง'],
    ],
  },
  {
    key: 'chemical', title: '2. สารเคมีปนเปื้อน', ask: 'ตอบคำถาม: น้ำตรงนี้ใช้ได้ไหม',
    notes: [
      [1, 'have', 'จุดชาวบ้าน ตัวกรองเวลา ปุ่มสำรวจ', 'ของเดิมในระบบ จุดในภาพเป็นข้อมูลทดสอบจากเครื่อง dev บนมือถือการ์ดนี้บังปุ่มสำรวจจนกว่าจะปิดการ์ด', 'API /api/surveys/waypoints'],
      [2, 'check', 'จุดตรวจทางการ ◆', 'ทางการมี 18 จุด 22 รอบ แต่ตำแหน่งในภาพเป็นค่าประมาณ เพราะยังไม่มีพิกัด', 'รายงาน 3.3 ผลน้ำครั้งที่ 22 ตาราง 1'],
      [3, 'convert', 'ค่า KK02 และความขุ่น', '0.011 mg/L เท่ากับ 11 ppb เกินเกณฑ์ 10 ppb ค่าตะกอนต้องแยกต่างหาก', 'รายงาน 3.3 ผลน้ำครั้งที่ 22'],
      [4, 'check', 'คำแนะนำการกินอยู่', 'เป็นถ้อยคำเรื่องสุขภาพ ควรให้อาจารย์หรือจังหวัดรับรองก่อนเผยแพร่', 'รายงานประชุม 25 ส.ค. 69 · ผลประปาครั้งที่ 11'],
      [5, 'missing', 'เซนเซอร์ WORA', 'รู้ว่าติดที่ท่าเรือท่าตอน แต่ยังไม่มีช่องทางดึงค่า', 'สไลด์ 03 Mekong SharedWater ต้องขอจาก ADPC'],
      [6, 'have', 'ขอบเขตของชุดตรวจ', 'ชุดตรวจชาวบ้านวัดเฉพาะสารหนู ไม่ได้ครอบคลุมสารเคมีทุกชนิด', 'คู่มือในระบบ · แบบสำรวจเดิม'],
    ],
  },
  {
    key: 'places', title: '3. สถานที่สำคัญ', ask: 'ตอบคำถาม: น้ำสะอาด หมอ และที่ปลอดภัยอยู่ไหน',
    notes: [
      [1, 'check', 'หมุดท่าเรือ วัด และมัสยิด', 'ชื่อและพิกัดมาจากชั้นรูปใน My Maps ยังไม่ยืนยันภาคสนาม', 'My Maps 14fss… ชั้น Imported Photos'],
      [2, 'convert', 'ตัวกรองหมวด', 'เป็นส่วนใหม่ ต้องจัดประเภทสถานที่เอง', 'แบ่งหมวดตามที่เสนอ ยังไม่มีในระบบ'],
      [3, 'check', 'พิกัดที่มีแล้ว 5 แห่ง', 'ศูนย์พักพิงกับจุดรวมพลเป็นค่าประมาณจากภาพ PDF', 'data/public-evacuation-reference.json · My Maps 14fss…'],
      [4, 'missing', 'รพ.สต. ประปา ศาลา วัดท่าตอน', 'รู้ชื่อและความจุ แต่ไม่มีพิกัด จึงไม่ปักหมุด', 'REQUIREMENTS.md สรุปแผน F1 ข้อ 1.6 และ 3.3.3'],
      [5, 'missing', 'รายการเต็ม 14 ประเภท', 'แผนตัวจริงและพิกัดยังไม่อยู่ในเครื่อง', 'แผน F1 · Google Earth ของ SWG5 ชุดที่ 2'],
      [6, 'missing', 'ปุ่มโทรและนำทาง', 'นำทางทำได้เมื่อมีพิกัด ส่วนเบอร์ต้องได้รับความยินยอม', 'ต้องขอจากชุมชน'],
    ],
  },
  {
    key: 'evacuation', title: '4. อพยพกลุ่มเปราะบาง', ask: 'ตอบคำถาม: ท่วมแล้วหนีไปทางไหน ไปที่ไหน โทรหาใคร',
    notes: [
      [1, 'have', 'ขอบเขตน้ำจากดาวเทียม', 'รวมแม่น้ำเดิม และไม่ได้บอกความลึก', 'public/flood-observations/thaton-2024-display.json'],
      [2, 'check', 'ศูนย์พักพิงและเส้นทาง', 'มีในระบบ แต่ยังไม่ตรวจภาคสนาม', 'SWG5 Evacuation Map PDF · public/evacuation/thaton.json'],
      [3, 'check', 'จุดรวมพล', 'ค่าประมาณจากภาพ PDF เช่นกัน', 'data/public-evacuation-reference.json'],
      [4, 'check', 'ความจุ 100 และ 300 คน', 'อ้างจากบทสรุป ยังไม่เห็นแผนตัวจริง', 'REQUIREMENTS.md สรุปแผน F1 ข้อ 3.3.3'],
      [5, 'check', 'ยอดกลุ่มเปราะบาง', 'ภาพนี้ซ่อนพิกัดรายบ้าน แต่ระบบจริงยังเปิดอยู่ ต้องย้ายไปหลังล็อกอิน', 'public/evacuation/thaton.json 67 จุด'],
      [6, 'missing', 'ขั้นตอน 12 ขั้นและข้อควรทำ', 'รู้แค่ว่ามี 12 ขั้น ยังไม่เห็นเนื้อหา จึงไม่แต่งเอง', 'แผน F1 ต้องขออาจารย์'],
      [7, 'missing', 'ผู้ประสานงาน', 'ต้องมีชื่อ เบอร์ และความยินยอมให้เผยแพร่', 'ต้องขอจากชุมชน'],
      [8, 'convert', 'ลิงก์ Thai Water และ Windy', 'เป็นลิงก์ออกนอกเว็บ ทำได้ทันที', 'โจทย์จากเสียงประชุมอาจารย์'],
    ],
  },
]

const SUMMARY = [
  ['แท็บ', 'ข้อมูลท่าตอน', 'อีก 3 ชุมชน', 'ต้องระวัง'],
  ['หย่อมบ้าน', 'ยอดรวมพร้อม ขาดเส้นขอบเขต', 'มีแค่การ์ดรู้จักชุมชน', 'หย่อมเล็กอาจระบุตัวบ้านได้'],
  ['สารเคมีปนเปื้อน', 'พร้อมที่สุด ขาดพิกัดจุดทางการ', 'ใช้ผลชาวบ้านได้ทันที', 'คำแนะนำสุขภาพต้องมีคนรับรอง'],
  ['สถานที่สำคัญ', 'มี 5 พิกัด ขาดสถานที่หลัก', 'ยังไม่มีข้อมูล', 'หมุดผิดเป็นอันตรายตอนฉุกเฉิน'],
  ['อพยพกลุ่มเปราะบาง', 'มีแผนที่ ขาดขั้นตอนและผู้ประสาน', 'ยังไม่มีแผน', 'พิกัดรายบ้านยังเปิดสาธารณะ'],
]

const elements = []
const files = {}
const now = Date.now()
let seq = 0
const base = (type, x, y, width, height, extra = {}) => ({
  id: `ft_${seq++}`, type, x: x + X0, y, width, height, angle: 0, strokeColor: '#0F172A', backgroundColor: 'transparent',
  fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null,
  roundness: null, seed: 1000 + seq, version: 1, versionNonce: 5000 + seq, isDeleted: false, boundElements: [],
  updated: now, link: null, locked: false, ...extra,
})
const rect = (x, y, w, h, extra) => elements.push(base('rectangle', x, y, w, h, { roundness: { type: 3 }, ...extra }))

const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
function wrap(text, max) {
  const lines = []
  let line = ''
  for (const { segment } of segmenter.segment(text)) {
    if (line.length + segment.length > max && line) { lines.push(line.trimEnd()); line = '' }
    line += line ? segment : segment.trimStart()
  }
  if (line) lines.push(line)
  return lines
}
function text(x, y, value, fontSize = 22, extra = {}) {
  const lines = value.split('\n')
  const width = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6
  const height = lines.length * fontSize * 1.25
  elements.push(base('text', x, y, width, height, {
    text: value, originalText: value, fontSize, fontFamily: 2, textAlign: 'left', verticalAlign: 'top',
    containerId: null, autoResize: true, lineHeight: 1.25, strokeWidth: 1, ...extra,
  }))
  return height
}
function image(key, x, y, w, h) {
  const id = `ft_${key}`
  const data = fs.readFileSync(path.join(SHOTS, `${key}.jpg`)).toString('base64')
  files[id] = { id, mimeType: 'image/jpeg', dataURL: `data:image/jpeg;base64,${data}`, created: now, lastRetrieved: now }
  elements.push(base('image', x, y, w, h, { fileId: id, status: 'saved', scale: [1, 1], crop: null, strokeWidth: 1, strokeColor: '#CBD5E1' }))
  rect(x, y, w, h, { strokeColor: '#CBD5E1', strokeWidth: 2 })
}
function arrow(x1, y1, x2, y2, color) {
  elements.push(base('arrow', x1, y1, Math.abs(x2 - x1), Math.abs(y2 - y1), {
    points: [[0, 0], [x2 - x1, y2 - y1]], strokeColor: color, strokeWidth: 2, opacity: 75,
    startArrowhead: null, endArrowhead: 'arrow', startBinding: null, endBinding: null, lastCommittedPoint: null,
  }))
}
function badge(cx, cy, n, color) {
  elements.push(base('ellipse', cx - 19, cy - 19, 38, 38, { backgroundColor: color, strokeColor: '#FFFFFF', strokeWidth: 3 }))
  text(cx - (String(n).length * 7), cy - 14, String(n), 22, { strokeColor: '#FFFFFF' })
}

const NOTE_W = 760
const IMG_X = NOTE_W + 90
const MOBILE_X = IMG_X + 1440 + 50
const BOARD_W = MOBILE_X + 390
let y = 0

text(0, y, 'ต้นแบบ 4 แท็บล่างหน้าแผนที่ · ใช้ประกอบการตัดสินใจ', 52); y += 76
text(0, y, 'ถ่ายจากเว็บจริงแล้ววางข้อมูลลงเฉพาะในภาพ ระบบจริงยังไม่เปลี่ยน · ตัวเลขทุกตัวมาจากไฟล์จริง ส่วนที่ไม่มีข้อมูลจะเขียนว่ารอ ไม่แต่งเติม', 26, { strokeColor: '#64748B' }); y += 60

let sx = 0
for (const s of Object.values(STATUS)) {
  rect(sx, y, 400, 54, { backgroundColor: s.bg, strokeColor: s.stroke })
  text(sx + 18, y + 12, s.label, 24, { strokeColor: s.stroke })
  sx += 420
}
y += 90

const COLS = [420, 660, 500, 620]
let ty = y
SUMMARY.forEach((row, r) => {
  let cx = 0
  row.forEach((cell, c) => {
    rect(cx, ty, COLS[c], 62, { backgroundColor: r === 0 ? '#E0F2FE' : '#FFFFFF', strokeColor: '#CBD5E1' })
    text(cx + 16, ty + 15, cell, 26)
    cx += COLS[c]
  })
  ty += 62
})
y = ty + 26
rect(0, y, 2200, 66, { backgroundColor: '#FEF2F2', strokeColor: '#DC2626' })
text(18, y + 16, 'ถ้าตัดสินใจทำจริง: 1 ย้ายพิกัดรายบ้านออกจากสาธารณะ  2 สารเคมี  3 หย่อมบ้าน  4 อพยพ  5 สถานที่ (เรียงตามความเสี่ยงและความพร้อมของข้อมูล)', 26, { strokeColor: '#991B1B' })
y += 130

for (const section of SECTIONS) {
  rect(0, y, BOARD_W, 76, { backgroundColor: '#0F172A', strokeColor: '#0F172A' })
  text(24, y + 16, section.title, 34, { strokeColor: '#FFFFFF' })
  text(IMG_X, y + 22, section.ask, 28, { strokeColor: '#BAE6FD' })
  y += 100

  const imgY = y
  image(`${section.key}-d`, IMG_X, imgY, 1440, 900)
  image(`${section.key}-m`, MOBILE_X, imgY, 390, 844)
  text(MOBILE_X, imgY + 852, 'มุมมองมือถือ', 22, { strokeColor: '#64748B' })

  const spots = rects[`${section.key}-d`].rects
  const cardGap = 12
  const heights = section.notes.map(([, , , what, source]) => 60 + (wrap(what, 54).length + wrap(`ที่มา: ${source}`, 62).length) * 27 + 16)
  const totalH = heights.reduce((a, b) => a + b + cardGap, 0)
  let cy = imgY + Math.max(0, (900 - totalH) / 2)
  section.notes.forEach(([n, statusKey, title, what, source], i) => {
    const st = STATUS[statusKey]
    const h = heights[i]
    rect(0, cy, NOTE_W, h, { backgroundColor: st.bg, strokeColor: st.stroke })
    badge(36, cy + 34, n, st.stroke)
    text(68, cy + 14, title, 26)
    let ly = cy + 54
    ly += text(68, ly, wrap(what, 54).join('\n'), 22)
    text(68, ly, wrap(`ที่มา: ${source}`, 62).join('\n'), 20, { strokeColor: '#475569' })
    const spot = spots.find((p) => p.n === n)
    if (spot) {
      // ป้ายบนการ์ดด้านขวาวางชิดขอบนอก ป้ายบนแผนที่ขยับออกเพื่อไม่บังชื่อหมุด
      const onPanel = spot.x > 1060
      const bx = IMG_X + spot.x - (onPanel ? 24 : 52)
      const by = imgY + spot.y - (onPanel ? 0 : 34)
      arrow(NOTE_W, cy + h / 2, bx - 20, by, st.stroke)
      badge(bx, by, n, st.stroke)
    }
    cy += h + cardGap
  })
  y = imgY + Math.max(900, totalH) + 90
}

const doc = { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements, appState: { viewBackgroundColor: '#FFFFFF', gridSize: null }, files }
const out = path.join(ROOT, 'docs/four-tabs-prototype.excalidraw')
fs.writeFileSync(out, JSON.stringify(doc))
console.log('elements', elements.length, 'files', Object.keys(files).length, 'height', y, 'width', BOARD_W, 'bytes', fs.statSync(out).size)
