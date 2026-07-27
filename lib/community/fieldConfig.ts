// Community field config — the per-community rulebook (from
// communities.settings.fields) plus the enum option catalogs (from
// community_field_options), as returned by GET /api/community/:slug/field-config.
//
// It tells the node editor which fields to show, which are dropdowns (and their
// values), and which are auto-filled constants. `keys` are person column names
// (snake_case); the editor's draft uses camelCase, so `DRAFT_KEY` maps the ones
// the editor honors. When there's no config (non-community, or not loaded yet)
// every helper returns "unconstrained", so the editor behaves exactly as before.

export interface FieldRule {
  enabled?: boolean
  type?:    'text' | 'enum' | 'constant' | 'select'
  storage?: 'column' | 'attribute'
  value?:   string        // for `constant`
  required?: boolean
  order?:   number
}

// value = English (canonical — what's stored on the person and matched by
// search). label = optional Hindi alias for display. Both mean the same thing.
export interface FieldOption { value: string; label: string | null }

export interface FieldConfig {
  fields:  Record<string, FieldRule>
  options: Record<string, FieldOption[]>
}

/** Column name (config key) → editor draft key, for the fields Phase A honors. */
export const DRAFT_KEY: Record<string, string> = {
  gotra:          'gotra',
  native_village: 'nativeVillage',
  religion:       'religion',
  last_name:      'lastName',
}

function ruleFor(cfg: FieldConfig | null | undefined, key: string): FieldRule | undefined {
  return cfg?.fields?.[key]
}

/** True only when the community explicitly disables the field. Unknown = shown. */
export function isFieldHidden(cfg: FieldConfig | null | undefined, key: string): boolean {
  return ruleFor(cfg, key)?.enabled === false
}

/** True if at least one of the given fields is visible — used to hide a whole
 *  editor/profile section when every field inside it is disabled. */
export function anyFieldVisible(cfg: FieldConfig | null | undefined, keys: string[]): boolean {
  return keys.some(k => !isFieldHidden(cfg, k))
}

/** The locked value for a `constant` field, else undefined. */
export function constantValue(cfg: FieldConfig | null | undefined, key: string): string | undefined {
  const r = ruleFor(cfg, key)
  return r?.type === 'constant' ? (r.value ?? '') : undefined
}

/** Dropdown options for an `enum` field, else undefined (→ caller keeps its default input). */
export function enumOptions(cfg: FieldConfig | null | undefined, key: string): FieldOption[] | undefined {
  if (ruleFor(cfg, key)?.type !== 'enum') return undefined
  const opts = cfg?.options?.[key]
  return opts && opts.length > 0 ? opts : undefined
}
