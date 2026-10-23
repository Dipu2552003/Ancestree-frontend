'use client'

// Drop-in for next/navigation's useRouter that also drives the global
// navigation progress bar (see lib/navProgress.ts). Same API and type, so call
// sites only change their import.

import { useMemo } from 'react'
import { useRouter as useNextRouter } from 'next/navigation'
import { startNavProgress, isRealNavigation } from '@/lib/navProgress'

export function useRouter() {
  const router = useNextRouter()
  return useMemo<typeof router>(() => ({
    ...router,
    push: (href, options) => {
      if (isRealNavigation(href)) startNavProgress()
      router.push(href, options)
    },
    replace: (href, options) => {
      if (isRealNavigation(href)) startNavProgress()
      router.replace(href, options)
    },
    back: () => {
      // Only show progress when there is somewhere to go back to.
      if (window.history.length > 1) startNavProgress()
      router.back()
    },
  }), [router])
}
