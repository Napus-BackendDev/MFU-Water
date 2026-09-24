// ข้อมูลเส้นทางแม่น้ำกกแบบแยกเป็น Segment ตามระดับ:
// 1. ระดับประเทศ (Country): เมียนมา (พม่า) vs ไทย
// 2. ระดับจังหวัด (Province): เชียงใหม่ vs เชียงราย
// 3. ระดับช่วงหมู่บ้าน (Village Stretches): แต่ละหมู่บ้านที่น้ำไหลผ่าน

export const RIVER_HIERARCHY_MODES = [
  { id: 'country', label: '🌍 แยกตามประเทศ', desc: 'เมียนมา (ต้นกำเนิด) -> ไทย' },
  { id: 'province', label: '🏛️ แยกตามจังหวัด', desc: 'จ.เชียงใหม่ -> จ.เชียงราย' },
  { id: 'village', label: '🏡 แยกตามช่วงหมู่บ้าน', desc: '14 ช่วงหมู่บ้านริมน้ำกก' }
];

// สีประจำประเทศ
export const COUNTRY_COLORS = {
  myanmar: '#f59e0b', // amber-500 (เมียนมา)
  thailand: '#0284c7'  // sky-600 (ไทย)
};

// สีประจำจังหวัด
export const PROVINCE_COLORS = {
  myanmar: '#f59e0b',  // amber-500
  chiangmai: '#06b6d4', // cyan-500 (เชียงใหม่)
  chiangrai: '#3b82f6'  // blue-500 (เชียงราย)
};

