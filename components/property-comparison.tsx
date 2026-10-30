'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import type { CustomProperty } from '@/components/add-property-form'
import { formatIndianCurrency } from '@/lib/format-indian-currency'

interface AffordabilityRanges {
  safe: number
  stretch: number
}

interface PropertyComparisonProps {
  /** Called with a custom property's id when its Edit button is clicked. Demo properties have no button. */
  onEdit?: (id: string) => void
  customProperties?: CustomProperty[]
  visiblePropertyIds?: string[]
  affordabilityRanges?: AffordabilityRanges
}

function getAffordabilityStatus(totalMonthly: number, ranges?: AffordabilityRanges): 'Safe' | 'Stretch' | 'Risky' {
  if (!ranges) {
    // Fallback to default percentages if ranges not provided
    if (totalMonthly <= 30000) return 'Safe'
    if (totalMonthly <= 40000) return 'Stretch'
    return 'Risky'
  }

  if (totalMonthly <= ranges.safe) return 'Safe'
  if (totalMonthly <= ranges.stretch) return 'Stretch'
  return 'Risky'
}

// Status-driven styling for each comparison card: border, background tint,
// header gradient, the True Monthly Cost number's color, and the status badge.
const STATUS_STYLES: Record<
  'Safe' | 'Stretch' | 'Risky',
  { border: string; tint: string; headerGradient: string; totalText: string; badge: string }
