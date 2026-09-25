import type { OnboardingData } from '@/components/conversational-onboarding'

// ---------------------------------------------------------------------------
// Pure translation helpers: onboarding category answers -> numbers the
// true-cost calculation needs. No UI, no side effects.
// ---------------------------------------------------------------------------

/** How long the user plans to stay, in months. */
export function getStayMonths(
  stayDuration: OnboardingData['stayDuration'],
  customYears: number | null
): number {
  switch (stayDuration) {
    case 'lt_1_year':
      return 12
    case '1_2_years':
      return 18
    case '2_3_years':
      return 30
    case 'other':
      if (typeof customYears === 'number' && Number.isFinite(customYears) && customYears > 0) {
        return customYears * 12
      }
      return 36
    default:
      return 36
  }
}

/** Cost per km for the user's chosen commute method (₹/km). */
export function getCostPerKm(commuteMethod: OnboardingData['commuteMethod']): number {
  switch (commuteMethod) {
    case 'walk_cycle':
      return 0
    case 'public_transport':
      return 3
    case 'two_wheeler':
      return 5
    case 'car':
      return 8
    case 'cab_pooled':
      return 15
    default:
      return 0
  }
}

/** Number of people the true cost should be split across. */
export function getNumberOfPeople(
  occupancy: OnboardingData['occupancy'],
  customPeople: number | null
): number {
  switch (occupancy) {
    case 'alone':
      return 1
    case 'split_1':
      return 2
    case 'split_2plus':
      if (typeof customPeople === 'number' && Number.isFinite(customPeople) && customPeople > 0) {
        return customPeople
      }
      return 1
    default:
      return 1
  }
}
