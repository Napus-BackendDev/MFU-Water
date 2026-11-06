// สร้างบอร์ด flow คิวอพยพกลุ่มเปราะบาง (ไม่ใช้ระดับน้ำ)จากภาพของ evac-flow-capture.mjs แล้วเขียน docs/evac-flow-prototype.excalidraw
// รัน: node docs/mockups/evac-flow-excalidraw.mjs [x-offset]
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'C:/Users/asus/Desktop/Fastwork/mfu kok water watch'
const SHOTS = path.join(ROOT, 'docs/mockups/shots/evac-flow')
const data = JSON.parse(fs.readFileSync(path.join(SHOTS, 'data.json'), 'utf8'))
const X0 = Number(process.argv[2] || 0)
const { total, byGroup, queue, surveyed } = data['m2-queue']
const farthest = Math.max(...queue.map((q) => q.metres))

const STATUS = {
  have: { label: 'มีในระบบแล้ว', stroke: '#16A34A', bg: '#F0FDF4' },
  convert: { label: 'ต้องสร้างเพิ่มในระบบ', stroke: '#0284C7', bg: '#F0F9FF' },
  check: { label: 'มีแล้ว แต่ต้องตรวจหรือแก้', stroke: '#D97706', bg: '#FFFBEB' },
  missing: { label: 'ยังไม่มีข้อมูล ต้องขอ', stroke: '#DC2626', bg: '#FEF2F2' },
}

const SRC = 'ข้อมูลชุมชน ชั้น "กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต" (public/mymaps/thaton.json layer-1)'
const FLOW = [
  {
    key: 'm1-start', title: '1 เริ่ม: มีใครต้องอพยพ', next: 'กดเริ่มอพยพ',
    notes: [
      [1, 'convert', 'หน้านี้อยู่หลังล็อกอิน', 'ตอนนี้ล็อกอินมีแค่แอดมิน ต้องเพิ่มบทบาททีมช่วยเหลือ', 'ระบบแอดมินเดิม'],
      [2, 'have', `แยก 4 ระดับจาก ${surveyed} ครัวเรือน`, `วิกฤตสูงสุด ${byGroup['1']} · มีสมาชิกเปราะบาง ${byGroup['2']} · เคยท่วม ${byGroup['4']} · ปกติ ${byGroup['5']} (ไม่เข้าคิว)`, SRC],
      [3, 'convert', 'ปุ่มเริ่มอพยพ', 'เปิดรอบอพยพใหม่และสร้างคิว ต้องเก็บรอบและสถานะลงฐานข้อมูล', 'ยังไม่มีในระบบ'],
      [4, 'check', 'เกณฑ์เรียงคิว', 'ใช้ระดับเดิมของชั้นข้อมูล แล้วคนเปราะบางมากกว่า และบ้านไกลกว่าไปก่อน ต้องให้ชุมชนยืนยัน', 'legend ของชั้นข้อมูลเดียวกัน'],
    ],
  },
  {
    key: 'm2-queue', title: '2 คิว: ใครก่อน', next: 'แตะบ้านอันดับ 1',
    notes: [
      [1, 'check', 'หมุดตัวเลขบนแผนที่', 'เป็นพิกัดรายบ้านจากแบบสำรวจ ต้องอยู่หลังล็อกอินเท่านั้น', `${SRC} ตอนนี้เปิดสาธารณะ`],
      [2, 'convert', 'แถบความคืบหน้า', `นับบ้านที่อพยพแล้วจาก ${total} บ้าน`, 'สถานะใหม่ ต้องเก็บในระบบ'],
      [3, 'have', 'รายการคิว', 'ระดับ จำนวนสมาชิกเปราะบาง หย่อม ที่หมายใกล้สุด และระยะเส้นตรง', SRC],
      [4, 'convert', 'ลากสลับลำดับเอง', 'หน้างานอาจรู้ดีกว่าแบบสำรวจ', 'ต้องสร้างใหม่'],
    ],
  },
  {
    key: 'm3-case', title: '3 เคส: พาไปที่ไหน', next: 'กดอพยพแล้ว',
    notes: [
      [1, 'check', 'บ้านที่เลือก', 'บ้านอันดับ 1 ระดับวิกฤตสูงสุด มีสมาชิกเปราะบาง 2 คน', SRC],
      [2, 'check', 'ที่หมายใกล้สุด', 'ศูนย์พักพิงและจุดรวมพลเป็นตำแหน่งประมาณจากภาพ PDF ยังไม่ตรวจภาคสนาม', 'data/public-evacuation-reference.json'],
      [3, 'have', 'หย่อม สมาชิกเปราะบาง ประวัติน้ำท่วม', 'มาจากฟิลด์ในชั้นข้อมูลเดียวกัน ระยะเป็นเส้นตรง', SRC],
      [4, 'missing', 'ผู้ติดต่อ ประเภทความเปราะบาง ต้องใช้รถหรือเปล', 'ชั้นนี้บอกแค่จำนวนคน ไม่บอกว่าเป็นใครหรือต้องช่วยแบบไหน ต้องเก็บเพิ่มพร้อมความยินยอม', 'ไม่มีในชั้นข้อมูล'],
      [5, 'convert', 'ปุ่มนำทาง โทร อพยพแล้ว', 'นำทางเปิด Google Maps ได้ทันที กดอพยพแล้วต้องบันทึกว่าใครกดและเวลาไหน', 'ต้องสร้างใหม่'],
    ],
  },
  {
    key: 'm4-destinations', title: '4 ที่หมาย: รับได้อีกกี่คน', next: null,
    notes: [
      [2, 'check', 'ศูนย์พักพิงและความจุ', 'ไม่รู้ว่าจุดนี้คือศาลา (100 คน) หรือวัด (300 คน) จึงยังแสดงความจุจริงไม่ได้', 'สรุปแผน F1 ข้อ 3.3.3'],
      [5, 'check', 'จุดรวมพล', 'เป็นจุดพักชั่วคราว ต้องรู้ว่าส่งต่อไปที่ไหน', 'data/public-evacuation-reference.json'],
      [3, 'missing', 'ที่หมายที่ยังไม่มีพิกัด', 'ศาลาประชาคม วัดท่าตอน รพ.สต. ได้พิกัดแล้วระบบจะเลือกที่ใกล้ให้เอง', 'แผน F1 · Google Earth ของ SWG5'],
      [4, 'missing', 'ส่งสรุปให้ใคร', 'ต้องตกลงว่าส่งให้ อบต. หรือ ปภ. และส่งทางไหน', 'ต้องถามอาจารย์หรือชุมชน'],
    ],
  },
]

