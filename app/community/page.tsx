'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconArrowLeft, IconPlus, IconUsers, IconCopy, IconCheck,
  IconLoader2, IconArrowRight, IconX, IconCode, IconLink,
  IconEyeOff, IconEye, IconSun, IconMoon, IconBuilding,
  IconChevronDown, IconChevronUp, IconSearch,
} from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import { api } from '@/lib/api'
import { setToken } from '@/lib/api/client'
import type { CommunityInfo } from '@/lib/api/community'

const EASE = [0.22, 1, 0.36, 1] as const

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const t = getTheme(isDark)
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
        borderRadius: 6, color: copied ? '#16A34A' : t.textMuted,
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
        transition: 'color 0.15s',
      }}
    >
      {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Community card ────────────────────────────────────────────────────────────

function CommunityCard({
  community, selected, onClick, isDark,
}: {
  community: CommunityInfo
  selected: boolean
  onClick: () => void
  isDark: boolean
}) {
  const t = getTheme(isDark)
  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        background: selected
          ? (isDark ? '#2A1A0A' : '#FFF1E6')
          : (isDark ? '#1C1A12' : '#FFFFFF'),
        border: `1.5px solid ${selected ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.14)')}`,
        borderRadius: 16,
        padding: '18px 20px',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 3px rgb(var(--c-primary-rgb) / 0.12)'
          : (isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)'),
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, lineHeight: 1.2, marginBottom: 3 }}>
            {community.name}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            color: 'var(--c-primary)', fontFamily: 'monospace',
          }}>
            /{community.slug}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 20,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <IconUsers size={12} style={{ color: t.textMuted }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{community.member_count}</span>
        </div>
      </div>

      {community.description && (
        <p style={{
          margin: '0 0 12px', fontSize: 13, color: t.textMuted, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {community.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: t.textMuted }}>
          {(community.member_limit ?? 0) > 0 ? `Limit: ${community.member_limit}` : 'Open community'}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: selected ? 'var(--c-primary)' : t.textMuted,
          display: 'flex', alignItems: 'center', gap: 3,
          transition: 'color 0.15s',
        }}>
          View details <IconArrowRight size={12} />
        </span>
      </div>
    </motion.div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  community, onClose, isDark, isMobile,
}: {
  community: CommunityInfo
  onClose: () => void
  isDark: boolean
  isMobile: boolean
}) {
  const router = useRouter()
  const t = getTheme(isDark)
  const [apiOpen, setApiOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [apiBase, setApiBase] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    setApiBase(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
  }, [])

  const webUrl  = `${origin}/community/${community.slug}`
  const signupUrl = `${apiBase}/api/community/${community.slug}/signup`
  const loginUrl  = `${apiBase}/api/community/${community.slug}/login`

  const codeStyle: React.CSSProperties = {
    fontFamily: 'monospace', fontSize: 12,
    background: isDark ? '#0D0C08' : '#FDF8F2',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.12)'}`,
    borderRadius: 8, padding: '10px 12px',
    color: isDark ? '#C4B99A' : '#7A4A1C',
    wordBreak: 'break-all' as const,
    lineHeight: 1.6,
    overflowX: 'auto' as const,
  }

  const signupBody = `{
  "email": "user@example.com",
  "password": "yourpassword",
  "display_name": "Full Name",
  "invite_code": "optional"
}`

  const loginBody = `{
  "email": "user@example.com",
  "password": "yourpassword"
}`

  return (
    <motion.div
      initial={{ opacity: 0, x: isMobile ? 0 : 32, y: isMobile ? 20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : 32, y: isMobile ? 20 : 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{
        background: isDark ? '#1C1A12' : '#FFFFFF',
        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.14)'}`,
        borderRadius: 20,
        boxShadow: isDark
          ? '0 8px 40px rgba(0,0,0,0.55)'
          : '0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgb(var(--c-primary-rgb) / 0.06)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: isMobile ? '85vh' : 'calc(100vh - 120px)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
            Community
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: t.text, lineHeight: 1.15 }}>
            {community.name}
          </h2>
          <code style={{ fontSize: 11, color: t.textMuted }}>/{community.slug}</code>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconX size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{
            flex: 1, padding: '12px 14px', borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgb(var(--c-primary-rgb) / 0.05)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-primary)', lineHeight: 1 }}>{community.member_count}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Members</div>
          </div>
          <div style={{
            flex: 1, padding: '12px 14px', borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgb(var(--c-primary-rgb) / 0.05)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-secondary)', lineHeight: 1 }}>
              {(community.member_limit ?? 0) === 0 ? '∞' : community.member_limit}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Limit</div>
          </div>
        </div>

        {community.description && (
          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: t.textMuted, lineHeight: 1.65 }}>
            {community.description}
          </p>
        )}

        {/* Web join URL */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <IconLink size={13} style={{ color: 'var(--c-primary)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: t.textMuted }}>
              Join URL
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, ...codeStyle, padding: '8px 12px' }}>{webUrl}</div>
            <CopyButton text={webUrl} isDark={isDark} />
          </div>
        </div>

        {/* API Reference — collapsible */}
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => setApiOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              transition: 'background 0.12s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconCode size={14} style={{ color: 'var(--c-primary)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>API Reference</span>
            </div>
            {apiOpen ? <IconChevronUp size={14} style={{ color: t.textMuted }} /> : <IconChevronDown size={14} style={{ color: t.textMuted }} />}
          </button>

          <AnimatePresence>
            {apiOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Common headers */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Required Headers
                    </div>
                    <pre style={{ ...codeStyle, margin: 0 }}>
{`Content-Type: application/json
Authorization: Bearer <token>  ← after login/signup`}
                    </pre>
                  </div>

                  {/* Signup */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Signup Endpoint
                      </div>
                      <CopyButton text={`POST ${signupUrl}`} isDark={isDark} />
                    </div>
                    <pre style={{ ...codeStyle, margin: 0 }}>POST {signupUrl}</pre>
                    <pre style={{ ...codeStyle, margin: '6px 0 0' }}>{signupBody}</pre>
                    <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.06)', border: `1px solid rgba(22,163,74,0.2)` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Response</div>
                      <code style={{ fontSize: 11, color: '#16A34A' }}>{`{ "token": "eyJ...", "user": { "id": "...", ... } }`}</code>
                    </div>
                  </div>

                  {/* Login */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Login Endpoint
                      </div>
                      <CopyButton text={`POST ${loginUrl}`} isDark={isDark} />
                    </div>
                    <pre style={{ ...codeStyle, margin: 0 }}>POST {loginUrl}</pre>
                    <pre style={{ ...codeStyle, margin: '6px 0 0' }}>{loginBody}</pre>
                  </div>

                  {/* Token usage */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Using the Token
                    </div>
                    <pre style={{ ...codeStyle, margin: 0 }}>{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5...`}</pre>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: t.textMuted, lineHeight: 1.5 }}>
                      Token encodes: userId, familyId, communityId. Send with every authenticated request.
                    </p>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => router.push(`/community/${community.slug}?tab=login`)}
            style={{
              flex: 1, height: 46, borderRadius: 12, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              background: 'transparent', color: t.text,
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.40)' }}
            whileTap={{ scale: 0.985 }}
            onClick={() => router.push(`/community/${community.slug}?tab=signup`)}
            style={{
              flex: 1, height: 46, borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
              color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 3px 14px rgb(var(--c-primary-rgb) / 0.38)',
            }}
          >
            Create Account <IconArrowRight size={15} />
          </motion.button>
        </div>

      </div>
    </motion.div>
  )
}

// ── Create community form (2-step wizard) ─────────────────────────────────────

function CreateCommunityForm({
  onClose, onCreated, isDark,
}: {
  onClose: () => void
  onCreated: (community: CommunityInfo) => void
  isDark: boolean
}) {
  const router = useRouter()
  const t = getTheme(isDark)

  const [step,        setStep]        = useState<1 | 2>(1)

  // Step 1 fields
  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [description, setDescription] = useState('')
  const [limit,       setLimit]       = useState('')
  const [adminKey,    setAdminKey]    = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const [slugManual,  setSlugManual]  = useState(false)

  // Step 2 fields
  const [ownerName,     setOwnerName]     = useState('')
  const [ownerEmail,    setOwnerEmail]    = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showPassword,  setShowPassword]  = useState(false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Focus states
  const [nameFocus,       setNameFocus]       = useState(false)
  const [slugFocus,       setSlugFocus]       = useState(false)
  const [descFocus,       setDescFocus]       = useState(false)
  const [keyFocus,        setKeyFocus]        = useState(false)
  const [ownerNameFocus,  setOwnerNameFocus]  = useState(false)
  const [ownerEmailFocus, setOwnerEmailFocus] = useState(false)
  const [ownerPassFocus,  setOwnerPassFocus]  = useState(false)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugManual(true)
  }

  const step1Valid = name.trim().length >= 2 && slug.length >= 2 && adminKey.trim().length > 0
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)
  const step2Valid = ownerName.trim().length >= 1 && emailValid && ownerPassword.length >= 8

  const handleContinue = () => {
    if (!step1Valid) return
    setError('')
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!step2Valid || loading) return
    setLoading(true); setError('')
    try {
      const result = await api.community.create(
        {
          name: name.trim(), slug,
          description: description.trim() || undefined,
          member_limit: limit ? parseInt(limit, 10) : 0,
          owner: { display_name: ownerName.trim(), email: ownerEmail.trim(), password: ownerPassword },
        },
        adminKey.trim(),
      )
      setToken(result.token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify({
          person_id: result.user.person_id,
          family_id: result.user.family_id,
        }))
      }
      onCreated({
        id: result.community.id, name: result.community.name, slug: result.community.slug,
        description: description.trim() || null, member_count: 1,
      })
      router.push(`/community/${result.community.slug}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const inputStyle = (focused: boolean, hasErr = false): React.CSSProperties => ({
    width: '100%', padding: '0 14px', height: 46,
    fontSize: 14, fontFamily: 'inherit',
    border: `1.5px solid ${hasErr ? '#EF4444' : focused ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)')}`,
    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    background: focused ? (isDark ? '#1C1A12' : '#FFFFFF') : (isDark ? '#141210' : '#FDFAF6'),
    color: t.text,
    transition: 'border-color 0.15s, background 0.15s',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: isDark ? '#7A6A52' : 'var(--c-primary-deep)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 12 }}
      transition={{ duration: 0.28, ease: EASE }}
      style={{
        background: isDark ? '#1C1A12' : '#FFFFFF',
        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.14)'}`,
        borderRadius: 20,
        boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.55)' : '0 8px 40px rgba(0,0,0,0.10)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
              Platform Admin · Step {step} of 2
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              {([1, 2] as const).map(s => (
                <div key={s} style={{
                  width: s <= step ? 16 : 6, height: 6, borderRadius: 3,
                  background: s <= step ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                  transition: 'width 0.25s, background 0.25s',
                }} />
              ))}
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>
            {step === 1 ? 'Create Community' : 'Your Account'}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconX size={15} />
        </button>
      </div>

      {/* Animated step content */}
      <div style={{ padding: '18px 20px 20px', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={labelStyle}>Community Name *</label>
                <input
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setNameFocus(false)}
                  placeholder="e.g. Khandelwal Samaj"
                  autoFocus
                  style={inputStyle(nameFocus)}
                />
              </div>

              <div>
                <label style={labelStyle}>URL Slug *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: t.textMuted, pointerEvents: 'none' }}>
                    /community/
                  </span>
                  <input
                    value={slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    onFocus={() => setSlugFocus(true)}
                    onBlur={() => setSlugFocus(false)}
                    placeholder="khandelwal-samaj"
                    style={{ ...inputStyle(slugFocus), paddingLeft: 96 }}
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: t.textMuted }}>Lowercase letters, numbers, dashes only.</p>
              </div>

              <div>
                <label style={labelStyle}>Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onFocus={() => setDescFocus(true)}
                  onBlur={() => setDescFocus(false)}
                  placeholder="Describe this community…"
                  rows={2}
                  style={{ ...inputStyle(descFocus), height: 'auto', padding: '10px 14px', resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              <div>
                <label style={labelStyle}>Member Limit (0 = unlimited)</label>
                <input
                  type="number" min="0"
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  placeholder="0"
                  style={inputStyle(false)}
                />
              </div>

              <div>
                <label style={{ ...labelStyle, color: 'var(--c-primary-strong)' }}>Platform Admin Key *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={adminKey}
                    onChange={e => { setAdminKey(e.target.value); setError('') }}
                    onFocus={() => setKeyFocus(true)}
                    onBlur={() => setKeyFocus(false)}
                    placeholder="x-platform-key value"
                    style={{ ...inputStyle(keyFocus, !!error), paddingRight: 46 }}
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4 }}>
                    {showKey ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                  </button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: t.textMuted }}>Set as PLATFORM_ADMIN_KEY in backend .env</p>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: '#EF4444', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  {error}
                </p>
              )}

              <motion.button
                onClick={handleContinue}
                disabled={!step1Valid}
                whileHover={step1Valid ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                whileTap={step1Valid ? { scale: 0.985 } : {}}
                style={{
                  width: '100%', height: 48, borderRadius: 12, border: 'none',
                  background: !step1Valid ? 'rgb(var(--c-primary-rgb) / 0.48)' : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  fontFamily: 'inherit', cursor: !step1Valid ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: !step1Valid ? 'none' : '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
                  transition: 'background 0.2s',
                }}
              >
                Continue <IconArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <p style={{
                margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5,
                padding: '8px 12px', borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgb(var(--c-primary-rgb) / 0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
              }}>
                You will be the owner of <strong style={{ color: t.text }}>{name}</strong>. Create your account to activate the community.
              </p>

              <div>
                <label style={labelStyle}>Your Name *</label>
                <input
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  onFocus={() => setOwnerNameFocus(true)}
                  onBlur={() => setOwnerNameFocus(false)}
                  placeholder="e.g. Ramesh Khandelwal"
                  autoFocus
                  style={inputStyle(ownerNameFocus)}
                />
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  onFocus={() => setOwnerEmailFocus(true)}
                  onBlur={() => setOwnerEmailFocus(false)}
                  placeholder="you@example.com"
                  style={inputStyle(ownerEmailFocus, ownerEmail.length > 0 && !emailValid)}
                />
              </div>

              <div>
                <label style={labelStyle}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={ownerPassword}
                    onChange={e => setOwnerPassword(e.target.value)}
                    onFocus={() => setOwnerPassFocus(true)}
                    onBlur={() => setOwnerPassFocus(false)}
                    placeholder="Min. 8 characters"
                    style={{ ...inputStyle(ownerPassFocus), paddingRight: 46 }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 4 }}>
                    {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: '#EF4444', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setStep(1); setError('') }}
                  style={{
                    height: 48, borderRadius: 12,
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                    background: 'transparent', color: t.textMuted, fontSize: 14, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer', padding: '0 18px',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <IconArrowLeft size={15} /> Back
                </button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={!step2Valid || loading}
                  whileHover={step2Valid && !loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                  whileTap={step2Valid && !loading ? { scale: 0.985 } : {}}
                  style={{
                    flex: 1, height: 48, borderRadius: 12, border: 'none',
                    background: (!step2Valid || loading) ? 'rgb(var(--c-primary-rgb) / 0.48)' : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    fontFamily: 'inherit', cursor: (!step2Valid || loading) ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: (!step2Valid || loading) ? 'none' : '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                      <IconLoader2 size={18} />
                    </motion.div>
                  ) : (
                    <><IconPlus size={16} /> Create Community</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CommunityBrowserInner() {
  const router = useRouter()
  const params = useSearchParams()
  const isDark = useGraphStore(s => s.isDark)
  const setIsDark = useGraphStore(s => s.setIsDark)
  const isMobile = useIsMobile()
  const t = getTheme(isDark)

  const [communities,  setCommunities]  = useState<CommunityInfo[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState<CommunityInfo | null>(null)
  const [showCreate,   setShowCreate]   = useState(params?.get('action') === 'create')
  const [search,       setSearch]       = useState('')
  const [searchFocus,  setSearchFocus]  = useState(false)

  useEffect(() => {
    api.community.list()
      .then(res => setCommunities(res.communities))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = useCallback((community: CommunityInfo) => {
    setCommunities(prev => [community, ...prev])
    setShowCreate(false)
    setSelected(community)
  }, [])

  const filtered = communities.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()),
  )

  const pageBg = isDark ? '#0B0A09' : 'var(--c-page)'

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily: 'inherit', transition: 'background 0.35s ease' }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isDark ? 'rgba(11,10,9,0.88)' : 'rgb(var(--c-page-rgb) / 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: t.textMuted, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', padding: 0,
            }}
          >
            <IconArrowLeft size={16} /> Back
          </button>
          <div style={{ width: 1, height: 20, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Communities</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setShowCreate(true); setSelected(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 2px 10px rgb(var(--c-primary-rgb) / 0.38)',
            }}
          >
            <IconPlus size={14} /> Create
          </motion.button>
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              width: 38, height: 38, borderRadius: 8, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
              background: t.controlBg, color: t.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: isMobile ? '24px 16px' : '32px 24px',
        display: 'grid',
        gridTemplateColumns: (selected || showCreate) && !isMobile ? '1fr 420px' : '1fr',
        gap: 24, alignItems: 'start',
      }}>

        {/* Left: list */}
        <div>
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconBuilding size={20} color="#fff" />
              </div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 32, fontWeight: 800, letterSpacing: '-0.03em', color: t.text }}>
                Communities
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: t.textMuted, lineHeight: 1.6 }}>
              Walled-garden spaces that connect multiple families under one roof.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: EASE }}
            style={{ position: 'relative', marginBottom: 20 }}
          >
            <IconSearch size={16} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: t.textMuted, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search communities…"
              style={{
                width: '100%', height: 46, paddingLeft: 42, paddingRight: 16,
                fontSize: 14, fontFamily: 'inherit', borderRadius: 12,
                border: `1.5px solid ${searchFocus ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)')}`,
                background: isDark ? '#141210' : '#FFFFFF',
                color: t.text, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
          </motion.div>

          {/* Community cards */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                <IconLoader2 size={24} style={{ color: 'var(--c-primary)' }} />
              </motion.div>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center', padding: '48px 24px',
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgb(var(--c-primary-rgb) / 0.03)',
                borderRadius: 20, border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgb(var(--c-primary-rgb) / 0.15)'}`,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌸</div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: t.text }}>
                {search ? 'No communities found' : 'No communities yet'}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: t.textMuted }}>
                {search ? 'Try a different search term.' : 'Create the first one to get started.'}
              </p>
              {!search && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowCreate(true); setSelected(null) }}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                    color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 3px 14px rgb(var(--c-primary-rgb) / 0.38)',
                  }}
                >
                  <IconPlus size={15} /> Create Community
                </motion.button>
              )}
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((community, i) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: EASE }}
                >
                  <CommunityCard
                    community={community}
                    selected={selected?.id === community.id}
                    onClick={() => { setSelected(community); setShowCreate(false) }}
                    isDark={isDark}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail or create form */}
        <AnimatePresence mode="wait">
          {showCreate && (
            <div
              key="create"
              onClick={isMobile ? () => setShowCreate(false) : undefined}
              style={isMobile ? { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' } : {}}
            >
              <div
                onClick={isMobile ? e => e.stopPropagation() : undefined}
                style={isMobile ? { width: '100%', maxHeight: '90vh', overflow: 'auto' } : {}}
              >
                <CreateCommunityForm
                  onClose={() => setShowCreate(false)}
                  onCreated={handleCreated}
                  isDark={isDark}
                />
              </div>
            </div>
          )}
          {selected && !showCreate && (
            <div
              key={selected.id}
              onClick={isMobile ? () => setSelected(null) : undefined}
              style={isMobile ? { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' } : {}}
            >
              <div
                onClick={isMobile ? e => e.stopPropagation() : undefined}
                style={isMobile ? { width: '100%', maxHeight: '90vh', overflow: 'auto' } : {}}
              >
                <DetailPanel
                  community={selected}
                  onClose={() => setSelected(null)}
                  isDark={isDark}
                  isMobile={isMobile}
                />
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}

export default function CommunityBrowserPage() {
  return (
    <Suspense fallback={null}>
      <CommunityBrowserInner />
    </Suspense>
  )
}
