import { describe, expect, it, vi } from 'vitest'
import type { SurveyWaypoint } from '../../src/lib/survey'
import { clusterSurveyWaypoints } from '../../src/lib/waypoints'
import { buildChemicalPopup, ppbTone } from './chemical-popup'

const waypoint = (id: string, ppb: number, extra: Partial<SurveyWaypoint> = {}): SurveyWaypoint => ({
  id,
  sample_code: `KOK-20261101-000${id}`,
  station_name: `จุดตรวจ KOK-20261101-000${id}`,
  arsenic_level_ppb: ppb,
  latitude: 20.05,
  longitude: 99.36,
  gps_accuracy_meters: 5,
  created_at: '2026-11-01T05:00:00.000Z',
  collection_time: '2026-11-01T05:00:00.000Z',
  water_source: 'แม่น้ำ',
  rain_context: 'ไม่ทราบ',
  contributor_label: 'ผู้ตรวจ ก',
  publication_status: 'auto_published',
  ...extra,
} as SurveyWaypoint)

const popupFor = (points: SurveyWaypoint[], onDetail = vi.fn()) => buildChemicalPopup(clusterSurveyWaypoints(points)[0]!, '#E8BE36', onDetail)

describe('chemical point popup', () => {
  it('classifies levels with the app thresholds', () => {
    expect([0, 4, 5, 10, 11, 100].map(ppbTone)).toEqual(['safe', 'safe', 'watch', 'watch', 'danger', 'danger'])
  })

  it('shows one result with its status and the reading guidance', () => {
    const popup = popupFor([waypoint('1', 30)])
    expect(popup.querySelector('h3')?.textContent).toBe('จุดตรวจ KOK-20261101-0001')
    const kpis = [...popup.querySelectorAll('.kok-pop-kpi')].map((box) => box.textContent)
    expect(kpis[0]).toContain('30 ppb')
    expect(kpis[1]).toContain('เกินเกณฑ์')
    expect(popup.textContent).toContain('ไม่ใช่คำรับรองว่าน้ำดื่มได้')
    expect(popup.textContent).toContain('ผู้บันทึก ผู้ตรวจ ก')
  })

  it('shows the range when several tests share a spot', () => {
    const popup = popupFor([waypoint('1', 5), waypoint('2', 50, { created_at: '2026-11-01T06:00:00.000Z' })])
    const kpis = [...popup.querySelectorAll('.kok-pop-kpi')].map((box) => box.textContent)
    expect(kpis[0]).toContain('50 ppb')
    expect(kpis[1]).toContain('5–50')
    expect(popup.querySelector('.kok-pop-sub')?.textContent).toContain('2 ครั้งในบริเวณนี้')
  })

  it('writes names as text, never as HTML', () => {
    const popup = popupFor([waypoint('1', 5, { station_name: '<img src=x onerror=alert(1)>', contributor_label: '<b>x</b>' })])
    expect(popup.querySelector('img')).toBeNull()
    expect(popup.querySelector('h3')?.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('shows level 0 as below 5 ppb and names the test kit', () => {
    const popup = popupFor([waypoint('1', 0, { test_kit: 'Oxfam' })])
    expect(popup.querySelector('.kok-pop-kpi')?.textContent).toContain('< 5 ppb')
    expect(popup.textContent).not.toMatch(/(^|\D)0 ppb/)
    expect(popup.textContent).toContain('ชุดตรวจ: Oxfam')
    const range = popupFor([waypoint('1', 0), waypoint('2', 30, { created_at: '2026-11-01T06:00:00.000Z' })])
    expect(range.querySelectorAll('.kok-pop-kpi')[1]?.textContent).toContain('< 5–30')
  })

  it('opens the details when the button is pressed', () => {
    const onDetail = vi.fn()
    popupFor([waypoint('1', 5)], onDetail).querySelector('button')!.click()
    expect(onDetail).toHaveBeenCalledOnce()
  })
})
