'use client'

// FamilyAdminsPanel — community-only slide-in panel opened by clicking the
// family badge. Lists the family's admins (any community member can view).
// When the viewer is themselves an admin of the family (`can_manage`), an
// "Add admin" button reveals a picker of the family's claimed (owned) nodes;
// selecting one promotes that node's account to admin. Proxy/invited nodes
// can't be picked — only people who actually own their profile.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconX, IconShieldStar, IconPlus, IconLoader2, IconArrowLeft, IconLink, IconCopy, IconCheck } from '@tabler/icons-react'
import type { Node } from '@xyflow/react'
import { api, type FamilyAdmin } from '@/lib/api'
import { getFamilyId, getCommunitySlug } from '@/lib/storage'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'
import { isGhostNodeId } from '@/lib/graph/ghostNodes'
import type { PersonData } from '@/types'
import { SidePanel } from '@/components/ui'

interface FamilyAdminsPanelProps {
  isDark:     boolean
  familyName: string
  /** Raw backend nodes — used to offer claimed nodes in the picker. */
  rawNodes:   Node[]
  onClose:    () => void
}

export default function FamilyAdminsPanel({ isDark, familyName, rawNodes, onClose }: FamilyAdminsPanelProps) {
  const t = getTheme(isDark)
  const familyId = getFamilyId()

  const [admins,    setAdmins]    = useState<FamilyAdmin[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [picking,   setPicking]   = useState(false)
  const [addingId,  setAddingId]  = useState<string | null>(null)
  const [error,     setError]     = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  // Fetch the community's shareable invite link. The backend gates the join
  // code behind community-admin permission, so a 403/failure simply leaves the
  // control hidden for non-admins.
  useEffect(() => {
    const slug = getCommunitySlug()
    if (!slug) return
    let active = true
    api.community.getJoinCode(slug)
      .then(({ join_code }) => {
        if (!active) return
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        setInviteLink(`${origin}/community/${slug}?code=${join_code}`)
      })
      .catch(() => { /* not a community admin — hide the invite control */ })
    return () => { active = false }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked — the field is selectable as a fallback */ }
  }, [inviteLink])

  const load = useCallback(async () => {
    if (!familyId) {
      setError('Could not determine your family — please log in again.')
      setLoading(false)
      return
    }
    try {
      const res = await api.family.admins(familyId)
      setAdmins(res.admins)
      setCanManage(res.can_manage)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { load() }, [load])

  // Claimed (owned) nodes that aren't already admins — eligible for promotion.
  const candidates = useMemo(() => {
    const adminPersonIds = new Set(admins.map(a => a.person_id).filter(Boolean))
    return rawNodes
      .filter(n => !n.id.startsWith('couple_') && !n.id.startsWith('__load_more') && !isGhostNodeId(n.id))
      .map(n => ({ id: n.id, data: n.data as unknown as PersonData }))
      .filter(({ id, data }) => data.nodeState === 'claimed' && !adminPersonIds.has(id))
  }, [rawNodes, admins])

  async function handleAdd(personId: string) {
    if (!familyId) return
    setAddingId(personId)
    setError('')
    try {
      await api.family.addAdmin(familyId, personId)
      setPicking(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add admin')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <SidePanel isDark={isDark} width={360} zIndex={250} withOpacity>
      {/* ── Header ── */}
      <div style={{
        padding: '18px 18px 14px',
        borderBottom: `1px solid ${t.borderNeutral}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <IconShieldStar size={17} color="var(--c-primary)" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>
              {picking ? 'Choose new admin' : 'Family admins'}
            </div>
            <div style={{
              fontSize: '11px', color: t.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {familyName}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: '2px' }}
        >
          <IconX size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{
            margin: '12px 14px 0', padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.10)', color: '#EF4444', fontSize: '12px',
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
            Loading…
          </div>
        )}

        {/* ── Invite link (community admins only) ── */}
        {inviteLink && !picking && (
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.borderNeutral}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
              <IconLink size={14} color="var(--c-primary)" />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.textMuted }}>
                Invite link
              </span>
            </div>
            <p style={{ margin: '0 0 9px', fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
              Share this link to invite new members. They confirm the code, then create their account.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                readOnly
                value={inviteLink}
                onFocus={e => e.currentTarget.select()}
                style={{
                  flex: 1, minWidth: 0, height: '36px', padding: '0 11px',
                  fontSize: '12px', fontFamily: 'inherit', color: t.text,
                  background: t.inputBg, border: `1px solid ${t.controlBorder}`,
                  borderRadius: '8px', outline: 'none',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  flexShrink: 0, height: '36px', padding: '0 12px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '12.5px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: copied ? '#16A34A' : 'var(--c-primary)', color: '#fff',
                  transition: 'background 0.15s',
                }}
              >
                {copied
                  ? <><IconCheck size={14} /> Copied</>
                  : <><IconCopy size={14} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Admin list ── */}
        {!loading && !picking && (
          <>
            {admins.map(a => (
              <PersonRow
                key={a.user_id}
                name={a.full_name ?? a.display_name}
                photoUrl={a.photo_url}
                isDark={isDark}
                trailing={
                  <span style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--c-primary)',
                    background: isDark ? 'rgb(var(--c-primary-rgb) / 0.14)' : 'rgb(var(--c-primary-rgb) / 0.08)',
                    borderRadius: '999px', padding: '3px 10px', flexShrink: 0,
                  }}>
                    Admin
                  </span>
                }
              />
            ))}

            {admins.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: t.textMuted }}>
                No admins found for this family.
              </div>
            )}

            {canManage && (
              <div style={{ padding: '14px 16px' }}>
                <button
                  onClick={() => { setPicking(true); setError('') }}
                  style={{
                    width: '100%', height: '38px', borderRadius: '10px',
                    border: `1.5px dashed ${isDark ? 'rgb(var(--c-primary-rgb) / 0.4)' : 'rgb(var(--c-primary-rgb) / 0.45)'}`,
                    background: 'transparent', color: 'var(--c-primary)',
                    fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <IconPlus size={15} /> Add admin
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Claimed-node picker ── */}
        {!loading && picking && (
          <>
            <div style={{ padding: '12px 16px 4px' }}>
              <button
                onClick={() => setPicking(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: t.textMuted, fontSize: '12px', fontFamily: 'inherit', padding: 0,
                }}
              >
                <IconArrowLeft size={13} /> Back to admins
              </button>
              <p style={{ margin: '10px 0 4px', fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
                Only people who have joined and own their profile can become admins.
              </p>
            </div>

            {candidates.map(({ id, data }) => (
              <PersonRow
                key={id}
                name={data.fullName}
                photoUrl={data.photoUrl ?? null}
                isDark={isDark}
                onClick={addingId === null ? () => handleAdd(id) : undefined}
                trailing={addingId === id
                  ? <IconLoader2 size={15} color="var(--c-primary)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  : <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-primary)', flexShrink: 0 }}>Make admin</span>}
              />
            ))}

            {candidates.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: t.textMuted, lineHeight: 1.6 }}>
                No eligible people found.
                <br />
                Everyone who owns their profile is already an admin, or no one else has claimed a node yet.
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </SidePanel>
  )
}

function PersonRow({ name, photoUrl, isDark, trailing, onClick }: {
  name:     string
  photoUrl: string | null
  isDark:   boolean
  trailing: React.ReactNode
  onClick?: () => void
}) {
  const t = getTheme(isDark)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '11px 16px',
        borderBottom: `1px solid ${t.borderNeutral}`,
        display: 'flex', alignItems: 'center', gap: '11px',
        cursor: onClick ? 'pointer' : 'default',
        background: onClick && hovered ? t.itemHoverBg : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} style={{
          width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--c-secondary), #B45309)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '12px', fontWeight: 600,
        }}>
          {getInitials(name)}
        </div>
      )}
      <span style={{
        flex: 1, minWidth: 0, fontSize: '13.5px', fontWeight: 600, color: t.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      {trailing}
    </div>
  )
}
