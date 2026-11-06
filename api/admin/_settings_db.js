import { getDb } from '../surveys/_db.js'

const SETTINGS_COLL = 'kok_project_settings'
const AUDIT_COLL = 'kok_map_audit'

const defaultSponsors = [
  {
    id: 'SPON-01',
    name: 'Australian Aid (DFAT)',
    program: 'โครงการความร่วมมือเพื่อการพัฒนาลุ่มน้ำโขง-ลุ่มน้ำกก',
    logoUrl: '/sponsors/australian-aid.png',
    isActive: true,
    creditText: 'ได้รับการสนับสนุนงบประมาณจาก Australian Aid ภายใต้โครงการ IP3',
  },
  {
    id: 'SPON-02',
    name: 'Oxfam in Thailand',
    program: 'นวัตกรรมเฝ้าระวังมลพิษทางน้ำและสิทธิชุมชน',
    logoUrl: '/sponsors/oxfam.png',
    isActive: true,
    creditText: 'ร่วมสนับสนุนชุดตรวจสารหนูภาคสนามและการเสริมพลังอาสาสมัครชุมชน',
  },
  {
    id: 'SPON-03',
    name: 'มหาวิทยาลัยแม่ฟ้าหลวง (มฟล.)',
    program: 'สถาบันวิจัยและนวัตกรรมเพื่อการพัฒนาลุ่มน้ำกก',
    logoUrl: '/sponsors/mfu.png',
    isActive: true,
    creditText: 'ศูนย์วิจัยสารพิษและคุณภาพน้ำ มหาวิทยาลัยแม่ฟ้าหลวง',
  },
  {
    id: 'SPON-04',
    name: 'Swiss Agency for Development and Cooperation (SDC)',
    program: 'ความร่วมมือด้านน้ำและการจัดการภัยพิบัติลุ่มน้ำโขง',
    logoUrl: '/sponsors/sdc.png',
    isActive: true,
    creditText: 'สนับสนุนการเฝ้าระวังคุณภาพน้ำร่วมกับเครือข่ายชุมชนลุ่มน้ำกก',
  },
]

const defaultContacts = [
  {
    agency: 'รพ.สต. บ้านท่าตอน',
    community: 'บ้านท่าตอน (อ.แม่อาย)',
    phone: '053-051-234',
    duty: 'จุดคัดกรองสุขภาพผู้สัมผัสสารหนูและศูนย์ปฐมพยาบาล',
  },
  {
    agency: 'รพ.สต. บ้านรวมมิตร',
    community: 'บ้านกะเหรี่ยงรวมมิตร (อ.เมืองเชียงราย)',
    phone: '053-737-123',
    duty: 'หน่วยพยาบาลเคลื่อนที่และตรวจอาการสะสม',
  },
  {
    agency: 'ปภ. จังหวัดเชียงใหม่ (สาขาฝาง)',
    community: 'ลุ่มน้ำกกตอนบน',
    phone: '053-452-111',
    duty: 'ศูนย์เตือนภัยน้ำหลากฉับพลันและเรือท้องแบนกู้ชีพ',
  },
  {
    agency: 'ปภ. จังหวัดเชียงราย',
    community: 'ลุ่มน้ำกกตอนกลาง-ตอนล่าง',
    phone: '053-152-345',
    duty: 'ศูนย์ประสานงานอพยพภัยพิบัติจังหวัด',
  },
  {
    agency: 'สายด่วนแพทย์ฉุกเฉินกู้ชีพ',
    community: 'ทุกพื้นที่',
    phone: '1669',
    duty: 'สายด่วนกู้ชีพฉุกเฉิน 24 ชั่วโมง',
  },
  {
    agency: 'สายด่วน ปภ. รับแจ้งเตือนภัย',
    community: 'ทุกพื้นที่',
    phone: '1784',
    duty: 'รับแจ้งเหตุน้ำท่วม ดินถล่ม ตลอด 24 ชม.',
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

export async function getProjectSettings(settings) {
  const db = await getDb(settings)
  const coll = db.collection(SETTINGS_COLL)

  let sponsorsDoc = await coll.findOne({ _id: 'sponsors' })
  if (!sponsorsDoc) {
    const now = new Date().toISOString()
    sponsorsDoc = {
      _id: 'sponsors',
      items: defaultSponsors,
      updated_at: now,
      updated_by: 'ระบบตั้งต้น',
    }
    await coll.insertOne(sponsorsDoc)
  }

  let contactsDoc = await coll.findOne({ _id: 'contacts' })
  if (!contactsDoc) {
    const now = new Date().toISOString()
    contactsDoc = {
      _id: 'contacts',
      items: defaultContacts,
      updated_at: now,
      updated_by: 'ระบบตั้งต้น',
    }
    await coll.insertOne(contactsDoc)
  }

  // Audit logs from kok_map_audit
  const auditColl = db.collection(AUDIT_COLL)
  const rawAudit = await auditColl.find({}).sort({ at: -1 }).limit(30).toArray()
  const auditLogs = rawAudit.map((a, idx) => ({
    id: `LOG-${String(idx + 1001)}`,
    timestamp: a.at ? new Date(a.at).toLocaleString('th-TH') : new Date().toLocaleString('th-TH'),
    reviewer: a.by || 'ผู้ดูแลระบบ',
    action: a.action === 'create' ? `สร้าง ${a.target || 'ข้อมูล'}` : a.action === 'delete' ? `ลบ ${a.target || 'ข้อมูล'}` : `แก้ไข ${a.target || 'ข้อมูล'}`,
    target: a.target || 'ระบบ',
    status: 'success',
  }))

  return {
    sponsors: sponsorsDoc.items || defaultSponsors,
    contacts: contactsDoc.items || defaultContacts,
    auditLogs: auditLogs.length > 0 ? auditLogs : [
      {
        id: 'LOG-1001',
        timestamp: new Date().toLocaleString('th-TH'),
        reviewer: 'ระบบอัตโนมัติ',
        action: 'เริ่มต้นระบบตรวจสอบและเชื่อมต่อฐานข้อมูล MongoDB พร้อมใช้งาน',
        target: 'kok_project_settings',
        status: 'success',
      },
    ],
  }
}

export async function updateSponsors(settings, items, author = 'แอดมิน') {
  const db = await getDb(settings)
  const coll = db.collection(SETTINGS_COLL)
  const now = new Date().toISOString()

  await coll.updateOne(
    { _id: 'sponsors' },
    { $set: { items, updated_at: now, updated_by: author } },
    { upsert: true }
  )

  // Record audit log
  await db.collection(AUDIT_COLL).insertOne({
    at: now,
    by: author,
    action: 'update',
    target: 'ผู้สนับสนุนและแหล่งทุน (Sponsors)',
    changed: ['sponsors_list'],
  })

  return items
}

export async function updateContacts(settings, items, author = 'แอดมิน') {
  const db = await getDb(settings)
  const coll = db.collection(SETTINGS_COLL)
  const now = new Date().toISOString()

  await coll.updateOne(
    { _id: 'contacts' },
    { $set: { items, updated_at: now, updated_by: author } },
    { upsert: true }
  )

  // Record audit log
  await db.collection(AUDIT_COLL).insertOne({
    at: now,
    by: author,
    action: 'update',
    target: 'เบอร์ติดต่อฉุกเฉินและหน่วยงานเครือข่าย',
    changed: ['emergency_contacts'],
  })

  return items
}
