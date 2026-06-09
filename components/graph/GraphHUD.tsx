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

import { IconSun, IconMoon, IconBell } from '@tabler/icons-react'
import ProfileMenu from './ProfileMenu'
import SearchBar from './SearchBar'
import HudSlot from './hud/HudSlot'
import FamilyBadge from './hud/FamilyBadge'
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
  onSelectPerson:    (personId: string) => boolean
}

export default function GraphHUD({
  familyName, memberCount, unreadCount, isDark, isMobile, hudOffset,
  onToggleTheme, onToggleNotif, onSelectPerson,
}: GraphHUDProps) {
  const iconSize = isMobile ? 'mobile' : 'desktop'

  return (
    <>
      <HudSlot hudOffset={hudOffset} left="16px">
        <FamilyBadge familyName={familyName} memberCount={memberCount} isDark={isDark} />
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right={isMobile ? '120px' : '112px'}>
        <ProfileMenu isDark={isDark} isMobile={isMobile} />
      </HudSlot>

      <HudSlot hudOffset={hudOffset} right={isMobile ? '68px' : '64px'}>
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
