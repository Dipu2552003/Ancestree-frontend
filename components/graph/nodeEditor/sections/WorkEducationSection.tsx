'use client'

// Job + degree + free-form bio textarea. Collapsible.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface WorkEducationSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

export default function WorkEducationSection({ form, isOpen, onToggle }: WorkEducationSectionProps) {
  const { draft, set, setFocused, isDark, labelStyle, inputStyle, field } = form

  return (
    <>
      <SectionHeader
        title="Work & Education" isDark={isDark}
        sectionKey="workEducation" isOpen={isOpen}
        fields={['occupation', 'occupationDetail', 'education', 'bio']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Occupation', 'occupation', 'e.g. Engineer, Farmer')}
          {field('Occupation detail', 'occupationDetail', 'Company / more detail')}
          {field('Education', 'education', 'Highest qualification')}
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={draft.bio}
              onChange={set('bio')}
              onFocus={() => setFocused('bio')} onBlur={() => setFocused(null)}
              placeholder="A short note about this person…"
              rows={3}
              style={{
                ...inputStyle('bio'), height: 'auto', padding: '8px 10px',
                resize: 'vertical', lineHeight: '1.5',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
