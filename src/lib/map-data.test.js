// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  COMMUNITY_LAYERS,
  FIELD_OPTIONS,
  LEVEL_DEFS,
  MEMBERS_FIELD,
  buildCommunityReview,
  classifyHousehold,
  classifyLayer,
  evacuationDestinations,
  householdFields,
  hamletCounts,
  levelGroups,
  metaFromReview,
  publicHamletSummary,
  publicPlaces,
  seedFromReview,
  suggestHamletMerges,
  validateHamlet,
  validateHousehold,
  validatePlace,
  validateProfile,
  validateRoutes,
} from './map-data.js'

// ไฟล์ข้อมูลชุมชนต้นทาง (อาจถูกย้ายไป data/private เมื่อปิดข้อมูลรายบ้านจากสาธารณะ)
const seedPath = ['../../data/private/thaton.json', '../../public/mymaps/thaton.json'].map((path) => new URL(path, import.meta.url)).find((url) => existsSync(url))
const original = JSON.parse(readFileSync(seedPath, 'utf8'))
const seed = seedFromReview(original)
const meta = metaFromReview(original)
const rebuild = (overrides = {}) => buildCommunityReview({ households: seed.households, hamlets: seed.hamlets, meta, ...overrides })

describe('seed from the original My Maps file', () => {
  it('turns 6 aligned layers into one document per household', () => {
    expect(seed.households).toHaveLength(129)
    expect(seed.households[0].id).toBe('MM1-001')
    expect(seed.households.at(-1).id).toBe('MM1-129')
    expect(Object.keys(seed.households[0].answers)).toHaveLength(Object.keys(FIELD_OPTIONS).length + 1)
  })

  it('keeps every answer inside the option lists the admin form offers', () => {
    for (const household of seed.households) {
      for (const { key, options } of householdFields()) expect(options, `${household.id} ${key}`).toContain(household.answers[key])
    }
  })
})

describe('classification parity with the file the public map reads today', () => {
  it('recomputes the level and colour of all 774 rows exactly', () => {
    let checked = 0
    original.layers.forEach((layerData, index) => {
      const layer = COMMUNITY_LAYERS[index]
      expect(layer.id).toBe(layerData.id)
      layerData.records.forEach((record, row) => {
        const level = classifyLayer(layer, seed.households[row].answers)
        expect({ id: record.id, status: level.label, color: level.color }).toEqual({ id: record.id, status: record.status, color: record.color })
        checked += 1
      })
    })
    expect(checked).toBe(774)
  })

  it('rebuilds the public payload so that every layer, record and legend equals the file', () => {
    const review = rebuild()
    expect(review.sourceRowsPerLayer).toBe(original.sourceRowsPerLayer)
    expect(review.distinctCoordinates).toBe(original.distinctCoordinates)
    expect(review.layers.map((layer) => layer.id)).toEqual(original.layers.map((layer) => layer.id))
    review.layers.forEach((layer, index) => {
      const source = original.layers[index]
      expect(layer.label).toBe(source.label)
      expect(layer.records).toEqual(source.records)
      expect(layer.legend).toEqual(source.legend)
    })
  })

  it('has the same level counts for the evacuation layer as the legend', () => {
    expect(Object.fromEntries(levelGroups(seed.households).map((group) => [group.key, group.count]))).toEqual({ 1: 4, 2: 8, 4: 56, 5: 61 })
    expect(LEVEL_DEFS['layer-1'].map((def) => def.key)).toEqual(['1', '2', '4', '5'])
  })
})

