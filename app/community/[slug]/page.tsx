'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconLoader2, IconEye, IconEyeOff, IconCircleCheck, IconTicket } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import AuthLayout, { type AuthLang } from '@/components/auth/AuthLayout'
import { api, setToken } from '@/lib/api'
import type { AuthPolaroidData } from '@/components/auth/AuthPolaroid'

const COPY = {
  en: {
    communityBy:     'Community on Ancestree',
    login:           'Sign in',
    signup:          'Create account',
    emailLabel:      'Email address',
    emailPh:         'you@example.com',
    pwLabel:         'Password',
    pwPh:            'Your password',
    nameLabel:       'Full name',
    namePh:          'e.g. Rahul Sharma',
    newPwPh:         'At least 8 characters',
    confirmLabel:    'Confirm password',
    confirmPh:       'Re-enter password',
    inviteLabel:     'Invite code',
    invitePh:        'Enter your community invite code',
    loginCta:        'Sign in',
    signupCta:       'Create account',
    errEmail:        'Enter a valid email address',
    errPw:           'Enter your password',
    errPwLen:        'Password must be at least 8 characters',
    errPwMatch:      'Passwords do not match',
    errName:         'Please enter your full name',
    errInvite:       'An invite code is required to join this community',
    errNetwork:      'Could not reach the server. Please try again.',
    loading:         'Loading…',
    notFound:        'This community page could not be found.',
    welcomeBack:     'Welcome back',
    yourNode:        'Your node',
    haveInvite:      'Have an invite link?',
    haveInviteCta:   'Create your account',
    inviteHint:      'Paste the code from your invite link — or just open the link your admin shared.',
    inviteOk:        'Invite verified — joining as',
    inviteBad:       'This invite link is invalid or has expired.',
  },
  hi: {
    communityBy:     'Ancestree पर समुदाय',
    login:           'साइन इन',
    signup:          'खाता बनाएँ',
    emailLabel:      'ईमेल पता',
    emailPh:         'aap@example.com',
    pwLabel:         'पासवर्ड',
    pwPh:            'आपका पासवर्ड',
    nameLabel:       'पूरा नाम',
    namePh:          'जैसे राहुल शर्मा',
    newPwPh:         'कम से कम 8 अक्षर',
    confirmLabel:    'पासवर्ड दोहराएँ',
    confirmPh:       'फिर से दर्ज करें',
    inviteLabel:     'निमंत्रण कोड',
    invitePh:        'अपना समुदाय निमंत्रण कोड दर्ज करें',
    loginCta:        'साइन इन करें',
    signupCta:       'खाता बनाएँ',
    errEmail:        'एक वैध ईमेल दर्ज करें',
    errPw:           'पासवर्ड दर्ज करें',
    errPwLen:        'पासवर्ड कम से कम 8 अक्षर का होना चाहिए',
    errPwMatch:      'पासवर्ड मेल नहीं खाते',
    errName:         'कृपया अपना पूरा नाम दर्ज करें',
    errInvite:       'समुदाय में शामिल होने के लिए निमंत्रण कोड आवश्यक है',
    errNetwork:      'सर्वर तक नहीं पहुँच सका। पुनः प्रयास करें।',
    loading:         'लोड हो रहा है…',
    notFound:        'यह समुदाय पेज नहीं मिला।',
    welcomeBack:     'वापस स्वागत है',
    yourNode:        'आपका नोड',
    haveInvite:      'निमंत्रण लिंक है?',
    haveInviteCta:   'खाता बनाएँ',
    inviteHint:      'अपने निमंत्रण लिंक से कोड पेस्ट करें — या एडमिन द्वारा भेजा गया लिंक खोलें।',
    inviteOk:        'निमंत्रण सत्यापित — शामिल हो रहे हैं',
    inviteBad:       'यह निमंत्रण लिंक अमान्य या समाप्त हो गया है।',
  },
} as const

type Tab = 'login' | 'signup'
const EASE = [0.22, 1, 0.36, 1] as const

