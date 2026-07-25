'use client'

// Content for each tab of the admin dashboard. Every section fetches its own
// data and is fully self-contained so the shell (AdminDashboard) only has to
// pick which one to render. Presentation matches the app's warm, card-based
// look via getTheme.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IconUsers, IconHome, IconUserCircle, IconShieldStar, IconSearch,
  IconLoader2, IconArrowMerge, IconCopy, IconCheck,
  IconRefresh, IconDeviceFloppy, IconChevronRight, IconAlertTriangle,
} from '@tabler/icons-react'
import { api, type CommunityMember, type CommunityFamily, type CommunityHealth } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'
import type { AdminTab } from './AdminDashboard'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

interface SectionProps {
  slug:         string
  isOwner:      boolean
  isDark:       boolean
  /** Open a person's tree (perspective view) — used for clickable users/families. */
  onOpenPerson: (personId: string) => void
  /** Switch the active tab (used by Overview's quick links). */
  onNavigate:   (tab: AdminTab) => void
  /** Open the owner-only merge console. */
  onOpenMerges: () => void
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--c-secondary), #B45309)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.34, fontWeight: 700,
    }}>
      {getInitials(name)}
    </div>
  )
}

function ErrorNote({ msg, isDark }: { msg: string; isDark: boolean }) {
  if (!msg) return null
  return (
    <div style={{
      margin: '0 0 14px', padding: '10px 12px', borderRadius: 10, fontSize: 13,
      background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', color: '#EF4444',
    }}>
      {msg}
    </div>
  )
}

function Loading({ isDark }: { isDark: boolean }) {
  const t = getTheme(isDark)
  return (
    <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
      <IconLoader2 size={22} style={{ color: t.textMuted, animation: 'spin 1s linear infinite' }} />
    </div>
  )
}

// ══ Data-health warning ══════════════════════════════════════════════════════
// Surfaces the 1:1 ownership issue that made migration 028 skip its unique index
// (some account owns more than one node). Non-blocking — explains the problem and
// who to look at so an admin can fix it later.

function HealthWarning({ slug, isDark, onOpenPerson }: {
  slug: string; isDark: boolean; onOpenPerson: (personId: string) => void
}) {
  const t = getTheme(isDark)
  const [health, setHealth] = useState<CommunityHealth | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState('')

  const load = useCallback(() => {
    api.community.health(slug)
      .then(setHealth)
      .catch(() => { /* endpoint unavailable / not admin — hide the banner */ })
  }, [slug])

  useEffect(() => { load() }, [load])

  // Un-claim: strip ownership so the account no longer maps to this node.
  const unclaim = async (personId: string) => {
    setBusyId(personId); setActionErr('')
    try { await api.community.revokeOwnership(slug, personId); load() }
    catch (e) { setActionErr((e as Error).message || 'Could not un-claim') }
    finally { setBusyId(null) }
  }

  if (!health) return null
  const dupeOwners = health.duplicate_owners
  const dupeLinks  = health.duplicate_person_links
  const hasIssue = dupeOwners.length > 0 || dupeLinks.length > 0 || !health.ownership_constraint_active
  if (!hasIssue) return null

  const amber = isDark ? '#FCD34D' : '#B45309'
  const bg    = isDark ? 'rgba(180,83,9,0.12)' : '#FFFBEB'
  const bd    = isDark ? 'rgba(180,83,9,0.4)' : '#FDE68A'

  const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--c-primary)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }
  const pillBtn: React.CSSProperties = { padding: '3px 9px', borderRadius: 7, border: `1px solid ${t.borderNeutral}`, background: 'transparent', color: t.textMuted, fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <IconAlertTriangle size={18} style={{ color: amber, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: amber }}>Needs attention · data health</span>
      </div>

      {dupeOwners.length > 0 ? (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: t.text, lineHeight: 1.55 }}>
            {dupeOwners.length === 1 ? 'An account owns' : `${dupeOwners.length} accounts own`} more than one person node.
            One account should map to exactly one node, so the automatic “one-account-one-node” safeguard couldn’t be switched on.
            Review each account below and un-claim the extra node(s); it can be fixed later.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {dupeOwners.map(o => (
              <div key={o.user_id} style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>{o.display_name || o.email}</span>{' '}
                <span style={{ color: t.textMuted }}>owns {o.node_count}:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                  {o.node_names.map((nm, i) => {
                    const pid  = o.node_ids[i]
                    const busy = busyId === pid
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => onOpenPerson(pid)} style={linkBtn}>{nm}</button>
                        <button onClick={() => unclaim(pid)} disabled={busy} style={{ ...pillBtn, opacity: busy ? 0.6 : 1 }}>
                          {busy ? '…' : 'Un-claim'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {actionErr && <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#EF4444' }}>{actionErr}</p>}
        </>
      ) : dupeLinks.length > 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: t.text, lineHeight: 1.55 }}>
          {dupeLinks.length} person node{dupeLinks.length === 1 ? ' is' : 's are'} linked to more than one account.
          The “one-account-one-node” safeguard is off until this is resolved.
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: t.text, lineHeight: 1.55 }}>
          The one-account-one-node database safeguard isn’t active yet. It will switch on automatically once the data is clean.
        </p>
      )}
    </div>
  )
}

