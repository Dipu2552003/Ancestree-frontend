// NodePanel draft state — a flat record mirroring PersonData but with all
// string fields (so they bind cleanly to <input> values). The orchestrator
// owns the draft; this module owns the conversion to and from it.

import type { PersonData, SavePayload } from '@/types'
import { str } from './helpers'

export function initDraft(d: PersonData) {
  return {
    fullName:         d.fullName ?? '',
    firstName:        d.firstName ?? '',
    middleName:       d.middleName ?? '',
    lastName:         d.lastName ?? '',
    nameNative:       d.nameNative ?? '',
    nickname:         d.nickname ?? '',
    gender:           d.gender ?? '',
    gotra:            d.gotra ?? '',
    religion:         d.religion ?? '',

    birthDate:        d.birthDate ?? '',
    birthYear:        d.birthYear ? String(d.birthYear) : '',
    birthPlace:       d.birthPlace ?? '',
    isDeceased:       Boolean(d.isDeceased),
    deathDate:        d.deathDate ?? '',
    deathYear:        d.deathYear ? String(d.deathYear) : '',
    deathPlace:       d.deathPlace ?? '',

    phone:            d.phone ?? '',
    whatsapp:         d.whatsapp ?? '',
    email:            d.email ?? '',

    currentAddress:   d.currentAddress ?? '',
    currentCity:      d.currentCity ?? '',
    currentState:     d.currentState ?? '',
    currentCountry:   d.currentCountry ?? '',
    currentPincode:   d.currentPincode ?? '',

    nativeVillage:    d.nativeVillage ?? '',
    nativeTehsil:     d.nativeTehsil ?? '',
    nativeDistrict:   d.nativeDistrict ?? '',
    nativeState:      d.nativeState ?? '',
    nativeCountry:    d.nativeCountry ?? '',

    occupation:       d.occupation ?? '',
    occupationDetail: d.occupationDetail ?? '',
    education:        d.education ?? '',
    bio:              d.bio ?? '',

    photoUrl:         d.photoUrl as string | undefined,
  }
}

export type Draft = ReturnType<typeof initDraft>

// Diff a draft against the original — used to drive the "Save changes" button.
export function isDraftDirty(draft: Draft, orig: Draft): boolean {
  return (Object.keys(draft) as (keyof Draft)[]).some(k => draft[k] !== orig[k])
}

// Convert draft → Partial<PersonData> for optimistic local updates.
// Undefined-not-null because PersonData fields are optional.
export function draftToPartialPersonData(draft: Draft): Partial<PersonData> {
  return {
    fullName:         draft.fullName.trim(),
    firstName:        str(draft.firstName) ?? undefined,
    middleName:       str(draft.middleName) ?? undefined,
    lastName:         str(draft.lastName) ?? undefined,
    nameNative:       str(draft.nameNative) ?? undefined,
    nickname:         str(draft.nickname) ?? undefined,
    gender:           draft.gender || undefined,
    gotra:            str(draft.gotra) ?? undefined,
    religion:         str(draft.religion) ?? undefined,
    birthDate:        str(draft.birthDate) ?? undefined,
    birthYear:        draft.birthYear ? parseInt(draft.birthYear) : undefined,
    birthPlace:       str(draft.birthPlace) ?? undefined,
    isDeceased:       draft.isDeceased,
    isAlive:          !draft.isDeceased,
    deathDate:        draft.isDeceased ? (str(draft.deathDate) ?? undefined) : undefined,
    deathYear:        draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : undefined,
    deathPlace:       draft.isDeceased ? (str(draft.deathPlace) ?? undefined) : undefined,
    phone:            str(draft.phone) ?? undefined,
    whatsapp:         str(draft.whatsapp) ?? undefined,
    email:            str(draft.email) ?? undefined,
    currentAddress:   str(draft.currentAddress) ?? undefined,
    currentCity:      str(draft.currentCity) ?? undefined,
    currentState:     str(draft.currentState) ?? undefined,
    currentCountry:   str(draft.currentCountry) ?? undefined,
    currentPincode:   str(draft.currentPincode) ?? undefined,
    nativeVillage:    str(draft.nativeVillage) ?? undefined,
    nativeTehsil:     str(draft.nativeTehsil) ?? undefined,
    nativeDistrict:   str(draft.nativeDistrict) ?? undefined,
    nativeState:      str(draft.nativeState) ?? undefined,
    nativeCountry:    str(draft.nativeCountry) ?? undefined,
    occupation:       str(draft.occupation) ?? undefined,
    occupationDetail: str(draft.occupationDetail) ?? undefined,
    education:        str(draft.education) ?? undefined,
    bio:              str(draft.bio) ?? undefined,
    photoUrl:         draft.photoUrl,
  }
}

// Convert draft → SavePayload for the API. Differs from Partial<PersonData>:
// nulls (not undefined) so the backend clears the value.
export function draftToSavePayload(draft: Draft): SavePayload {
  return {
    fullName:         draft.fullName.trim(),
    firstName:        str(draft.firstName),
    middleName:       str(draft.middleName),
    lastName:         str(draft.lastName),
    nameNative:       str(draft.nameNative),
    nickname:         str(draft.nickname),
    gender:           draft.gender || null,
    gotra:            str(draft.gotra),
    religion:         str(draft.religion),
    birthDate:        str(draft.birthDate),
    birthYear:        draft.birthYear ? parseInt(draft.birthYear) : null,
    birthPlace:       str(draft.birthPlace),
    isDeceased:       draft.isDeceased,
    isAlive:          !draft.isDeceased,
    deathDate:        draft.isDeceased ? str(draft.deathDate) : null,
    deathYear:        draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : null,
    deathPlace:       draft.isDeceased ? str(draft.deathPlace) : null,
    phone:            str(draft.phone),
    whatsapp:         str(draft.whatsapp),
    email:            str(draft.email),
    currentAddress:   str(draft.currentAddress),
    currentCity:      str(draft.currentCity),
    currentState:     str(draft.currentState),
    currentCountry:   str(draft.currentCountry),
    currentPincode:   str(draft.currentPincode),
    nativeVillage:    str(draft.nativeVillage),
    nativeTehsil:     str(draft.nativeTehsil),
    nativeDistrict:   str(draft.nativeDistrict),
    nativeState:      str(draft.nativeState),
    nativeCountry:    str(draft.nativeCountry),
    occupation:       str(draft.occupation),
    occupationDetail: str(draft.occupationDetail),
    education:        str(draft.education),
    bio:              str(draft.bio),
    photoUrl:         draft.photoUrl ?? null,
  }
}
