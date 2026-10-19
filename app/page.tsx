'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { HeroSection } from '@/components/hero-section'
import { PropertyComparison } from '@/components/property-comparison'
import { ResultsView } from '@/components/results-view'
import { AffordabilityAnalysis } from '@/components/affordability-analysis'
import {
  ConversationalOnboarding,
  initialOnboardingData,
  type OnboardingData,
} from '@/components/conversational-onboarding'
import { WizardStepper } from '@/components/wizard-stepper'
import { WizardFooter } from '@/components/wizard-footer'
import { AddPropertyForm, type CustomProperty } from '@/components/add-property-form'
import { PropertyToggleBar } from '@/components/property-toggle-bar'
import { AuthWidget } from '@/components/auth-widget'
import { ThemeToggle } from '@/components/theme-toggle'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { ActivePropertyProvider, useActiveProperty } from '@/context/active-property-context'
import { hasBreakdown, resolveSelectedProperty } from '@/lib/breakdown'
import { getImportHostname, parseImportHash, IMPORT_HASH_PREFIX, type ImportedListing } from '@/lib/import-listing'
import { getSavedProperties, deleteSavedProperty, migrateLocalPropertiesToSupabase } from '@/lib/property-storage'

// 5-step wizard: 0 = landing/hero (no stepper/footer), 1-4 = the numbered steps.
const WIZARD_STEPS = [{ label: 'Lifestyle' }, { label: 'Profile' }, { label: 'Properties' }, { label: 'Results' }]
const LAST_STEP = WIZARD_STEPS.length // 4

