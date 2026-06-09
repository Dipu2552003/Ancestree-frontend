'use client'

// Absolute-positioned slot in the top HUD strip. Encapsulates the repetition of
// `position: absolute; top: 16 + hudOffset; zIndex: 50; transition: top 0.3s`
// across the profile menu / bell / theme toggle / search bar.
//
// Pass exactly one of `left` or `right` (or both for the search bar's centered
// case via the `centered` flag).

import type { ReactNode } from 'react'

interface HudSlotProps {
  hudOffset:  number
  /** Top offset added on top of `16 + hudOffset`. Defaults to 0. */
  topExtra?:  number
  left?:      string
  right?:     string
  width?:     string
  /** When true, centers on x via `left: 50%; transform: translateX(-50%)`. */
  centered?:  boolean
  zIndex?:    number
  children:   ReactNode
}

export default function HudSlot({
  hudOffset, topExtra = 0, left, right, width, centered, zIndex = 50, children,
}: HudSlotProps) {
  return (
    <div style={{
      position:   'absolute',
      top:        `${16 + hudOffset + topExtra}px`,
      ...(centered
        ? { left: '50%', transform: 'translateX(-50%)' }
        : { left, right }),
      width,
      zIndex,
      transition: 'top 0.3s ease',
    }}>
      {children}
    </div>
  )
}
