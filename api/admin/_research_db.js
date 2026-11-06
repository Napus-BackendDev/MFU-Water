import { getDb } from '../surveys/_db.js'

const COLLECTION = 'kok_research_hub'

const defaultTeams = [
  {
    id: 'swg1',
    code: 'SWG 1',
    name: 'ระบบกรองน้ำบำบัดสารหนู',
    leadTopic: 'นวัตกรรมระบบกรองทรายชีวภาพ (Bio-sand Filter) และคู่มือชุมชน',
    subtopics: ['การบำบัดสารหนูด้วยทรายและเหล็ก', 'คู่มือสร้างถังกรองขนาดครัวเรือน', 'การล้างทำความสะอาดไส้กรอง'],
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    status: 'published',
    lastUpdated: '1 พ.ย. 2569',
    summary: 'ระบบกรองทรายชีวภาพผสมเศษตะปูเหล็ก (Iron-enhanced bio-sand) สามารถดูดซับสารหนูชนิด As(III) และ As(V) ได้มากกว่า 90% เหมาะสำหรับครัวเรือนริมน้ำกกที่ต้องใช้น้ำจากบ่อตื้น',
    guidelines: [
      'ใช้อัตราการไหลของน้ำ 20–30 ลิตร/ชั่วโมง เพื่อให้จุลินทรีย์ทำงานได้สมบูรณ์',
      'ล้างทำความสะอาดชั้นทรายด้านบน (Schmutzdecke) ทุก 2-3 สัปดาห์',
      'ตรวจวัดน้ำหลังกรองทุก 3 เดือนด้วยชุดตรวจภาคสนาม',
    ],
    metrics: [
      { label: 'ประสิทธิภาพกรองสารหนู', value: '> 90%' },
      { label: 'ต้นทุนเฉลี่ยต่อครัวเรือน', value: '450 บาท' },
      { label: 'ครัวเรือนต้นแบบนำร่อง', value: '18 หลังคาเรือน' },
    ],
    pdfDownloadName: 'คู่มือสร้างถังกรองทรายชีวภาพ_SWG1.pdf',
    downloadsCount: 42,
  },
  {
    id: 'swg2',
    code: 'SWG 2.1',
    name: 'เฝ้าระวังคุณภาพน้ำและแล็บ',
    leadTopic: 'รายงานผลการวิเคราะห์ตัวอย่างน้ำ 22 รอบ และแนวโน้มฤดูกาล',
    subtopics: ['ผลแล็บ ICP-MS เทียบชุดตรวจภาคสนาม', 'แนวโน้มสารหนูช่วงน้ำหลาก vs น้ำแล้ง', 'เกณฑ์ปลอดภัยน้ำดื่ม'],
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
    status: 'published',
    lastUpdated: '31 ต.ค. 2569',
    summary: 'การติดตามตรวจวัดคุณภาพน้ำในแม่น้ำกกต่อเนื่อง 22 รอบ พบว่าสารหนูมีความเข้มข้นสูงขึ้นในฤดูแล้ง (ก.พ.–เม.ย.) เนื่องจากปริมาณน้ำเจือจางลดลง ขณะที่ฤดูน้ำหลากมีการพัดพาตะกอนแขวนลอยที่มีสารหนูปะปน',
    guidelines: [
      'น้ำดื่มต้องมีสารหนูไม่เกิน 10 ppb (ตามเกณฑ์ WHO) หรือไม่เกิน 50 ppb ในภาวะฉุกเฉิน',
      'เลี่ยงการสูบน้ำดิบเข้าหมู่บ้านในช่วงต้นฤดูน้ำหลากแรก (First flush)',
      'ชุดตรวจภาคสนามให้ผลแม่นยำสอดคล้องกับแล็บ ICP-MS ในช่วง 10–100 ppb',
    ],
    metrics: [
      { label: 'จำนวนรอบการตรวจแล็บ', value: '22 รอบ' },
      { label: 'จุดตรวจเฝ้าระวังถาวร', value: '14 สถานี' },
      { label: 'ความแม่นยำเทียบชุดตรวจ', value: '94.2%' },
    ],
    pdfDownloadName: 'รายงานเฝ้าระวังคุณภาพน้ำกก_SWG2.pdf',
    downloadsCount: 38,
  },
  {
    id: 'swg3',
    code: 'SWG 3',
    name: 'เศรษฐกิจชุมชนและการเกษตร',
    leadTopic: 'ปฏิทินเกษตรกรรมลุ่มน้ำกกและแนวทางการใช้น้ำปลอดภัยในรอบทำนา',
    subtopics: ['ปฏิทินเพาะปลูกข้าวนาปี/นาปรัง', 'การดูดซึมสารหนูในรวงข้าว', 'การจัดการแปลงนาสลับเปียกแห้ง'],
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    status: 'published',
    lastUpdated: '28 ต.ค. 2569',
    summary: 'งานวิจัยพบว่าการทำนาแบบเปียกสลับแห้ง (AWD - Alternate Wetting and Drying) ช่วยลดการดูดซึมสารหนูเข้าสู่รวงข้าวได้ถึง 40% เมื่อเทียบกับการขังน้ำตลอดเวลา พร้อมคำแนะนำช่วงเวลาสูบน้ำเข้าแปลง',
    guidelines: [
      'งดสูบน้ำจากแม่น้ำกกเข้าแปลงนาช่วงข้าวตั้งท้องหากค่าเกิน 50 ppb',
      'นำระบบทำนาเปียกสลับแห้งมาใช้เพื่อลดการสะสมของสารหนูในเมล็ดข้าว',
      'ตรวจสารหนูในดินและรวงข้าวหลังเก็บเกี่ยวเป็นประจำทุกปี',
    ],
    metrics: [
      { label: 'แปลงนาสาธิต', value: '6 แปลง' },
      { label: 'ลดการสะสมในข้าว', value: 'ลดลง 40%' },
      { label: 'ประหยัดน้ำสูบ', value: '25%' },
    ],
    pdfDownloadName: 'ปฏิทินเกษตรปลอดภัยลุ่มน้ำกก_SWG3.pdf',
    downloadsCount: 19,
  },
  {
    id: 'swg41',
    code: 'SWG 4.1',
    name: 'สุขภาพและพิษวิทยาสารหนู',
    leadTopic: 'สัญญาณเตือนอาการสารหนูสะสมเรื้อรัง และคู่มือคัดกรอง รพ.สต.',
    subtopics: ['อาการทางผิวหนังและการเปลี่ยนสีผิว (Keratosis)', 'ผลกระทบต่อตับและไต', 'เกณฑ์คัดกรองกลุ่มเสี่ยง รพ.สต.'],
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    status: 'published',
    lastUpdated: '25 ต.ค. 2569',
    summary: 'คู่มือสุขภาพชุมชนอธิบายภาษาชาวบ้าน: อาการตุ่มแข็งที่ฝ่ามือฝ่าเท้า (Keratosis) รอยด่างดำเหมือนหยดน้ำฝนบนผิวหนัง และอาการอ่อนเพลียเรื้อรัง พร้อมเชื่อมประสานจุดส่งต่อผู้ป่วยไปยัง รพ.สต.',
    guidelines: [
      'สังเกตความผิดปกติที่ผิวหนัง: ตุ่มแข็งที่ฝ่ามือ ฝ่าเท้า หรือผิวหนังคล้ำเป็นหย่อม',
      'หากดื่มน้ำจากแหล่งเสี่ยงเกิน 6 เดือน ควรเข้าตรวจปัสสาวะที่ รพ.สต.',
      'รพ.สต. ใน 4 ชุมชนเป้าหมายมีชุดประเมินสุขภาพเบื้องต้นรองรับ',
    ],
    metrics: [
      { label: 'ตรวจคัดกรองประชาชนแล้ว', value: '6,269 คน' },
      { label: 'รพ.สต. เครือข่าย', value: '8 แห่ง' },
      { label: 'กลุ่มที่ต้องติดตามใกล้ชิด', value: '114 คน' },
    ],
    pdfDownloadName: 'คู่มือสุขภาพและอาการสารหนู_SWG41.pdf',
    downloadsCount: 56,
  },
  {
    id: 'swg42',
    code: 'SWG 4.2',
    name: 'สังคมและกลุ่มเปราะบาง',
    leadTopic: 'ดัชนีความเปราะบางรายหมู่บ้าน (SIMVA) และข้อมูลสวัสดิการ',
    subtopics: ['ดัชนีกลุ่มเปราะบางระดับ 1–5', 'ทะเบียนผู้สูงอายุติดเตียงและผู้พิการ', 'การคุ้มครองข้อมูลส่วนบุคคล (PDPA)'],
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
    status: 'published',
    lastUpdated: '20 ต.ค. 2569',
    summary: 'การจำแนกความเปราะบาง 5 ระดับ ช่วยให้ผู้นำชุมชนและทีมกู้ภัยรู้ว่าหลังคาเรือนใดต้องการความช่วยเหลือเร่งด่วนในภาวะฉุกเฉิน โดยข้อมูลหมุดรายบ้านถูกเก็บเป็นความลับ (Private) เผยแพร่เฉพาะสถิติภาพรวม',
    guidelines: [
      'ระดับ 1 (วิกฤต): ผู้ป่วยติดเตียงและคนพิการ ช่วยเหลือตัวเองไม่ได้ ต้องอพยพทันที',
      'ระดับ 2 (เร่งด่วน): ผู้สูงอายุอยู่ตามลำพังและเด็กเล็ก ขาดพาหนะ',
      'ระดับ 5 (ทั่วไป): ครัวเรือนแข็งแรง มีพาหนะและระบบกรองน้ำเอง',
    ],
    metrics: [
      { label: 'หลังคาเรือนในระบบสำรวจ', value: '129 ครัวเรือน' },
      { label: 'กลุ่มวิกฤตในคิวอพยพ', value: '68 หลังคาเรือน' },
      { label: 'ระดับความปลอดภัยข้อมูล', value: 'PDPA Compliant' },
    ],
    pdfDownloadName: 'รายงานดัชนีเปราะบางชุมชน_SWG42.pdf',
    downloadsCount: 31,
  },
  {
    id: 'swg5',
    code: 'SWG 5',
    name: 'แผนจัดการภัยพิบัติน้ำท่วม',
    leadTopic: 'แบบจำลองพื้นที่น้ำท่วม แผนรับมือฉุกเฉิน และศูนย์พักพิงชุมชน',
    subtopics: ['แบบจำลองความสูงน้ำ 3 ระดับ', 'จุดปลอดภัยและศูนย์พักพิงตามแผน', 'เส้นทางอพยพเลี่ยงดินสไลด์'],
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
    status: 'published',
    lastUpdated: '18 ต.ค. 2569',
    summary: 'แผนเผชิญเหตุน้ำท่วมและดินถล่มเฉพาะ 4 ชุมชน เชื่อมโยงจุดรวมพล ศูนย์พักพิงที่มีน้ำดื่มสะอาด และเส้นทางอพยพที่ไม่ถูกตัดขาดเมื่อน้ำล้นตลิ่ง',
    guidelines: [
      'เมื่อระดับน้ำกกเกินตลิ่ง 1 เมตร ให้เคลื่อนย้ายกลุ่มระดับ 1 สู่ศูนย์พักพิงทันที',
      'ศูนย์พักพิงหลักบ้านท่าตอนอยู่ที่ ศาลาประชาคม และ วัดท่าตอน',
      'ตรวจสอบถังสำรองน้ำสะอาดในศูนย์พักพิงก่อนฤดูน้ำหลากทุกปี',
    ],
    metrics: [
      { label: 'ศูนย์พักพิงรับรอง', value: '12 แห่ง' },
      { label: 'เส้นทางอพยพปลอดภัย', value: '8 เส้นทาง' },
      { label: 'จุดเสี่ยงดินสไลด์', value: '5 จุด' },
    ],
    pdfDownloadName: 'แผนจัดการภัยพิบัติน้ำท่วม_SWG5.pdf',
    downloadsCount: 27,
  },
  {
    id: 'swg6',
    code: 'SWG 6',
    name: 'ภูมิสารสนเทศแปลงนาและผังน้ำ',
    leadTopic: 'ผังลุ่มน้ำกก แปลงนาข้าว แนวตลิ่ง และชั้นข้อมูลแผนที่ KML',
    subtopics: ['แนวตลิ่งพังทลายและการเปลี่ยนแปลงทางน้ำ', 'แปลงนาข้าวในเขตท่วมซ้ำซาก', 'ชั้นข้อมูล GIS นำเข้า My Maps'],
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900',
    status: 'published',
    lastUpdated: '15 ต.ค. 2569',
    summary: 'ชุดชั้นข้อมูลภูมิสารสนเทศที่ระบุแนวทางน้ำเดิม ลำเหมืองสาขา แปลงนาข้าวที่เสี่ยงน้ำท่วมขัง และพิกัดหมู่บ้าน นำเสนอแบบแยกทีละเรื่องเพื่อความเข้าใจง่ายของชาวบ้าน',
    guidelines: [
      'ใช้ภาพถ่ายดาวเทียมความละเอียดสูงตรวจติดตามแนวตลิ่งพังทลายทุก 6 เดือน',
      'เชื่อมข้อมูล KML เข้ากับ My Maps หน้าบ้านเพื่อให้ชุมชนดาวน์โหลดได้',
      'ไม่ซ้อนชั้นข้อมูลหลายชั้นพร้อมกันเกิน 2 เลเยอร์ เพื่อป้องกันความสับสน',
    ],
    metrics: [
      { label: 'ระยะทางลำน้ำที่สำรวจ', value: '130 กม.' },
      { label: 'เลเยอร์ KML ที่เปิดใช้', value: '6 ชุดข้อมูล' },
      { label: 'แปลงนาในเขตเฝ้าระวัง', value: '42 แปลง' },
    ],
    pdfDownloadName: 'ผังภูมิสารสนเทศลุ่มน้ำกก_SWG6.pdf',
    downloadsCount: 44,
  },
  {
    id: 'swg7',
    code: 'SWG 7',
    name: 'นิเวศวัฒนธรรมและประวัติศาสตร์น้ำกก',
    leadTopic: 'ไทม์ไลน์ 11 ยุคประวัติศาสตร์ลุ่มน้ำกก และภูมิปัญญาเหมืองฝาย',
    subtopics: ['ประวัติศาสตร์แม่น้ำกับวิถีชุมชน 11 ช่วง', 'ระบบจัดการน้ำเหมืองฝายดั้งเดิม', 'วิดีโอบันทึกคำบอกเล่าปราชญ์ชาวบ้าน'],
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    status: 'published',
    lastUpdated: '12 ต.ค. 2569',
    summary: 'องค์ความรู้ทางประวัติศาสตร์และนิเวศวัฒนธรรมที่สะท้อนว่าชาวลุ่มน้ำกกอยู่ร่วมกับแม่น้ำอย่างไรตั้งแต่อดีต วิวัฒนาการของเหมืองฝาย และการปรับตัวของ 4 กลุ่มชาติพันธุ์ริมฝั่งน้ำ',
    guidelines: [
      'ถ่ายทอดประวัติศาสตร์ 11 ยุคแก่นักเรียนและเยาวชนในโรงเรียนลุ่มน้ำกก',
      'ฟื้นฟูภูมิปัญญาเหมืองฝายเพื่อช่วยชะลอน้ำและดักตะกอนปนเปื้อน',
      'บันทึกภูมิปัญญาปราชญ์ชาวบ้านเป็นคลิปสั้นเผยแพร่ในศูนย์ข้อมูล',
    ],
    metrics: [
      { label: 'ยุคประวัติศาสตร์ที่บันทึก', value: '11 ช่วงยุค' },
      { label: 'ภูมิปัญญาเหมืองฝาย', value: '14 ปราชญ์' },
      { label: 'คลิปสัมภาษณ์ผู้นำดั้งเดิม', value: '8 คลิป' },
    ],
    pdfDownloadName: 'ประวัติศาสตร์นิเวศวัฒนธรรมน้ำกก_SWG7.pdf',
    downloadsCount: 51,
  },
]

