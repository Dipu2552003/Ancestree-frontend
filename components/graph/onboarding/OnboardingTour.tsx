'use client'

// OnboardingTour — a one-time guided walkthrough for brand-new members who
// land on the tree straight from an invite claim (?onboarding=1). It spotlights
// six anchors in turn (each tagged with a `data-tour` attribute elsewhere) and
// explains what to click and what happens:
//
//   1. self-node    — your own card
//   2. nav-add      — add a relative
//   3. nav-edit     — edit details
//   4. hud-actions  — top-right options (notifications, theme, 3D, account)
//   5. family-badge — top-left family name, admins & member count
//   6. nav-home     — recenter on yourself / press again to exit to the community
//
// The overlay dims the page with a rounded "hole" over the current target and
// floats a tooltip beside it. The walkthrough is driven by Next/Back buttons
// (the page underneath is intentionally inert) so it can never get stuck on a
// mis-tap. Completion is persisted so it runs only once per browser.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getTheme, COLORS } from '@/lib/theme'

export const ONBOARDING_DONE_KEY = 'ancestree_onboarding_done'

interface Step {
  selector:   string
  title:      string
  body:       string
  placement:  'top' | 'bottom'
  pad?:       number
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="self-node"]', placement: 'bottom', pad: 10,
    title: 'This is you',
    body:  'Your own card sits at the heart of the tree. Tap it any time to select yourself — the bar at the bottom then acts on your node.',
  },
  {
    selector: '[data-tour="nav-add"]', placement: 'top',
    title: 'Add a relative',
    body:  'With a person selected, press Add to link a father, mother, spouse, child or sibling. This is how your family tree grows.',
  },
  {
    selector: '[data-tour="nav-edit"]', placement: 'top',
    title: 'Edit details',
    body:  'Open Edit to update the selected person’s name, photo, birth year, gotra, village and more.',
  },
  {
    selector: '[data-tour="hud-actions"]', placement: 'bottom',
    title: 'Your options',
    body:  'Up here live your notifications, history, light/dark theme, the 3D view and your account menu.',
  },
  {
    selector: '[data-tour="family-badge"]', placement: 'bottom',
    title: 'Family & members',
    body:  'Your family name and member count sit here. Click it to see all family admins, and click the number to switch between the side you’re viewing, the whole tree, and the community total.',
  },
  {
    selector: '[data-tour="nav-home"]', placement: 'top',
    title: 'Home',
    body:  'Press Home to recenter on your own card. Press Home again to jump back out to the community website.',
  },
]

interface Rect { top: number; left: number; width: number; height: number }

interface OnboardingTourProps {
  active:    boolean
  isDark:    boolean
  /** Selects the viewer's own node so Add/Edit/Home are meaningful during the tour. */
  onStart?:  () => void
  /** Called when the user finishes or skips — persist completion + strip the URL flag. */
  onFinish:  () => void
}

