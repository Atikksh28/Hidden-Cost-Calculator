import { describe, it, expect } from 'vitest'
import { buildSummaryPdf, pdfSafe, summaryFileName } from '../pdf-summary'
import type { PropertyWithBreakdown } from '../breakdown'

const property = {
  id: 'custom-1', name: 'Sunrise <b>Heights</b> ₹ — Baner', location: 'Pune', type: 'Rent',
  rent: 40000, maintenance: 5000, parking: 4000, deposit: 200000, brokerage: 40000, furnishing: 0, moving: 5000,
  registration: 2000, utilities: 3000, stayMonths: 12, costPerKm: 8, commuteDistanceKm: 10, numberOfPeople: 2,
  totalMonthly: 64000, costPerPerson: 32000,
  trueCostBreakdown: { rent: 40000, maintenance: 5000, parking: 4000, amortizedOneTime: 3917, depositOpportunityCost: 1000, commuteCost: 3520, utilities: 3000, repairBuffer: 3200 },
} as PropertyWithBreakdown

describe('pdfSafe', () => {
  it('replaces the rupee sign and dashes, drops unsupported characters', () => {
    expect(pdfSafe('₹1,000 — fine')).toBe('Rs. 1,000 - fine')
    expect(pdfSafe('a😀b\u0000c')).toBe('abc')
  })
})

describe('summaryFileName', () => {
  it('is filesystem-safe', () => {
    expect(summaryFileName('Flat A/B: "Baner"?')).toBe('true-cost-summary-Flat-AB-Baner.pdf')
    expect(summaryFileName('../../etc')).toBe('true-cost-summary-etc.pdf')
    expect(summaryFileName('😀')).toBe('true-cost-summary-property.pdf')
  })
})

describe('buildSummaryPdf', () => {
  it('builds a valid PDF with the key numbers', async () => {
    const doc = await buildSummaryPdf({
      property, status: 'Stretch', affordabilityRanges: { safe: 45000, stretch: 60000 },
      generatedAt: new Date('2026-10-30T00:00:00Z'),
    })
    const bytes = new Uint8Array(doc.output('arraybuffer'))
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    const raw = doc.output()
    expect(raw).toContain('64,000')
  })
  it('works without affordability data', async () => {
    const doc = await buildSummaryPdf({ property, status: null })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
