'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconHome2 } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'

/** A single stop on the journey away from the user's own tree. */
interface JourneyStop {
  id: string
  name: string
}

interface TreeTimelineProps {
  /** Current perspective person id, or undefined when on the user's own tree. */
  perspectiveId?: string
  /** Display name of the current perspective person (known once the graph loads). */
  perspectiveName: string
  isDark: boolean
}

const STORAGE_KEY = 'treeJourney'

function readTrail(): JourneyStop[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as JourneyStop[]) : []
  } catch {
    return []
  }
}

/**
 * A breadcrumb "route map" pinned just above the bottom navbar.
 *
 * It records the chain of trees the user has hopped through. The first
 * checkpoint is always "My Tree" (home); each subsequent checkpoint is a tree
 * they travelled into via "View family tree" or search. The final checkpoint is
 * the tree they're on now ("You're here"). Clicking any earlier checkpoint jumps
 * back to it and trims the trail beyond that point.
 *
 * The trail is reconstructed purely from perspective changes, so it stays in
 * sync no matter which entry point triggered the navigation.
 */
export default function TreeTimeline({ perspectiveId, perspectiveName, isDark }: TreeTimelineProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const t = getTheme(isDark)
  const [stops, setStops] = useState<JourneyStop[]>([])

  // Reconcile the stored trail with the current perspective.
  useEffect(() => {
    if (!perspectiveId) {
      // Back on the user's own tree — the journey is over.
      sessionStorage.removeItem(STORAGE_KEY)
      setStops([])
      return
    }

    const trail = readTrail()
    const idx = trail.findIndex(s => s.id === perspectiveId)

    if (idx >= 0) {
      // Returned to a tree already in the trail — trim everything after it.
      const next = trail.slice(0, idx + 1)
      if (perspectiveName) next[idx] = { id: perspectiveId, name: perspectiveName }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStops(next)
    } else {
      // A new hop forward — wait until the name is known before appending so the
      // checkpoint never shows up blank.
      if (!perspectiveName) return
      const next = [...trail, { id: perspectiveId, name: perspectiveName }]
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStops(next)
    }
  }, [perspectiveId, perspectiveName])

  // Nothing travelled yet → no trail to show.
  if (stops.length === 0) return null

  // checkpoints[0] is always the implicit "My Tree" home stop.
  const checkpoints: (JourneyStop | null)[] = [null, ...stops]
  const lastIndex = checkpoints.length - 1

  const goTo = (cp: JourneyStop | null, isCurrent: boolean) => {
    if (isCurrent) return
    router.push(cp ? `/graph?perspective=${cp.id}` : '/graph')
  }

  const connectorColor = isDark ? 'rgba(196,168,130,0.35)' : 'rgba(181,149,106,0.55)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      style={{ maxWidth: 'calc(100vw - 24px)' }}
      aria-label="Tree journey"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '4px' : '6px',
          padding: isMobile ? '7px 12px' : '8px 16px',
          background: isDark ? 'rgba(28,26,18,0.92)' : 'rgba(255,251,244,0.94)',
          border: `1px solid ${t.borderNeutral}`,
          borderRadius: '999px',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.45)'
            : '0 4px 16px rgba(0,0,0,0.10)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          overflowX: 'auto',
          overflowY: 'hidden',
          maxWidth: '100%',
          scrollbarWidth: 'none',
          userSelect: 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {checkpoints.map((cp, i) => {
            const isHome    = i === 0
            const isCurrent = i === lastIndex
            const key       = cp ? cp.id : 'home'
            const label     = isHome ? 'My Tree' : cp!.name

            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                {/* Dotted connector before every checkpoint except the first */}
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: isMobile ? '20px' : '32px',
                      height: 0,
                      margin: '0 2px',
                      borderTop: `2px dotted ${connectorColor}`,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Checkpoint
                  isHome={isHome}
                  isCurrent={isCurrent}
                  label={label}
                  isDark={isDark}
                  isMobile={isMobile}
                  onClick={() => goTo(cp, isCurrent)}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Checkpoint({
  isHome, isCurrent, label, isDark, isMobile, onClick,
}: {
  isHome: boolean
  isCurrent: boolean
  label: string
  isDark: boolean
  isMobile: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const t = getTheme(isDark)
  const accent = '#EA580C'

  // Dot colours by state
  const dotBg = isCurrent
    ? accent
    : hovered
      ? (isDark ? 'rgba(234,88,12,0.30)' : 'rgba(234,88,12,0.16)')
      : 'transparent'
  const dotBorder = isCurrent ? accent : (isDark ? '#6B5F54' : '#C4A882')

  const labelColor = isCurrent
    ? accent
    : hovered
      ? t.text
      : t.textMuted

  const dotSize = isMobile ? 12 : 14

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isCurrent ? (isHome ? `You're here` : `Currently viewing ${label}`) : isHome ? 'Back to my tree' : `Go to ${label}'s tree`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '5px' : '7px',
        padding: isMobile ? '3px 6px' : '4px 8px',
        background: 'none',
        border: 'none',
        borderRadius: '999px',
        cursor: isCurrent ? 'default' : 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      {/* Dot / home marker */}
      <span
        style={{
          position: 'relative',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          borderRadius: '50%',
          background: isHome && !isCurrent ? 'transparent' : dotBg,
          border: `2px solid ${dotBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
          boxShadow: isCurrent ? `0 0 0 4px ${isDark ? 'rgba(234,88,12,0.18)' : 'rgba(234,88,12,0.14)'}` : 'none',
        }}
      >
        {isHome && (
          <IconHome2
            size={isMobile ? 9 : 10}
            color={isCurrent ? '#fff' : (isDark ? '#9A8A72' : '#B5956A')}
            style={{ position: 'absolute' }}
          />
        )}
        {isCurrent && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 2.2 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              border: `2px solid ${accent}`,
            }}
          />
        )}
      </span>

      {/* Label */}
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: 1.1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: isMobile ? '11.5px' : '12.5px',
            fontWeight: isCurrent ? 700 : 500,
            color: labelColor,
            whiteSpace: 'nowrap',
            maxWidth: isMobile ? '90px' : '130px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.15s',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        {isCurrent && (
          <span
            style={{
              fontSize: isMobile ? '7.5px' : '8.5px',
              fontWeight: 600,
              color: accent,
              opacity: 0.7,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {isHome ? "You're here" : 'Viewing'}
          </span>
        )}
      </span>
    </button>
  )
}
