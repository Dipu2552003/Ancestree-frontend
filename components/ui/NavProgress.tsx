'use client'

// Global navigation feedback, mounted once in the root layout:
//   • a thin progress bar across the top the moment a navigation starts;
//   • a small "Loading…" chip if the next route takes longer than a beat
//     (slow mobile networks / a cold backend), so a tap never looks ignored.
// Starts on any same-origin link tap (captured here) and on router calls made
// through hooks/useAppRouter; finishes when the URL actually changes.
//
// Also registers a no-op touchstart listener — iOS Safari only applies CSS
// :active (our pressed state in globals.css) when one exists.

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  startNavProgress, doneNavProgress, subscribeNavProgress, isRealNavigation,
} from '@/lib/navProgress'

const SLOW_MS   = 450     // show the chip only for navigations slower than this
const GIVE_UP_MS = 15_000 // never leave the bar stuck (e.g. a push to the same URL)

export default function NavProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [slow, setSlow] = useState(false)
  // After landing, keep the bar briefly in a "finishing" state so it visibly
  // completes to 100% and fades instead of vanishing mid-way.
  const [finishing, setFinishing] = useState(false)

  // URL changed → whatever navigation was in flight has landed.
  useEffect(() => { doneNavProgress() }, [pathname, searchParams])

  useEffect(() => subscribeNavProgress(next => {
    setActive(next)
    setFinishing(!next)
  }), [])

  useEffect(() => {
    if (!finishing) return
    const id = setTimeout(() => setFinishing(false), 500)
    return () => clearTimeout(id)
  }, [finishing])

  useEffect(() => {
    if (!active) return
    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS)
    const giveUp = setTimeout(doneNavProgress, GIVE_UP_MS)
    return () => { clearTimeout(slowTimer); clearTimeout(giveUp); setSlow(false) }
  }, [active])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      if (isRealNavigation(a.href)) startNavProgress()
    }
    // Returning via the back/forward cache restores the old page as it was —
    // including a bar that was showing when it was left.
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) doneNavProgress() }
    const noop = () => {}
    document.addEventListener('click', onClick, true)
    document.addEventListener('touchstart', noop, { passive: true })
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('touchstart', noop)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className="nav-progress-bar"
        data-state={active ? 'loading' : finishing ? 'finishing' : undefined}
      />
      {slow && (
        <div role="status" aria-live="polite" className="nav-progress-chip">
          <span className="nav-progress-spinner" aria-hidden="true" />
          Loading…
        </div>
      )}
    </>
  )
}