// ══ Overview ═════════════════════════════════════════════════════════════════

export function OverviewSection({ slug, isOwner, isDark, onNavigate, onOpenMerges, onOpenPerson }: SectionProps) {
  const t = getTheme(isDark)
  const [members, setMembers]   = useState<CommunityMember[]>([])
  const [families, setFamilies] = useState<CommunityFamily[]>([])
  const [persons, setPersons]   = useState<number | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.community.members(slug), api.community.families(slug), api.community.stats(slug)])
      .then(([m, f, s]) => {
        if (!active) return
        setMembers(m.members); setFamilies(f.families); setPersons(s.total_persons)
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const adminCount = members.filter(m => m.role === 'owner' || m.role === 'admin').length

  if (loading) return <Loading isDark={isDark} />

  const stats = [
    { label: 'Members',  value: members.length,  icon: <IconUsers size={18} />,       tab: 'members'  as AdminTab },
    { label: 'Families', value: families.length,  icon: <IconHome size={18} />,        tab: 'families' as AdminTab },
    { label: 'People',   value: persons ?? '—',   icon: <IconUserCircle size={18} />,  tab: 'families' as AdminTab },
    { label: 'Admins',   value: adminCount,       icon: <IconShieldStar size={18} />,  tab: 'members'  as AdminTab },
  ]

  const cardBg = isDark ? '#1C1A12' : '#fff'
  const border = `1px solid ${t.borderNeutral}`

  return (
    <div>
      <ErrorNote msg={error} isDark={isDark} />

      <HealthWarning slug={slug} isDark={isDark} onOpenPerson={onOpenPerson} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => onNavigate(s.tab)}
            style={{
              textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              background: cardBg, border, borderRadius: 14, padding: '15px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <span style={{ color: 'var(--c-primary)' }}>{s.icon}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, letterSpacing: '0.02em' }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Recent signups */}
      <div style={{ background: cardBg, border, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '13px 16px', borderBottom: border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Recent signups</span>
          <button onClick={() => onNavigate('members')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-primary)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
            View all <IconChevronRight size={14} />
          </button>
        </div>
        {members.slice(0, 5).map(m => (
          <button
            key={m.id}
            onClick={() => m.person_id && onOpenPerson(m.person_id)}
            style={{
              width: '100%', textAlign: 'left', fontFamily: 'inherit',
              cursor: m.person_id ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px',
              borderBottom: border, background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            }}
          >
            <Avatar name={m.person_name || m.display_name || m.email} photoUrl={m.photo_url} size={34} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.person_name || m.display_name || 'Unnamed'}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: t.textMuted }}>{fmtDate(m.joined_at)}</span>
            </span>
          </button>
        ))}
        {members.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No members yet.</div>
        )}
      </div>

      {isOwner && (
        <button
          onClick={onOpenMerges}
          style={{
            width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--c-primary)', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          <IconArrowMerge size={17} /> Open community merge console
        </button>
      )}
    </div>
  )
}

// ══ Members ══════════════════════════════════════════════════════════════════

export function MembersSection({ slug, isOwner, isDark, onOpenPerson }: SectionProps) {
  const t = getTheme(isDark)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [q, setQ]             = useState('')
  const [busyId, setBusyId]   = useState<string | null>(null)

  // No synchronous setLoading here — the initial `loading` state is already
  // true, and refreshes (after a role change) surface progress via the per-row
  // busy spinner, not the full-panel loader. Keeps this off the effect's sync path.
  const load = useCallback(() => {
    api.community.members(slug)
      .then(({ members }) => setMembers(members))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load members'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return members
    return members.filter(m =>
      (m.person_name || m.display_name || '').toLowerCase().includes(needle) ||
      m.email.toLowerCase().includes(needle))
  }, [members, q])

  const changeRole = async (m: CommunityMember, role: 'admin' | 'member') => {
    setBusyId(m.id); setError('')
    try { await api.community.setMemberRole(slug, m.id, role); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update role') }
    finally { setBusyId(null) }
  }

  // Delete user: revoke all access — un-claims their node(s) (kept in the tree),
  // drops their membership so they can't log in, and anonymises the account.
  const deleteUser = async (m: CommunityMember) => {
    const who = m.person_name || m.display_name || m.email
    if (!window.confirm(`Delete ${who}?\n\nThis removes their login and wipes their account data, and un-claims their node (the node STAYS in the tree). This can’t be undone.`)) return
    setBusyId(m.id); setError('')
    try { await api.community.deleteUser(slug, m.id); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete user') }
    finally { setBusyId(null) }
  }

  const cardBg = isDark ? '#1C1A12' : '#fff'
  const border = `1px solid ${t.borderNeutral}`

  return (
    <div>
      <ErrorNote msg={error} isDark={isDark} />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 12px', marginBottom: 14, background: cardBg, border, borderRadius: 11 }}>
        <IconSearch size={16} style={{ color: t.textMuted, flexShrink: 0 }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search members by name or email"
          style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: t.text, fontFamily: 'inherit', fontSize: 13.5 }}
        />
        <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0 }}>{filtered.length}</span>
      </div>

      {loading ? <Loading isDark={isDark} /> : (
        <div style={{ background: cardBg, border, borderRadius: 14, overflow: 'hidden' }}>
          {filtered.map(m => {
            const name = m.person_name || m.display_name || 'Unnamed'
            const isAdmin = m.role === 'owner' || m.role === 'admin'
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: border }}>
                <button
                  onClick={() => m.person_id && onOpenPerson(m.person_id)}
                  title={m.person_id ? `Open ${name}'s tree` : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: m.person_id ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <Avatar name={name} photoUrl={m.photo_url} size={38} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
                  </span>
                </button>

                <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0, marginRight: 4 }}>{fmtDate(m.joined_at)}</span>

                {m.role === 'owner' ? (
                  <RoleBadge label="Owner" isDark={isDark} />
                ) : (
                  <>
                    {isAdmin ? <RoleBadge label="Admin" isDark={isDark} /> : null}
                    {busyId === m.id ? (
                      <IconLoader2 size={15} style={{ color: 'var(--c-primary)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {isOwner && (m.role === 'member'
                          ? <MiniBtn onClick={() => changeRole(m, 'admin')} isDark={isDark}>Make admin</MiniBtn>
                          : <MiniBtn onClick={() => changeRole(m, 'member')} isDark={isDark}>Remove admin</MiniBtn>)}
                        <MiniBtn onClick={() => deleteUser(m)} isDark={isDark} danger>Delete user</MiniBtn>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No members match.</div>
          )}
        </div>
      )}
    </div>
  )
}

function RoleBadge({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      color: 'var(--c-primary)', flexShrink: 0,
      background: isDark ? 'rgb(var(--c-primary-rgb) / 0.14)' : 'rgb(var(--c-primary-rgb) / 0.08)',
      borderRadius: 999, padding: '3px 9px',
    }}>
      {label}
    </span>
  )
}

