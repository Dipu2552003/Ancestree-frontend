'use client'

import { motion, AnimatePresence } from 'framer-motion'
import LoginTreeCanvas from '@/components/login/LoginTreeCanvas'
import AuthPolaroid, { type AuthPolaroidData } from '@/components/auth/AuthPolaroid'

interface AuthPreviewCanvasProps {
  preview: AuthPolaroidData | null
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Right-panel canvas for the auth pages.
 *
 *  - preview === null  → cinematic 10-node demo tree
 *  - preview !== null  → tree dissolves, AuthPolaroid hero-zooms in (live-reactive)
 *
 * The tree stays mounted across the transition so ReactFlow doesn't re-init.
 */
export default function AuthPreviewCanvas({ preview }: AuthPreviewCanvasProps) {
  const showPreview = preview !== null

  return (
    <div style={{ position: 'absolute', inset: 0 }}>

      {/* ── Tree (fades out when preview shows) ─────────────────────────── */}
      <motion.div
        animate={{
          opacity:   showPreview ? 0 : 1,
          scale:     showPreview ? 1.06 : 1,
          filter:    showPreview ? 'blur(6px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: showPreview ? 'none' : 'auto',
        }}
      >
        <LoginTreeCanvas />
      </motion.div>

      {/* ── Polaroid (hero-zooms in when preview is set) ────────────────── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            key="polaroid-wrap"
            initial={{ opacity: 0, scale: 0.62, y: 18 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.62, y: 18 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 32,
              zIndex: 5,
            }}
          >
            <AuthPolaroid {...preview} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