const DESK = {
  key: 'd1-command', title: '5 จอคอมพิวเตอร์: ดูภาพรวม',
  notes: [
    [1, 'convert', 'ความคืบหน้ารวม', 'เห็นพร้อมกันทุกคนที่ล็อกอิน', 'สถานะใหม่'],
    [2, 'convert', 'คิวพร้อมสถานะ', 'รอ กำลังไป ถึงแล้ว ตัวเลขสถานะในภาพเป็นตัวอย่าง', 'สถานะใหม่'],
    [3, 'check', 'ความจุที่หมาย', 'รอยืนยันว่าเป็นที่ไหน', 'สรุปแผน F1'],
    [4, 'missing', 'ทีมในพื้นที่', 'ต้องรู้รายชื่อทีมเพื่อแบ่งเคส', 'ต้องขอจากชุมชน'],
    [5, 'check', 'บ้านอันดับต้น', 'ระดับวิกฤตสูงสุด 4 บ้านอยู่บนสุด', SRC],
  ],
}

const FINDINGS = [
  `ข้อมูลมาจากข้อมูลชุมชนชั้นกลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต ${surveyed} ครัวเรือน แทนพิกัด 67 จุดเดิมในระบบ`,
  `คิวมี ${total} บ้าน: วิกฤตสูงสุด ${byGroup['1']} · มีสมาชิกเปราะบาง ${byGroup['2']} · เคยท่วม ${byGroup['4']} ส่วนบ้านปกติ ${byGroup['5']} ไม่เข้าคิว`,
  'บ้านที่มีสมาชิกเปราะบางมีแค่ 12 บ้านในชั้นนี้ คิวส่วนใหญ่จึงเป็นบ้านที่เคยท่วม',
  `ทุกบ้านในคิวอยู่ห่างที่หมายใกล้สุดไม่เกิน ${(farthest / 1000).toFixed(1)} กม. (เส้นตรง) · ไม่ใช้ระดับน้ำ`,
]

