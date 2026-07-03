'use client'

// Where they live now — State → District → City/Town (search within the chosen
// district, or type). Street address + country kept manual.

import { SectionHeader } from '../'
import PlaceSearch from '@/components/forms/PlaceSearch'
import type { FormApi } from '../formApi'

interface CurrentLocationSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

const PARTS = [
  { role: 'state'    as const, key: 'currentState',    label: 'State',    half: true },
  { role: 'district' as const, key: 'currentDistrict', label: 'District', half: true },
  { role: 'city'     as const, key: 'currentCity',     label: 'City / Town' },
]

export default function CurrentLocationSection({ form, isOpen, onToggle }: CurrentLocationSectionProps) {
  const { draft, setDraft, isDark, field } = form

  return (
    <>
      <SectionHeader
        title="Current Location" isDark={isDark}
        sectionKey="currentLocation" isOpen={isOpen}
        fields={['currentAddress', 'currentCity', 'currentDistrict', 'currentState', 'currentCountry']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PlaceSearch
            label="Current location"
            parts={PARTS}
            values={draft as unknown as Record<string, string>}
            onChange={(k, v) => setDraft(p => ({ ...p, [k]: v }))}
            isDark={isDark}
            size="sm"
          />
          {field('Address', 'currentAddress', 'Street / apartment')}
          {field('Country', 'currentCountry', 'India')}
        </div>
      )}
    </>
  )
}
