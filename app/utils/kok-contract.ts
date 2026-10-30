import contractRaw from '../../data/contract-v5.json' with { type: 'json' }

export const contractData = contractRaw

export type CommunityTarget = {
  id: 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'
  name: string
  fullName: string
  subdistrict: string
  district: string
  province: string
  center: [number, number]
  zoomInner: number
  zoomOuter: number
  hasVerifiedSurvey: boolean
  surveyRows: number
  note: string
}

export const communityTargets: CommunityTarget[] = [
  {
    id: 'thaton',
    name: 'ท่าตอน',
    fullName: 'บ้านท่าตอน (เน้นหมู่ 3)',
    subdistrict: 'ต.ท่าตอน',
    district: 'อ.แม่อาย',
    province: 'จ.เชียงใหม่',
    center: [20.058, 99.361],
    zoomInner: 16,
    zoomOuter: 12,
    hasVerifiedSurvey: true,
    surveyRows: 129,
    note: 'มีชุดสำรวจชุมชนยืนยัน 129 แถว (123 รหัสไม่ซ้ำ) แสดงเป็นกริด 1 กม. 5 ช่อง (G01–G05 รวม 128 แถว ซ่อน 1 แถวตามกติกา k>=5) และมีแผนเผชิญเหตุ 9 หย่อมบ้าน (E04, E07)',
  },
  {
    id: 'ruammit',
    name: 'กะเหรี่ยงรวมมิตร',
    fullName: 'บ้านกะเหรี่ยงรวมมิตร',
    subdistrict: 'ต.แม่ยาว',
    district: 'อ.เมืองเชียงราย',
    province: 'จ.เชียงราย',
    center: [19.9605, 99.7082],
    zoomInner: 16,
    zoomOuter: 12,
    hasVerifiedSurvey: false,
    surveyRows: 0,
    note: 'อยู่ในทะเบียน 4 พื้นที่เป้าหมาย (Village!B1:E2) แต่ยังไม่มีชุดสำรวจรายครัวเรือนที่ยืนยันในรอบนี้ จึงไม่ปั้นตัวเลขจำลอง',
  },
  {
    id: 'pongkhong',
    name: 'ปงของ',
    fullName: 'บ้านปงของ',
    subdistrict: 'ต.แม่เงิน',
    district: 'อ.เชียงแสน',
    province: 'จ.เชียงราย',
    center: [20.3076, 100.2102],
    zoomInner: 16,
    zoomOuter: 12,
    hasVerifiedSurvey: false,
    surveyRows: 0,
    note: 'อยู่ในทะเบียน 4 พื้นที่เป้าหมาย (Village!B1:E2) แต่ยังไม่มีชุดสำรวจรายครัวเรือนที่ยืนยันในรอบนี้ จึงไม่ปั้นตัวเลขจำลอง',
  },
  {
    id: 'pakingtai',
    name: 'ปากอิงใต้',
    fullName: 'บ้านปากอิงใต้',
    subdistrict: 'ต.ศรีดอนชัย',
    district: 'อ.เชียงของ',
    province: 'จ.เชียงราย',
    // หมู่ 16 ปากอิงใต้: MDES village registry, entry 4334 (mdes.go.th/content/download-detail/4495).
    center: [20.203878, 100.449169],
    zoomInner: 16,
    zoomOuter: 12,
    hasVerifiedSurvey: false,
    surveyRows: 0,
    note: 'ใช้บ้านปากอิงใต้ตามชีต Village!B1:E2 และโปรโตไทป์ V9 (ไม่ใช้บ้านไห้) ยังไม่มีชุดสำรวจรายครัวเรือนที่ยืนยันในรอบนี้',
  },
]

export type PublicGridCell = {
  cellId: string
  records: number
  unit: string
  latLngBounds: Array<[number, number]>
  center: [number, number]
}

export const publicSurveyGridCells: PublicGridCell[] = (contractRaw.aggregate.grid.features ?? []).map((feature) => {
  const ring = feature.geometry.coordinates[0] ?? []
  const latLngBounds: Array<[number, number]> = ring.map((coord) => [
    Number((coord[1] ?? 0).toFixed(6)),
    Number((coord[0] ?? 0).toFixed(6)),
  ])
  const lats = latLngBounds.map(([lat]) => lat)
  const lons = latLngBounds.map(([, lon]) => lon)
  const center: [number, number] = [
    Number(((Math.min(...lats) + Math.max(...lats)) / 2).toFixed(6)),
    Number(((Math.min(...lons) + Math.max(...lons)) / 2).toFixed(6)),
  ]
  return {
    cellId: feature.properties.id,
    records: feature.properties.records,
    unit: feature.properties.unit,
    latLngBounds,
    center,
  }
})

const distributionHeaders: Record<string, string> = {
  '40': 'ข้อจำกัดสุขภาพ/ความเปราะบางในครัวเรือน (ว่าง 88/129 แถว)',
  '70': 'แหล่งน้ำดื่มหลักของครัวเรือน (น้ำดื่มบรรจุขวด/ถัง 104/129 แถว)',
  '72': 'ลำดับความสำคัญของปัญหาน้ำดื่มปลอดภัย (อันดับ 1 จำนวน 91/129 แถว)',
  '93': 'ความถี่การใช้น้ำจากแม่น้ำกกโดยตรง (ใช้ประจำ 7 · บางครั้ง 14 · ไม่เคย 106)',
  '127': 'ระดับความลึกน้ำท่วมบริเวณบ้านในรอบ 5 ปี (ท่วมบ้าน 60/129 แถว)',
  '150': 'ระดับความกังวลต่อผลกระทบและการปนเปื้อนของน้ำ (กังวลมาก/มากที่สุด 77/129)',
  '151': 'การมีแผนเตรียมพร้อมและรับมือภัยพิบัติของครัวเรือน',
  '159': 'ระยะเวลาที่ได้รับแจ้งเตือนล่วงหน้าก่อนเกิดเหตุ',
  '161': 'ช่องทางรับข้อมูลแจ้งเตือนภัยของครัวเรือน (หอกระจายข่าวรวม 103/129 แถว)',
}

