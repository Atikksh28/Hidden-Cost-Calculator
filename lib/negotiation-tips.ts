import { formatIndianCurrency } from './format-indian-currency'
import type { PropertyWithBreakdown } from './breakdown'

export interface NegotiationTip {
  id: string
  text: string
  /** Estimated reduction in true monthly cost, in rupees. */
  monthlySaving: number
}

const MAX_TIPS = 4
const DEPOSIT_RATE_PER_MONTH = 0.06 / 12 // mirrors calculateTrueCost's opportunity-cost assumption
const REPAIR_BUFFER_RATE = 0.08
const TARGET_LOCK_IN_MONTHS = 24
const COMMUTE_TRIPS_PER_MONTH = 44

const inr = (n: number) => formatIndianCurrency(Math.round(n))
const num = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)

/**
 * Specific, quantified things to ask for, derived from this property's own numbers and
 * ranked by how much they would cut the true monthly cost. Only levers that actually
 * apply (non-zero cost) are returned. Does not touch calculateTrueCost.
 */
export function getNegotiationTips(property: PropertyWithBreakdown): NegotiationTip[] {
  const b = property.trueCostBreakdown
  const rent = num(b.rent)
  const stay = num(property.stayMonths) || 12
  const tips: NegotiationTip[] = []

  if (rent > 0) {
    const saving = rent * 0.05 * (1 + REPAIR_BUFFER_RATE)
    tips.push({
      id: 'rent',
      monthlySaving: saving,
      text: `Ask for 5% off the rent (${inr(rent * 0.05)}/mo). The repairs buffer scales with rent, so the real saving is about ${inr(saving)}/mo.`,
    })
  }

  const maintenance = num(b.maintenance)
  if (maintenance > 0) {
    tips.push({
      id: 'maintenance',
      monthlySaving: maintenance * 0.25,
      text: `Maintenance is ${inr(maintenance)}/mo. Ask the owner to cover part of it or cap it in the agreement; trimming a quarter saves about ${inr(maintenance * 0.25)}/mo.`,
    })
  }

  const parking = num(b.parking)
  if (parking > 0) {
    tips.push({
      id: 'parking',
      monthlySaving: parking / 2,
      text: `You are paying ${inr(parking)}/mo for parking. Ask for the slot to be included in the rent; even splitting it saves ${inr(parking / 2)}/mo.`,
    })
  }

  const brokerage = num(property.brokerage)
  if (brokerage > 0) {
    tips.push({
      id: 'brokerage',
      monthlySaving: brokerage / 2 / stay,
      text: `Brokerage of ${inr(brokerage)} adds ${inr(brokerage / stay)}/mo over your ${stay}-month stay. Ask the owner to share it half-and-half, or negotiate a lower fee, to save about ${inr(brokerage / 2 / stay)}/mo.`,
    })
  }

  const agreement = num(property.registration)
  if (agreement > 0) {
    tips.push({
      id: 'agreement',
      monthlySaving: agreement / 2 / stay,
      text: `Agreement and registration charges are ${inr(agreement)}. Ask the owner to split them, saving about ${inr(agreement / 2 / stay)}/mo.`,
    })
  }

  const deposit = num(property.deposit)
  const depositTarget = rent * 2
  if (rent > 0 && deposit > depositTarget) {
    const saving = (deposit - depositTarget) * DEPOSIT_RATE_PER_MONTH
    tips.push({
      id: 'deposit',
      monthlySaving: saving,
      text: `The ${inr(deposit)} deposit is ${(deposit / rent).toFixed(1)} months of rent. Pushing it down to 2 months (${inr(depositTarget)}) frees ${inr(deposit - depositTarget)} and saves about ${inr(saving)}/mo in lost returns.`,
    })
  }

  // Brokerage/agreement halves are already counted above, so only the remainder benefits from a longer stay.
  const oneTime = brokerage / 2 + num(property.furnishing) + num(property.moving) + agreement / 2
  if (oneTime > 0 && stay < TARGET_LOCK_IN_MONTHS) {
    const saving = oneTime / stay - oneTime / TARGET_LOCK_IN_MONTHS
    if (saving > 0) {
      tips.push({
        id: 'lock-in',
        monthlySaving: saving,
        text: `If you are willing to commit to ${TARGET_LOCK_IN_MONTHS} months instead of ${stay}, offer that in exchange for a lower rent; it also spreads your remaining ${inr(oneTime)} of one-time costs thinner, saving about ${inr(saving)}/mo.`,
      })
    }
  }

  const utilities = num(b.utilities)
  if (utilities > 0 && utilities >= rent * 0.05) {
    tips.push({
      id: 'utilities',
      monthlySaving: utilities * 0.2,
      text: `Utilities run ${inr(utilities)}/mo. Ask for separate meters at government rates instead of flat or society billing; a 20% cut saves about ${inr(utilities * 0.2)}/mo.`,
    })
  }

  const commute = num(b.commuteCost)
  const perKm = num(property.costPerKm)
  if (commute > 0 && commute >= rent * 0.15 && perKm > 0) {
    const perKmMonthly = perKm * COMMUTE_TRIPS_PER_MONTH
    tips.push({
      id: 'commute',
      monthlySaving: perKmMonthly * 2,
      text: `Commute costs ${inr(commute)}/mo. That is not negotiable, but every km closer saves ${inr(perKmMonthly)}/mo, so a place 2 km nearer could justify a slightly higher rent.`,
    })
  }

  return tips.sort((x, y) => y.monthlySaving - x.monthlySaving).slice(0, MAX_TIPS)
}
