'use client'

// AdminDashboard — the shell for the community admin control centre. Handles
// access (owner/admin only), the responsive navigation (a left sidebar on
// desktop, a scrollable tab bar on mobile) and which section is shown. All the
// actual content lives in AdminSections.
//
// Reached from the top-left "Admin" chip on the graph (shown only to admins).
// Clicking any user or family deep-links into their tree via ?perspective=.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconLayoutDashboard, IconUsers, IconHome, IconSettings, IconArrowMerge,
  IconArrowLeft, IconShieldStar, IconLoader2, IconChevronLeft,
} from '@tabler/icons-react'
import { api } from '@/lib/api'
import { getCommunitySlug } from '@/lib/storage'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getTheme } from '@/lib/theme'
import { OverviewSection, MembersSection, FamiliesSection, SettingsSection } from './AdminSections'

export type AdminTab = 'overview' | 'members' | 'families' | 'settings'

const NAV: { tab: AdminTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'overview', label: 'Overview', icon: <IconLayoutDashboard size={18} /> },
  { tab: 'members',  label: 'Members',  icon: <IconUsers size={18} /> },
  { tab: 'families', label: 'Families', icon: <IconHome size={18} /> },
  { tab: 'settings', label: 'Settings', icon: <IconSettings size={18} /> },
]

export default function AdminDashboard() {
  const router = useRouter()
  const isDark = useGraphStore(s => s.isDark)
  const isMobile = useIsMobile()
  const t = getTheme(isDark)

  const slug = getCommunitySlug()
  // Seed denied synchronously when there's no community, so we never call
  // setState in the effect body (only inside the async resolution below).
  const [access, setAccess] = useState<'checking' | 'ok' | 'denied'>(() => (slug ? 'checking' : 'denied'))
  const [isOwner, setIsOwner] = useState(false)
  const [tab, setTab] = useState<AdminTab>('overview')

  useEffect(() => {
    if (!slug) return
    api.community.me(slug)
      .then(({ role, is_owner }) => {
        setIsOwner(is_owner)
        setAccess(role === 'owner' || role === 'admin' ? 'ok' : 'denied')
      })
      .catch(() => setAccess('denied'))
  }, [slug])

  const pageBg = isDark ? '#0B0A09' : 'var(--c-page)'

  const openPerson = (personId: string) => router.push(`/graph?perspective=${encodeURIComponent(personId)}`)
  const openMerges = () => router.push('/community-merges')

  if (access === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pageBg }}>
        <IconLoader2 size={22} style={{ color: t.textMuted, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (access === 'denied') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: pageBg, padding: 24 }}>
        <IconShieldStar size={30} style={{ color: t.textMuted }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.text }}>Admins only</p>
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, textAlign: 'center', maxWidth: 340 }}>
          The admin dashboard is available to the community owner and admins.
        </p>
        <button onClick={() => router.push('/graph')} style={solidBtn}>
          <IconArrowLeft size={14} /> Back to my tree
        </button>
      </div>
    )
  }

  const sectionProps = { slug: slug!, isOwner, isDark, onOpenPerson: openPerson, onNavigate: setTab, onOpenMerges: openMerges }
  const content =
    tab === 'members'  ? <MembersSection  {...sectionProps} />
    : tab === 'families' ? <FamiliesSection {...sectionProps} />
    : tab === 'settings' ? <SettingsSection {...sectionProps} />
    :                      <OverviewSection {...sectionProps} />

  // ── Mobile: header + horizontal tab bar ─────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: pageBg }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: pageBg, borderBottom: `1px solid ${t.borderNeutral}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <button onClick={() => router.push('/graph')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4 }}>
              <IconChevronLeft size={20} />
            </button>
            <IconShieldStar size={18} style={{ color: 'var(--c-primary)' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Admin</span>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '0 10px 10px', overflowX: 'auto' }}>
            {NAV.map(n => (
              <TabChip key={n.tab} active={tab === n.tab} isDark={isDark} onClick={() => setTab(n.tab)}>
                {n.icon}{n.label}
              </TabChip>
            ))}
            {isOwner && (
              <TabChip active={false} isDark={isDark} onClick={openMerges}>
                <IconArrowMerge size={18} />Merges
              </TabChip>
            )}
          </div>
        </div>
        <div style={{ padding: '16px 14px 60px', maxWidth: 720, margin: '0 auto' }}>
          <SectionTitle tab={tab} isDark={isDark} />
          {content}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Desktop: fixed sidebar + content ────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex' }}>
      <aside style={{
        width: 236, flexShrink: 0, borderRight: `1px solid ${t.borderNeutral}`,
        padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 6,
        position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px 14px' }}>
          <IconShieldStar size={20} style={{ color: 'var(--c-primary)' }} />
          <span style={{ fontSize: 17, fontWeight: 800, color: t.text }}>Admin</span>
        </div>

        {NAV.map(n => (
          <NavRow key={n.tab} active={tab === n.tab} isDark={isDark} onClick={() => setTab(n.tab)} icon={n.icon}>
            {n.label}
          </NavRow>
        ))}

        {isOwner && (
          <NavRow active={false} isDark={isDark} onClick={openMerges} icon={<IconArrowMerge size={18} />}>
            Merge console
          </NavRow>
        )}

        <div style={{ flex: 1 }} />

        <NavRow active={false} isDark={isDark} onClick={() => router.push('/graph')} icon={<IconArrowLeft size={18} />}>
          Back to my tree
        </NavRow>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '30px 32px 72px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <SectionTitle tab={tab} isDark={isDark} />
          {content}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const TITLES: Record<AdminTab, { title: string; sub: string }> = {
  overview: { title: 'Overview',        sub: 'A snapshot of your community at a glance.' },
  members:  { title: 'Members',         sub: 'Everyone who has signed up — click anyone to open their tree.' },
  families: { title: 'Families',        sub: 'Every family tree in the community — click one to open it.' },
  settings: { title: 'Settings',        sub: 'Community details and the shared invite link.' },
}

function SectionTitle({ tab, isDark }: { tab: AdminTab; isDark: boolean }) {
  const t = getTheme(isDark)
  const m = TITLES[tab]
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>{m.title}</h1>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>{m.sub}</p>
    </div>
  )
}

function NavRow({ active, isDark, onClick, icon, children }: {
  active: boolean; isDark: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  const t = getTheme(isDark)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 13.5, fontWeight: active ? 700 : 500, textAlign: 'left',
        border: 'none',
        background: active ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.16)' : 'rgb(var(--c-primary-rgb) / 0.09)') : 'transparent',
        color: active ? 'var(--c-primary)' : t.textMuted,
      }}
    >
      <span style={{ display: 'flex', color: active ? 'var(--c-primary)' : t.textMuted }}>{icon}</span>
      {children}
    </button>
  )
}

function TabChip({ active, isDark, onClick, children }: {
  active: boolean; isDark: boolean; onClick: () => void; children: React.ReactNode
}) {
  const t = getTheme(isDark)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 13, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
        border: `1px solid ${active ? 'var(--c-primary)' : t.borderNeutral}`,
        background: active ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.16)' : 'rgb(var(--c-primary-rgb) / 0.09)') : 'transparent',
        color: active ? 'var(--c-primary)' : t.textMuted,
      }}
    >
      {children}
    </button>
  )
}

const solidBtn: React.CSSProperties = {
  height: 36, padding: '0 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', border: 'none',
  background: 'var(--c-primary)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
