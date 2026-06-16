'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconArrowRight, IconBuilding, IconSun, IconMoon, IconBinaryTree2,
  IconPlus, IconX, IconArrowLeft, IconLoader2, IconEye, IconEyeOff,
  IconCopy, IconCheck,
} from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { api } from '@/lib/api'
import { setToken } from '@/lib/api/client'
import type { CommunityInfo } from '@/lib/api/community'

const EASE = [0.22, 1, 0.36, 1] as const

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [joinCode,   setJoinCode]   = useState('')
  const [copyDone,   setCopyDone]   = useState(false)
  const [createdSlug, setCreatedSlug] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [limit, setLimit] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [nameFocus, setNameFocus] = useState(false)
  const [slugFocus, setSlugFocus] = useState(false)
  const [descFocus, setDescFocus] = useState(false)
  const [keyFocus, setKeyFocus] = useState(false)
  const [ownerNameFocus, setOwnerNameFocus] = useState(false)
  const [ownerEmailFocus, setOwnerEmailFocus] = useState(false)
  const [ownerPassFocus, setOwnerPassFocus] = useState(false)

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
        localStorage.setItem('community_slug', result.community.slug)
      }
      onCreated({
        id: result.community.id, name: result.community.name, slug: result.community.slug,
        description: description.trim() || null, member_count: 1,
      })
      setCreatedSlug(result.community.slug)
      setJoinCode(result.community.join_code)
      setStep(3)
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
        width: '100%', maxWidth: 440,
      }}
    >
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
              {step === 3 ? 'All done!' : `Platform Admin · Step ${step} of 2`}
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              {([1, 2, 3] as const).map(s => (
                <div key={s} style={{
                  width: s <= step ? 16 : 6, height: 6, borderRadius: 3,
                  background: s <= step ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                  transition: 'width 0.25s, background 0.25s',
                }} />
              ))}
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>
            {step === 1 ? 'Create Community' : step === 2 ? 'Your Account' : 'Share Invite'}
          </h2>
        </div>
        {step < 3 && (
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
        )}
      </div>

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

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: isDark ? 'rgba(20,64,26,0.35)' : '#DCFCE7',
                border: `1px solid ${isDark ? 'rgba(34,197,94,0.30)' : '#86EFAC'}`,
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isDark ? '#86EFAC' : '#15803D' }}>
                  Community created! Share the invite link below with your family members.
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isDark ? '#7A6A52' : 'var(--c-primary-deep)',
                }}>
                  Invite link
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '0 12px', height: 42, borderRadius: 10,
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)'}`,
                    background: isDark ? '#141210' : '#FDFAF6',
                    display: 'flex', alignItems: 'center', overflow: 'hidden',
                  }}>
                    <span style={{
                      fontSize: 12.5, fontFamily: 'monospace', color: t.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {typeof window !== 'undefined' ? window.location.origin : ''}/community/{createdSlug}?code={joinCode}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/community/${createdSlug}?code=${joinCode}`
                      navigator.clipboard.writeText(link)
                      setCopyDone(true)
                      setTimeout(() => setCopyDone(false), 2000)
                    }}
                    style={{
                      width: 42, height: 42, borderRadius: 10, border: 'none', flexShrink: 0,
                      background: copyDone
                        ? (isDark ? 'rgba(20,64,26,0.5)' : '#DCFCE7')
                        : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                      color: copyDone ? (isDark ? '#86EFAC' : '#15803D') : '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                  >
                    {copyDone ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: t.textMuted }}>
                  Anyone with this link can create an account and join your community.
                </p>
              </div>

              <motion.button
                onClick={() => router.push('/graph')}
                whileHover={{ scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' }}
                whileTap={{ scale: 0.985 }}
                style={{
                  width: '100%', height: 48, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
                }}
              >
                Go to your family tree <IconArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────

function CommunityLandingInner() {
  const router = useRouter()
  const params = useSearchParams()
  const isDark = useGraphStore(s => s.isDark)
  const setIsDark = useGraphStore(s => s.setIsDark)
  const t = getTheme(isDark)

  const [showCreate, setShowCreate] = useState(params?.get('action') === 'create')
  const [slug, setSlug] = useState('')
  const [slugFocus, setSlugFocus] = useState(false)

  const handleGo = () => {
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (s) router.push(`/community/${s}`)
  }

  const handleCreated = useCallback((_community: CommunityInfo) => {
    // Step 3 (invite screen) shows inside the form — don't close yet.
    // The form exits naturally when the user clicks "Go to your family tree".
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#0B0A09' : 'var(--c-page)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'inherit',
      transition: 'background 0.35s ease',
    }}>

      {/* Top bar — matches the landing page header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isDark ? 'rgba(11,10,9,0.88)' : 'rgb(var(--c-page-rgb) / 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
        padding: '0 clamp(20px, 6vw, 56px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            boxShadow: '0 2px 8px rgb(var(--c-primary-rgb) / 0.32)',
          }}>
            <IconBinaryTree2 size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: t.text }}>
            Ancestree
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
              color: t.text, marginRight: 2, transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: t.text, textDecoration: 'none', padding: '9px 14px', borderRadius: 10 }}>
            Sign in
          </a>
          <a href="/signup" style={{
            fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            boxShadow: '0 3px 12px rgb(var(--c-primary-rgb) / 0.32)',
          }}>
            Sign up
          </a>
        </nav>
      </header>

      {/* Center content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <AnimatePresence mode="wait">
          {showCreate ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ width: '100%', maxWidth: 440 }}
            >
              <CreateCommunityForm
                onClose={() => setShowCreate(false)}
                onCreated={handleCreated}
                isDark={isDark}
              />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}
            >

              {/* Icon */}
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 24px',
                background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgb(var(--c-primary-rgb) / 0.35)',
              }}>
                <IconBuilding size={28} color="#fff" />
              </div>

              <h1 style={{
                margin: '0 0 10px', fontSize: 30, fontWeight: 800,
                letterSpacing: '-0.03em', color: t.text, lineHeight: 1.15,
              }}>
                Community Login
              </h1>

              <p style={{ margin: '0 0 32px', fontSize: 15, color: t.textMuted, lineHeight: 1.65 }}>
                Visit your community at{' '}
                <code style={{
                  fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
                  color: 'var(--c-primary)',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(var(--c-primary-rgb) / 0.08)',
                  padding: '2px 7px', borderRadius: 6,
                }}>
                  /community/your-community-name
                </code>
              </p>

              {/* Quick nav input */}
              <div style={{
                background: isDark ? '#1C1A12' : '#FFFFFF',
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.14)'}`,
                borderRadius: 16, padding: '20px 20px',
                boxShadow: isDark
                  ? '0 4px 20px rgba(0,0,0,0.4)'
                  : '0 4px 20px rgba(0,0,0,0.07), 0 0 0 1px rgb(var(--c-primary-rgb) / 0.04)',
                marginBottom: 24,
              }}>
                <label style={{
                  display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isDark ? '#7A6A52' : 'var(--c-primary-deep)',
                  textAlign: 'left',
                }}>
                  Go to community
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: t.textMuted, pointerEvents: 'none', userSelect: 'none',
                    }}>
                      /community/
                    </span>
                    <input
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') handleGo() }}
                      onFocus={() => setSlugFocus(true)}
                      onBlur={() => setSlugFocus(false)}
                      placeholder="community-name"
                      style={{
                        width: '100%', height: 46, paddingLeft: 100, paddingRight: 12,
                        fontSize: 14, fontFamily: 'inherit', borderRadius: 10,
                        border: `1.5px solid ${slugFocus ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)')}`,
                        background: slugFocus ? (isDark ? '#1C1A12' : '#FFFFFF') : (isDark ? '#141210' : '#FDFAF6'),
                        color: t.text, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s, background 0.15s',
                        boxShadow: slugFocus ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : 'none',
                      }}
                    />
                  </div>
                  <motion.button
                    onClick={handleGo}
                    disabled={!slug.trim()}
                    whileHover={slug.trim() ? { scale: 1.04, boxShadow: '0 6px 20px rgb(var(--c-primary-rgb) / 0.42)' } : {}}
                    whileTap={slug.trim() ? { scale: 0.96 } : {}}
                    style={{
                      height: 46, padding: '0 16px', borderRadius: 10, border: 'none',
                      background: !slug.trim()
                        ? 'rgb(var(--c-primary-rgb) / 0.45)'
                        : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
                      color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                      cursor: !slug.trim() ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      boxShadow: slug.trim() ? '0 3px 12px rgb(var(--c-primary-rgb) / 0.38)' : 'none',
                      transition: 'background 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    Go <IconArrowRight size={15} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              {/* Helper text */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                fontSize: 13.5, color: t.textMuted, lineHeight: 1.6,
              }}>
                <p style={{ margin: 0 }}>
                  Already have an invite link? The link will take you directly to your community.
                </p>
                <p style={{ margin: 0 }}>
                  Don&rsquo;t have a community?{' '}
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--c-primary)', fontWeight: 700, fontFamily: 'inherit',
                      fontSize: 'inherit', textDecoration: 'underline',
                      textDecorationColor: 'rgb(var(--c-primary-rgb) / 0.4)',
                    }}
                  >
                    Create one
                  </button>
                  {' '}or ask your admin to add you.
                </p>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityLandingInner />
    </Suspense>
  )
}
