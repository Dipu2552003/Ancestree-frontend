'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconLoader2, IconArrowLeft, IconEye, IconEyeOff, IconUserCheck } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import AuthLayout, { type AuthLang } from '@/components/auth/AuthLayout'
import { api, getToken, setToken } from '@/lib/api'
import type { AuthPolaroidData } from '@/components/auth/AuthPolaroid'

// ── Bilingual copy ────────────────────────────────────────────────────────────
const COPY = {
  en: {
    headline:    "You're invited.",
    sub:         'A family member added you to their tree. Enter your invite code to join.',

    tokenLabel:  'Invite code',
    tokenPh:     'Paste your code here',
    continue:    'Continue',

    previewTitle: 'Is this you?',
    previewSub:   'Confirm the details below, then claim your node.',
    invitedBy:    'Invited by',
    born:         'Born',
    joining:      'Joining',
    claimable:    'Awaiting you',

    claim:        'Yes, this is me',
    claimAuthed:  'Claim this node',
    notMe:        'Not me — try a different code',

    haveAcct:     'Already have an account?',
    signin:       'Sign in',
    newHere:      'New to Ancestree?',
    signup:       'Create account',

    emailLabel:   'Your email',
    emailPh:      'you@example.com',
    pwLabel:      'Choose a password',
    pwPh:         'At least 8 characters',
    displayLabel: 'Display name',
    displayPh:    'How your name appears in the tree',

    back:         'Back',

    errToken:     'Please enter your invite code',
    errEmail:     'Enter a valid email address',
    errPwLen:     'Password must be at least 8 characters',
    errDisplay:   'Enter a display name',
    errNetwork:   'Could not reach the server. Please try again.',
  },
  hi: {
    headline:    'आपको निमंत्रण है।',
    sub:         'एक परिजन ने आपको अपने पेड़ में जोड़ा है। जुड़ने के लिए अपना कोड दर्ज करें।',

    tokenLabel:  'निमंत्रण कोड',
    tokenPh:     'अपना कोड यहाँ डालें',
    continue:    'आगे बढ़ें',

    previewTitle: 'क्या यह आप हैं?',
    previewSub:   'नीचे दिए विवरण देखें और अपना नोड दावा करें।',
    invitedBy:    'आमंत्रित करने वाले',
    born:         'जन्म',
    joining:      'जुड़ रहे',
    claimable:    'आपकी प्रतीक्षा में',

    claim:        'हाँ, यह मैं हूँ',
    claimAuthed:  'इस नोड का दावा करें',
    notMe:        'मैं नहीं — दूसरा कोड आज़माएँ',

    haveAcct:     'पहले से खाता है?',
    signin:       'साइन इन',
    newHere:      'नए हैं?',
    signup:       'खाता बनाएँ',

    emailLabel:   'आपका ईमेल',
    emailPh:      'aap@example.com',
    pwLabel:      'पासवर्ड चुनें',
    pwPh:         'कम से कम 8 अक्षर',
    displayLabel: 'प्रदर्शित नाम',
    displayPh:    'पेड़ में आपका नाम कैसा दिखेगा',

    back:         'वापस',

    errToken:     'कृपया निमंत्रण कोड दर्ज करें',
    errEmail:     'एक वैध ईमेल दर्ज करें',
    errPwLen:     'पासवर्ड कम से कम 8 अक्षर का होना चाहिए',
    errDisplay:   'प्रदर्शित नाम दर्ज करें',
    errNetwork:   'सर्वर तक नहीं पहुँच सका। पुनः प्रयास करें।',
  },
} as const

const EASE = [0.22, 1, 0.36, 1] as const

type Step = 'token' | 'preview'

interface LookupResult {
  full_name:              string
  family_name:            string
  birth_year:             number | null
  photo_url:              string | null
  inviter_full_name:      string | null
  inviter_father_name:    string | null
  inviter_native_village: string | null
  inviter_current_city:   string | null
}

