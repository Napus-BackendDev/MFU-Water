// ข้อมูลและระบบจัดการข้อมูล KOK Water Watch (POC-1)
// รองรับโครงสร้าง Google Sheets, Google Drive, และ Supabase Index

export const WATER_WATCH_STATIONS = [
  {
    id: 'ST-01',
    code: 'KM-01',
    name: 'สถานีต้นน้ำกกเหนือสะพานท่าตอน',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    coordinates: [99.3585, 20.0655], // [lng, lat]
    radiusMeters: 250,
    status: 'active',
    device: {
      code: 'DEV-KOK-01',
      model: 'Sonde Pro X1 Multi-parameter',
      serial: 'SN-2026-X101',
      lastCalibrated: '2026-09-20'
    },
    description: 'จุดตรวจวัดต้นน้ำกกหลักก่อนไหลผ่านตัวเมืองท่าตอน'
  },
  {
    id: 'ST-02',
    code: 'KM-02',
    name: 'สถานีสะพานท่าตอน (สะพานข้ามแม่น้ำกก)',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    coordinates: [99.3615, 20.0610],
    radiusMeters: 250,
    status: 'active',
    device: {
      code: 'DEV-KOK-02',
      model: 'Aqualab Field Station v2',
      serial: 'SN-2026-AQ02',
      lastCalibrated: '2026-09-21'
    },
    description: 'จุดตรวจวัดกลางชุมชน บริเวณท่าเรือท่องเที่ยวและสะพานข้ามแม่น้ำกก'
  },
  {
    id: 'ST-03',
    code: 'KM-03',
    name: 'สถานีโค้งน้ำท่าตอนตะวันออก',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    coordinates: [99.3850, 20.0535],
    radiusMeters: 250,
    status: 'active',
    device: {
      code: 'DEV-KOK-03',
      model: 'HydroWatch IoT Telemetry Node',
      serial: 'SN-2026-HW03',
      lastCalibrated: '2026-09-22'
    },
    description: 'จุดโค้งน้ำตอนล่าง พื้นที่สูบน้ำเพื่อการเกษตรและชลประทานชุมชน'
  },
  {
    id: 'ST-04',
    code: 'KM-04',
    name: 'สถานีปลายน้ำกกบ้านใหม่หมอกจ๋าม',
    subdistrict: 'ตำบลท่าตอน',
    district: 'อำเภอแม่อาย',
    province: 'เชียงใหม่',
    coordinates: [99.4350, 20.0320],
    radiusMeters: 250,
    status: 'active',
    device: {
      code: 'DEV-KOK-04',
      model: 'Border Sentry Water Quality Node',
      serial: 'SN-2026-BS04',
      lastCalibrated: '2026-09-23'
    },
    description: 'จุดตรวจวัดปลายน้ำรอยต่อ อ.แม่อาย สู่ จ.เชียงราย'
  }
];

export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function findNearestStation(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  WATER_WATCH_STATIONS.forEach(station => {
    const [stLng, stLat] = station.coordinates;
    const dist = getDistanceMeters(lat, lng, stLat, stLng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...station, distanceMeters: dist };
    }
  });

  return nearest;
}