function plain(doc) {
  if (!doc) return doc
  const { _id: _ignored, ...rest } = doc
  for (const [key, value] of Object.entries(rest)) {
    if (value instanceof Date) rest[key] = value.toISOString()
  }
  return rest
}

async function ensureSeeded(collection) {
  const count = await collection.countDocuments()
  if (count === 0) {
    const now = new Date().toISOString()
    const docs = defaultTeams.map((t) => ({
      ...t,
      created_at: now,
      updated_at: now,
      updated_by: 'ระบบตั้งต้น (Initial Seed)',
    }))
    await collection.insertMany(docs)
  }
}

export async function listResearchTeams(settings) {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  await ensureSeeded(collection)
  const docs = await collection.find({}).sort({ id: 1 }).toArray()
  return docs.map(plain)
}

export async function updateResearchTeam(settings, id, patch, author = 'แอดมิน') {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  const now = new Date().toISOString()

  const allowed = ['summary', 'guidelines', 'metrics', 'status', 'lastUpdated', 'leadTopic', 'subtopics']
  const updates = {}
  for (const key of allowed) {
    if (patch[key] !== undefined) updates[key] = patch[key]
  }
  updates.updated_at = now
  updates.updated_by = author

  const res = await collection.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return plain(res)
}

export async function recordDownload(settings, id) {
  const db = await getDb(settings)
  const collection = db.collection(COLLECTION)
  await collection.updateOne({ id }, { $inc: { downloadsCount: 1 } })
}
