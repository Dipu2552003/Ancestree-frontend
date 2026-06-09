'use client'

// PhotoEditor — circular photo upload control + "Remove photo" button below.
// Manages its own hover + uploading state; the parent only sees the resulting
// data URL via `onChange`. Compression is done with the shared compressPhoto
// helper (max 480px JPEG).

import { useRef, useState } from 'react'
import { IconCamera, IconLoader2, IconTrash } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { compressPhoto } from '@/lib/image'

interface PhotoEditorProps {
  photoUrl?: string
  altName?:  string
  isDark:    boolean
  onChange:  (dataUrl: string | undefined) => void
}

export default function PhotoEditor({ photoUrl, altName, isDark, onChange }: PhotoEditorProps) {
  const t        = getTheme(isDark)
  const btn1Bg   = isDark ? '#2A1A12' : '#FFF3E8'
  const labelCol = isDark ? '#7A6A52' : '#9A3412'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoHovered,   setPhotoHovered]   = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={() => setPhotoHovered(true)}
        onMouseLeave={() => setPhotoHovered(false)}
        aria-label={photoUrl ? 'Change photo' : 'Add photo'}
        aria-busy={photoUploading}
        style={{
          width: '80px', height: '80px', borderRadius: '6px',
          background: btn1Bg, border: `2px dashed ${photoHovered ? '#FB923C' : t.border}`,
          overflow: 'hidden', cursor: 'pointer', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s ease',
          padding: 0, fontFamily: 'inherit',
        }}
      >
        {photoUploading ? (
          <IconLoader2 size={20} color="#EA580C" style={{ animation: 'spin 0.8s linear infinite' }} />
        ) : photoUrl ? (
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
            <IconCamera size={20} color={photoHovered ? '#FB923C' : '#D97706'} style={{ transition: 'color 0.15s' }} />
            <span style={{ fontSize: '9px', color: photoHovered ? '#FB923C' : '#D97706', marginTop: '3px', transition: 'color 0.15s' }}>Add photo</span>
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (!file) return
          setPhotoUploading(true)
          try {
            const dataUrl = await compressPhoto(file)
            onChange(dataUrl)
          } finally {
            setPhotoUploading(false)
            e.target.value = ''
          }
        }}
      />
      {photoUrl && (
        <button
          onClick={() => onChange(undefined)}
          style={{ marginTop: '5px', background: 'none', border: 'none', fontSize: '10px', color: labelCol, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
        >
          <IconTrash size={10} /> Remove photo
        </button>
      )}
    </div>
  )
}