const DECISIONS = [
  'ใครใช้หน้านี้ (ผู้ใหญ่บ้าน อปพร. รพ.สต.) และใครเป็นคนให้สิทธิ์ล็อกอิน',
  'บ้านระดับ "เคยท่วม" 56 บ้านควรอยู่ในคิวอพยพไหม หรือเป็นแค่กลุ่มเฝ้าระวัง',
  'ข้อมูลรายบ้านที่ต้องเก็บเพิ่ม: ประเภทความเปราะบาง ต้องใช้รถ เบอร์ติดต่อ พร้อมความยินยอม',
  'ที่หมายจริงและความจุของแต่ละที่',
]

const elements = []
const files = {}
const now = Date.now()
let seq = 0
const base = (type, x, y, width, height, extra = {}) => ({
  id: `ev_${seq++}`, type, x: x + X0, y, width, height, angle: 0, strokeColor: '#0F172A', backgroundColor: 'transparent',
  fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null,
  roundness: null, seed: 3000 + seq, version: 1, versionNonce: 9000 + seq, isDeleted: false, boundElements: [],
  updated: now, link: null, locked: false, ...extra,
})
const rect = (x, y, w, h, extra) => elements.push(base('rectangle', x, y, w, h, { roundness: { type: 3 }, ...extra }))
const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
function wrap(value, max) {
  const lines = []
  let line = ''
  for (const { segment } of segmenter.segment(value)) {
    if (line.length + segment.length > max && line) { lines.push(line.trimEnd()); line = '' }
    line += line ? segment : segment.trimStart()
  }
  if (line) lines.push(line)
  return lines
}
function text(x, y, value, fontSize = 22, extra = {}) {
  const lines = value.split('\n')
  const height = lines.length * fontSize * 1.25
  elements.push(base('text', x, y, Math.max(...lines.map((l) => l.length)) * fontSize * 0.6, height, {
    text: value, originalText: value, fontSize, fontFamily: 2, textAlign: 'left', verticalAlign: 'top',
    containerId: null, autoResize: true, lineHeight: 1.25, strokeWidth: 1, ...extra,
  }))
  return height
}
function image(key, x, y, w, h) {
  const id = `ev_${key}`
  files[id] = { id, mimeType: 'image/jpeg', dataURL: `data:image/jpeg;base64,${fs.readFileSync(path.join(SHOTS, `${key}.jpg`)).toString('base64')}`, created: now, lastRetrieved: now }
  elements.push(base('image', x, y, w, h, { fileId: id, status: 'saved', scale: [1, 1], crop: null, strokeWidth: 1 }))
  rect(x, y, w, h, { strokeColor: '#CBD5E1' })
}
function arrow(x1, y1, x2, y2, color, extra = {}) {
  elements.push(base('arrow', x1, y1, Math.abs(x2 - x1), Math.abs(y2 - y1), {
    points: [[0, 0], [x2 - x1, y2 - y1]], strokeColor: color, strokeWidth: 2, opacity: 75,
    startArrowhead: null, endArrowhead: 'arrow', startBinding: null, endBinding: null, lastCommittedPoint: null, ...extra,
  }))
}
function badge(cx, cy, n, color) {
  elements.push(base('ellipse', cx - 19, cy - 19, 38, 38, { backgroundColor: color, strokeColor: '#FFFFFF', strokeWidth: 3 }))
  text(cx - String(n).length * 7, cy - 14, String(n), 22, { strokeColor: '#FFFFFF' })
}
function card(x, y, w, [n, statusKey, title, what, source], chars) {
  const st = STATUS[statusKey]
  const whatLines = wrap(what, chars)
  const srcLines = wrap(`ที่มา: ${source}`, chars + 6)
  const h = 60 + (whatLines.length + srcLines.length) * 27 + 14
  rect(x, y, w, h, { backgroundColor: st.bg, strokeColor: st.stroke })
  badge(x + 34, y + 32, n, st.stroke)
  text(x + 64, y + 14, title, 24)
  const ly = y + 52 + text(x + 64, y + 52, whatLines.join('\n'), 21)
  text(x + 64, ly, srcLines.join('\n'), 19, { strokeColor: '#475569' })
  return h
}
function pointAt(spots, n, imgX, imgY, scale, sideX) {
  const spot = spots.find((p) => p.n === n)
  if (!spot) return null
  return { x: imgX + spot.x * scale, y: imgY + spot.y * scale, panel: spot.x * scale > sideX }
}

let y = 0
text(0, y, 'ต้นแบบแท็บอพยพกลุ่มเปราะบาง · คิวอพยพบนมือถือสำหรับทีมช่วยเหลือ', 52); y += 76
text(0, y, 'ถ่ายจากเว็บจริง ไม่ใช้ระดับน้ำ · คิวจากข้อมูลชุมชน ชั้นกลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต · ส่วนนี้อยู่หลังล็อกอิน', 26, { strokeColor: '#64748B' }); y += 64

