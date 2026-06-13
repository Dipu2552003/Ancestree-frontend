// Input normalization applied at the save boundary (NodePanel save, wizard
// create, signup). Users type names/places in any case ("ram kumar", "JAIPUR");
// we store them in a consistent shape so cards, search, and duplicate
// detection all see the same value.

/** Proper nouns — names, villages, cities, gotra: "rAm kumar" → "Ram Kumar".
 *  Capitalizes the first letter of every word (space- or hyphen-separated)
 *  and lowercases the rest. Collapses repeated whitespace. */
export function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\s-]+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/** Free text that may contain acronyms ("software engineer at TCS") — only
 *  the first letter is capitalized, the rest stays as typed. */
export function capFirst(s: string): string {
  const v = s.trim().replace(/\s+/g, ' ')
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v
}

/** Email addresses are case-insensitive — store lowercase. */
export function normEmail(s: string): string {
  return s.trim().toLowerCase()
}

/** Phone / WhatsApp: keep digits, "+", spaces and dashes; drop stray chars. */
export function normPhone(s: string): string {
  return s.trim().replace(/[^\d+\s-]/g, '').replace(/\s+/g, ' ')
}

/** Pincode: digits only. */
export function normDigits(s: string): string {
  return s.replace(/\D/g, '')
}
