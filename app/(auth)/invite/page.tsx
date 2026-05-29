'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconEye, IconEyeOff, IconLoader2, IconCheck } from '@tabler/icons-react'
import { api, getToken, setToken } from '@/lib/api'

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; fullName: string; familyName: string; birthYear: number | null; photoUrl: string | null }
  | { status: 'error'; message: string }

type AuthMode = 'signup' | 'login'

export default function InvitePage() {
  const router  = useRouter()
  const isLoggedIn = !!getToken()

  const [code, setCode]         = useState('')
  const [preview, setPreview]   = useState<PreviewState>({ status: 'idle' })

  // auth form
  const [authMode, setAuthMode]     = useState<AuthMode>('signup')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)

  // Auto-lookup when code reaches 8 chars
  useEffect(() => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 8) { setPreview({ status: 'idle' }); return }

    setPreview({ status: 'loading' })
    api.invite.lookup(trimmed)
      .then(p => setPreview({
        status:     'ready',
        fullName:   p.full_name,
        familyName: p.family_name,
        birthYear:  p.birth_year,
        photoUrl:   p.photo_url,
      }))
      .catch(err => setPreview({
        status:  'error',
        message: err instanceof Error ? err.message : 'Invalid code',
      }))
  }, [code])

  const claimWithToken = async (authToken: string) => {
    setToken(authToken)
    const result = await api.invite.claim(code.trim())
    setToken(result.token) // switch JWT to invited family
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (preview.status !== 'ready') return
    setError('')
    setSubmitting(true)

    try {
      if (isLoggedIn) {
        const result = await api.invite.claim(code.trim())
        setToken(result.token) // switch JWT to invited family
      } else if (authMode === 'signup') {
        if (!displayName.trim()) { setError('Please enter your name'); setSubmitting(false); return }
        const result = await api.invite.signupAndClaim({
          email,
          password,
          display_name: displayName.trim(),
          invite_token: code.trim(),
        })
        setToken(result.token)
      } else {
        const { token } = await api.auth.login({ email, password })
        await claimWithToken(token)
      }

      setDone(true)
      setTimeout(() => router.replace('/graph'), 1800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={pageWrap}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A0A00', margin: '0 0 8px' }}>
            You&apos;re in the family tree!
          </h2>
          <p style={{ fontSize: '14px', color: '#9A6C3C', margin: 0 }}>Taking you to your tree…</p>
        </div>
      </div>
    )
  }

  const canProceed = preview.status === 'ready'

  return (
    <div style={pageWrap}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #EA580C, #C2410C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="5"  r="2.4" fill="white" />
                <circle cx="4"  cy="15" r="2"   fill="white" opacity="0.85" />
                <circle cx="16" cy="15" r="2"   fill="white" opacity="0.85" />
                <line x1="10" y1="7.4" x2="4"  y2="13" stroke="white" strokeWidth="1.2" opacity="0.55" />
                <line x1="10" y1="7.4" x2="16" y2="13" stroke="white" strokeWidth="1.2" opacity="0.55" />
              </svg>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#1A0A00', letterSpacing: '-0.02em' }}>
              Ancestree
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#9A6C3C', margin: 0 }}>
            You&apos;ve been invited to join a family tree
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={card}>

            {/* ── Step 1: Code input ── */}
            <label style={labelStyle}>Invite code</label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              placeholder="e.g. A3F9KC2E"
              maxLength={8}
              style={{
                ...inputStyle,
                textAlign: 'center', letterSpacing: '0.18em',
                fontSize: '20px', fontWeight: 700, fontFamily: 'monospace',
              }}
              onFocus={e => (e.target.style.borderColor = '#EA580C')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
            />
            <p style={{ fontSize: '11px', color: '#C4A070', margin: '6px 0 0', textAlign: 'center' }}>
              8-character code shared by a family member
            </p>

            {/* Preview */}
            {preview.status === 'loading' && (
              <div style={infoBox('#FFF7ED', '#FDBA74')}>
                <IconLoader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '13px', color: '#9A6C3C' }}>Looking up…</span>
              </div>
            )}

            {preview.status === 'error' && (
              <div style={infoBox('#FEF2F2', '#FECACA')}>
                <span style={{ fontSize: '13px', color: '#DC2626' }}>{preview.message}</span>
              </div>
            )}

            {preview.status === 'ready' && (
              <div style={infoBox('#F0FDF4', '#BBF7D0')}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {preview.photoUrl
                    ? <img src={preview.photoUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                    : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '6px',
                        background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', flexShrink: 0,
                      }}>👤</div>
                    )
                  }
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532D' }}>{preview.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '2px' }}>
                      {preview.familyName}{preview.birthYear ? ` · b. ${preview.birthYear}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Auth (only if not already logged in) ── */}
            {canProceed && !isLoggedIn && (
              <>
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />

                {/* Login / Signup toggle */}
                <div style={{
                  display: 'flex', gap: '2px',
                  background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '3px',
                  marginBottom: '16px',
                }}>
                  {(['signup', 'login'] as AuthMode[]).map(m => (
                    <button
                      key={m} type="button"
                      onClick={() => { setAuthMode(m); setError('') }}
                      style={{
                        flex: 1, height: '32px', borderRadius: '6px', border: 'none',
                        fontSize: '13px', fontWeight: authMode === m ? 600 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: authMode === m ? '#fff' : 'transparent',
                        color: authMode === m ? '#431407' : '#9A6C3C',
                        boxShadow: authMode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m === 'signup' ? 'Create account' : 'Log in'}
                    </button>
                  ))}
                </div>

                {authMode === 'signup' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Your name</label>
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="e.g. Yash Khandelwal"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#EA580C')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#EA580C')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                  />
                </div>

                <div style={{ marginBottom: '4px' }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: '42px' }}
                      onFocus={e => (e.target.style.borderColor = '#EA580C')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>
                      {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ ...infoBox('#FEF2F2', '#FECACA'), marginTop: '12px' }}>
                <span style={{ fontSize: '13px', color: '#DC2626' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canProceed || submitting}
              style={{
                ...submitBtn,
                marginTop: '20px',
                background: canProceed && !submitting
                  ? 'linear-gradient(135deg, #EA580C, #C2410C)'
                  : '#F0A070',
                cursor: canProceed && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {submitting
                ? <><IconLoader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Just a moment…</>
                : canProceed
                  ? isLoggedIn
                    ? <><IconCheck size={15} /> Claim my spot as {preview.fullName.split(' ')[0]}</>
                    : authMode === 'signup'
                      ? 'Create account & join family'
                      : 'Log in & join family'
                  : 'Enter your invite code above'
              }
            </button>
          </div>
        </form>

        {isLoggedIn && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#9A6C3C' }}>
            <Link href="/graph" style={{ color: '#EA580C', fontWeight: 600, textDecoration: 'none' }}>
              Back to my tree
            </Link>
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ── styles ── */

const pageWrap: React.CSSProperties = {
  minHeight: '100vh', background: '#FFF7ED',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
}

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: '14px', padding: '32px',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
  display: 'flex', flexDirection: 'column',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 500, color: '#4A2C0A', marginBottom: '6px', display: 'block',
}

const inputStyle: React.CSSProperties = {
  height: '42px', padding: '0 14px',
  border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '8px',
  fontSize: '14px', color: '#1A0A00', background: '#FDFAF6',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  width: '100%', boxSizing: 'border-box' as const,
}

function infoBox(bg: string, border: string): React.CSSProperties {
  return {
    marginTop: '14px', padding: '12px 14px', borderRadius: '8px',
    background: bg, border: `1px solid ${border}`,
    display: 'flex', alignItems: 'center', gap: '8px',
  }
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#9A6C3C',
  padding: 0, display: 'flex', alignItems: 'center',
}

const submitBtn: React.CSSProperties = {
  height: '44px', borderRadius: '8px', border: 'none',
  color: '#fff', fontSize: '14px', fontWeight: 600,
  fontFamily: 'inherit', letterSpacing: '0.02em', transition: 'opacity 0.15s',
  width: '100%',
}
