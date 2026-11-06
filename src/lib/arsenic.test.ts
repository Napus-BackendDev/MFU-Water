import { describe, expect, it } from 'vitest'
import { ARSENIC_LIMIT_PPB, arsenicLevel, arsenicLevelMeta, needsAdminReview } from './arsenic'
import { arsenicSeverity, getArsenicMeta } from '../../app/utils/admin-types'
import { ppbTone } from '../../app/utils/chemical-popup'

describe('one arsenic scale for the whole system', () => {
  it('uses the 10 ppb surface-water limit as the line between watch and over', () => {
    expect(ARSENIC_LIMIT_PPB).toBe(10)
    expect([0, 4.9, 5, 9, 10, 10.1, 30, 500].map(arsenicLevel))
      .toEqual(['normal', 'normal', 'watch', 'watch', 'watch', 'over', 'over', 'over'])
  })

  it('never calls water above the limit safe, on any screen', () => {
    for (const ppb of [11, 30, 50, 100]) {
      expect(arsenicLevel(ppb)).toBe('over')
      expect(ppbTone(ppb)).toBe('danger')
      expect(arsenicSeverity(ppb)).toBe('over')
      expect(getArsenicMeta(ppb).action).not.toContain('ปกติ')
    }
  })

  it('keeps the publishing rule separate from the health scale', () => {
    // 30 ppb publishes without review but is still over the limit for a reader.
    expect(needsAdminReview(30)).toBe(false)
    expect(arsenicLevel(30)).toBe('over')
    expect(needsAdminReview(100)).toBe(true)
  })

  it('labels every level in Thai with the limit named in the note', () => {
    expect(arsenicLevelMeta.over.note).toContain('10 ppb')
    for (const level of ['normal', 'watch', 'over'] as const) {
      expect(arsenicLevelMeta[level].label.trim().length).toBeGreaterThan(1)
      expect(arsenicLevelMeta[level].hex).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})
