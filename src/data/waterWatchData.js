// ข้อมูลและระบบจัดการข้อมูล KOK Water Watch (POC-1)
// รองรับโครงสร้าง Google Sheets, Google Drive, และ Supabase Index

// 9 ระดับสีสารหนูตามชุดทดสอบภาคสนาม (Arsenic Field Test Kit: 0-500 ppb)
export const ARSENIC_LEVELS = [
  { level: 1, ppb: 0, label: '0 ppb', color: '#FBF9F2', borderColor: '#D1D5DB', desc: 'สีขาวครีม' },
  { level: 2, ppb: 5, label: '5 ppb', color: '#FEF3A9', borderColor: '#E5D66E', desc: 'สีเหลืองอ่อน' },
  { level: 3, ppb: 10, label: '10 ppb', color: '#F7E752', borderColor: '#DAC82A', desc: 'สีเหลืองมะนาว' },
  { level: 4, ppb: 30, label: '30 ppb', color: '#E8BE36', borderColor: '#C89F19', desc: 'สีเหลืองทอง' },
  { level: 5, ppb: 50, label: '50 ppb', color: '#DE9922', borderColor: '#B87A11', desc: 'สีเหลืองสด' },
  { level: 6, ppb: 100, label: '100 ppb', color: '#C07128', borderColor: '#9A5214', desc: 'สีน้ำตาลอ่อน/ส้ม' },
  { level: 7, ppb: 200, label: '200 ppb', color: '#974E22', borderColor: '#753713', desc: 'สีน้ำตาล' },
  { level: 8, ppb: 300, label: '300 ppb', color: '#683115', borderColor: '#4F210A', desc: 'สีน้ำตาลเข้ม' },
  { level: 9, ppb: 500, label: '500 ppb', color: '#3A1807', borderColor: '#240D04', desc: 'สีน้ำตาลไหม้/ดำ' },
];

export function getArsenicLevelConfig(ppbVal) {
  if (ppbVal === null || ppbVal === undefined || isNaN(Number(ppbVal))) return ARSENIC_LEVELS[0];
  const num = Number(ppbVal);
  let closest = ARSENIC_LEVELS[0];
  let minDiff = Infinity;
  for (const lvl of ARSENIC_LEVELS) {
    const diff = Math.abs(lvl.ppb - num);
    if (diff < minDiff) {
      minDiff = diff;
      closest = lvl;
    }
  }
  return closest;
}

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