export type SurveyDistributionColumn = {
  colKey: string
  header: string
  nonEmpty: number
  blank: number
  top: Array<{ value: string; count: number }>
}

export const surveyDistributionColumns: SurveyDistributionColumn[] = Object.entries(
  contractRaw.aggregate.response_distributions,
).map(([colKey, distObj]) => {
  const entries = Object.entries(distObj as Record<string, number>)
  const blankCount = Number((distObj as Record<string, number>)['(ว่าง)'] ?? 0)
  const totalCount = entries.reduce((sum, [, count]) => sum + Number(count), 0)
  const nonEmptyCount = totalCount - blankCount
  const sorted = entries
    .map(([value, count]) => ({ value, count: Number(count) }))
    .sort((a, b) => b.count - a.count)

  return {
    colKey,
    header: distributionHeaders[colKey] ?? `คอลัมน์ #${colKey}`,
    nonEmpty: nonEmptyCount,
    blank: blankCount,
    top: sorted,
  }
})

export const pcdRound22ComparableSeries = [
  {
    seriesId: 'pcd-kk01-v2',
    stationCode: 'KK01 (จุดใหม่ พ.ค. 2569)',
    locationLabel: 'ชายแดนไทย-เมียนมา ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่',
    matrix: 'น้ำผิวดิน (กรมควบคุมมลพิษ รอบที่ 22)',
    method: 'ICP-MS ห้องปฏิบัติการ (เกณฑ์มาตรฐานน้ำผิวดิน <= 10 ppb)',
    versionWarning: 'หมายเหตุ E16: จุดตรวจ KK01 มีการขยับตำแหน่งในเดือนพฤษภาคม 2569 จึงแยกเส้นแนวโน้มออกจากจุดเดิม',
    points: [
      { label: 'พ.ค. 69', ppb: 29, rawText: '0.029 mg/L' },
      { label: 'มิ.ย. 69', ppb: 24, rawText: '0.024 mg/L' },
      { label: 'ก.ค. 69', ppb: 18, rawText: '0.018 mg/L' },
      { label: '3–7 ส.ค. 69 (รอบ 22)', ppb: 15, rawText: '0.015 mg/L' },
    ],
  },
  {
    seriesId: 'pcd-kk03',
    stationCode: 'KK03 (สะพานมิตรภาพแม่นาวาง-ท่าตอน)',
    locationLabel: 'ต.ท่าตอน อ.แม่อาย จ.เชียงใหม่',
    matrix: 'น้ำผิวดิน (กรมควบคุมมลพิษ รอบที่ 22)',
    method: 'ICP-MS ห้องปฏิบัติการ (เกณฑ์มาตรฐานน้ำผิวดิน <= 10 ppb)',
    versionWarning: 'แสดงเฉพาะผลตรวจจากสถานีและวิธีวิเคราะห์เดียวกัน ค่า <0.010 mg/L แสดงแยกเป็นต่ำกว่าขีดจำกัดรายงาน ไม่แปลงเป็น 0',
    points: [
      { label: 'พ.ค. 69', ppb: 21, rawText: '0.021 mg/L' },
      { label: 'มิ.ย. 69', ppb: 16, rawText: '0.016 mg/L' },
      { label: 'ก.ค. 69', ppb: 12, rawText: '0.012 mg/L' },
      { label: '3–7 ส.ค. 69 (รอบ 22)', ppb: 11, rawText: '0.011 mg/L' },
    ],
  },
  {
    seriesId: 'pcd-kk12-v2',
    stationCode: 'KK12 (ปรับรหัสจาก KK13 ก.พ. 2569)',
    locationLabel: 'ท้ายน้ำแม่น้ำกกก่อนลงแม่น้ำโขง อ.เชียงแสน จ.เชียงราย',
    matrix: 'น้ำผิวดิน (กรมควบคุมมลพิษ รอบที่ 22)',
    method: 'ICP-MS ห้องปฏิบัติการ (เกณฑ์มาตรฐานน้ำผิวดิน <= 10 ppb)',
    versionWarning: 'หมายเหตุ E16: รหัสสถานีเปลี่ยนจาก KK13 เป็น KK12 ในเดือนกุมภาพันธ์ 2569 ห้ามลากเส้นเชื่อมปะปนโดยไม่แจ้งรุ่นสถานี',
    points: [
      { label: 'พ.ค. 69', ppb: 14, rawText: '0.014 mg/L' },
      { label: 'มิ.ย. 69', ppb: 11, rawText: '0.011 mg/L' },
      { label: 'ก.ค. 69', ppb: 9, rawText: '<0.010 mg/L (ต่ำกว่าเกณฑ์รายงาน)' },
      { label: '3–7 ส.ค. 69 (รอบ 22)', ppb: 9, rawText: '<0.010 mg/L (ต่ำกว่าเกณฑ์รายงาน)' },
    ],
  },
]
