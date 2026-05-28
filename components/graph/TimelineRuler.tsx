'use client'

import { useNodes, useViewport } from '@xyflow/react'
import { YEAR_PX } from '@/lib/layouts/timelineLayout'

// ── Panel geometry ────────────────────────────────────────────────────────────
const PANEL_LEFT   = 14    // gap from left edge of screen
const PANEL_TOP    = 14    // gap from top
const PANEL_BOT    = 88    // clears the floating navbar
const RULER_W      = 64    // panel width
const AXIS_X       = 52    // axis line x within the panel
const SCREEN_PAD   = 160
const CURRENT_YEAR = 2026

// Tick row layout (right-aligned flex inside panel, paddingRight anchors tick end to AXIS_X)
const TICK_PAD_R  = RULER_W - AXIS_X        // = 12
const TODAY_PAD_R = RULER_W - AXIS_X - 4    // = 8  — centres the 8px dot on AXIS_X

interface Props { isDark: boolean }

export default function TimelineRuler({ isDark }: Props) {
  const nodes = useNodes()
  const { zoom, y: panY } = useViewport()

  const birthYears = nodes
    .map(n => (n.data as Record<string, unknown>).birthYear as number | undefined)
    .filter((y): y is number => y != null)

  const minYear = birthYears.length > 0
    ? Math.min(...birthYears)
    : CURRENT_YEAR - 80

  const screenH   = typeof window !== 'undefined' ? window.innerHeight : 800
  const panelH    = screenH - PANEL_TOP - PANEL_BOT

  // Absolute screen Y (relative to the outer inset:0 container)
  const yearToScreenY = (year: number) =>
    (year - minYear) * YEAR_PX * zoom + panY

  // Y relative to the panel div's top edge
  const yearToPanelY = (year: number) =>
    yearToScreenY(year) - PANEL_TOP

  // ── Adaptive tick density ─────────────────────────────────────────────────
  const step =
    zoom < 0.25 ? 20
    : zoom < 0.6  ? 10
    : zoom < 1.2  ? 5
    : zoom < 2.5  ? 2
    : 1

  const tickStart = Math.floor(minYear / 10) * 10
  const tickEnd   = CURRENT_YEAR + 10

  const visibleTicks: number[] = []
  for (let yr = tickStart; yr <= tickEnd; yr += step) {
    const py = yearToPanelY(yr)
    if (py > -SCREEN_PAD && py < panelH + SCREEN_PAD) visibleTicks.push(yr)
  }

  // Per-person markers (only when birth years exist in data)
  const personMarkers = birthYears.length > 0
    ? nodes
        .filter(n => (n.data as Record<string, unknown>).birthYear != null)
        .map(n => {
          const year = (n.data as Record<string, unknown>).birthYear as number
          return {
            id:      n.id,
            year,
            screenY: yearToScreenY(year),
            panelY:  yearToPanelY(year),
          }
        })
        .filter(m => m.panelY > -SCREEN_PAD && m.panelY < panelH + SCREEN_PAD)
    : []

  const todayPanelY  = yearToPanelY(CURRENT_YEAR)
  const todayScreenY = yearToScreenY(CURRENT_YEAR)
  const showToday    = todayPanelY > -SCREEN_PAD && todayPanelY < panelH + SCREEN_PAD

  // ── Theme ─────────────────────────────────────────────────────────────────
  const glassBg = isDark
    ? 'rgba(18,14,9,0.72)'
    : 'rgba(255,251,245,0.72)'
  const glassBorder = isDark
    ? 'rgba(255,255,255,0.07)'
    : 'rgba(255,255,255,0.85)'
  const glassShadow = isDark
    ? '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)'
    : '0 8px 32px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.95)'
  const axisCol  = isDark ? 'rgba(234,88,12,0.22)' : 'rgba(234,88,12,0.18)'
  const textPri  = isDark ? '#7A6A52'              : '#6B4A28'
  const textSec  = isDark ? 'rgba(122,106,82,0.50)' : 'rgba(107,74,40,0.45)'
  const saffron  = '#EA580C'
  const connCol  = isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.06)'
  const labelCol = isDark ? 'rgba(234,88,12,0.28)' : 'rgba(234,88,12,0.25)'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}>

      {/* ── Dashed connector lines across the canvas (screen-Y based) ── */}
      {personMarkers.map(m => (
        <div
          key={`conn-${m.id}`}
          style={{
            position: 'absolute',
            left:  PANEL_LEFT + RULER_W + 4,
            right: 0,
            top:   m.screenY,
            height: 0,
            borderTop: `1px dashed ${connCol}`,
          }}
        />
      ))}

      {/* ── Floating glassmorphism panel ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top:    PANEL_TOP,
        left:   PANEL_LEFT,
        width:  RULER_W,
        height: panelH,
        borderRadius: 16,
        overflow: 'hidden',
        background: glassBg,
        border: `1px solid ${glassBorder}`,
        boxShadow: glassShadow,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>

        {/* Inner satin sheen — top highlight stripe */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 1,
          background: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.90)',
        }} />

        {/* Vertical axis line */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: AXIS_X,
          width: 1,
          background: axisCol,
        }} />

        {/* Mode label */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 0, right: TICK_PAD_R,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <span style={{
            fontSize: '7.5px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: labelCol,
            userSelect: 'none',
          }}>
            Time
          </span>
        </div>

        {/* ── Year tick marks ── */}
        {visibleTicks.map(year => {
          const py        = yearToPanelY(year)
          const isDecade  = year % 10 === 0
          const showLabel = isDecade || step <= 2
          const tickLen   = isDecade ? 10 : 6

          return (
            <div
              key={year}
              style={{
                position: 'absolute',
                top:   py,
                left:  0,
                right: TICK_PAD_R,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
              }}
            >
              {showLabel && (
                <span style={{
                  fontSize: isDecade ? '10px' : '9px',
                  fontWeight: isDecade ? 600 : 400,
                  color: isDecade ? textPri : textSec,
                  letterSpacing: '0.03em',
                  userSelect: 'none',
                  lineHeight: 1,
                }}>
                  {year}
                </span>
              )}
              <div style={{
                width:      tickLen,
                height:     1,
                background: saffron,
                opacity:    isDecade ? 0.42 : 0.18,
                flexShrink: 0,
              }} />
            </div>
          )
        })}

        {/* ── Per-person dots on the axis ── */}
        {personMarkers.map(m => (
          <div
            key={`dot-${m.id}`}
            style={{
              position:     'absolute',
              top:          m.panelY,
              left:         AXIS_X,
              transform:    'translate(-50%, -50%)',
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   saffron,
              boxShadow:    `0 0 0 2px ${isDark ? 'rgba(234,88,12,0.18)' : 'rgba(234,88,12,0.14)'}`,
            }}
          />
        ))}

        {/* ── Today marker ── */}
        {showToday && (
          <div
            style={{
              position:  'absolute',
              top:       todayPanelY,
              left:      0,
              right:     TODAY_PAD_R,
              transform: 'translateY(-50%)',
              display:   'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 5,
            }}
          >
            <span style={{
              fontSize:   '8px',
              fontWeight: 700,
              color:      saffron,
              letterSpacing: '0.06em',
              userSelect: 'none',
              lineHeight: 1,
            }}>
              Today
            </span>
            <div style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   saffron,
              flexShrink:   0,
              boxShadow:    '0 0 0 2.5px rgba(234,88,12,0.22), 0 0 10px rgba(234,88,12,0.30)',
            }} />
          </div>
        )}

      </div>
    </div>
  )
}
