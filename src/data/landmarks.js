export const LANDMARKS = [
  {
    id: 'mfu',
    name: 'มหาวิทยาลัยแม่ฟ้าหลวง (MFU)',
    nameEn: 'Mae Fah Luang University',
    category: 'education',
    coordinates: [99.8945, 20.0454], // [lng, lat]
    elevation: '425 ม. (รทก.)',
    riskLevel: 'low',
    description: 'มหาวิทยาลัยท่ามกลางขุนเขา มีอ่างเก็บน้ำ มฟล. และระบบระบายน้ำภายใน มีความสูงพ้นเขตน้ำท่วมตลิ่งกก',
    iconColor: '#0ea5e9'
  },
  {
    id: 'khua-mangrai',
    name: 'สะพานขัวพญามังราย (แม่น้ำกก)',
    nameEn: 'Khua Phaya Mengrai Bridge',
    category: 'critical_bridge',
    coordinates: [99.8295, 19.9142],
    elevation: '392 ม. (รทก.)',
    riskLevel: 'high',
    description: 'สะพานข้ามแม่น้ำกกสายหลักใจกลางเมืองเชียงราย เป็นจุดเฝ้าระวังระดับน้ำวิกฤตสูงสุดของเมือง',
    iconColor: '#f97316'
  },
  {
    id: 'chiangrai-weir',
    name: 'ฝายเชียงราย (ประตูระบายน้ำ)',
    nameEn: 'Chiang Rai Weir & Sluice Gate',
    category: 'infrastructure',
    coordinates: [99.8458, 19.9240],
    elevation: '390 ม. (รทก.)',
    riskLevel: 'high',
    description: 'โครงสร้างควบคุมการไหลของแม่น้ำกก และระบายน้ำสู่พื้นที่เกษตรกรรมตอนล่าง',
    iconColor: '#eab308'
  },
  {
    id: 'koh-loi',
    name: 'เกาะลอย & หาดเชียงราย',
    nameEn: 'Koh Loi Island & Chiang Rai Beach',
    category: 'recreation',
    coordinates: [99.8375, 19.9175],
    elevation: '388 ม. (รทก.)',
    riskLevel: 'critical',
    description: 'พื้นที่ราบลุ่มติดแม่น้ำกก เป็นจุดแรกที่น้ำจะเอ่อล้นตลิ่งเมื่อระดับน้ำกกสูงเกิน 3.5 เมตร',
    iconColor: '#ef4444'
  },
  {
    id: 'airport-cei',
    name: 'ท่าอากาศยานแม่ฟ้าหลวง เชียงราย (CEI)',
    nameEn: 'Mae Fah Luang Int. Airport',
    category: 'transport',
    coordinates: [99.8825, 19.9525],
    elevation: '396 ม. (รทก.)',
    riskLevel: 'medium',
    description: 'สนามบินหลักของจังหวัด ทางทิศตะวันออกเฉียงเหนือ ติดแนวคลองส่งน้ำและที่ลุ่มกก',
    iconColor: '#3b82f6'
  },
  {
    id: 'korn-kok-confluence',
    name: 'จุดบรรจบแม่น้ำกรณ์ - แม่น้ำกก',
    nameEn: 'Korn & Kok River Confluence',
    category: 'hydrology',
    coordinates: [99.8700, 19.9325],
    elevation: '387 ม. (รทก.)',
    riskLevel: 'high',
    description: 'จุดที่ลำน้ำกรณ์ไหลมาสบกับแม่น้ำกก ทำให้ปริมาณน้ำสะสมเพิ่มขึ้นอย่างรวดเร็วในช่วงน้ำหลาก',
    iconColor: '#06b6d4'
  },
  {
    id: 'ruammit',
    name: 'บ้านกะเหรี่ยงรวมมิตร (กกตอนบน)',
    nameEn: 'Ban Ruam Mit (Upper Kok River)',
    category: 'upstream',
    coordinates: [99.7120, 19.9480],
    elevation: '412 ม. (รทก.)',
    riskLevel: 'medium',
    description: 'พื้นที่ต้นน้ำของแม่น้ำกกก่อนเข้าสู่แอ่งที่ราบเมืองเชียงราย จุดสังเกตการณ์น้ำป่าไหลหลาก',
    iconColor: '#10b981'
  }
];

export const CAMERA_PRESETS = [
  {
    id: 'overview',
    label: 'ภาพรวมลุ่มน้ำกก',
    description: 'มองเห็นแนวเขาดอยแม่สลอง มฟล. และแม่น้ำกกทั้งสาย',
    center: [99.8450, 19.9800],
    zoom: 11.2,
    pitch: 58,
    bearing: -15
  },
  {
    id: 'mfu_campus',
    label: 'มหาวิทยาลัยแม่ฟ้าหลวง',
    description: 'ซูมเจาะจงบริเวณวิทยาเขต มฟล. และอ่างเก็บน้ำ มฟล.',
    center: [99.8945, 20.0454],
    zoom: 13.8,
    pitch: 62,
    bearing: 40
  },
  {
    id: 'chiangrai_city',
    label: 'ตัวเมืองเชียงราย & สะพานกก',
    description: 'มุมมอง 3D เหนือสะพานขัวพญามังรายและพื้นที่ตัวเมือง',
    center: [99.8320, 19.9150],
    zoom: 14.5,
    pitch: 65,
    bearing: 35
  },
  {
    id: 'weir_gate',
    label: 'ฝายเชียงราย',
    description: 'จุดประตูระบายน้ำฝายเชียงราย และจุดบรรจบน้ำกรณ์',
    center: [99.8520, 19.9270],
    zoom: 14.2,
    pitch: 55,
    bearing: -60
  },
  {
    id: 'bird_eye',
    label: 'มุมมองตานก 3D Bird\'s Eye',
    description: 'มุมมองแนวดิ่งเอียงเล็กน้อย เห็นมิติภูมิประเทศกว้างไกล',
    center: [99.8600, 19.9600],
    zoom: 12.0,
    pitch: 35,
    bearing: 0
  }
];
