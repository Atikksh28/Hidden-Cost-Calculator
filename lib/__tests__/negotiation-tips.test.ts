import { describe, it, expect } from 'vitest'
import { getNegotiationTips } from '../negotiation-tips'
import type { PropertyWithBreakdown } from '../breakdown'

function make(
  over: Partial<PropertyWithBreakdown> = {},
  b: Partial<PropertyWithBreakdown['trueCostBreakdown']> = {}
): PropertyWithBreakdown {
  return {
    rent: 30000,
    deposit: 0,
    brokerage: 0,
    furnishing: 0,
    moving: 0,
    registration: 0,
    stayMonths: 12,
    costPerKm: 8,
    totalMonthly: 35000,
    trueCostBreakdown: {
      rent: 30000,
      maintenance: 0,
      parking: 0,
      amortizedOneTime: 0,
      depositOpportunityCost: 0,
      commuteCost: 0,
      utilities: 0,
      repairBuffer: 2400,
      ...b,
    },
    ...over,
  } as PropertyWithBreakdown
}

describe('getNegotiationTips', () => {
  it('omits levers that cost nothing', () => {
    expect(getNegotiationTips(make()).map((t) => t.id)).toEqual(['rent'])
  })

  it('includes parking only when charged, ranked by saving', () => {
    const tips = getNegotiationTips(make({}, { parking: 5000, maintenance: 4000 }))
    expect(tips.map((t) => t.id)).toEqual(['parking', 'rent', 'maintenance'])
  })

  it('suggests a lower deposit only when above two months of rent', () => {
    expect(getNegotiationTips(make({ deposit: 60000 })).some((t) => t.id === 'deposit')).toBe(false)
    const tip = getNegotiationTips(make({ deposit: 180000 })).find((t) => t.id === 'deposit')
    expect(tip?.monthlySaving).toBeCloseTo(120000 * 0.005)
  })

  it('caps at four tips', () => {
    const tips = getNegotiationTips(
      make({ brokerage: 60000, registration: 3000, deposit: 300000, moving: 5000 }, { parking: 3000, maintenance: 4000, utilities: 3000 })
    )
    expect(tips.length).toBe(4)
  })
})
