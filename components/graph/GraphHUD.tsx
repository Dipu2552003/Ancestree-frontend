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
// `hudOffset` lets the parent push the whole row down when the exploration
// banner is present (so nothing overlaps it). Positioning is delegated to
// HudSlot so every entry uses the same top/transition rules.

import { IconSun, IconMoon, IconBell, IconHistory } from '@tabler/icons-react'
import ProfileMenu from './ProfileMenu'
import SearchBar from './SearchBar'
import HudSlot from './hud/HudSlot'
import FamilyBadge from './hud/FamilyBadge'
import GotraToggle from './GotraToggle'
import { IconButton } from '@/components/ui'

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
  onSelectPerson:    (personId: string) => boolean
  /** Community mode only — opens the family admin list. */
  onFamilyClick?:    () => void
}

export default function GraphHUD({
  familyName, memberCount, unreadCount, isDark, isMobile, hudOffset,
  onToggleTheme, onToggleNotif, onToggleHistory, onSelectPerson, onFamilyClick,
}: GraphHUDProps) {
  const iconSize = isMobile ? 'mobile' : 'desktop'

  return (
    <>
      {/* On mobile the badge is bounded on the right so it can never slide
          under the icon cluster — the family name truncates instead. */}
      <HudSlot hudOffset={hudOffset} left="16px" right={isMobile ? '260px' : undefined}>
        <FamilyBadge familyName={familyName} memberCount={memberCount} isDark={isDark} compact={isMobile} onClick={onFamilyClick} />
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right="208px">
        <ProfileMenu isDark={isDark} isMobile={isMobile} />
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right="160px">
        <GotraToggle isDark={isDark} isMobile={isMobile} />
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right="112px">
        <IconButton
          isDark={isDark}
          size={iconSize}
          title="History"
          onClick={onToggleHistory}
        >
          <IconHistory size={17} />
        </IconButton>
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right="64px">
        <IconButton
          isDark={isDark}
          size={iconSize}
          title="Notifications"
          onClick={onToggleNotif}
          badge={unreadCount}
        >
          <IconBell size={17} />
        </IconButton>
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right="16px">
        <IconButton
          isDark={isDark}
          size={iconSize}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
        </IconButton>
      </HudSlot>

      {/* Search bar — centered on desktop, full-width below top bar on mobile */}
      <HudSlot
        hudOffset={hudOffset}
        topExtra={isMobile ? 52 : 0}
        centered={!isMobile}
        left={isMobile ? '16px' : undefined}
        width={isMobile ? 'calc(100% - 32px)' : '320px'}
      >
        <SearchBar isDark={isDark} onSelectPerson={onSelectPerson} />
      </HudSlot>
    </>
  )
}
