// NodePanel draft state — a flat record mirroring PersonData but with all
// string fields (so they bind cleanly to <input> values). The orchestrator
// owns the draft; this module owns the conversion to and from it.
//
// Full name is never edited directly: it is composed from first + middle +
// last. Birth/death years are never edited directly: they derive from the
// date fields (falling back to a stored year for legacy rows with no date).

import type { PersonData, SavePayload } from '@/types'
import { str } from './helpers'
import { titleCase, capFirst, normEmail, normPhone, normDigits } from '@/lib/format/normalize'

/** first + middle + last → "First Middle Last" (skipping empty parts). */
export function composeFullName(d: { firstName: string; middleName: string; lastName: string }): string {
  return [d.firstName, d.middleName, d.lastName].map(s => s.trim()).filter(Boolean).join(' ')
}

// Legacy rows were created with a single full_name and empty parts. Split so
// the three name fields are populated when the panel opens: first word →
// first, last word → last, anything between → middle.
function splitLegacyName(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] ?? '', middleName: '', lastName: '' }
  return {
    firstName:  parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName:   parts[parts.length - 1],
  }
}

// DATE columns come back from the API as full ISO timestamps; <input type="date">
// needs plain YYYY-MM-DD.
function toDateInputValue(v: string | undefined | null): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

/** Year derived from a YYYY-MM-DD value; empty string when not derivable. */
function yearFromDate(date: string): string {
  const yr = parseInt(date.slice(0, 4))
  return date.length >= 4 && !isNaN(yr) && yr >= 1000 && yr <= 2099 ? String(yr) : ''
}

export function initDraft(d: PersonData) {
  const hasParts = Boolean(d.firstName || d.middleName || d.lastName)
  const nameParts = hasParts
    ? { firstName: d.firstName ?? '', middleName: d.middleName ?? '', lastName: d.lastName ?? '' }
    : splitLegacyName(d.fullName ?? '')

  return {
    ...nameParts,
    nickname:          d.nickname ?? '',
    gender:            d.gender ?? '',
    gotra:             d.gotra ?? '',
    religion:          d.religion ?? '',

    birthDate:         toDateInputValue(d.birthDate),
    // Hidden — derived from birthDate; retained for legacy rows that only have a year.
    birthYear:         d.birthYear ? String(d.birthYear) : '',
    birthPlace:        d.birthPlace ?? '',
    isDeceased:        Boolean(d.isDeceased),
    deathDate:         toDateInputValue(d.deathDate),
    deathYear:         d.deathYear ? String(d.deathYear) : '',
    deathPlace:        d.deathPlace ?? '',

    phone:             d.phone ?? '',
    whatsapp:          d.whatsapp ?? '',
    email:             d.email ?? '',

    currentAddress:    d.currentAddress ?? '',
    currentCity:       d.currentCity ?? '',
    currentState:      d.currentState ?? '',
    currentCountry:    d.currentCountry ?? '',
    currentPincode:    d.currentPincode ?? '',

    nativeVillage:     d.nativeVillage ?? '',
    nativeTehsil:      d.nativeTehsil ?? '',
    nativeDistrict:    d.nativeDistrict ?? '',
    nativeState:       d.nativeState ?? '',
    nativeCountry:     d.nativeCountry ?? '',

    occupation:        d.occupation ?? '',
    occupationDetail:  d.occupationDetail ?? '',
    education:         d.education ?? '',
    bio:               d.bio ?? '',

    photoUrl:          d.photoUrl as string | undefined,
    photoThumbnailUrl: d.photoThumbnailUrl as string | undefined,
  }
}

export type Draft = ReturnType<typeof initDraft>

// Diff a draft against the original — used to drive the "Save changes" button.
export function isDraftDirty(draft: Draft, orig: Draft): boolean {
  return (Object.keys(draft) as (keyof Draft)[]).some(k => draft[k] !== orig[k])
}

/** Effective birth year: from the date when present, else the stored year. */
function effectiveYear(date: string, storedYear: string): string {
  return date ? yearFromDate(date) : storedYear
}

/** Normalize user-typed text before saving: proper nouns get Title Case
 *  ("ram kumar" → "Ram Kumar"), free text gets a capital first letter,
 *  email is lowercased, phone/pincode lose stray characters. Applied by
 *  both draft converters so the API payload and the optimistic local
 *  update always agree. */
function normalizeDraft(d: Draft): Draft {
  return {
    ...d,
    firstName:        titleCase(d.firstName),
    middleName:       titleCase(d.middleName),
    lastName:         titleCase(d.lastName),
    nickname:         titleCase(d.nickname),
    gotra:            titleCase(d.gotra),
    religion:         titleCase(d.religion),
    birthPlace:       titleCase(d.birthPlace),
    deathPlace:       titleCase(d.deathPlace),
    currentCity:      titleCase(d.currentCity),
    currentState:     titleCase(d.currentState),
    currentCountry:   titleCase(d.currentCountry),
    nativeVillage:    titleCase(d.nativeVillage),
    nativeTehsil:     titleCase(d.nativeTehsil),
    nativeDistrict:   titleCase(d.nativeDistrict),
    nativeState:      titleCase(d.nativeState),
    nativeCountry:    titleCase(d.nativeCountry),
    currentAddress:   capFirst(d.currentAddress),
    occupation:       capFirst(d.occupation),
    occupationDetail: capFirst(d.occupationDetail),
    education:        capFirst(d.education),
    bio:              d.bio.trim(),
    email:            normEmail(d.email),
    phone:            normPhone(d.phone),
    whatsapp:         normPhone(d.whatsapp),
    currentPincode:   normDigits(d.currentPincode),
  }
}

