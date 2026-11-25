// กติกาข้อมูลแผนที่ชุดเดียว ใช้ทั้งฝั่ง API (ตรวจข้อมูล สร้างข้อมูลที่หน้าบ้านเห็น) และหน้าแอดมิน (ฟอร์ม พรีวิว)
// หน้าบ้านกับหลังบ้านจึงเห็นผลเดียวกันเสมอ เพราะผ่านฟังก์ชันเดียวกัน ไม่มีกติกาซ้ำสองที่
import { FIELD_OPTIONS, LEVEL_DEFS } from './map-data-options.js'

export { FIELD_OPTIONS, LEVEL_DEFS }

export const COMMUNITY_IDS = ['thaton', 'ruammit', 'pongkhong', 'pakingtai']
export const ZONE_FIELD = 'โซน'
export const MEMBERS_FIELD = 'จำนวนสมาชิกเปราะบาง_คน'
export const UNKNOWN_ANSWER = 'ไม่ระบุ'
export const PUBLISH_STATUSES = ['draft', 'published']
export const HAMLET_K_THRESHOLD = 5

const begins = (value, text) => String(value ?? '').startsWith(text)
const beginsAny = (value, texts) => texts.some((text) => begins(value, text))
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// ระดับของแต่ละหัวข้อคำนวณจากคำตอบ ตรวจแล้วว่าได้ผลตรงกับ 774 แถวใน public/mymaps/thaton.json ทุกแถว
export const COMMUNITY_LAYERS = [
  {
    id: 'layer-1',
    label: 'กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต',
    fields: [ZONE_FIELD, MEMBERS_FIELD, 'ประวัติน้ำท่วมบ้าน', 'อุบัติเหตุรุนแรงจากน้ำ'],
    level(answers) {
      const members = Number(answers[MEMBERS_FIELD]) || 0
      const flooded = answers['ประวัติน้ำท่วมบ้าน'] === 'เคยท่วมบ้าน'
      if (members > 0 && flooded) return '1'
      if (members > 0) return '2'
      return flooded ? '4' : '5'
    },
  },
  {
    id: 'layer-2',
    label: 'ความเสี่ยงภัยน้ำท่วมและความลึกของน้ำ',
    fields: [ZONE_FIELD, 'ระดับความลึกน้ำท่วมที่บ้าน', 'ประเมินความเสี่ยงอนาคต'],
    level(answers) {
      const depth = answers['ระดับความลึกน้ำท่วมที่บ้าน']
      if (begins(depth, 'ระดับท่วมมิดหัว')) return '1'
      if (begins(depth, 'ระดับเอวถึงอก')) return '2'
      if (begins(depth, 'ระดับเข่าถึงเอว')) return '3'
      if (begins(depth, 'ระดับต่ำกว่าเข่า')) return '4'
      return '5'
    },
  },
  {
    id: 'layer-3',
    label: 'การพึ่งพิงแม่น้ำกก/โขง',
    fields: [ZONE_FIELD, 'ใช้น้ำกกโขงทำเกษตร', 'ใช้น้ำกกโดยตรงเป็นประจำ', 'ความรู้สึกความปลอดภัยของน้ำ'],
    level(answers) {
      if (answers['ใช้น้ำกกโดยตรงเป็นประจำ'] === 'ใช้เป็นประจำ') return '1'
      if (begins(answers['ใช้น้ำกกโขงทำเกษตร'], 'ใช้น้ำกก/โขง')) return '2'
      return beginsAny(answers['ความรู้สึกความปลอดภัยของน้ำ'], ['ปลอดภัยมากที่สุด', 'ปานกลาง']) ? '4' : '3'
    },
  },
  {
    id: 'layer-4',
    label: 'ภัยแล้งและการขาดแคลนระบบน้ำสำรอง',
    fields: [ZONE_FIELD, 'ระบบน้ำสำรองฉุกเฉิน', 'ระยะเวลารับมือน้ำแล้งได้'],
    level(answers) {
      const noStorage = begins(answers['ระบบน้ำสำรองฉุกเฉิน'], 'ไม่มีภาชนะหรือระบบ')
      const short = begins(answers['ระยะเวลารับมือน้ำแล้งได้'], 'ไม่เกิน 3 วัน')
      if (noStorage && short) return '1'
      if (noStorage) return '2'
      return short ? '3' : '4'
    },
  },
  {
    id: 'layer-5',
    label: 'สุขภาพ ความวิตกกังวล และการคัดกรองสารปนเปื้อน',
    fields: [ZONE_FIELD, 'อาการป่วยจากน้ำ', 'การเข้าถึงตรวจคัดกรองสารพิษ', 'ความกังวลผลกระทบสุขภาพ'],
    level(answers) {
      const worryMax = begins(answers['ความกังวลผลกระทบสุขภาพ'], 'กังวลมากที่สุด')
      const lowAccess = beginsAny(answers['การเข้าถึงตรวจคัดกรองสารพิษ'], ['เข้าถึงได้น้อย', 'เข้าถึงไม่ได้เลย'])
      if (begins(answers['อาการป่วยจากน้ำ'], 'มีอาการรุนแรง/วิกฤต')) return '1'
      if (worryMax && lowAccess) return '2'
      if (worryMax) return '3'
      return lowAccess ? '4' : '5'
    },
  },
  {
    id: 'layer-6',
    label: 'การเตรียมพร้อมและการมีส่วนร่วม',
    fields: [ZONE_FIELD, 'เตือนภัยล่วงหน้าน้ำท่วม', 'แผนรับมือน้ำท่วม', 'ความเชื่อมั่นความโปร่งใส', 'โอกาสเข้าร่วมประชุมน้ำ'],
    level(answers) {
      const noPlan = beginsAny(answers['แผนรับมือน้ำท่วม'], ['ไม่มีแผน', 'ยังไม่มีแผน'])
      if (noPlan && answers['เตือนภัยล่วงหน้าน้ำท่วม'] === 'ไม่เคยได้รับ') return '1'
      if (noPlan) return '2'
      return beginsAny(answers['ความเชื่อมั่นความโปร่งใส'], ['ไม่ค่อยเชื่อมั่น', 'ไม่เชื่อมั่นเลย']) ? '3' : '4'
    },
  },
]

export const layerById = (layerId) => COMMUNITY_LAYERS.find((layer) => layer.id === layerId)

export function classifyLayer(layer, answers) {
  const key = layer.level(answers)
  const def = LEVEL_DEFS[layer.id].find((item) => item.key === key)
  return { key, label: def.label, color: def.color }
}

