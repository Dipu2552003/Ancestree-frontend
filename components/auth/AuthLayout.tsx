'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import AuthPreviewCanvas from '@/components/auth/AuthPreviewCanvas'
import type { AuthPolaroidData } from '@/components/auth/AuthPolaroid'

// ── Panel dot field (container-scoped, theme-aware) ───────────────────────────
const GRID = 28, DOT_R = 1.2, REPEL_R = 100, REPEL_F = 6, SPRING = 0.07, DAMP = 0.80

type Dot = { ox: number; oy: number; x: number; y: number; vx: number; vy: number }

function PanelDotField({ isDark }: { isDark: boolean }) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse     = useRef({ x: -9999, y: -9999 })
  const dots      = useRef<Dot[]>([])
  const raf       = useRef(0)
  const darkRef   = useRef(isDark)

  useEffect(() => { darkRef.current = isDark }, [isDark])

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')!

    const rebuild = () => {
      const { width, height } = wrap.getBoundingClientRect()
      canvas.width = width; canvas.height = height
      const next: Dot[] = []
      for (let r = 0; r < Math.ceil(height / GRID) + 2; r++)
        for (let c = 0; c < Math.ceil(width / GRID) + 2; c++)
          next.push({ ox: c*GRID, oy: r*GRID, x: c*GRID, y: r*GRID, vx: 0, vy: 0 })
      dots.current = next
    }

    const onMove  = (e: MouseEvent) => { const r = wrap.getBoundingClientRect(); mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top } }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }

    const ro = new ResizeObserver(rebuild)
    ro.observe(wrap)
    window.addEventListener('mousemove', onMove)
    wrap.addEventListener('mouseleave', onLeave)
    rebuild()

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouse.current
      const color = darkRef.current ? 'rgba(255,255,255,0.12)' : 'rgba(160,100,20,0.28)'
      for (const d of dots.current) {
        const dx = d.x - mx, dy = d.y - my, dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < REPEL_R && dist > 0) {
          const s = (REPEL_R - dist) / REPEL_R * REPEL_F
          d.vx += (dx / dist) * s; d.vy += (dy / dist) * s
        }
        d.vx += (d.ox - d.x) * SPRING; d.vy += (d.oy - d.y) * SPRING
        d.vx *= DAMP; d.vy *= DAMP; d.x += d.vx; d.y += d.vy
        ctx.beginPath(); ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2)
        ctx.fillStyle = color; ctx.fill()
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      wrap.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  )
}

// ── Public types ──────────────────────────────────────────────────────────────
export type AuthLang = 'en' | 'hi'

export interface AuthLayoutProps {
  lang:         AuthLang
  onLangChange: (l: AuthLang) => void
  /** When set, the right panel swaps the demo tree for a hero polaroid. */
  preview?:     AuthPolaroidData | null
  children:     React.ReactNode
}

const EASE = [0.22, 1, 0.36, 1] as const

// ── Layout shell ──────────────────────────────────────────────────────────────
export default function AuthLayout({ lang, onLangChange, preview = null, children }: AuthLayoutProps) {
  const { isDark, setIsDark } = useGraphStore()
  const t = getTheme(isDark)
  const isMobile = useIsMobile()

  const lv = {
    navBg:        isDark ? 'rgba(11,10,9,0.88)'      : 'rgba(255,247,237,0.88)',
    navBorder:    isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(234,88,12,0.10)',
    panelBorder:  isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(234,88,12,0.09)',
    toggleBg:     isDark ? 'rgba(234,88,12,0.10)'     : 'rgba(234,88,12,0.07)',
    toggleBorder: isDark ? 'rgba(234,88,12,0.25)'     : 'rgba(234,88,12,0.18)',
    langInactFg:  isDark ? '#B87B4A'                  : '#9A6C3C',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: t.pageBg, fontFamily: 'inherit', transition: 'background 0.35s ease' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{
          height: 64, padding: isMobile ? '0 16px' : '0 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${lv.navBorder}`,
          background: lv.navBg,
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          position: 'sticky', top: 0, zIndex: 50,
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        {/* Wordmark */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #EA580C, #C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(234,88,12,0.34)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="5"  r="2.4" fill="white" />
              <circle cx="4"  cy="15" r="2"   fill="white" opacity="0.85" />
              <circle cx="16" cy="15" r="2"   fill="white" opacity="0.85" />
              <line x1="10" y1="7.4" x2="4"  y2="13" stroke="white" strokeWidth="1.4" opacity="0.60" />
              <line x1="10" y1="7.4" x2="16" y2="13" stroke="white" strokeWidth="1.4" opacity="0.60" />
            </svg>
          </div>
          <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: t.text, letterSpacing: '-0.03em', userSelect: 'none', transition: 'color 0.35s ease' }}>
            Ancestree
          </span>
        </a>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Lang toggle */}
          <div style={{ display: 'flex', borderRadius: 10, padding: 3, gap: 2, background: lv.toggleBg, border: `1.5px solid ${lv.toggleBorder}`, transition: 'background 0.35s ease, border-color 0.35s ease' }}>
            {(['en', 'hi'] as AuthLang[]).map(l => (
              <motion.button
                key={l}
                onClick={() => onLangChange(l)}
                animate={{ background: lang === l ? '#EA580C' : 'rgba(0,0,0,0)', color: lang === l ? '#fff' : lv.langInactFg, boxShadow: lang === l ? '0 1px 6px rgba(234,88,12,0.38)' : '0 0 0 rgba(0,0,0,0)' }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.94 }}
                style={{ minWidth: 48, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: l === 'hi' ? 13.5 : 12, fontWeight: 700, letterSpacing: l === 'en' ? '0.05em' : 0 }}
              >
                {l === 'en' ? 'EN' : 'हि'}
              </motion.button>
            ))}
          </div>

          {/* Dark/light toggle */}
          <motion.button
            onClick={() => setIsDark(!isDark)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{ width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${lv.toggleBorder}`, background: lv.toggleBg, color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.35s ease, border-color 0.35s ease, color 0.35s ease' }}
          >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </motion.button>
        </div>
      </motion.header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Left — page content */}
        <div style={{
          width: isMobile ? '100%' : '50%',
          display: 'flex', alignItems: 'center',
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: isMobile ? '28px 18px 44px' : '56px 48px',
          borderRight: isMobile ? 'none' : `1px solid ${lv.panelBorder}`,
          transition: 'border-color 0.35s ease', overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            {children}
          </div>
        </div>

        {/* Right — demo tree (decorative; hidden on mobile) */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.80, delay: 0.18 }}
            style={{ width: '50%', minHeight: 'calc(100vh - 64px)', position: 'sticky', top: 64, background: t.pageBg, overflow: 'hidden', transition: 'background 0.35s ease' }}
          >
            <PanelDotField isDark={isDark} />
            <AuthPreviewCanvas preview={preview} />
          </motion.div>
        )}

      </div>
    </div>
  )
}
