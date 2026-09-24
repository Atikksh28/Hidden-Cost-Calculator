'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WizardFooterProps {
  /** 0 = landing (footer hidden), 1-4 = the numbered steps. */
  currentStep: number
  onBack: () => void
  onNext: () => void
}

// Step -> "Continue" button label. Step 4 has no entry, so no Next button renders there.
const NEXT_LABEL: Record<number, string> = {
  1: 'Continue',
  2: 'Continue',
  3: 'See Results',
}

/**
 * Bottom nav footer for steps 1-4. Pure navigation chrome — just calls
 * onBack/onNext, no data handling.
 */
export function WizardFooter({ currentStep, onBack, onNext }: WizardFooterProps) {
  if (currentStep === 0) return null

  const nextLabel = NEXT_LABEL[currentStep]

  return (
    <div className="shrink-0 sticky bottom-0 z-40 border-t border-border bg-background py-4 px-4 sm:px-6 lg:px-8 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.15)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {nextLabel && (
          <Button onClick={onNext}>
            {nextLabel}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
