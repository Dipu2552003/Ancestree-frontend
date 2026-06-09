'use client'

// Sticky top bar of NodePanel — close button on the right with an animated
// orange dot when there are unsaved changes. Also hosts the screen-reader
// live region that announces save lifecycle transitions.

import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import type { SaveState } from './SaveButton'

interface NodePanelHeaderProps {
  isDark:    boolean
  isMobile:  boolean
  isDirty:   boolean
  saveState: SaveState
  onClose:   () => void
}

export default function NodePanelHeader({ isDark, isMobile, isDirty, saveState, onClose }: NodePanelHeaderProps) {
  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : '#9A3412'

  return (
    <>
      {/* Screen-reader live region for save feedback */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute', width: 1, height: 1,
          padding: 0, margin: '-1px', overflow: 'hidden',
          clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
        }}
      >
        {saveState === 'saving' ? 'Saving changes' : saveState === 'saved' ? 'Changes saved successfully' : ''}
      </span>

      <div style={{
        height: '52px', background: t.cardBg,
        borderBottom: `1.5px solid ${t.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'flex-end', padding: '0 12px', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AnimatePresence>
            {isDirty && saveState === 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C' }}
                title="Unsaved changes"
              />
            )}
          </AnimatePresence>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: isMobile ? '10px' : '4px', display: 'flex', alignItems: 'center', color: labelCol }}>
            <IconX size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
