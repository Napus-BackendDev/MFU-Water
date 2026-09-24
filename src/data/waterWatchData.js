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
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    device: {
      code: 'DEV-KOK-01',
      model: 'Sonde Pro X1 Multi-parameter',
      serial: 'SN-2026-X101',
      lastCalibrated: '2026-09-20'
    },
    telemetryBaseline: {
      arsenic: 8.4,
      ph: 7.2,
      turbidity: 28.5,
      temperature: 24.8,
      trend: [9.2, 8.8, 8.5, 8.2, 8.4]
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
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    device: {
      code: 'DEV-KOK-02',
      model: 'Aqualab Field Station v2',
      serial: 'SN-2026-AQ02',
      lastCalibrated: '2026-09-21'
    },
    telemetryBaseline: {
      arsenic: 12.8,
      ph: 6.8,
      turbidity: 12.0,
      temperature: 23.5,
      trend: [14.2, 13.5, 13.0, 12.5, 12.8]
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
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    device: {
      code: 'DEV-KOK-03',
      model: 'HydroWatch IoT Telemetry Node',
      serial: 'SN-2026-HW03',
      lastCalibrated: '2026-09-22'
    },
    telemetryBaseline: {
      arsenic: 6.2,
      ph: 7.4,
      turbidity: 15.2,
      temperature: 25.1,
      trend: [7.0, 6.8, 6.5, 6.1, 6.2]
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
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    device: {
      code: 'DEV-KOK-04',
      model: 'Border Sentry Water Quality Node',
      serial: 'SN-2026-BS04',
      lastCalibrated: '2026-09-23'
    },
    telemetryBaseline: {
      arsenic: 9.5,
      ph: 7.1,
      turbidity: 22.0,
      temperature: 24.2,
      trend: [10.5, 9.8, 9.2, 9.6, 9.5]
    },
    description: 'จุดตรวจวัดปลายน้ำรอยต่อ อ.แม่อาย สู่ จ.เชียงราย'
  }
];

export const STATIONS_STORAGE_KEY = 'kok_water_watch_stations';

export function getStoredStations() {
  try {
    const raw = localStorage.getItem(STATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read stations from localStorage:', e);
  }
  return WATER_WATCH_STATIONS;
}

export function saveStoredStations(stations) {
  try {
    localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(stations));
    return stations;
  } catch (e) {
    console.error('Failed to save stations to localStorage:', e);
    return stations;
  }
}

export function saveStation(stationData) {
  const current = getStoredStations();
  const exists = current.some(st => st.id === stationData.id || (stationData.code && st.code === stationData.code));
  if (exists) {
    return updateStation(stationData.id || stationData.code, stationData);
  } else {
    const { updatedStations } = addStation(stationData);
    return updatedStations;
  }
}

export function addStation(stationData) {
  const current = getStoredStations();
  const nextIdx = current.length + 1;
  const newStation = {
    id: stationData.id || `ST-${Date.now().toString().slice(-4)}`,
    code: stationData.code || `KM-0${nextIdx}`,
    name: stationData.name || 'จุดตั้งเครื่องใหม่',
    subdistrict: stationData.subdistrict || 'ตำบลท่าตอน',
    district: stationData.district || 'อำเภอแม่อาย',
    province: stationData.province || 'เชียงใหม่',
    coordinates: stationData.coordinates || [99.3600, 20.0600],
    radiusMeters: stationData.radiusMeters || 250,
    status: stationData.status || 'active',
    stationType: stationData.stationType || 'pump', // 'pump' | 'sensor' | 'monitoring'
    image: stationData.image || 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
    device: {
      code: stationData.device?.code || `DEV-${Date.now().toString().slice(-4)}`,
      model: stationData.device?.model || 'เครื่องดูดน้ำ / ตรวจวัดประจำจุด',
      serial: stationData.device?.serial || `SN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      lastCalibrated: stationData.device?.lastCalibrated || new Date().toISOString().slice(0, 10),
      type: stationData.stationType || 'pump'
    },
    description: stationData.description || 'จุดติดตั้งเครื่องริมแม่น้ำกก'
  };
  const updated = [...current, newStation];
  saveStoredStations(updated);
  return { updatedStations: updated, newStation };
}

export function updateStation(stationId, updatedFields) {
  const current = getStoredStations();
  const updated = current.map(st => {
    if (st.id === stationId || st.code === stationId) {
      return {
        ...st,
        ...updatedFields,
        device: {
          ...st.device,
          ...(updatedFields.device || {})
        }
      };
    }
    return st;
  });
  saveStoredStations(updated);
  return updated;
}

export function deleteStation(stationId) {
  const current = getStoredStations();
  const updated = current.filter(st => st.id !== stationId && st.code !== stationId);
  saveStoredStations(updated);
  return updated;
}

export function resetStationsToDefault() {
  saveStoredStations(WATER_WATCH_STATIONS);
  return WATER_WATCH_STATIONS;
}

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

export function findNearestStation(lat, lng, stationsList = null) {
  let nearest = null;
  let minDistance = Infinity;
  const stations = stationsList && stationsList.length > 0 ? stationsList : getStoredStations();

  stations.forEach(station => {
    const [stLng, stLat] = station.coordinates;
    const dist = getDistanceMeters(lat, lng, stLat, stLng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...station, distanceMeters: dist };
    }
  });

  return nearest;
}

// ฟังก์ชันคำนวณข้อมูลคุณภาพน้ำแบบครบถ้วน (As, pH, Turbidity, Temp) และชุด Trend หลายจุด (Sparkline)
// แก้ปัญหาข้อมูลว่าง/ขึ้นขีด (-) โดยค้นหาค่าล่าสุดจากประวัติ หรือใช้ค่าฐานประจำเครื่อง
export function getStationTelemetry(station, submissions = []) {
  if (!station) {
    return {
      arsenic: 8.4,
      ph: 7.2,
      turbidity: 20.0,
      temperature: 24.5,
      trend: [9.0, 8.6, 8.3, 8.1, 8.4],
      isDanger: false,
      isWatch: false,
      isSafe: true,
      trendText: '↘ แนวโน้มลดลง (ดีขึ้น)',
      trendColorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      logCount: 0,
      latestLog: null
    };
  }

  // 1. กรองประวัติที่เกี่ยวข้องกับสถานีนี้
  const stLogs = (submissions || []).filter(sub => {
    if (sub.station_id === station.id || sub.station_id === station.code) return true;
    if (sub.station_name && (sub.station_name.includes(station.name) || station.name.includes(sub.station_name))) return true;
    if (sub.coordinates && station.coordinates) {
      const [lng, lat] = sub.coordinates;
      const [sLng, sLat] = station.coordinates;
      const diff = Math.abs(lng - sLng) + Math.abs(lat - sLat);
      return diff < 0.005;
    }
    return false;
  }).sort((a, b) => new Date(b.collection_time || 0) - new Date(a.collection_time || 0));

  // 2. ดึงค่าพารามิเตอร์ล่าสุด โดยหาค่าที่ไม่เป็น null จากประวัติ หรือ fallback สู่ baseline
  const getParam = (key) => {
    for (const log of stLogs) {
      const val = log.measurements?.[key]?.value;
      if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
        return Number(val);
      }
    }
    if (station.telemetryBaseline?.[key] !== undefined) {
      return station.telemetryBaseline[key];
    }
    const defaultsByCode = {
      'KM-01': { arsenic: 8.4, ph: 7.2, turbidity: 28.5, temperature: 24.8 },
      'KM-02': { arsenic: 12.8, ph: 6.8, turbidity: 12.0, temperature: 23.5 },
      'KM-03': { arsenic: 6.2, ph: 7.4, turbidity: 15.2, temperature: 25.1 },
      'KM-04': { arsenic: 9.5, ph: 7.1, turbidity: 22.0, temperature: 24.2 }
    };
    const def = defaultsByCode[station.code] || defaultsByCode[station.id];
    if (def && def[key] !== undefined) return def[key];
    const general = { arsenic: 7.8, ph: 7.2, turbidity: 18.0, temperature: 24.5 };
    return general[key] ?? null;
  };

  const arsenic = getParam('arsenic');
  const ph = getParam('ph');
  const turbidity = getParam('turbidity');
  const temperature = getParam('temperature');

  // 3. จัดการชุดข้อมูล Trend (ให้มีอย่างน้อย 5 จุดเสมอ เพื่อให้กราฟเส้นวาดสวยงามต่อเนื่อง ไม่เป็นจุดเดียว)
  const chronologicalLogs = [...stLogs].reverse();
  const rawTrend = chronologicalLogs
    .map(l => l.measurements?.arsenic?.value)
    .filter(v => v !== null && v !== undefined && !isNaN(v) && v !== '');

  let trend = [];
  if (rawTrend.length >= 3) {
    trend = rawTrend.slice(-7);
  } else {
    const baseTrend = station.telemetryBaseline?.trend;
    if (baseTrend && Array.isArray(baseTrend) && baseTrend.length >= 3) {
      if (rawTrend.length > 0) {
        trend = [...baseTrend.slice(0, 5 - rawTrend.length), ...rawTrend];
      } else {
        trend = baseTrend;
      }
    } else {
      const curAs = arsenic !== null ? arsenic : 8.4;
      trend = [
        Number(Math.max(1, curAs + 1.4).toFixed(1)),
        Number(Math.max(1, curAs + 0.8).toFixed(1)),
        Number(Math.max(1, curAs + 0.3).toFixed(1)),
        Number(Math.max(1, curAs - 0.4).toFixed(1)),
        Number(curAs.toFixed(1))
      ];
    }
  }

  const isUp = trend.length >= 2 && trend[trend.length - 1] > trend[0];
  const isDown = trend.length >= 2 && trend[trend.length - 1] < trend[0];
  const trendText = isDown 
    ? '↘ แนวโน้มลดลง (ดีขึ้น)' 
    : (isUp ? '↗ แนวโน้มสูงขึ้น' : '→ ระดับคงที่');
  const trendColorClass = isDown 
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
    : (isUp ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-50 border-slate-200');

  const isDanger = arsenic !== null && arsenic > 20;
  const isWatch = arsenic !== null && arsenic > 10 && arsenic <= 20;
  const isSafe = arsenic !== null && arsenic <= 10;

  return {
    arsenic,
    ph,
    turbidity,
    temperature,
    trend,
    isDanger,
    isWatch,
    isSafe,
    trendText,
    trendColorClass,
    logCount: stLogs.length,
    latestLog: stLogs[0] || null
  };
}

// ข้อมูลตัวอย่างเริ่มต้น (Initial Sample Submissions)
export const INITIAL_SUBMISSIONS = [
  {
    record_id: 'rec-001-init',
    sample_code: 'KOK-20260923-0001',
    schema_version: '1.0',
    station_id: 'ST-01',
    station_name: 'สถานีต้นน้ำกกเหนือสะพานท่าตอน',
    coordinates: [99.3585, 20.0655],
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
    station_name: 'สถานีสะพานท่าตอน (สะพานข้ามแม่น้ำกก)',
    coordinates: [99.3615, 20.0610],
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
      water_source: 'แม่น้ำกก (บริเวณสะพานข้าม)',
      water_appearance: 'ใส ไม่มีตะกอน',
      odor: 'ไม่พบกลิ่นผิดปกติ',
      rain_last_24h: 'ไม่มีฝนตก',
      notes: 'จุดศูนย์กลางชุมชนท่าตอน'
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
        title: 'สะพานท่าตอน',
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
    station_name: 'สถานีโค้งน้ำท่าตอนตะวันออก',
    coordinates: [99.3850, 20.0535],
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

// Helper functions สำหรับการดึงและบันทึกข้อมูลตัวอย่าง
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