// Convert draft → Partial<PersonData> for optimistic local updates.
// Undefined-not-null because PersonData fields are optional.
export function draftToPartialPersonData(raw: Draft): Partial<PersonData> {
  const draft = normalizeDraft(raw)
  const birthYear = effectiveYear(draft.birthDate, draft.birthYear)
  const deathYear = effectiveYear(draft.deathDate, draft.deathYear)
  return {
    fullName:          composeFullName(draft),
    firstName:         str(draft.firstName) ?? undefined,
    middleName:        str(draft.middleName) ?? undefined,
    lastName:          str(draft.lastName) ?? undefined,
    nickname:          str(draft.nickname) ?? undefined,
    gender:            draft.gender || undefined,
    gotra:             str(draft.gotra) ?? undefined,
    religion:          str(draft.religion) ?? undefined,
    birthDate:         str(draft.birthDate) ?? undefined,
    birthYear:         birthYear ? parseInt(birthYear) : undefined,
    birthPlace:        str(draft.birthPlace) ?? undefined,
    isDeceased:        draft.isDeceased,
    isAlive:           !draft.isDeceased,
    deathDate:         draft.isDeceased ? (str(draft.deathDate) ?? undefined) : undefined,
    deathYear:         draft.isDeceased && deathYear ? parseInt(deathYear) : undefined,
    deathPlace:        draft.isDeceased ? (str(draft.deathPlace) ?? undefined) : undefined,
    phone:             str(draft.phone) ?? undefined,
    whatsapp:          str(draft.whatsapp) ?? undefined,
    email:             str(draft.email) ?? undefined,
    currentAddress:    str(draft.currentAddress) ?? undefined,
    currentCity:       str(draft.currentCity) ?? undefined,
    currentState:      str(draft.currentState) ?? undefined,
    currentCountry:    str(draft.currentCountry) ?? undefined,
    currentPincode:    str(draft.currentPincode) ?? undefined,
    nativeVillage:     str(draft.nativeVillage) ?? undefined,
    nativeTehsil:      str(draft.nativeTehsil) ?? undefined,
    nativeDistrict:    str(draft.nativeDistrict) ?? undefined,
    nativeState:       str(draft.nativeState) ?? undefined,
    nativeCountry:     str(draft.nativeCountry) ?? undefined,
    occupation:        str(draft.occupation) ?? undefined,
    occupationDetail:  str(draft.occupationDetail) ?? undefined,
    education:         str(draft.education) ?? undefined,
    bio:               str(draft.bio) ?? undefined,
    photoUrl:          draft.photoUrl,
    photoThumbnailUrl: draft.photoThumbnailUrl,
  }
}

// Convert draft → SavePayload for the API. Differs from Partial<PersonData>:
// nulls (not undefined) so the backend clears the value.
export function draftToSavePayload(raw: Draft): SavePayload {
  const draft = normalizeDraft(raw)
  const birthYear = effectiveYear(draft.birthDate, draft.birthYear)
  const deathYear = effectiveYear(draft.deathDate, draft.deathYear)
  return {
    fullName:          composeFullName(draft),
    firstName:         str(draft.firstName),
    middleName:        str(draft.middleName),
    lastName:          str(draft.lastName),
    nickname:          str(draft.nickname),
    gender:            draft.gender || null,
    gotra:             str(draft.gotra),
    religion:          str(draft.religion),
    birthDate:         str(draft.birthDate),
    birthYear:         birthYear ? parseInt(birthYear) : null,
    birthPlace:        str(draft.birthPlace),
    isDeceased:        draft.isDeceased,
    isAlive:           !draft.isDeceased,
    deathDate:         draft.isDeceased ? str(draft.deathDate) : null,
    deathYear:         draft.isDeceased && deathYear ? parseInt(deathYear) : null,
    deathPlace:        draft.isDeceased ? str(draft.deathPlace) : null,
    phone:             str(draft.phone),
    whatsapp:          str(draft.whatsapp),
    email:             str(draft.email),
    currentAddress:    str(draft.currentAddress),
    currentCity:       str(draft.currentCity),
    currentState:      str(draft.currentState),
    currentCountry:    str(draft.currentCountry),
    currentPincode:    str(draft.currentPincode),
    nativeVillage:     str(draft.nativeVillage),
    nativeTehsil:      str(draft.nativeTehsil),
    nativeDistrict:    str(draft.nativeDistrict),
    nativeState:       str(draft.nativeState),
    nativeCountry:     str(draft.nativeCountry),
    occupation:        str(draft.occupation),
    occupationDetail:  str(draft.occupationDetail),
    education:         str(draft.education),
    bio:               str(draft.bio),
    photoUrl:          draft.photoUrl ?? null,
    photoThumbnailUrl: draft.photoThumbnailUrl ?? null,
  }
}
