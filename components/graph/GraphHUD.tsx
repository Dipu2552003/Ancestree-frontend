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
import { IconSun, IconMoon, IconBell, IconHistory, IconMenu2, IconX, IconCube3dSphere, IconArrowsMaximize, IconArrowsMinimize, IconShieldStar } from '@tabler/icons-react'
import ProfileMenu from './ProfileMenu'
import SearchBar from './SearchBar'
import HudSlot from './hud/HudSlot'
import FamilyBadge from './hud/FamilyBadge'
import { IconButton } from '@/components/ui'
import { getTheme } from '@/lib/theme'

interface GraphHUDProps {
  familyName:        string
  memberCount:       number
  /** Which count the badge is showing — cycled by clicking the number. */
  countMode?:        'side' | 'family' | 'community'
  onCycleCount?:     () => void
  unreadCount:       number
  isDark:            boolean
  isMobile:          boolean
  hudOffset:         number
  onToggleTheme:     () => void
  onToggleNotif:     () => void
  onToggleHistory:   () => void
  /** Full view — every couple node expanded into its two people. */
  fullView:          boolean
  onToggleFullView:  () => void
  /** Opens the 3D family-graph view (familygraph app) in a new tab. */
  onOpen3D:          () => void
  onSelectPerson:    (personId: string) => boolean
  /** Community mode only — opens the family admin list. */
  onFamilyClick?:    () => void
  /** Community logins only — gates community-specific controls (gotra toggle). */
  isCommunity?:      boolean
  /** Community owner/admin — reveals the top-left Admin entry. */
  isAdmin?:          boolean
  /** Opens the full admin dashboard. */
  onOpenAdmin?:      () => void
}

export default function GraphHUD({
  familyName, memberCount, countMode, onCycleCount, unreadCount, isDark, isMobile, hudOffset,
  onToggleTheme, onToggleNotif, onToggleHistory, fullView, onToggleFullView,
  onOpen3D, onSelectPerson, onFamilyClick,
  isCommunity = false, isAdmin = false, onOpenAdmin,
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
      {/* Family badge — on mobile it takes the space left of the hamburger button.
          The Admin entry (owner/admin only) sits right beside it on both mobile
          and desktop (top-left), so the dashboard is always one tap away. */}
      <HudSlot hudOffset={hudOffset} left="16px" right={isMobile ? '72px' : undefined}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: 8, alignItems: isMobile ? 'center' : 'flex-start', maxWidth: '100%',
        }}>
          <FamilyBadge familyName={familyName} memberCount={memberCount} countMode={countMode} onCycleCount={onCycleCount} isDark={isDark} compact={isMobile} onClick={onFamilyClick} />
          {isAdmin && onOpenAdmin && (
            <button
              data-tour="admin-entry"
              onClick={onOpenAdmin}
              title="Open the admin dashboard"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: isMobile ? '6px 10px' : '5px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.01em',
                background: 'var(--c-primary)', color: '#fff', border: 'none',
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <IconShieldStar size={14} /> Admin
            </button>
          )}
        </div>
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
                  {/* Admin dashboard (owner/admin only) */}
                  {isAdmin && onOpenAdmin && (
                    <>
                      <DropdownRow
                        label="Admin dashboard"
                        isDark={isDark} t={t}
                        onClick={() => { setMobileOpen(false); onOpenAdmin() }}
                      >
                        <IconButton isDark={isDark} size="desktop" title="Admin dashboard">
                          <IconShieldStar size={17} />
                        </IconButton>
                      </DropdownRow>
                      <DropdownDivider isDark={isDark} />
                    </>
                  )}

                  {/* Profile */}
                  <DropdownRow label="Account" isDark={isDark} t={t}>
                    <ProfileMenu isDark={isDark} isMobile={true} />
                  </DropdownRow>

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

                  {/* Full view */}
                  <DropdownRow
                    label={fullView ? 'Exit full view' : 'Full view'}
                    isDark={isDark} t={t}
                    onClick={() => { setMobileOpen(false); onToggleFullView() }}
                  >
                    <IconButton isDark={isDark} size="desktop" title="Full view" active={fullView}>
                      {fullView ? <IconArrowsMinimize size={17} /> : <IconArrowsMaximize size={17} />}
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
              data-tour="hud-actions"
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
          <HudSlot hudOffset={hudOffset} right="208px">
            <ProfileMenu isDark={isDark} isMobile={isMobile} />
          </HudSlot>

          <HudSlot hudOffset={hudOffset} right="160px">
            <IconButton isDark={isDark} size={iconSize} title="3D view" onClick={onOpen3D}>
              <IconCube3dSphere size={17} />
            </IconButton>
          </HudSlot>

          <HudSlot hudOffset={hudOffset} right="256px">
            <IconButton
              isDark={isDark} size={iconSize}
              title={fullView ? 'Exit full view (re-pair couples)' : 'Full view (show every person)'}
              onClick={onToggleFullView}
              active={fullView}
            >
              {fullView ? <IconArrowsMinimize size={17} /> : <IconArrowsMaximize size={17} />}
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
            <div data-tour="hud-actions" style={{ display: 'flex' }}>
              <IconButton isDark={isDark} size={iconSize} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme}>
                {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </IconButton>
            </div>
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
  const childRef = useRef<HTMLDivElement>(null)

  // Every row is a full-width hit target. Action rows use the supplied onClick;
  // widget rows (Account / Family view) have no onClick — instead the tap is
  // forwarded to their embedded control's button, so the whole row (not just
  // the icon) opens it.
  const handleRowClick = () => {
    if (onClick) { onClick(); return }
    childRef.current?.querySelector('button')?.click()
  }

  return (
    <div
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '10px',
        padding:       '6px 8px',
        borderRadius:  '10px',
        cursor:        'pointer',
        background:    hovered ? t.itemHoverBg : 'transparent',
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
      {onClick ? (
        // Action row: the icon is decorative — the row owns the click.
        <div style={{ display: 'flex', pointerEvents: 'none' }}>
          {children}
        </div>
      ) : (
        // Widget row: keep the control interactive; stop its own clicks from
        // re-triggering the row's forward handler.
        <div ref={childRef} onClick={e => e.stopPropagation()} style={{ display: 'flex' }}>
          {children}
        </div>
      )}
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