function MiniBtn({ children, onClick, isDark, danger }: { children: React.ReactNode; onClick: () => void; isDark: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`,
        background: 'transparent', color: danger ? '#EF4444' : (isDark ? '#C9BBA6' : '#6b5c48'),
      }}
    >
      {children}
    </button>
  )
}

// ══ Families ═════════════════════════════════════════════════════════════════

export function FamiliesSection({ slug, isDark, onOpenPerson }: SectionProps) {
  const t = getTheme(isDark)
  const [families, setFamilies] = useState<CommunityFamily[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [q, setQ]               = useState('')

  useEffect(() => {
    let active = true
    api.community.families(slug)
      .then(({ families }) => { if (active) setFamilies(families) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Failed to load families') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return families
    return families.filter(f => f.name.toLowerCase().includes(needle))
  }, [families, q])

  const cardBg = isDark ? '#1C1A12' : '#fff'
  const border = `1px solid ${t.borderNeutral}`

  return (
    <div>
      <ErrorNote msg={error} isDark={isDark} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 12px', marginBottom: 14, background: cardBg, border, borderRadius: 11 }}>
        <IconSearch size={16} style={{ color: t.textMuted, flexShrink: 0 }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search families by name"
          style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: t.text, fontFamily: 'inherit', fontSize: 13.5 }}
        />
        <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0 }}>{filtered.length}</span>
      </div>

      {loading ? <Loading isDark={isDark} /> : (
        <div style={{ background: cardBg, border, borderRadius: 14, overflow: 'hidden' }}>
          {filtered.map(f => (
            <button
              key={f.id}
              onClick={() => f.view_person_id && onOpenPerson(f.view_person_id)}
              disabled={!f.view_person_id}
              title={f.view_person_id ? `Open the ${f.name} tree` : 'This family has no viewable people yet'}
              style={{
                width: '100%', textAlign: 'left', fontFamily: 'inherit',
                cursor: f.view_person_id ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
                borderBottom: border, background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'rgb(var(--c-primary-rgb) / 0.14)' : 'rgb(var(--c-primary-rgb) / 0.08)',
                color: 'var(--c-primary)',
              }}>
                <IconHome size={19} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: t.textMuted }}>
                  {f.person_count} {f.person_count === 1 ? 'person' : 'people'} · {f.member_count} joined · {fmtDate(f.created_at)}
                </span>
              </span>
              <IconChevronRight size={17} style={{ color: t.textMuted, flexShrink: 0 }} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No families match.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ══ Settings (community info + invite link) ══════════════════════════════════

export function SettingsSection({ slug, isDark }: SectionProps) {
  const t = getTheme(isDark)
  const [name, setName]         = useState('')
  const [description, setDesc]  = useState('')
  const [siteUrl, setSiteUrl]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [saved, setSaved]       = useState(false)

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [resetting, setResetting]   = useState(false)

  const buildInvite = useCallback((join_code: string, site_url: string | null) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return site_url ? `${site_url}/signup?invite=${join_code}` : `${origin}/community/${slug}?code=${join_code}`
  }, [slug])

  useEffect(() => {
    let active = true
    Promise.all([api.community.getInfo(slug), api.community.getJoinCode(slug).catch(() => null)])
      .then(([info, jc]) => {
        if (!active) return
        setName(info.name); setDesc(info.description ?? ''); setSiteUrl(info.site_url ?? '')
        if (jc) setInviteLink(buildInvite(jc.join_code, jc.site_url))
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Failed to load settings') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug, buildInvite])

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.community.update(slug, {
        name: name.trim(),
        description: description.trim(),
        site_url: siteUrl.trim() ? siteUrl.trim() : null,
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    if (!inviteLink) return
    try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  const resetCode = async () => {
    if (!window.confirm('Reset the join code? Existing invite links stop working.')) return
    setResetting(true); setError('')
    try {
      const { join_code } = await api.community.resetJoinCode(slug)
      setInviteLink(buildInvite(join_code, siteUrl.trim() || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset code')
    } finally {
      setResetting(false)
    }
  }

  const cardBg = isDark ? '#1C1A12' : '#fff'
  const border = `1px solid ${t.borderNeutral}`
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, letterSpacing: '0.02em' }
  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', color: t.text,
    fontFamily: 'inherit', fontSize: 13.5, outline: 'none',
  }

  if (loading) return <Loading isDark={isDark} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ErrorNote msg={error} isDark={isDark} />

      {/* Community details */}
      <div style={{ background: cardBg, border, borderRadius: 14, padding: 18 }}>
        <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: t.text }}>Community details</p>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={field} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Description</label>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...field, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={label}>Website (site_url)</label>
          <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://your-community-site.com" style={field} />
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: t.textMuted }}>
            Used to build branded invite &amp; claim links. Leave blank to use this app’s origin.
          </p>
        </div>
        <button
          onClick={save} disabled={saving}
          style={{
            height: 40, padding: '0 18px', borderRadius: 10, border: 'none',
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            background: saved ? '#16A34A' : 'var(--c-primary)', color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}
        >
          {saving ? <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            : saved ? <IconCheck size={15} /> : <IconDeviceFloppy size={15} />}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {/* Invite link */}
      {inviteLink && (
        <div style={{ background: cardBg, border, borderRadius: 14, padding: 18 }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: t.text }}>Invite link</p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            Share this to invite new members. They confirm the code, then create their account.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} style={{ ...field, flex: 1, minWidth: 200 }} />
            <button onClick={copy} style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, background: copied ? '#16A34A' : 'var(--c-primary)', color: '#fff' }}>
              {copied ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy</>}
            </button>
            <button onClick={resetCode} disabled={resetting} style={{ height: 40, padding: '0 14px', borderRadius: 10, cursor: resetting ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, border, background: 'transparent', color: t.textMuted }}>
              {resetting ? <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <IconRefresh size={14} />} Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