// ข้อมูล Segments ทั้งหมดของแม่น้ำกก
export const KOK_RIVER_SEGMENTS = [
  // ================= 1. ฝั่งประเทศเมียนมา (ต้นกำเนิด) =================
  {
    id: 'seg-mm-upstream',
    name: 'ช่วงต้นน้ำเมียนมา (รัฐฉาน - เมืองสาด)',
    countryId: 'myanmar',
    countryName: 'ประเทศเมียนมา (Myanmar)',
    provinceId: 'myanmar',
    provinceName: 'รัฐฉาน (Shan State)',
    villageStart: 'เมืองสาด (Mong Hsat)',
    villageEnd: 'พรมแดนไทย-พม่า',
    lengthKm: 45.0,
    arsenicAvg: 5.2,
    colorByCountry: COUNTRY_COLORS.myanmar,
    colorByProvince: PROVINCE_COLORS.myanmar,
    colorByVillage: '#f59e0b',
    description: 'ต้นกำเนิดแม่น้ำกกจากทิวเขาในรัฐฉาน ไหลผ่านหุบเขาธรรมชาติก่อนเข้าสู่ประเทศไทย',
    coordinates: [
      [99.1800, 20.1800],
      [99.2200, 20.1450],
      [99.2600, 20.1100],
      [99.2950, 20.0880],
      [99.3300, 20.0750] // พรมแดนไทย
    ]
  },

  // ================= 2. ฝั่งประเทศไทย - จ.เชียงใหม่ =================
  {
    id: 'seg-cm-thaton',
    name: 'ช่วงพรมแดน -> บ้านท่าตอน',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    villageStart: 'พรมแดนไทย',
    villageEnd: 'บ้านท่าตอน',
    lengthKm: 4.8,
    arsenicAvg: 4.5,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangmai,
    colorByVillage: '#10b981',
    description: 'จุดที่แม่น้ำกกเริ่มเข้าสู่ผืนแผ่นดินไทยที่ ต.ท่าตอน อ.แม่อาย มีวัดท่าตอนตั้งอยู่ริมน้ำ',
    coordinates: [
      [99.3300, 20.0750],
      [99.3450, 20.0680],
      [99.3620, 20.0600] // บ้านท่าตอน
    ]
  },
  {
    id: 'seg-cm-malika',
    name: 'ช่วงบ้านท่าตอน -> บ้านมะลิกา',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    villageStart: 'บ้านท่าตอน',
    villageEnd: 'บ้านมะลิกา',
    lengthKm: 4.2,
    arsenicAvg: 6.8,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangmai,
    colorByVillage: '#14b8a6',
    description: 'ไหลผ่านชุมชนการเกษตร ต.แม่อาย ลำน้ำใสสะอาด ค่าสารหนูปกติ',
    coordinates: [
      [99.3620, 20.0600],
      [99.3780, 20.0510],
      [99.3900, 20.0450] // บ้านมะลิกา
    ]
  },
  {
    id: 'seg-cm-mokcham',
    name: 'ช่วงบ้านมะลิกา -> บ้านใหม่หมอกจ๋าม',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    villageStart: 'บ้านมะลิกา',
    villageEnd: 'บ้านใหม่หมอกจ๋าม',
    lengthKm: 6.5,
    arsenicAvg: 12.4,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangmai,
    colorByVillage: '#eab308',
    description: 'ช่วงโค้งน้ำกว้าง พบค่าสารหนูระดับเฝ้าระวัง 12.4 µg/L',
    coordinates: [
      [99.3900, 20.0450],
      [99.4100, 20.0380],
      [99.4350, 20.0320] // บ้านใหม่หมอกจ๋าม
    ]
  },
  {
    id: 'seg-cm-romyen',
    name: 'ช่วงบ้านใหม่หมอกจ๋าม -> บ้านร่มเย็น',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    villageStart: 'บ้านใหม่หมอกจ๋าม',
    villageEnd: 'บ้านร่มเย็น',
    lengthKm: 7.0,
    arsenicAvg: 7.2,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangmai,
    colorByVillage: '#06b6d4',
    description: 'ไหลเลียบแนวภูเขา ตะเข็บชายแดนเชียงใหม่ ค่าสารหนูปกติ',
    coordinates: [
      [99.4350, 20.0320],
      [99.4600, 20.0220],
      [99.4850, 20.0120] // บ้านร่มเย็น
    ]
  },
  {
    id: 'seg-cm-border',
    name: 'ช่วงบ้านร่มเย็น -> รอยต่อเชียงราย',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    villageStart: 'บ้านร่มเย็น',
    villageEnd: 'รอยต่อเชียงใหม่-เชียงราย',
    lengthKm: 14.5,
    arsenicAvg: 7.8,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangmai,
    colorByVillage: '#0ea5e9',
    description: 'ช่วงลำน้ำไหลผ่านหุบเขาธรรมชาติเชื่อมต่อระหว่างเชียงใหม่และเชียงราย',
    coordinates: [
      [99.4850, 20.0120],
      [99.5300, 20.0020],
      [99.5700, 19.9910],
      [99.6100, 19.9820] // รอยต่อจังหวัด
    ]
  },

  // ================= 3. ฝั่งประเทศไทย - จ.เชียงราย =================
  {
    id: 'seg-cr-ruammit',
    name: 'ช่วงรอยต่อเชียงราย -> บ้านกะเหรี่ยงรวมมิตร',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'รอยต่อจังหวัด',
    villageEnd: 'บ้านกะเหรี่ยงรวมมิตร',
    lengthKm: 13.0,
    arsenicAvg: 8.9,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#3b82f6',
    description: 'แหล่งท่องเที่ยวล่องแพแม่น้ำกก ต.แม่ยาว อ.เมืองเชียงราย',
    coordinates: [
      [99.6100, 19.9820],
      [99.6550, 19.9700],
      [99.6850, 19.9580],
      [99.7120, 19.9480] // รวมมิตร
    ]
  },
  {
    id: 'seg-cr-pongnakham',
    name: 'ช่วงบ้านรวมมิตร -> บ้านโป่งนาคำ',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านกะเหรี่ยงรวมมิตร',
    villageEnd: 'บ้านโป่งนาคำ',
    lengthKm: 5.5,
    arsenicAvg: 11.5,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#eab308',
    description: 'ต.ดอยฮาง มีบ่อน้ำพุร้อนและบ่อบาดาลใกล้เคียง ตรวจพบสารหนูเฝ้าระวัง 11.5 µg/L',
    coordinates: [
      [99.7120, 19.9480],
      [99.7350, 19.9380],
      [99.7550, 19.9300] // โป่งนาคำ
    ]
  },
  {
    id: 'seg-cr-pangiw',
    name: 'ช่วงบ้านโป่งนาคำ -> หาดเชียงราย (บ้านป่างิ้ว)',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านโป่งนาคำ',
    villageEnd: 'บ้านป่างิ้ว (หาดเชียงราย)',
    lengthKm: 6.2,
    arsenicAvg: 9.3,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#6366f1',
    description: 'เข้าสู่เขตที่ราบลุ่มเมืองเชียงราย หาดพัทยาน้อยจุดพักผ่อน',
    coordinates: [
      [99.7550, 19.9300],
      [99.7800, 19.9180],
      [99.8050, 19.9070] // หาดเชียงราย
    ]
  },
  {
    id: 'seg-cr-city',
    name: 'ช่วงหาดเชียงราย -> ขัวพญามังราย & เกาะลอย',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านป่างิ้ว',
    villageEnd: 'ชุมชนเกาะลอย (ตัวเมือง)',
    lengthKm: 4.0,
    arsenicAvg: 15.5,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#f97316',
    description: 'ใจกลางเทศบาลนครเชียงราย สะพานข้ามแม่น้ำกก ชุมชนสันโค้งหลวง สารหนูเฝ้าระวัง 14.8 - 16.5 µg/L',
    coordinates: [
      [99.8050, 19.9070],
      [99.8200, 19.9110],
      [99.8295, 19.9142], // สะพานขัวพญามังราย
      [99.8375, 19.9175]  // เกาะลอย
    ]
  },
  {
    id: 'seg-cr-weir',
    name: 'ช่วงชุมชนเกาะลอย -> ฝายเชียงราย & ฝั่งหมิ่น',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'ชุมชนเกาะลอย',
    villageEnd: 'บ้านฝั่งหมิ่น',
    lengthKm: 3.5,
    arsenicAvg: 22.1,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#ef4444',
    description: 'ประตูระบายน้ำฝายเชียงราย และบ้านฝั่งหมิ่น พบจุดตรวจเกินเกณฑ์ 22.1 µg/L (อันตราย)',
    coordinates: [
      [99.8375, 19.9175],
      [99.8458, 19.9240], // ฝาย
      [99.8520, 19.9350]  // ฝั่งหมิ่น
    ]
  },
  {
    id: 'seg-cr-payangmon',
    name: 'ช่วงบ้านฝั่งหมิ่น -> ป่ายางมน & บรรจบน้ำกรณ์',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านฝั่งหมิ่น',
    villageEnd: 'บ้านป่ายางมน',
    lengthKm: 3.8,
    arsenicAvg: 10.8,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#8b5cf6',
    description: 'จุดที่แม่น้ำกรณ์ไหลมาบรรจบกับแม่น้ำกก เพิ่มปริมาณน้ำในลำน้ำ',
    coordinates: [
      [99.8520, 19.9350],
      [99.8650, 19.9280], // ป่ายางมน
      [99.8700, 19.9325]  // บรรจบน้ำกรณ์
    ]
  },
  {
    id: 'seg-cr-wiangchai',
    name: 'ช่วงป่ายางมน -> เวียงชัย (บ้านเวียงเหนือ & ดงมะดะ)',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านป่ายางมน',
    villageEnd: 'บ้านดงมะดะ (อ.เวียงชัย)',
    lengthKm: 12.0,
    arsenicAvg: 10.9,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#a855f7',
    description: 'เข้าสู่อำเภอเวียงชัย ชุมชนเกษตรกรรมริมน้ำกก',
    coordinates: [
      [99.8700, 19.9325],
      [99.8950, 19.9420],
      [99.9150, 19.9500], // บ้านเวียงเหนือ
      [99.9650, 19.9800]  // บ้านดงมะดะ
    ]
  },
  {
    id: 'seg-cr-bansaeo',
    name: 'ช่วงดงมะดะ -> เชียงแสน (บ้านแซว & สบกก)',
    countryId: 'thailand',
    countryName: 'ประเทศไทย (Thailand)',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    villageStart: 'บ้านดงมะดะ',
    villageEnd: 'บ้านสบกก (ปากแม่น้ำกก)',
    lengthKm: 19.5,
    arsenicAvg: 8.5,
    colorByCountry: COUNTRY_COLORS.thailand,
    colorByProvince: PROVINCE_COLORS.chiangrai,
    colorByVillage: '#0284c7',
    description: 'ช่วงปลายน้ำแม่น้ำกก ไหลผ่าน อ.เชียงแสน สู่ปากแม่น้ำสบกก ไหลลงสู่แม่น้ำโขง',
    coordinates: [
      [99.9650, 19.9800],
      [100.0200, 20.0200],
      [100.0700, 20.0600],
      [100.1000, 20.1050], // บ้านแซว
      [100.1250, 20.1200]  // สบกก
    ]
  }
];

// แปลง Segments เป็น GeoJSON FeatureCollection
export function getSegmentsGeoJSON(activeHierarchyMode = 'province') {
  return {
    type: 'FeatureCollection',
    features: KOK_RIVER_SEGMENTS.map(seg => {
      let lineColor = seg.colorByProvince;
      if (activeHierarchyMode === 'country') {
        lineColor = seg.colorByCountry;
      } else if (activeHierarchyMode === 'village') {
        lineColor = seg.colorByVillage;
      }

      return {
        type: 'Feature',
        id: seg.id,
        properties: {
          id: seg.id,
          name: seg.name,
          countryId: seg.countryId,
          countryName: seg.countryName,
          provinceId: seg.provinceId,
          provinceName: seg.provinceName,
          villageStart: seg.villageStart,
          villageEnd: seg.villageEnd,
          lengthKm: seg.lengthKm,
          arsenicAvg: seg.arsenicAvg,
          color: lineColor,
          description: seg.description
        },
        geometry: {
          type: 'LineString',
          coordinates: seg.coordinates
        }
      };
    })
  };
}