export function classifyHousehold(answers) {
  return Object.fromEntries(COMMUNITY_LAYERS.map((layer) => [layer.id, classifyLayer(layer, answers)]))
}

// รหัสครัวเรือน = รหัสแถวของชั้นที่ 1 (MM1-001) เพื่อให้คิวอพยพที่เก็บ household_id ไว้แล้วยังใช้ได้ต่อ
const padSeq = (seq) => String(seq).padStart(3, '0')
export const householdIdOf = (seq) => `MM1-${padSeq(seq)}`
export const recordIdOf = (layerIndex, seq) => `MM${layerIndex + 1}-${padSeq(seq)}`
export function seqOfHouseholdId(id) {
  const match = /^MM1-(\d{1,6})$/.exec(String(id ?? ''))
  return match ? Number(match[1]) : null
}

// ชื่อหย่อมที่หน้าบ้านเห็น: ใช้ชื่อในทะเบียนหย่อม (รวมชื่อเรียกต่าง ๆ แล้ว) ถ้ายังไม่ผูกก็ว่าง
export const hamletNameOf = (household, hamletById) => (household.hamlet_id ? hamletById.get(household.hamlet_id)?.name ?? '' : '')

function fieldValue(key, household, hamletById) {
  if (key === ZONE_FIELD) return hamletNameOf(household, hamletById)
  if (key === MEMBERS_FIELD) return Number(household.answers?.[MEMBERS_FIELD] ?? 0).toFixed(1)
  return household.answers?.[key] ?? ''
}

// ข้อมูลชุมชนในรูปเดียวกับไฟล์ public/mymaps/thaton.json (MyMapsReview) ที่หน้าบ้านอ่านอยู่แล้ว
export function buildCommunityReview({ households, hamlets = [], meta = {}, hiddenLayers = [], pointsPublic = true }) {
  const hamletById = new Map(hamlets.map((hamlet) => [hamlet.id, hamlet]))
  const live = households.filter((household) => household.published !== false).sort((a, b) => a.seq - b.seq)
  const layers = COMMUNITY_LAYERS.map((layer, index) => ({ layer, index })).filter(({ layer }) => !hiddenLayers.includes(layer.id)).map(({ layer, index }) => {
    const records = live.map((household) => {
      const level = classifyLayer(layer, household.answers ?? {})
      return {
        id: recordIdOf(index, household.seq),
        latitude: household.latitude,
        longitude: household.longitude,
        status: level.label,
        color: level.color,
        fields: Object.fromEntries(layer.fields.map((key) => [key, fieldValue(key, household, hamletById)])),
      }
    })
    const legend = LEVEL_DEFS[layer.id]
      .map((def) => ({ label: def.label, color: def.color, rows: records.filter((record) => record.status === def.label).length }))
      .filter((entry) => entry.rows > 0)
    return { id: layer.id, label: layer.label, rowCount: records.length, records: pointsPublic ? records : [], legend }
  })
  return {
    visibility: 'public',
    sourceUrl: meta.sourceUrl ?? '',
    title: meta.title ?? '',
    surveyDate: meta.surveyDate ?? null,
    importedAt: meta.importedAt ?? '',
    sourceRowsPerLayer: live.length,
    distinctCoordinates: new Set(live.map((household) => `${household.latitude},${household.longitude}`)).size,
    pointsPublic,
    layers,
  }
}

