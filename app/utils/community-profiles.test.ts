import { describe, expect, it } from 'vitest'
import { communityTargets } from './kok-contract'
import { communityProfiles } from './community-profiles'

describe('community profiles', () => {
  it('has a complete profile for every target community', () => {
    expect(Object.keys(communityProfiles).sort()).toEqual(communityTargets.map((target) => target.id).sort())
    for (const profile of Object.values(communityProfiles)) {
      for (const text of [profile.title, profile.basin, profile.people, profile.livelihood, profile.risk]) expect(text.trim().length).toBeGreaterThan(3)
    }
  })

  it('names each community the way the target list does', () => {
    for (const target of communityTargets) expect(communityProfiles[target.id].title).toBe(`บ้าน${target.name}`)
  })
})
