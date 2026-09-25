'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { HeroSection } from '@/components/hero-section'
import { PropertyComparison } from '@/components/property-comparison'
import { CostBreakdown } from '@/components/cost-breakdown'
import { AffordabilityAnalysis } from '@/components/affordability-analysis'
import {
  ConversationalOnboarding,
  initialOnboardingData,
  type OnboardingData,
} from '@/components/conversational-onboarding'
import { TrueCostSummary } from '@/components/true-cost-summary'
import { WizardStepper } from '@/components/wizard-stepper'
import { WizardFooter } from '@/components/wizard-footer'
import { AddPropertyForm, type CustomProperty } from '@/components/add-property-form'
import { PropertyToggleBar } from '@/components/property-toggle-bar'
import { AuthWidget } from '@/components/auth-widget'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { ActivePropertyProvider, useActiveProperty, type Property } from '@/context/active-property-context'
import { getSavedProperties, deleteSavedProperty, migrateLocalPropertiesToSupabase } from '@/lib/property-storage'

// 5-step wizard: 0 = landing/hero (no stepper/footer), 1-4 = the numbered steps.
const WIZARD_STEPS = [{ label: 'Lifestyle' }, { label: 'Profile' }, { label: 'Properties' }, { label: 'Results' }]
const LAST_STEP = WIZARD_STEPS.length // 4

function HomeContent() {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth()
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([])
  const [visiblePropertyIds, setVisiblePropertyIds] = useState<string[]>(['1', '2', '3'])
  const [deletedDefaultPropertyIds, setDeletedDefaultPropertyIds] = useState<string[]>([])
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false)
  const [affordabilityRanges, setAffordabilityRanges] = useState<{
    safe: number
    stretch: number
  } | null>(null)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData)

  // Wizard navigation state — UI-only, no calculation/data logic here.
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

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
    // Only auto-select it for comparison if that doesn't exceed the 3-max cap
    // enforced in the sidebar — otherwise it's saved but not yet compared,
    // same as if you'd unchecked it.
    setVisiblePropertyIds((prev) => (prev.length < 3 ? [...prev, property.id] : prev))
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

  const handleDeleteProperty = (id: string) => {
    // Permanently delete default properties by marking them as deleted
    setDeletedDefaultPropertyIds((prev) => [...prev, id])
    setVisiblePropertyIds((prev) => prev.filter((pid) => pid !== id))
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
      if (!cancelled) setCustomProperties(properties)
    }

    sync()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // Update available properties in context
  const { setAvailableProperties } = useActiveProperty()

  useEffect(() => {
    // All properties are available for selection, regardless of visibility in comparison
    const availableProps: Property[] = [
      { id: '1', name: 'Bandra Apartment' },
      { id: '2', name: 'Powai Rental' },
      { id: '3', name: 'Andheri Purchase' },
      ...customProperties.map((cp) => ({ id: cp.id, name: cp.name })),
    ]

    setAvailableProperties(availableProps)
  }, [customProperties, setAvailableProperties])

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
                  allProperties={[
                    { id: 1, name: 'Bandra Apartment' },
                    { id: 2, name: 'Powai Rental' },
                    { id: 3, name: 'Andheri Purchase' },
                    ...customProperties,
                  ].filter((p) => !deletedDefaultPropertyIds.includes(p.id.toString()))}
                  visiblePropertyIds={visiblePropertyIds}
                  onToggleVisibility={handleToggleVisibility}
                  onDeleteCustomProperty={handleDeleteCustomProperty}
                  onDeleteProperty={handleDeleteProperty}
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
              />
            </div>
          </div>
        )

      case 4:
        return (
          <>
            <CostBreakdown />
            <TrueCostSummary
              customProperties={customProperties}
              affordabilityRanges={affordabilityRanges || undefined}
            />
          </>
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
      {isSupabaseConfigured && (
        <div className="shrink-0 flex justify-end px-4 sm:px-6 lg:px-8 py-2 border-b border-border">
          <AuthWidget />
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

      {showAddPropertyForm && (
        <AddPropertyForm
          onAdd={handleAddProperty}
          onClose={() => setShowAddPropertyForm(false)}
          onboardingData={onboardingData}
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