// แปลงไฟล์ My Maps เดิม (6 หัวข้อ ลำดับแถวตรงกันทุกหัวข้อ) เป็นครัวเรือน 1 เอกสารต่อบ้าน ใช้ตอนตั้งต้นฐานข้อมูลครั้งแรก
// ---------- คำอธิบายหมุดสำรวจครัวเรือน (เขียนเป็นประโยคอ่านง่าย) ----------
const NO_ANSWER = 'ไม่ระบุ'
const pick = (table, value) => {
  const found = table.find(([prefix]) => String(value ?? '').startsWith(prefix))
  // An answer we have no wording for keeps its own text, without the explanation in brackets.
  return found ? found[1] : String(value ?? '').replace(/\s*\(.*$/, '').trim()
}
const groupOf = (status) => String(status ?? '').replace(/^\d+\.\s*/, '').replace(/\s*\(.*$/, '').trim()
const answered = (value) => Boolean(value) && value !== NO_ANSWER

const DEPTH = [
  ['ไม่ท่วม', 'น้ำไม่เคยท่วมบริเวณบ้าน'],
  ['ระดับต่ำกว่าเข่า', 'น้ำเคยท่วมต่ำกว่าเข่า (ไม่เกิน 30 ซม. ท่วมใต้ถุนหรือหน้าบ้าน)'],
  ['ระดับเข่าถึงเอว', 'น้ำเคยท่วมระดับเข่าถึงเอว (ราว 30–80 ซม. เริ่มไหลเข้าพื้นบ้านชั้นล่าง)'],
  ['ระดับเอวถึงอก', 'น้ำเคยท่วมระดับเอวถึงอก (ราว 80–120 ซม.)'],
  ['ระดับท่วมมิดหัว', 'น้ำเคยท่วมมิดหัวหรือเกินชั้น 1 ของบ้าน (มากกว่า 150 ซม.)'],
]
const FUTURE_RISK = [
  ['เสี่ยงมากที่สุด', 'เสี่ยงน้ำท่วมมากที่สุด'],
  ['เสี่ยงมาก', 'เสี่ยงน้ำท่วมมาก'],
  ['เสี่ยงน้อย', 'เสี่ยงน้ำท่วมน้อย'],
  ['ปานกลาง', 'เสี่ยงน้ำท่วมปานกลาง'],
  ['ไม่เสี่ยง', 'ไม่เสี่ยงน้ำท่วมเลย'],
]
const WATER_FEEL = [
  ['ไม่ปลอดภัยเลย', 'รู้สึกว่าน้ำไม่ปลอดภัยเลย'],
  ['ไม่ค่อยปลอดภัย', 'รู้สึกว่าน้ำไม่ค่อยปลอดภัย'],
  ['ปานกลาง', 'รู้สึกว่าน้ำปลอดภัยพอใช้ได้'],
  ['ปลอดภัยมาก', 'รู้สึกว่าน้ำปลอดภัยมาก'],
]
const BACKUP = [
  ['มีถังเก็บน้ำสำรองส่วนตัวขนาดใหญ่', 'มีถังเก็บน้ำสำรองขนาดใหญ่ในบ้าน ใช้ได้เกิน 3 วัน'],
  ['มีถังหรือภาชนะ', 'มีถังหรือภาชนะเก็บน้ำสำรองในบ้าน ใช้ได้ราว 1–2 วัน'],
  ['มีเพียงภาชนะขนาดเล็ก', 'มีเพียงภาชนะเล็ก ๆ สำรองน้ำ ใช้ได้ไม่กี่ชั่วโมง'],
  ['ไม่มีภาชนะ', 'ไม่มีภาชนะสำรองน้ำเลย ถ้าน้ำประปาหยุดไหลจะไม่มีน้ำใช้ทันที'],
  ['พึ่งพาระบบสำรองน้ำกลาง', 'พึ่งพาระบบน้ำสำรองกลางของชุมชน ในบ้านไม่มีถังสำรองเอง'],
]
const SYMPTOMS = [
  ['ปลอดภัยดีมาก', 'ไม่เคยมีสมาชิกในบ้านมีอาการผิดปกติจากน้ำ'],
  ['มีอาการเล็กน้อย', 'เคยมีอาการเล็กน้อยนาน ๆ ครั้ง เช่น ผื่นคันชั่วคราว และหายเอง'],
  ['มีอาการปานกลาง', 'มีอาการเจ็บป่วยค่อนข้างบ่อย เช่น ท้องเสีย ต้องซื้อยากินเองหรือพักรักษาตัว'],
  ['มีอาการรุนแรง', 'มีสมาชิกป่วยรุนแรงระยะยาว เช่น ชาปลายมือปลายเท้า อ่อนแรงเรื้อรัง'],
]
const SCREENING = [
  ['เข้าถึงได้ดีมาก', 'ได้ตรวจคัดกรองสุขภาพหาสารพิษทุกปี'],
  ['เข้าถึงได้ดี', 'เคยได้รับการตรวจคัดกรองสุขภาพ 1–2 ครั้ง'],
  ['เข้าถึงได้ปานกลาง', 'ยังไม่เคยได้ตรวจร่างกาย แต่ในหมู่บ้านมีระบบเฝ้าระวังและแนะนำให้ไปตรวจเมื่อสงสัย'],
  ['เข้าถึงได้น้อย', 'ยังไม่เคยได้ตรวจและหาที่ตรวจยาก แต่อยากให้มีหน่วยงานมาตรวจให้'],
  ['เข้าถึงไม่ได้เลย', 'ไม่เคยได้ตรวจและไม่มีช่องทางดูแลสุขภาพด้านสารปนเปื้อนเข้าถึงพื้นที่'],
]
const WORRY = [
  ['กังวลมากที่สุด', 'กังวลมากที่สุดจนเครียด กลัวสารพิษสะสมและโรคร้ายแรงในอนาคต'],
  ['กังวลมาก', 'กังวลมาก รู้สึกระแวงทุกครั้งที่ใช้น้ำดื่มและน้ำใช้'],
  ['กังวลปานกลาง', 'กังวลปานกลาง เริ่มไม่แน่ใจคุณภาพน้ำเป็นบางช่วง'],
  ['กังวลเล็กน้อย', 'กังวลเล็กน้อย แต่คิดว่าป้องกันได้ เช่น ต้มหรือกรองก่อนใช้'],
  ['ไม่กังวลเลย', 'ไม่กังวล เพราะมั่นใจในระบบกรองและน้ำที่เลือกใช้'],
]
const WARNING = [
  ['ได้ล่วงหน้ามากกว่า 3 วัน', 'ได้รับแจ้งเตือนน้ำท่วมล่วงหน้ามากกว่า 3 วัน'],
  ['ได้ล่วงหน้า 1–2 วัน', 'ได้รับแจ้งเตือนน้ำท่วมล่วงหน้า 1–2 วัน'],
  ['ได้ล่วงหน้ากระชั้นชิด', 'ได้รับแจ้งเตือนน้ำท่วมแบบกระชั้นชิด'],
  ['ได้ขณะเกิดเหตุ', 'ได้รับแจ้งเตือนตอนเกิดเหตุแล้ว'],
  ['ไม่เคยได้รับ', 'ไม่เคยได้รับแจ้งเตือนน้ำท่วมล่วงหน้า'],
]
const FLOOD_PLAN = [
  ['มีแผนชัดเจนและเชื่อมโยง', 'มีแผนรับมือน้ำท่วมชัดเจน รู้จุดอพยพ รู้คนช่วย และรู้แผนอพยพของชุมชนและเทศบาล'],
  ['มีแผนเฉพาะ', 'มีแผนเฉพาะในครอบครัว ตกลงกันแล้วว่าจะขนของไปไว้ที่ไหน แต่ยังไม่เชื่อมกับแผนของชุมชน'],
  ['ไม่มีแผนส่วนตัว', 'ไม่มีแผนของตัวเอง แต่พร้อมทำตามที่ผู้ใหญ่บ้านหรือแกนนำชุมชนสั่งเมื่อเกิดเหตุ'],
  ['ยังไม่มีแผน', 'ยังไม่มีแผนที่แน่นอน กังวลอยู่บ้างแต่ยังไม่ได้เตรียมอะไร'],
  ['ไม่มีแผนเลย', 'ไม่มีแผนเลย ไม่เคยคิดเรื่องเตรียมรับมือหรืออพยพ'],
]
const TRANSPARENCY = [
  ['มากที่สุด', 'เชื่อมั่นความโปร่งใสของการบริหารน้ำมากที่สุด'],
  ['มาก', 'เชื่อมั่นความโปร่งใสของการบริหารน้ำมาก'],
  ['ปานกลาง', 'เชื่อมั่นความโปร่งใสของการบริหารน้ำระดับปานกลาง'],
  ['ไม่ค่อยเชื่อมั่น', 'ไม่ค่อยเชื่อมั่นความโปร่งใสของการบริหารน้ำ'],
  ['ไม่เชื่อมั่นเลย', 'ไม่เชื่อมั่นความโปร่งใสของการบริหารน้ำเลย'],
]
const MEETINGS = [
  ['ดีมาก', 'เข้าประชุมเรื่องน้ำสม่ำเสมอและมีโอกาสเสนอความเห็น'],
  ['ดี', 'เข้าประชุมเรื่องน้ำสม่ำเสมอ แต่ส่วนใหญ่รับฟังอย่างเดียว'],
  ['ปานกลาง', 'เข้าประชุมเรื่องน้ำนาน ๆ ครั้ง เมื่อเป็นเรื่องที่กระทบตัวเอง'],
  ['น้อยที่สุด', 'ไม่เคยได้รับเชิญหรือไม่เคยรู้ว่ามีประชุมเรื่องน้ำ'],
  ['น้อย', 'ไม่เคยเข้าประชุมเรื่องน้ำ ทั้งที่รู้ว่าชุมชนมีเวทีหารือ'],
]

const SURVEY_WRITERS = [
  // 1 กลุ่มเปราะบางและเหตุฉุกเฉินวิกฤต
  (f) => {
    const people = Number(f['จำนวนสมาชิกเปราะบาง_คน']) || 0
    const flooded = f['ประวัติน้ำท่วมบ้าน'] === 'เคยท่วมบ้าน'
    const accident = answered(f['อุบัติเหตุรุนแรงจากน้ำ']) && f['อุบัติเหตุรุนแรงจากน้ำ'] !== 'ไม่มี'
    return [`${people > 0 ? `มีสมาชิกเปราะบาง ${people} คน` : 'ไม่มีสมาชิกเปราะบาง'} และบ้าน${flooded ? 'เคย' : 'ไม่เคย'}ถูกน้ำท่วม${accident ? ' เคยประสบเหตุรุนแรงจากน้ำ' : ''}`]
  },
  // 2 ความเสี่ยงภัยน้ำท่วมและความลึกของน้ำ
  (f) => [
    pick(DEPTH, f['ระดับความลึกน้ำท่วมที่บ้าน']),
    answered(f['ประเมินความเสี่ยงอนาคต']) ? `ประเมินว่าในอนาคต${pick(FUTURE_RISK, f['ประเมินความเสี่ยงอนาคต'])}` : '',
  ],
  // 3 การพึ่งพิงแม่น้ำกก/โขง
  (f) => {
    const farm = f['ใช้น้ำกกโขงทำเกษตร'] === 'ใช้น้ำกก/โขง'
    const daily = f['ใช้น้ำกกโดยตรงเป็นประจำ'] === 'ใช้เป็นประจำ'
    const feel = answered(f['ความรู้สึกความปลอดภัยของน้ำ']) ? pick(WATER_FEEL, f['ความรู้สึกความปลอดภัยของน้ำ']) : ''
    const use = `${farm ? 'ใช้น้ำแม่น้ำกก/โขงทำเกษตร' : 'ไม่ได้ใช้น้ำแม่น้ำทำเกษตร'} และ${daily ? 'ใช้น้ำกกโดยตรงเป็นประจำ' : 'ไม่ได้ใช้น้ำกกโดยตรงเป็นประจำ'}`
    return [feel ? `${use}${farm || daily ? ' และ' : ' แต่'}${feel}` : use]
  },
  // 4 ภัยแล้งและการขาดแคลนระบบน้ำสำรอง
  (f) => {
    const span = f['ระยะเวลารับมือน้ำแล้งได้']
    const plain = String(span ?? '').replace(/\s+ถึง\s+/, 'ถึง ').replace(/^ตั้งแต่\s*/, '').replace('หรือไม่สามารถรับมือได้เลย', 'หรือรับมือไม่ได้เลย')
    return [answered(f['ระบบน้ำสำรองฉุกเฉิน']) ? pick(BACKUP, f['ระบบน้ำสำรองฉุกเฉิน']) : '', answered(span) ? `ประเมินว่ารับมือภัยแล้งได้${/^(ไม่เกิน|มากกว่า)/.test(plain) ? '' : ' '}${plain}` : '']
  },
  // 5 สุขภาพ ความวิตกกังวล และการคัดกรองสารปนเปื้อน
  (f) => [
    answered(f['อาการป่วยจากน้ำ']) ? pick(SYMPTOMS, f['อาการป่วยจากน้ำ']) : '',
    answered(f['การเข้าถึงตรวจคัดกรองสารพิษ']) ? pick(SCREENING, f['การเข้าถึงตรวจคัดกรองสารพิษ']) : '',
    answered(f['ความกังวลผลกระทบสุขภาพ']) ? pick(WORRY, f['ความกังวลผลกระทบสุขภาพ']) : '',
  ],
  // 6 การเตรียมพร้อมและการมีส่วนร่วม
  (f) => [
    answered(f['เตือนภัยล่วงหน้าน้ำท่วม']) ? pick(WARNING, f['เตือนภัยล่วงหน้าน้ำท่วม']) : '',
    pick(FLOOD_PLAN, f['แผนรับมือน้ำท่วม']),
    answered(f['ความเชื่อมั่นความโปร่งใส']) ? pick(TRANSPARENCY, f['ความเชื่อมั่นความโปร่งใส']) : '',
    answered(f['โอกาสเข้าร่วมประชุมน้ำ']) ? pick(MEETINGS, f['โอกาสเข้าร่วมประชุมน้ำ']) : '',
  ],
]

// One survey record as readable Thai sentences (at most 300 characters): the household's answers, then its group.
export function describeSurveyPin(layerIndex, record) {
  const write = SURVEY_WRITERS[layerIndex]
  const sentences = (write ? write(record.fields ?? {}) : []).filter(Boolean)
  const group = groupOf(record.status)
  const body = sentences.length ? `ครัวเรือนนี้${sentences.join(' ')}` : 'ยังไม่มีคำตอบแบบสำรวจของครัวเรือนนี้'
  const text = group ? `${body} (จัดอยู่ในกลุ่ม: ${group})` : body
  return text.length > 300 ? `${text.slice(0, 297)}…` : text
}

// Icon of each of the six survey topics when shown as a map of pins.
const LAYER_MAP_ICONS = ['house', 'alert', 'drop', 'pot', 'cross', 'flag']

// The six My Maps survey topics as six maps of pins (one pin per surveyed household), shown on the public
// important-places tab one map at a time. The survey answers go in the pin's note.
export function layerMapPlaces(review, { communityId = 'thaton' } = {}) {
  const places = []
  ;(review?.layers ?? []).forEach((layer, layerIndex) => {
    for (const record of layer.records ?? []) {
      const seq = String(record.id ?? '').match(/(\d+)$/)?.[1] ?? String(places.length + 1).padStart(3, '0')
      const { 'โซน': zone } = record.fields ?? {}
      places.push({
        id: `MP${layerIndex + 1}-${seq}`,
        community_id: communityId,
        kind: 'other',
        name: `${zone || 'ไม่ระบุโซน'} · ${record.id}`.slice(0, 120),
        source_section: '',
        map_name: String(layer.label).slice(0, 120),
        pin_icon: LAYER_MAP_ICONS[layerIndex] ?? 'house',
        pin_color: /^#[0-9A-Fa-f]{6}$/.test(record.color ?? '') ? record.color : null,
        latitude: record.latitude,
        longitude: record.longitude,
        location_precision: 'approximate',
        operational_status: 'unchecked',
        capacity_planned: null,
        capacity_available: null,
        last_checked: null,
        note: describeSurveyPin(layerIndex, record),
        status: 'published',
      })
    }
  })
  return places
}

export function seedFromReview(review, { communityId = 'thaton' } = {}) {
  const rows = review.layers[0].records
  const zones = []
  for (const record of rows) {
    const zone = record.fields[ZONE_FIELD]
    if (zone && !zones.includes(zone)) zones.push(zone)
  }
  const hamlets = zones.map((name, index) => ({ id: `HM-${String(index + 1).padStart(3, '0')}`, community_id: communityId, name, aliases: [], center: null, note: '', status: 'published' }))
  const households = rows.map((first, index) => {
    const answers = {}
    for (const layer of review.layers) {
      const record = layer.records[index]
      if (seqOfHouseholdId(first.id) !== Number(record.id.split('-')[1])) throw new Error(`แถวที่ ${index + 1} ของหัวข้อ ${layer.id} ไม่ตรงกับครัวเรือนเดียวกัน`)
      for (const [key, value] of Object.entries(record.fields)) {
        if (key !== ZONE_FIELD) answers[key] = key === MEMBERS_FIELD ? Number(value) : value
      }
    }
    return {
      id: first.id,
      seq: seqOfHouseholdId(first.id),
      community_id: communityId,
      latitude: first.latitude,
      longitude: first.longitude,
      hamlet_id: hamlets.find((hamlet) => hamlet.name === first.fields[ZONE_FIELD])?.id ?? null,
      answers,
      published: true,
    }
  })
  return { hamlets, households }
}

export const metaFromReview = (review) => ({ sourceUrl: review.sourceUrl, title: review.title, importedAt: review.importedAt, surveyDate: review.surveyDate ?? null })

export function levelGroups(households, layerId = 'layer-1') {
  const layer = layerById(layerId)
  const live = households.filter((household) => household.published !== false)
  return LEVEL_DEFS[layerId].map((def) => ({
    key: def.key,
    label: def.label,
    color: def.color,
    count: live.filter((household) => layer.level(household.answers ?? {}) === def.key).length,
  }))
}

const THAILAND = { south: 5.5, north: 20.6, west: 97.3, east: 105.7 }
export function isThaiCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= THAILAND.south && latitude <= THAILAND.north && longitude >= THAILAND.west && longitude <= THAILAND.east
}

const err = (field, message) => ({ field, message })
const finish = (errors, value) => (errors.length ? { ok: false, errors } : { ok: true, value })

function readCoordinates(input, errors, { required }) {
  const hasLat = input.latitude !== undefined && input.latitude !== null && input.latitude !== ''
  const hasLng = input.longitude !== undefined && input.longitude !== null && input.longitude !== ''
  if (!hasLat && !hasLng) {
    if (required) errors.push(err('latitude', 'กรุณาระบุพิกัดละติจูดและลองจิจูด'))
    return null
  }
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  if (!hasLat || !hasLng || !isThaiCoordinate(latitude, longitude)) {
    errors.push(err('latitude', 'พิกัดไม่ถูกต้องหรืออยู่นอกประเทศไทย (ต้องมีทั้งละติจูดและลองจิจูด)'))
    return null
  }
  return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6 }
}

