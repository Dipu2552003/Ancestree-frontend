'use client'

// Phone / WhatsApp / email — collapsible. Auto-opens when any field is populated.

import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface ContactSectionProps {
  form:     FormApi
  isOpen:   boolean
  onToggle: () => void
}

export default function ContactSection({ form, isOpen, onToggle }: ContactSectionProps) {
  const { draft, isDark, field } = form

  return (
    <>
      <SectionHeader
        title="Contact" isDark={isDark}
        sectionKey="contact" isOpen={isOpen}
        fields={['phone', 'whatsapp', 'email']} draft={draft}
        onToggle={onToggle}
      />
      {isOpen && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Phone', 'phone', '+91 98765 43210', { type: 'tel' })}
          {field('WhatsApp', 'whatsapp', '+91 98765 43210', { type: 'tel' })}
          {field('Email', 'email', 'name@example.com', { type: 'email' })}
        </div>
      )}
    </>
  )
}
