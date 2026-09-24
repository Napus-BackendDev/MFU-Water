// ข้อมูลเส้นทางแม่น้ำกกและจุดตรวจวัดสารหนูในน้ำระดับหมู่บ้าน

// 1. เกณฑ์มาตรฐานความปลอดภัยสารหนูในน้ำ (Arsenic Standard: WHO & กรมควบคุมมลพิษ)
// มาตรฐานน้ำบริโภค / น้ำผิวดิน: ไม่เกิน 10 µg/L (0.01 mg/L)
export const ARSENIC_STANDARDS = {
  safeLimit: 10.0, // ไมโครกรัมต่อลิตร (µg/L)
  warningLimit: 20.0,
  levels: {
    safe: {
      label: 'ปลอดภัย (Safe)',
      color: '#10b981', // green-500
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      description: 'ค่าสารหนูไม่เกิน 10 µg/L อยู่ในเกณฑ์มาตรฐานปลอดภัย'
    },
    warning: {
      label: 'เฝ้าระวัง (Watch)',
      color: '#eab308', // yellow-500
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      description: 'ค่าสารหนู 10.1 - 20.0 µg/L เริ่มเกินเกณฑ์มาตรฐาน ควรกรองก่อนอุปโภคบริโภค'
    },
    danger: {
      label: 'เกินเกณฑ์อันตราย (Danger)',
      color: '#ef4444', // red-500
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      description: 'ค่าสารหนูเกิน 20.0 µg/L มีความเสี่ยงต่อสุขภาพ ห้ามดื่มหรือนำไปปรุงอาหารโดยตรง'
    }
  }
};

export function getArsenicStatus(value) {
  if (value <= ARSENIC_STANDARDS.safeLimit) return 'safe';
  if (value <= ARSENIC_STANDARDS.warningLimit) return 'warning';
  return 'danger';
}

// 2. ข้อมูลจังหวัดที่แม่น้ำกกไหลผ่าน
export const PROVINCES_DATA = [
  {
    id: 'all',
    name: 'ภาพรวมลุ่มน้ำกกทั้งหมด',
    nameEn: 'All Kok River Basin',
    summary: 'สายน้ำแม่น้ำกกตลอดแนว ตั้งแต่ อ.แม่อาย จ.เชียงใหม่ จนถึง อ.เชียงแสน จ.เชียงราย รวมระยะทางกว่า 130 กิโลเมตร',
    camera: {
      center: [99.7200, 20.0300],
      zoom: 10.3,
      bounds: [[99.2200, 19.8600], [100.2200, 20.2200]]
    }
  },
  {
    id: 'chiangmai',
    name: 'จังหวัดเชียงใหม่',
    nameEn: 'Chiang Mai Province',
    section: 'โซนต้นน้ำกก (Upper Reach)',
    districts: 'อำเภอแม่อาย (ต.ท่าตอน, ต.แม่อาย)',
    summary: 'จุดเริ่มต้นของแม่น้ำกกที่ไหลข้ามพรมแดนจากรัฐฉานเข้าสู่ประเทศไทยที่ ต.ท่าตอน ลำน้ำไหลคดเคี้ยวผ่านหุบเขา',
    camera: {
      center: [99.4100, 20.0350],
      zoom: 12.2,
      bounds: [[99.3000, 19.9800], [99.5500, 20.1000]]
    }
  },
  {
    id: 'chiangrai',
    name: 'จังหวัดเชียงราย',
    nameEn: 'Chiang Rai Province',
    section: 'โซนกลางน้ำและปลายน้ำสู่แม่น้ำโขง (Middle & Lower Reach)',
    districts: 'อำเภอเมืองเชียงราย, อำเภอเวียงชัย, อำเภอเชียงแสน',
    summary: 'แม่น้ำกกไหลเข้าสู่ที่ราบลุ่มเมืองเชียงราย ผ่านชุมชนเมือง สะพานขัวพญามังราย ฝายเชียงราย และไหลลงสู่แม่น้ำโขงที่สบกก อ.เชียงแสน',
    camera: {
      center: [99.9000, 19.9800],
      zoom: 11.2,
      bounds: [[99.6500, 19.8800], [100.1800, 20.1600]]
    }
  }
];

import kokRiverAccurateData from './kokRiverAccurate.json';

// 3. เส้นทางแม่น้ำกกความละเอียดสูงตามแนวภูมิศาสตร์จริง (1,934 จุดความโค้งตามแนวลำน้ำ)
export const KOK_RIVER_FULL_PATH = kokRiverAccurateData;


