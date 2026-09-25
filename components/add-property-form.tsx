'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import type { OnboardingData } from '@/components/conversational-onboarding'
import {
  getStayMonths,
  getCostPerKm,
  getNumberOfPeople,
} from '@/lib/onboarding-mappings'
import { calculateTrueCost, type TrueCostBreakdown } from '@/lib/calculate-true-cost'
import { saveProperty } from '@/lib/property-storage'
import { useAuth } from '@/context/auth-context'

export interface CustomProperty {
  id: string
  name: string
  location: string
  type: 'Rent' | 'EMI'
  rent: number | null
  maintenance: number | null
  parking: number | null
  /** @deprecated Rent properties now derive commute cost from onboarding — this stays null for new Rent entries. Still used by the EMI path. */
  commute: number | null
  /** @deprecated Out of scope for the true-cost calculation. Still used by the EMI path. */
  schoolTransport: number | null
  furnishing: number | null
  /** @deprecated Rent properties now derive this from breakdown.repairBuffer — this stays null for new Rent entries. Still used by the EMI path. */
  repairs: number | null
  /** @deprecated Out of scope for the true-cost calculation. Still used by the EMI path. */
  additionalCharges: number | null
  /** One-time registration/stamp duty. For Rent properties this feeds `agreementCharges` in the true-cost calc. */
  registration: number | null
  totalMonthly: number
  // New fields — only populated for type === 'Rent' properties run through calculateTrueCost.
  deposit: number | null
  brokerage: number | null
  moving: number | null
  utilities: number | null
  costPerPerson: number | null
  trueCostBreakdown: TrueCostBreakdown | null
  // Onboarding-derived calc inputs, snapshotted at save time (Rent only) —
  // needed so a saved property is self-contained (matches the Supabase
  // `properties` table's stay_months/cost_per_km/commute_distance_km/
  // number_of_people columns) rather than depending on live onboarding state.
  stayMonths: number | null
  costPerKm: number | null
  commuteDistanceKm: number | null
  numberOfPeople: number | null
}

interface AddPropertyFormProps {
  onAdd: (property: CustomProperty) => void
  onClose: () => void
  /** The 6 onboarding answers — drives which Rent fields are required/hidden, and feeds the true-cost calc. */
  onboardingData: OnboardingData
}

