/**
 * Two-letter avatar initials for a full name.
 *  - Empty / whitespace → '?'
 *  - Single token → first two letters (e.g. "Rahul" → "RA")
 *  - Multiple tokens → first letter of first + first letter of last
 *
 * Replaces 10 near-identical inline copies across components. Always
 * uppercase.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