function readCommunity(input, errors) {
  const community = input.community_id ?? 'thaton'
  if (!COMMUNITY_IDS.includes(community)) errors.push(err('community_id', 'ไม่รู้จักรหัสชุมชนนี้'))
  return community
}

function readStatus(input, errors, fallback = 'draft') {
  const status = input.status ?? fallback
  if (!PUBLISH_STATUSES.includes(status)) errors.push(err('status', 'สถานะต้องเป็น draft หรือ published'))
  return status
}

// ---------- ครัวเรือน (ข้อมูลชุมชน) ----------

export const householdFields = () => Object.entries(FIELD_OPTIONS).map(([key, options]) => ({ key, options, required: !options.includes(UNKNOWN_ANSWER) }))

export function validateHousehold(input, { hamletIds = new Set(), partial = false } = {}) {
  const errors = []
  const value = {}
  if (input.name !== undefined) value.name = text(input.name, 120)
  else if (!partial) value.name = ''
  const coordinates = readCoordinates(input, errors, { required: !partial })
  if (coordinates) Object.assign(value, coordinates)
  if (input.community_id !== undefined || !partial) value.community_id = readCommunity(input, errors)

  if (input.hamlet_id !== undefined) {
    if (input.hamlet_id !== null && !hamletIds.has(input.hamlet_id)) errors.push(err('hamlet_id', 'ไม่พบหย่อมบ้านนี้ในทะเบียน'))
    else value.hamlet_id = input.hamlet_id
  } else if (!partial) value.hamlet_id = null

  const answers = {}
  const given = input.answers && typeof input.answers === 'object' ? input.answers : {}
  for (const { key, options, required } of householdFields()) {
    if (given[key] === undefined) {
      if (!partial) {
        if (required) errors.push(err(key, `กรุณาเลือกคำตอบ: ${key}`))
        else answers[key] = UNKNOWN_ANSWER
      }
      continue
    }
    if (!options.includes(given[key])) errors.push(err(key, `ตัวเลือกไม่ถูกต้อง: ${key}`))
    else answers[key] = given[key]
  }
  if (given[MEMBERS_FIELD] !== undefined || !partial) {
    const members = Number(given[MEMBERS_FIELD] ?? 0)
    if (!Number.isInteger(members) || members < 0 || members > 30) errors.push(err(MEMBERS_FIELD, 'จำนวนสมาชิกเปราะบางต้องเป็นจำนวนเต็ม 0–30'))
    else answers[MEMBERS_FIELD] = members
  }
  if (Object.keys(answers).length) value.answers = answers
  if (input.published !== undefined) value.published = Boolean(input.published)
  else if (!partial) value.published = true
  return finish(errors, value)
}

