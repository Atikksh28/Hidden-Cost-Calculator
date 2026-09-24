'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

interface AffordabilityAnalysisProps {
  onAffordabilityUpdate?: (ranges: { safe: number; stretch: number }) => void
}

export function AffordabilityAnalysis({ onAffordabilityUpdate }: AffordabilityAnalysisProps) {
  const [income, setIncome] = useState(150000)
  const [existingEmis, setExistingEmis] = useState(25000)
  const [savingsGoal, setSavingsGoal] = useState(30000)
  const [familyMembers, setFamilyMembers] = useState(4)

  // Track which fields user prefers not to disclose
  const [hideIncome, setHideIncome] = useState(false)
  const [hideEmis, setHideEmis] = useState(false)
  const [hideSavings, setHideSavings] = useState(false)

  // Calculate only with available data
  const safeBudget = !hideIncome ? Math.max(0, income * 0.3) : null
  const stretchBudget = !hideIncome ? Math.max(0, income * 0.4) : null

  // Emit affordability ranges when they change
  useEffect(() => {
    if (safeBudget !== null && stretchBudget !== null && onAffordabilityUpdate) {
      onAffordabilityUpdate({
        safe: safeBudget,
        stretch: stretchBudget,
      })
    }
  }, [safeBudget, stretchBudget, onAffordabilityUpdate])

  const availableForHousing = !hideIncome || !hideEmis || !hideSavings
    ? (hideIncome ? 0 : income) - (hideEmis ? 0 : existingEmis) - (hideSavings ? 0 : savingsGoal)
    : null

  // No property has been picked yet at this point in the wizard (that's Step 3),
  // so these summary metrics are self-contained — derived only from income/EMI/
  // savings/family inputs, never from any property's trueMonthlyCost. The actual
  // "this property's cost vs. your budget" comparison happens later in the
  // Results step, once a real trueMonthlyCost exists to compare against.
  const pctOfIncomeAvailable =
    !hideIncome && income > 0 && availableForHousing !== null
      ? Math.max(0, (availableForHousing / income) * 100)
      : null
  const perPersonBudget =
    availableForHousing !== null ? availableForHousing / familyMembers : null

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

            <div>
              <label className="block text-base font-semibold text-foreground mb-2">
                Family Members
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setFamilyMembers(num)}
                    className={`h-10 w-10 rounded-lg text-base font-semibold transition-all ${
                      familyMembers === num
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-metric summary row */}
            <div className="border-t border-border pt-5">
              <h4 className="text-base font-semibold text-foreground mb-3">Key Metrics</h4>
              {availableForHousing === null ? (
                <div className="p-4 bg-muted/50 rounded-lg border border-muted text-center">
                  <p className="text-muted-foreground text-sm">
                    Please provide at least one financial metric to see key metrics
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <MetricTile label="Available for Housing" value={`₹${Math.round(availableForHousing).toLocaleString()}`} />
                  <MetricTile
                    label="% of Income"
                    value={pctOfIncomeAvailable !== null ? `${pctOfIncomeAvailable.toFixed(0)}%` : '—'}
                  />
                  <MetricTile
                    label="Per Person"
                    value={perPersonBudget !== null ? `₹${Math.round(perPersonBudget).toLocaleString()}` : '—'}
                  />
                </div>
              )}
              {!hasFullData && availableForHousing !== null && (
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
                    hint="Over 40%"
                  />
                </div>

                {pctOfIncomeAvailable !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Your budget headroom vs. the 30% / 40% thresholds
                      </h4>
                      <span className="text-sm font-bold text-primary">
                        {pctOfIncomeAvailable.toFixed(0)}% of income free
                      </span>
                    </div>
                    <AllocationBar percent={pctOfIncomeAvailable} />
                    <p className="text-xs text-muted-foreground mt-2">
                      This shows how much of your income is left after EMIs and savings — the most housing
                      cost could take before eating into that. It isn&apos;t tied to any specific property yet;
                      each property&apos;s actual cost gets checked against these same 30%/40% thresholds once
                      you pick one in Results.
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

/** Visual bar: green 0-30%, amber 30-40%, red 40%+, with a marker at `percent`. */
function AllocationBar({ percent }: { percent: number }) {
  const clampedMarker = Math.min(percent, 100)
  return (
    <div className="relative pt-3">
      <div className="h-3 rounded-full overflow-hidden flex">
        <div className="bg-green-400 dark:bg-green-600" style={{ width: '30%' }} />
        <div className="bg-amber-400 dark:bg-amber-600" style={{ width: '10%' }} />
        <div className="bg-red-400 dark:bg-red-600" style={{ width: '60%' }} />
      </div>
      <div
        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
        style={{ left: `${clampedMarker}%` }}
      >
        <div className="w-0.5 h-3 bg-foreground" />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>0%</span>
        <span className="absolute" style={{ left: '30%', transform: 'translateX(-50%)' }}>30%</span>
        <span className="absolute" style={{ left: '40%', transform: 'translateX(-50%)' }}>40%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
