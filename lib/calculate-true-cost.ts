// ---------------------------------------------------------------------------
// True cost calculation — pure function, no UI. Models a RENTED property:
// deposit = security deposit (opportunity cost of it being locked up), not a
// down payment. Do not call this for type === 'EMI' properties.
// ---------------------------------------------------------------------------

export interface TrueCostInput {
  rent: number
  maintenance: number
  parking: number
  deposit: number
  brokerage: number
  furnishing: number
  moving: number
  agreementCharges: number
  utilities: number
  stayMonths: number
  commuteDistanceKm: number
  costPerKm: number
  tripsPerMonth: number
  interestRate: number
  numberOfPeople: number
}

export interface TrueCostBreakdown {
  rent: number
  maintenance: number
  parking: number
  amortizedOneTime: number
  depositOpportunityCost: number
  commuteCost: number
  utilities: number
  repairBuffer: number
}

export interface TrueCostResult {
  trueMonthlyCost: number
  costPerPerson: number
  breakdown: TrueCostBreakdown
}

const DEFAULT_INTEREST_RATE = 0.06
const DEFAULT_TRIPS_PER_MONTH = 44

/** Coerces a possibly-missing value to a finite, non-negative number. */
function toNumber(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return value
}

function round(value: number): number {
  return Math.round(value)
}

export function calculateTrueCost(data: Partial<TrueCostInput>): TrueCostResult {
  const rent = toNumber(data.rent)
  const maintenance = toNumber(data.maintenance)
  const parking = toNumber(data.parking)
  const deposit = toNumber(data.deposit)
  const brokerage = toNumber(data.brokerage)
  const furnishing = toNumber(data.furnishing)
  const moving = toNumber(data.moving)
  const agreementCharges = toNumber(data.agreementCharges)
  const utilities = toNumber(data.utilities)
  const stayMonths = toNumber(data.stayMonths)
  const commuteDistanceKm = toNumber(data.commuteDistanceKm)
  const costPerKm = toNumber(data.costPerKm)
  const tripsPerMonth = toNumber(data.tripsPerMonth, DEFAULT_TRIPS_PER_MONTH)
  const interestRate = toNumber(data.interestRate, DEFAULT_INTEREST_RATE)
  const numberOfPeople = toNumber(data.numberOfPeople, 1)

  // Guard against division by zero — no stay duration means no amortization,
  // not Infinity/NaN.
  const amortizedOneTime =
    stayMonths > 0 ? (brokerage + furnishing + moving + agreementCharges) / stayMonths : 0

  const depositOpportunityCost = (deposit * interestRate) / 12

  const commuteCost = commuteDistanceKm * costPerKm * tripsPerMonth

  const repairBuffer = rent * 0.08

  const trueMonthlyCost =
    rent +
    maintenance +
    parking +
    amortizedOneTime +
    depositOpportunityCost +
    commuteCost +
    utilities +
    repairBuffer

  const costPerPerson = trueMonthlyCost / (numberOfPeople || 1)

  return {
    trueMonthlyCost: round(trueMonthlyCost),
    costPerPerson: round(costPerPerson),
    breakdown: {
      rent: round(rent),
      maintenance: round(maintenance),
      parking: round(parking),
      amortizedOneTime: round(amortizedOneTime),
      depositOpportunityCost: round(depositOpportunityCost),
      commuteCost: round(commuteCost),
      utilities: round(utilities),
      repairBuffer: round(repairBuffer),
    },
  }
}