describe('editing a household updates what the public sees, in every layer', () => {
  it('re-levels the edited household and leaves the rest untouched', () => {
    const target = seed.households.find((household) => classifyHousehold(household.answers)['layer-1'].key === '5')
    const edited = { ...target, answers: { ...target.answers, [MEMBERS_FIELD]: 2, 'ประวัติน้ำท่วมบ้าน': 'เคยท่วมบ้าน' } }
    const review = buildCommunityReview({ households: seed.households.map((household) => (household.id === target.id ? edited : household)), hamlets: seed.hamlets, meta })
    const record = review.layers[0].records.find((row) => row.id === target.id)
    expect(record.status).toBe(LEVEL_DEFS['layer-1'][0].label)
    expect(record.fields[MEMBERS_FIELD]).toBe('2.0')
    expect(review.layers[0].legend.find((entry) => entry.label === LEVEL_DEFS['layer-1'][0].label).rows).toBe(5)
    expect(review.layers[1].records).toEqual(rebuild().layers[1].records)
  })

  it('hides unpublished households and hidden layers from the public payload', () => {
    const households = seed.households.map((household, index) => (index === 0 ? { ...household, published: false } : household))
    const review = buildCommunityReview({ households, hamlets: seed.hamlets, meta, hiddenLayers: ['layer-5'] })
    expect(review.sourceRowsPerLayer).toBe(128)
    expect(review.layers.map((layer) => layer.id)).not.toContain('layer-5')
    expect(review.layers[0].records.some((record) => record.id === 'MM1-001')).toBe(false)
  })

  it('shows only totals when household points are made private', () => {
    const review = rebuild({ pointsPublic: false })
    expect(review.layers.every((layer) => layer.records.length === 0 && layer.rowCount === 129)).toBe(true)
    expect(review.layers[0].legend).toEqual(original.layers[0].legend)
  })
})

describe('household validation', () => {
  const valid = () => ({ latitude: 20.058, longitude: 99.355, hamlet_id: seed.hamlets[0].id, answers: { ...seed.households[0].answers } })
  const options = { hamletIds: new Set(seed.hamlets.map((hamlet) => hamlet.id)) }

  it('accepts a complete household and rounds the coordinates', () => {
    const result = validateHousehold({ ...valid(), latitude: 20.0580004 }, options)
    expect(result.ok).toBe(true)
    expect(result.value.latitude).toBe(20.058)
    expect(result.value.published).toBe(true)
  })

  it('rejects coordinates outside Thailand, unknown options and unknown hamlets', () => {
    const result = validateHousehold({ latitude: 48, longitude: 2, hamlet_id: 'HM-999', answers: { 'ประวัติน้ำท่วมบ้าน': 'บางที' } }, options)
    expect(result.ok).toBe(false)
    const fields = result.errors.map((error) => error.field)
    expect(fields).toEqual(expect.arrayContaining(['latitude', 'hamlet_id', 'ประวัติน้ำท่วมบ้าน']))
  })

  it('asks for required answers on create but allows a partial update', () => {
    expect(validateHousehold({ latitude: 20.05, longitude: 99.35, answers: {} }, options).ok).toBe(false)
    expect(validateHousehold({ answers: { [MEMBERS_FIELD]: 3 } }, { ...options, partial: true })).toEqual({ ok: true, value: { answers: { [MEMBERS_FIELD]: 3 } } })
    expect(validateHousehold({ answers: { [MEMBERS_FIELD]: -1 } }, { ...options, partial: true }).ok).toBe(false)
  })
})

describe('hamlet registry', () => {
  it('suggests merging look-alike names found in the survey', () => {
    expect(suggestHamletMerges(seed.hamlets).some((group) => group.names.includes('บ้านไต') && group.names.includes('หย่อมบ้านไต'))).toBe(true)
  })

  it('counts households per hamlet and keeps the unassigned ones apart', () => {
    const { counts, unassigned } = hamletCounts(seed.households, seed.hamlets)
    expect([...counts.values()].reduce((sum, value) => sum + value, 0) + unassigned).toBe(129)
  })

  it('hides household counts below the privacy threshold on the public summary', () => {
    const summary = publicHamletSummary(seed.households, seed.hamlets)
    for (const row of summary) {
      if (row.households === null) expect(row.householdsLabel).toBe('น้อยกว่า 5 ครัวเรือน')
      else expect(row.households).toBeGreaterThanOrEqual(5)
    }
    expect(publicHamletSummary(seed.households, seed.hamlets.map((hamlet) => ({ ...hamlet, status: 'draft' })))).toEqual([])
  })

  it('rejects a name or alias that another hamlet already uses', () => {
    const others = [{ id: 'HM-001', name: 'บ้านไต', aliases: ['หย่อมบ้านไต'] }]
    expect(validateHamlet({ name: 'หย่อมบ้านไต' }, { others }).ok).toBe(false)
    expect(validateHamlet({ name: 'บ้านใหม่', aliases: ['บ้านไต'] }, { others }).ok).toBe(false)
    expect(validateHamlet({ name: 'บ้านใหม่', aliases: ['ใหม่'] }, { others }).ok).toBe(true)
  })
})

