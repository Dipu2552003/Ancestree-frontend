// Single source of truth for gotra → color mappings.
// Add new gotras to lib/familyOptions.json — no code changes required.
//
// Rule is currently: source-node's gotra colors the edge (edge mode) or
// the avatar (node mode). Swap the rule in PersonNode / SketchEdge /
// FamilyEdge without touching this file.

import familyOptions from '../familyOptions.json'

export interface GotraEntry {
  name:  string
  color: string
}

export const GOTRA_PALETTE: GotraEntry[] = familyOptions.gotras

const GOTRA_MAP = new Map<string, string>(
  GOTRA_PALETTE.map(g => [g.name.toLowerCase(), g.color]),
)

/** Returns the hex color for a gotra name, or null if unknown. Case-insensitive. */
export function gotraColor(gotra: string | null | undefined): string | null {
  if (!gotra) return null
  return GOTRA_MAP.get(gotra.toLowerCase()) ?? null
}

/** Darkens a hex color by `amount` (0–255) per channel for gradient bottom-stop. */
export function darkenHex(hex: string, amount = 40): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16)        - amount)
  const g = Math.max(0, ((n >> 8) & 0xFF) - amount)
  const b = Math.max(0, (n & 0xFF)        - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
