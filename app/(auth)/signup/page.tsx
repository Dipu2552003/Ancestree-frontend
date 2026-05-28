'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconBrandGoogle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { api, setToken } from '@/lib/api'

export default function SignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim())         { setError('Please enter your name.'); return }
    if (!email)               { setError('Please enter your email.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { token, user } = await api.auth.signup({ email, password, display_name: name.trim() })
      setToken(token)
      localStorage.setItem('user', JSON.stringify(user))
      window.location.href = '/graph'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create account. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    // Google OAuth not yet supported
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFF7ED',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            Start building your family tree
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '14px', padding: '32px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        }}>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{
              width: '100%', height: '44px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)',
              fontSize: '14px', fontWeight: 500, color: '#1A0A00',
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: '20px',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#EA580C')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)')}
          >
            <IconBrandGoogle size={18} />
            Sign up with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: '12px', color: '#C4A070', letterSpacing: '0.06em' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name */}
            <Field label="Your name">
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Rahul Khandelwal"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#EA580C')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </Field>

            {/* Email */}
            <Field label="Email">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#EA580C')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
            </Field>

            {/* Password */}
            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, paddingRight: '42px', boxSizing: 'border-box' as const }}
                  onFocus={e => (e.target.style.borderColor = '#EA580C')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>
                  {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <StrengthBar password={password} />
              )}
            </Field>

            {error && <ErrorBox>{error}</ErrorBox>}

            <button type="submit" disabled={loading} style={{
              ...submitBtn,
              background: loading ? '#F0A070' : 'linear-gradient(135deg, #EA580C, #C2410C)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p style={{ fontSize: '11.5px', color: '#B89070', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              By continuing you agree to our{' '}
              <Link href="#" style={{ color: '#EA580C', textDecoration: 'none' }}>Terms</Link>
              {' '}and{' '}
              <Link href="#" style={{ color: '#EA580C', textDecoration: 'none' }}>Privacy Policy</Link>
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#9A6C3C' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#EA580C', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

/* ── password strength bar ── */

function StrengthBar({ password }: { password: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter(r => r.test(password)).length
  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E']
  const labels = ['Too short', 'Weak', 'Fair', 'Strong']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          flex: 1, height: '3px', borderRadius: '2px',
          background: i < score ? colors[score - 1] : 'rgba(0,0,0,0.08)',
          transition: 'background 0.2s',
        }} />
      ))}
      <span style={{ fontSize: '11px', color: score ? colors[score-1] : '#B89070', minWidth: '52px' }}>
        {score ? labels[score - 1] : ''}
      </span>
    </div>
  )
}

/* ── shared sub-components ── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '8px',
      background: '#FEF2F2', border: '1px solid #FECACA',
      fontSize: '13px', color: '#DC2626',
    }}>
      {children}
    </div>
  )
}

/* ── style tokens ── */

const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#4A2C0A' }

const inputStyle: React.CSSProperties = {
  height: '42px', padding: '0 14px',
  border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '8px',
  fontSize: '14px', color: '#1A0A00', background: '#FDFAF6',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  width: '100%', boxSizing: 'border-box',
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
}
