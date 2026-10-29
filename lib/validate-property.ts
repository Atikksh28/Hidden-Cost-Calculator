import type { CustomProperty } from '../components/add-property-form'
import type { TrueCostBreakdown } from './calculate-true-cost'

/**
 * One shared definition of what a valid property looks like. Used by the add/edit form (via the
 * storage layer), localStorage loading, guest-to-account migration and the extraction route, so
 * they can't drift apart. The database check constraints (supabase/security.sql) mirror these.
 * Client-side checks are UX only; this runs again wherever data is stored or loaded.
 */

export const MAX_MONEY = 10_000_000
export const MAX_TOTAL = 1_000_000_000
export const LIMITS = {
  stayMonths: { min: 1, max: 120 },
  numberOfPeople: { min: 1, max: 20 },
  commuteDistanceKm: { min: 0, max: 500 },
  costPerKm: { min: 0, max: 1000 },
  carpetAreaSqft: { min: 0, max: 100_000 },
  bhk: { min: 0, max: 20 },
  nameLength: 100,
  locationLength: 60,
} as const

/** Most properties a guest can keep in localStorage (more than the 12 the UI allows, as slack). */
export const MAX_LOCAL_PROPERTIES = 20

// C0 controls and DEL, except tab/newline/CR.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function cleanText(value: string, max: number): string {
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max)
}

type NumSpec = { label: string; min: number; max: number; nullable: boolean }

const money = (label: string, nullable = true): NumSpec => ({ label, min: 0, max: MAX_MONEY, nullable })

const NUMBER_FIELDS: Record<string, NumSpec> = {
  rent: money('Rent'),
  maintenance: money('Maintenance'),
  parking: money('Parking'),
  commute: money('Commute'),
  schoolTransport: money('School transport'),
  furnishing: money('Furnishing'),
  repairs: money('Repairs'),
  additionalCharges: money('Additional charges'),
  registration: money('Registration / agreement charges'),
  deposit: money('Deposit'),
  brokerage: money('Brokerage'),
  moving: money('Moving cost'),
  utilities: money('Utilities'),
  costPerPerson: { label: 'Cost per person', min: 0, max: MAX_TOTAL, nullable: true },
  stayMonths: { label: 'Stay duration (months)', ...LIMITS.stayMonths, nullable: true },
  costPerKm: { label: 'Cost per km', ...LIMITS.costPerKm, nullable: true },
  commuteDistanceKm: { label: 'Commute distance (km)', ...LIMITS.commuteDistanceKm, nullable: true },
  numberOfPeople: { label: 'Number of people', ...LIMITS.numberOfPeople, nullable: true },
  carpetAreaSqft: { label: 'Carpet area (sq ft)', ...LIMITS.carpetAreaSqft, nullable: true },
  bhk: { label: 'BHK', ...LIMITS.bhk, nullable: true },
}

const BREAKDOWN_KEYS: (keyof TrueCostBreakdown)[] = [
  'rent',
  'maintenance',
  'parking',
  'amortizedOneTime',
  'depositOpportunityCost',
  'commuteCost',
  'utilities',
  'repairBuffer',
]

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function parseBreakdown(raw: unknown): TrueCostBreakdown | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  const out: Partial<TrueCostBreakdown> = {}
  for (const key of BREAKDOWN_KEYS) {
    const v = obj[key]
    if (!isFiniteNumber(v) || v < 0 || v > MAX_TOTAL) return null
    out[key] = v
  }
  return out as TrueCostBreakdown
}

export type PropertyCheck = { ok: true; value: CustomProperty } | { ok: false; error: string }

/**
 * Validates untrusted data (localStorage, a form, a migration) and returns a brand-new object that
 * contains only the known fields — nothing from the input is spread. The error names the first bad field.
 */
export function checkProperty(raw: unknown): PropertyCheck {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: 'Not a property' }
  const obj = raw as Record<string, unknown>

  if (typeof obj.id !== 'string' || !/^[\w-]{1,64}$/.test(obj.id)) return { ok: false, error: 'Invalid id' }
  if (obj.type !== 'Rent' && obj.type !== 'EMI') return { ok: false, error: 'Invalid property type' }
  if (typeof obj.name !== 'string') return { ok: false, error: 'Property name is required' }
  if (obj.name.trim().length === 0) return { ok: false, error: 'Property name is required' }
  if (obj.name.length > LIMITS.nameLength) return { ok: false, error: `Property name must be ${LIMITS.nameLength} characters or fewer` }
  const location = typeof obj.location === 'string' ? obj.location : ''
  if (location.length > LIMITS.locationLength) return { ok: false, error: `Location must be ${LIMITS.locationLength} characters or fewer` }
  if (!isFiniteNumber(obj.totalMonthly) || obj.totalMonthly < 0 || obj.totalMonthly > MAX_TOTAL) {
    return { ok: false, error: 'Total monthly cost is out of range' }
  }

  const nums: Record<string, number | null> = {}
  for (const [key, spec] of Object.entries(NUMBER_FIELDS)) {
    const v = obj[key]
    if (v === null || v === undefined) {
      nums[key] = null
      continue
    }
    if (!isFiniteNumber(v) || v < spec.min || v > spec.max) {
      return { ok: false, error: `${spec.label} must be between ${spec.min.toLocaleString('en-IN')} and ${spec.max.toLocaleString('en-IN')}` }
    }
    nums[key] = v
  }

  let breakdown: TrueCostBreakdown | null = null
  if (obj.trueCostBreakdown !== null && obj.trueCostBreakdown !== undefined) {
    breakdown = parseBreakdown(obj.trueCostBreakdown)
    if (!breakdown) return { ok: false, error: 'Cost breakdown is invalid' }
  }
  if (obj.type === 'Rent' && !breakdown) return { ok: false, error: 'Cost breakdown is missing' }

  return {
    ok: true,
    value: {
      id: obj.id,
      name: cleanText(obj.name, LIMITS.nameLength),
      location: cleanText(location, LIMITS.locationLength),
      type: obj.type,
      rent: nums.rent,
      maintenance: nums.maintenance,
      parking: nums.parking,
      commute: nums.commute,
      schoolTransport: nums.schoolTransport,
      furnishing: nums.furnishing,
      repairs: nums.repairs,
      additionalCharges: nums.additionalCharges,
      registration: nums.registration,
      totalMonthly: obj.totalMonthly,
      deposit: nums.deposit,
      brokerage: nums.brokerage,
      moving: nums.moving,
      utilities: nums.utilities,
      costPerPerson: nums.costPerPerson,
      trueCostBreakdown: breakdown,
      stayMonths: nums.stayMonths,
      costPerKm: nums.costPerKm,
      commuteDistanceKm: nums.commuteDistanceKm,
      numberOfPeople: nums.numberOfPeople,
      carpetAreaSqft: nums.carpetAreaSqft,
      bhk: nums.bhk,
    },
  }
}

/** Parses a stored array of properties: drops invalid entries, never throws, caps the count. */
export function parseStoredProperties(raw: unknown): CustomProperty[] {
  if (!Array.isArray(raw)) return []
  const out: CustomProperty[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (out.length >= MAX_LOCAL_PROPERTIES) break
    const result = checkProperty(item)
    if (result.ok && !seen.has(result.value.id)) {
      seen.add(result.value.id)
      out.push(result.value)
    }
  }
  return out
}

/** Clamps a number into [min, max], else null. For model output, where "out of range" means "don't prefill". */
export function inRangeOrNull(v: unknown, min: number, max: number): number | null {
  return isFiniteNumber(v) && v >= min && v <= max ? v : null
}