// ระบบรวมกลุ่มพิกัดตรวจวัด (Spatial Clustering & Hotspot Engine)
// จุดที่อยู่ใกล้กันภายในระยะ ~250 เมตร หากมีตั้งแต่ 2 รายการขึ้นไปจะรวมเป็นหนึ่งก้อน (Hotspot)
export function clusterSubmissions(submissions = [], radiusMeters = 250) {
  const validSubmissions = (submissions || []).filter(
    s => s && s.coordinates && Array.isArray(s.coordinates) && s.coordinates.length === 2 &&
         !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1])
  );

  const visited = new Set();
  const rawClusters = [];

  for (let i = 0; i < validSubmissions.length; i++) {
    if (visited.has(i)) continue;
    const current = validSubmissions[i];
    const cluster = [current];
    visited.add(i);

    const [cLng, cLat] = current.coordinates;

    for (let j = i + 1; j < validSubmissions.length; j++) {
      if (visited.has(j)) continue;
      const other = validSubmissions[j];
      const [oLng, oLat] = other.coordinates;
      const dist = getDistanceMeters(cLat, cLng, oLat, oLng);
      if (dist <= radiusMeters) {
        cluster.push(other);
        visited.add(j);
      }
    }

    rawClusters.push(cluster);
  }

  const clusterGroups = rawClusters.filter(g => g.length >= 2);
  const singleGroups = rawClusters.filter(g => g.length < 2);

  const processGroup = (group, isCluster, index) => {
    // ฟังก์ชันดึงค่าเวลา timestamp ของแต่ละรายงานเพื่อเรียงลำดับใหม่อย่างแม่นยำ
    const getTimeVal = (it) => {
      if (!it) return 0;
      const t = it.collection_time || it.created_at || it.timestamp || it.date;
      if (t) {
        if (typeof t === 'number' && !isNaN(t) && t > 0) return t;
        const d = new Date(t).getTime();
        if (!isNaN(d) && d > 0) return d;
      }
      // Fallback: ดึงตัวเลขอ้างอิงจาก record_id เช่น rec-1727... หรือ id
      const idStr = String(it.record_id || it.id || '');
      const numMatch = idStr.match(/\d{10,}/);
      if (numMatch) {
        const num = Number(numMatch[0]);
        if (!isNaN(num) && num > 0) return num;
      }
      return 0;
    };

    // เรียงลำดับประวัติตามเวลาบันทึกใหม่สุดขึ้นก่อน (Latest First)
    const items = [...group].sort((a, b) => getTimeVal(b) - getTimeVal(a));
    const latestSample = items[0] || {};

    // คำนวณจุดกึ่งกลางพิกัด (Centroid)
    const avgLng = items.reduce((sum, it) => sum + Number(it.coordinates[0]), 0) / items.length;
    const avgLat = items.reduce((sum, it) => sum + Number(it.coordinates[1]), 0) / items.length;

    // คำนวณค่าสารหนู (As) รวมของทุกรายงานในก้อน
    const arsenicValues = items
      .map(it => {
        const asObj = it.measurements?.arsenic;
        if (asObj?.value !== undefined && asObj?.value !== null && !isNaN(Number(asObj.value))) {
          return Number(asObj.value);
        }
        if (asObj?.level !== undefined && asObj?.level !== null) {
          const cfg = ARSENIC_LEVELS.find(l => l.level === Number(asObj.level));
          if (cfg) return cfg.ppb;
        }
        return null;
      })
      .filter(v => v !== null && !isNaN(v));

    const maxAs = arsenicValues.length > 0 ? Math.max(...arsenicValues) : 0;
    const minAs = arsenicValues.length > 0 ? Math.min(...arsenicValues) : 0;
    const avgAs = arsenicValues.length > 0 ? Number((arsenicValues.reduce((a, b) => a + b, 0) / arsenicValues.length).toFixed(1)) : 0;

    // ข้อมูลของ "การตรวจวัดล่าสุด" (Latest Record Only) - สารหนูและระดับสี
    let latestAsVal = latestSample.measurements?.arsenic?.value;
    if (latestAsVal === null || latestAsVal === undefined || isNaN(Number(latestAsVal))) {
      const lvl = latestSample.measurements?.arsenic?.level;
      if (lvl !== null && lvl !== undefined && !isNaN(Number(lvl))) {
        const cfg = ARSENIC_LEVELS.find(l => l.level === Number(lvl));
        latestAsVal = cfg ? cfg.ppb : (Number(lvl) === 1 ? 0 : Number(lvl) === 2 ? 5 : Number(lvl) === 3 ? 10 : Number(lvl) === 4 ? 30 : 50);
      } else if (latestSample.arsenic !== undefined && !isNaN(Number(latestSample.arsenic))) {
        latestAsVal = Number(latestSample.arsenic);
      } else if (latestSample.as !== undefined && !isNaN(Number(latestSample.as))) {
        latestAsVal = Number(latestSample.as);
      } else if (latestSample.arsenic_ppb !== undefined && !isNaN(Number(latestSample.arsenic_ppb))) {
        latestAsVal = Number(latestSample.arsenic_ppb);
      } else {
        latestAsVal = arsenicValues.length > 0 ? arsenicValues[0] : 0;
      }
    }
    const latestAs = Number(latestAsVal);

    const latestLevelCfg = (latestSample.measurements?.arsenic?.level && ARSENIC_LEVELS.find(l => l.level === Number(latestSample.measurements.arsenic.level)))
      || getArsenicLevelConfig(latestAs);

    // ระดับเตือนภัยตามผลตรวจวัดล่าสุด
    const latestIsDanger = latestAs > 50;
    const latestIsWatch = latestAs > 10 && !latestIsDanger;
    const latestIsSafe = !latestIsDanger && !latestIsWatch;

    // รูปภาพของการตรวจวัดล่าสุดเท่านั้น (Strictly Latest Record - ไม่นำรูปรายงานเก่ามาปนเด็ดขาด)
    const rawLatestImgs = Array.isArray(latestSample.images) && latestSample.images.length > 0
      ? latestSample.images
      : Array.isArray(latestSample.photos) && latestSample.photos.length > 0
      ? latestSample.photos
      : latestSample.image
      ? [latestSample.image]
      : latestSample.photo
      ? [latestSample.photo]
      : [];

    const latestPhotos = rawLatestImgs.map((img, idx) => {
      if (!img) return null;
      if (typeof img === 'string') {
        const trimmed = img.trim();
        if (!trimmed) return null;
        return {
          id: `latest-photo-${idx + 1}`,
          title: `ภาพถ่ายหลักฐานการตรวจล่าสุด (${idx + 1})`,
          url: trimmed
        };
      }
      if (typeof img === 'object') {
        const url = img.url || img.src || img.preview || img.dataUrl || img.photo_url || img.image_url || '';
        if (!url || typeof url !== 'string' || !url.trim()) return null;
        return {
          ...img,
          id: img.id || `latest-photo-${idx + 1}`,
          title: img.title || img.name || `ภาพถ่ายหลักฐานการตรวจล่าสุด (${idx + 1})`,
          url: url.trim()
        };
      }
      return null;
    }).filter(Boolean);

    const latestPhoto = latestPhotos.length > 0 ? latestPhotos[0] : null;

    // ข้อมูลผู้ตรวจวัดล่าสุด (รองรับทั้ง object และ string)
    let latestCollector = null;
    if (latestSample.collector) {
      if (typeof latestSample.collector === 'string') {
        latestCollector = {
          name: latestSample.collector.trim(),
          organization: '',
          phone: '',
          id: ''
        };
      } else if (typeof latestSample.collector === 'object') {
        latestCollector = {
          id: latestSample.collector.id || '',
          name: latestSample.collector.name || latestSample.collector.collector_name || latestSample.collector.fullname || '',
          phone: latestSample.collector.phone || '',
          organization: latestSample.collector.organization || latestSample.collector.org || ''
        };
      }
    }

    // เวลาที่ตรวจวัดล่าสุด
    const latestCollectionTime = latestSample.collection_time || latestSample.created_at || latestSample.timestamp || latestSample.date || null;

    // ช่วงเวลาที่ทำการตรวจวัดในก้อนนี้ (Time Range)
    const times = items.map(it => getTimeVal(it)).filter(t => t > 0);
    const minTime = times.length > 0 ? new Date(Math.min(...times)) : new Date();
    const maxTime = times.length > 0 ? new Date(Math.max(...times)) : new Date();

    return {
      id: isCluster ? `hotspot-${index + 1}` : `single-${index + 1}`,
      title: isCluster ? `ก้อน Hotspot ที่ ${index + 1}` : (latestSample.station_name || 'จุดสำรวจตรวจวัด'),
      locationName: latestSample.station_name || latestSample.sample_nature?.water_source || 'จุดตรวจวัดริมแม่น้ำกก',
      coordinates: [avgLng, avgLat],
      count: items.length,
      items,
      isHotspot: isCluster,
      // ค่าสารหนู
      latestAs,
      maxAs,
      minAs,
      avgAs,
      // ระดับเตือนภัยอิงตามผลตรวจล่าสุด
      isDanger: latestIsDanger,
      isWatch: latestIsWatch,
      isSafe: latestIsSafe,
      latestIsDanger,
      latestIsWatch,
      latestIsSafe,
      latestLevelCfg,
      // ข้อมูลเฉพาะของการตรวจวัดล่าสุด
      latestCollectionTime,
      latestCollector,
      latestSampleCode: latestSample.sample_code || latestSample.record_id || latestSample.id || null,
      latestPhoto,
      latestPhotos,
      latestWaterSource: latestSample.sample_nature?.water_source || '',
      latestNotes: latestSample.sample_nature?.notes || '',
      timeRange: {
        start: minTime.toISOString(),
        end: maxTime.toISOString()
      },
      photos: items.flatMap(it => {
        const raw = it.images || it.photos || (it.image ? [it.image] : []);
        return Array.isArray(raw) ? raw : [];
      }),
      sample: latestSample
    };
  };

  const clusters = clusterGroups.map((g, idx) => processGroup(g, true, idx));
  const singlePoints = singleGroups.map((g, idx) => processGroup(g, false, idx));

  return { clusters, singlePoints, totalPoints: validSubmissions.length };
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

