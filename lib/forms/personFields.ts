// ─────────────────────────────────────────────────────────────────────────────
// Config-driven person form
//
// Single source of truth for "which person fields a given tree type collects".
// Both the signup details step and (in future) the profile page render from
// this config — so the two can never drift apart.
//
// To change a form you only touch data here, never the renderer:
//   • Add a brand-new field → add one entry to PERSON_FIELDS.
//   • Show/hide a field for a mode → add/remove its id in *_FIELD_SETS.
//   • A field can map to a different DB column than its registry id (e.g. the
//     village *dropdown* and the village *free-text* box both write
//     native_village) — that's what `column` is for.
//
// The renderer (components/forms/DynamicField.tsx) understands `type`; this file
// stays pure data + small pure helpers so it can run on client or server.
// ─────────────────────────────────────────────────────────────────────────────

import familyOptions from '@/lib/familyOptions.json'
import { titleCase, capFirst } from '@/lib/format/normalize'

export type TreeType = 'public' | 'private' | 'community'
export type FormLang = 'en' | 'hi'
export type FieldType = 'text' | 'select' | 'date' | 'gender' | 'place'

/** One column a `place` field fills. `role` maps an India-Post result field
 *  onto this column (see PlaceSearch.partValueFromPO). Sub-values live in the
 *  form's `values` map under `column` directly (not the parent field id). */
export interface PlacePart {
  role: 'village' | 'city' | 'tehsil' | 'district' | 'state' | 'pincode'
  column: string
  label: Bilingual
  half?: boolean
  /** Pre-selected when the field is empty (e.g. state defaults to Rajasthan). */
  default?: string
}

/** Sentinel a <select> uses for its free-text "Other" option. */
export const OTHER = '__other__'

/** Free-text entry paired with a select lives under `${field.id}${OTHER_KEY_SUFFIX}`. */
export const OTHER_KEY_SUFFIX = '__other'

interface Bilingual {
  en: string
  hi: string
}

export interface FieldDef {
  /** Unique id within a form (the key under which the value is held in state). */
  id: string
  /** persons column this value is written to. Usually equals `id`. */
  column: string
  type: FieldType
  label: Bilingual
  placeholder?: Bilingual
  required?: boolean
  /** Two consecutive half-width fields render side-by-side on one row. */
  half?: boolean
  /** Static options for a `select`. */
  options?: readonly string[]
  /** Append an "Other" option to a `select` that reveals a free-text input. */
  allowOther?: boolean
  /** Normalization applied at the save boundary. */
  normalize?: 'titleCase' | 'capFirst' | 'none'
  autoComplete?: string
  /** For type 'place': the columns this one search-field fills. */
  place?: { parts: PlacePart[] }
}

const GOTRAS   = familyOptions.gotras.map(g => g.name)
const VILLAGES = familyOptions.villages

// ── Field registry ─────────────────────────────────────────────────────────
// Every field the app *can* ask for. A field appearing here costs nothing until
// it's referenced by a field set below.
export const PERSON_FIELDS: Record<string, FieldDef> = {
  first_name: {
    id: 'first_name', column: 'first_name', type: 'text', required: true,
    label:       { en: 'First name', hi: 'पहला नाम' },
    placeholder: { en: 'e.g. Rahul',  hi: 'जैसे राहुल' },
    normalize: 'titleCase', autoComplete: 'given-name',
  },
  middle_name: {
    id: 'middle_name', column: 'middle_name', type: 'text',
    label:       { en: 'Middle name', hi: 'मध्य नाम' },
    placeholder: { en: 'Optional',    hi: 'वैकल्पिक' },
    normalize: 'titleCase', autoComplete: 'additional-name',
  },
  last_name: {
    id: 'last_name', column: 'last_name', type: 'text',
    label:       { en: 'Last name',       hi: 'अंतिम नाम' },
    placeholder: { en: 'e.g. Khandelwal', hi: 'जैसे खंडेलवाल' },
    normalize: 'titleCase', autoComplete: 'family-name',
  },
  current_address: {
    id: 'current_address', column: 'current_address', type: 'text',
    label:       { en: 'Current location / address', hi: 'वर्तमान स्थान / पता' },
    placeholder: { en: 'City, area or full address', hi: 'शहर, क्षेत्र या पूरा पता' },
    normalize: 'capFirst', autoComplete: 'street-address',
  },
  // Village as plain text — used by public / private.
  native_village: {
    id: 'native_village', column: 'native_village', type: 'text',
    label:       { en: 'Village',            hi: 'गाँव' },
    placeholder: { en: 'Your native village', hi: 'आपका मूल गाँव' },
    normalize: 'titleCase',
  },
  // Village as a curated dropdown (+ Other) — used by community. Writes the same
  // native_village column as the free-text variant above.
  native_village_select: {
    id: 'native_village_select', column: 'native_village', type: 'select',
    label:       { en: 'Village',            hi: 'गाँव' },
    placeholder: { en: 'Select your village', hi: 'अपना गाँव चुनें' },
    options: VILLAGES, allowOther: true, normalize: 'titleCase',
  },
  gotra: {
    id: 'gotra', column: 'gotra', type: 'select', required: true,
    label:       { en: 'Gotra',            hi: 'गोत्र' },
    placeholder: { en: 'Select your gotra', hi: 'अपना गोत्र चुनें' },
    options: GOTRAS, allowOther: true, normalize: 'titleCase',
  },

  // Native place — State (default Rajasthan) → District (dropdown by state) →
  // Village/Town (search the India Post directory within that district, or type).
  native_place: {
    id: 'native_place', column: 'native_village', type: 'place', required: true,
    label: { en: 'Native place', hi: 'मूल स्थान' },
    place: { parts: [
      { role: 'state',    column: 'native_state',    label: { en: 'State',    hi: 'राज्य' }, half: true, default: 'Rajasthan' },
      { role: 'district', column: 'native_district', label: { en: 'District', hi: 'ज़िला' }, half: true },
      { role: 'village',  column: 'native_village',  label: { en: 'Village / Town', hi: 'गाँव / कस्बा' } },
    ] },
  },
  // Current place — State → District → City/Town (search within the district).
  current_place: {
    id: 'current_place', column: 'current_city', type: 'place', required: true,
    label: { en: 'Current location', hi: 'वर्तमान स्थान' },
    place: { parts: [
      { role: 'state',    column: 'current_state',    label: { en: 'State',    hi: 'राज्य' }, half: true },
      { role: 'district', column: 'current_district', label: { en: 'District', hi: 'ज़िला' }, half: true },
      { role: 'city',     column: 'current_city',     label: { en: 'City / Town', hi: 'शहर' } },
    ] },
  },

  // ── Available but not surfaced by any mode yet ───────────────────────────
  // Add the id to a field set below to switch these on — no renderer changes.
  gender: {
    id: 'gender', column: 'gender', type: 'gender',
    label: { en: 'Gender', hi: 'लिंग' },
  },
  birth_date: {
    id: 'birth_date', column: 'birth_date', type: 'date', required: true,
    label: { en: 'Date of birth', hi: 'जन्म तिथि' },
  },
}

