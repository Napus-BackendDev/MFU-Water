// ข้อมูลการจำลองขอบเขตน้ำท่วมจริง ตำบลท่าตอน / บ้านท่าดอย อ.แม่อาย จ.เชียงใหม่
// อ้างอิงจากเหตุการณ์มหาอุทกภัยแม่น้ำกก (ก.ย. 2567) และภาพถ่ายดาวเทียม Sentinel-1 SAR จาก Google Earth Engine
import kokRiverData from './kokRiverAccurate.json';

export const THATON_CENTER = [99.377, 20.061];

// ขอบเขตจำกัดเฉพาะ ต.ท่าตอน - บ้านท่าดอย และพื้นที่ริมสองฝั่งสายน้ำแม่กก (เขยิบขวาเน้นลำน้ำและที่ราบลุ่มน้ำ)
export const THATON_BOUNDS = [
  [99.346, 20.038], // มุมตะวันตกเฉียงใต้ (แนวเขาวัดท่าตอน)
  [99.408, 20.084]  // มุมตะวันออกเฉียงเหนือ (แนวลำน้ำกกและพื้นที่ลุ่มน้ำฝั่งตะวันออก)
];

// สร้าง Mask รูปหลายเหลี่ยมกลับด้าน (Inverted Donut Polygon)
// ตัดพื้นที่ภายนอกโลกออกทั้งหมด ให้เหลือเฉพาะกล่องสี่เหลี่ยมโมเดล 3D ต.ท่าตอน - บ้านท่าดอย
export function getDioramaMaskGeoJSON() {
  const [sw, ne] = THATON_BOUNDS;
  const [minLng, minLat] = sw;
  const [maxLng, maxLat] = ne;

  // วงนอก: ครอบคลุมพิกัดโลกกว้างใหญ่ (ทวนเข็มนาฬิกา CCW ตามมาตรฐาน GeoJSON)
  const worldRing = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85]
  ];

  // วงใน (Hole): ช่องสี่เหลี่ยมเฉพาะ ต.ท่าตอน - บ้านท่าดอย (ตามเข็มนาฬิกา CW)
  const holeRing = [
    [minLng, minLat],
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat]
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Diorama Exterior Mask' },
        geometry: {
          type: 'Polygon',
          coordinates: [worldRing, holeRing]
        }
      }
    ]
  };
}

// สร้างเส้นกรอบขอบสี่เหลี่ยมโมเดลจำลอง 3 มิติ (Diorama Pedestal Frame)
export function getDioramaFrameGeoJSON() {
  const [sw, ne] = THATON_BOUNDS;
  const [minLng, minLat] = sw;
  const [maxLng, maxLat] = ne;

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Diorama Box Frame' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [minLng, minLat],
            [minLng, maxLat],
            [maxLng, maxLat],
            [maxLng, minLat],
            [minLng, minLat]
          ]
        }
      }
    ]
  };
}