describe('important places follow R24 and R16', () => {
  const base = { name: 'ศาลาประชาคม', kind: 'community_hall' }

  it('accepts a place without coordinates and lists it as waiting to be located', () => {
    const result = validatePlace({ ...base, status: 'published' })
    expect(result.ok).toBe(true)
    expect(result.value.latitude).toBeNull()
    const { placed, pending } = publicPlaces([{ ...result.value, id: 'PL-001' }])
    expect(placed).toEqual([])
    expect(pending[0].precisionLabel).toBe('ยังไม่มีพิกัด รอผูกจุด')
  })

  it('never claims the planned capacity is available today and stores no contact fields', () => {
    const result = validatePlace({ ...base, latitude: 20.05, longitude: 99.35, capacity_planned: 100, phone: '081-234-5678', contact: 'x', status: 'published' })
    expect(result.ok).toBe(true)
    expect(result.value).not.toHaveProperty('phone')
    expect(result.value).not.toHaveProperty('contact')
    const [place] = publicPlaces([{ ...result.value, id: 'PL-002' }]).placed
    expect(place.capacityLabel).toContain('ตามแผน')
    expect(place.capacityLabel).toContain('ยังไม่ยืนยัน')
    expect(place.precisionLabel).toBe('ตำแหน่งประมาณ ยังไม่ยืนยันภาคสนาม')
  })

  it('does not publish drafts and exposes only shelters and assembly points as evacuation destinations', () => {
    const places = [
      { id: 'A', kind: 'shelter', name: 'ศูนย์', latitude: 20.05, longitude: 99.35, status: 'published' },
      { id: 'B', kind: 'assembly', name: 'จุดรวมพล', latitude: 20.04, longitude: 99.36, status: 'draft' },
      { id: 'C', kind: 'temple', name: 'วัด', latitude: 20.06, longitude: 99.36, status: 'published' },
      { id: 'D', kind: 'shelter', name: 'ยังไม่มีพิกัด', latitude: null, longitude: null, status: 'published' },
    ]
    expect(publicPlaces(places).placed.map((place) => place.id)).toEqual(['A', 'C'])
    expect(evacuationDestinations(places)).toEqual([{ id: 'A', kind: 'shelter', label: 'ศูนย์', latitude: 20.05, longitude: 99.35 }])
  })

  it('requires a name, a known kind and a pair of coordinates', () => {
    expect(validatePlace({ name: '', kind: 'x' }).ok).toBe(false)
    expect(validatePlace({ ...base, latitude: 20.05 }).ok).toBe(false)
  })
})

describe('routes and community profile', () => {
  it('validates route lines', () => {
    expect(validateRoutes({ routes: [[[20.05, 99.35], [20.06, 99.36]]] }).ok).toBe(true)
    expect(validateRoutes({ routes: [[[20.05, 99.35]]] }).ok).toBe(false)
    expect(validateRoutes({ routes: [[[20.05, 99.35], [1, 1]]] }).ok).toBe(false)
    expect(validateRoutes({ routes: [] }).ok).toBe(false)
  })

  it('needs all five profile texts for a known community', () => {
    const full = { community_id: 'thaton', title: 'บ้านท่าตอน', basin: 'ก', people: 'ข', livelihood: 'ค', risk: 'ง' }
    expect(validateProfile(full).ok).toBe(true)
    expect(validateProfile({ ...full, risk: '' }).ok).toBe(false)
    expect(validateProfile({ ...full, community_id: 'nowhere' }).ok).toBe(false)
  })
})
