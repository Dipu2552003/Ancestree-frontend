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
export type FieldType = 'text' | 'select' | 'date' | 'gender'

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

  // ── Available but not surfaced by any mode yet ───────────────────────────
  // Add the id to a field set below to switch these on — no renderer changes.
  gender: {
    id: 'gender', column: 'gender', type: 'gender',
    label: { en: 'Gender', hi: 'लिंग' },
  },
  birth_date: {
    id: 'birth_date', column: 'birth_date', type: 'date',
    label: { en: 'Date of birth', hi: 'जन्म तिथि' },
  },
}

// ── Field sets — which fields each tree type collects at signup ──────────────
export const SIGNUP_FIELD_SETS: Record<TreeType, readonly string[]> = {
  public:    ['first_name', 'middle_name', 'last_name', 'current_address', 'native_village'],
  private:   ['first_name', 'middle_name', 'last_name', 'current_address', 'native_village'],
  community: ['first_name', 'middle_name', 'last_name', 'current_address', 'native_village_select', 'gotra'],
}

// ── Helpers (pure) ───────────────────────────────────────────────────────────

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
