'use client'

// SaveButton — full-width Save button + Ctrl+S hint below. Three visual
// states: idle (orange when dirty, muted when clean), saving (spinner),
// saved (green check, auto-resets to idle after 2s — owned by parent).

import { motion, AnimatePresence } from 'framer-motion'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

export type SaveState = 'idle' | 'saving' | 'saved'

interface SaveButtonProps {
  saveState: SaveState
  isDirty:   boolean
  isDark:    boolean
  onSave:    () => void
}

export default function SaveButton({ saveState, isDirty, isDark, onSave }: SaveButtonProps) {
  const t = getTheme(isDark)

  const saveBg = saveState === 'saved'
    ? (isDark ? '#14401A' : '#DCFCE7')
    : isDirty
      ? 'var(--c-primary)'
      : (isDark ? '#221A10' : '#FFF3E8')
  const saveTextCol = saveState === 'saved'
    ? (isDark ? '#4ADE80' : '#16A34A')
    : isDirty ? '#FFFFFF' : t.textMuted

  return (
    <div style={{ padding: '16px 16px 8px' }}>
      <motion.button
        onClick={onSave}
        disabled={saveState === 'saving' || saveState === 'saved'}
        whileHover={isDirty && saveState === 'idle' ? { scale: 1.015 } : {}}
        whileTap={isDirty && saveState === 'idle' ? { scale: 0.975 } : {}}
        style={{
          width: '100%', height: '40px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          cursor: saveState !== 'idle' ? 'default' : 'pointer',
          fontSize: '13px', fontWeight: 600, border: 'none', fontFamily: 'inherit',
          background: saveBg, color: saveTextCol,
          transition: 'background 0.25s ease, color 0.25s ease',
        }}
      >
        {saveState === 'saving' && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
            <IconLoader2 size={15} />
          </motion.div>
        )}
        {saveState === 'saved' && <IconCheck size={15} strokeWidth={2.5} />}
        {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
      </motion.button>
      <AnimatePresence>
        {isDirty && saveState === 'idle' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: '10px', color: t.textMuted, textAlign: 'center', margin: '6px 0 0', letterSpacing: '0.04em' }}>
            Ctrl + S to save
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