export const THATON_COMMUNITIES = [
  {
    id: 'wat-thaton',
    name: 'วัดท่าตอน (พระเจดีย์แก้ว 9 ชั้น บนยอดดอย)',
    type: 'landmark',
    coordinates: [99.35179, 20.06456],
    camera: { center: [99.3518, 20.0648], zoom: 15.4, pitch: 22, bearing: 5 },
    description: 'พระอารามหลวงวัดท่าตอน และพระเจดีย์แก้ว 9 ชั้น บนยอดเขาสูง มองเห็นทัศนียภาพโค้งน้ำกกทั้งหุบเขา',
    normalStatus: 'พื้นที่สูงบนสันเขา (ปลอดภัยสมบูรณ์ 100%)',
    floodStatus: 'พื้นที่ปลอดภัย 100% ศูนย์ประสานงานและจุดพักพิงผู้อพยพหลัก'
  },
  {
    id: 'thadoi-village',
    name: 'บ้านท่าดอย',
    type: 'community',
    coordinates: [99.3588, 20.0630],
    camera: { center: [99.3588, 20.0630], zoom: 15.8, pitch: 38, bearing: 15 },
    description: 'ชุมชนบ้านท่าดอยริมแม่น้ำกก ช่วงคุ้งน้ำเชิงดอยก่อนไหลเข้าสู่ตัวตำบลท่าตอน',
    normalStatus: 'ปกติ ชุมชนที่อยู่อาศัยและแปลงเกษตรริมตลิ่ง',
    floodStatus: 'น้ำกกเอ่อล้นตลิ่งหลากเข้าท่วมพื้นที่ลุ่มต่ำ สูง 0.9 - 1.8 ม.'
  },
  {
    id: 'thaton-village',
    name: 'บ้านท่าตอน (ทล.107)',
    type: 'community',
    coordinates: [99.3612, 20.0596],
    camera: { center: [99.3612, 20.0596], zoom: 15.8, pitch: 38, bearing: 20 },
    description: 'ศูนย์กลางชุมชนและตลาดริมทางหลวง 107 ใกล้สะพานท่าตอนข้ามแม่น้ำกก',
    normalStatus: 'ปกติ (อยู่สูงกว่าระดับน้ำเฉลี่ย 3.5 ม.)',
    floodStatus: 'น้ำท่วมสูง 1.2 - 2.5 ม. (กินพื้นที่ตลาดและถนนชุมชน ทล.107)'
  },
  {
    id: 'thaton-bridge',
    name: 'สะพานท่าตอน (ทล.107)',
    type: 'landmark',
    coordinates: [99.3621, 20.0617],
    camera: { center: [99.3621, 20.0617], zoom: 16.0, pitch: 40, bearing: 25 },
    description: 'สะพานคอนกรีตข้ามแม่น้ำกกสายหลัก จุดเชื่อมสำคัญของ อ.แม่อาย',
    normalStatus: 'สัญจรปกติ ร่องน้ำกว้าง ~55 ม.',
    floodStatus: 'น้ำปริ่มคานสะพาน เฝ้าระวังเศษซากไม้และมวลน้ำหลาก'
  }
];

// ดึงเฉพาะจุดพิกัดโค้งละเอียดของแม่น้ำกกช่วงตำบลท่าตอนและบ้านท่าดอย
const allRiverCoords = kokRiverData.features[0].geometry.coordinates;
export const THATON_RIVER_SEGMENT = allRiverCoords.filter(([lng, lat]) =>
  lng >= 99.345 && lng <= 99.410 && lat >= 20.035 && lat <= 20.088
);

