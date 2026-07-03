'use client'

// Ancestral place — State (default Rajasthan) → District → Village/Town (search
// within the chosen district, or type). Country kept manual.

import { SectionHeader } from '../'
import PlaceSearch from '@/components/forms/PlaceSearch'
import type { FormApi } from '../formApi'

interface NativeOriginSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

const PARTS = [
  { role: 'state'    as const, key: 'nativeState',    label: 'State',    half: true, default: 'Rajasthan' },
  { role: 'district' as const, key: 'nativeDistrict', label: 'District', half: true },
  { role: 'village'  as const, key: 'nativeVillage',  label: 'Village / Town' },
]

export default function NativeOriginSection({ form, isOpen, onToggle }: NativeOriginSectionProps) {
  const { draft, setDraft, isDark, field } = form

  return (
    <>
      <SectionHeader
        title="Native / Origin" isDark={isDark}
        sectionKey="nativeOrigin" isOpen={isOpen}
        fields={['nativeVillage', 'nativeDistrict', 'nativeState', 'nativeCountry']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PlaceSearch
            label="Native place"
            parts={PARTS}
            values={draft as unknown as Record<string, string>}
            onChange={(k, v) => setDraft(p => ({ ...p, [k]: v }))}
            isDark={isDark}
            size="sm"
          />
          {field('Country', 'nativeCountry', 'India')}
        </div>
      )}
    </>
  )
}
