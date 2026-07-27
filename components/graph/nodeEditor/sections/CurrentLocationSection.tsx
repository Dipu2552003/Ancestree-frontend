'use client'

// Where they live now. Each part (State / District / City / Address / Country)
// renders via the shared field() helper, so it honours the community's admin
// field type — dropdown, fixed value, plain text, or hidden. No place-search.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'
import { anyFieldVisible } from '@/lib/community/fieldConfig'

interface CurrentLocationSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

// Every person column this section can render — used to hide the whole section
// (header included) when the community has disabled all of them.
const ALL_COLS = ['current_address', 'current_city', 'current_district', 'current_state', 'current_country']

export default function CurrentLocationSection({ form, isOpen, onToggle }: CurrentLocationSectionProps) {
  const { draft, isDark, field, row, fieldConfig } = form

  // Whole section off → render nothing (no dangling header).
  if (!anyFieldVisible(fieldConfig, ALL_COLS)) return null

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
          {row(
            field('State', 'currentState', 'State', { half: true }),
            field('District', 'currentDistrict', 'District', { half: true }),
          )}
          {field('City / Town', 'currentCity', 'City or town')}
          {field('Address', 'currentAddress', 'Street / apartment')}
          {field('Country', 'currentCountry', 'India')}
        </div>
      )}
    </>
  )
}