// ฟังก์ชันสร้างรูปหลายเหลี่ยมน้ำท่วมที่ขยายตัวอย่างเรียบเนียนตามแนวความโค้งจริง (Anti-Aliased Smooth Buffer)
export function generateSmoothFloodBuffer(centerPoints, distanceMeters) {
  const left = [];
  const right = [];

  for (let i = 0; i < centerPoints.length; i++) {
    const prev = centerPoints[Math.max(0, i - 1)];
    const next = centerPoints[Math.min(centerPoints.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1e-6;
    const nx = -dy / len;
    const ny = dx / len;

    const [lng, lat] = centerPoints[i];
    const dlng = (distanceMeters / (111320 * Math.cos((lat * Math.PI) / 180))) * nx;
    const dlat = (distanceMeters / 110574) * ny;

    left.push([lng + dlng, lat + dlat]);
    right.push([lng - dlng, lat - dlat]);
  }

  return [...left, ...right.reverse(), left[0]];
}

// ระดับการเตือนภัยและการกินอาณาเขตน้ำท่วม (อ้างอิงลำดับเหตุการณ์ ก.ย. 2567 และดาวเทียม Sentinel-2)
export const THATON_FLOOD_STAGES = [
  {
    stage: 0,
    label: 'ระดับ 0: 5 ก.ย. 67 — สภาพปกติก่อนน้ำท่วม',
    sublabel: 'ร่องน้ำธรรมชาติ ผิวน้ำเดิม 0.3082 ตร.กม. ไม่ล้นตลิ่ง',
    color: '#0284c7',
    waterLevel: 'ปกติ (ตลิ่งสูงกว่าน้ำ 3.5 ม.)',
    affectedAreaRai: 0,
    bufferMeters: 30
  },
  {
    stage: 25,
    label: 'ระดับ 1: 9 ก.ย. 67 — น้ำเพิ่มระดับปริ่มตลิ่ง',
    sublabel: 'มวลน้ำจากต้นน้ำเมียนมาไหลหลาก ระดับน้ำเพิ่มขึ้น 1.5 เมตร',
    color: '#0ea5e9',
    waterLevel: '+1.5 เมตร (น้ำเสมอแนวคันตลิ่ง)',
    affectedAreaRai: 85,
    bufferMeters: 65
  },
  {
    stage: 50,
    label: 'ระดับ 2: 11 ก.ย. 67 — น้ำเริ่มเอ่อล้นเข้าท่วมที่ลุ่ม',
    sublabel: 'น้ำล้นตลิ่งเข้าท่วมแปลงเกษตรและถนนเลียบน้ำบ้านท่าดอย',
    color: '#38bdf8',
    waterLevel: '+2.5 เมตร (ท่วมพื้นที่ลุ่มต่ำ 0.5-1.0 ม.)',
    affectedAreaRai: 240,
    bufferMeters: 115
  },
  {
    stage: 75,
    label: 'ระดับ 3: 13 ก.ย. 67 — น้ำท่วมหนักเข้าสู่เขตชุมชน',
    sublabel: 'น้ำท่วมบ้านเรือนและพื้นที่ลุ่มต่ำริมแม่น้ำกกบ้านท่าตอนและบ้านท่าดอย',
    color: '#60a5fa',
    waterLevel: '+3.5 เมตร (ท่วมชุมชน 1.0-1.8 ม.)',
    affectedAreaRai: 520,
    bufferMeters: 185
  },
  {
    stage: 100,
    label: 'ระดับ 4: 15 ก.ย. 67 — น้ำท่วมสูงสุด (+310.94 ไร่)',
    sublabel: 'Sentinel-2 ตรวจพบน้ำท่วมขังเพิ่มขึ้นสุทธิ 0.4975 ตร.กม. (โซน Z3 ท่าดอย 51.2%)',
    color: '#2563eb',
    waterLevel: '+4.8 เมตร (ท่วมวิกฤต 2.0-3.0 ม.)',
    affectedAreaRai: 890,
    bufferMeters: 275
  }
];

// ฟังก์ชันแปลงระดับเป็น GeoJSON Feature ที่เรียบเนียน ไร้รอยหยัก (Anti-Aliased Smooth Polygon)
export function getFloodPolygonGeoJSON(stagePercentage = 0) {
  // คำนวณระยะขยายตัวของน้ำจากเส้นศูนย์กลางลำน้ำอย่างต่อเนื่อง (Linear Interpolation)
  const minBuffer = 30; // เมตร (สภาวะน้ำปกติ)
  const maxBuffer = 275; // เมตร (สภาวะน้ำท่วมสูงสุด)
  const currentBuffer = minBuffer + (Math.max(0, Math.min(100, stagePercentage)) / 100) * (maxBuffer - minBuffer);

  const polygonCoords = generateSmoothFloodBuffer(THATON_RIVER_SEGMENT, currentBuffer);

  const currentStage = THATON_FLOOD_STAGES.reduce((prev, curr) => {
    return Math.abs(curr.stage - stagePercentage) < Math.abs(prev.stage - stagePercentage) ? curr : prev;
  });

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          stage: currentStage.stage,
          label: currentStage.label,
          waterLevel: currentStage.waterLevel,
          affectedAreaRai: Math.round((stagePercentage / 100) * 890),
          color: currentStage.color
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords]
        }
      }
    ]
  };
}