function HomeContent() {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth()
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([])
  const [visiblePropertyIds, setVisiblePropertyIds] = useState<string[]>([])
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Listing text sent by the bookmarklet. Held in memory only: never saved, never auto-extracted.
  const [importedListing, setImportedListing] = useState<ImportedListing | null>(null)
  const importAutoOpenedRef = useRef(false)
  const [affordabilityRanges, setAffordabilityRanges] = useState<{
    safe: number
    stretch: number
  } | null>(null)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData)

  // Wizard navigation state — UI-only, no calculation/data logic here.
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  // Bookmarklet receiver (client only). Read the hash, clear it straight away so the payload
  // doesn't stay in the URL/history, then keep the validated result in state.
  useEffect(() => {
    if (!window.location.hash.startsWith(IMPORT_HASH_PREFIX)) return
    const parsed = parseImportHash(window.location.hash)
    history.replaceState(null, '', window.location.pathname + window.location.search)
    if (parsed && parsed.text.trim()) setImportedListing(parsed)
  }, [])

  // Once the user reaches Properties (after finishing onboarding normally), open Add Property
  // on the Paste tab. Still no extraction until they click the button.
  useEffect(() => {
    if (currentStep === 3 && importedListing && !importAutoOpenedRef.current) {
      importAutoOpenedRef.current = true
      setShowAddPropertyForm(true)
    }
  }, [currentStep, importedListing])

  const goNext = useCallback(() => {
    setDirection('forward')
    setCurrentStep((step) => Math.min(step + 1, LAST_STEP))
  }, [])

  const goBack = useCallback(() => {
    setDirection('backward')
    setCurrentStep((step) => Math.max(step - 1, 0))
  }, [])

  const handleAddProperty = (property: CustomProperty) => {
    setCustomProperties((prev) => [...prev, property])
    setImportedListing(null)
    // Only auto-select it for comparison if that doesn't exceed the 3-max cap
    // enforced in the sidebar — otherwise it's saved but not yet compared,
    // same as if you'd unchecked it.
    setVisiblePropertyIds((prev) => (prev.length < 3 ? [...prev, property.id] : prev))
  }

  const handleUpdateProperty = (updated: CustomProperty) => {
    setCustomProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleToggleVisibility = (id: string) => {
    setVisiblePropertyIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  const handleDeleteCustomProperty = (id: string) => {
    const property = customProperties.find((p) => p.id === id)
    // Optimistic UI update — the actual delete (Supabase or localStorage)
    // happens in the background; failures are logged, not rolled back.
    setCustomProperties((prev) => prev.filter((p) => p.id !== id))
    setVisiblePropertyIds((prev) => prev.filter((pid) => pid !== id))
    if (property) {
      deleteSavedProperty({ id: property.id, type: property.type }, user?.id ?? null)
    }
  }

  const handleAffordabilityUpdate = useCallback((ranges: { safe: number; stretch: number } | null) => {
    setAffordabilityRanges(ranges)
  }, [])

  const handleOnboardingComplete = useCallback((data: OnboardingData) => {
    setOnboardingData(data)
  }, [])

  // Load saved properties whenever the resolved auth state changes (initial
  // mount, sign-in, sign-out). On sign-in, first migrate any local Rent
  // properties into Supabase (no-op if there's nothing local to migrate —
  // migrated items are removed from localStorage as they succeed, so this
  // never double-migrates). On sign-out this just re-reads localStorage,
  // which always works, so logging out can't crash the properties view.
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const userId = user?.id ?? null

    async function sync() {
      if (userId) {
        await migrateLocalPropertiesToSupabase(userId)
      }
      const properties = await getSavedProperties(userId)
      if (!cancelled) {
        setCustomProperties(properties)
        setVisiblePropertyIds(properties.slice(0, 3).map((p) => p.id))
      }
    }

    sync()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // Results step: only properties with a real, calculated breakdown (custom Rent
  // properties) can be shown there. The demo properties and EMI properties have
  // none, so they don't get pills or bubbles — and the table and the bubble chart
  // below are both handed the one `selectedProperty` resolved here.
  const { activeProperty, setActiveProperty, setAvailableProperties } = useActiveProperty()
  const rentProperties = useMemo(() => customProperties.filter(hasBreakdown), [customProperties])
  const selectedProperty = useMemo(
    () => resolveSelectedProperty(rentProperties, activeProperty?.id),
    [rentProperties, activeProperty?.id]
  )

  useEffect(() => {
    setAvailableProperties(rentProperties.map((p) => ({ id: p.id, name: p.name })))
  }, [rentProperties, setAvailableProperties])

  // Keep the highlighted pill in step with what's actually shown (e.g. the
  // fallback to the latest property when nothing, or a deleted one, was picked).
  useEffect(() => {
    if (selectedProperty && activeProperty?.id !== selectedProperty.id) {
      setActiveProperty({ id: selectedProperty.id, name: selectedProperty.name })
    } else if (!selectedProperty && activeProperty) {
      setActiveProperty(null)
    }
  }, [selectedProperty, activeProperty, setActiveProperty])

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <HeroSection onGetStarted={goNext} />

      case 1:
        return <ConversationalOnboarding onComplete={handleOnboardingComplete} />

      case 2:
        return <AffordabilityAnalysis onAffordabilityUpdate={handleAffordabilityUpdate} />

      case 3:
        return (
          <div className="h-full flex flex-col md:flex-row gap-4 p-4 md:p-6">
            {/* Left sidebar: search, saved properties, add button */}
            <aside className="w-full md:w-72 shrink-0 md:h-full">
              <Card className="p-4 h-full max-h-64 md:max-h-none overflow-hidden">
                <PropertyToggleBar
                  allProperties={customProperties}
                  visiblePropertyIds={visiblePropertyIds}
                  onToggleVisibility={handleToggleVisibility}
                  onDeleteCustomProperty={handleDeleteCustomProperty}
                  onAddNew={() => setShowAddPropertyForm(true)}
                  customPropertyIds={customProperties.map((p) => p.id)}
                />
              </Card>
            </aside>

            {/* Right panel: side-by-side comparison cards, own independent scroll */}
            <div className="flex-1 min-h-0 min-w-0">
              <PropertyComparison
                customProperties={customProperties}
                visiblePropertyIds={visiblePropertyIds}
                affordabilityRanges={affordabilityRanges || undefined}
                onEdit={setEditingId}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <ResultsView property={selectedProperty} affordabilityRanges={affordabilityRanges || undefined} />
        )

      default:
        return null
    }
  }

  // Steps 1-3 lock the screen to one viewport (stepper + content + footer all
  // fit without the page itself scrolling). Steps 0 and 4 scroll normally —
  // the hero and the full results/comparison view are intentionally longer
  // than one screen.
  const isLockedStep = currentStep >= 1 && currentStep <= 3

  return (
    <main
      className={`bg-background flex flex-col ${isLockedStep ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-6 lg:px-8 py-2 border-b border-border">
        {isSupabaseConfigured && <AuthWidget />}
        <ThemeToggle />
      </div>

      {importedListing && currentStep < 3 && (
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-2 bg-primary/10 text-sm text-foreground border-b border-border">
          {/* Plain text only */}
          {`Listing imported from ${getImportHostname(importedListing.url) ?? 'a listing page'}. Finish setup, then add it in Properties.`}
        </div>
      )}

      <WizardStepper currentStep={currentStep} steps={WIZARD_STEPS} />

      <div
        key={currentStep}
        className={`${isLockedStep ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-1'} ${
          direction === 'forward' ? 'step-transition-forward' : 'step-transition-backward'
        }`}
      >
        {renderStepContent()}
      </div>

      <WizardFooter currentStep={currentStep} onBack={goBack} onNext={goNext} />

      {editingId && customProperties.find((p) => p.id === editingId) && (
        <AddPropertyForm
          key={editingId}
          editing={customProperties.find((p) => p.id === editingId)}
          onAdd={handleAddProperty}
          onUpdate={handleUpdateProperty}
          onClose={() => setEditingId(null)}
          onboardingData={onboardingData}
        />
      )}

      {showAddPropertyForm && (
        <AddPropertyForm
          onAdd={handleAddProperty}
          onClose={() => setShowAddPropertyForm(false)}
          onboardingData={onboardingData}
          imported={importedListing}
        />
      )}
    </main>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <ActivePropertyProvider>
        <HomeContent />
      </ActivePropertyProvider>
    </AuthProvider>
  )
}
