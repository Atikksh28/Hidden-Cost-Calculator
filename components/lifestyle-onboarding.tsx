'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Car, MapPin, Users, ParkingCircle, ShoppingBag, Users2 } from 'lucide-react'

const questions = [
  {
    id: 'commute_method',
    icon: Car,
    question: 'How do you usually get to work?',
    type: 'options',
    options: ['Drive myself', 'Public transport', 'Work from home', 'Mix of both'],
  },
  {
    id: 'workplace_distance',
    icon: MapPin,
    question: 'How far is your workplace from where you\'re looking?',
    type: 'slider',
    sliderStops: ['Under 5km', '5–15km', '15–30km', '30km+'],
  },
  {
    id: 'children_school',
    icon: Users,
    question: 'Do you have children in school?',
    type: 'options',
    options: ['Yes, primary school', 'Yes, secondary school', 'Planning to', 'No'],
  },
  {
    id: 'parking_importance',
    icon: ParkingCircle,
    question: 'How important is having parking at home?',
    type: 'options',
    options: ['Essential (I have a car)', 'Nice to have', 'Not needed'],
  },
  {
    id: 'food_delivery_frequency',
    icon: ShoppingBag,
    question: 'How often do you order food or groceries online?',
    type: 'options',
    options: ['Daily', 'A few times a week', 'Rarely'],
  },
  {
    id: 'household_help',
    icon: Users2,
    question: 'Do you employ any household help? (cook, maid, driver)',
    type: 'options',
    options: ['Yes, full-time', 'Yes, part-time', 'No, but planning to', 'No'],
  },
]

export function LifestyleOnboarding() {
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [currentStep, setCurrentStep] = useState(0)

  const handleAnswer = (questionId: string, answer: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentQuestion = questions[currentStep]
  const CurrentIcon = currentQuestion.icon
  const isAnswered = answers[currentQuestion.id] !== undefined
  const isSliderQuestion = currentQuestion.type === 'slider'
  const sliderValue = isSliderQuestion ? (answers[currentQuestion.id] as number) ?? 0 : null

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-foreground/5">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tell us about your lifestyle
          </h2>
          <p className="text-foreground/60 text-lg">
            Answer a few questions to customize your property analysis
          </p>
        </div>

        <Card className="p-8 md:p-12">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentStep + 1} of {questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx <= currentStep ? 'w-6 bg-primary' : 'w-4 bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CurrentIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground">{currentQuestion.question}</h3>
            </div>

            {/* Slider Question */}
            {isSliderQuestion ? (
              <div className="space-y-6">
                <input
                  type="range"
                  min="0"
                  max={currentQuestion.sliderStops.length - 1}
                  value={sliderValue}
                  onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm">
                  {currentQuestion.sliderStops.map((stop, idx) => (
                    <span
                      key={stop}
                      className={`text-center flex-1 font-medium transition-colors ${
                        sliderValue === idx
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stop}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* Options */
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                    className={`p-4 rounded-lg border-2 text-left transition-all font-medium ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-8 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isAnswered || currentStep === questions.length - 1}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {currentStep === questions.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>

          {/* Completed answers summary */}
          {Object.keys(answers).length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground mb-4">Your Answers</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(answers).map(([questionId, answer]) => {
                  let displayValue = answer
                  if (typeof answer === 'number') {
                    const question = questions.find((q) => q.id === questionId)
                    if (question && question.type === 'slider') {
                      displayValue = question.sliderStops[answer]
                    }
                  }
                  return (
                    <Badge key={questionId} variant="secondary" className="bg-primary/10 text-primary">
                      {displayValue}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}
