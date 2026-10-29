'use client'

import { Card } from '@/components/ui/card'
import { AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatIndianCurrency } from '@/lib/format-indian-currency'
import { getNegotiationTips } from '@/lib/negotiation-tips'
import { BREAKDOWN_LABELS, type PropertyWithBreakdown } from '@/lib/breakdown'

interface AffordabilityRanges {
  safe: number
  stretch: number
}

interface TrueCostSummaryProps {
  /** The property the Results page is showing, resolved once upstream and shared with the bubble chart. */
  property: PropertyWithBreakdown
  affordabilityRanges?: AffordabilityRanges
}

function getAffordabilityStatus(totalMonthly: number, ranges?: AffordabilityRanges): 'Safe' | 'Stretch' | 'Risky' {
  if (!ranges) {
    if (totalMonthly <= 30000) return 'Safe'
    if (totalMonthly <= 40000) return 'Stretch'
    return 'Risky'
  }
  if (totalMonthly <= ranges.safe) return 'Safe'
  if (totalMonthly <= ranges.stretch) return 'Stretch'
  return 'Risky'
}

const statusStyles = {
  Safe: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400',
  Stretch: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400',
  Risky: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400',
} as const

export function TrueCostSummary({ property, affordabilityRanges }: TrueCostSummaryProps) {
  const breakdown = property.trueCostBreakdown
  const showCostPerPerson = property.costPerPerson != null && property.costPerPerson !== property.totalMonthly
  const negotiationTips = getNegotiationTips(property)
  const totalPotentialSaving = negotiationTips.reduce((sum, t) => sum + t.monthlySaving, 0)
  const oneTimeAndDeposit = breakdown.amortizedOneTime + breakdown.depositOpportunityCost

  const hiddenCostIncreasePercent =
    breakdown.rent > 0 ? Math.round(((property.totalMonthly - breakdown.rent) / breakdown.rent) * 100) : 0
  // No ranges (income not provided) -> no status, rather than judging against
  // hardcoded fallback thresholds.
  const status = affordabilityRanges ? getAffordabilityStatus(property.totalMonthly, affordabilityRanges) : null

  return (
    <div className="min-w-0">
      <div>
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            True Cost Summary
          </h2>
          <p className="text-muted-foreground">
            Your complete financial picture for this property
          </p>
        </div>

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 border-b border-border">
            <h3 className="text-2xl font-bold text-foreground mb-2">{property.name}</h3>
            <p className="text-muted-foreground">
              {property.location} • {property.type}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Cost Breakdown */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-semibold text-foreground mb-4">Monthly Breakdown</h4>
                <div className="space-y-3">
                  <CostRow label={BREAKDOWN_LABELS.rent} value={breakdown.rent} />
                  <CostRow label={BREAKDOWN_LABELS.maintenance} value={breakdown.maintenance} />
                  <CostRow label={BREAKDOWN_LABELS.parking} value={breakdown.parking} />
                  <CostRow label={BREAKDOWN_LABELS.commuteCost} value={breakdown.commuteCost} />
                  <CostRow label={BREAKDOWN_LABELS.utilities} value={breakdown.utilities} />
                  <CostRow label={BREAKDOWN_LABELS.repairBuffer} value={breakdown.repairBuffer} />
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-4">One-Time & Deposit Costs (Monthly Equivalent)</h4>
                <div className="space-y-3">
                  <CostRow label={BREAKDOWN_LABELS.amortizedOneTime} value={breakdown.amortizedOneTime} />
                  <CostRow label={BREAKDOWN_LABELS.depositOpportunityCost} value={breakdown.depositOpportunityCost} />
                  <div className="pt-2 border-t border-border">
                    <CostRow label="Total One-Time (Monthly)" value={oneTimeAndDeposit} highlight />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Section */}
            <div className="bg-primary/5 rounded-lg p-6 mb-8 border border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">True Monthly Cost</p>
                <p className="text-5xl font-bold text-primary mb-2">{formatIndianCurrency(property.totalMonthly)}</p>
                <p className="text-muted-foreground">All-inclusive monthly budget</p>
                {showCostPerPerson && property.costPerPerson != null && (
                  <p className="text-sm text-foreground/70 mt-3">
                    {formatIndianCurrency(property.costPerPerson)} per person
                  </p>
                )}
              </div>
            </div>

            {/* Recommendation Block */}
            <div className="bg-black rounded-lg border border-yellow-300 p-6 mb-8">
              <div className="flex gap-4 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-2">What this means for you</h4>
                  <p className="text-sm text-white/90 leading-relaxed mb-4">
                    The rent alone is {formatIndianCurrency(breakdown.rent)}/mo, but the true monthly cost is{' '}
                    {formatIndianCurrency(property.totalMonthly)} — {hiddenCostIncreasePercent}% higher — once
                    commute, deposit lock-in, amortized one-time costs, and a repairs buffer are factored in.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white mb-3">What you could negotiate:</p>
                    <div className="space-y-2 text-sm text-white/90">
                      {negotiationTips.map((tip) => (
                        <div key={tip.id} className="flex items-start gap-2">
                          <span className="text-yellow-300 font-bold mt-0.5">•</span>
                          <span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                    {negotiationTips.length > 0 && (
                      <p className="text-xs text-white/70 pt-2">
                        Landing all of these could save roughly {formatIndianCurrency(Math.round(totalPotentialSaving))}/mo.
                        These are estimates, not guarantees.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Affordability Status */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                <p className="text-sm text-muted-foreground mb-2">Hidden Cost Increase</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">+{hiddenCostIncreasePercent}%</p>
                <p className="text-xs text-red-700 dark:text-red-400 mb-2">
                  From {formatIndianCurrency(breakdown.rent)} rent to {formatIndianCurrency(property.totalMonthly)} real
                </p>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  status ? statusStyles[status] : 'bg-muted/50 border-border text-muted-foreground'
                }`}
              >
                <p className="text-sm text-muted-foreground mb-2">Affordability Status</p>
                <p className="text-xl font-bold">{status ?? 'Not available'}</p>
                <p className="text-xs">
                  {affordabilityRanges
                    ? `Safe up to ${formatIndianCurrency(affordabilityRanges.safe)}, Stretch up to ${formatIndianCurrency(affordabilityRanges.stretch)}`
                    : 'Add your income in the Profile step to see this'}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <div className="border-t border-border pt-8">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
                Download PDF Summary
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function CostRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${highlight ? 'font-semibold' : ''}`}>
      <span className={highlight ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className={highlight ? 'text-primary font-bold' : 'text-foreground'}>
        ₹{value.toLocaleString()}
      </span>
    </div>
  )
}
