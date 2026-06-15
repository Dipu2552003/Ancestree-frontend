'use client'

// GraphHUD — the top strip of overlays on the graph page:
//
//   • Family name badge (top-left)
//   • Profile menu       (top-right cluster)
//   • Notification bell  (top-right cluster, with unread badge)
//   • Theme toggle       (top-right cluster)
//   • Search bar         (top-centre on desktop, full-width below top bar
//                          on mobile)
//
// On mobile all right-side icons collapse into a single hamburger button
// that opens a vertical dropdown. Desktop keeps individual slots.
//
// `hudOffset` lets the parent push the whole row down when the exploration
// banner is present (so nothing overlaps it). Positioning is delegated to
// HudSlot so every entry uses the same top/transition rules.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSun, IconMoon, IconBell, IconHistory, IconMenu2, IconX, IconCube3dSphere } from '@tabler/icons-react'
import ProfileMenu from './ProfileMenu'
import SearchBar from './SearchBar'
import HudSlot from './hud/HudSlot'
import FamilyBadge from './hud/FamilyBadge'
import GotraToggle from './GotraToggle'
import { IconButton } from '@/components/ui'
import { getTheme } from '@/lib/theme'

interface GraphHUDProps {
  familyName:        string
  memberCount:       number
  unreadCount:       number
  isDark:            boolean
  isMobile:          boolean
  hudOffset:         number
  onToggleTheme:     () => void
  onToggleNotif:     () => void
  onToggleHistory:   () => void
  /** Opens the 3D family-graph view (familygraph app) in a new tab. */
  onOpen3D:          () => void
  onSelectPerson:    (personId: string) => boolean
  /** Community mode only — opens the family admin list. */
  onFamilyClick?:    () => void
  /** Community logins only — gates community-specific controls (gotra toggle). */
  isCommunity?:      boolean
}

