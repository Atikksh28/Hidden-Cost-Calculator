'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

interface AffordabilityAnalysisProps {
  onAffordabilityUpdate?: (ranges: { safe: number; stretch: number } | null) => void
}

export function AffordabilityAnalysis({ onAffordabilityUpdate }: AffordabilityAnalysisProps) {
  const [income, setIncome] = useState(150000)
  const [existingEmis, setExistingEmis] = useState(25000)
  const [savingsGoal, setSavingsGoal] = useState(30000)

  // Track which fields user prefers not to disclose
  const [hideIncome, setHideIncome] = useState(false)
  const [hideEmis, setHideEmis] = useState(false)
  const [hideSavings, setHideSavings] = useState(false)

  // What's left of income after EMIs and savings. A field marked "prefer not
  // to say" counts as 0. Null when income itself is hidden — there's no honest
  // number to show without it.
  const expendableIncome = hideIncome
    ? null
    : income - (hideEmis ? 0 : existingEmis) - (hideSavings ? 0 : savingsGoal)

  // The 30% / 40% rule is applied to total monthly income (not to what's left
  // after obligations). Income hidden -> null, so no status is judged at all.
  const safeBudget = hideIncome ? null : income * 0.3
  const stretchBudget = hideIncome ? null : income * 0.4

  // Emit affordability ranges when they change. `null` when income is hidden,
  // so the parent clears its stored ranges instead of keeping stale ones.
  useEffect(() => {
    if (!onAffordabilityUpdate) return
    if (safeBudget !== null && stretchBudget !== null) {
      onAffordabilityUpdate({ safe: safeBudget, stretch: stretchBudget })
    } else {
      onAffordabilityUpdate(null)
    }
  }, [safeBudget, stretchBudget, onAffordabilityUpdate])

  // Self-contained: derived only from the income/EMI/savings inputs, never
  // from any property's trueMonthlyCost. Each property's cost is compared to
  // the 30%/40% limits later, in Comparison and Results.
  const expendablePct =
    expendableIncome !== null && income > 0 ? Math.max(0, (expendableIncome / income) * 100) : null

  const hasFullData = !hideIncome && !hideEmis && !hideSavings

  return (
    <section className="h-full flex flex-col py-4 md:py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        <div className="mb-4 shrink-0">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-1">
            Affordability Analysis
          </h2>
          <p className="text-foreground/60 text-sm md:text-base">
            Understand what you can realistically afford based on your income and lifestyle
          </p>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: inputs + summary row */}
          <Card className="p-5 md:p-6 space-y-5 overflow-y-auto">
            <SliderField
              label="Monthly Household Income"
              value={income}
              onChange={setIncome}
              min={50000}
              max={500000}
              step={10000}
              hidden={hideIncome}
              onToggleHidden={setHideIncome}
            />

            <SliderField
              label="Existing EMIs"
              value={existingEmis}
              onChange={setExistingEmis}
              min={0}
              max={100000}
              step={5000}
              hidden={hideEmis}
              onToggleHidden={setHideEmis}
            />

            <SliderField
              label="Monthly Savings Goal"
              value={savingsGoal}
              onChange={setSavingsGoal}
              min={0}
              max={100000}
              step={5000}
              hidden={hideSavings}
              onToggleHidden={setHideSavings}
            />

            {/* Summary row */}
            <div className="border-t border-border pt-5">
              <h4 className="text-base font-semibold text-foreground mb-3">Key Metrics</h4>
              {expendableIncome === null ? (
                <div className="p-4 bg-muted/50 rounded-lg border border-muted text-center">
                  <p className="text-muted-foreground text-sm">
                    Income is required to calculate your expendable income
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile
                    label="Expendable Income Remaining"
                    value={`₹${Math.round(expendableIncome).toLocaleString()}`}
                  />
                  <MetricTile
                    label="% of Income"
                    value={expendablePct !== null ? `${expendablePct.toFixed(0)}%` : '—'}
                  />
                </div>
              )}
              {!hasFullData && expendableIncome !== null && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  Some fields are hidden — provide full details for a complete picture.
                </p>
              )}
            </div>
          </Card>

          {/* Right: range cards + allocation bar */}
          <Card className="p-5 md:p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Budget Ranges</h3>
            {hideIncome ? (
              <div className="p-4 bg-muted/50 rounded-lg border border-muted text-center">
                <p className="text-muted-foreground">Income information required to calculate budget ranges</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <RangeCard
                    icon={CheckCircle}
                    tone="green"
                    label="Safe"
                    value={`₹${safeBudget?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    hint="30% of income"
                  />
                  <RangeCard
                    icon={AlertTriangle}
                    tone="amber"
                    label="Stretch"
                    value={`₹${stretchBudget?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    hint="40% of income"
                  />
                  <RangeCard
                    icon={AlertCircle}
                    tone="red"
                    label="Risky"
                    value={`> ₹${stretchBudget?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    hint="Over 40% of income"
                  />
                </div>

                {expendableIncome !== null && expendableIncome <= 0 && (
                  <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Your EMIs and savings goal meet or exceed your income, leaving no expendable income.
                      The limits below are based on total income, so check you have a cushion before
                      committing to any rent.
                    </p>
                  </div>
                )}

                {expendablePct !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Your expendable income vs. the 30% / 40% limits
                      </h4>
                      <span className="text-sm font-bold text-primary">
                        {expendablePct.toFixed(0)}% of income remaining
                      </span>
                    </div>
                    <AllocationBar safePct={30} stretchPct={40} freePct={expendablePct} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Safe and Stretch are 30% and 40% of your total monthly income. The marker shows how
                      much of your income is left after EMIs and savings. It isn&apos;t tied to any specific
                      property yet — each property&apos;s actual cost is checked against these limits in
                      Comparison and Results.
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hidden,
  onToggleHidden,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  hidden: boolean
  onToggleHidden: (hidden: boolean) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-base font-semibold text-foreground">{label}</label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => onToggleHidden(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Prefer not to say
        </label>
      </div>
      {!hidden ? (
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="slider-thick flex-1"
          />
          <span className="text-lg font-bold text-primary min-w-fit tabular-nums">
            ₹{value.toLocaleString()}
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">Data not provided</div>
      )}
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
    </div>
  )
}

const RANGE_CARD_TONES = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
    icon: 'text-green-600',
    label: 'text-green-700 dark:text-green-300',
    value: 'text-green-700 dark:text-green-300',
    hint: 'text-green-600 dark:text-green-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
    icon: 'text-amber-600',
    label: 'text-amber-700 dark:text-amber-300',
    value: 'text-amber-700 dark:text-amber-300',
    hint: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    icon: 'text-red-600',
    label: 'text-red-700 dark:text-red-300',
    value: 'text-red-700 dark:text-red-300',
    hint: 'text-red-600 dark:text-red-400',
  },
} as const

function RangeCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: keyof typeof RANGE_CARD_TONES
  label: string
  value: string
  hint: string
}) {
  const t = RANGE_CARD_TONES[tone]
  return (
    <div className={`p-3.5 rounded-lg border ${t.bg} ${t.border}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${t.icon}`} />
        <span className={`text-sm font-semibold ${t.label}`}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${t.value} tabular-nums`}>{value}</p>
      <p className={`text-xs ${t.hint} mt-0.5`}>{hint}</p>
    </div>
  )
}

/**
 * Visual bar over 0-100% of income: green up to the Safe limit, amber up to
 * the Stretch limit, red beyond. The marker sits at the total left after
 * EMIs/savings (the ceiling that Safe/Stretch are 30%/40% of).
 */
function AllocationBar({
  safePct,
  stretchPct,
  freePct,
}: {
  safePct: number
  stretchPct: number
  freePct: number
}) {
  const clamp = (n: number) => Math.min(Math.max(n, 0), 100)
  const safe = clamp(safePct)
  const stretch = clamp(stretchPct)
  const marker = clamp(freePct)
  return (
    <div className="relative pt-3 pb-4">
      <div className="h-3 rounded-full overflow-hidden flex">
        <div className="bg-green-400 dark:bg-green-600" style={{ width: `${safe}%` }} />
        <div className="bg-amber-400 dark:bg-amber-600" style={{ width: `${stretch - safe}%` }} />
        <div className="bg-red-400 dark:bg-red-600" style={{ width: `${100 - stretch}%` }} />
      </div>
      <div className="absolute top-0 -translate-x-1/2" style={{ left: `${marker}%` }}>
        <div className="w-0.5 h-3 bg-foreground" />
      </div>
      <div className="relative h-3 mt-1 text-[10px] text-muted-foreground">
        <span className="absolute left-0">0%</span>
        {safe > 0 && (
          <span className="absolute" style={{ left: `${safe}%`, transform: 'translateX(-50%)' }}>
            Safe {safePct.toFixed(0)}%
          </span>
        )}
        {stretch > safe && (
          <span className="absolute top-3" style={{ left: `${stretch}%`, transform: 'translateX(-50%)' }}>
            Stretch {stretchPct.toFixed(0)}%
          </span>
        )}
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  )
}
