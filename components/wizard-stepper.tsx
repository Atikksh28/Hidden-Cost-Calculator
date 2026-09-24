'use client'

import { Check } from 'lucide-react'

export interface WizardStepperProps {
  /** 0 = landing (stepper hidden), 1-4 = the numbered steps below. */
  currentStep: number
  steps: { label: string }[]
}

/**
 * Top stepper bar for steps 1-4. Hidden on step 0 (landing/hero) — that step
 * has its own hero CTA instead. Pure UI: no calculation logic, no data.
 */
export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  if (currentStep === 0) return null

  return (
    <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center">
          {steps.map((step, idx) => {
            const stepNumber = idx + 1
            const isActive = stepNumber === currentStep
            const isCompleted = stepNumber < currentStep

            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                          ? 'border-primary text-primary ring-4 ring-primary/20'
                          : 'border-border text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block whitespace-nowrap ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${isCompleted ? 'bg-primary' : 'bg-border'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
