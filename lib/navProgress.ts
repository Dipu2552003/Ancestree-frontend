// Tiny shared state for the top-of-page navigation progress bar. Anything that
// starts a route change (a link tap, router.push/replace/back) calls
// startNavProgress(); <NavProgress> finishes it when the URL actually changes.
//
// App Router has no router events, so this is the only way to show that a tap
// "took" while the next route loads — without it, mobile users see nothing
// happen for the whole fetch and tap again.

type Listener = (active: boolean) => void

let active = false
const listeners = new Set<Listener>()

function set(next: boolean) {
  if (active === next) return
  active = next
  listeners.forEach(l => l(next))
}

export function startNavProgress() { set(true) }
export function doneNavProgress()  { set(false) }

export function subscribeNavProgress(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** True when `href` resolves to a different page/query than the current one
 *  (a hash-only change, or the same URL, never completes a navigation). */
export function isRealNavigation(href: string): boolean {
  try {
    const next = new URL(href, window.location.href)
    if (next.origin !== window.location.origin) return false
    return next.pathname !== window.location.pathname || next.search !== window.location.search
  } catch {
    return false
  }
}
