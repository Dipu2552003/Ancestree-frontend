// Client-side image compression for photo uploads.
//
// Reads any image file the browser can decode, resizes it so the longest edge
// is at most MAX px, and re-encodes to JPEG (quality 0.78). Returns a data URL
// that's safe to persist directly (≤ ~50 KB for a typical portrait).
//
// Used by AddNodeWizard, NodePanel (PhotoEditor), SecondSpouseWizard, and the
// signup page. Single source of truth — do not re-duplicate.

const MAX = 480
const JPEG_QUALITY = 0.78

export function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Not an image'))
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(canvas.toDataURL()); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = reject
    img.src = blobUrl
  })
}