// 4. จุดตรวจวัดสารหนูในน้ำระดับหมู่บ้านริมแม่น้ำกก (Village Monitoring Points)
export const VILLAGE_POINTS = [
  // ====================== จ.เชียงใหม่ ======================
  {
    id: 'cm-thaton',
    name: 'บ้านท่าตอน',
    nameEn: 'Ban Tha Ton',
    moo: 'หมู่ที่ 3',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    coordinates: [99.3620, 20.0600],
    arsenicValue: 4.5, // µg/L
    waterSourceType: 'น้ำผิวดินแม่น้ำกก (ต้นน้ำเข้าไทย)',
    sampleDate: '15 ก.ย. 2567',
    stationName: 'สถานีตรวจวัดคุณภาพน้ำท่าตอน (KM-01)',
    notes: 'จุดที่แม่น้ำกกไหลข้ามพรมแดนเข้าสู่ประเทศไทย คุณภาพน้ำอยู่ในเกณฑ์ปกติ ค่าสารหนูไม่เกินมาตรฐาน'
  },
  {
    id: 'cm-malika',
    name: 'บ้านมะลิกา',
    nameEn: 'Ban Malika',
    moo: 'หมู่ที่ 2',
    subdistrict: 'ตำบลแม่อาย',
    district: 'อำเภอแม่อาย',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    coordinates: [99.3900, 20.0450],
    arsenicValue: 6.8,
    waterSourceType: 'น้ำผิวดิน / ระบบประปาชุมชน',
    sampleDate: '16 ก.ย. 2567',
    stationName: 'จุดสังเกตการณ์แม่น้ำกกมะลิกา (KM-02)',
    notes: 'พื้นที่ชุมชนเกษตรกรรมริมน้ำกก ค่าสารหนูปกติ ไม่พบการสะสมโลหะหนักเกินเกณฑ์'
  },
  {
    id: 'cm-mokcham',
    name: 'บ้านใหม่หมอกจ๋าม',
    nameEn: 'Ban Mai Mok Cham',
    moo: 'หมู่ที่ 10',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    coordinates: [99.4350, 20.0320],
    arsenicValue: 12.4, // เกินเกณฑ์ 10 µg/L
    waterSourceType: 'บ่อน้ำตื้นริมน้ำ / น้ำกก',
    sampleDate: '16 ก.ย. 2567',
    stationName: 'จุดเฝ้าระวังหมอกจ๋าม (KM-03)',
    notes: 'พบค่าสารหนูสูงกว่าเกณฑ์มาตรฐานเล็กน้อย อยู่ในระดับเฝ้าระวัง แนะนำให้ต้มและกรองผ่านระบบ RO หรือคาร์บอนก่อนดื่ม'
  },
  {
    id: 'cm-romyen',
    name: 'บ้านร่มเย็น',
    nameEn: 'Ban Rom Yen',
    moo: 'หมู่ที่ 7',
    subdistrict: 'ตำบลแม่อาย',
    district: 'อำเภอแม่อาย',
    provinceId: 'chiangmai',
    provinceName: 'จังหวัดเชียงใหม่',
    coordinates: [99.4850, 20.0120],
    arsenicValue: 7.2,
    waterSourceType: 'น้ำผิวดินแม่น้ำกก',
    sampleDate: '17 ก.ย. 2567',
    stationName: 'สถานีตรวจวัดร่มเย็น (KM-04)',
    notes: 'คุณภาพน้ำทั่วไปอยู่ในเกณฑ์ดี ใช้เพื่อการเกษตรกรรมได้ปลอดภัย'
  },

  // ====================== จ.เชียงราย ======================
  {
    id: 'cr-ruammit',
    name: 'บ้านกะเหรี่ยงรวมมิตร',
    nameEn: 'Ban Karen Ruammit',
    moo: 'หมู่ที่ 2',
    subdistrict: 'ตำบลแม่ยาว',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.7120, 19.9480],
    arsenicValue: 8.9,
    waterSourceType: 'น้ำแม่น้ำกก (แหล่งท่องเที่ยวล่องแพ)',
    sampleDate: '18 ก.ย. 2567',
    stationName: 'จุดตรวจรวมมิตร-แม่ยาว (CR-01)',
    notes: 'แหล่งท่องเที่ยวริมน้ำกก ค่าสารหนูปกติ ปลอดภัยสำหรับกิจกรรมทางน้ำ'
  },
  {
    id: 'cr-pongnakham',
    name: 'บ้านโป่งนาคำ',
    nameEn: 'Ban Pong Na Kham',
    moo: 'หมู่ที่ 5',
    subdistrict: 'ตำบลดอยฮาง',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.7550, 19.9300],
    arsenicValue: 11.5,
    waterSourceType: 'บ่อบาดาลตื้นริมตลิ่งกก',
    sampleDate: '18 ก.ย. 2567',
    stationName: 'จุดเฝ้าระวังโป่งนาคำ (CR-02)',
    notes: 'ค่าสารหนูระดับ 11.5 µg/L เกินเกณฑ์แนะนำ ควรหลีกเลี่ยงการนำน้ำบาดาลมาใช้ดื่มโดยตรง'
  },
  {
    id: 'cr-pangiw',
    name: 'บ้านป่างิ้ว',
    nameEn: 'Ban Pa Ngiw',
    moo: 'หมู่ที่ 4',
    subdistrict: 'ตำบลรอบเวียง',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.8050, 19.9070],
    arsenicValue: 9.3,
    waterSourceType: 'น้ำผิวดินแม่น้ำกก',
    sampleDate: '19 ก.ย. 2567',
    stationName: 'จุดสังเกตการณ์หาดเชียงราย (CR-03)',
    notes: 'ค่าสารหนูอยู่ในเกณฑ์ปลอดภัย ไม่พบการปนเปื้อนโลหะหนักระดับวิกฤต'
  },
  {
    id: 'cr-kohloi',
    name: 'ชุมชนเกาะลอย (เทศบาลนครเชียงราย)',
    nameEn: 'Koh Loi Urban Community',
    moo: 'ชุมชนเกาะลอย',
    subdistrict: 'ตำบลเวียง',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.8375, 19.9175],
    arsenicValue: 14.8,
    waterSourceType: 'น้ำผิวดินแม่น้ำกก (กลางเมือง)',
    sampleDate: '19 ก.ย. 2567',
    stationName: 'สถานีตรวจวัดคุณภาพน้ำเกาะลอย (CR-04)',
    notes: 'พื้นที่เมืองมีตะกอนสะสมจากเหตุน้ำหลาก ตรวจพบสารหนู 14.8 µg/L (เฝ้าระวัง) ต้องผ่านระบบประปามาตรฐานก่อนใช้'
  },
  {
    id: 'cr-sankhong',
    name: 'ชุมชนสันโค้งหลวง',
    nameEn: 'San Khong Luang Community',
    moo: 'ชุมชนสันโค้ง',
    subdistrict: 'ตำบลเวียง',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.8250, 19.9050],
    arsenicValue: 16.5,
    waterSourceType: 'บ่อบาดาลชุมชน',
    sampleDate: '19 ก.ย. 2567',
    stationName: 'จุดตรวจน้ำบาดาลสันโค้ง (CR-05)',
    notes: 'พบสารหนูระดับเฝ้าระวัง 16.5 µg/L ทางเทศบาลแนะนำให้ใช้น้ำประปาส่วนภูมิภาคแทนน้ำบาดาลในครัวเรือน'
  },
  {
    id: 'cr-fangmin',
    name: 'บ้านฝั่งหมิ่น',
    nameEn: 'Ban Fang Min',
    moo: 'หมู่ที่ 7',
    subdistrict: 'ตำบลริมกก',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.8520, 19.9350],
    arsenicValue: 22.1, // อันตรายเกิน 20 µg/L
    waterSourceType: 'แหล่งน้ำกักเก็บริมตลิ่งกก',
    sampleDate: '20 ก.ย. 2567',
    stationName: 'สถานีเตือนภัยฝั่งหมิ่น (CR-06)',
    notes: '⚠️ ค่าสารหนู 22.1 µg/L เกินเกณฑ์มาตรฐานอันตราย ห้ามนำน้ำไปบริโภคโดยเด็ดขาด กำลังตรวจสอบต้นตอตะกอนแร่ธาตุ'
  },
  {
    id: 'cr-payangmon',
    name: 'บ้านป่ายางมน',
    nameEn: 'Ban Pa Yang Mon',
    moo: 'หมู่ที่ 2',
    subdistrict: 'ตำบลรอบเวียง',
    district: 'อำเภอเมืองเชียงราย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.8650, 19.9280],
    arsenicValue: 10.8,
    waterSourceType: 'ระบบประปาหมู่บ้าน',
    sampleDate: '20 ก.ย. 2567',
    stationName: 'จุดตรวจป่ายางมน (CR-07)',
    notes: 'ค่าสารหนู 10.8 µg/L ปริ่มเกณฑ์มาตรฐาน แนะนำให้ชุมชนเฝ้าระวังและตรวจสอบซ้ำทุกเดือน'
  },
  {
    id: 'cr-wiangnuea',
    name: 'บ้านเวียงเหนือ',
    nameEn: 'Ban Wiang Nuea',
    moo: 'หมู่ที่ 5',
    subdistrict: 'ตำบลเวียงชัย',
    district: 'อำเภอเวียงชัย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.9150, 19.9500],
    arsenicValue: 8.2,
    waterSourceType: 'น้ำแม่น้ำกก',
    sampleDate: '21 ก.ย. 2567',
    stationName: 'สถานีเวียงชัย-กก (CR-08)',
    notes: 'ค่าสารหนูอยู่ในเกณฑ์ปลอดภัย น้ำใสสะอาด เหมาะแก่การทำเกษตร'
  },
  {
    id: 'cr-dongmada',
    name: 'บ้านดงมะดะ',
    nameEn: 'Ban Dong Mada',
    moo: 'หมู่ที่ 8',
    subdistrict: 'ตำบลเวียงเหนือ',
    district: 'อำเภอเวียงชัย',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [99.9650, 19.9800],
    arsenicValue: 13.6,
    waterSourceType: 'น้ำบาดาลเพื่อการเกษตร',
    sampleDate: '21 ก.ย. 2567',
    stationName: 'จุดตรวจดงมะดะ (CR-09)',
    notes: 'ระดับสารหนู 13.6 µg/L เฝ้าระวังสำหรับการใช้อุปโภคบริโภค'
  },
  {
    id: 'cr-bansaeo',
    name: 'บ้านแซว',
    nameEn: 'Ban Saeo',
    moo: 'หมู่ที่ 1',
    subdistrict: 'ตำบลบ้านแซว',
    district: 'อำเภอเชียงแสน',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [100.1000, 20.1050],
    arsenicValue: 7.4,
    waterSourceType: 'น้ำผิวดินแม่น้ำกกตอนปลาย',
    sampleDate: '22 ก.ย. 2567',
    stationName: 'จุดสังเกตการณ์บ้านแซว (CR-10)',
    notes: 'คุณภาพน้ำอยู่ในเกณฑ์ปลอดภัย ปริมาณสารหนูต่ำ'
  },
  {
    id: 'cr-sobkok',
    name: 'บ้านสบกก (ปากแม่น้ำกก)',
    nameEn: 'Ban Sob Kok (Kok-Mekong Estuary)',
    moo: 'หมู่ที่ 7',
    subdistrict: 'ตำบลบ้านแซว',
    district: 'อำเภอเชียงแสน',
    provinceId: 'chiangrai',
    provinceName: 'จังหวัดเชียงราย',
    coordinates: [100.1250, 20.1200],
    arsenicValue: 9.5,
    waterSourceType: 'จุดบรรจบแม่น้ำกกและแม่น้ำโขง',
    sampleDate: '22 ก.ย. 2567',
    stationName: 'สถานีปลายน้ำสบกก (CR-11)',
    notes: 'จุดสิ้นสุดของแม่น้ำกกก่อนไหลลงสู่แม่น้ำโขง ค่าสารหนูปกติ 9.5 µg/L ปลอดภัย'
  }
];

// ฟังก์ชันสร้างพื้นที่วงกลมรอบหมู่บ้าน (Village Area Polygons) สำหรับแสดงพื้นที่สีส้ม
export function getVillageAreasGeoJSON(provinceId = 'all') {
  const villages = provinceId === 'all'
    ? VILLAGE_POINTS
    : VILLAGE_POINTS.filter(v => v.provinceId === provinceId);

  return {
    type: 'FeatureCollection',
    features: villages.map(v => {
      const radiusKm = 1.35; // รัศมีพื้นที่หมู่บ้าน ~1.35 กม.
      const [lng, lat] = v.coordinates;
      const points = 36;
      const distanceX = radiusKm / (111.320 * Math.cos((lat * Math.PI) / 180));
      const distanceY = radiusKm / 110.574;
      const coords = [];

      for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([lng + x, lat + y]);
      }
      coords.push(coords[0]);

      return {
        type: 'Feature',
        id: v.id,
        properties: {
          id: v.id,
          name: v.name,
          nameEn: v.nameEn,
          provinceId: v.provinceId,
          district: v.district,
          subdistrict: v.subdistrict,
          arsenicValue: v.arsenicValue
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      };
    })
  };
}

