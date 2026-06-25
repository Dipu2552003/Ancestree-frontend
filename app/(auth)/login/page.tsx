'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconLoader2, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import AuthLayout, { type AuthLang } from '@/components/auth/AuthLayout'
import { api, setToken } from '@/lib/api'
import type { AuthPolaroidData } from '@/components/auth/AuthPolaroid'

// ── Bilingual copy ────────────────────────────────────────────────────────────
const COPY = {
  en: {
    lines:       ["Your family's", 'story,', 'in one place.'],
    accentLine:  2,
    sub:         'Connect generations. Preserve memories.',
    emailLabel:  'Email address',
    emailPh:     'you@example.com',
    continue:    'Continue',
    pwLabel:     'Password',
    pwPh:        'Your password',
    signin:      'Sign in',
    notYou:      'Not you?',
    noAccount:   "Don't have an account?",
    signup:      'Create account',
    haveInvite:  'Have an invite code?',
    invite:      'Join via invite',
    back:        '← Back',
    errEmail:    'Enter a valid email address',
    errPw:       'Enter your password',
    errNoAcct:   'No account found for this email.',
    errCommunity:'You are a community member. Please sign in from your community page.',
    errBadCreds: 'Invalid email or password',
    errNetwork:  'Could not reach the server. Please try again.',
    signupCta:   'Create one',
    welcomeBack: 'Welcome back',
    forgotLink:  'Forgot password?',
    forgotTitle: 'Reset your password',
    forgotSub:   "We'll email you a link to reset your password. The link expires in 1 hour.",
    sendReset:   'Send reset link',
    forgotSent:  "If an account exists for this email, we've sent a reset link.",
    forgotBack:  '← Back to sign in',
  },
  hi: {
    lines:       ['आपके परिवार', 'की कहानी,', 'एक जगह।'],
    accentLine:  2,
    sub:         'पीढ़ियाँ जोड़ें। यादें सहेजें।',
    emailLabel:  'ईमेल पता',
    emailPh:     'aap@example.com',
    continue:    'आगे बढ़ें',
    pwLabel:     'पासवर्ड',
    pwPh:        'आपका पासवर्ड',
    signin:      'साइन इन करें',
    notYou:      'आप नहीं?',
    noAccount:   'खाता नहीं है?',
    signup:      'खाता बनाएँ',
    haveInvite:  'निमंत्रण कोड है?',
    invite:      'निमंत्रण से जुड़ें',
    back:        '← वापस',
    errEmail:    'एक वैध ईमेल दर्ज करें',
    errPw:       'पासवर्ड दर्ज करें',
    errNoAcct:   'इस ईमेल से कोई खाता नहीं मिला।',
    errCommunity:'आप एक समुदाय सदस्य हैं। कृपया अपने समुदाय पेज से साइन इन करें।',
    errBadCreds: 'गलत ईमेल या पासवर्ड',
    errNetwork:  'सर्वर तक नहीं पहुँच सका। पुनः प्रयास करें।',
    signupCta:   'खाता बनाएँ',
    welcomeBack: 'वापस स्वागत है',
    forgotLink:  'पासवर्ड भूल गए?',
    forgotTitle: 'पासवर्ड रीसेट करें',
    forgotSub:   'हम आपको रीसेट लिंक ईमेल करेंगे। यह लिंक 1 घंटे में समाप्त हो जाता है।',
    sendReset:   'रीसेट लिंक भेजें',
    forgotSent:  'अगर इस ईमेल पर खाता है, तो हमने रीसेट लिंक भेज दिया है।',
    forgotBack:  '← साइन इन पर वापस',
  },
} as const

type Step = 'email' | 'password' | 'forgot'
const EASE = [0.22, 1, 0.36, 1] as const

// Step slide variants — dir: 1 = forward, -1 = back
const stepVariants = {
  enter:  (d: number) => ({ x: d * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -28, opacity: 0 }),
}

