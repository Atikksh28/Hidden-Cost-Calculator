import type { CustomProperty } from '@/components/add-property-form'
import type { TrueCostBreakdown } from '@/lib/calculate-true-cost'

/** A property that has a real, calculated trueCostBreakdown (custom Rent properties). */
export type PropertyWithBreakdown = CustomProperty & { trueCostBreakdown: TrueCostBreakdown }

export function hasBreakdown(property: CustomProperty): property is PropertyWithBreakdown {
  return property.trueCostBreakdown != null
}

/**
 * The one place that decides which property the Results page is showing:
 * the picked one if it still exists, otherwise the most recently added.
 * Both the bubble chart and the Monthly Breakdown table get this same
 * object, so they can't disagree about which property they're describing.
 */
export function resolveSelectedProperty(
  properties: PropertyWithBreakdown[],
  activeId: string | number | undefined
): PropertyWithBreakdown | null {
  return properties.find((p) => p.id === activeId) ?? properties[properties.length - 1] ?? null
}

/** Row labels shared by the Monthly Breakdown table and the bubble chart. */
export const BREAKDOWN_LABELS: Record<keyof TrueCostBreakdown, string> = {
  rent: 'Rent',
  maintenance: 'Maintenance',
  parking: 'Parking',
  commuteCost: 'Commute',
  utilities: 'Utilities',
  repairBuffer: 'Repairs Buffer',
  amortizedOneTime: 'One-Time Costs (Amortized)',
  depositOpportunityCost: 'Deposit Opportunity Cost',
}
