'use client'

// Ancestral village + the Indian-administrative-hierarchy fields. Collapsible.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface NativeOriginSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

export default function NativeOriginSection({ form, isOpen, onToggle }: NativeOriginSectionProps) {
  const { draft, isDark, field, row } = form

  return (
    <>
      <SectionHeader
        title="Native / Origin" isDark={isDark}
        sectionKey="nativeOrigin" isOpen={isOpen}
        fields={['nativeVillage', 'nativeTehsil', 'nativeDistrict', 'nativeState', 'nativeCountry']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {row(
            field('Village', 'nativeVillage', 'Ancestral village', { half: true }),
            field('Tehsil', 'nativeTehsil', 'Tehsil', { half: true }),
          )}
          {row(
            field('District', 'nativeDistrict', 'District', { half: true }),
            field('State', 'nativeState', 'State', { half: true }),
          )}
          {field('Country', 'nativeCountry', 'India')}
        </div>
      )}
    </>
  )
}
