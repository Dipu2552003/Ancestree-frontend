// Session helpers for the logged-in user's identity.
//
// The source of truth is the JWT stored under the "at" key (set on login /
// signup / refresh — see lib/api/client.ts → setToken). Its payload carries
// `userId` and `familyId`, and it is re-issued with the new familyId after a
// merge moves the user to another family (useGraphData's stale-JWT recovery),
// so decoding it always reflects the user's *current* family.
//
// A legacy "user" record (JSON user object) is kept as a fallback read for
// older sessions; nothing writes it anymore.

interface JwtClaims {
  userId?:      string
  familyId?:    string
  communityId?: string | null
}

function decodeJwtClaims(): JwtClaims | null {
  try {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('at')
    const payload = token?.split('.')[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as JwtClaims
  } catch { return null }
}

function legacyUserField(key: 'person_id' | 'family_id'): string | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!raw) return null
    return (JSON.parse(raw) as Record<string, string | undefined>)[key] ?? null
  } catch { return null }
}

/** The user's current family — from the live JWT, falling back to the legacy
 *  stored user record. */
export function getFamilyId(): string | null {
  return decodeJwtClaims()?.familyId ?? legacyUserField('family_id')
}

/** The user's own person node id. Not carried in the JWT — callers should
 *  fall back to `api.auth.me()` when this returns null. */
export function getSelfPersonId(): string | null {
  return legacyUserField('person_id')
}

/** The community this session belongs to — null for normal (non-community)
 *  logins. Set by community login/signup tokens. */
export function getCommunityId(): string | null {
  return decodeJwtClaims()?.communityId ?? null
}

/** The slug of the community this session belongs to, if any. Written by
 *  community login/signup (see community/[slug]/page.tsx) and cleared on sign-out. */
export function getCommunitySlug(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('community_slug') : null
  } catch { return null }
}