// ── Field sets — which fields each tree type collects at signup ──────────────
export const SIGNUP_FIELD_SETS: Record<TreeType, readonly string[]> = {
  public:    ['first_name', 'middle_name', 'last_name', 'birth_date', 'native_place', 'current_place'],
  private:   ['first_name', 'middle_name', 'last_name', 'birth_date', 'native_place', 'current_place'],
  community: ['first_name', 'middle_name', 'last_name', 'birth_date', 'gotra', 'native_place', 'current_place'],
}

// ── Helpers (pure) ───────────────────────────────────────────────────────────

/** The part a `place` field is validated on — its village/city, else the first. */
export function placePrimaryPart(field: FieldDef): PlacePart | undefined {
  const parts = field.place?.parts ?? []
  return parts.find(p => p.role === 'village' || p.role === 'city') ?? parts[0]
}

/** Resolve a set of field ids to their definitions, dropping any unknown ids. */
export function fieldsFor(set: readonly string[]): FieldDef[] {
  return set.map(id => PERSON_FIELDS[id]).filter(Boolean)
}

function normalizeValue(field: FieldDef, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (field.normalize === 'titleCase') return titleCase(v)
  if (field.normalize === 'capFirst')  return capFirst(v)
  return v
}

/** Final stored string for one field, resolving a select's "Other" free text. */
export function resolveFieldValue(field: FieldDef, values: Record<string, string>): string {
  let raw = values[field.id] ?? ''
  if (field.type === 'select' && raw === OTHER) {
    raw = values[field.id + OTHER_KEY_SUFFIX] ?? ''
  }
  return normalizeValue(field, raw)
}

/** Build the `{ column: value }` API payload for all non-empty fields in a set. */
export function buildPayload(set: readonly string[], values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fieldsFor(set)) {
    // A place field owns several columns; its sub-values are stored under those
    // column names directly. Pincode stays as typed, everything else title-cased.
    if (field.type === 'place') {
      for (const part of field.place?.parts ?? []) {
        const raw = (values[part.column] ?? '').trim()
        if (raw) out[part.column] = part.role === 'pincode' ? raw : titleCase(raw)
      }
      continue
    }
    const v = resolveFieldValue(field, values)
    if (v) out[field.column] = v
  }
  return out
}

/** Required-field validation → `{ fieldId: message }` (empty when all valid). */
export function validateFields(
  set: readonly string[],
  values: Record<string, string>,
  lang: FormLang,
): Record<string, string> {
  const errs: Record<string, string> = {}
  for (const field of fieldsFor(set)) {
    // A place field is satisfied by its location part — the village / city.
    // The error is keyed on that column so editing it clears the message.
    if (field.type === 'place') {
      const primary = placePrimaryPart(field)
      if (field.required && primary && !(values[primary.column] ?? '').trim()) {
        errs[primary.column] = lang === 'hi'
          ? `${field.label.hi} आवश्यक है`
          : `${field.label.en} is required`
      }
      continue
    }
    if (field.required && !resolveFieldValue(field, values)) {
      errs[field.id] = lang === 'hi'
        ? `${field.label.hi} आवश्यक है`
        : `${field.label.en} is required`
    }
  }
  return errs
}

/** Compose the display / full name from whichever name parts are present. */
export function composeFullName(values: Record<string, string>): string {
  return ['first_name', 'middle_name', 'last_name']
    .map(id => normalizeValue(PERSON_FIELDS[id], values[id] ?? ''))
    .filter(Boolean)
    .join(' ')
}
