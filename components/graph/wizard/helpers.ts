// Wizard-local helpers.

// ── Name helpers ──────────────────────────────────────────────────────────────
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function splitName(name: string): [string, string] {
  const p = name.trim().split(/\s+/)
  return [p[0] ?? '', p.slice(1).join(' ')]
}

// ── Visual helpers ────────────────────────────────────────────────────────────
// Gradient used on the polaroid avatar fallback when no photo is set.
export function avatarGrad(gender: string): [string, string] {
  if (gender === 'male')   return ['#4F86C6', '#2D5E9A']
  if (gender === 'female') return ['#C06FAE', '#9A4A8A']
  return ['#D97706', '#B45309']
}

// Caption colour under the avatar.
export function labelColor(gender: string): string {
  if (gender === 'male')   return '#4F86C6'
  if (gender === 'female') return '#C06FAE'
  return '#D97706'
}

// ── Slide animation ───────────────────────────────────────────────────────────
// Forward / back step transition. `dir` is +1 going forward, -1 going back.
export const slide = {
  enter:  (d: number) => ({ x: d > 0 ?  48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? -48 :  48, opacity: 0 }),
}