// ข้อมูลตัวอย่างเริ่มต้นชุดใหม่ (Initial Sample Submissions - อิงชุดตรวจสารหนู 9 ระดับและพิกัด GPS)
export const INITIAL_SUBMISSIONS = [
  {
    record_id: 'rec-001-init',
    sample_code: 'KOK-20260924-0001',
    schema_version: '2.0',
    station_name: 'จุดริมน้ำเหนือสะพานท่าตอน',
    coordinates: [99.3585, 20.0655],
    collection_time: '2026-09-24T08:30:00+07:00',
    gps_accuracy_meters: 4.8,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-4521',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก (บริเวณเหนือสะพานท่าตอน)',
      notes: 'น้ำใสไหลปานกลาง ตรวจเทียบแถบสีได้ระดับ 2 (5 ppb) ปลอดภัย'
    },
    measurements: {
      arsenic: {
        value: 5,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 2 (5 ppb)',
        level: 2,
        label: '5 ppb',
        desc: 'สีเหลืองอ่อน',
        color: '#FEF3A9'
      }
    },
    images: [
      {
        id: 'img-001',
        title: 'ภาพที่ 1: แถบเทียบสี 5 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_01',
        size_kb: 420
      },
      {
        id: 'img-002',
        title: 'ภาพที่ 2: ริมตลิ่งเหนือสะพานท่าตอน',
        url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'RIVER_BANK_01',
        size_kb: 510
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-002-init',
    sample_code: 'KOK-20260924-0002',
    schema_version: '2.0',
    station_name: 'จุดสะพานท่าตอน (จุดกลางชุมชน)',
    coordinates: [99.3615, 20.0610],
    collection_time: '2026-09-24T09:15:00+07:00',
    gps_accuracy_meters: 3.5,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0003',
      name: 'นางสาวพิมลดา สุริยันต์',
      phone: '089-773-1890',
      organization: 'ศูนย์สิ่งแวดล้อมชุมชนท่าตอน'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก (บริเวณใต้สะพานข้าม)',
      notes: 'จุดศูนย์กลางชุมชนท่าตอน เทียบสีได้ระดับ 3 (10 ppb) อยู่ในเกณฑ์ปลอดภัย WHO'
    },
    measurements: {
      arsenic: {
        value: 10,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 3 (10 ppb)',
        level: 3,
        label: '10 ppb',
        desc: 'สีเหลืองมะนาว',
        color: '#F7E752'
      }
    },
    images: [
      {
        id: 'img-003',
        title: 'ภาพที่ 1: แถบเทียบสี 10 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_02',
        size_kb: 460
      },
      {
        id: 'img-004',
        title: 'ภาพที่ 2: สะพานข้ามแม่น้ำกกท่าตอน',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'BRIDGE_THATO_01',
        size_kb: 490
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-003-init',
    sample_code: 'KOK-20260924-0003',
    schema_version: '2.0',
    station_name: 'จุดโค้งน้ำท่าตอนตะวันออก',
    coordinates: [99.3850, 20.0535],
    collection_time: '2026-09-24T10:00:00+07:00',
    gps_accuracy_meters: 6.2,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-4521',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก (ช่วงโค้งน้ำตะวันออก)',
      notes: 'กระแสน้ำไหลเอื่อย พบแถบเทียบสีเหลืองอ่อนระดับ 2 (5 ppb)'
    },
    measurements: {
      arsenic: {
        value: 5,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 2 (5 ppb)',
        level: 2,
        label: '5 ppb',
        desc: 'สีเหลืองอ่อน',
        color: '#FEF3A9'
      }
    },
    images: [
      {
        id: 'img-005',
        title: 'ภาพที่ 1: แถบเทียบสี 5 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_03',
        size_kb: 380
      },
      {
        id: 'img-005b',
        title: 'ภาพที่ 2: โค้งน้ำท่าตอนตะวันออก',
        url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'BEND_LOCATION_01',
        size_kb: 480
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-004-init',
    sample_code: 'KOK-20260924-0004',
    schema_version: '2.0',
    station_name: 'จุดสะพานท่าตอน (ฝั่งทิศเหนือ)',
    coordinates: [99.3619, 20.0613],
    collection_time: '2026-09-24T10:15:00+07:00',
    gps_accuracy_meters: 4.0,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0004',
      name: 'นายสมชาย ใจดี',
      phone: '082-111-9876',
      organization: 'ประชาชนท่าตอน'
    },
    sample_nature: {
      water_source: 'ริมตลิ่งสะพานท่าตอน ฝั่งเหนือ',
      notes: 'ตรวจวัดซ้ำช่วงสาย เทียบสีได้ระดับ 4 (30 ppb) สีเหลืองทอง เฝ้าระวัง'
    },
    measurements: {
      arsenic: {
        value: 30,
        unit: 'ppb',
        status: 'watch',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 4 (30 ppb)',
        level: 4,
        label: '30 ppb',
        desc: 'สีเหลืองทอง',
        color: '#E8BE36'
      }
    },
    images: [
      {
        id: 'img-006',
        title: 'ภาพที่ 1: แถบเทียบสี 30 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_04',
        size_kb: 410
      },
      {
        id: 'img-006b',
        title: 'ภาพที่ 2: จุดตรวจริมตลิ่งฝั่งเหนือ',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'NORTH_BANK_01',
        size_kb: 470
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-005-init',
    sample_code: 'KOK-20260924-0005',
    schema_version: '2.0',
    station_name: 'จุดริมน้ำสะพานท่าตอน (ฝั่งตลาด)',
    coordinates: [99.3612, 20.0607],
    collection_time: '2026-09-24T11:00:00+07:00',
    gps_accuracy_meters: 3.8,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0005',
      name: 'นายนิพนธ์ ริมกก',
      phone: '084-222-7711',
      organization: 'กลุ่มอนุรักษ์น้ำกก'
    },
    sample_nature: {
      water_source: 'ใต้สะพานท่าตอน ฝั่งตลาดริมน้ำ',
      notes: 'ตรวจเทียบสีได้ระดับ 3 (10 ppb) สีเหลืองมะนาว ปลอดภัย'
    },
    measurements: {
      arsenic: {
        value: 10,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 3 (10 ppb)',
        level: 3,
        label: '10 ppb',
        desc: 'สีเหลืองมะนาว',
        color: '#F7E752'
      }
    },
    images: [
      {
        id: 'img-007',
        title: 'ภาพที่ 1: แถบเทียบสี 10 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_05',
        size_kb: 450
      },
      {
        id: 'img-007b',
        title: 'ภาพที่ 2: ตลาดริมน้ำสะพานท่าตอน',
        url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'MARKET_RIVER_01',
        size_kb: 505
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-006-init',
    sample_code: 'KOK-20260924-0006',
    schema_version: '2.0',
    station_name: 'จุดตรวจบ้านใหม่หมอกจ๋าม',
    coordinates: [99.4350, 20.0320],
    collection_time: '2026-09-24T11:30:00+07:00',
    gps_accuracy_meters: 5.5,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0006',
      name: 'นายชาญชัย มิ่งขวัญ',
      phone: '086-333-5544',
      organization: 'อาสาสมัครหมอกจ๋าม'
    },
    sample_nature: {
      water_source: 'แม่น้ำกกตอนล่าง จุดตรวจบ้านใหม่หมอกจ๋าม',
      notes: 'จุดเดี่ยวปลายน้ำ ตรวจพบระดับ 2 (5 ppb) ปลอดภัย'
    },
    measurements: {
      arsenic: {
        value: 5,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 2 (5 ppb)',
        level: 2,
        label: '5 ppb',
        desc: 'สีเหลืองอ่อน',
        color: '#FEF3A9'
      }
    },
    images: [
      {
        id: 'img-008',
        title: 'ภาพที่ 1: แถบเทียบสี 5 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'TEST_STRIP_06',
        size_kb: 390
      },
      {
        id: 'img-008b',
        title: 'ภาพที่ 2: แม่น้ำกกตอนล่างหมอกจ๋าม',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        drive_file_id: 'MOKCHAM_RIVER_01',
        size_kb: 460
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-007-init',
    sample_code: 'KOK-20260921-0007',
    schema_version: '2.0',
    station_name: 'จุดสะพานท่าตอน (ฝั่งตลาดกลาง)',
    coordinates: [99.3614, 20.0609],
    collection_time: '2026-09-21T09:30:00+07:00',
    gps_accuracy_meters: 4.1,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0004',
      name: 'นายสมชาย ใจดี',
      phone: '082-111-9876',
      organization: 'ประชาชนท่าตอน'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก สะพานท่าตอน',
      notes: 'ตรวจวัดย้อนหลัง 3 วัน เทียบสีได้ระดับ 4 (30 ppb) เฝ้าระวัง'
    },
    measurements: {
      arsenic: {
        value: 30,
        unit: 'ppb',
        status: 'watch',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 4 (30 ppb)',
        level: 4,
        label: '30 ppb',
        desc: 'สีเหลืองทอง',
        color: '#E8BE36'
      }
    },
    images: [
      {
        id: 'img-009',
        title: 'ภาพที่ 1: แถบเทียบสี 30 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        size_kb: 410
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-008-init',
    sample_code: 'KOK-20260918-0008',
    schema_version: '2.0',
    station_name: 'จุดริมน้ำเหนือสะพานท่าตอน',
    coordinates: [99.3590, 20.0650],
    collection_time: '2026-09-18T14:15:00+07:00',
    gps_accuracy_meters: 5.0,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-4521',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก เหนือสะพานท่าตอน',
      notes: 'ตรวจวัดย้อนหลัง 6 วัน ค่าปลอดภัยระดับ 3 (10 ppb)'
    },
    measurements: {
      arsenic: {
        value: 10,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 3 (10 ppb)',
        level: 3,
        label: '10 ppb',
        desc: 'สีเหลืองมะนาว',
        color: '#F7E752'
      }
    },
    images: [
      {
        id: 'img-010',
        title: 'ภาพที่ 1: แถบเทียบสี 10 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        size_kb: 430
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-009-init',
    sample_code: 'KOK-20260910-0009',
    schema_version: '2.0',
    station_name: 'จุดโค้งน้ำท่าตอนตะวันออก',
    coordinates: [99.3845, 20.0530],
    collection_time: '2026-09-10T10:45:00+07:00',
    gps_accuracy_meters: 4.6,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0003',
      name: 'นางสาวพิมลดา สุริยันต์',
      phone: '089-773-1890',
      organization: 'ศูนย์สิ่งแวดล้อมชุมชนท่าตอน'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก โค้งน้ำท่าตอน',
      notes: 'ตรวจวัดรอบสองสัปดาห์ก่อน ระดับ 2 (5 ppb) ปลอดภัย'
    },
    measurements: {
      arsenic: {
        value: 5,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 2 (5 ppb)',
        level: 2,
        label: '5 ppb',
        desc: 'สีเหลืองอ่อน',
        color: '#FEF3A9'
      }
    },
    images: [
      {
        id: 'img-011',
        title: 'ภาพที่ 1: แถบเทียบสี 5 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        size_kb: 390
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-010-init',
    sample_code: 'KOK-20260902-0010',
    schema_version: '2.0',
    station_name: 'จุดสะพานท่าตอน (ฝั่งทิศใต้)',
    coordinates: [99.3618, 20.0612],
    collection_time: '2026-09-02T16:20:00+07:00',
    gps_accuracy_meters: 3.9,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0005',
      name: 'นายนิพนธ์ ริมกก',
      phone: '084-222-7711',
      organization: 'กลุ่มอนุรักษ์น้ำกก'
    },
    sample_nature: {
      water_source: 'ริมน้ำกก สะพานท่าตอน',
      notes: 'ตรวจวัดต้นเดือนกันยายน พบสีเหลืองสดระดับ 5 (50 ppb) เฝ้าระวังสูงสุด'
    },
    measurements: {
      arsenic: {
        value: 50,
        unit: 'ppb',
        status: 'watch',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 5 (50 ppb)',
        level: 5,
        label: '50 ppb',
        desc: 'สีเหลืองสด',
        color: '#DE9922'
      }
    },
    images: [
      {
        id: 'img-012',
        title: 'ภาพที่ 1: แถบเทียบสี 50 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        size_kb: 440
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-011-init',
    sample_code: 'KOK-20260815-0011',
    schema_version: '2.0',
    station_name: 'จุดตรวจบ้านใหม่หมอกจ๋าม (ฝั่งวัด)',
    coordinates: [99.4352, 20.0325],
    collection_time: '2026-08-15T11:00:00+07:00',
    gps_accuracy_meters: 4.8,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0006',
      name: 'นายชาญชัย มิ่งขวัญ',
      phone: '086-333-5544',
      organization: 'อาสาสมัครหมอกจ๋าม'
    },
    sample_nature: {
      water_source: 'แม่น้ำกกตอนล่าง ช่วงกลางเดือนสิงหาคม',
      notes: 'ตรวจพบระดับ 3 (10 ppb) อยู่ในเกณฑ์มาตรฐาน'
    },
    measurements: {
      arsenic: {
        value: 10,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 3 (10 ppb)',
        level: 3,
        label: '10 ppb',
        desc: 'สีเหลืองมะนาว',
        color: '#F7E752'
      }
    },
    images: [
      {
        id: 'img-013',
        title: 'ภาพที่ 1: แถบเทียบสี 10 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        size_kb: 420
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-012-init',
    sample_code: 'KOK-20260710-0012',
    schema_version: '2.0',
    station_name: 'จุดสะพานท่าตอน (ช่วงน้ำหลากฤดูฝน)',
    coordinates: [99.3610, 20.0605],
    collection_time: '2026-07-10T08:50:00+07:00',
    gps_accuracy_meters: 5.2,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0001',
      name: 'นายกิตติศักดิ์ เจริญสุข',
      phone: '081-992-4521',
      organization: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก ท่าตอน ฤดูฝน',
      notes: 'ช่วงน้ำหลากต้นฤดูฝน ก.ค. 2026 วัดได้ระดับ 6 (100 ppb) สีส้ม เกินเกณฑ์มาตรฐาน'
    },
    measurements: {
      arsenic: {
        value: 100,
        unit: 'ppb',
        status: 'danger',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 6 (100 ppb)',
        level: 6,
        label: '100 ppb',
        desc: 'สีน้ำตาลอ่อน/ส้ม',
        color: '#C07128'
      }
    },
    images: [
      {
        id: 'img-014',
        title: 'ภาพที่ 1: แถบเทียบสี 100 ppb',
        url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        size_kb: 470
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-013-init',
    sample_code: 'KOK-20251120-0013',
    schema_version: '2.0',
    station_name: 'จุดริมน้ำเหนือสะพานท่าตอน (ปลายปี 2025)',
    coordinates: [99.3582, 20.0658],
    collection_time: '2025-11-20T13:40:00+07:00',
    gps_accuracy_meters: 4.4,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0003',
      name: 'นางสาวพิมลดา สุริยันต์',
      phone: '089-773-1890',
      organization: 'ศูนย์สิ่งแวดล้อมชุมชนท่าตอน'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก ฤดูหนาว พ.ย. 2025',
      notes: 'ตรวจวัดปลายปี 2025 น้ำใส ตรวจพบระดับ 2 (5 ppb) ปลอดภัย'
    },
    measurements: {
      arsenic: {
        value: 5,
        unit: 'ppb',
        status: 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 2 (5 ppb)',
        level: 2,
        label: '5 ppb',
        desc: 'สีเหลืองอ่อน',
        color: '#FEF3A9'
      }
    },
    images: [
      {
        id: 'img-015',
        title: 'ภาพที่ 1: แถบเทียบสี 5 ppb',
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
        size_kb: 400
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  },
  {
    record_id: 'rec-014-init',
    sample_code: 'KOK-20250615-0014',
    schema_version: '2.0',
    station_name: 'จุดโค้งน้ำท่าตอนตะวันออก (กลางปี 2025)',
    coordinates: [99.3860, 20.0540],
    collection_time: '2025-06-15T15:10:00+07:00',
    gps_accuracy_meters: 6.0,
    entry_type: 'realtime',
    collector: {
      id: 'VOL-0004',
      name: 'นายสมชาย ใจดี',
      phone: '082-111-9876',
      organization: 'ประชาชนท่าตอน'
    },
    sample_nature: {
      water_source: 'แม่น้ำกก โค้งน้ำ มิ.ย. 2025',
      notes: 'บันทึกประวัติศาสตร์กลางปี 2025 เทียบสีได้ระดับ 4 (30 ppb)'
    },
    measurements: {
      arsenic: {
        value: 30,
        unit: 'ppb',
        status: 'watch',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: 'แถบเทียบสีระดับ 4 (30 ppb)',
        level: 4,
        label: '30 ppb',
        desc: 'สีเหลืองทอง',
        color: '#E8BE36'
      }
    },
    images: [
      {
        id: 'img-016',
        title: 'ภาพที่ 1: แถบเทียบสี 30 ppb',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
        size_kb: 380
      }
    ],
    status: 'COMPLETED',
    sync_stage: 'INDEXED'
  }
];

// Helper: Normalize / migrate any submission item to the clean new schema
export function normalizeSubmission(item) {
  if (!item) return null;
  const asMeasurement = item.measurements?.arsenic || {};
  let rawVal = asMeasurement.value;
  if (rawVal === null || rawVal === undefined || isNaN(Number(rawVal))) {
    rawVal = asMeasurement.level 
      ? (asMeasurement.level === 1 ? 0 : asMeasurement.level === 2 ? 5 : asMeasurement.level === 3 ? 10 : asMeasurement.level === 4 ? 30 : 50) 
      : 10;
  }
  const asVal = Number(rawVal);
  const cfg = getArsenicLevelConfig(asVal);
  const isDanger = asVal > 50;
  const isWatch = asVal > 10 && !isDanger;
  const isSafe = !isDanger && !isWatch;

  return {
    ...item,
    schema_version: '2.0',
    station_name: item.station_name || `พิกัด [${Number(item.coordinates?.[1] || 20.06).toFixed(4)}, ${Number(item.coordinates?.[0] || 99.36).toFixed(4)}]`,
    coordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2 
      ? [Number(item.coordinates[0]), Number(item.coordinates[1])] 
      : [99.3615, 20.0610],
    collection_time: item.collection_time || new Date().toISOString(),
    gps_accuracy_meters: item.gps_accuracy_meters || 5.0,
    entry_type: item.entry_type || 'realtime',
    collector: {
      id: item.collector?.id || 'VOL-001',
      name: item.collector?.name || 'ผู้ตรวจวัดภาคสนาม',
      phone: item.collector?.phone || '081-992-4521',
      organization: item.collector?.organization || 'ประชาชนทั่วไป'
    },
    sample_nature: {
      water_source: item.sample_nature?.water_source || 'แม่น้ำกก',
      notes: item.sample_nature?.notes || `บันทึกผ่านชุดตรวจภาคสนาม (${cfg.label} - ${cfg.desc})`
    },
    measurements: {
      arsenic: {
        value: asVal,
        unit: 'ppb',
        status: isDanger ? 'danger' : isWatch ? 'watch' : 'normal',
        method: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
        instrument: `แถบเทียบสีระดับ ${cfg.level} (${cfg.label})`,
        level: cfg.level,
        label: cfg.label,
        desc: cfg.desc,
        color: cfg.color
      }
    },
    images: Array.isArray(item.images) && item.images.length > 0 
      ? item.images 
      : [
          {
            id: `img-strip-${item.sample_code || 'mock'}`,
            title: `ภาพที่ 1: แถบเทียบสี ${cfg.label}`,
            url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
            drive_file_id: 'TEST_STRIP',
            size_kb: 380
          },
          {
            id: `img-river-${item.sample_code || 'mock'}`,
            title: 'ภาพที่ 2: บริเวณริมแม่น้ำกก',
            url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
            drive_file_id: 'RIVER_LOCATION',
            size_kb: 490
          }
        ],
    status: 'COMPLETED',
    sync_stage: item.sync_stage || 'INDEXED'
  };
}

// Helper functions สำหรับการดึงและบันทึกข้อมูลตัวอย่าง
const LOCAL_STORAGE_KEY_V2 = 'kok_water_watch_submissions_v2';
const LEGACY_STORAGE_KEY = 'kok_water_watch_submissions';

export function getStoredSubmissions() {
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    if (!raw) {
      // ตรวจสอบข้อมูลเก่าใน LocalStorage และ Migrate ให้เป็น Schema 2.0
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacyItems = JSON.parse(legacyRaw);
          if (Array.isArray(legacyItems) && legacyItems.length > 0) {
            const migrated = legacyItems.map(it => normalizeSubmission(it)).filter(Boolean);
            localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(migrated));
            return migrated;
          }
        } catch (e) {}
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const storedCodes = new Set(parsed.map(p => p.sample_code));
        const missingDefaults = INITIAL_SUBMISSIONS.filter(init => !storedCodes.has(init.sample_code));
        const normalizedParsed = parsed.map(it => normalizeSubmission(it)).filter(Boolean);
        const merged = [...normalizedParsed, ...missingDefaults];
        return merged;
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
    const normalized = normalizeSubmission(submission);
    const updated = [normalized, ...current];
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return [submission, ...INITIAL_SUBMISSIONS];
  }
}

export function resetStoredSubmissions() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(INITIAL_SUBMISSIONS));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {}
  return INITIAL_SUBMISSIONS;
}

