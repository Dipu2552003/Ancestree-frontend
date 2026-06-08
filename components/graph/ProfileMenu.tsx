'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconUser, IconMail, IconLock, IconLogout,
  IconCheck, IconEye, IconEyeOff, IconArrowLeft,
} from '@tabler/icons-react'
import { api, clearToken } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'
import { Spinner } from '@/components/ui'

interface Props {
  isDark:   boolean
  isMobile: boolean
}

type Pane = 'menu' | 'email' | 'password'

export default function ProfileMenu({ isDark, isMobile }: Props) {
  const router = useRouter()
  const t = getTheme(isDark)

  const [open, setOpen]   = useState(false)
  const [pane, setPane]   = useState<Pane>('menu')
  const [me,   setMe]     = useState<{ display_name: string; email: string } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.auth.me()
      .then(u => setMe({ display_name: u.display_name, email: u.email }))
      .catch(() => {})
  }, [])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Reset to the menu pane whenever the panel reopens
  useEffect(() => { if (open) setPane('menu') }, [open])

  const handleSignOut = useCallback(() => {
    clearToken()
    setOpen(false)
    router.replace('/login')
  }, [router])

  const handleEmailUpdated = useCallback((newEmail: string) => {
    setMe(prev => prev ? { ...prev, email: newEmail } : prev)
    setPane('menu')
  }, [])

  // ── Theming ──────────────────────────────────────────────────────────────
  const initials = me ? getInitials(me.display_name || me.email) : '··'
  const panelW   = 304
  const panelBg  = isDark ? '#1C1A12' : '#FFFFFF'
  const panelBd  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(234,88,12,0.13)'
  const shadow   = isDark
    ? '0 14px 38px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)'
    : '0 14px 38px rgba(0,0,0,0.16), 0 0 0 1px rgba(234,88,12,0.06)'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        title="Account"
        style={{
          position:        'relative',
          width:           isMobile ? 44 : 38,
          height:          isMobile ? 44 : 38,
          borderRadius:    8,
          background:      open ? '#EA580C' : t.toggleBg,
          color:           open ? '#fff' : t.toggleColor,
          border:          `1.5px solid ${open ? '#EA580C' : t.toggleBorder}`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          cursor:          'pointer',
          boxShadow:       isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
          transition:      'background 0.15s, color 0.15s, border-color 0.15s',
          fontSize:        12,
          fontWeight:      700,
          letterSpacing:   '0.04em',
          fontFamily:      'inherit',
        }}
      >
        {me ? initials : <IconUser size={17} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:     'absolute',
              top:          isMobile ? 70 : 64,
              right:        16,
              width:        panelW,
              maxWidth:     'calc(100vw - 32px)',
              zIndex:       60,
              background:   panelBg,
              border:       `1.5px solid ${panelBd}`,
              borderRadius: 14,
              boxShadow:    shadow,
              overflow:     'hidden',
              transformOrigin: 'top right',
            }}
          >
            {/* ── Header (only shown on the menu pane) ── */}
            {pane === 'menu' && me && (
              <div style={{
                padding: '16px 16px 12px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  backgroundImage: 'linear-gradient(135deg, #EA580C, #C2410C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
                  flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {me.display_name}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {me.email}
                  </div>
                </div>
              </div>
            )}

            {pane === 'menu' && (
              <div style={{ padding: '8px 6px' }}>
                <MenuRow icon={<IconMail size={15} />} label="Change email" onClick={() => setPane('email')} isDark={isDark} />
                <MenuRow icon={<IconLock size={15} />} label="Change password" onClick={() => setPane('password')} isDark={isDark} />
                <div style={{
                  height: 1, margin: '6px 8px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }} />
                <MenuRow
                  icon={<IconLogout size={15} />}
                  label="Sign out"
                  onClick={handleSignOut}
                  isDark={isDark}
                  danger
                />
              </div>
            )}

            {pane === 'email' && me && (
              <ChangeEmailForm
                currentEmail={me.email}
                isDark={isDark}
                onBack={() => setPane('menu')}
                onSuccess={handleEmailUpdated}
              />
            )}

            {pane === 'password' && (
              <ChangePasswordForm
                isDark={isDark}
                onBack={() => setPane('menu')}
                onSuccess={() => setPane('menu')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Menu row ───────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, onClick, isDark, danger = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; isDark: boolean; danger?: boolean
}) {
  const t = getTheme(isDark)
  const [hover, setHover] = useState(false)
  const color = danger ? '#EF4444' : t.text
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: hover
          ? (isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)')
          : 'transparent',
        border: 'none', borderRadius: 8,
        color, fontSize: 13, fontWeight: 500,
        fontFamily: 'inherit', textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ display: 'flex', color: danger ? '#EF4444' : (hover ? '#EA580C' : t.textMuted), transition: 'color 0.12s' }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// ── Form scaffolding ───────────────────────────────────────────────────────

function FormHeader({ title, onBack, isDark }: { title: string; onBack: () => void; isDark: boolean }) {
  const t = getTheme(isDark)
  return (
    <div style={{
      padding: '12px 12px 12px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          width: 28, height: 28, borderRadius: 6, border: 'none',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          color: t.textMuted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconArrowLeft size={14} />
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: '0.01em' }}>{title}</span>
    </div>
  )
}

function fieldStyle(isDark: boolean, focused: boolean, hasError: boolean): React.CSSProperties {
  return {
    width: '100%', height: 38,
    padding: '0 12px',
    fontSize: 13, fontFamily: 'inherit',
    border: `1.5px solid ${hasError ? '#EF4444' : focused ? '#EA580C' : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
    borderRadius: 8,
    background: isDark ? '#141210' : '#FDFAF6',
    color: isDark ? '#EDE8E3' : '#1A0A00',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
}

function labelStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'block', marginBottom: 5,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: isDark ? '#7A6A52' : '#9A3412',
  }
}

function submitStyle(disabled: boolean, busy: boolean): React.CSSProperties {
  return {
    width: '100%', height: 38, borderRadius: 8, border: 'none',
    background: disabled ? 'rgba(234,88,12,0.45)' : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    color: '#fff', fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit',
    cursor: disabled || busy ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: disabled ? 'none' : '0 3px 12px rgba(234,88,12,0.32)',
    transition: 'background 0.2s',
  }
}

function PasswordField({
  value, onChange, placeholder, isDark, autoFocus, autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  isDark: boolean
  autoFocus?: boolean
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        style={{ ...fieldStyle(isDark, focused, false), paddingRight: 38 }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: isDark ? '#7A6A52' : '#9A6C3C',
          display: 'flex', padding: 4,
        }}
      >
        {show ? <IconEyeOff size={14} /> : <IconEye size={14} />}
      </button>
    </div>
  )
}

// ── Change email form ──────────────────────────────────────────────────────

function ChangeEmailForm({
  currentEmail, isDark, onBack, onSuccess,
}: {
  currentEmail: string
  isDark:       boolean
  onBack:       () => void
  onSuccess:    (newEmail: string) => void
}) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  const trimmed = newEmail.trim()
  const isValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) &&
    trimmed.toLowerCase() !== currentEmail.toLowerCase() &&
    password.length > 0

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setError('')
    try {
      const res = await api.auth.changeEmail({ new_email: trimmed, current_password: password })
      setDone(true)
      setTimeout(() => onSuccess(res.email), 900)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <FormHeader title="Change email" onBack={onBack} isDark={isDark} />
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={labelStyle(isDark)}>Current email</span>
          <div style={{
            ...fieldStyle(isDark, false, false),
            display: 'flex', alignItems: 'center',
            color: isDark ? '#7A6A52' : '#9A6C3C',
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          }}>
            {currentEmail}
          </div>
        </div>

        <div>
          <label style={labelStyle(isDark)}>New email</label>
          <input
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            style={fieldStyle(isDark, emailFocused, !!error)}
          />
        </div>

        <div>
          <label style={labelStyle(isDark)}>Current password</label>
          <PasswordField
            value={password}
            onChange={v => { setPassword(v); setError('') }}
            placeholder="Confirm with your password"
            isDark={isDark}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 11.5, color: '#EF4444' }}>{error}</p>
        )}

        <button type="button" onClick={submit} disabled={!isValid || busy || done} style={submitStyle(!isValid, busy)}>
          {done ? (<><IconCheck size={14} strokeWidth={2.5} /> Updated</>)
            : busy
              ? <Spinner size={14} />
              : 'Save new email'
          }
        </button>
      </div>
    </>
  )
}

// ── Change password form ───────────────────────────────────────────────────

function ChangePasswordForm({
  isDark, onBack, onSuccess,
}: {
  isDark:    boolean
  onBack:    () => void
  onSuccess: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8

  const isValid =
    current.length > 0 && next.length >= 8 && next === confirm && next !== current

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true); setError('')
    try {
      await api.auth.changePassword({ current_password: current, new_password: next })
      setDone(true)
      setTimeout(onSuccess, 900)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <FormHeader title="Change password" onBack={onBack} isDark={isDark} />
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle(isDark)}>Current password</label>
          <PasswordField
            value={current}
            onChange={v => { setCurrent(v); setError('') }}
            placeholder="Your current password"
            isDark={isDark}
            autoFocus
            autoComplete="current-password"
          />
        </div>

        <div>
          <label style={labelStyle(isDark)}>New password</label>
          <PasswordField
            value={next}
            onChange={v => { setNext(v); setError('') }}
            placeholder="At least 8 characters"
            isDark={isDark}
            autoComplete="new-password"
          />
          {tooShort && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444' }}>Must be at least 8 characters.</p>
          )}
        </div>

        <div>
          <label style={labelStyle(isDark)}>Confirm new password</label>
          <PasswordField
            value={confirm}
            onChange={v => { setConfirm(v); setError('') }}
            placeholder="Re-enter new password"
            isDark={isDark}
            autoComplete="new-password"
          />
          {mismatch && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#EF4444' }}>Passwords don't match.</p>
          )}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 11.5, color: '#EF4444' }}>{error}</p>
        )}

        <button type="button" onClick={submit} disabled={!isValid || busy || done} style={submitStyle(!isValid, busy)}>
          {done ? (<><IconCheck size={14} strokeWidth={2.5} /> Updated</>)
            : busy
              ? <Spinner size={14} />
              : 'Save new password'
          }
        </button>
      </div>
    </>
  )
}