// ---------- หย่อมบ้าน ----------

// ตัดคำนำหน้าเพื่อหาชื่อที่น่าจะเป็นหย่อมเดียวกัน เช่น "บ้านไต" กับ "หย่อมบ้านไต"
const hamletKey = (name) => String(name ?? '').replace(/\s+/g, '').replace(/^(หย่อมบ้าน|หย่อม|บ้าน)/, '')

export function suggestHamletMerges(hamlets) {
  const groups = new Map()
  for (const hamlet of hamlets) {
    const key = hamletKey(hamlet.name)
    if (key.length < 2) continue
    groups.set(key, [...(groups.get(key) ?? []), hamlet])
  }
  return [...groups.values()].filter((group) => group.length > 1).map((group) => ({ ids: group.map((hamlet) => hamlet.id), names: group.map((hamlet) => hamlet.name) }))
}

export function findHamletByName(name, hamlets) {
  const wanted = String(name ?? '').trim()
  return wanted ? hamlets.find((hamlet) => hamlet.name === wanted || (hamlet.aliases ?? []).includes(wanted)) ?? null : null
}

export function validateHamlet(input, { others = [] } = {}) {
  const errors = []
  const name = text(input.name, 80)
  if (!name) errors.push(err('name', 'กรุณาระบุชื่อหย่อมบ้าน'))
  const aliases = [...new Set((Array.isArray(input.aliases) ? input.aliases : []).map((alias) => text(alias, 80)).filter((alias) => alias && alias !== name))].slice(0, 10)
  for (const taken of [name, ...aliases]) {
    const clash = others.find((other) => other.name === taken || (other.aliases ?? []).includes(taken))
    if (taken && clash) errors.push(err('name', `ชื่อ "${taken}" ซ้ำกับหย่อม "${clash.name}"`))
  }
  const value = { name, aliases, note: text(input.note, 300), community_id: readCommunity(input, errors), status: readStatus(input, errors, 'published') }
  const center = readCoordinates(input.center ?? {}, errors, { required: false })
  value.center = center
  return finish(errors, value)
}