/** Blank or invalid (NaN/negative) -> null, so callers can treat "not filled in" as a validation failure. */
function parseNonNegative(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function AddPropertyForm({ onAdd, onClose, onboardingData }: AddPropertyFormProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: 'Rent' as 'Rent' | 'EMI',
    rent: '',
    maintenance: '',
    parking: '',
    furnishing: '',
    registration: '',
    // Rent-only: per-property answers (NOT from onboarding, these differ for every property)
    parkingMode: '' as '' | 'included' | 'not_included' | 'not_needed',
    furnishingMode: '' as '' | 'furnished' | 'unfurnished',
    commuteDistanceKm: '',
    // Rent-only (new)
    deposit: '',
    brokerage: '',
    moving: '',
    utilities: '',
    // EMI-only (legacy, unchanged behavior)
    commute: '',
    schoolTransport: '',
    repairs: '',
    additionalCharges: '',
  })

  const isRent = formData.type === 'Rent'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmitEmi = async () => {
    // Unchanged from the original implementation — EMI/purchase properties
    // aren't modeled by calculateTrueCost yet (it assumes a security deposit,
    // not a mortgage). Left as-is until that's scoped out.
    const parsedData = {
      rent: formData.rent ? parseInt(formData.rent) : null,
      maintenance: formData.maintenance ? parseInt(formData.maintenance) : null,
      parking: formData.parking ? parseInt(formData.parking) : null,
      commute: formData.commute ? parseInt(formData.commute) : null,
      schoolTransport: formData.schoolTransport ? parseInt(formData.schoolTransport) : null,
      furnishing: formData.furnishing ? parseInt(formData.furnishing) : null,
      repairs: formData.repairs ? parseInt(formData.repairs) : null,
      additionalCharges: formData.additionalCharges ? parseInt(formData.additionalCharges) : null,
      registration: formData.registration ? parseInt(formData.registration) : null,
    }

    const totalMonthly =
      (parsedData.rent || 0) +
      (parsedData.maintenance || 0) +
      (parsedData.parking || 0) +
      (parsedData.commute || 0) +
      (parsedData.schoolTransport || 0) +
      (parsedData.furnishing || 0) +
      (parsedData.repairs || 0) +
      (parsedData.additionalCharges || 0) +
      (parsedData.registration || 0)

    if (totalMonthly === 0) {
      alert('Please enter at least one cost value')
      return
    }

    const newProperty: CustomProperty = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      location: formData.location || 'Unknown',
      type: 'EMI',
      ...parsedData,
      totalMonthly,
      deposit: null,
      brokerage: null,
      moving: null,
      utilities: null,
      costPerPerson: null,
      trueCostBreakdown: null,
      stayMonths: null,
      costPerKm: null,
      commuteDistanceKm: null,
      numberOfPeople: null,
    }

    // EMI always goes to localStorage regardless of login — the Supabase
    // schema has no column for it (see Step 1 audit).
    const saved = await saveProperty(newProperty, null)
    onAdd(saved)
    onClose()
  }

  const handleSubmitRent = async () => {
    const rent = formData.rent ? parseInt(formData.rent) : null
    const maintenance = formData.maintenance ? parseInt(formData.maintenance) : null
    const deposit = formData.deposit ? parseInt(formData.deposit) : null
    if (!formData.location.trim()) {
      alert('Location is required')
      return
    }
    if (rent === null) {
      alert('Rent is required')
      return
    }
    if (maintenance === null) {
      alert('Maintenance is required')
      return
    }
    if (deposit === null) {
      alert('Deposit is required')
      return
    }
    // Per-property answers, entered fresh on every property (never from onboarding).
    if (!formData.parkingMode) {
      alert('Select whether parking is included, not included, or not needed')
      return
    }
    let parking = 0 // "Included" and "Don't need it" both cost 0
    if (formData.parkingMode === 'not_included') {
      const cost = parseNonNegative(formData.parking)
      if (cost === null) {
        alert('Monthly parking cost is required when parking is not included')
        return
      }
      parking = cost
    }

    if (!formData.furnishingMode) {
      alert('Select whether the property is furnished or unfurnished')
      return
    }
    let furnishing = 0 // "Furnished" costs 0
    if (formData.furnishingMode === 'unfurnished') {
      const cost = parseNonNegative(formData.furnishing)
      if (cost === null) {
        alert('Furnishing/setup cost is required when the property is unfurnished')
        return
      }
      furnishing = cost
    }

    const commuteDistanceKm = parseNonNegative(formData.commuteDistanceKm)
    if (commuteDistanceKm === null) {
      alert('Commute distance (km) is required')
      return
    }

    // Brokerage defaults to this submission's rent value if left blank —
    // a one-time snapshot, not a live binding to the rent field.
    const brokerage = formData.brokerage ? parseInt(formData.brokerage) : rent
    const moving = formData.moving ? parseInt(formData.moving) : 0
    const utilities = formData.utilities ? parseInt(formData.utilities) : 0
    // Registration/Stamp Duty feeds agreementCharges in the calc.
    const agreementCharges = formData.registration ? parseInt(formData.registration) : 0

    const stayMonths = getStayMonths(onboardingData.stayDuration, onboardingData.stayDurationCustom)
    const costPerKm = getCostPerKm(onboardingData.commuteMethod)
    const numberOfPeople = getNumberOfPeople(onboardingData.occupancy, onboardingData.occupancyCustom)

    const result = calculateTrueCost({
      rent,
      maintenance,
      parking,
      deposit,
      brokerage,
      furnishing,
      moving,
      agreementCharges,
      utilities,
      stayMonths,
      commuteDistanceKm,
      costPerKm,
      numberOfPeople,
      // tripsPerMonth / interestRate intentionally omitted — calculateTrueCost applies its own defaults.
    })

    const newProperty: CustomProperty = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      location: formData.location,
      type: 'Rent',
      rent,
      maintenance,
      parking,
      commute: null,
      schoolTransport: null,
      furnishing,
      repairs: null,
      additionalCharges: null,
      registration: agreementCharges,
      totalMonthly: result.trueMonthlyCost,
      deposit,
      brokerage,
      moving,
      utilities,
      costPerPerson: result.costPerPerson,
      trueCostBreakdown: result.breakdown,
      stayMonths,
      costPerKm,
      commuteDistanceKm,
      numberOfPeople,
    }

    const saved = await saveProperty(newProperty, user?.id ?? null)
    onAdd(saved)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Property name is required')
      return
    }

    setIsSaving(true)
    try {
      if (formData.type === 'EMI') {
        await handleSubmitEmi()
      } else {
        await handleSubmitRent()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Add Custom Property</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Property Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Downtown Condo"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Location {isRent && '*'}</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, Bandra"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Property Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="Rent">Rent</option>
                <option value="EMI">EMI (Purchase)</option>
              </select>
            </div>

            {/* Cost Fields Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isRent ? 'Monthly Rent *' : 'Monthly EMI'}
                </label>
                <input
                  type="number"
                  name="rent"
                  value={formData.rent}
                  onChange={handleInputChange}
                  placeholder="₹"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Maintenance {isRent && '*'}</label>
                <input
                  type="number"
                  name="maintenance"
                  value={formData.maintenance}
                  onChange={handleInputChange}
                  placeholder="₹"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>

              {/* EMI keeps its plain numeric parking/furnishing inputs (legacy flat-sum model) */}
              {!isRent && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Parking</label>
                    <input
                      type="number"
                      name="parking"
                      value={formData.parking}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Furnishing</label>
                    <input
                      type="number"
                      name="furnishing"
                      value={formData.furnishing}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </>
              )}

              {isRent && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Parking *</label>
                    <select
                      name="parkingMode"
                      value={formData.parkingMode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="" disabled>Select…</option>
                      <option value="included">Included</option>
                      <option value="not_included">Not included</option>
                      <option value="not_needed">Don&apos;t need it</option>
                    </select>
                  </div>

                  {formData.parkingMode === 'not_included' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Monthly parking cost (₹) *</label>
                      <input
                        type="number"
                        name="parking"
                        min={0}
                        value={formData.parking}
                        onChange={handleInputChange}
                        placeholder="₹"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Furnishing *</label>
                    <select
                      name="furnishingMode"
                      value={formData.furnishingMode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="" disabled>Select…</option>
                      <option value="furnished">Furnished</option>
                      <option value="unfurnished">Unfurnished</option>
                    </select>
                  </div>

                  {formData.furnishingMode === 'unfurnished' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Furnishing/setup cost (₹, one-time) *</label>
                      <input
                        type="number"
                        name="furnishing"
                        min={0}
                        value={formData.furnishing}
                        onChange={handleInputChange}
                        placeholder="₹"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Commute distance from this property (km) *
                    </label>
                    <input
                      type="number"
                      name="commuteDistanceKm"
                      min={0}
                      step="any"
                      value={formData.commuteDistanceKm}
                      onChange={handleInputChange}
                      placeholder="km"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Deposit *</label>
                    <input
                      type="number"
                      name="deposit"
                      value={formData.deposit}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Brokerage <span className="text-muted-foreground font-normal">(defaults to 1x rent)</span>
                    </label>
                    <input
                      type="number"
                      name="brokerage"
                      value={formData.brokerage}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Moving Costs</label>
                    <input
                      type="number"
                      name="moving"
                      value={formData.moving}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Utilities Setup</label>
                    <input
                      type="number"
                      name="utilities"
                      value={formData.utilities}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </>
              )}

              {!isRent && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commute</label>
                    <input
                      type="number"
                      name="commute"
                      value={formData.commute}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">School Transport</label>
                    <input
                      type="number"
                      name="schoolTransport"
                      value={formData.schoolTransport}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Repairs</label>
                    <input
                      type="number"
                      name="repairs"
                      value={formData.repairs}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Additional Charges</label>
                    <input
                      type="number"
                      name="additionalCharges"
                      value={formData.additionalCharges}
                      onChange={handleInputChange}
                      placeholder="₹"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Registration / Stamp Duty / Agreement Charges
                </label>
                <input
                  type="number"
                  name="registration"
                  value={formData.registration}
                  onChange={handleInputChange}
                  placeholder="₹"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              {isSaving ? 'Adding…' : 'Add Property'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
