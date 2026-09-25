'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Clock, Navigation, Users } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types — `OnboardingData` is exported so it can be imported by
// lib/onboarding-mappings.ts, the property form, and the calculation function.
// ---------------------------------------------------------------------------

export type StayDurationAnswer = 'lt_1_year' | '1_2_years' | '2_3_years' | 'other'
export type CommuteMethodAnswer = 'walk_cycle' | 'public_transport' | 'two_wheeler' | 'car' | 'cab_pooled'
export type OccupancyAnswer = 'alone' | 'split_1' | 'split_2plus'

export interface OnboardingData {
  stayDuration: StayDurationAnswer | null
  /** Number of years, only populated when stayDuration === 'other' */
  stayDurationCustom: number | null
  commuteMethod: CommuteMethodAnswer | null
  occupancy: OccupancyAnswer | null
  /** Total people (including the user), only populated when occupancy === 'split_2plus' */
  occupancyCustom: number | null
}

export const initialOnboardingData: OnboardingData = {
  stayDuration: null,
  stayDurationCustom: null,
  commuteMethod: null,
  occupancy: null,
  occupancyCustom: null,
}

// ---------------------------------------------------------------------------
// Question configuration — exactly the 6 questions, in order. Any option can
// declare a `followUp` on its question to collect a numeric value instead of
// auto-advancing (used for the "Other" duration/distance escape hatches and
// the "2+ flatmates" headcount).
// ---------------------------------------------------------------------------

interface QuestionOption {
  value: string
  label: string
}

interface NumericFollowUp {
  /** The option value that triggers this follow-up. */
  forValue: string
  /** Which OnboardingData field the number is stored in. */
  fieldId: keyof OnboardingData
  label: string
  placeholder: string
  unit: string
}

interface QuestionConfig {
  id: keyof OnboardingData
  icon: ComponentType<{ className?: string }>
  question: string
  helper: string
  options: QuestionOption[]
  followUp?: NumericFollowUp
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 'stayDuration',
    icon: Clock,
    question: 'How long do you plan to stay here?',
    helper:
      'Determines the amortization window for one-time costs (deposit lock-in, brokerage, furnishing, moving).',
    options: [
      { value: 'lt_1_year', label: 'Less than 1 year' },
      { value: '1_2_years', label: '1–2 years' },
      { value: '2_3_years', label: '2–3 years' },
      { value: 'other', label: 'Other' },
    ],
    followUp: {
      forValue: 'other',
      fieldId: 'stayDurationCustom',
      label: 'Roughly how many years?',
      placeholder: 'e.g. 5',
      unit: 'years',
    },
  },
  {
    id: 'commuteMethod',
    icon: Navigation,
    question: 'How will you usually get to work from this place?',
    helper: 'Picks which commute cost model applies (fuel vs. transit pass vs. cab fares).',
    options: [
      { value: 'walk_cycle', label: 'Walk / cycle' },
      { value: 'public_transport', label: 'Public transport' },
      { value: 'two_wheeler', label: 'Own two-wheeler' },
      { value: 'car', label: 'Own car' },
      { value: 'cab_pooled', label: 'Cab or pooled ride' },
    ],
  },
  {
    id: 'occupancy',
    icon: Users,
    question: 'Will you be living alone or splitting this place?',
    helper: 'Lets you show a per-person true cost alongside the total, which matters for a renting-only tool.',
    options: [
      { value: 'alone', label: 'Living alone' },
      { value: 'split_1', label: 'Splitting with 1 flatmate' },
      { value: 'split_2plus', label: 'Splitting with 2+ flatmates' },
    ],
    followUp: {
      forValue: 'split_2plus',
      fieldId: 'occupancyCustom',
      label: 'How many people total, including you?',
      placeholder: 'e.g. 4',
      unit: 'people',
    },
  },
]

