import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { AdminSample } from '../utils/admin-types'
import { useSampleFilters } from './useSampleFilters'

const makeSample = (sample_code: string, collection_time: string, created_at = collection_time): AdminSample => ({
  sample_code,
  station_name: `จุดตรวจ ${sample_code}`,
  latitude: 20.058,
  longitude: 99.361,
  arsenic_ppb: 100,
  collection_time,
  created_at,
  publication_status: 'pending_review',
  private_photo_paths: [],
})

describe('useSampleFilters', () => {
  it('sorts newest first by default and flips to oldest first via toggleTimeOrder', async () => {
    const samples = ref<AdminSample[]>([
      makeSample('KOK-MID', '2026-11-01T00:08:00.000Z'),
      makeSample('KOK-OLD', '2026-10-31T23:25:00.000Z'),
      makeSample('KOK-NEW', '2026-11-22T20:50:00.000Z'),
    ])

    const { timeOrder, toggleTimeOrder, filtered, page } = useSampleFilters(samples)
    expect(timeOrder.value).toBe('desc')
    expect(filtered.value.map((s) => s.sample_code)).toEqual(['KOK-NEW', 'KOK-MID', 'KOK-OLD'])

    page.value = 2
    toggleTimeOrder()
    await nextTick()
    expect(timeOrder.value).toBe('asc')
    expect(filtered.value.map((s) => s.sample_code)).toEqual(['KOK-OLD', 'KOK-MID', 'KOK-NEW'])
    expect(page.value).toBe(1)
  })
})
