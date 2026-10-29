import { describe, it, expect } from 'vitest'
import { checkProperty, parseStoredProperties, inRangeOrNull, MAX_LOCAL_PROPERTIES } from '../validate-property'

const breakdown = {
  rent: 1, maintenance: 0, parking: 0, amortizedOneTime: 0,
  depositOpportunityCost: 0, commuteCost: 0, utilities: 0, repairBuffer: 0,
}

function rent(over: Record<string, unknown> = {}) {
  return {
    id: 'custom-1', name: 'Flat', location: 'Pune', type: 'Rent', rent: 20000, maintenance: 1000, parking: 0,
    commute: null, schoolTransport: null, furnishing: 0, repairs: null, additionalCharges: null, registration: 0,
    totalMonthly: 25000, deposit: 40000, brokerage: 0, moving: 0, utilities: 0, costPerPerson: 25000,
    trueCostBreakdown: breakdown, stayMonths: 12, costPerKm: 8, commuteDistanceKm: 5, numberOfPeople: 1,
    carpetAreaSqft: null, bhk: 2, ...over,
  }
}

describe('checkProperty', () => {
  it('accepts a valid Rent property', () => {
    expect(checkProperty(rent()).ok).toBe(true)
  })
  it.each([
    ['NaN rent', { rent: NaN }],
    ['Infinity', { totalMonthly: Infinity }],
    ['negative maintenance', { maintenance: -1 }],
    ['rent over 1 crore', { rent: 10_000_001 }],
    ['stayMonths 0', { stayMonths: 0 }],
    ['stayMonths 121', { stayMonths: 121 }],
    ['people 21', { numberOfPeople: 21 }],
    ['commute 501km', { commuteDistanceKm: 501 }],
    ['long name', { name: 'x'.repeat(101) }],
    ['bad type', { type: 'Buy' }],
    ['bad id', { id: '../x' }],
    ['string number', { rent: '20000' }],
    ['missing breakdown', { trueCostBreakdown: null }],
  ])('rejects %s', (_label, over) => {
    expect(checkProperty(rent(over)).ok).toBe(false)
  })
  it('copies only known fields (no prototype pollution, no extras)', () => {
    const raw = JSON.parse('{"__proto__":{"polluted":true},"extra":"x"}')
    const result = checkProperty({ ...rent(), ...raw, constructor: 'x' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).not.toContain('extra')
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    }
  })
})

describe('parseStoredProperties', () => {
  it('drops invalid entries and non-arrays', () => {
    expect(parseStoredProperties('nope')).toEqual([])
    expect(parseStoredProperties([rent(), { id: 'x' }, null, 5]).length).toBe(1)
  })
  it('drops duplicate ids and caps the count', () => {
    const many = Array.from({ length: 40 }, (_, i) => rent({ id: `custom-${i}` }))
    expect(parseStoredProperties(many).length).toBe(MAX_LOCAL_PROPERTIES)
    expect(parseStoredProperties([rent(), rent()]).length).toBe(1)
  })
})

describe('inRangeOrNull', () => {
  it('nulls out-of-range and non-finite values', () => {
    expect(inRangeOrNull(5, 0, 10)).toBe(5)
    expect(inRangeOrNull(-1, 0, 10)).toBeNull()
    expect(inRangeOrNull(NaN, 0, 10)).toBeNull()
    expect(inRangeOrNull('5', 0, 10)).toBeNull()
  })
})