> = {
  Safe: {
    border: 'border-green-500',
    tint: 'bg-card',
    headerGradient: 'from-green-500/15 to-green-500/5',
    totalText: 'text-green-700 dark:text-green-400',
    badge:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
  },
  Stretch: {
    border: 'border-amber-500',
    tint: 'bg-card',
    headerGradient: 'from-amber-500/15 to-amber-500/5',
    totalText: 'text-amber-700 dark:text-amber-400',
    badge:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  Risky: {
    border: 'border-red-500',
    tint: 'bg-card',
    headerGradient: 'from-red-500/15 to-red-500/5',
    totalText: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  },
}

// Shown when there's no income to judge against ("prefer not to say"): no
// Safe/Stretch/Risky claim, just a plain card.
const NEUTRAL_STYLES = {
  border: 'border-border',
  tint: '',
  headerGradient: 'from-primary/10 to-accent/10',
  totalText: 'text-primary',
}

/**
 * Rent properties added since the true-cost calculator went in carry a
 * `trueCostBreakdown` (rent/maintenance/parking/commuteCost/amortizedOneTime/
 * depositOpportunityCost/utilities/repairBuffer). Their legacy
 * commute/schoolTransport/repairs/additionalCharges fields are null — those
 * costs are still real, just folded into the breakdown instead. Default mock
 * properties and EMI properties have no breakdown and keep using the
 * original flat fields untouched.
 */
function hasTrueCostBreakdown(property: any): boolean {
  return property.trueCostBreakdown != null
}

function findBiggestHiddenCost(property: any) {
  const hiddenCosts = hasTrueCostBreakdown(property)
    ? {
        'Maintenance': property.trueCostBreakdown.maintenance,
        'Parking': property.trueCostBreakdown.parking,
        'Commute': property.trueCostBreakdown.commuteCost,
        'One-Time Costs (Amortized)': property.trueCostBreakdown.amortizedOneTime,
        'Deposit Opportunity Cost': property.trueCostBreakdown.depositOpportunityCost,
        'Utilities': property.trueCostBreakdown.utilities,
        'Repairs Buffer': property.trueCostBreakdown.repairBuffer,
      }
    : {
        'Maintenance': property.maintenance,
        'Parking': property.parking,
        'Commute': property.commute,
        'School Transport': property.schoolTransport,
        'Furnishing': property.furnishing,
        'Repairs': property.repairs,
        'Additional Charges': property.additionalCharges,
        'Registration': property.registration,
      }

  let maxCost = 0
  let maxLabel = ''

  Object.entries(hiddenCosts).forEach(([label, cost]) => {
    if (cost > maxCost) {
      maxCost = cost
      maxLabel = label
    }
  })

  return { label: maxLabel, cost: maxCost }
}

function CostCompositionBar({ property }: { property: any }) {
  const total = property.totalMonthly
  const breakdown = hasTrueCostBreakdown(property) ? property.trueCostBreakdown : null

  const rent = breakdown ? breakdown.rent : property.rent
  const maintenance = breakdown ? breakdown.maintenance : property.maintenance
  const commute = breakdown ? breakdown.commuteCost : property.commute
  const others = breakdown
    ? breakdown.parking + breakdown.amortizedOneTime + breakdown.depositOpportunityCost + breakdown.utilities + breakdown.repairBuffer
    : property.parking +
      property.schoolTransport +
      property.furnishing +
      property.repairs +
      property.additionalCharges +
      property.registration

  const rentPercent = (rent / total) * 100
  const maintenancePercent = (maintenance / total) * 100
  const commutePercent = (commute / total) * 100
  const othersPercent = (others / total) * 100

  return (
    <div>
      <div className="flex h-1.5 gap-0.5 rounded-full overflow-hidden mb-1.5">
        {rentPercent > 0 && <div className="bg-primary/40" style={{ width: `${rentPercent}%` }} />}
        {maintenancePercent > 0 && <div className="bg-primary/55" style={{ width: `${maintenancePercent}%` }} />}
        {commutePercent > 0 && <div className="bg-primary/70" style={{ width: `${commutePercent}%` }} />}
        {othersPercent > 0 && <div className="bg-primary/85" style={{ width: `${othersPercent}%` }} />}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <span className="text-muted-foreground">Rent/EMI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/55" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
          <span className="text-muted-foreground">Commute</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/85" />
          <span className="text-muted-foreground">Others</span>
        </div>
      </div>
    </div>
  )
}

export function PropertyComparison({
  customProperties = [],
  visiblePropertyIds = [],
  affordabilityRanges,
  onEdit,
}: PropertyComparisonProps) {
  const customIds = new Set(customProperties.map((p) => p.id))
  const allProperties = customProperties

  // Filter by visibility if provided
  let propertiesToDisplay = visiblePropertyIds
    ? allProperties.filter((p) => visiblePropertyIds.includes(p.id.toString()))
    : allProperties

  const filteredProperties = propertiesToDisplay.filter((property) => {
    // All properties are shown in comparison
    return true
  })

  const minTotalCost = filteredProperties.length ? Math.min(...filteredProperties.map((p) => p.totalMonthly)) : 0

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Property Comparison Dashboard</h2>
        <p className="text-muted-foreground text-sm">Compare up to 3 properties side by side to see the true monthly cost</p>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">
            {customProperties.length === 0 ? 'No properties yet.' : 'No properties selected.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {customProperties.length === 0
              ? 'Click “Add Property” in the sidebar to enter your first one.'
              : 'Check a property in the sidebar to compare it here.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pt-3 -mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredProperties.map((property) => {
              const biggestHiddenCost = findBiggestHiddenCost(property)
              const isLowestCost = property.totalMonthly === minTotalCost
              // No ranges (income not provided) -> no status at all, rather than
              // a stale mock status or a default of "Safe".
              const status = affordabilityRanges
                ? getAffordabilityStatus(property.totalMonthly, affordabilityRanges)
                : null
              const styles = status ? STATUS_STYLES[status] : NEUTRAL_STYLES

              return (
                <div key={property.id} className="relative">
                  {/* "Lowest Cost" ribbon — deliberately not "Best Value": this only
                      compares the raw number, it knows nothing about quality/location/fit. */}
                  {isLowestCost && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-700 text-white shadow-md whitespace-nowrap">
                        Lowest Cost
                      </span>
                    </div>
                  )}

                  <Card className={`overflow-hidden hover:shadow-lg transition-shadow border-2 ${styles.border} ${styles.tint}`}>
                    <div className={`bg-gradient-to-br ${styles.headerGradient} p-4 border-b border-border`}>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground truncate">{property.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{property.location}</p>
                        </div>
                        {/* Status badge, stacked above the type label, top-right */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {status && (
                            <Badge variant="secondary" className={`${STATUS_STYLES[status].badge} text-[11px] px-2 py-0`}>
                              {status}
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px] px-2 py-0">
                            {property.type}
                          </Badge>
                        </div>
                      </div>
                      <CostCompositionBar property={property} />
                    </div>

                    <div className="p-4 space-y-2.5">
                      {/* Cost breakdown */}
                      <div className="space-y-1.5">
                        {property.trueCostBreakdown ? (
                          <>
                            <CostItem label="Rent/EMI" value={property.trueCostBreakdown.rent} />
                            <CostItem label="Maintenance" value={property.trueCostBreakdown.maintenance} />
                            <CostItem label="Parking" value={property.trueCostBreakdown.parking} />
                            <CostItem label="Commute" value={property.trueCostBreakdown.commuteCost} />
                            <CostItem label="One-Time (Amortized)" value={property.trueCostBreakdown.amortizedOneTime} />
                            <CostItem label="Deposit Opp. Cost" value={property.trueCostBreakdown.depositOpportunityCost} />
                            <CostItem label="Utilities" value={property.trueCostBreakdown.utilities} />
                            <CostItem label="Repairs Buffer" value={property.trueCostBreakdown.repairBuffer} />
                          </>
                        ) : (
                          <>
                            <CostItem label="Rent/EMI" value={property.rent} />
                            <CostItem label="Maintenance" value={property.maintenance} />
                            <CostItem label="Parking" value={property.parking} />
                            <CostItem label="Commute" value={property.commute} />
                            <CostItem label="School Transport" value={property.schoolTransport} />
                            <CostItem label="Furnishing/Setup" value={property.furnishing} />
                            <CostItem label="Repairs Buffer" value={property.repairs} />
                            <CostItem label="Additional Charges" value={property.additionalCharges} />
                            <CostItem label="Registration/Stamp" value={property.registration} />
                          </>
                        )}
                      </div>

                      {/* Biggest hidden cost tag */}
                      {biggestHiddenCost.cost > 0 && (
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                          <p className="text-xs text-red-700 dark:text-red-300">
                            🔴 {biggestHiddenCost.label} adds {formatIndianCurrency(biggestHiddenCost.cost)}/mo
                          </p>
                        </div>
                      )}

                      {/* Total */}
                      <div className="pt-2.5 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">True Monthly Cost</span>
                          <span className={`text-xl font-bold ${styles.totalText}`}>
                            {formatIndianCurrency(property.totalMonthly)}
                          </span>
                        </div>
                      </div>

                      {onEdit && customIds.has(String(property.id)) && (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onEdit(String(property.id))}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** `null` is a real value here: legacy fields (commute, repairs, ...) are null on EMI and newer Rent properties. */
function CostItem({ label, value }: { label: string; value: number | null | undefined }) {
  const amount = value ?? 0
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={amount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
        {amount > 0 ? `₹${amount.toLocaleString()}` : '—'}
      </span>
    </div>
  )
}