let sx = 0
for (const s of Object.values(STATUS)) {
  rect(sx, y, 400, 54, { backgroundColor: s.bg, strokeColor: s.stroke })
  text(sx + 18, y + 12, s.label, 24, { strokeColor: s.stroke })
  sx += 420
}
y += 84

const boxW = 1640
const findLines = FINDINGS.map((f) => wrap(`• ${f}`, 66))
const findH = 70 + findLines.reduce((a, l) => a + l.length * 32, 0)
rect(0, y, boxW, findH, { backgroundColor: '#FFF7ED', strokeColor: '#C2410C' })
text(24, y + 16, 'สิ่งที่ต้นแบบนี้เจอ', 30, { strokeColor: '#9A3412' })
let fy = y + 62
for (const lines of findLines) fy += text(24, fy, lines.join('\n'), 25)
const decLines = DECISIONS.map((d, i) => wrap(`${i + 1}. ${d}`, 50))
const decH = 70 + decLines.reduce((a, l) => a + l.length * 32, 0)
rect(boxW + 40, y, 1260, Math.max(findH, decH), { backgroundColor: '#EFF6FF', strokeColor: '#1D4ED8' })
text(boxW + 64, y + 16, 'ต้องตัดสินใจก่อนทำจริง', 30, { strokeColor: '#1E3A8A' })
let dy = y + 62
for (const lines of decLines) dy += text(boxW + 64, dy, lines.join('\n'), 25)
y += Math.max(findH, decH) + 80

// แถว flow มือถือ: ภาพอยู่บน การ์ดอยู่ใต้ภาพ ลูกศรหนาเชื่อมขั้นตอน
const COL = 700
const PHONE_W = 390
const PHONE_H = 844
const imgY = y + 60
let maxBottom = 0
FLOW.forEach((step, i) => {
  const colX = i * COL
  const imgX = colX + (COL - 80 - PHONE_W) / 2
  text(colX, y, step.title, 34)
  image(step.key, imgX, imgY, PHONE_W, PHONE_H)
  if (step.next) {
    const ax = imgX + PHONE_W + 20
    const ay = imgY + PHONE_H / 2
    arrow(ax, ay, ax + COL - PHONE_W - 40, ay, '#7C2D12', { strokeWidth: 5, opacity: 100 })
    text(ax + 14, ay - 44, step.next, 22, { strokeColor: '#7C2D12' })
  }
  let cy = imgY + PHONE_H + 50
  for (const note of step.notes) {
    const h = card(colX, cy, COL - 80, note, 40)
    const p = pointAt(data[step.key].rects, note[0], imgX, imgY, 1, 9999)
    // การ์ดอยู่ใต้ภาพจึงจับคู่ด้วยเลขอย่างเดียว ไม่ลากลูกศรผ่านหน้าจอ
    if (p) badge(p.x - 22, p.y, note[0], STATUS[note[1]].stroke)
    cy += h + 14
  }
  maxBottom = Math.max(maxBottom, cy)
})
y = maxBottom + 100

// จอคอมพิวเตอร์: การ์ดซ้าย ภาพขวา
text(0, y, DESK.title, 34)
y += 60
const dImgX = 800
image(DESK.key, dImgX, y, 1440, 900)
let cy = y
for (const note of DESK.notes) {
  const h = card(0, cy, 740, note, 44)
  const p = pointAt(data[DESK.key].rects, note[0], dImgX, y, 1, 9999)
  if (p) {
    const color = STATUS[note[1]].stroke
    const bx = p.x - (p.x - dImgX > 1060 || p.x - dImgX < 400 ? 24 : 52)
    const by = p.y - (p.x - dImgX > 1060 || p.x - dImgX < 400 ? 0 : 34)
    arrow(740, cy + h / 2, bx - 20, by, color)
    badge(bx, by, note[0], color)
  }
  cy += h + 14
}

const doc = { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements, appState: { viewBackgroundColor: '#FFFFFF', gridSize: null }, files }
const out = path.join(ROOT, 'docs/evac-flow-prototype.excalidraw')
fs.writeFileSync(out, JSON.stringify(doc))
console.log('elements', elements.length, 'files', Object.keys(files).length, 'bytes', fs.statSync(out).size)
