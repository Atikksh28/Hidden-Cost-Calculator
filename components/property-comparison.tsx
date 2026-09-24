'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CustomProperty } from '@/components/add-property-form'
import { formatIndianCurrency } from '@/lib/format-indian-currency'

const defaultProperties = [
  {
    id: 1,
    name: 'Bandra Apartment',
    location: 'Mumbai, Bandra',
    type: 'Rent',
    rent: 50000,
    maintenance: 2500,
    parking: 5000,
    commute: 2000,
    schoolTransport: 0,
    furnishing: 0,
    repairs: 1500,
    additionalCharges: 8000,
    registration: 0,
    totalMonthly: 69000,
    status: 'Safe',
    deposit: null,
    brokerage: null,
    moving: null,
    utilities: null,
    costPerPerson: null,
    trueCostBreakdown: null,
  },
  {
    id: 2,
    name: 'Powai Rental',
    location: 'Mumbai, Powai',
    type: 'Rent',
    rent: 45000,
    maintenance: 2000,
    parking: 3000,
    commute: 3500,
    schoolTransport: 2000,
    furnishing: 0,
    repairs: 1000,
    additionalCharges: 7000,
    registration: 0,
    totalMonthly: 63500,
    status: 'Safe',
    deposit: null,
    brokerage: null,
    moving: null,
    utilities: null,
    costPerPerson: null,
    trueCostBreakdown: null,
  },
  {
    id: 3,
    name: 'Andheri Purchase',
    location: 'Mumbai, Andheri',
    type: 'EMI',
    rent: 35000,
    maintenance: 3000,
    parking: 2000,
    commute: 4000,
    schoolTransport: 2500,
    furnishing: 1500,
    repairs: 2000,
    additionalCharges: 9000,
    registration: 2000,
    totalMonthly: 61000,
    status: 'Stretch',
    deposit: null,
    brokerage: null,
    moving: null,
    utilities: null,
    costPerPerson: null,
    trueCostBreakdown: null,
  },
]

interface AffordabilityRanges {
  safe: number
  stretch: number
}

interface PropertyComparisonProps {
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
    tint: 'bg-green-50/60 dark:bg-green-950/10',
    headerGradient: 'from-green-500/15 to-green-500/5',
    totalText: 'text-green-600 dark:text-green-400',
    badge:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
  },
  Stretch: {
    border: 'border-amber-500',
    tint: 'bg-amber-50/60 dark:bg-amber-950/10',
    headerGradient: 'from-amber-500/15 to-amber-500/5',
    totalText: 'text-amber-600 dark:text-amber-400',
    badge:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  Risky: {
    border: 'border-red-500',
    tint: 'bg-red-50/60 dark:bg-red-950/10',
    headerGradient: 'from-red-500/15 to-red-500/5',
    totalText: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  },
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
        {rentPercent > 0 && <div className="bg-slate-400" style={{ width: `${rentPercent}%` }} />}
        {maintenancePercent > 0 && <div className="bg-slate-500" style={{ width: `${maintenancePercent}%` }} />}
        {commutePercent > 0 && <div className="bg-slate-600" style={{ width: `${commutePercent}%` }} />}
        {othersPercent > 0 && <div className="bg-slate-700" style={{ width: `${othersPercent}%` }} />}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Rent/EMI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span className="text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-muted-foreground">Commute</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <span className="text-muted-foreground">Others</span>
        </div>
      </div>
    </div>
  )
}

export function PropertyComparison({
  customProperties = [],
  visiblePropertyIds = ['1', '2', '3'],
  affordabilityRanges,
}: PropertyComparisonProps) {
  // Combine default and custom properties
  const allProperties = [...defaultProperties, ...customProperties]

  // Filter by visibility if provided
  let propertiesToDisplay = visiblePropertyIds
    ? allProperties.filter((p) => visiblePropertyIds.includes(p.id.toString()))
    : allProperties

  const filteredProperties = propertiesToDisplay.filter((property) => {
    // All properties are shown in comparison
    return true
  })

  const minTotalCost = Math.min(...filteredProperties.map((p) => p.totalMonthly))

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Property Comparison Dashboard</h2>
        <p className="text-foreground/60 text-sm">Compare up to 3 properties side by side to see the true monthly cost</p>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">No properties selected.</p>
          <p className="text-sm text-muted-foreground">Check a property in the sidebar to compare it here.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pt-3 -mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredProperties.map((property) => {
              const biggestHiddenCost = findBiggestHiddenCost(property)
              const isLowestCost = property.totalMonthly === minTotalCost
              const status = affordabilityRanges
                ? getAffordabilityStatus(property.totalMonthly, affordabilityRanges)
                : ((property.status as 'Safe' | 'Stretch' | 'Risky') || 'Safe')
              const styles = STATUS_STYLES[status]

              return (
                <div key={property.id} className="relative">
                  {/* "Lowest Cost" ribbon — deliberately not "Best Value": this only
                      compares the raw number, it knows nothing about quality/location/fit. */}
                  {isLowestCost && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white shadow-md whitespace-nowrap">
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
                          <Badge variant="secondary" className={`${styles.badge} text-[11px] px-2 py-0`}>
                            {status}
                          </Badge>
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

function CostItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={value > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
        {value > 0 ? `₹${value.toLocaleString()}` : '—'}
      </span>
    </div>
  )
}
