'use client'

// Community Merge Console — OWNER-ONLY.
//
// The community owner has full authority over merges between any trees in
// their community:
//   • Pending — every proposed merge request in the community (any tree to
//     any tree), each acceptable/rejectable right here. The backend lets the
//     owner bypass the family-membership and claimed-node gates.
//   • Force merge — pick any two people (community-wide search), choose who
//     survives, and merge in one step — no second-party approval needed.
//   • History — resolved requests, for the record.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconArrowLeft, IconArrowMerge, IconLoader2, IconSearch, IconX,
  IconCheck, IconShieldStar, IconArrowsExchange,
} from '@tabler/icons-react'
import { api, type CommunityMerge, type SearchResult, type MergeConflict } from '@/lib/api'
import { getCommunitySlug } from '@/lib/storage'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Person search picker (community-wide) ─────────────────────────────────────

function PersonPicker({
  label, selected, exclude, onSelect, isDark,
}: {
  label:    string
  selected: SearchResult | null
  exclude:  string | null          // the other side's id — can't merge someone with themselves
  onSelect: (p: SearchResult | null) => void
  isDark:   boolean
}) {
  const t = getTheme(isDark)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(() => {
      setSearching(true)
      api.search.persons(q.trim(), 'all')
        .then(({ results }) => setResults(results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  if (selected) {
    return (
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted }}>{label}</p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          borderRadius: 12, border: '1.5px solid var(--c-primary)',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgb(var(--c-primary-rgb) / 0.05)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--c-primary)', color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            {getInitials(selected.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected.full_name}{selected.birth_year ? ` · b. ${selected.birth_year}` : ''}
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: t.textMuted }}>
              {selected.family_name}{selected.father_name ? ` · father: ${selected.father_name}` : ''}
            </p>
          </div>
          <button onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4 }}>
            <IconX size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted }}>{label}</p>
      <div style={{ position: 'relative' }}>
        <IconSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name…"
          style={{
            width: '100%', height: 42, padding: '0 12px 0 34px', fontSize: 13.5, fontFamily: 'inherit',
            borderRadius: 10, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
            background: isDark ? '#141210' : '#FDFAF6', color: t.text, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {searching && <IconLoader2 size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: t.textMuted, animation: 'spin 1s linear infinite' }} />}
      </div>
      {results.length > 0 && (
        <div style={{
          marginTop: 6, borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          maxHeight: 240, overflowY: 'auto',
        }}>
          {results.filter(r => r.id !== exclude).map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setQ(''); setResults([]) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '9px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: isDark ? '#1C1A12' : '#fff',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: t.text, fontSize: 11, fontWeight: 700,
              }}>
                {getInitials(r.full_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.text }}>
                  {r.full_name}{r.birth_year ? ` · b. ${r.birth_year}` : ''}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>
                  {r.family_name}{r.is_own_family ? ' (your tree)' : ''}{r.father_name ? ` · father: ${r.father_name}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityMergesPage() {
  const router = useRouter()
  const isDark = useGraphStore(s => s.isDark)
  const t = getTheme(isDark)
  const slug = typeof window !== 'undefined' ? getCommunitySlug() : null

  const [access,  setAccess]  = useState<'checking' | 'owner' | 'denied'>('checking')
  const [merges,  setMerges]  = useState<CommunityMerge[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId,  setBusyId]  = useState<string | null>(null)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')
  const [conflicts, setConflicts] = useState<MergeConflict[]>([])

  // Force-merge pickers: A = folded in (soft-deleted), B = survivor.
  const [personA, setPersonA] = useState<SearchResult | null>(null)
  const [personB, setPersonB] = useState<SearchResult | null>(null)
  const [forcing, setForcing] = useState(false)

  const refresh = useCallback(() => {
    if (!slug) return
    setLoading(true)
    api.community.listMerges(slug, 'all')
      .then(({ merges }) => setMerges(merges))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!slug) { setAccess('denied'); return }
    api.community.me(slug)
      .then(({ is_owner }) => setAccess(is_owner ? 'owner' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [slug])

  useEffect(() => { if (access === 'owner') refresh() }, [access, refresh])

  const handleAccept = async (m: CommunityMerge) => {
    if (!window.confirm(
      `Merge "${m.merged_person_name}" (${m.merged_family_name}) into ` +
      `"${m.canonical_person_name}" (${m.canonical_family_name})?\n\n` +
      'The two trees become one — this affects every member of both families.',
    )) return
    setBusyId(m.id); setError(''); setNotice(''); setConflicts([])
    try {
      const { conflicts } = await api.merges.accept(m.id)
      setNotice(`Merged "${m.merged_person_name}" into "${m.canonical_person_name}".`)
      setConflicts(conflicts ?? [])
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (m: CommunityMerge) => {
    if (!window.confirm(`Reject the merge request for "${m.merged_person_name}"?`)) return
    setBusyId(m.id); setError(''); setNotice('')
    try {
      await api.merges.reject(m.id)
      setNotice('Merge request rejected.')
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleForce = async () => {
    if (!slug || !personA || !personB) return
    if (!window.confirm(
      `Merge "${personA.full_name}" (${personA.family_name}) into ` +
      `"${personB.full_name}" (${personB.family_name})?\n\n` +
      `"${personB.full_name}" survives; "${personA.full_name}" is folded into them ` +
      'and their whole tree joins the surviving tree. This runs immediately.',
    )) return
    setForcing(true); setError(''); setNotice(''); setConflicts([])
    try {
      const result = await api.community.forceMerge(slug, {
        merged_person_id:    personA.id,
        canonical_person_id: personB.id,
      })
      setNotice(`Merged "${personA.full_name}" into "${personB.full_name}".`)
      setConflicts(result.conflicts ?? [])
      setPersonA(null); setPersonB(null)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setForcing(false)
    }
  }

  const pending  = merges.filter(m => m.status === 'proposed')
  const resolved = merges.filter(m => m.status !== 'proposed')

  const card: React.CSSProperties = {
    background: isDark ? '#1C1A12' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: 14, padding: '16px 18px',
  }
  const btn = (variant: 'solid' | 'ghost' | 'danger', disabled = false): React.CSSProperties => ({
    height: 34, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
    fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: variant === 'ghost' ? `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}` : 'none',
    background: variant === 'solid' ? 'var(--c-primary)' : variant === 'danger' ? (isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2') : 'transparent',
    color: variant === 'solid' ? '#fff' : variant === 'danger' ? '#EF4444' : t.textMuted,
  })

  if (access === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#0B0A09' : 'var(--c-page)' }}>
        <IconLoader2 size={22} style={{ color: t.textMuted, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (access === 'denied') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: isDark ? '#0B0A09' : 'var(--c-page)', padding: 24 }}>
        <IconShieldStar size={30} style={{ color: t.textMuted }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Community owner only</p>
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, textAlign: 'center', maxWidth: 360 }}>
          The merge console is available to the creator of the community.
        </p>
        <button onClick={() => router.push('/graph')} style={btn('solid')}>
          <IconArrowLeft size={14} /> Back to my tree
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: isDark ? '#0B0A09' : 'var(--c-page)', transition: 'background 0.35s ease' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Header */}
        <button onClick={() => router.push('/graph')} style={{ ...btn('ghost'), marginBottom: 18 }}>
          <IconArrowLeft size={14} /> Back to my tree
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <IconArrowMerge size={24} style={{ color: 'var(--c-primary)' }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>
            Community merge console
          </h1>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 13.5, color: t.textMuted, lineHeight: 1.6 }}>
          As the community owner you can see, accept, reject, and force merges between
          any trees in the community.
        </p>

        {/* Feedback */}
        {error && (
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#EF4444', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}
        {notice && (
          <div style={{ margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(20,64,26,0.4)' : '#DCFCE7', border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : '#86EFAC'}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDark ? '#86EFAC' : '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconCheck size={15} /> {notice}
            </p>
            {conflicts.length > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: isDark ? '#86EFAC' : '#166534' }}>
                {conflicts.length} data conflict{conflicts.length > 1 ? 's' : ''} detected — open the graph to review the affected profiles.
              </p>
            )}
          </div>
        )}

        {/* ── Pending requests ─────────────────────────────────────────── */}
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: t.text }}>
          Pending requests {loading ? '' : `(${pending.length})`}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {loading ? (
            <div style={{ ...card, display: 'flex', justifyContent: 'center' }}>
              <IconLoader2 size={18} style={{ color: t.textMuted, animation: 'spin 1s linear infinite' }} />
            </div>
          ) : pending.length === 0 ? (
            <div style={card}>
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>No pending merge requests in the community.</p>
            </div>
          ) : pending.map(m => (
            <div key={m.id} style={card}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.5 }}>
                {m.merged_person_name} <span style={{ color: t.textMuted, fontWeight: 500 }}>({m.merged_family_name})</span>
                {' '}→{' '}
                {m.canonical_person_name} <span style={{ color: t.textMuted, fontWeight: 500 }}>({m.canonical_family_name})</span>
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: t.textMuted }}>
                Requested by {m.initiated_by_name} · {fmtDate(m.created_at)}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleAccept(m)} disabled={busyId === m.id} style={btn('solid', busyId === m.id)}>
                  {busyId === m.id ? <IconLoader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <IconCheck size={13} />}
                  Accept &amp; merge
                </button>
                <button onClick={() => handleReject(m)} disabled={busyId === m.id} style={btn('danger', busyId === m.id)}>
                  <IconX size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Force merge ─────────────────────────────────────────────── */}
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: t.text }}>Force merge</h2>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: t.textMuted, lineHeight: 1.55 }}>
          Merge any two people across community trees in one step — use when the same
          person exists in two trees and nobody is active to accept a request.
        </p>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PersonPicker
            label="Person to fold in (their record is retired)"
            selected={personA} exclude={personB?.id ?? null}
            onSelect={setPersonA} isDark={isDark}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => { const a = personA; setPersonA(personB); setPersonB(a) }}
              disabled={!personA && !personB}
              title="Swap who survives"
              style={btn('ghost', !personA && !personB)}
            >
              <IconArrowsExchange size={14} /> Swap
            </button>
          </div>
          <PersonPicker
            label="Surviving person (keeps their profile)"
            selected={personB} exclude={personA?.id ?? null}
            onSelect={setPersonB} isDark={isDark}
          />
          <button
            onClick={handleForce}
            disabled={!personA || !personB || forcing}
            style={{ ...btn('solid', !personA || !personB || forcing), height: 42, justifyContent: 'center' }}
          >
            {forcing
              ? <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <IconArrowMerge size={15} />}
            Merge these two people
          </button>
        </div>

        {/* ── History ─────────────────────────────────────────────────── */}
        {resolved.length > 0 && (
          <>
            <h2 style={{ margin: '32px 0 10px', fontSize: 15, fontWeight: 800, color: t.text }}>History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resolved.map(m => (
                <div key={m.id} style={{ ...card, padding: '12px 16px', opacity: 0.8 }}>
                  <p style={{ margin: 0, fontSize: 12.5, color: t.text, lineHeight: 1.5 }}>
                    {m.merged_person_name} → {m.canonical_person_name}
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: m.status === 'confirmed' ? (isDark ? '#86EFAC' : '#15803D') : m.status === 'rejected' ? '#EF4444' : t.textMuted,
                    }}>
                      {m.status}
                    </span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
                    {m.merged_family_name} → {m.canonical_family_name} · by {m.initiated_by_name} · {fmtDate(m.merged_at ?? m.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
