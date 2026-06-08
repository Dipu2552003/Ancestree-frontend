'use client'

import { motion } from 'framer-motion'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'

export interface ModalShellProps {
  /** Caller renders the modal content (header / body / footer). */
  children:          ReactNode
  onClose:           () => void
  isDark:            boolean
  /** Defaults to Z.modal. Use Z.confirmModal for nested "are you sure?" overlays. */
  zIndex?:           number
  /** Max width of the inner card in pixels. Default 480. */
  maxWidth?:         number
  /** Blur the backdrop for stronger focus (used by destructive modals). */
  blurBackdrop?:     boolean
  /** Default true. Set false when the modal is mid-commit and must not close. */
  closeOnBackdrop?:  boolean
  /** Inline-style escape hatch for the inner card. */
  cardStyle?:        CSSProperties
}

/** Shared backdrop + spring-in card. Caller composes header / body / footer
 *  inside `children` — most modals need different layouts, so this only
 *  handles the bits everyone duplicates (the centred backdrop, the click-
 *  outside behaviour, and the spring animation). */
export function ModalShell({
  children, onClose, isDark,
  zIndex = Z.modal, maxWidth = 480,
  blurBackdrop = false, closeOnBackdrop = true,
  cardStyle,
}: ModalShellProps) {
  const t = getTheme(isDark)

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (!closeOnBackdrop) return
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <motion.div
      key="modal-shell-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: blurBackdrop ? 'blur(2px)' : undefined,
      }}
      onClick={handleBackdropClick}
    >
      <motion.div
        key="modal-shell-card"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{    opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        style={{
          background: t.panelBg, border: `1.5px solid ${t.borderNeutral}`,
          borderRadius: 18, boxShadow: t.shadow,
          width: '100%', maxWidth, maxHeight: 'calc(100vh - 32px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          position: 'relative',
          ...cardStyle,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
