const nouns = [
  'สายธาร', 'ใบไม้', 'เมฆ', 'ดอกบัว', 'ต้นไผ่', 'ภูเขา', 'แสงดาว', 'หยดน้ำ',
  'สายลม', 'ตะวัน', 'ทุ่งหญ้า', 'นกน้อย', 'ดอกแก้ว', 'สายฝน', 'ทะเล', 'ป่าไม้',
]
const adjectives = [
  'สดใส', 'อ่อนโยน', 'สงบ', 'อบอุ่น', 'เบิกบาน', 'ร่มเย็น', 'ยิ้มแย้ม', 'นุ่มนวล',
  'แจ่มใส', 'แสนดี', 'สีทอง', 'สีคราม', 'พราวแสง', 'ละมุน', 'ชื่นใจ', 'สุขใจ',
]

/**
 * แปลงรหัสตัวอย่างน้ำ (sampleCode) เป็นชื่อสมมติแนวธรรมชาติแบบ deterministic
 * เพื่อปกปิดชื่อ-นามสกุลจริงและเบอร์โทรศัพท์ของผู้ส่งในหน้าแสดงผลสาธารณะ
 */
export function publicPseudonym(sampleCode) {
  if (typeof sampleCode !== 'string' || !sampleCode) return 'ผู้ไม่เปิดเผยชื่อ'
  let hash = 2166136261
  for (const character of sampleCode) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619) >>> 0
  }
  const noun = nouns[hash & 15]
  const adj = adjectives[(hash >>> 4) & 15]
  const suffix = (hash >>> 8).toString(16).padStart(6, '0')
  return `${noun}${adj}-${suffix}`
}
