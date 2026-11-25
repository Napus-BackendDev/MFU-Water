import { describe, expect, it } from 'vitest'
import { COMMUNITY_CENTERS, communityIdOfPoint } from './community-centers'
import { communityOfPoint } from './community-of-point'
import { communityTargets } from '../../app/utils/kok-contract'

describe('server-side community centres', () => {
  it('match the centres the screens use, so a sample is in the same village on both sides', () => {
    for (const target of communityTargets) expect(COMMUNITY_CENTERS[target.id]).toEqual(target.center)
  })

  it('give the same village as the screens for points near and far from each centre', () => {
    const points: Array<[number, number]> = [[20.0595, 99.364], [19.96, 99.71], [20.31, 100.21], [20.2, 100.45], [18.5, 98.9], [20.2, 100.3]]
    for (const [lat, lon] of points) expect(communityIdOfPoint(lat, lon)).toBe(communityOfPoint(lat, lon, communityTargets)?.id)
  })
})
