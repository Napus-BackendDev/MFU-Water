const nouns = ['สายธาร', 'ใบไม้', 'เมฆ', 'ดอกบัว', 'ต้นไผ่', 'ภูเขา', 'แสงดาว', 'หยดน้ำ', 'สายลม', 'ตะวัน', 'ทุ่งหญ้า', 'นกน้อย', 'ดอกแก้ว', 'สายฝน', 'ทะเล', 'ป่าไม้'];
const adjectives = ['สดใส', 'อ่อนโยน', 'สงบ', 'อบอุ่น', 'เบิกบาน', 'ร่มเย็น', 'ยิ้มแย้ม', 'นุ่มนวล', 'แจ่มใส', 'แสนดี', 'สีทอง', 'สีคราม', 'พราวแสง', 'ละมุน', 'ชื่นใจ', 'สุขใจ'];

// An alias belongs to a public sample, never a person or their contact details.
// Randomly generated sample codes provide variety; the same record stays stable.
export function publicPseudonym(sampleCode) {
  if (typeof sampleCode !== 'string' || !sampleCode) return 'ผู้ไม่เปิดเผยชื่อ';
  let hash = 2166136261;
  for (const character of sampleCode) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
  return `${nouns[hash & 15]}${adjectives[(hash >>> 4) & 15]}-${(hash >>> 8).toString(16).padStart(6, '0')}`;
}
