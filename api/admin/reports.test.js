// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getReportsAnalytics } from './_reports_db.js'
import { getDb } from '../surveys/_db.js'

vi.mock('../surveys/_db.js', () => ({ getDb: vi.fn() }))

const sample = (ppb, isoDate, source = 'แม่น้ำ', lat = 20.058, lon = 99.361) => ({
  sample_code: `KOK-${isoDate.slice(0, 10)}-${Math.round(ppb)}`,
  station_name: 'จุดตรวจ บ้านท่าตอน',
  arsenic_ppb: ppb,
  latitude: lat,
  longitude: lon,
  collection_time: new Date(isoDate),
  sample_nature: { water_source: source },
})

const dbWith = (samples) => {
  getDb.mockResolvedValue({
    collection: () => ({ find: () => ({ toArray: async () => samples }) }),
  })
}

afterEach(() => vi.clearAllMocks())

describe('research report statistics', () => {
  it('counts months from the samples themselves and invents none', async () => {
    const now = Date.now()
    const thisMonth = new Date(now).toISOString()
    const lastMonth = new Date(now - 32 * 24 * 3600_000).toISOString()
    dbWith([sample(4, thisMonth), sample(30, thisMonth), sample(6, lastMonth)])

    const report = await getReportsAnalytics({}, { communityId: 'thaton', period: 'all' })
    expect(report.monthlyTrends).toHaveLength(2)
    expect(report.monthlyTrends.reduce((sum, item) => sum + item.samples, 0)).toBe(3)
    // nothing claims a flood level or a month with no sample behind it
    for (const month of report.monthlyTrends) {
      expect(month).not.toHaveProperty('floodLevel')
      expect(month.samples).toBeGreaterThan(0)
    }
  })

  it('grades samples on the 10 ppb limit, the same as the public map', async () => {
    dbWith([sample(4, new Date().toISOString()), sample(7, new Date().toISOString()), sample(30, new Date().toISOString())])
    const report = await getReportsAnalytics({}, { communityId: 'thaton', period: 'all' })
    expect({ safe: report.safe, watch: report.watch, critical: report.critical }).toEqual({ safe: 1, watch: 1, critical: 1 })
    expect(report.waterSources[0].status).toBeDefined()
  })

  it('labels a water source above the limit as over, never as safe', async () => {
    dbWith([sample(30, new Date().toISOString(), 'ประปา'), sample(30, new Date().toISOString(), 'ประปา')])
    const report = await getReportsAnalytics({}, { communityId: 'thaton', period: 'all' })
    expect(report.waterSources).toEqual([{ name: 'ประปา', samples: 2, avgPpb: 30, status: 'เกินเกณฑ์' }])
  })

  it('returns an empty report instead of a modelled one when there is nothing to report', async () => {
    dbWith([])
    const report = await getReportsAnalytics({}, { communityId: 'pongkhong', period: '3m' })
    expect({ total: report.total, isRealData: report.isRealData }).toEqual({ total: 0, isRealData: false })
    expect(report.monthlyTrends).toEqual([])
    expect(report.waterSources).toEqual([])
    expect(report.emptyReason).toContain('ยังไม่มีผลตรวจ')
  })

  it('counts re-inspected places, instead of a share of the total', async () => {
    const iso = new Date().toISOString()
    dbWith([sample(5, iso, 'แม่น้ำ', 20.058, 99.361), sample(9, iso, 'แม่น้ำ', 20.058, 99.361), sample(5, iso, 'บ่อ', 20.062, 99.366)])
    const report = await getReportsAnalytics({}, { communityId: 'thaton', period: 'all' })
    expect(report.reInspectedCount).toBe(1)
  })
})
