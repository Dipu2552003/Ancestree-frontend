'use client'

// PhotoEditor — photo upload control + "Remove photo" button below. Picking a
// file opens PhotoCropModal so the user can centre and resize before saving;
// the parent receives the cropped photo + thumbnail data URLs via `onChange`.

import { useRef, useState } from 'react'
import { IconCamera, IconTrash } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import PhotoCropModal from './PhotoCropModal'

interface PhotoEditorProps {
  photoUrl?: string
  altName?:  string
  isDark:    boolean
  /** Called with the main photo and a small thumbnail; both undefined on remove. */
  onChange:  (dataUrl: string | undefined, thumbUrl: string | undefined) => void
}

export default function PhotoEditor({ photoUrl, altName, isDark, onChange }: PhotoEditorProps) {
  const t        = getTheme(isDark)
  const btn1Bg   = isDark ? '#2A1A12' : '#FFF3E8'
  const labelCol = isDark ? '#7A6A52' : 'var(--c-primary-deep)'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoHovered, setPhotoHovered] = useState(false)
  const [cropSrc,      setCropSrc]      = useState<string | null>(null)

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={() => setPhotoHovered(true)}
        onMouseLeave={() => setPhotoHovered(false)}
        aria-label={photoUrl ? 'Change photo' : 'Add photo'}
        style={{
          width: '80px', height: '80px', borderRadius: '6px',
          background: btn1Bg, border: `2px dashed ${photoHovered ? 'var(--c-primary-light)' : t.border}`,
          overflow: 'hidden', cursor: 'pointer', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s ease',
          padding: 0, fontFamily: 'inherit',
        }}
      >
        {photoUrl ? (
          <>
            <img src={photoUrl} alt={`Photo of ${altName ?? ''}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: photoHovered ? 1 : 0, transition: 'opacity 0.15s ease',
            }}>
              <IconCamera size={18} color="white" />
            </div>
          </>
        ) : (
          <>
            <IconCamera size={20} color={photoHovered ? 'var(--c-primary-light)' : 'var(--c-secondary)'} style={{ transition: 'color 0.15s' }} />
            <span style={{ fontSize: '9px', color: photoHovered ? 'var(--c-primary-light)' : 'var(--c-secondary)', marginTop: '3px', transition: 'color 0.15s' }}>Add photo</span>
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          if (!file.type.startsWith('image/')) { e.target.value = ''; return }
          setCropSrc(URL.createObjectURL(file))
          e.target.value = ''
        }}
      />

      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          isDark={isDark}
          onCancel={closeCrop}
          onApply={(photo, thumb) => {
            onChange(photo, thumb)
            closeCrop()
          }}
        />
      )}
      {photoUrl && (
        <button
          onClick={() => onChange(undefined, undefined)}
          style={{ marginTop: '5px', background: 'none', border: 'none', fontSize: '10px', color: labelCol, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
        >
          <IconTrash size={10} /> Remove photo
        </button>
      )}
    </div>
  )
}
