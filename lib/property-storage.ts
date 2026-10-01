import { supabase } from '@/lib/supabase-client'
import type { CustomProperty } from '@/components/add-property-form'
import { calculateTrueCost } from '@/lib/calculate-true-cost'

const LOCAL_STORAGE_KEY = 'property-cost-calculator:properties'

// ---------------------------------------------------------------------------
// localStorage (guest properties — and the only home for EMI properties,
// even when logged in, since the `properties` table has no column for them)
// ---------------------------------------------------------------------------

export function readLocalProperties(): CustomProperty[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CustomProperty[]) : []
  } catch {
    return []
  }
}

function writeLocalProperties(properties: CustomProperty[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(properties))
  } catch {
    // Storage full/unavailable/private-mode — fail silently; in-memory state
    // for this session still works, it just won't survive a refresh.
  }
}

// ---------------------------------------------------------------------------
// Supabase `properties` row <-> CustomProperty mapping
// ---------------------------------------------------------------------------

interface PropertyRow {
  id: string
  property_name: string | null
  city: string | null
  rent: number | null
  maintenance: number | null
  parking: number | null
  deposit: number | null
  brokerage: number | null
  furnishing: number | null
  moving: number | null
  agreement_charges: number | null
  utilities: number | null
  stay_months: number | null
  cost_per_km: number | null
  commute_distance_km: number | null
  number_of_people: number | null
  true_monthly_cost: number | null
  cost_per_person: number | null
  carpet_area_sqft: number | null
  bhk: number | null
}

/**
 * Reconstructs a full CustomProperty (including the itemized breakdown) from
 * a Supabase row. `totalMonthly`/`costPerPerson` always come straight from
 * the stored columns (authoritative). The breakdown's individual lines are
 * recomputed via the same calculateTrueCost() used everywhere else — no calc
 * logic duplicated — from the stored inputs, including `utilities`, so the
 * breakdown sums back to the stored total. Rows saved before the `utilities`
 * column existed read back as 0 (the column default), which is correct for
 * them: nothing was ever stored.
 */
function rowToProperty(row: PropertyRow): CustomProperty {
  const result = calculateTrueCost({
    rent: row.rent ?? 0,
    maintenance: row.maintenance ?? 0,
    parking: row.parking ?? 0,
    deposit: row.deposit ?? 0,
    brokerage: row.brokerage ?? 0,
    furnishing: row.furnishing ?? 0,
    moving: row.moving ?? 0,
    agreementCharges: row.agreement_charges ?? 0,
    utilities: row.utilities ?? 0,
    stayMonths: row.stay_months ?? 0,
    commuteDistanceKm: row.commute_distance_km ?? 0,
    costPerKm: row.cost_per_km ?? 0,
    numberOfPeople: row.number_of_people ?? 1,
  })

  return {
    id: row.id,
    name: row.property_name ?? '',
    location: row.city ?? '',
    type: 'Rent',
    rent: row.rent,
    maintenance: row.maintenance,
    parking: row.parking,
    commute: null,
    schoolTransport: null,
    furnishing: row.furnishing,
    repairs: null,
    additionalCharges: null,
    registration: row.agreement_charges,
    totalMonthly: row.true_monthly_cost ?? result.trueMonthlyCost,
    deposit: row.deposit,
    brokerage: row.brokerage,
    moving: row.moving,
    utilities: row.utilities ?? 0,
    costPerPerson: row.cost_per_person ?? result.costPerPerson,
    trueCostBreakdown: result.breakdown,
    stayMonths: row.stay_months,
    costPerKm: row.cost_per_km,
    commuteDistanceKm: row.commute_distance_km,
    numberOfPeople: row.number_of_people,
    carpetAreaSqft: row.carpet_area_sqft,
    bhk: row.bhk,
  }
}

