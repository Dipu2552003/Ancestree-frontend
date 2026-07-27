'use client'

// Ancestral place. Each part (State / District / Village / Country) renders via
// the shared field() helper, so it honours the community's admin field type —
// dropdown (e.g. a fixed village list), fixed value, plain text, or hidden.
// No place-search.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'
import { type FieldConfig, anyFieldVisible } from '@/lib/community/fieldConfig'

interface NativeOriginSectionProps {
  form:        FormApi
  isOpen:      boolean
  onToggle:    () => void
  fieldConfig?: FieldConfig | null
}

const ALL_COLS = ['native_village', 'native_district', 'native_state', 'native_country']

export default function NativeOriginSection({ form, isOpen, onToggle, fieldConfig }: NativeOriginSectionProps) {
  const { draft, isDark, field, row } = form

  // Whole section off → render nothing (no dangling header).
  if (!anyFieldVisible(fieldConfig, ALL_COLS)) return null

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
          {row(
            field('State', 'nativeState', 'State', { half: true }),
            field('District', 'nativeDistrict', 'District', { half: true }),
          )}
          {field('Village / Town', 'nativeVillage', 'Village or town')}
          {field('Country', 'nativeCountry', 'India')}
        </div>
      )}
    </>
  )
}
