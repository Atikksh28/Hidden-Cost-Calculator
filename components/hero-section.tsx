'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { useCountUp } from '@/hooks/use-count-up'
import { useInView } from '@/hooks/use-in-view'
import { formatIndianCurrency } from '@/lib/format-indian-currency'

// Example figures for the landing page; the percentage is derived from them so the three cards always agree.
const ASSUMED_MONTHLY_COST = 50000
const TRUE_MONTHLY_COST = 78500
const HIDDEN_COST_INCREASE_PERCENT = Math.round(((TRUE_MONTHLY_COST - ASSUMED_MONTHLY_COST) / ASSUMED_MONTHLY_COST) * 100)

function StatCard({
  label,
  value,
  subtitle,
  format = formatIndianCurrency,
}: {
  label: string
  value: number
  subtitle?: string
  format?: (n: number) => string
}) {
  const { ref, isInView } = useInView()
  const animatedCount = useCountUp(value, 1200, isInView)

  return (
    <div
      ref={ref}
      className="bg-card border border-border rounded-lg shadow-sm p-6"
    >
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-2xl font-semibold text-foreground">
        {format(animatedCount)}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

function HiddenCostCallout() {
  const { ref, isInView } = useInView()
  const animatedCount = useCountUp(TRUE_MONTHLY_COST - ASSUMED_MONTHLY_COST, 1200, isInView)

  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-2 animate-fade-in"
    >
      <TrendingUp className="h-5 w-5 text-amber-700 dark:text-secondary" />
      <p className="text-sm font-semibold text-amber-700 dark:text-secondary">
        {`+${formatIndianCurrency(animatedCount)} you didn't see coming`}
      </p>
    </div>
  )
}

interface HeroSectionProps {
  onGetStarted?: () => void
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
            Hidden Cost{' '}
            <span className="whitespace-nowrap">
              Calculator{' '}
              <Image
                src="/hidden-cost-emoji.png"
                alt=""
                aria-hidden
                width={224}
                height={256}
                priority
                className="inline-block h-[0.95em] w-auto align-[-0.12em]"
              />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 mb-8 text-balance max-w-2xl mx-auto">
            Compare properties by their real monthly cost, including rent, EMI, commute, maintenance, repairs, parking, registration, and other hidden expenses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={onGetStarted}
            >
              Start Comparing Properties
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Quick stat cards with animation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
            <StatCard
              label="Increase in Cost"
              value={HIDDEN_COST_INCREASE_PERCENT}
              subtitle="true vs. assumed monthly cost"
              format={(n) => `+${Math.round(n)}%`}
            />
            <StatCard label="Assumed Monthly Cost" value={ASSUMED_MONTHLY_COST} />
            <StatCard label="True Monthly Cost" value={TRUE_MONTHLY_COST} />
          </div>

          {/* Hidden cost callout below */}
          <HiddenCostCallout />
        </div>
      </div>
    </section>
  )
}
