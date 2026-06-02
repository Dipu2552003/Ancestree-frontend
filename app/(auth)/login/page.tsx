'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { api, setToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const { token, user } = await api.auth.login({ email, password })
      setToken(token)
      localStorage.setItem('user', JSON.stringify(user))
      router.push('/graph')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FFF7ED',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

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
          <p style={{ fontSize: '14px', color: '#9A6C3C', margin: 0 }}>Sign in to your family tree</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '14px', padding: '32px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        }}>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Password</span>
                <Link href="#" style={{ fontSize: '12px', color: '#EA580C', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: '42px', width: '100%', boxSizing: 'border-box' as const }}
                  onFocus={e => (e.target.style.borderColor = '#EA580C')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>
                  {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <button type="submit" disabled={loading} style={{
              ...submitBtn,
              background: loading ? '#F0A070' : 'linear-gradient(135deg, #EA580C, #C2410C)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#9A6C3C' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#EA580C', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
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