export default function GraphHUD({
  familyName, memberCount, unreadCount, isDark, isMobile, hudOffset,
  onToggleTheme, onToggleNotif, onToggleHistory, onOpen3D, onSelectPerson, onFamilyClick,
  isCommunity = false,
}: GraphHUDProps) {
  const t = getTheme(isDark)
  const iconSize = isMobile ? 'mobile' : 'desktop'

  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) return
    function onOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMobileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [mobileOpen])

  return (
    <>
      {/* Family badge — on mobile it takes the space left of the hamburger button */}
      <HudSlot hudOffset={hudOffset} left="16px" right={isMobile ? '72px' : undefined}>
        <FamilyBadge familyName={familyName} memberCount={memberCount} isDark={isDark} compact={isMobile} onClick={onFamilyClick} />
      </HudSlot>

      {isMobile ? (
        /* ── Mobile: single hamburger + dropdown ── */
        <HudSlot hudOffset={hudOffset} right="16px" zIndex={60}>
          <div ref={menuRef} style={{ position: 'relative' }}>

            {/* Dropdown panel */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{    opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position:     'absolute',
                    top:          52,
                    right:        0,
                    background:   t.panelBg,
                    border:       `1.5px solid ${t.borderNeutral}`,
                    borderRadius: '16px',
                    padding:      '8px',
                    boxShadow:    t.shadow,
                    minWidth:     '200px',
                    display:      'flex',
                    flexDirection:'column',
                    gap:          '2px',
                  }}
                >
                  {/* Profile */}
                  <DropdownRow label="Account" isDark={isDark} t={t}>
                    <ProfileMenu isDark={isDark} isMobile={false} />
                  </DropdownRow>

                  {/* Gotra / family view — community logins only */}
                  {isCommunity && (
                    <DropdownRow label="Family view" isDark={isDark} t={t}>
                      <GotraToggle isDark={isDark} isMobile={false} />
                    </DropdownRow>
                  )}

                  <DropdownDivider isDark={isDark} />

                  {/* 3D view */}
                  <DropdownRow
                    label="3D view"
                    isDark={isDark} t={t}
                    onClick={() => { setMobileOpen(false); onOpen3D() }}
                  >
                    <IconButton isDark={isDark} size="desktop" title="3D view">
                      <IconCube3dSphere size={17} />
                    </IconButton>
                  </DropdownRow>

                  {/* History */}
                  <DropdownRow
                    label="History"
                    isDark={isDark} t={t}
                    onClick={() => { setMobileOpen(false); onToggleHistory() }}
                  >
                    <IconButton isDark={isDark} size="desktop" title="History">
                      <IconHistory size={17} />
                    </IconButton>
                  </DropdownRow>

                  {/* Notifications */}
                  <DropdownRow
                    label="Notifications"
                    badge={unreadCount}
                    isDark={isDark} t={t}
                    onClick={() => { setMobileOpen(false); onToggleNotif() }}
                  >
                    <IconButton isDark={isDark} size="desktop" title="Notifications" badge={unreadCount}>
                      <IconBell size={17} />
                    </IconButton>
                  </DropdownRow>

                  {/* Theme toggle */}
                  <DropdownRow
                    label={isDark ? 'Light mode' : 'Dark mode'}
                    isDark={isDark} t={t}
                    onClick={onToggleTheme}
                  >
                    <IconButton isDark={isDark} size="desktop" title={isDark ? 'Light mode' : 'Dark mode'}>
                      {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
                    </IconButton>
                  </DropdownRow>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hamburger trigger button */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              style={{
                width:           44,
                height:          44,
                borderRadius:    8,
                background:      mobileOpen ? 'var(--c-primary)' : t.toggleBg,
                color:           mobileOpen ? '#fff'    : t.toggleColor,
                border:          `1.5px solid ${mobileOpen ? 'var(--c-primary)' : t.toggleBorder}`,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                cursor:          'pointer',
                boxShadow:       isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
                transition:      'background 0.15s, color 0.15s, border-color 0.15s',
              }}
              title="Menu"
            >
              {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
            </button>
          </div>
        </HudSlot>
      ) : (
        /* ── Desktop: individual slots ── */
        <>
          <HudSlot hudOffset={hudOffset} right={isCommunity ? '256px' : '208px'}>
            <ProfileMenu isDark={isDark} isMobile={isMobile} />
          </HudSlot>

          {isCommunity && (
            <HudSlot hudOffset={hudOffset} right="208px">
              <GotraToggle isDark={isDark} isMobile={isMobile} />
            </HudSlot>
          )}

          <HudSlot hudOffset={hudOffset} right="160px">
            <IconButton isDark={isDark} size={iconSize} title="3D view" onClick={onOpen3D}>
              <IconCube3dSphere size={17} />
            </IconButton>
          </HudSlot>

          <HudSlot hudOffset={hudOffset} right="112px">
            <IconButton isDark={isDark} size={iconSize} title="History" onClick={onToggleHistory}>
              <IconHistory size={17} />
            </IconButton>
          </HudSlot>

          <HudSlot hudOffset={hudOffset} right="64px">
            <IconButton isDark={isDark} size={iconSize} title="Notifications" onClick={onToggleNotif} badge={unreadCount}>
              <IconBell size={17} />
            </IconButton>
          </HudSlot>

          <HudSlot hudOffset={hudOffset} right="16px">
            <IconButton isDark={isDark} size={iconSize} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme}>
              {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
            </IconButton>
          </HudSlot>
        </>
      )}

      {/* Search bar — centered on desktop, full-width below top bar on mobile */}
      <HudSlot
        hudOffset={hudOffset}
        topExtra={isMobile ? 52 : 0}
        centered={!isMobile}
        left={isMobile ? '16px' : undefined}
        width={isMobile ? 'calc(100% - 32px)' : '420px'}
      >
        <SearchBar isDark={isDark} onSelectPerson={onSelectPerson} />
      </HudSlot>
    </>
  )
}

// ── Local helpers ──────────────────────────────────────────────────────────────

function DropdownRow({
  label, badge, onClick, children, isDark, t,
}: {
  label:     string
  badge?:    number
  onClick?:  () => void
  children:  React.ReactNode
  isDark:    boolean
  t:         ReturnType<typeof getTheme>
}) {
  const [hovered, setHovered] = useState(false)
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '10px',
        padding:       '6px 8px',
        borderRadius:  '10px',
        cursor:        isClickable ? 'pointer' : 'default',
        background:    hovered && isClickable ? t.itemHoverBg : 'transparent',
        transition:    'background 0.12s',
        userSelect:    'none',
      }}
    >
      <span style={{ flex: 1, fontSize: '13px', color: t.text, fontWeight: 500 }}>
        {label}
        {!!badge && badge > 0 && (
          <span style={{
            marginLeft: 6, fontSize: 10, fontWeight: 700,
            background: 'var(--c-primary)', color: '#fff',
            borderRadius: 999, padding: '1px 5px',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {/* Prevent row click from propagating into the child button */}
      <div onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function DropdownDivider({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      height:     '1px',
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      margin:     '4px 0',
    }} />
  )
}
