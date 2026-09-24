'use client'

import React from 'react'
import { useActiveProperty, type Property } from '@/context/active-property-context'

export function PropertyPillSelector() {
  const { activeProperty, availableProperties, setActiveProperty } = useActiveProperty()

  if (availableProperties.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col items-center gap-4 mb-8">
      <p className="text-center text-lg text-foreground/70 italic">
        One property, all its secrets. Pick one to zoom in:
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {availableProperties.map((property) => (
          <button
            key={property.id}
            onClick={() => setActiveProperty(property)}
            className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
              activeProperty?.id === property.id
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary/30 text-foreground hover:bg-secondary/50'
            }`}
          >
            {property.name}
          </button>
        ))}
      </div>
    </div>
  )
}
