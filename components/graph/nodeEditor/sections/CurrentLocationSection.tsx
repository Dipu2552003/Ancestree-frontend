'use client'

// Where they live now — address + city / state / country / pincode. Collapsible.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface CurrentLocationSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

export default function CurrentLocationSection({ form, isOpen, onToggle }: CurrentLocationSectionProps) {
  const { draft, isDark, field, row } = form

  return (
    <>
      <SectionHeader
        title="Current Location" isDark={isDark}
        sectionKey="currentLocation" isOpen={isOpen}
        fields={['currentAddress', 'currentCity', 'currentState', 'currentCountry', 'currentPincode']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Address', 'currentAddress', 'Street / apartment')}
          {row(
            field('City', 'currentCity', 'City', { half: true }),
            field('State', 'currentState', 'State', { half: true }),
          )}
          {row(
            field('Country', 'currentCountry', 'India', { half: true }),
            field('Pincode', 'currentPincode', '000000', { half: true, inputMode: 'numeric' }),
          )}
        </div>
      )}
    </>
  )
}