export default function LoginPage() {
  const router = useRouter()
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const [lang,      setLang]      = useState<AuthLang>('en')
  const [[step, dir], setStepDir] = useState<[Step, number]>(['email', 1])

  // Community accounts aren't redirected away from here — entering a community
  // email surfaces an inline error (see handleContinue) telling them to sign in
  // from their community page.
  const [email,     setEmail]     = useState('')
  const [emailErr,  setEmailErr]  = useState('')
  const [emailNotFound, setEmailNotFound] = useState(false)
  const [emailFocus, setEmailFocus] = useState(false)
  const [password,  setPassword]  = useState('')
  const [pwErr,     setPwErr]     = useState('')
  const [pwFocus,   setPwFocus]   = useState(false)
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotErr,  setForgotErr]  = useState('')

  const t = getTheme(isDark)
  const c = COPY[lang]

  const lv = {
    cardBg:     isDark ? '#1C1A12' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.11)',
    cardShadow: isDark
      ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 4px rgba(0,0,0,0.30), 0 8px 28px rgba(0,0,0,0.45)'
      : '0 1px 0 rgba(255,255,255,0.85) inset, 0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.08), 0 28px 64px rgb(var(--c-primary-rgb) / 0.06)',
    inputBg:      isDark ? '#141210' : '#FDFAF6',
    inputBgFocus: isDark ? '#1C1A12' : '#FFFFFF',
    inputBorder:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
  }

  const goForward = () => setStepDir(['password', 1])
  const goBack    = () => { setStepDir(['email', -1]); setPassword(''); setPwErr('') }
  const goForgot  = () => {
    setStepDir(['forgot', 1])
    setForgotSent(false); setForgotErr('')
  }
  const goBackFromForgot = () => {
    setStepDir([password ? 'password' : 'email', -1])
    setForgotErr('')
  }

  const handleSendReset = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setForgotErr(c.errEmail); return
    }
    setForgotErr(''); setLoading(true)
    try {
      await api.auth.forgotPassword(trimmed)
      setForgotSent(true)
    } catch (err) {
      setForgotErr((err as Error).message || c.errNetwork)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailErr(c.errEmail); return
    }
    setEmailErr(''); setEmailNotFound(false); setLoading(true)
    try {
      const { exists, community_slug } = await api.auth.checkEmail(trimmed)
      if (!exists) {
        setEmailNotFound(true)
        setEmailErr(c.errNoAcct)
        setLoading(false)
        return
      }
      // Community accounts can't use the platform login — show an error telling
      // them to sign in from their community page (don't advance, don't redirect).
      if (community_slug) {
        setEmailErr(c.errCommunity)
        setLoading(false)
        return
      }
      setLoading(false)
      goForward()
    } catch (err) {
      setLoading(false)
      setEmailErr((err as Error).message || c.errNetwork)
    }
  }

  const handleSignIn = async () => {
    if (!password.trim()) { setPwErr(c.errPw); return }
    setPwErr(''); setLoading(true)
    try {
      const { token } = await api.auth.login({ email: email.trim(), password })
      setToken(token)
      router.push('/graph')
    } catch (err) {
      setLoading(false)
      const msg = (err as Error).message
      setPwErr(msg || c.errBadCreds)
    }
  }

  const inputStyle = (focused: boolean, err: string) => ({
    width: '100%', height: 50, padding: '0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${err ? '#EF4444' : focused ? 'var(--c-primary)' : lv.inputBorder}`,
    borderRadius: 12,
    background: focused ? lv.inputBgFocus : lv.inputBg,
    color: t.text, outline: 'none',
    boxSizing: 'border-box' as const,
    boxShadow: focused ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : isDark ? '0 1px 2px rgba(0,0,0,0.30)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  const ctaStyle = (dis: boolean) => ({
    width: '100%', height: 50, borderRadius: 12, border: 'none',
    background: dis ? 'rgb(var(--c-primary-rgb) / 0.48)' : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700 as const,
    fontFamily: 'inherit', cursor: dis ? 'default' as const : 'pointer' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: dis ? 'none' : '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
    letterSpacing: '0.01em',
    transition: 'background 0.2s',
  })

  // ── Right-panel preview: blank YOU card from password step onward ──────────
  const preview: AuthPolaroidData | null = step === 'password'
    ? {
        fullName: email.trim().split('@')[0] || '',
        isSelf:   true,
        subtitle: c.welcomeBack,
      }
    : null

  return (
    <AuthLayout lang={lang} onLangChange={setLang} preview={preview}>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lang}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <h1 style={{ margin: '0 0 14px', lineHeight: 1.06 }}>
            {c.lines.map((line, li) => (
              <div key={li} style={{ display: 'block', overflow: 'hidden' }}>
                {line.split(' ').map((word, wi) => (
                  <motion.span
                    key={wi}
                    initial={{ y: 36, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08 + li * 0.13 + wi * 0.06, duration: 0.50, ease: EASE }}
                    style={{
                      display: 'inline-block', marginRight: '0.22em',
                      fontSize: lang === 'hi' ? (isMobile ? 32 : 46) : (isMobile ? 36 : 52), fontWeight: 800, letterSpacing: '-0.03em',
                      color: li === c.accentLine ? 'var(--c-primary)' : t.text,
                      transition: 'color 0.35s ease',
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.40, ease: EASE }}
            style={{ margin: isMobile ? '0 0 24px' : '0 0 36px', fontSize: isMobile ? 14.5 : 15.5, color: t.textMuted, lineHeight: 1.65, fontWeight: 400, transition: 'color 0.35s ease' }}
          >
            {c.sub}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.36, duration: 0.60, type: 'spring', stiffness: 255, damping: 24 }}
        style={{
          background: lv.cardBg, borderRadius: 20, padding: '30px 28px 26px',
          border: `1px solid ${lv.cardBorder}`, boxShadow: lv.cardShadow,
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
        }}
      >
        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Step 1: Email ─────────────────────────────────────────────── */}
          {step === 'email' && (
            <motion.div key="email" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              {/* Email input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.emailLabel}
                </label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); setEmailNotFound(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder={c.emailPh}
                  autoComplete="email"
                  autoFocus
                  style={inputStyle(emailFocus, emailErr)}
                />
                <AnimatePresence>
                  {emailErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {emailErr}
                      {emailNotFound && (
                        <>
                          {' '}
                          <a
                            href={`/signup?email=${encodeURIComponent(email.trim())}`}
                            style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {c.signupCta}
                          </a>
                        </>
                      )}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Continue */}
              <motion.button
                onClick={handleContinue} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={ctaStyle(loading)}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                    <IconLoader2 size={18} />
                  </motion.div>
                ) : (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                        {c.continue}
                      </motion.span>
                    </AnimatePresence>
                    <IconArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </motion.button>

            </motion.div>
          )}

          {/* ── Step 2: Password ──────────────────────────────────────────── */}
          {step === 'password' && (
            <motion.div key="password" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              {/* Signed-in-as pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '9px 13px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}` }}>
                <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{email}</span>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--c-primary)', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
                  {c.notYou}
                </button>
              </div>

              {/* Password input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.pwLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwErr('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => setPwFocus(false)}
                    placeholder={c.pwPh}
                    autoComplete="current-password"
                    autoFocus
                    style={{ ...inputStyle(pwFocus, pwErr), paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                  </button>
                </div>
                <AnimatePresence>
                  {pwErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {pwErr}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={goForgot}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: 12, fontWeight: 600, color: 'var(--c-primary)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {c.forgotLink}
                  </button>
                </div>
              </div>

              {/* Sign in */}
              <motion.button
                onClick={handleSignIn} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={ctaStyle(loading)}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                    <IconLoader2 size={18} />
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                      {c.signin}
                    </motion.span>
                  </AnimatePresence>
                )}
              </motion.button>

            </motion.div>
          )}

          {/* ── Step 3: Forgot password ───────────────────────────────────── */}
          {step === 'forgot' && (
            <motion.div key="forgot" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>
                {c.forgotTitle}
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
                {c.forgotSub}
              </p>

              {forgotSent ? (
                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: isDark ? 'rgba(20,64,26,0.45)' : '#DCFCE7',
                  border: `1px solid ${isDark ? 'rgba(34,197,94,0.35)' : '#86EFAC'}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 16,
                }}>
                  <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
                  <p style={{ margin: 0, fontSize: 13, color: isDark ? '#86EFAC' : '#15803D', lineHeight: 1.5 }}>
                    {c.forgotSent}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                      {c.emailLabel}
                    </label>
                    <input
                      value={email}
                      onChange={e => { setEmail(e.target.value); setForgotErr('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendReset() }}
                      onFocus={() => setEmailFocus(true)}
                      onBlur={() => setEmailFocus(false)}
                      placeholder={c.emailPh}
                      autoComplete="email"
                      autoFocus
                      style={inputStyle(emailFocus, forgotErr)}
                    />
                    <AnimatePresence>
                      {forgotErr && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                          {forgotErr}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    onClick={handleSendReset} disabled={loading}
                    whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    style={ctaStyle(loading)}
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                        <IconLoader2 size={18} />
                      </motion.div>
                    ) : (
                      c.sendReset
                    )}
                  </motion.button>
                </>
              )}

              <button
                type="button"
                onClick={goBackFromForgot}
                style={{
                  marginTop: 14, width: '100%',
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 13, fontWeight: 600, color: 'var(--c-primary)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {c.forgotBack}
              </button>

            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* ── Footer links ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.88, duration: 0.4 }}
        style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      >
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: t.textMuted, transition: 'color 0.35s ease' }}>
          <AnimatePresence mode="wait">
            <motion.span key={lang + 'new'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
              {c.noAccount}{' '}
              <a href="/signup" style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'none' }}>{c.signup}</a>
            </motion.span>
          </AnimatePresence>
        </p>

        <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: t.textMuted, transition: 'color 0.35s ease' }}>
          <AnimatePresence mode="wait">
            <motion.span key={lang + 'inv'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
              {c.haveInvite}{' '}
              <a href="/invite" style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'none' }}>{c.invite}</a>
            </motion.span>
          </AnimatePresence>
        </p>
      </motion.div>

    </AuthLayout>
  )
}
