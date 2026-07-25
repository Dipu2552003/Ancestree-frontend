'use client'

// Ancestral place — State (default Rajasthan) → District → Village/Town (search
// within the chosen district, or type). Country kept manual.
//
// In a community that constrains villages to a fixed list, the free-text
// Village/Town search is replaced by a dropdown of that list; State/District are
// dropped (the village alone identifies the place). Everything is unconstrained
// when there's no community config.

import { SectionHeader } from '../'
import PlaceSearch from '@/components/forms/PlaceSearch'
import type { FormApi } from '../formApi'
import { type FieldConfig, enumOptions, isFieldHidden } from '@/lib/community/fieldConfig'

interface NativeOriginSectionProps {
  form:        FormApi
  isOpen:      boolean
  onToggle:    () => void
  fieldConfig?: FieldConfig | null
}

const PARTS = [
  { role: 'state'    as const, key: 'nativeState',    label: 'State',    half: true, default: 'Rajasthan' },
  { role: 'district' as const, key: 'nativeDistrict', label: 'District', half: true },
  { role: 'village'  as const, key: 'nativeVillage',  label: 'Village / Town' },
]

export default function NativeOriginSection({ form, isOpen, onToggle, fieldConfig }: NativeOriginSectionProps) {
  const { draft, setDraft, setFocused, isDark, labelStyle, inputStyle, field } = form

  const villageOpts = enumOptions(fieldConfig, 'native_village')  // {value,label}[] | undefined
  if (isFieldHidden(fieldConfig, 'native_village')) return null

  return (
    <>
      <SectionHeader
        title="Village" isDark={isDark}
        sectionKey="nativeOrigin" isOpen={isOpen}
        fields={['nativeVillage', 'nativeDistrict', 'nativeState', 'nativeCountry']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {villageOpts ? (
            // Community-constrained village → dropdown from the community's list.
            <div>
              <label style={labelStyle}>Village</label>
              <select
                value={draft.nativeVillage}
                onChange={e => setDraft(p => ({ ...p, nativeVillage: e.target.value }))}
                onFocus={() => setFocused('nativeVillage')} onBlur={() => setFocused(null)}
                style={{ ...inputStyle('nativeVillage'), padding: '0 6px', cursor: 'pointer' }}
              >
                <option value="">Select village</option>
                {/* Keep a saved value outside the community list selectable */}
                {draft.nativeVillage && !villageOpts.some(o => o.value === draft.nativeVillage) && (
                  <option value={draft.nativeVillage}>{draft.nativeVillage}</option>
                )}
                {villageOpts.map(o => <option key={o.value} value={o.value}>{o.label ? `${o.value} (${o.label})` : o.value}</option>)}
              </select>
            </div>
          ) : (
            <PlaceSearch
              label="Village"
              parts={PARTS}
              values={draft as unknown as Record<string, string>}
              onChange={(k, v) => setDraft(p => ({ ...p, [k]: v }))}
              isDark={isDark}
              size="sm"
            />
          )}
          {field('Country', 'nativeCountry', 'India')}
        </div>
      )}
    </>
  )
}
