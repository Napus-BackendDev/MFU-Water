const MODES = new Set(['s2-rgb', 'ndwi', 'mndwi', 's1-water', 's1-change', 'occurrence']);

function parseDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${field} ต้องเป็น YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} ไม่ใช่วันที่ที่ถูกต้อง`);
  }
  return date;
}

function parsePeriod(start, end, label) {
  const first = parseDate(start, `${label} start`);
  const last = parseDate(end, `${label} end`);
  const days = (last - first) / 86400000;
  if (days < 0 || days > 180) throw new Error(`${label} ต้องยาว 1–181 วันและเรียงวันที่ถูกต้อง`);
  return {
    start,
    end,
    endExclusive: new Date(last.getTime() + 86400000).toISOString().slice(0, 10)
  };
}

export function parseGeeAnalysisQuery(query) {
  const mode = String(query.mode || 's2-rgb');
  if (!MODES.has(mode)) throw new Error('รูปแบบการวิเคราะห์ไม่รองรับ');

  const bbox = String(query.bbox || '').split(',').map(Number);
  if (bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    throw new Error('bbox ต้องเป็น west,south,east,north');
  }
  const [west, south, east, north] = bbox;
  if (west < 97 || east > 102 || south < 17 || north > 22 || west >= east || south >= north || east - west > 3 || north - south > 2) {
    throw new Error('กรุณาซูมเข้าในบริเวณลุ่มน้ำกกก่อนวิเคราะห์ (พื้นที่กว้างเกินไปหรืออยู่นอกขอบเขต)');
  }

  const threshold = query.threshold === undefined ? 0.1 : Number(query.threshold);
  if (!Number.isFinite(threshold) || threshold < -0.5 || threshold > 0.8) {
    throw new Error('threshold ต้องอยู่ระหว่าง -0.5 ถึง 0.8');
  }
  const cloud = query.cloud === undefined ? 70 : Number(query.cloud);
  if (!Number.isFinite(cloud) || cloud < 0 || cloud > 100) throw new Error('cloud ต้องอยู่ระหว่าง 0 ถึง 100');
  const orbit = String(query.orbit || 'DESCENDING');
  if (!['ASCENDING', 'DESCENDING'].includes(orbit)) throw new Error('orbit ไม่ถูกต้อง');

  const period = mode === 'occurrence' ? null : parsePeriod(query.start, query.end, 'ช่วงวิเคราะห์');
  const baseline = mode === 's1-change' ? parsePeriod(query.baselineStart, query.baselineEnd, 'ช่วงก่อนเหตุการณ์') : null;
  return { mode, bbox, threshold, cloud, orbit, period, baseline };
}

const evaluate = (object) => new Promise((resolve, reject) => {
  object.evaluate((value, error) => error ? reject(new Error(String(error))) : resolve(value));
});

const getMap = (image, vis) => new Promise((resolve, reject) => {
  image.getMapId(vis, (map, error) => {
    if (error) reject(new Error(String(error)));
    else if (!map?.urlFormat) reject(new Error('GEE ไม่คืน URL ของชั้นแผนที่'));
    else resolve(map.urlFormat);
  });
});

export async function analyzeGeeWater(ee, params) {
  const { mode, bbox, threshold, cloud, orbit, period, baseline } = params;
  const roi = ee.Geometry.Rectangle(bbox);
  let collection;
  let dataset;
  let image;
  let waterMask = null;
  let validMask;
  let visualization;
  let scaleMeters;
  let method;
  let baselineCount = null;
  let imageCount = null;

  const rawSentinel2 = (dates) => ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(roi)
    .filterDate(dates.start, dates.endExclusive)
    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', cloud));
  const sentinel2 = (dates) => rawSentinel2(dates)
    .map((scene) => {
      const scl = scene.select('SCL');
      const clear = scl.neq(0).and(scl.neq(1)).and(scl.neq(3))
        .and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
      return scene.updateMask(clear);
    });
  const sentinel1 = (dates) => ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(roi)
    .filterDate(dates.start, dates.endExclusive)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.eq('orbitProperties_pass', orbit))
    .select('VV');

  if (mode === 'occurrence') {
    dataset = 'JRC/GSW1_4/GlobalSurfaceWater';
    collection = null;
    const occurrence = ee.Image(dataset).select('occurrence');
    image = occurrence.updateMask(occurrence.gt(0));
    waterMask = occurrence.gte(50);
    validMask = occurrence.mask();
    visualization = { min: 1, max: 100, palette: ['#7dd3fc', '#0284c7', '#0c4a6e'] };
    scaleMeters = 30;
    method = 'JRC historical water occurrence; area counts pixels with occurrence ≥ 50% (1984–2021)';
  } else if (mode.startsWith('s1-')) {
    dataset = 'COPERNICUS/S1_GRD';
    collection = sentinel1(period);
    imageCount = await evaluate(collection.size());
    if (!imageCount) throw Object.assign(new Error('ไม่พบภาพ Sentinel-1 ในช่วงวันที่และวงโคจรนี้'), { status: 404 });
    const vv = collection.median();
    const sarThreshold = -17;
    if (mode === 's1-change') {
      const before = sentinel1(baseline);
      baselineCount = await evaluate(before.size());
      if (!baselineCount) throw Object.assign(new Error('ไม่พบภาพ Sentinel-1 ในช่วงก่อนเหตุการณ์และวงโคจรนี้'), { status: 404 });
      const beforeVV = before.median();
      waterMask = vv.lt(sarThreshold).and(beforeVV.gte(sarThreshold));
      validMask = vv.mask().and(beforeVV.mask());
      method = 'Sentinel-1 VV candidate new water: after < -17 dB and before ≥ -17 dB; matched orbit pass';
    } else {
      waterMask = vv.lt(sarThreshold);
      validMask = vv.mask();
      method = 'Sentinel-1 VV candidate water: backscatter < -17 dB; terrain shadow can be misclassified';
    }
    image = waterMask.selfMask();
    visualization = { min: 0, max: 1, palette: mode === 's1-change' ? ['#f97316'] : ['#38bdf8'] };
    scaleMeters = 30;
  } else {
    dataset = 'COPERNICUS/S2_SR_HARMONIZED';
    collection = sentinel2(period);
    imageCount = await evaluate(collection.size());
    if (!imageCount) throw Object.assign(new Error('ไม่พบภาพ Sentinel-2 ในช่วงวันที่นี้ ลองขยายช่วงวันหรือเพิ่มเกณฑ์เมฆ'), { status: 404 });
    const composite = collection.median();
    validMask = composite.select('B3').mask();
    if (mode === 's2-rgb') {
      image = composite.unmask(rawSentinel2(period).median()).select(['B4', 'B3', 'B2']);
      visualization = { bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.1 };
      scaleMeters = 20;
      method = 'Sentinel-2 surface reflectance; SCL clear pixels for area; visual gaps filled from raw median composite';
    } else {
      const bands = mode === 'mndwi' ? ['B3', 'B11'] : ['B3', 'B8'];
      const index = composite.normalizedDifference(bands);
      waterMask = index.gt(threshold);
      if (mode === 'mndwi') {
        const ndvi = composite.normalizedDifference(['B8', 'B4']);
        waterMask = waterMask.and(ndvi.lt(0.2));
      }
      image = index;
      visualization = { min: -0.5, max: 0.7, palette: ['#92400e', '#cbd5e1', '#38bdf8', '#075985'] };
      scaleMeters = mode === 'mndwi' ? 20 : 10;
      method = mode === 'mndwi'
        ? `MNDWI=(B3-B11)/(B3+B11) > ${threshold}; NDVI < 0.2; SCL cloud mask`
        : `NDWI=(B3-B8)/(B3+B8) > ${threshold}; SCL cloud mask`;
    }
  }

  const tileUrl = await getMap(image, visualization);
  let baseTileUrl = null;
  if (mode !== 's2-rgb') {
    const basePeriod = period || {
      start: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
      endExclusive: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    };
    const baseCollection = mode === 'ndwi' || mode === 'mndwi' ? collection : sentinel2(basePeriod);
    try {
      if (await evaluate(baseCollection.size())) {
        const baseImage = baseCollection.median()
          .unmask(rawSentinel2(basePeriod).median()).select(['B4', 'B3', 'B2']);
        baseTileUrl = await getMap(baseImage, {
          bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.1
        });
      }
    } catch {
      // Analysis remains available when a cloud-free optical backdrop is unavailable.
    }
  }
  const area = ee.Image.pixelArea();
  const areaBands = waterMask
    ? area.updateMask(waterMask).rename('waterArea').addBands(area.updateMask(validMask).rename('observedArea'))
    : area.updateMask(validMask).rename('observedArea');
  let metrics = null;
  let metricError = null;
  try {
    const values = await evaluate(areaBands.reduceRegion({
      reducer: ee.Reducer.sum(), geometry: roi, scale: scaleMeters,
      bestEffort: true, maxPixels: 1e8, tileScale: 2
    }));
    metrics = {
      waterAreaKm2: waterMask ? Number(((values?.waterArea || 0) / 1e6).toFixed(3)) : null,
      observedAreaKm2: Number(((values?.observedArea || 0) / 1e6).toFixed(3)),
      scaleMeters
    };
  } catch (error) {
    metricError = 'คำนวณพื้นที่ไม่ได้ แต่ชั้นภาพยังแสดงได้';
  }

  return {
    tileUrl, baseTileUrl, bbox, mode, metrics, metricError,
    provenance: {
      dataset, imageCount, baselineImageCount: baselineCount,
      period: period ? { start: period.start, end: period.end } : null,
      baseline: baseline ? { start: baseline.start, end: baseline.end } : null,
      cloudLimitPercent: mode.startsWith('s2-') || mode === 'ndwi' || mode === 'mndwi' ? cloud : null,
      orbit: mode.startsWith('s1-') ? orbit : null,
      method
    }
  };
}
