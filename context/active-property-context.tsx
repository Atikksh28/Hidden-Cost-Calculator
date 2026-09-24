'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface Property {
  id: string | number
  name: string
}

interface ActivePropertyContextType {
  activeProperty: Property | null
  availableProperties: Property[]
  setActiveProperty: (property: Property | null) => void
  setAvailableProperties: (properties: Property[]) => void
}

const ActivePropertyContext = createContext<ActivePropertyContextType | undefined>(undefined)

export function ActivePropertyProvider({ children }: { children: ReactNode }) {
  const [activeProperty, setActiveProperty] = useState<Property | null>(null)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])

  return (
    <ActivePropertyContext.Provider
      value={{
        activeProperty,
        availableProperties,
        setActiveProperty,
        setAvailableProperties,
      }}
    >
      {children}
    </ActivePropertyContext.Provider>
  )
}

export function useActiveProperty() {
  const context = useContext(ActivePropertyContext)
  if (context === undefined) {
    throw new Error('useActiveProperty must be used within ActivePropertyProvider')
  }
  return context
}