export function hamletCounts(households, hamlets) {
  const live = households.filter((household) => household.published !== false)
  const counts = new Map(hamlets.map((hamlet) => [hamlet.id, 0]))
  let unassigned = 0
  for (const household of live) {
    if (household.hamlet_id && counts.has(household.hamlet_id)) counts.set(household.hamlet_id, counts.get(household.hamlet_id) + 1)
    else unassigned += 1
  }
  return { counts, unassigned }
}

// หน้าบ้านเห็นเฉพาะยอดรวมรายหย่อม ถ้าน้อยกว่าเกณฑ์ปกป้องข้อมูล (k) จะไม่บอกตัวเลข
export function publicHamletSummary(households, hamlets, k = HAMLET_K_THRESHOLD) {
  const { counts } = hamletCounts(households, hamlets)
  return hamlets.filter((hamlet) => hamlet.status !== 'draft').map((hamlet) => {
    const count = counts.get(hamlet.id) ?? 0
    return {
      id: hamlet.id,
      name: hamlet.name,
      note: hamlet.note || '',
      center: hamlet.center ?? null,
      households: count >= k ? count : null,
      householdsLabel: count >= k ? `${count} ครัวเรือน` : `น้อยกว่า ${k} ครัวเรือน`,
    }
  })
}

// ---------- สถานที่สำคัญ / แผนที่สำคัญ ----------

export const DEFAULT_PLACE_MAP = 'แผนที่จากสถานที่'

export const PIN_PATHS = {
  house: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  flag: '<path d="M4 22V3m0 0c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>',
  cross: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5z"/>',
  temple: '<path d="M3 21h18M5 21V10l7-6 7 6v11M10 21v-6h4v6"/>',
  book: '<path d="M4 4h16v14H4zM8 8h8M8 12h8"/>',
  building: '<path d="M5 21V4h14v17M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  pier: '<path d="M12 6v16"/><path d="m19 13 2-1a9 9 0 0 1-18 0l2 1"/><path d="M9 11h6"/><circle cx="12" cy="4" r="2"/>',
  pot: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM8 6c0-2 2-2 2-4M14 6c0-2 2-2 2-4"/>',
  chat: '<path d="M4 5h16v10H9l-5 4z"/>',
  car: '<path d="M3 15v-3l2-5h14l2 5v3M3 15h18M7 18v.01M17 18v.01"/>',
  alert: '<path d="m12 3 9.5 16.5H2.5L12 3Zm0 6v4m0 3.5h.01"/>',
  sensor: '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/><circle cx="12" cy="12" r="3"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
}

export const PIN_ICON_OPTIONS = [
  { id: 'house', label: 'ศูนย์พักพิง', usage: 'อาคารพักพิงชั่วคราวเมื่ออพยพ', kind: 'shelter', defaultColor: '#047857', path: PIN_PATHS.house },
  { id: 'flag', label: 'จุดรวมพล', usage: 'จุดนัดหมายรวมตัวก่อนเคลื่อนย้าย', kind: 'assembly', defaultColor: '#0369A1', path: PIN_PATHS.flag },
  { id: 'drop', label: 'แหล่งน้ำ / ประปา', usage: 'ประปาหมู่บ้าน บ่อน้ำ หรือจุดน้ำสะอาด', kind: 'water_supply', defaultColor: '#0284C7', path: PIN_PATHS.drop },
  { id: 'sensor', label: 'จุดตรวจคุณภาพน้ำ', usage: 'จุดเก็บตัวอย่างน้ำหรือเฝ้าระวังสารหนู', kind: 'water_supply', defaultColor: '#0891B2', path: PIN_PATHS.sensor },
  { id: 'alert', label: 'จุดเสี่ยงภัย / เตือนภัย', usage: 'จุดเสี่ยงน้ำหลาก ตลิ่งทรุด หรือพื้นที่เฝ้าระวัง', kind: 'other', defaultColor: '#DC2626', path: PIN_PATHS.alert },
  { id: 'cross', label: 'รพ.สต. / การแพทย์', usage: 'โรงพยาบาลส่งเสริมสุขภาพและจุดปฐมพยาบาล', kind: 'health_center', defaultColor: '#DC2626', path: PIN_PATHS.cross },
  { id: 'temple', label: 'วัด / ศาสนสถาน', usage: 'วัด มัสยิด โบสถ์ หรือพื้นที่พึ่งพิงชุมชน', kind: 'temple', defaultColor: '#B45309', path: PIN_PATHS.temple },
  { id: 'book', label: 'โรงเรียน', usage: 'โรงเรียนและศูนย์พัฒนาเด็กเล็ก', kind: 'school', defaultColor: '#0891B2', path: PIN_PATHS.book },
  { id: 'building', label: 'ศาลาประชาคม / อบต.', usage: 'ศาลาหมู่บ้าน อบต. เทศบาล หรือศูนย์ประสานงาน', kind: 'community_hall', defaultColor: '#4D7C0F', path: PIN_PATHS.building },
  { id: 'pier', label: 'ท่าเรือ / จุดข้ามน้ำ', usage: 'ท่าเรือชุมชน สะพาน หรือจุดขึ้นลงเรือ', kind: 'pier', defaultColor: '#1D4ED8', path: PIN_PATHS.pier },
  { id: 'pot', label: 'ครัวกลาง / เสบียง', usage: 'โรงครัวพระราชทาน จุดแจกอาหารและน้ำดื่ม', kind: 'kitchen', defaultColor: '#C2410C', path: PIN_PATHS.pot },
  { id: 'car', label: 'จุดย้ายรถ / ขนส่ง', usage: 'ที่จอดรถหนีน้ำและจุดรับ-ส่งผู้อพยพ', kind: 'vehicle_point', defaultColor: '#7C3AED', path: PIN_PATHS.car },
]