/** "Father: X · village haal city" — matches search/duplicate-found format. */
function inviterMetaLine(p: LookupResult): string {
  const pieces: string[] = []
  if (p.inviter_father_name) pieces.push(`Father: ${p.inviter_father_name}`)
  const places = [p.inviter_native_village, p.inviter_current_city].filter(Boolean) as string[]
  if (places.length > 0) pieces.push(places.join(' haal '))
  return pieces.join(' · ')
}

// ── Inner ─────────────────────────────────────────────────────────────────────
function InviteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const [lang, setLang] = useState<AuthLang>('en')

  // Has the user already got a session?
  const [authed, setAuthed] = useState(false)
  useEffect(() => { setAuthed(!!getToken()) }, [])

  const [step,     setStep]     = useState<Step>('token')
  const [token,    setToken_]   = useState(params.get('token') ?? '')
  const [tokenErr, setTokenErr] = useState('')
  const [focus,    setFocus]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [preview,  setPreview]  = useState<LookupResult | null>(null)

  // Inline signup fields (only shown when !authed)
  const [email,        setEmail]        = useState('')
  const [emailErr,     setEmailErr]     = useState('')
  const [emailFocus,   setEmailFocus]   = useState(false)
  const [password,     setPassword]     = useState('')
  const [pwErr,        setPwErr]        = useState('')
  const [pwFocus,      setPwFocus]      = useState(false)
  const [showPw,       setShowPw]       = useState(false)
  const [displayName,  setDisplayName]  = useState('')
  const [displayErr,   setDisplayErr]   = useState('')
  const [displayFocus, setDisplayFocus] = useState(false)
  const [topErr,       setTopErr]       = useState('')

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
    previewBg:    isDark ? 'rgb(var(--c-primary-rgb) / 0.06)' : 'rgb(var(--c-primary-rgb) / 0.04)',
    previewBorder:isDark ? 'rgb(var(--c-primary-rgb) / 0.20)' : 'rgb(var(--c-primary-rgb) / 0.16)',
  }

  const inputStyle = (focused: boolean, err: boolean): React.CSSProperties => ({
    width: '100%', height: 50, padding: '0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${err ? '#EF4444' : focused ? 'var(--c-primary)' : lv.inputBorder}`,
    borderRadius: 12,
    background: focused ? lv.inputBgFocus : lv.inputBg,
    color: t.text, outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : isDark ? '0 1px 2px rgba(0,0,0,0.30)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  const ctaStyle = (dis: boolean): React.CSSProperties => ({
    width: '100%', height: 50, borderRadius: 12, border: 'none',
    background: dis ? 'rgb(var(--c-primary-rgb) / 0.48)' : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: 'inherit', cursor: dis ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: dis ? 'none' : '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
    letterSpacing: '0.01em',
    transition: 'background 0.2s',
  })

  // ── Step 1: lookup ──────────────────────────────────────────────────────────
  const handleLookup = async () => {
    const code = token.trim()
    if (!code) { setTokenErr(c.errToken); return }
    setTokenErr(''); setLoading(true)
    try {
      const result = await api.invite.lookup(code)
      setPreview(result)
      setDisplayName(result.full_name)   // pre-fill display name for new users
      setLoading(false)
      setStep('preview')
    } catch (err) {
      setLoading(false)
      setTokenErr((err as Error).message || c.errNetwork)
    }
  }

  // ── Step 2: claim (authed flow) ─────────────────────────────────────────────
  const handleClaimAuthed = async () => {
    setLoading(true); setTopErr('')
    try {
      const result = await api.invite.claim(token.trim())
      setToken(result.token)             // refreshed JWT scoped to new family
      router.push('/graph')
    } catch (err) {
      setLoading(false)
      setTopErr((err as Error).message || c.errNetwork)
    }
  }

  // ── Step 2: signup + claim (anon flow) ──────────────────────────────────────
  const handleSignupAndClaim = async () => {
    const e  = email.trim()
    const dn = displayName.trim()

    let ok = true
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setEmailErr(c.errEmail); ok = false }
    else setEmailErr('')
    if (password.length < 8) { setPwErr(c.errPwLen); ok = false } else setPwErr('')
    if (!dn) { setDisplayErr(c.errDisplay); ok = false } else setDisplayErr('')
    if (!ok) return

    setLoading(true); setTopErr('')
    try {
      const { token: jwt } = await api.invite.signupAndClaim({
        email: e, password, display_name: dn, invite_token: token.trim(),
      })
      setToken(jwt)
      router.push('/graph')
    } catch (err) {
      setLoading(false)
      setTopErr((err as Error).message || c.errNetwork)
    }
  }

  // ── Right-panel preview: show the looked-up person once we have one ────────
  const previewData: AuthPolaroidData | null = step === 'preview' && preview
    ? {
        fullName:  preview.full_name,
        birthYear: preview.birth_year,
        photoUrl:  preview.photo_url,
        nodeState: 'proxy',
        subtitle:  c.claimable,
        pill:      preview.inviter_full_name
          ? `${c.invitedBy} ${preview.inviter_full_name}`
          : c.claimable,
      }
    : null

  return (
    <AuthLayout lang={lang} onLangChange={setLang} preview={previewData}>

      {/* ── Headline ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lang + step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {step === 'token' ? (
            <>
              <motion.h1
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.50, ease: EASE }}
                style={{
                  margin: '0 0 14px', lineHeight: 1.06,
                  fontSize: lang === 'hi' ? (isMobile ? 32 : 44) : (isMobile ? 36 : 52),
                  fontWeight: 800, letterSpacing: '-0.03em',
                  color: t.text, transition: 'color 0.35s ease',
                }}
              >
                {lang === 'en' ? (
                  <>You&apos;re{' '}<span style={{ color: 'var(--c-primary)' }}>invited.</span></>
                ) : (
                  <span style={{ color: 'var(--c-primary)' }}>{c.headline}</span>
                )}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.30, duration: 0.40, ease: EASE }}
                style={{ margin: '0 0 36px', fontSize: 15.5, color: t.textMuted, lineHeight: 1.65, transition: 'color 0.35s ease' }}
              >
                {c.sub}
              </motion.p>
            </>
          ) : (
            <>
              <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: EASE }}
                style={{ margin: '0 0 10px', fontSize: isMobile ? 28 : 38, fontWeight: 800, letterSpacing: '-0.03em', color: t.text, lineHeight: 1.1, transition: 'color 0.35s ease' }}
              >
                {c.previewTitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.38, ease: EASE }}
                style={{ margin: '0 0 28px', fontSize: 14.5, color: t.textMuted, lineHeight: 1.6, transition: 'color 0.35s ease' }}
              >
                {c.previewSub}
              </motion.p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Form card ─────────────────────────────────────────────────── */}
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
        <AnimatePresence mode="wait">

          {/* ── Step 1: token ──────────────────────────────────────── */}
          {step === 'token' && (
            <motion.div key="token"
              initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.tokenLabel}
                </label>
                <input
                  value={token}
                  onChange={e => { setToken_(e.target.value); setTokenErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  placeholder={c.tokenPh}
                  autoComplete="off"
                  autoFocus={!token}
                  style={{ ...inputStyle(focus, !!tokenErr), letterSpacing: token ? '0.06em' : 0 }}
                />
                <AnimatePresence>
                  {tokenErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {tokenErr}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={handleLookup} disabled={loading}
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

          {/* ── Step 2: preview + claim ─────────────────────────────── */}
          {step === 'preview' && preview && (
            <motion.div key="preview"
              initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}>

              {/* Preview card */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: 14, marginBottom: 18,
                background: lv.previewBg, border: `1px solid ${lv.previewBorder}`,
              }}>
                {preview.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.photo_url} alt={preview.full_name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 22, fontWeight: 800,
                  }}>
                    {preview.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 2 }}>
                    {preview.full_name}
                  </div>
                  {preview.birth_year && (
                    <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.4 }}>
                      {c.born} {preview.birth_year}
                    </div>
                  )}
                  {preview.inviter_full_name && (
                    <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5, marginTop: 6 }}>
                      <div>
                        {c.invitedBy} <span style={{ fontWeight: 600, color: 'var(--c-primary)' }}>{preview.inviter_full_name}</span>
                      </div>
                      {inviterMetaLine(preview) && (
                        <div style={{ fontSize: 11.5, marginTop: 2 }}>
                          {inviterMetaLine(preview)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Authed path — single CTA */}
              {authed && (
                <>
                  <motion.button
                    onClick={handleClaimAuthed} disabled={loading}
                    whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    style={{ ...ctaStyle(loading), marginBottom: 12 }}
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                        <IconLoader2 size={18} />
                      </motion.div>
                    ) : (
                      <>
                        <IconUserCheck size={17} />
                        <AnimatePresence mode="wait">
                          <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                            {c.claimAuthed}
                          </motion.span>
                        </AnimatePresence>
                      </>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {topErr && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: '0 0 10px', fontSize: 12, color: '#EF4444' }}>
                        {topErr}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Anon path — collect email/pw/display_name then signup-and-claim */}
              {!authed && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                      {c.displayLabel}
                    </label>
                    <input
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setDisplayErr('') }}
                      onFocus={() => setDisplayFocus(true)}
                      onBlur={() => setDisplayFocus(false)}
                      placeholder={c.displayPh}
                      style={inputStyle(displayFocus, !!displayErr)}
                    />
                    <AnimatePresence>
                      {displayErr && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                          {displayErr}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                      {c.emailLabel}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                      onFocus={() => setEmailFocus(true)}
                      onBlur={() => setEmailFocus(false)}
                      placeholder={c.emailPh}
                      autoComplete="email"
                      style={inputStyle(emailFocus, !!emailErr)}
                    />
                    <AnimatePresence>
                      {emailErr && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                          {emailErr}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                      {c.pwLabel}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPwErr('') }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSignupAndClaim() }}
                        onFocus={() => setPwFocus(true)}
                        onBlur={() => setPwFocus(false)}
                        placeholder={c.pwPh}
                        autoComplete="new-password"
                        style={{ ...inputStyle(pwFocus, !!pwErr), paddingRight: 48 }}
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
                  </div>

                  <AnimatePresence>
                    {topErr && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: '0 0 10px', fontSize: 12, color: '#EF4444' }}>
                        {topErr}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={handleSignupAndClaim} disabled={loading}
                    whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    style={{ ...ctaStyle(loading), marginBottom: 12 }}
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                        <IconLoader2 size={18} />
                      </motion.div>
                    ) : (
                      <>
                        <IconUserCheck size={17} />
                        <AnimatePresence mode="wait">
                          <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                            {c.claim}
                          </motion.span>
                        </AnimatePresence>
                      </>
                    )}
                  </motion.button>
                </>
              )}

              {/* Back / not-me */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button
                  onClick={() => { setStep('token'); setPreview(null); setTopErr('') }}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 13, color: t.textMuted, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}
                >
                  <IconArrowLeft size={13} />
                  {c.back}
                </button>
                <button
                  onClick={() => { setStep('token'); setToken_(''); setPreview(null); setTopErr('') }}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 12.5, color: 'var(--c-primary)', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
                >
                  {c.notMe}
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* ── Footer links ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.88, duration: 0.4 }}
        style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      >
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: t.textMuted, transition: 'color 0.35s ease' }}>
          <AnimatePresence mode="wait">
            <motion.span key={lang + 'acct'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
              {c.haveAcct}{' '}
              <a href="/login" style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'none' }}>{c.signin}</a>
            </motion.span>
          </AnimatePresence>
        </p>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: t.textMuted, transition: 'color 0.35s ease' }}>
          <AnimatePresence mode="wait">
            <motion.span key={lang + 'new'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
              {c.newHere}{' '}
              <a href="/signup" style={{ color: 'var(--c-primary)', fontWeight: 700, textDecoration: 'none' }}>{c.signup}</a>
            </motion.span>
          </AnimatePresence>
        </p>
      </motion.div>

    </AuthLayout>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteInner />
    </Suspense>
  )
}
