'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(targetValue: number, duration: number = 1200, shouldStart: boolean = true) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!shouldStart) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOutQuad = 1 - (1 - progress) * (1 - progress)
      const currentValue = Math.floor(targetValue * easeOutQuad)

      setCount(currentValue)
      countRef.current = currentValue

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetValue, duration, shouldStart])

  return count
}
