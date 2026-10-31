import { describe, expect, it } from 'vitest'
import { communityOfPoint } from './community-of-point'

const places = [
  { id: 'thaton', center: [20.058, 99.361] as [number, number] },
  { id: 'ruammit', center: [19.9605, 99.7082] as [number, number] },
  { id: 'pongkhong', center: [20.3076, 100.2102] as [number, number] },
]

describe('communityOfPoint', () => {
  it('picks the nearest community centre', () => {
    expect(communityOfPoint(20.06, 99.36, places)?.id).toBe('thaton')
    expect(communityOfPoint(19.96, 99.71, places)?.id).toBe('ruammit')
    expect(communityOfPoint(20.3, 100.2, places)?.id).toBe('pongkhong')
  })

  it('returns undefined for points outside every village', () => {
    expect(communityOfPoint(20.047, 99.892, places)).toBeUndefined()
  })

  it('returns undefined without communities', () => {
    expect(communityOfPoint(20, 99, [])).toBeUndefined()
  })
})
