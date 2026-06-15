/**
 * Resolve a CSS custom property to its concrete value at runtime.
 *
 * Canvas 2D (ctx.fillStyle / strokeStyle) can't consume `var(--x)` strings — it
 * needs a real color. So canvas code reads the same theme tokens defined in
 * globals.css through this helper, keeping a single source of truth.
 *
 * `fallback` is returned during SSR / before first paint when the computed style
 * isn't available yet.
 */
export function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
