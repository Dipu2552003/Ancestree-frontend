'use client'

// Optional photo upload — click or drag a file onto the dashed dropzone.
// Compression happens upstream via the processFile callback.

import { motion } from 'framer-motion'
import { IconCamera, IconLoader2, IconCheck } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import { firstName, slide } from '../helpers'
import type { WizardStyles } from '../styles'

interface StepPhotoProps {
  dir:              number
  isDark:           boolean
  t:                Theme
  styles:           WizardStyles
  fullName:         string
  photoUrl?:        string
  photoUploading:   boolean
  photoHovered:     boolean
  dragOver:         boolean
  fileRef:          React.RefObject<HTMLInputElement | null>
  saving:           boolean
  saved:            boolean
  isLastStep:       boolean
  setPhotoUrl:      (v: string | undefined) => void
  setPhotoHovered:  (v: boolean) => void
  setDragOver:      (v: boolean) => void
  processFile:      (f: File) => void
  onPrimary:        () => void   // continue or create depending on isLastStep
  onSkip:           () => void
}

export default function StepPhoto({
  dir, isDark, t, styles,
  fullName, photoUrl, photoUploading, photoHovered, dragOver, fileRef,
  saving, saved, isLastStep,
  setPhotoUrl, setPhotoHovered, setDragOver, processFile,
  onPrimary, onSkip,
}: StepPhotoProps) {
  return (
    <motion.div key="photo" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Add a photo
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, marginLeft: 8, letterSpacing: 0 }}>optional</span>
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Shows on {firstName(fullName) || 'their'}&apos;s node in the family tree.
        </p>
      </div>

      <div
        onClick={() => !photoUploading && fileRef.current?.click()}
        onMouseEnter={() => setPhotoHovered(true)} onMouseLeave={() => setPhotoHovered(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          height: 124, borderRadius: 12, cursor: photoUploading ? 'default' : 'pointer',
          border: `2px ${dragOver ? 'solid' : 'dashed'} ${
            dragOver ? COLORS.saffron
              : photoHovered ? COLORS.saffron + 'AA'
              : isDark ? 'rgba(234,88,12,0.25)' : 'rgba(234,88,12,0.20)'
          }`,
          background: dragOver
            ? (isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.05)')
            : photoUrl ? 'transparent'
            : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(234,88,12,0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {photoUploading ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
            <IconLoader2 size={26} color={COLORS.saffron} />
          </motion.div>
        ) : photoUrl ? (
          <>
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: photoHovered ? 1 : 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <IconCamera size={22} color="#fff" />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Change photo</span>
            </motion.div>
          </>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <IconCamera size={24} color={photoHovered ? COLORS.saffron : t.textMuted} style={{ transition: 'color 0.15s' }} />
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: photoHovered ? COLORS.saffron : t.text, transition: 'color 0.15s' }}>
                Click or drag to upload
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, color: t.textMuted }}>JPG · PNG · WEBP — max 5 MB</p>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />

      {photoUrl && (
        <button onClick={() => setPhotoUrl(undefined)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: t.textMuted,
            fontFamily: 'inherit', padding: 0, textAlign: 'center', textDecoration: 'underline', marginTop: -8 }}>
          Remove photo
        </button>
      )}

      <motion.button onClick={onPrimary} disabled={saving || saved}
        whileHover={!saving && !saved ? { scale: 1.015 } : {}}
        whileTap={!saving && !saved ? { scale: 0.98 } : {}}
        style={styles.btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
      </motion.button>

      <button onClick={onSkip}
        style={{ ...styles.btnSkip, opacity: saving || saved ? 0.4 : 1, pointerEvents: saving || saved ? 'none' : 'auto' }}
        onMouseEnter={e => (e.currentTarget.style.color = t.text)}
        onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
        Skip for now
      </button>
    </motion.div>
  )
}
