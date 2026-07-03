'use client'

// ArrangeOrderCard — manual sibling ordering for one parent's children.
//
// Shown when birth order matters but birth years are unknown: the list starts
// in the current display order (eldest first) and each row moves with up/down
// arrows. Save writes child_order = 1..n via the reorder endpoint, then the
// parent refetches the graph so the layout re-sorts.
//
// Rows that already have a birth year are pinned — age always outranks the
// manual order in the layout, so moving them here would have no effect.

import { useState } from 'react'
import { IconChevronUp, IconChevronDown, IconLoader2, IconArrowsSort } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { SectionHeader } from './'

export interface ArrangePerson {
  id: string
  name: string
  birthYear?: number | null
}

interface ArrangeOrderCardProps {
  title:    string   // "Arrange children" / "Arrange siblings"
  people:   ArrangePerson[]   // current display order, eldest first
  isDark:   boolean
  onSave:   (orderedIds: string[]) => Promise<void>
}

export default function ArrangeOrderCard({ title, people, isDark, onSave }: ArrangeOrderCardProps) {
  const t = getTheme(isDark)
  const [open,   setOpen]   = useState(false)
  const [order,  setOrder]  = useState(() => people.map(p => p.id))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const byId  = new Map(people.map(p => [p.id, p]))
  const dirty = order.some((id, i) => people[i]?.id !== id)

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    setOrder(prev => {
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await onSave(order)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Any sectionKey makes the header collapsible; the badge stays off
          because no fields/draft are passed. */}
      <SectionHeader
        title={title} isDark={isDark}
        sectionKey="contact" isOpen={open}
        onToggle={() => setOpen(o => !o)}
      />
      {open && (
        <div style={{ padding: '10px 16px 14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, lineHeight: 1.45, color: t.textMuted }}>
            Top = eldest. Used when birth years aren’t known — members with a
            year keep their age position.
          </p>

          <div style={{ border: `1px solid ${t.borderNeutral}`, borderRadius: 10, overflow: 'hidden' }}>
            {order.map((id, i) => {
              const p = byId.get(id)
              if (!p) return null
              const pinned = p.birthYear != null
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px',
                  borderBottom: i < order.length - 1 ? `1px solid ${t.borderNeutral}` : 'none',
                }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted, width: 14, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                    {pinned && <span style={{ fontWeight: 500, color: t.textMuted }}> · b. {p.birthYear}</span>}
                  </span>
                  {!pinned && ([-1, 1] as const).map(dir => {
                    const disabled = dir === -1 ? i === 0 : i === order.length - 1
                    const Icon = dir === -1 ? IconChevronUp : IconChevronDown
                    return (
                      <button
                        key={dir}
                        onClick={() => move(i, dir)}
                        disabled={disabled || saving}
                        style={{
                          display: 'flex', padding: 4, borderRadius: 6, border: `1px solid ${t.borderNeutral}`,
                          background: 'none', cursor: disabled ? 'default' : 'pointer',
                          color: disabled ? t.textMuted : 'var(--c-primary)', opacity: disabled ? 0.35 : 1,
                        }}
                      >
                        <Icon size={13} strokeWidth={2.5} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {error && <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#EF4444' }}>{error}</p>}

          {(dirty || saved) && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                width: '100%', height: 32, marginTop: 10, borderRadius: 8, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: saved ? (isDark ? '#14532D' : '#16A34A') : 'var(--c-primary)',
                color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                cursor: saving || saved ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <><IconLoader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
               : saved ? 'Order saved'
               : <><IconArrowsSort size={13} strokeWidth={2.5} /> Save order</>}
            </button>
          )}
        </div>
      )}
    </>
  )
}