export default function OnboardingTour({ active, isDark, onStart, onFinish }: OnboardingTourProps) {
  const t = getTheme(isDark)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  // Lazy-init from the real viewport (client-only component) so we don't have to
  // setState synchronously inside an effect just to learn the window size.
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 })
  const startedRef = useRef(false)
  // Measured tooltip height — lets us flip/clamp it so it never leaves the screen
  // (its content, hence height, varies per step).
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(0)

  // Kick off: focus the viewer's own node once so downstream steps (Add, Edit,
  // Home) point at live, enabled controls.
  useEffect(() => {
    // Reset the run-once guard when the tour closes so it can be replayed from
    // the Help button (which just flips `active` back on).
    if (!active) { startedRef.current = false; return }
    if (startedRef.current) return
    startedRef.current = true
    setStep(0)
    onStart?.()
  }, [active, onStart])

  const current = STEPS[step]

  // Measure the current target. The tree recenters with a ~600ms animation on
  // start, and controls (Edit) can mount a frame late, so we re-measure a few
  // times after each step change rather than once. If the anchor never appears,
  // auto-advance so a missing control can't strand the tour.
  const measure = useCallback(() => {
    if (!current) return null
    const el = document.querySelector(current.selector) as HTMLElement | null
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return null
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  }, [current])

  useEffect(() => {
    if (!active) return

    let found = false
    const tryMeasure = () => {
      const r = measure()
      if (r) { found = true; setRect(r) }
      return !!r
    }

    // A short burst (starting next tick, so no synchronous setState in the effect
    // body) to catch the recenter animation and late-mounting controls.
    const timers = [0, 80, 250, 500, 700].map(ms => setTimeout(() => { if (active) tryMeasure() }, ms))
    // Give up after the burst if the anchor genuinely isn't present.
    const giveUp = setTimeout(() => {
      if (!found && active) setStep(s => (s < STEPS.length - 1 ? s + 1 : s))
    }, 900)

    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
      const r = measure()
      if (r) setRect(r)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(giveUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [active, step, measure])

  // Measure the tooltip after it paints so the flip/clamp below uses its real
  // height (content differs per step). rAF keeps it out of the render pass.
  useEffect(() => {
    if (!active) return
    const id = requestAnimationFrame(() => {
      if (cardRef.current) setCardH(cardRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(id)
  }, [active, step, rect, viewport.w, viewport.h])

  const finish = useCallback(() => { setRect(null); onFinish() }, [onFinish])
  const next = useCallback(() => {
    setRect(null)
    setStep(s => (s < STEPS.length - 1 ? s + 1 : (finish(), s)))
  }, [finish])
  const back = useCallback(() => { setRect(null); setStep(s => Math.max(0, s - 1)) }, [])

  // Escape skips the whole tour.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish])

  if (!active || !current || typeof document === 'undefined') return null

  const pad = current.pad ?? 8
  const isLast = step === STEPS.length - 1

  // Spotlight hole geometry (clamped to the viewport).
  const hole = rect ? {
    x: Math.max(0, rect.left - pad),
    y: Math.max(0, rect.top - pad),
    w: rect.width + pad * 2,
    h: rect.height + pad * 2,
  } : null

  // Tooltip position. Honour the step's preferred side when the card fits there;
  // otherwise flip to the side with room, then clamp so it's always fully
  // on-screen (works for a self-node near any edge, on desktop and mobile).
  const M = 12
  const CARD_W = Math.min(320, viewport.w - 2 * M)
  const ch = cardH || 260 // conservative fallback until measured (first frame)
  const maxCardH = viewport.h - 2 * M
  let cardLeft: number
  let cardTop: number
  if (rect) {
    const centre = rect.left + rect.width / 2
    cardLeft = Math.min(Math.max(M, centre - CARD_W / 2), viewport.w - M - CARD_W)
    const below = rect.top + rect.height + 14
    const above = rect.top - 14 - ch
    const fitsBelow = below + ch <= viewport.h - M
    const fitsAbove = above >= M
    cardTop = current.placement === 'bottom'
      ? (fitsBelow ? below : fitsAbove ? above : below)
      : (fitsAbove ? above : fitsBelow ? below : above)
    cardTop = Math.min(Math.max(M, cardTop), Math.max(M, viewport.h - ch - M))
  } else {
    // Anchor not measured yet — park the card centred so text is still readable.
    cardLeft = Math.max(M, viewport.w / 2 - CARD_W / 2)
    cardTop = Math.max(M, viewport.h / 2 - ch / 2)
  }

  const Z = 5000

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }}>
      {/* Dimmer + spotlight hole (blocks interaction with the page beneath). */}
      <svg
        width={viewport.w} height={viewport.h}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'auto' }}
      >
        <defs>
          <mask id="onboarding-hole">
            <rect x={0} y={0} width={viewport.w} height={viewport.h} fill="#fff" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={12} fill="#000" />}
          </mask>
        </defs>
        <rect
          x={0} y={0} width={viewport.w} height={viewport.h}
          fill="rgba(0,0,0,0.6)" mask="url(#onboarding-hole)"
        />
        {hole && (
          <rect
            x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={12}
            fill="none" stroke={COLORS.saffron} strokeWidth={2.5}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          ref={cardRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            position: 'fixed',
            left: cardLeft,
            top: cardTop,
            width: CARD_W,
            maxHeight: maxCardH,
            overflowY: 'auto',
            pointerEvents: 'auto',
            background: t.panelBg,
            border: `1px solid ${t.borderNeutral}`,
            borderRadius: 16,
            boxShadow: t.shadow,
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: COLORS.saffron,
            }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={finish}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: t.textMuted,
              }}
            >
              Skip
            </button>
          </div>

          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.text }}>
            {current.title}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.55, color: t.textMuted }}>
            {current.body}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <span key={i} style={{
                height: 4, borderRadius: 999,
                width: i === step ? 20 : 6,
                background: i <= step ? COLORS.saffron : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'),
                transition: 'width 0.2s, background 0.2s',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button
              onClick={back}
              disabled={step === 0}
              style={{
                height: 36, padding: '0 14px', borderRadius: 10,
                border: `1px solid ${t.borderNeutral}`, background: 'transparent',
                cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.4 : 1,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: t.textMuted,
              }}
            >
              Back
            </button>
            <button
              onClick={next}
              style={{
                height: 36, padding: '0 20px', borderRadius: 10, border: 'none',
                cursor: 'pointer', background: COLORS.saffron, color: '#fff',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              }}
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  )
}