function CommunityPageInner() {
  const params  = useParams()
  const slug    = (params?.slug as string) ?? ''
  const search  = useSearchParams()
  const router  = useRouter()
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const [lang, setLang] = useState<AuthLang>('en')

  const c = COPY[lang]
  const th = getTheme(isDark)

  const [communityName,    setCommunityName]    = useState('')
  const [communityStatus,  setCommunityStatus]  = useState<'loading' | 'ok' | 'error'>('loading')

  // A shared invite link (?code=…) should land on signup, where the code is used.
  const [tab, setTab] = useState<Tab>(
    search?.get('tab') === 'signup' || search?.get('code') ? 'signup' : 'login',
  )

  const [email,         setEmail]         = useState(search?.get('email') ?? '')
  const [loading,       setLoading]       = useState(false)
  const [showPw,        setShowPw]        = useState(false)
  const [formErr,       setFormErr]       = useState('')

  const [loginPw,       setLoginPw]       = useState('')
  const [loginPwFocus,  setLoginPwFocus]  = useState(false)

  const [signupName,    setSignupName]    = useState('')
  const [signupPw,      setSignupPw]      = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [inviteCode,    setInviteCode]    = useState(search?.get('code') ?? '')
  // Validation of an invite arriving via ?code= so the invitee sees it's recognised.
  const [inviteCheck,   setInviteCheck]   = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [inviteRole,    setInviteRole]    = useState('')

  const [emailFocus,   setEmailFocus]   = useState(false)
  const [nameFocus,    setNameFocus]    = useState(false)
  const [pwFocus,      setPwFocus]      = useState(false)
  const [pw2Focus,     setPw2Focus]     = useState(false)
  const [inviteFocus,  setInviteFocus]  = useState(false)

  // If the user already has a valid session, skip the login form entirely.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('at')
    if (token) router.replace('/graph')
  }, [router])

  useEffect(() => {
    if (!slug) return
    api.community.getInfo(slug)
      .then(info => { setCommunityName(info.name); setCommunityStatus('ok') })
      .catch(() => setCommunityStatus('error'))
  }, [slug])

  // When an invite code arrives in the URL, confirm it against the community so
  // the invitee gets immediate feedback that the link is valid (and their role).
  useEffect(() => {
    const code = search?.get('code')
    if (!slug || !code) return
    setInviteCheck('checking')
    api.community.validateInvite(slug, code)
      .then(info => { setInviteCheck('valid'); setInviteRole(info.role) })
      .catch(() => setInviteCheck('invalid'))
  }, [slug, search])

  const lv = {
    cardBg:       isDark ? '#1C1A12' : '#FFFFFF',
    cardBorder:   isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.11)',
    cardShadow:   isDark
      ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 4px rgba(0,0,0,0.30), 0 8px 28px rgba(0,0,0,0.45)'
      : '0 1px 0 rgba(255,255,255,0.85) inset, 0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.08), 0 28px 64px rgb(var(--c-primary-rgb) / 0.06)',
    inputBg:       isDark ? '#141210' : '#FDFAF6',
    inputBgFocus:  isDark ? '#1C1A12' : '#FFFFFF',
    inputBorder:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
    tabActiveBg:   'var(--c-primary)',
    tabInactiveBg: 'transparent',
    tabTrackBg:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    tabTrackBorder:isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
  }

  const inputStyle = (focused: boolean, hasErr: boolean): React.CSSProperties => ({
    width: '100%', height: 50, padding: '0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${hasErr ? '#EF4444' : focused ? 'var(--c-primary)' : lv.inputBorder}`,
    borderRadius: 12,
    background: focused ? lv.inputBgFocus : lv.inputBg,
    color: th.text, outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused
      ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)'
      : isDark ? '0 1px 2px rgba(0,0,0,0.30)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  const ctaStyle = (dis: boolean): React.CSSProperties => ({
    width: '100%', height: 50, borderRadius: 12, border: 'none',
    background: dis ? 'rgb(var(--c-primary-rgb) / 0.48)' : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: 'inherit', cursor: dis ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: dis ? 'none' : '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
    letterSpacing: '0.01em', transition: 'background 0.2s',
  })

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleLogin = async () => {
    if (!isValidEmail(email.trim())) { setFormErr(c.errEmail); return }
    if (!loginPw.trim()) { setFormErr(c.errPw); return }
    setFormErr(''); setLoading(true)
    try {
      const { token, user } = await api.community.login(slug, { email: email.trim(), password: loginPw })
      setToken(token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify({ person_id: user.person_id, family_id: user.family_id }))
        localStorage.setItem('community_slug', slug)
      }
      router.push('/graph')
    } catch (err) {
      setLoading(false)
      setFormErr((err as Error).message || c.errNetwork)
    }
  }

  const handleSignup = async () => {
    if (!signupName.trim()) { setFormErr(c.errName); return }
    if (!isValidEmail(email.trim())) { setFormErr(c.errEmail); return }
    if (signupPw.length < 8) { setFormErr(c.errPwLen); return }
    if (signupPw !== signupConfirm) { setFormErr(c.errPwMatch); return }
    if (!inviteCode.trim()) { setFormErr(c.errInvite); return }
    setFormErr(''); setLoading(true)
    try {
      const { token, user } = await api.community.signup(slug, {
        email:        email.trim(),
        password:     signupPw,
        display_name: signupName.trim(),
        ...(inviteCode.trim() ? { invite_code: inviteCode.trim() } : {}),
      })
      setToken(token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify({ person_id: user.person_id, family_id: user.family_id }))
        localStorage.setItem('community_slug', slug)
      }
      router.push('/graph')
    } catch (err) {
      setLoading(false)
      setFormErr((err as Error).message || c.errNetwork)
    }
  }

  const preview: AuthPolaroidData | null =
    tab === 'login' && email
      ? { fullName: email.split('@')[0] ?? '', isSelf: true, subtitle: c.welcomeBack }
      : tab === 'signup' && signupName
        ? { fullName: signupName, isSelf: true, subtitle: c.yourNode }
        : null

  if (communityStatus === 'loading') {
    return (
      <AuthLayout lang={lang} onLangChange={setLang}>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ color: th.textMuted, fontSize: 15 }}
        >
          {c.loading}
        </motion.p>
      </AuthLayout>
    )
  }

  if (communityStatus === 'error') {
    return (
      <AuthLayout lang={lang} onLangChange={setLang}>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ color: '#EF4444', fontSize: 15 }}
        >
          {c.notFound}
        </motion.p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout lang={lang} onLangChange={setLang} preview={preview}>

      {/* Community heading */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{ marginBottom: isMobile ? 22 : 30 }}
      >
        <p style={{
          margin: '0 0 5px', fontSize: 11.5, fontWeight: 700,
          letterSpacing: '0.09em', color: 'var(--c-primary)', textTransform: 'uppercase',
        }}>
          {c.communityBy}
        </p>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? 30 : 42,
          fontWeight: 800, letterSpacing: '-0.03em',
          color: th.text, lineHeight: 1.08,
          transition: 'color 0.35s ease',
        }}>
          {communityName}
        </h1>
      </motion.div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.10, duration: 0.40, ease: EASE }}
        style={{
          display: 'flex', borderRadius: 14, padding: 4, marginBottom: 18,
          background: lv.tabTrackBg,
          border: `1px solid ${lv.tabTrackBorder}`,
        }}
      >
        {(['login', 'signup'] as Tab[]).map(tabKey => {
          const active = tab === tabKey
          return (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setFormErr('') }}
              style={{
                flex: 1, height: 40, borderRadius: 10, border: 'none',
                background: active ? lv.tabActiveBg : lv.tabInactiveBg,
                color: active ? '#fff' : th.textMuted,
                fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                boxShadow: active ? '0 2px 10px rgb(var(--c-primary-rgb) / 0.38)' : 'none',
                transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
              }}
            >
              {tabKey === 'login' ? c.login : c.signup}
            </button>
          )
        })}
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.18, duration: 0.55, type: 'spring', stiffness: 255, damping: 24 }}
        style={{
          background: lv.cardBg, borderRadius: 20, padding: '28px 26px 24px',
          border: `1px solid ${lv.cardBorder}`, boxShadow: lv.cardShadow,
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
        }}
      >
        <AnimatePresence mode="wait">

          {/* ── Login ─────────────────────────────────────────────────── */}
          {tab === 'login' && (
            <motion.div key="login"
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.emailLabel}
                </label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFormErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder={c.emailPh}
                  autoComplete="email"
                  autoFocus
                  style={inputStyle(emailFocus, false)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.pwLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={loginPw}
                    onChange={e => { setLoginPw(e.target.value); setFormErr('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                    onFocus={() => setLoginPwFocus(true)}
                    onBlur={() => setLoginPwFocus(false)}
                    placeholder={c.pwPh}
                    autoComplete="current-password"
                    style={{ ...inputStyle(loginPwFocus, false), paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: th.textMuted, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {formErr && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ margin: '0 0 10px', fontSize: 12, color: '#EF4444' }}>
                    {formErr}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                onClick={handleLogin} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={ctaStyle(loading)}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                    <IconLoader2 size={18} />
                  </motion.div>
                ) : (
                  <>{c.loginCta} <IconArrowRight size={16} strokeWidth={2.5} /></>
                )}
              </motion.button>

              {/* Invitees land here too — point them to signup where the code is used. */}
              <button
                type="button"
                onClick={() => { setTab('signup'); setFormErr('') }}
                style={{
                  marginTop: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600, color: th.textMuted, fontFamily: 'inherit',
                }}
              >
                <IconTicket size={15} style={{ color: 'var(--c-primary)' }} />
                {c.haveInvite}{' '}
                <span style={{ color: 'var(--c-primary)', fontWeight: 700 }}>{c.haveInviteCta}</span>
              </button>
            </motion.div>
          )}

          {/* ── Signup ────────────────────────────────────────────────── */}
          {tab === 'signup' && (
            <motion.div key="signup"
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.nameLabel}
                </label>
                <input
                  value={signupName}
                  onChange={e => { setSignupName(e.target.value); setFormErr('') }}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setNameFocus(false)}
                  placeholder={c.namePh}
                  autoComplete="name"
                  autoFocus
                  style={inputStyle(nameFocus, false)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.emailLabel}
                </label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFormErr('') }}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder={c.emailPh}
                  autoComplete="email"
                  style={inputStyle(emailFocus, false)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.pwLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={signupPw}
                    onChange={e => { setSignupPw(e.target.value); setFormErr('') }}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => setPwFocus(false)}
                    placeholder={c.newPwPh}
                    autoComplete="new-password"
                    style={{ ...inputStyle(pwFocus, false), paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: th.textMuted, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.confirmLabel}
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={signupConfirm}
                  onChange={e => { setSignupConfirm(e.target.value); setFormErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSignup() }}
                  onFocus={() => setPw2Focus(true)}
                  onBlur={() => setPw2Focus(false)}
                  placeholder={c.confirmPh}
                  autoComplete="new-password"
                  style={inputStyle(pw2Focus, false)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: th.textMuted, transition: 'color 0.35s ease' }}>
                  {c.inviteLabel}
                </label>
                <input
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value); setFormErr(''); setInviteCheck('idle') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSignup() }}
                  onFocus={() => setInviteFocus(true)}
                  onBlur={() => setInviteFocus(false)}
                  placeholder={c.invitePh}
                  style={inputStyle(inviteFocus, inviteCheck === 'invalid')}
                />
                {inviteCheck === 'valid' ? (
                  <p style={{ margin: '7px 0 0', fontSize: 12, fontWeight: 600, color: '#15803D', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <IconCircleCheck size={14} /> {c.inviteOk} {inviteRole}
                  </p>
                ) : inviteCheck === 'invalid' ? (
                  <p style={{ margin: '7px 0 0', fontSize: 12, fontWeight: 600, color: '#EF4444' }}>
                    {c.inviteBad}
                  </p>
                ) : null}
              </div>

              <AnimatePresence>
                {formErr && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ margin: '0 0 10px', fontSize: 12, color: '#EF4444' }}>
                    {formErr}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                onClick={handleSignup} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={ctaStyle(loading)}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                    <IconLoader2 size={18} />
                  </motion.div>
                ) : (
                  <>{c.signupCta} <IconArrowRight size={16} strokeWidth={2.5} /></>
                )}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

    </AuthLayout>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityPageInner />
    </Suspense>
  )
}
