// Client-side image compression for photo uploads.
//
// Reads any image file the browser can decode, resizes it so the longest edge
// is at most MAX px, and re-encodes to JPEG (quality 0.78). Returns a data URL
// that's safe to persist directly (≤ ~50 KB for a typical portrait).
//
// Used by AddNodeWizard, NodePanel (PhotoEditor), SecondSpouseWizard, and the
// signup page. Single source of truth — do not re-duplicate.

const MAX = 480
const THUMB_MAX = 96
const JPEG_QUALITY = 0.78

function scaleToDataUrl(img: HTMLImageElement, max: number): string {
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(img.width  * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL()
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function decodeImage(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Not an image'))
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img) }
    img.onerror = reject
    img.src = blobUrl
  })
}

export async function compressPhoto(file: File): Promise<string> {
  return scaleToDataUrl(await decodeImage(file), MAX)
}

/** Main photo + small thumbnail (for node cards / lists) in one decode. */
export async function compressPhotoWithThumb(file: File): Promise<{ photo: string; thumb: string }> {
  const img = await decodeImage(file)
  return { photo: scaleToDataUrl(img, MAX), thumb: scaleToDataUrl(img, THUMB_MAX) }
}