// ข้อมูลตัวอย่างเริ่มต้น (Initial Sample Submissions)
export const INITIAL_SUBMISSIONS = [
  {
    record_id: 'rec-001-init',
    sample_code: 'KOK-20260923-0001',
    schema_version: '1.0',
    station_id: 'ST-01',
    station_name: 'สถานีสะพานท่าตอน (แม่น้ำกกตอนบน)',
    coordinates: [99.3603, 20.0619],
    collection_time: '2026-09-23T09:30:00+07:00',
    gps_accuracy_meters: 8.5,
    entry_type: 'realtime', // 'realtime' | 'retrospective'
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-XXXX',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก (สายหลัก)',
      water_appearance: 'ขุ่นปานกลาง มีตะกอนแขวนลอยสีน้ำตาลอ่อน',
      odor: 'ไม่พบกลิ่นผิดปกติ',
      rain_last_24h: 'มีฝนตกเล็กน้อย (15 มม.)',
      notes: 'กระแสน้ำไหลปานกลาง ระดับน้ำตลิ่งปกติ'
    },
    measurements: {
      arsenic: {
        value: 8.4,
        unit: 'µg/L',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'Merck MQuant Arsenic Test'
      },
      ph: {
        value: 7.2,
        status: 'normal',
        method: 'เครื่องวัดดิจิทัลพกพา',
        instrument: 'Hanna HI98107 pHep'
      },
      turbidity: {
        value: 28.5,
        unit: 'NTU',
        status: 'normal',
        method: 'เครื่องวัดความขุ่นภาคสนาม',
        instrument: 'Turbidimeter 2100Q'
      },
      temperature: {
        value: 24.8,
        unit: '°C',
        status: 'normal',
        method: 'หัววัดดิจิทัล',
        instrument: 'Thermometer Probe'
      }
    },
    images: [
      {
        id: 'img-001',
        title: 'จุดเก็บตัวอย่างสะพานท่าตอน',
        url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'DRV_FILE_ST01_01',
        size_kb: 450
      },
      {
        id: 'img-002',
        title: 'ผลการเทียบแถบสีชุดทดสอบสารหนู',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'DRV_FILE_ST01_02',
        size_kb: 320
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-002-init',
    sample_code: 'KOK-20260923-0002',
    schema_version: '1.0',
    station_id: 'ST-02',
    station_name: 'สถานีชุมชนบ้านท่าดอย',
    coordinates: [99.3565, 20.0648],
    collection_time: '2026-09-23T10:45:00+07:00',
    gps_accuracy_meters: 6.2,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0003',
      name: 'นางสาวพิมลดา สุริยันต์',
      phone: '089-773-XXXX',
      organization: 'ศูนย์สิ่งแวดล้อมชุมชนท่าตอน'
    },
    sample_nature: {
      water_source: 'ลำห้วยสาขาบรรจบแม่น้ำกก',
      water_appearance: 'ใส ไม่มีตะกอน',
      odor: 'ไม่พบกลิ่นผิดปกติ',
      rain_last_24h: 'ไม่มีฝนตก',
      notes: 'ชาวบ้านใช้น้ำจุดนี้ทำประปาภูเขา'
    },
    measurements: {
      arsenic: {
        value: 12.8, // สูงกว่าเกณฑ์เฝ้าระวัง 10 µg/L
        unit: 'µg/L',
        status: 'watch',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'Merck MQuant Arsenic Test'
      },
      ph: {
        value: 6.8,
        status: 'normal',
        method: 'เครื่องวัดดิจิทัลพกพา',
        instrument: 'Hanna HI98107'
      },
      turbidity: {
        value: 12.0,
        unit: 'NTU',
        status: 'normal',
        method: 'เครื่องวัดความขุ่นภาคสนาม',
        instrument: 'Turbidimeter 2100Q'
      },
      temperature: {
        value: 23.5,
        unit: '°C',
        status: 'normal',
        method: 'หัววัดดิจิทัล',
        instrument: 'Thermometer Probe'
      }
    },
    images: [
      {
        id: 'img-003',
        title: 'ลำน้ำสาขาบ้านท่าดอย',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'DRV_FILE_ST02_01',
        size_kb: 510
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-003-init',
    sample_code: 'KOK-20260923-0003',
    station_id: 'ST-03',
    station_name: 'สถานีบ้านใหม่หมอกจ๋าม',
    coordinates: [99.4350, 20.0320],
    collection_time: '2026-09-23T11:30:00+07:00',
    gps_accuracy_meters: 10.1,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-XXXX',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก (สายหลัก)',
      water_appearance: 'ขุ่นเล็กน้อย',
      odor: 'ไม่พบกลิ่นผิดปกติ',
      rain_last_24h: 'ไม่มีฝนตก',
      notes: 'จุดเชื่อมต่อก่อนไหลเข้าพื้นที่ อ.เมืองเชียงราย'
    },
    measurements: {
      arsenic: {
        value: 6.2,
        unit: 'µg/L',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'Merck MQuant Arsenic Test'
      },
      ph: {
        value: 7.4,
        status: 'normal',
        method: 'เครื่องวัดดิจิทัลพกพา',
        instrument: 'Hanna HI98107'
      },
      turbidity: {
        value: 22.0,
        unit: 'NTU',
        status: 'normal',
        method: 'เครื่องวัดความขุ่นภาคสนาม',
        instrument: 'Turbidimeter 2100Q'
      },
      temperature: {
        value: 25.1,
        unit: '°C',
        status: 'normal',
        method: 'หัววัดดิจิทัล',
        instrument: 'Thermometer Probe'
      }
    },
    images: [],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  }
];

// Helper functions สำหรับการดึงและบันทึกข้อมูล
const LOCAL_STORAGE_KEY = 'kok_water_watch_submissions';

export function getStoredSubmissions() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }
  return INITIAL_SUBMISSIONS;
}

export function saveNewSubmission(submission) {
  try {
    const current = getStoredSubmissions();
    const updated = [submission, ...current];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return [submission, ...INITIAL_SUBMISSIONS];
  }
}
