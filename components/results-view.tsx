'use client'

import { Card } from '@/components/ui/card'
import { PropertyPillSelector } from '@/components/property-pill-selector'
import { CostBreakdown } from '@/components/cost-breakdown'
import { TrueCostSummary } from '@/components/true-cost-summary'
import type { PropertyWithBreakdown } from '@/lib/breakdown'

interface ResultsViewProps {
  /** The one property both the bubble chart and the summary table describe. */
  property: PropertyWithBreakdown | null
  affordabilityRanges?: { safe: number; stretch: number }
}

/**
 * Step 4 layout: the bubble chart in a left column beside the True Cost Summary
 * card on desktop, stacked above it on mobile. Handles "no property yet" once
 * for the whole page.
 */
export function ResultsView({ property, affordabilityRanges }: ResultsViewProps) {
  return (
    <section className="py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center lg:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">What are you really paying for?</h2>
          <p className="text-muted-foreground text-lg">
            Understand every hidden cost that impacts your monthly expenses
          </p>
        </div>

        <PropertyPillSelector />

        {property ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <CostBreakdown property={property} />
            </div>
            <TrueCostSummary property={property} affordabilityRanges={affordabilityRanges} />
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Add a rental property in the Properties step to see its true monthly cost broken down here.
            </p>
          </Card>
        )}
      </div>
    </section>
  )
}