function propertyToInsertPayload(property: CustomProperty, userId: string) {
  return {
    user_id: userId,
    property_name: property.name,
    city: property.location,
    rent: property.rent,
    maintenance: property.maintenance,
    parking: property.parking,
    deposit: property.deposit,
    brokerage: property.brokerage,
    furnishing: property.furnishing,
    moving: property.moving,
    agreement_charges: property.registration,
    utilities: property.utilities ?? 0,
    stay_months: property.stayMonths,
    cost_per_km: property.costPerKm,
    commute_distance_km: property.commuteDistanceKm,
    number_of_people: property.numberOfPeople,
    true_monthly_cost: property.totalMonthly,
    cost_per_person: property.costPerPerson,
    carpet_area_sqft: property.carpetAreaSqft,
    bhk: property.bhk,
  }
}

// ---------------------------------------------------------------------------
// Public API — every call site branches on `userId` this way, not on
// checking `supabase` directly, so the guest path is always the fallback.
// ---------------------------------------------------------------------------

/**
 * Logged in: Supabase Rent properties, merged with any EMI properties still
 * sitting in localStorage (EMI has no column in this schema, so it never
 * leaves localStorage — but it must not silently disappear once you log in).
 * Guest: localStorage only.
 */
export async function getSavedProperties(userId: string | null): Promise<CustomProperty[]> {
  const local = readLocalProperties()

  if (userId && supabase) {
    const { data, error } = await supabase.from('properties').select('*').eq('user_id', userId)
    if (error) {
      console.error('[property-storage] failed to fetch properties from Supabase:', error.message)
      // Don't lose access to local EMI properties just because the network call failed.
      return local.filter((p) => p.type === 'EMI')
    }
    const cloudProperties = (data as PropertyRow[]).map(rowToProperty)
    const localEmiProperties = local.filter((p) => p.type === 'EMI')
    return [...cloudProperties, ...localEmiProperties]
  }

  return local
}

/**
 * Rent property + logged in -> Supabase insert, returns the row with its
 * real uuid. Everything else (EMI, or not logged in) -> localStorage,
 * returns the property unchanged.
 */
export async function saveProperty(property: CustomProperty, userId: string | null): Promise<CustomProperty> {
  if (userId && supabase && property.type === 'Rent') {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyToInsertPayload(property, userId))
      .select()
      .single()

    if (!error && data) {
      return rowToProperty(data as PropertyRow)
    }
    console.error('[property-storage] Supabase insert failed, falling back to localStorage:', error?.message)
    // Fall through to localStorage so the user's data isn't lost.
  }

  writeLocalProperties([...readLocalProperties(), property])
  return property
}

/** Mirrors saveProperty's branching: Rent + logged in -> Supabase, else -> localStorage. */
export async function deleteSavedProperty(property: { id: string; type: 'Rent' | 'EMI' }, userId: string | null): Promise<void> {
  if (userId && supabase && property.type === 'Rent') {
    const { error } = await supabase.from('properties').delete().eq('id', property.id)
    if (error) {
      console.error('[property-storage] Supabase delete failed:', error.message)
    }
    return
  }
  writeLocalProperties(readLocalProperties().filter((p) => p.id !== property.id))
}

/**
 * One-time migration, run when a guest with local properties logs in for
 * the first time: their local Rent properties get inserted into Supabase,
 * then removed from localStorage (to avoid duplicates on future fetches).
 * EMI properties are left in localStorage untouched — they have no home in
 * Supabase. Best-effort: a property that fails to migrate stays in
 * localStorage rather than being lost.
 */
export async function migrateLocalPropertiesToSupabase(userId: string): Promise<void> {
  if (!supabase) return
  const local = readLocalProperties()
  const localRent = local.filter((p) => p.type === 'Rent')
  if (localRent.length === 0) return

  const migratedIds: string[] = []
  for (const property of localRent) {
    const { error } = await supabase.from('properties').insert(propertyToInsertPayload(property, userId))
    if (error) {
      console.error('[property-storage] migration failed for', property.name, error.message)
      continue
    }
    migratedIds.push(property.id)
  }

  if (migratedIds.length > 0) {
    writeLocalProperties(local.filter((p) => !migratedIds.includes(p.id)))
  }
}