function optionLabel(q: QuestionConfig, value: string | null, customValue: number | null) {
  if (!value) return null
  const baseLabel = q.options.find((o) => o.value === value)?.label ?? value
  if (q.followUp && q.followUp.forValue === value && customValue != null) {
    return `${customValue} ${q.followUp.unit}`
  }
  return baseLabel
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ConversationalOnboardingProps {
  /** Fired once, when the 6th question is answered. STEP 4: intentionally NOT wired to any calculation. */
  onComplete?: (data: OnboardingData) => void
}

export function ConversationalOnboarding({ onComplete }: ConversationalOnboardingProps) {
  const [data, setData] = useState<OnboardingData>(initialOnboardingData)
  const [step, setStep] = useState(0)
  // The option value (e.g. 'other', 'split_2plus') currently awaiting its numeric follow-up.
  const [pendingFollowUpValue, setPendingFollowUpValue] = useState<string | null>(null)
  const [followUpDraft, setFollowUpDraft] = useState('')

  const totalSteps = QUESTIONS.length
  const isComplete = step >= totalSteps
  const question = !isComplete ? QUESTIONS[step] : null

  const goToStep = (index: number) => {
    setPendingFollowUpValue(null)
    setFollowUpDraft('')
    setStep(index)
  }

  const answerAndAdvance = (q: QuestionConfig, value: string, customValue: number | null = null) => {
    const next: OnboardingData = {
      ...data,
      [q.id]: value,
      ...(q.followUp ? { [q.followUp.fieldId]: value === q.followUp.forValue ? customValue : null } : {}),
    }
    setData(next)
    setPendingFollowUpValue(null)
    setFollowUpDraft('')

    const nextStep = step + 1
    setStep(nextStep)

    if (nextStep >= totalSteps) {
      onComplete?.(next)
    }
  }

  const handleOptionClick = (q: QuestionConfig, optionValue: string) => {
    if (q.followUp && q.followUp.forValue === optionValue) {
      setPendingFollowUpValue(optionValue)
      setFollowUpDraft('')
      return
    }
    answerAndAdvance(q, optionValue)
  }

  const handleFollowUpSubmit = (q: QuestionConfig) => {
    if (!q.followUp) return
    const parsed = Number(followUpDraft)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    answerAndAdvance(q, q.followUp.forValue, parsed)
  }

  const handleBack = () => {
    if (step === 0) return
    goToStep(step - 1)
  }

  const handleRestart = () => {
    setData(initialOnboardingData)
    goToStep(0)
  }

  const answeredQuestions = QUESTIONS.slice(0, Math.min(step, totalSteps))

  return (
    <section className="h-full flex flex-col py-2 md:py-3 px-4 sm:px-6 lg:px-8 bg-foreground/5">
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
        <div className="mb-2 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-0.5">
            Quick chat before we crunch the numbers
          </h2>
          <p className="text-foreground/60 text-xs md:text-sm">
            {QUESTIONS.length} quick questions — tap an answer and we&apos;ll move straight to the next one.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-2 shrink-0">
          {QUESTIONS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx < step ? 'bg-primary' : idx === step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Answered questions as compact chips, tap to edit */}
        {answeredQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
            {answeredQuestions.map((q, idx) => {
              const value = data[q.id] as string | null
              const customValue = q.followUp ? (data[q.followUp.fieldId] as number | null) : null
              const label = optionLabel(q, value, customValue)
              const Icon = q.icon
              return (
                <button
                  key={q.id}
                  onClick={() => goToStep(idx)}
                  title={q.question}
                  className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:border-primary/50 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate max-w-[10rem]">{label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Active question, centered in the remaining space */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {question && (
            <Card className="w-full p-4 md:p-5">
              <div className="flex items-center gap-3 mb-1.5">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <question.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Question {step + 1} of {totalSteps}
                  </p>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">{question.question}</h3>
                </div>
              </div>
              <p className="text-xs md:text-sm text-foreground/50 mb-3 md:pl-[3rem]">{question.helper}</p>

              <div className="grid grid-cols-1 gap-2">
                {question.options.map((option) => {
                  const isFollowUpTrigger = question.followUp?.forValue === option.value
                  const isPending = pendingFollowUpValue === option.value
                  return (
                    <div key={option.value}>
                      <button
                        onClick={() => handleOptionClick(question, option.value)}
                        className={`w-full py-2.5 px-3.5 rounded-lg border-2 text-left text-sm font-medium transition-all ${
                          option.value === 'other'
                            ? 'border-dashed border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary'
                            : isPending
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {option.label}
                      </button>

                      {isFollowUpTrigger && isPending && question.followUp && (
                        <div className="mt-2 p-3 rounded-lg border-2 border-primary/50 bg-primary/5 space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            {question.followUp.label}
                          </label>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              min={1}
                              autoFocus
                              value={followUpDraft}
                              placeholder={question.followUp.placeholder}
                              onChange={(e) => setFollowUpDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFollowUpSubmit(question)
                              }}
                            />
                            <span className="text-sm text-muted-foreground shrink-0">{question.followUp.unit}</span>
                          </div>
                          <Button
                            onClick={() => handleFollowUpSubmit(question)}
                            disabled={!followUpDraft || Number(followUpDraft) <= 0}
                            className="w-full"
                          >
                            Continue
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {step > 0 && (
                <div className="pt-2.5 mt-2.5 border-t border-border">
                  <Button variant="outline" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                </div>
              )}
            </Card>
          )}

          {isComplete && (
            <Card className="w-full p-5 md:p-6 border-primary/30 bg-primary/5">
              <h3 className="text-xl font-semibold text-foreground mb-2">All set</h3>
              <p className="text-sm text-foreground/60 mb-6">
                We&apos;ve stored your answers. Tap any question above to change it.
              </p>
              <Button variant="outline" onClick={handleRestart}>
                Start over
              </Button>
            </Card>
          )}
        </div>
      </div>
    </section>
  )
}
