'use client'

// PhotoCropModal — adjust step between picking a file and saving the photo.
// The image sits under a fixed square crop window; the user drags to centre
// it and zooms with the slider (pointer events, so mouse and touch both
// work). Apply exports the visible square as the 480px photo + 96px thumb.

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { IconCheck, IconX, IconZoomIn, IconZoomOut } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'

const VIEW = 260          // crop window size on screen (square)
const OUT = 480           // exported photo edge
const THUMB = 96          // exported thumbnail edge
const JPEG_QUALITY = 0.78
const MAX_ZOOM = 3

interface PhotoCropModalProps {
  /** Object URL / data URL of the original picked image. */
  src:      string
  isDark:   boolean
  onCancel: () => void
  onApply:  (photo: string, thumb: string) => void
}

export default function PhotoCropModal({ src, isDark, onCancel, onApply }: PhotoCropModalProps) {
  const t = getTheme(isDark)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [decodeError, setDecodeError] = useState(false)
  const [zoom,   setZoom]   = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Decode once to learn the natural size (the visible <img> just re-uses src).
  // onerror covers formats the browser can't decode (e.g. an iPhone HEIC/HEIF
  // outside Safari) so we show a message instead of a blank, dead modal.
  useEffect(() => {
    const img = new Image()
    img.onload  = () => { imgRef.current = img; setImgSize({ w: img.width, h: img.height }) }
    img.onerror = () => setDecodeError(true)
    img.src = src
  }, [src])

  // Scale at which the image exactly covers the crop window at zoom 1.
  const baseScale = imgSize ? VIEW / Math.min(imgSize.w, imgSize.h) : 1
  const k     = baseScale * zoom
  const dispW = (imgSize?.w ?? 0) * k
  const dispH = (imgSize?.h ?? 0) * k

  // The image must always cover the window: clamp panning to the overhang.
  const clampOffset = useCallback((o: { x: number; y: number }, dw: number, dh: number) => ({
    x: Math.max(-(dw - VIEW) / 2, Math.min((dw - VIEW) / 2, o.x)),
    y: Math.max(-(dh - VIEW) / 2, Math.min((dh - VIEW) / 2, o.y)),
  }), [])

  const handleZoom = (z: number) => {
    setZoom(z)
    if (!imgSize) return
    const nk = baseScale * z
    setOffset(o => clampOffset(o, imgSize.w * nk, imgSize.h * nk))
  }

  // Drag to reposition — pointer events cover mouse and touch alike.
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setOffset(clampOffset({
      x: drag.current.origX + (e.clientX - drag.current.startX),
      y: drag.current.origY + (e.clientY - drag.current.startY),
    }, dispW, dispH))
  }
  const onPointerUp = () => { drag.current = null }

  const exportSquare = (size: number): string => {
    const img = imgRef.current
    if (!img) return ''
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    // Viewport (0,0) in source-image pixels, then a VIEW-sized square from there.
    const left = VIEW / 2 - dispW / 2 + offset.x
    const top  = VIEW / 2 - dispH / 2 + offset.y
    ctx.drawImage(img, -left / k, -top / k, VIEW / k, VIEW / k, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  const handleApply = () => {
    const photo = exportSquare(OUT)
    const thumb = exportSquare(THUMB)
    if (photo && thumb) onApply(photo, thumb)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-label="Adjust photo"
      style={{
        position: 'fixed', inset: 0, zIndex: Z.confirmModal,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: t.panelBg, borderRadius: 16, padding: '18px 18px 16px',
          border: `1px solid ${t.border}`,
          boxShadow: '0 18px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, alignSelf: 'flex-start' }}>
          Adjust photo
        </div>

        {/* Crop window */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            width: VIEW, height: VIEW, overflow: 'hidden', position: 'relative',
            borderRadius: 10, background: isDark ? '#0E0C0A' : '#EDE6DC',
            cursor: 'grab', touchAction: 'none',
            border: `1.5px solid ${t.border}`,
          }}
        >
          {imgSize && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: VIEW / 2 - dispW / 2 + offset.x,
                top:  VIEW / 2 - dispH / 2 + offset.y,
                width: dispW, height: dispH,
                maxWidth: 'none', userSelect: 'none', pointerEvents: 'none',
              }}
            />
          )}
          {/* rule-of-thirds guides — hidden when the image can't be decoded */}
          {!decodeError && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {[1, 2].map(i => (
                <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i * 100) / 3}%`, width: 1, background: 'rgba(255,255,255,0.22)' }} />
              ))}
              {[1, 2].map(i => (
                <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i * 100) / 3}%`, height: 1, background: 'rgba(255,255,255,0.22)' }} />
              ))}
            </div>
          )}

          {decodeError && (
            <div style={{
              position: 'absolute', inset: 0, padding: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              fontSize: 12.5, color: t.textMuted, lineHeight: 1.5,
            }}>
              This image format isn’t supported. Please choose a JPG or PNG photo.
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: t.textMuted }}>
          {decodeError ? 'Pick a different photo to continue' : 'Drag to centre · slide to resize'}
        </div>

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: VIEW }}>
          <IconZoomOut size={15} color={t.textMuted} />
          <input
            type="range"
            min={1} max={MAX_ZOOM} step={0.01}
            value={zoom}
            onChange={e => handleZoom(parseFloat(e.target.value))}
            aria-label="Zoom"
            style={{ flex: 1, accentColor: 'var(--c-primary)' }}
          />
          <IconZoomIn size={15} color={t.textMuted} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, width: VIEW }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 38, borderRadius: 10, fontFamily: 'inherit',
              border: `1.5px solid ${t.border}`, background: 'transparent',
              color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <IconX size={15} /> Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!imgSize}
            style={{
              flex: 1, height: 38, borderRadius: 10, border: 'none', fontFamily: 'inherit',
              background: imgSize ? 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))' : 'rgb(var(--c-primary-rgb) / 0.4)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: imgSize ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: imgSize ? '0 3px 12px rgb(var(--c-primary-rgb) / 0.35)' : 'none',
            }}
          >
            <IconCheck size={15} /> Use photo
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