export const PIN_COLOR_OPTIONS = [
  { hex: '#047857', label: 'เขียว (ศูนย์พักพิง/ปลอดภัย)' },
  { hex: '#0284C7', label: 'ฟ้า (แหล่งน้ำ/ประปา)' },
  { hex: '#DC2626', label: 'แดง (จุดเสี่ยง/การแพทย์)' },
  { hex: '#D97706', label: 'ส้ม (เตือนภัย/วัด)' },
  { hex: '#7C3AED', label: 'ม่วง (จุดนัดหมาย/ขนส่ง)' },
  { hex: '#0891B2', label: 'คราม (โรงเรียน/จุดตรวจน้ำ)' },
  { hex: '#1D4ED8', label: 'น้ำเงิน (ท่าเรือ/ลำน้ำ)' },
  { hex: '#475569', label: 'เทา (สถานที่ราชการ/ทั่วไป)' },
]

// สีของหมุดตามชนิด; ศูนย์พักพิง/จุดรวมพลบนแท็บอพยพใช้สีเดิมของแท็บนั้น (evacuationColor)
export const PLACE_KINDS = {
  shelter: { label: 'ศูนย์พักพิง', color: '#047857', evacuationColor: '#B45309', path: PIN_PATHS.house },
  assembly: { label: 'จุดรวมพล', color: '#0369A1', evacuationColor: '#047857', path: PIN_PATHS.flag },
  vehicle_point: { label: 'จุดย้ายรถ', color: '#7C3AED', path: PIN_PATHS.car },
  health_center: { label: 'รพ.สต. / โรงพยาบาล', color: '#DC2626', path: PIN_PATHS.cross },
  temple: { label: 'วัด', color: '#B45309', path: PIN_PATHS.temple },
  school: { label: 'โรงเรียน', color: '#0891B2', path: PIN_PATHS.book },
  community_hall: { label: 'ศาลาประชาคม', color: '#4D7C0F', path: PIN_PATHS.building },
  local_admin: { label: 'อบต. / เทศบาล', color: '#475569', path: PIN_PATHS.building },
  water_supply: { label: 'ประปาชุมชน', color: '#0284C7', path: PIN_PATHS.drop },
  pier: { label: 'ท่าเรือ', color: '#1D4ED8', path: PIN_PATHS.pier },
  kitchen: { label: 'ครัวกลาง', color: '#C2410C', path: PIN_PATHS.pot },
  coordination_point: { label: 'จุดประสานงาน', color: '#9333EA', path: PIN_PATHS.chat },
  other: { label: 'อื่น ๆ', color: '#64748B', path: PIN_PATHS.dot },
}

export const PLACE_PRECISIONS = { approximate: 'ตำแหน่งประมาณ ยังไม่ยืนยันภาคสนาม', field_verified: 'ยืนยันตำแหน่งภาคสนามแล้ว' }
export const PLACE_OPERATIONAL = { unchecked: 'ยังไม่ตรวจความพร้อม', ready: 'ตรวจแล้ว พร้อมใช้งาน', closed: 'ปิดหรือใช้ไม่ได้' }

const optionalInteger = (value, field, errors, max) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0 || number > max) {
    errors.push(err(field, 'ต้องเป็นจำนวนเต็มไม่ติดลบ'))
    return null
  }
  return number
}

const optionalDate = (value, field, errors) => {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    errors.push(err(field, 'รูปแบบวันที่ไม่ถูกต้อง'))
    return null
  }
  return date.toISOString()
}

// ตามข้อ R24/R16: พิกัดเว้นว่างได้ (รอผูกจุด) ไม่มีช่องเบอร์โทรหรือผู้ติดต่อ ความจุตามแผนไม่ใช่ความพร้อมวันนี้
export function validatePlace(input) {
  const errors = []
  const name = text(input.name, 120)
  if (!name) errors.push(err('name', 'กรุณาระบุชื่อสถานที่'))
  if (!PLACE_KINDS[input.kind]) errors.push(err('kind', 'กรุณาเลือกชนิดของสถานที่'))
  const coordinates = readCoordinates(input, errors, { required: false })
  const precision = coordinates ? (input.location_precision === 'field_verified' ? 'field_verified' : 'approximate') : null
  if (input.location_precision !== undefined && input.location_precision !== null && !PLACE_PRECISIONS[input.location_precision]) errors.push(err('location_precision', 'ความแม่นยำตำแหน่งไม่ถูกต้อง'))
  const operational = input.operational_status ?? 'unchecked'
  if (!PLACE_OPERATIONAL[operational]) errors.push(err('operational_status', 'สถานะการใช้งานไม่ถูกต้อง'))
  const mapName = text(input.map_name, 120)
  const pinColor = typeof input.pin_color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(input.pin_color.trim()) ? input.pin_color.trim() : null
  const pinIcon = typeof input.pin_icon === 'string' && PIN_PATHS[input.pin_icon] ? input.pin_icon : null
  return finish(errors, {
    name,
    kind: input.kind,
    community_id: readCommunity(input, errors),
    source_section: text(input.source_section, 120),
    ...(mapName ? { map_name: mapName } : {}),
    ...(pinColor ? { pin_color: pinColor } : {}),
    ...(pinIcon ? { pin_icon: pinIcon } : {}),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    location_precision: precision,
    operational_status: operational,
    capacity_planned: optionalInteger(input.capacity_planned, 'capacity_planned', errors, 100000),
    capacity_available: optionalInteger(input.capacity_available, 'capacity_available', errors, 100000),
    last_checked: optionalDate(input.last_checked, 'last_checked', errors),
    note: text(input.note, 300),
    status: readStatus(input, errors),
  })
}

