'use client'

import { useEffect, useState } from 'react'

export function useSectionVisibility(sectionRefs: Record<string, React.RefObject<HTMLElement>>) {
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find which section this element belongs to
            Object.entries(sectionRefs).forEach(([key, ref]) => {
              if (ref.current === entry.target) {
                setActiveSection(key)
              }
            })
          }
        })
      },
      {
        threshold: 0.3,
      }
    )

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => {
      Object.values(sectionRefs).forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current)
        }
      })
    }
  }, [sectionRefs])

  return activeSection
}
