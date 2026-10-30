import { formatIndianCurrency } from './format-indian-currency'
import { BREAKDOWN_LABELS, type PropertyWithBreakdown } from './breakdown'
import { getNegotiationTips } from './negotiation-tips'

export interface SummaryPdfOptions {
  property: PropertyWithBreakdown
  affordabilityRanges?: { safe: number; stretch: number }
  status: 'Safe' | 'Stretch' | 'Risky' | null
  /** Defaults to now; injectable for tests. */
  generatedAt?: Date
}

/**
 * The built-in PDF fonts only cover Latin-1, so the rupee sign and fancy dashes become plain text, and
 * anything else outside that range is dropped. Property names are untrusted text; jsPDF only ever draws them
 * as glyphs, never interprets them.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/₹\s?/g, 'Rs. ')
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\n -~ -ÿ]/g, '')
}

const rs = (n: number) => pdfSafe(formatIndianCurrency(Math.round(n)))

/** A filename that is safe on every OS: letters, digits, dashes only. */
export function summaryFileName(propertyName: string): string {
  const slug = propertyName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  return `true-cost-summary-${slug || 'property'}.pdf`
}

const PAGE = { width: 210, height: 297, margin: 18 }
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2

/** Builds the PDF and returns the jsPDF document. jsPDF is loaded on demand so it isn't in the main bundle. */
export async function buildSummaryPdf({ property, affordabilityRanges, status, generatedAt = new Date() }: SummaryPdfOptions) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const b = property.trueCostBreakdown
  let y = PAGE.margin

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE.height - PAGE.margin) {
      doc.addPage()
      y = PAGE.margin
    }
  }
  const text = (value: string, x: number, opts: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    doc.setTextColor(...(opts.color ?? [30, 30, 30]))
    doc.text(pdfSafe(value), x, y, { align: opts.align ?? 'left' })
  }
  const paragraph = (value: string, opts: { size?: number; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10
    const indent = opts.indent ?? 0
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines: string[] = doc.splitTextToSize(pdfSafe(value), CONTENT_WIDTH - indent)
    const lineHeight = size * 0.5
    ensureSpace(lines.length * lineHeight + 1)
    doc.setTextColor(...(opts.color ?? [60, 60, 60]))
    doc.text(lines, PAGE.margin + indent, y)
    y += lines.length * lineHeight + (opts.gap ?? 2)
  }
  const heading = (value: string) => {
    ensureSpace(14)
    y += 4
    text(value, PAGE.margin, { size: 12, bold: true, color: [91, 33, 182] })
    y += 2
    doc.setDrawColor(220, 215, 230)
    doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y)
    y += 6
  }
  const row = (label: string, value: string, opts: { bold?: boolean } = {}) => {
    ensureSpace(7)
    text(label, PAGE.margin, { bold: opts.bold })
    text(value, PAGE.width - PAGE.margin, { bold: opts.bold, align: 'right' })
    y += 6.5
  }

  // Title block
  text('True Cost Summary', PAGE.margin, { size: 20, bold: true, color: [91, 33, 182] })
  y += 8
  text(property.name, PAGE.margin, { size: 14, bold: true })
  y += 6
  text(`${property.location} - ${property.type}`, PAGE.margin, { color: [100, 100, 100] })
  y += 5
  text(
    `Generated ${generatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    PAGE.margin,
    { size: 9, color: [130, 130, 130] }
  )
  y += 6

  // Headline number
  doc.setFillColor(245, 242, 252)
  doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 28, 3, 3, 'F')
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('TRUE MONTHLY COST', PAGE.width / 2, y, { align: 'center' })
  y += 11
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(91, 33, 182)
  doc.text(rs(property.totalMonthly), PAGE.width / 2, y, { align: 'center' })
  y += 6
  const hiddenPct = b.rent > 0 ? Math.round(((property.totalMonthly - b.rent) / b.rent) * 100) : 0
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const sub =
    property.costPerPerson != null && property.costPerPerson !== property.totalMonthly
      ? `${rs(property.costPerPerson)} per person  |  ${hiddenPct}% above the rent alone`
      : `${hiddenPct}% above the rent alone (${rs(b.rent)})`
  doc.text(pdfSafe(sub), PAGE.width / 2, y, { align: 'center' })
  y += 12

  // Breakdown
  heading('Monthly breakdown')
  const monthlyKeys = ['rent', 'maintenance', 'parking', 'commuteCost', 'utilities', 'repairBuffer'] as const
  for (const key of monthlyKeys) row(BREAKDOWN_LABELS[key], rs(b[key]))
  heading('One-time and deposit costs (monthly equivalent)')
  row(BREAKDOWN_LABELS.amortizedOneTime, rs(b.amortizedOneTime))
  row(BREAKDOWN_LABELS.depositOpportunityCost, rs(b.depositOpportunityCost))
  row('Total one-time (monthly)', rs(b.amortizedOneTime + b.depositOpportunityCost), { bold: true })
  y += 1
  row('True monthly cost', rs(property.totalMonthly), { bold: true })

  // Affordability
  heading('Affordability')
  if (affordabilityRanges && status) {
    row('Status', status, { bold: true })
    row('Safe limit (30% of income)', rs(affordabilityRanges.safe))
    row('Stretch limit (40% of income)', rs(affordabilityRanges.stretch))
  } else {
    paragraph('Not available: add your income in the Profile step to see how this property compares with the 30% / 40% limits.')
  }

  // Negotiation
  const tips = getNegotiationTips(property)
  if (tips.length > 0) {
    heading('What you could negotiate')
    for (const tip of tips) {
      ensureSpace(12)
      text('-', PAGE.margin, { bold: true })
      paragraph(tip.text, { indent: 5, color: [40, 40, 40], gap: 2.5 })
    }
    const total = tips.reduce((sum, t) => sum + t.monthlySaving, 0)
    paragraph(`Landing all of these could save roughly ${rs(total)}/mo. These are estimates, not guarantees.`, {
      size: 9,
      color: [110, 110, 110],
    })
  }

  // Assumptions
  heading('Assumptions behind these numbers')
  const assumptions: string[] = []
  if (property.stayMonths) assumptions.push(`One-time costs (brokerage, furnishing, moving, agreement) are spread over ${property.stayMonths} months.`)
  assumptions.push('Deposit opportunity cost assumes 6% a year on the money locked in the deposit.')
  assumptions.push('Repairs buffer is 8% of rent.')
  if (property.commuteDistanceKm != null && property.costPerKm != null) {
    assumptions.push(`Commute: ${property.commuteDistanceKm} km per trip at ${rs(property.costPerKm)}/km, 44 trips a month.`)
  }
  if (property.numberOfPeople) assumptions.push(`Shared between ${property.numberOfPeople} ${property.numberOfPeople === 1 ? 'person' : 'people'}.`)
  for (const line of assumptions) paragraph(`- ${line}`, { size: 9, gap: 1.5 })

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Hidden Cost Calculator - estimates for comparison, not financial advice', PAGE.margin, PAGE.height - 10)
    doc.text(`${i} / ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 10, { align: 'right' })
  }

  return doc
}

export async function downloadSummaryPdf(options: SummaryPdfOptions): Promise<void> {
  const doc = await buildSummaryPdf(options)
  doc.save(summaryFileName(options.property.name))
}
