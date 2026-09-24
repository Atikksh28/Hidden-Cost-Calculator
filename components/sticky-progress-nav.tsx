'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = [
  { id: 'properties', label: 'Add Properties', number: 1 },
  { id: 'profile', label: 'Your Profile', number: 2 },
  { id: 'costs', label: 'True Costs', number: 3 },
  { id: 'compare', label: 'Compare & Decide', number: 4 },
]

interface StickyProgressNavProps {
  activeSection: string
  onStepClick: (sectionId: string) => void
  showNav: boolean
}

export function StickyProgressNav({ activeSection, onStepClick, showNav }: StickyProgressNavProps) {
  const activeStepIndex = STEPS.findIndex((step) => step.id === activeSection)
  const activeStep = STEPS[activeStepIndex] || STEPS[0]

  const handlePrevious = () => {
    if (activeStepIndex > 0) {
      onStepClick(STEPS[activeStepIndex - 1].id)
    }
  }

  const handleNext = () => {
    if (activeStepIndex < STEPS.length - 1) {
      onStepClick(STEPS[activeStepIndex + 1].id)
    }
  }

  if (!showNav) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Desktop Stepper */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Button */}
                <button
                  onClick={() => onStepClick(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeSection === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="text-sm">Step {step.number}</span>
                  <span className="hidden sm:inline text-xs">{step.label}</span>
                </button>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-1 rounded transition-colors ${
                      activeStepIndex > index
                        ? 'bg-primary'
                        : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Stepper */}
        <div className="md:hidden flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={activeStepIndex === 0}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-foreground">
              Step {activeStep.number} of {STEPS.length}
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-primary">{activeStep.label}</span>
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={activeStepIndex === STEPS.length - 1}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}