export function toPublicPlace(place) {
  const kind = PLACE_KINDS[place.kind] ?? PLACE_KINDS.other
  const customColor = typeof place.pin_color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(place.pin_color) ? place.pin_color : null
  const customPath = typeof place.pin_icon === 'string' && PIN_PATHS[place.pin_icon] ? PIN_PATHS[place.pin_icon] : null
  const located = place.latitude != null && place.longitude != null
  return {
    id: place.id,
    communityId: place.community_id ?? 'thaton',
    kind: place.kind,
    kindLabel: kind.label,
    name: place.name,
    latitude: located ? place.latitude : null,
    longitude: located ? place.longitude : null,
    color: customColor ?? kind.color,
    evacuationColor: customColor ?? kind.evacuationColor ?? kind.color,
    path: customPath ?? kind.path,
    ...(place.map_name ? { mapName: place.map_name } : {}),
    ...(place.pin_icon ? { pinIcon: place.pin_icon } : {}),
    ...(customColor ? { pinColor: customColor } : {}),
    sourceSection: place.source_section || '',
    precisionLabel: located ? PLACE_PRECISIONS[place.location_precision] ?? PLACE_PRECISIONS.approximate : 'ยังไม่มีพิกัด รอผูกจุด',
    operationalLabel: PLACE_OPERATIONAL[place.operational_status] ?? PLACE_OPERATIONAL.unchecked,
    capacityLabel: place.capacity_planned == null ? 'ความจุรอยืนยัน' : `ความจุตามแผน ${place.capacity_planned} คน (ยังไม่ยืนยันความพร้อมวันนี้)`,
    note: place.note || '',
  }
}

// สถานที่ที่ไม่มีพิกัดไม่ปักบนแผนที่ แต่แสดงเป็นรายการรอผูกจุด
export function publicPlaces(places) {
  const live = places.filter((place) => place.status === 'published').map(toPublicPlace)
  return { placed: live.filter((place) => place.latitude !== null), pending: live.filter((place) => place.latitude === null) }
}

export const EVACUATION_DESTINATION_KINDS = ['shelter', 'assembly']
export const evacuationDestinations = (places) => places
  .filter((place) => place.status === 'published' && EVACUATION_DESTINATION_KINDS.includes(place.kind) && place.latitude != null && place.longitude != null)
  .map((place) => ({ id: place.id, kind: place.kind, label: place.name, latitude: place.latitude, longitude: place.longitude }))

// ---------- เส้นทางอพยพตามแผน ----------

export function validateRoutes(input) {
  const errors = []
  const routes = Array.isArray(input.routes) ? input.routes : []
  if (routes.length === 0 || routes.length > 20) errors.push(err('routes', 'ต้องมีเส้นทาง 1–20 เส้น'))
  let total = 0
  const clean = routes.map((route, index) => {
    const points = Array.isArray(route) ? route : []
    total += points.length
    if (points.length < 2) errors.push(err('routes', `เส้นทางที่ ${index + 1} ต้องมีอย่างน้อย 2 จุด`))
    return points.map((point) => {
      const latitude = Array.isArray(point) ? Number(point[0]) : NaN
      const longitude = Array.isArray(point) ? Number(point[1]) : NaN
      if (!isThaiCoordinate(latitude, longitude)) errors.push(err('routes', `เส้นทางที่ ${index + 1} มีพิกัดไม่ถูกต้อง`))
      return [Math.round(latitude * 1e6) / 1e6, Math.round(longitude * 1e6) / 1e6]
    })
  })
  // คำขอรับได้ไม่เกิน 16 KB (readJsonBody) จึงจำกัดจำนวนจุดรวมไว้ที่ 400
  if (total > 400) errors.push(err('routes', 'จำนวนจุดรวมเกิน 400 จุด'))
  return finish(errors, { routes: clean, alignment: text(input.alignment, 60) || 'manual', source: text(input.source, 160) })
}

// ---------- การ์ดรู้จักชุมชน (หน้าหมู่บ้าน) ----------

export const PROFILE_FIELDS = ['title', 'basin', 'people', 'livelihood', 'risk']

export function sanitizeProfileBlocks(rawBlocks) {
  if (!Array.isArray(rawBlocks)) return []
  const cleaned = []
  for (let i = 0; i < Math.min(rawBlocks.length, 30); i += 1) {
    const block = rawBlocks[i]
    if (!block || typeof block !== 'object') continue
    const type = block.type
    const id = text(block.id, 80) || `blk-${i + 1}`
    if (type === 'text') {
      cleaned.push({
        id,
        type: 'text',
        heading: text(block.heading, 200),
        body: text(block.body, 4000),
      })
    } else if (type === 'image_text') {
      const layout = ['top', 'left', 'right'].includes(block.layout) ? block.layout : 'left'
      cleaned.push({
        id,
        type: 'image_text',
        layout,
        imageUrl: text(block.imageUrl, 500),
        caption: text(block.caption, 300),
        heading: text(block.heading, 200),
        body: text(block.body, 4000),
      })
    } else if (type === 'gallery') {
      const colsNum = Number(block.columns)
      const columns = colsNum === 1 || colsNum === 2 || colsNum === 3 ? colsNum : 2
      const images = Array.isArray(block.images)
        ? block.images.map((u) => text(u, 500)).filter(Boolean).slice(0, 24)
        : []
      cleaned.push({
        id,
        type: 'gallery',
        columns,
        images,
        caption: text(block.caption, 300),
      })
    } else if (type === 'file') {
      const files = Array.isArray(block.files)
        ? block.files
            .slice(0, 20)
            .map((f) => {
              const sizeNum = Number(f?.size)
              return {
                name: text(f?.name, 200) || 'ไฟล์แนบ',
                ...(Number.isFinite(sizeNum) && sizeNum > 0 ? { size: sizeNum } : {}),
                url: text(f?.url, 500),
              }
            })
            .filter((f) => f.url)
        : []
      cleaned.push({ id, type: 'file', files })
    }
  }
  return cleaned
}

export function validateProfile(input) {
  const errors = []
  const community = input.community_id
  if (!COMMUNITY_IDS.includes(community)) errors.push(err('community_id', 'ไม่รู้จักรหัสชุมชนนี้'))
  const value = { community_id: community }
  for (const field of PROFILE_FIELDS) {
    value[field] = text(input[field], 600)
    if (!value[field]) errors.push(err(field, 'กรุณากรอกข้อความให้ครบทุกช่อง'))
  }
  if (input.cover_image_url !== undefined) {
    value.cover_image_url = text(input.cover_image_url, 500)
  }
  if (Array.isArray(input.content_blocks)) {
    value.content_blocks = sanitizeProfileBlocks(input.content_blocks)
  }
  return finish(errors, value)
}

export const changedKeys = (before, after) => Object.keys(after).filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after[key]))
