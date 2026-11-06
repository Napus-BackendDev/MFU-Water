import { arsenicLevel, arsenicLevelMeta } from '../../src/lib/arsenic.js'
import { getDb } from '../surveys/_db.js'

const communityCenters = {
  thaton: [20.058, 99.361],
  ruammit: [19.952, 99.735],
  pongkhong: [20.308, 100.210],
  pakingtai: [20.258, 100.415],
}

const communityKeywords = {
  thaton: ['ท่าตอน', 'แม่อาย'],
  ruammit: ['รวมมิตร', 'กะเหรี่ยง'],
  pongkhong: ['ปงของ'],
  pakingtai: ['ปากอิง', 'เชียงของ'],
}

const periods = {
  '1m': { days: 30, label: '30 วันล่าสุด' },
  '3m': { days: 90, label: '90 วันล่าสุด' },
  '6m': { days: 180, label: '180 วันล่าสุด' },
  all: { days: null, label: 'ข้อมูลทั้งหมด' },
}

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

const sampleDate = (sample) => {
  const value = sample.collection_time ?? sample.created_at
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const average = (values) => (values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0)

const emptyReport = (rangeLabel, reason) => ({
  total: 0,
  safe: 0,
  watch: 0,
  critical: 0,
  safePct: '0.0',
  watchPct: '0.0',
  criticalPct: '0.0',
  avgPpb: 0,
  reInspectedCount: 0,
  waterSources: [],
  monthlyTrends: [],
  rangeLabel,
  emptyReason: reason,
  isRealData: false,
})

/**
 * Statistics for the research report page. Every number here is counted from the samples that are
 * actually stored; nothing is modelled, estimated or filled in from a baseline. When a community has
 * no samples in the chosen window the report comes back empty and says so, because a research report
 * that invents figures is worse than one that shows none.
 */
export async function getReportsAnalytics(settings, { communityId = 'thaton', period = '3m' } = {}) {
  const db = await getDb(settings)
  const window = periods[period] ?? periods['3m']
  const rangeLabel = window.label

  // collection_time is stored as a BSON date, so the bound has to be a Date, not an ISO string.
  const since = window.days ? new Date(Date.now() - window.days * 24 * 60 * 60 * 1000) : null
  const query = since ? { $or: [{ collection_time: { $gte: since } }, { collection_time: null, created_at: { $gte: since } }] } : {}
  const rawSamples = await db.collection('kok_water_samples').find(query).toArray()

  const keywords = communityKeywords[communityId] ?? []
  const center = communityCenters[communityId] ?? communityCenters.thaton
  const samples = rawSamples.filter((sample) => {
    if (keywords.some((keyword) => sample.station_name && new RegExp(keyword, 'i').test(sample.station_name))) return true
    if (typeof sample.latitude === 'number' && typeof sample.longitude === 'number') {
      return distanceKm([sample.latitude, sample.longitude], center) <= 15
    }
    return false
  })

  if (!samples.length) {
    return emptyReport(rangeLabel, `ยังไม่มีผลตรวจของชุมชนนี้ใน${rangeLabel}`)
  }

  const total = samples.length
  let safe = 0
  let watch = 0
  let critical = 0
  const ppbValues = []
  const sourceMap = new Map()
  const monthMap = new Map()
  const placeMap = new Map()

  for (const sample of samples) {
    const ppb = Number(sample.arsenic_ppb) || 0
    ppbValues.push(ppb)
    const level = arsenicLevel(ppb)
    if (level === 'over') critical += 1
    else if (level === 'watch') watch += 1
    else safe += 1

    const sourceName = sample.sample_nature?.water_source || 'ไม่ระบุแหล่งน้ำ'
    if (!sourceMap.has(sourceName)) sourceMap.set(sourceName, [])
    sourceMap.get(sourceName).push(ppb)

    const date = sampleDate(sample)
    if (date) {
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, month: `${thaiMonths[date.getMonth()]} ${String((date.getFullYear() + 543) % 100).padStart(2, '0')}`, ppb: [] })
      }
      monthMap.get(key).ppb.push(ppb)
    }

    // A place counts as re-inspected when more than one round was collected within about 100 m.
    if (typeof sample.latitude === 'number' && typeof sample.longitude === 'number') {
      const placeKey = `${sample.latitude.toFixed(3)},${sample.longitude.toFixed(3)}`
      placeMap.set(placeKey, (placeMap.get(placeKey) ?? 0) + 1)
    }
  }

  const waterSources = [...sourceMap.entries()]
    .map(([name, values]) => {
      const avgPpb = average(values)
      return { name, samples: values.length, avgPpb, status: arsenicLevelMeta[arsenicLevel(avgPpb)].label }
    })
    .sort((a, b) => b.samples - a.samples)

  const monthlyTrends = [...monthMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => ({ month: entry.month, avgPpb: average(entry.ppb), samples: entry.ppb.length }))

  const reInspectedCount = [...placeMap.values()].filter((count) => count > 1).length

  return {
    total,
    safe,
    watch,
    critical,
    safePct: ((safe / total) * 100).toFixed(1),
    watchPct: ((watch / total) * 100).toFixed(1),
    criticalPct: ((critical / total) * 100).toFixed(1),
    avgPpb: average(ppbValues),
    reInspectedCount,
    waterSources,
    monthlyTrends,
    rangeLabel,
    isRealData: true,
  }
}
