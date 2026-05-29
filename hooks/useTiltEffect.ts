'use client'

import { useCallback } from 'react'
import { useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

interface TiltEffectReturn {
  rotateX: MotionValue<number>
  rotateY: MotionValue<number>
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseLeave: () => void
}

export function useTiltEffect(): TiltEffectReturn {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 50, damping: 18 })
  const springY = useSpring(rawY, { stiffness: 50, damping: 18 })
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    rawX.set((e.clientX - rect.left) / rect.width - 0.5)
    rawY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [rawX, rawY])

  const handleMouseLeave = useCallback(() => { rawX.set(0); rawY.set(0) }, [rawX, rawY])

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave }
}
