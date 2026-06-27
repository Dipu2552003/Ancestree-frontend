'use client'

import { useState, useEffect } from 'react'

/** Counts whole seconds elapsed while `active` is true, resetting to 0 each
 *  time `active` transitions to true. Used to reassure users during slow
 *  cold-start requests (Render spin-up) that the app is still working. */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!active) return
    setSeconds(0)
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  return seconds
}
