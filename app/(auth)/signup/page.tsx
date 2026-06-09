'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconLoader2, IconArrowLeft, IconEye, IconEyeOff, IconCamera, IconX } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import AuthLayout, { type AuthLang } from '@/components/auth/AuthLayout'
import { api, setToken } from '@/lib/api'
import { compressPhoto } from '@/lib/image'
import type { AuthPolaroidData } from '@/components/auth/AuthPolaroid'
import familyOptions from '@/lib/familyOptions.json'

const GOTRAS   = familyOptions.gotras.map(g => g.name)
const VILLAGES = familyOptions.villages

// Capitalise the first letter of each word (for custom "Other" entries).
const toTitleCase = (s: string) => s.replace(/\b\w/g, ch => ch.toUpperCase())

// Sentinel value used by the chip selectors for the free-text "Other" option.
const OTHER = '__other__'

// ── Bilingual copy ────────────────────────────────────────────────────────────
const COPY = {
  en: {
    lines:        ['Join', 'Ancestree.'],
    accentLine:   1,
    sub:          'Create your account in 30 seconds.',

    emailLabel:   'Email address',
    emailPh:      'you@example.com',
    continue:     'Continue',

    pwTitle:      'Set a password',
    pwSub:        'Use 8 or more characters.',
    pwLabel:      'Password',
    pwPh:         'At least 8 characters',
    pwConfirmLbl: 'Confirm password',
    pwConfirmPh:  'Re-enter password',
    next:         'Next',

    detailsTitle: 'A bit about you',
    detailsSub:   'This becomes your node in the tree.',
    photoAdd:     'Add photo',
    photoChange:  'Change',
    photoRemove:  'Remove',
    nameLabel:    'Full name',
    namePh:       'e.g. Rahul Khandelwal',
    genderLabel:  'Gender',
    genderM:      'Male',
    genderF:      'Female',
    genderO:      'Other',
    yearLabel:    'Birth year',
    yearPh:       'e.g. 1998',
    gotraLabel:   'Gotra',
    gotraOtherPh: 'Type your gotra',
    villageLabel: 'Native village (optional)',
    villageOtherPh: 'Type your village',
    other:        'Other',
    create:       'Create account',

    haveAcct:     'Already have an account?',
    signin:       'Sign in',
    back:         'Back',

    errEmail:     'Enter a valid email address',
    errExists:    'An account with this email already exists.',
    errPwLen:     'Password must be at least 8 characters',
    errPwMatch:   'Passwords do not match',
    errName:      'Please enter your full name',
    errYear:      'Enter a valid year between 1900 and today',
    errGotra:     'Please select or enter your gotra',
    errNetwork:   'Could not reach the server. Please try again.',
    signinCta:    'Sign in instead',
    yourNode:     'Your node',
    you:          'You',
    errPhoto:     'Could not read that image',
  },
  hi: {
    lines:        ['Ancestree', 'से जुड़ें।'],
    accentLine:   0,
    sub:          '30 सेकंड में खाता बनाएँ।',

    emailLabel:   'ईमेल पता',
    emailPh:      'aap@example.com',
    continue:     'आगे बढ़ें',

    pwTitle:      'पासवर्ड सेट करें',
    pwSub:        'कम से कम 8 अक्षर रखें।',
    pwLabel:      'पासवर्ड',
    pwPh:         'कम से कम 8 अक्षर',
    pwConfirmLbl: 'पासवर्ड दोहराएँ',
    pwConfirmPh:  'फिर से दर्ज करें',
    next:         'आगे',

    detailsTitle: 'अपने बारे में बताएँ',
    detailsSub:   'यह पेड़ में आपका नोड बनेगा।',
    photoAdd:     'फ़ोटो जोड़ें',
    photoChange:  'बदलें',
    photoRemove:  'हटाएँ',
    nameLabel:    'पूरा नाम',
    namePh:       'जैसे राहुल खंडेलवाल',
    genderLabel:  'लिंग',
    genderM:      'पुरुष',
    genderF:      'महिला',
    genderO:      'अन्य',
    yearLabel:    'जन्म वर्ष',
    yearPh:       'जैसे 1998',
    gotraLabel:   'गोत्र',
    gotraOtherPh: 'अपना गोत्र लिखें',
    villageLabel: 'मूल गाँव (वैकल्पिक)',
    villageOtherPh: 'अपना गाँव लिखें',
    other:        'अन्य',
    create:       'खाता बनाएँ',

    haveAcct:     'पहले से खाता है?',
    signin:       'साइन इन',
    back:         'वापस',

    errEmail:     'एक वैध ईमेल दर्ज करें',
    errExists:    'इस ईमेल से पहले से एक खाता है।',
    errPwLen:     'पासवर्ड कम से कम 8 अक्षर का होना चाहिए',
    errPwMatch:   'पासवर्ड मेल नहीं खाते',
    errName:      'कृपया अपना पूरा नाम दर्ज करें',
    errYear:      '1900 और आज के बीच एक वैध वर्ष दर्ज करें',
    errGotra:     'कृपया अपना गोत्र चुनें या लिखें',
    errNetwork:   'सर्वर तक नहीं पहुँच सका। पुनः प्रयास करें।',
    signinCta:    'साइन इन करें',
    yourNode:     'आपका नोड',
    you:          'आप',
    errPhoto:     'यह छवि पढ़ नहीं सके',
  },
} as const

type Step = 'email' | 'password' | 'details'
const EASE = [0.22, 1, 0.36, 1] as const

const stepVariants = {
  enter:  (d: number) => ({ x: d * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -28, opacity: 0 }),
}

// Wrapping pill selector (gotra / village). An extra "Other" pill lets the user
// switch to a free-text entry handled by the parent.
function Chips({ options, value, onChange, otherLabel, isDark }: {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  otherLabel: string
  isDark: boolean
}) {
  const t = getTheme(isDark)
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'
  const inputBg     = isDark ? '#141210' : '#FDFAF6'

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[...options, OTHER].map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? '' : opt)}
            style={{
              height: 38, padding: '0 14px', borderRadius: 10,
              border: `1.5px solid ${active ? '#EA580C' : inputBorder}`,
              background: active ? 'rgba(234,88,12,0.10)' : inputBg,
              color: active ? '#EA580C' : t.text,
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              boxShadow: active ? '0 0 0 3px rgba(234,88,12,0.10)' : 'none',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s',
            }}
          >
            {opt === OTHER ? otherLabel : opt}
          </button>
        )
      })}
    </div>
  )
}

function SignupInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()

  const [lang,        setLang]        = useState<AuthLang>('en')
  const [[step, dir], setStepDir]     = useState<[Step, number]>(['email', 1])

  // Step 1 — email
  const [email,       setEmail]       = useState(search.get('email') ?? '')
  const [emailErr,    setEmailErr]    = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [emailFocus,  setEmailFocus]  = useState(false)

  // Step 2 — password
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [pwErr,       setPwErr]       = useState('')
  const [pwFocus,     setPwFocus]     = useState(false)
  const [pw2Focus,    setPw2Focus]    = useState(false)
  const [showPw,      setShowPw]      = useState(false)

  // Step 3 — details
  const [fullName,    setFullName]    = useState('')
  const [gender,      setGender]      = useState<'male' | 'female' | 'other' | ''>('')
  const [birthYear,   setBirthYear]   = useState('')
  const [gotraSel,    setGotraSel]    = useState('')   // a gotra name, OTHER, or ''
  const [gotraOther,  setGotraOther]  = useState('')
  const [gotraErr,    setGotraErr]    = useState('')
  const [gotraFocus,  setGotraFocus]  = useState(false)
  const [villageSel,  setVillageSel]  = useState('')   // a village name, OTHER, or ''
  const [villageOther,setVillageOther]= useState('')
  const [villageFocus,setVillageFocus]= useState(false)
  const [photoUrl,    setPhotoUrl]    = useState<string | null>(null)
  const [photoErr,    setPhotoErr]    = useState('')
  const [nameErr,     setNameErr]     = useState('')
  const [yearErr,     setYearErr]     = useState('')
  const [nameFocus,   setNameFocus]   = useState(false)
  const [yearFocus,   setYearFocus]   = useState(false)
  const fileRef       = useRef<HTMLInputElement>(null)

  const [loading,     setLoading]     = useState(false)
  const [topErr,      setTopErr]      = useState('')

  const t = getTheme(isDark)
  const c = COPY[lang]

  const lv = {
    cardBg:     isDark ? '#1C1A12' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(234,88,12,0.11)',
    cardShadow: isDark
      ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 4px rgba(0,0,0,0.30), 0 8px 28px rgba(0,0,0,0.45)'
      : '0 1px 0 rgba(255,255,255,0.85) inset, 0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.08), 0 28px 64px rgba(234,88,12,0.06)',
    inputBg:      isDark ? '#141210' : '#FDFAF6',
    inputBgFocus: isDark ? '#1C1A12' : '#FFFFFF',
    inputBorder:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
  }

  const inputStyle = (focused: boolean, err: boolean): React.CSSProperties => ({
    width: '100%', height: 50, padding: '0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${err ? '#EF4444' : focused ? '#EA580C' : lv.inputBorder}`,
    borderRadius: 12,
    background: focused ? lv.inputBgFocus : lv.inputBg,
    color: t.text, outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused ? '0 0 0 3.5px rgba(234,88,12,0.11)' : isDark ? '0 1px 2px rgba(0,0,0,0.30)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  const ctaStyle = (dis: boolean): React.CSSProperties => ({
    width: '100%', height: 50, borderRadius: 12, border: 'none',
    background: dis ? 'rgba(234,88,12,0.48)' : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: 'inherit', cursor: dis ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: dis ? 'none' : '0 3px 14px rgba(234,88,12,0.40)',
    letterSpacing: '0.01em',
    transition: 'background 0.2s',
  })

  // ── Step 1: email ───────────────────────────────────────────────────────────
  const handleEmailContinue = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailErr(c.errEmail); return
    }
    setEmailErr(''); setEmailExists(false); setLoading(true)
    try {
      const { exists } = await api.auth.checkEmail(trimmed)
      if (exists) {
        setEmailExists(true)
        setEmailErr(c.errExists)
        setLoading(false)
        return
      }
      setLoading(false)
      setStepDir(['password', 1])
    } catch (err) {
      setLoading(false)
      setEmailErr((err as Error).message || c.errNetwork)
    }
  }

  // ── Step 2: password ────────────────────────────────────────────────────────
  const handlePasswordNext = () => {
    if (password.length < 8) { setPwErr(c.errPwLen); return }
    if (password !== confirm) { setPwErr(c.errPwMatch); return }
    setPwErr('')
    setStepDir(['details', 1])
  }

  // ── Step 3: details + final submit ──────────────────────────────────────────
  // Resolved free-text values for the chip selectors.
  const finalGotra   = gotraSel === OTHER   ? toTitleCase(gotraOther.trim())   : gotraSel
  const finalVillage = villageSel === OTHER ? toTitleCase(villageOther.trim()) : villageSel

  const handleCreate = async () => {
    const name = fullName.trim()
    if (!name) { setNameErr(c.errName); return }
    setNameErr('')

    // Gotra is required.
    if (!finalGotra) { setGotraErr(c.errGotra); return }
    setGotraErr('')

    let yearNum: number | undefined
    if (birthYear.trim()) {
      const n = Number(birthYear)
      const currentYear = new Date().getFullYear()
      if (!Number.isInteger(n) || n < 1900 || n > currentYear) {
        setYearErr(c.errYear); return
      }
      yearNum = n
    }
    setYearErr('')

    setLoading(true); setTopErr('')
    try {
      const { token, user } = await api.auth.signup({
        email: email.trim(),
        password,
        display_name: name,
      })
      setToken(token)

      // Patch extras onto the auto-created self-person node if user filled them.
      const extras: Record<string, unknown> = {}
      if (gender)          extras.gender          = gender
      if (yearNum != null) extras.birth_year      = yearNum
      if (finalGotra)      extras.gotra           = finalGotra
      if (finalVillage)    extras.native_village  = finalVillage
      if (photoUrl)        extras.photo_url       = photoUrl

      if (Object.keys(extras).length > 0 && user.person_id) {
        try { await api.persons.update(user.person_id, extras) } catch { /* non-fatal */ }
      }

      router.push('/graph')
    } catch (err) {
      setLoading(false)
      setTopErr((err as Error).message || c.errNetwork)
    }
  }

  const goBack = () => {
    setTopErr('')
    if (step === 'password') setStepDir(['email',    -1])
    if (step === 'details')  setStepDir(['password', -1])
  }

  const handlePhotoSelect = async (file: File | undefined) => {
    if (!file) return
    setPhotoErr('')
    try {
      const dataUrl = await compressPhoto(file)
      setPhotoUrl(dataUrl)
    } catch {
      setPhotoErr(c.errPhoto)
    }
  }

  // ── Right-panel preview ────────────────────────────────────────────────────
  const preview: AuthPolaroidData | null =
    step === 'password' ? {
      fullName: '', isSelf: true, subtitle: c.yourNode,
    } :
    step === 'details' ? {
      fullName,
      gender:    gender || undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      photoUrl:  photoUrl,
      isSelf:    true,
      subtitle:  c.you,
    } :
    null

  return (
    <AuthLayout lang={lang} onLangChange={setLang} preview={preview}>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lang + step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {step === 'email' && (
            <>
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
                          color: li === c.accentLine ? '#EA580C' : t.text,
                          transition: 'color 0.35s ease',
                        }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </div>
                ))}
              </h1>
              <p style={{ margin: isMobile ? '0 0 24px' : '0 0 36px', fontSize: isMobile ? 14.5 : 15.5, color: t.textMuted, lineHeight: 1.65, transition: 'color 0.35s ease' }}>
                {c.sub}
              </p>
            </>
          )}

          {step === 'password' && (
            <>
              <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: EASE }}
                style={{ margin: '0 0 10px', fontSize: isMobile ? 28 : 38, fontWeight: 800, letterSpacing: '-0.03em', color: t.text, lineHeight: 1.1, transition: 'color 0.35s ease' }}
              >
                {c.pwTitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.38, ease: EASE }}
                style={{ margin: isMobile ? '0 0 22px' : '0 0 32px', fontSize: 14.5, color: t.textMuted, lineHeight: 1.6, transition: 'color 0.35s ease' }}
              >
                {c.pwSub}
              </motion.p>
            </>
          )}

          {step === 'details' && (
            <>
              <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: EASE }}
                style={{ margin: '0 0 10px', fontSize: isMobile ? 28 : 38, fontWeight: 800, letterSpacing: '-0.03em', color: t.text, lineHeight: 1.1, transition: 'color 0.35s ease' }}
              >
                {c.detailsTitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.38, ease: EASE }}
                style={{ margin: isMobile ? '0 0 22px' : '0 0 32px', fontSize: 14.5, color: t.textMuted, lineHeight: 1.6, transition: 'color 0.35s ease' }}
              >
                {c.detailsSub}
              </motion.p>
            </>
          )}
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

          {/* ── Step 1: Email ──────────────────────────────────────────── */}
          {step === 'email' && (
            <motion.div key="email" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.emailLabel}
                </label>
                <input
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); setEmailExists(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleEmailContinue() }}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder={c.emailPh}
                  autoComplete="email"
                  autoFocus
                  style={inputStyle(emailFocus, !!emailErr)}
                />
                <AnimatePresence>
                  {emailErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {emailErr}
                      {emailExists && (
                        <>
                          {' '}
                          <a
                            href={`/login?email=${encodeURIComponent(email.trim())}`}
                            style={{ color: '#EA580C', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {c.signinCta}
                          </a>
                        </>
                      )}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={handleEmailContinue} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgba(234,88,12,0.44)' } : {}}
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

          {/* ── Step 2: Password ──────────────────────────────────────── */}
          {step === 'password' && (
            <motion.div key="password" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              {/* Email pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '9px 13px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}` }}>
                <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{email}</span>
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#EA580C', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
                  {c.back}
                </button>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.pwLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwErr('') }}
                    onKeyDown={e => { if (e.key === 'Enter') document.getElementById('signup-pw2')?.focus() }}
                    onFocus={() => setPwFocus(true)}
                    onBlur={() => setPwFocus(false)}
                    placeholder={c.pwPh}
                    autoComplete="new-password"
                    autoFocus
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
              </div>

              {/* Confirm */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.pwConfirmLbl}
                </label>
                <input
                  id="signup-pw2"
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setPwErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handlePasswordNext() }}
                  onFocus={() => setPw2Focus(true)}
                  onBlur={() => setPw2Focus(false)}
                  placeholder={c.pwConfirmPh}
                  autoComplete="new-password"
                  style={inputStyle(pw2Focus, !!pwErr)}
                />
                <AnimatePresence>
                  {pwErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {pwErr}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={handlePasswordNext} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgba(234,88,12,0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={ctaStyle(loading)}
              >
                <AnimatePresence mode="wait">
                  <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                    {c.next}
                  </motion.span>
                </AnimatePresence>
                <IconArrowRight size={16} strokeWidth={2.5} />
              </motion.button>

            </motion.div>
          )}

          {/* ── Step 3: Details ───────────────────────────────────────── */}
          {step === 'details' && (
            <motion.div key="details" custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.22, ease: EASE }}>

              {/* Photo picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: `1.5px dashed ${photoUrl ? 'transparent' : '#EA580C'}`,
                    background: photoUrl
                      ? 'transparent'
                      : isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.06)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', padding: 0, flexShrink: 0,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  title={photoUrl ? c.photoChange : c.photoAdd}
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <IconCamera size={22} color="#EA580C" strokeWidth={2} />
                  )}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: '#EA580C', fontWeight: 700, fontFamily: 'inherit', fontSize: 13.5, textAlign: 'left' }}
                  >
                    {photoUrl ? c.photoChange : c.photoAdd}
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => { setPhotoUrl(null); setPhotoErr('') }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: t.textMuted, fontFamily: 'inherit', fontSize: 12, textAlign: 'left',
                        display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <IconX size={11} /> {c.photoRemove}
                    </button>
                  )}
                  {photoErr && (
                    <span style={{ fontSize: 11, color: '#EF4444' }}>{photoErr}</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handlePhotoSelect(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Full name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.nameLabel}
                </label>
                <input
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); setNameErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setNameFocus(false)}
                  placeholder={c.namePh}
                  autoComplete="name"
                  autoFocus
                  style={inputStyle(nameFocus, !!nameErr)}
                />
                <AnimatePresence>
                  {nameErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {nameErr}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.genderLabel}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['male', c.genderM], ['female', c.genderF], ['other', c.genderO]] as const).map(([val, label]) => {
                    const active = gender === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGender(active ? '' : val)}
                        style={{
                          flex: 1, height: 44, borderRadius: 10,
                          border: `1.5px solid ${active ? '#EA580C' : lv.inputBorder}`,
                          background: active ? 'rgba(234,88,12,0.10)' : lv.inputBg,
                          color: active ? '#EA580C' : t.text,
                          fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                          cursor: 'pointer',
                          boxShadow: active ? '0 0 0 3.5px rgba(234,88,12,0.11)' : 'none',
                          transition: 'border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Birth year */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.yearLabel}
                </label>
                <input
                  value={birthYear}
                  onChange={e => { setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setYearErr('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                  onFocus={() => setYearFocus(true)}
                  onBlur={() => setYearFocus(false)}
                  placeholder={c.yearPh}
                  inputMode="numeric"
                  style={inputStyle(yearFocus, !!yearErr)}
                />
                <AnimatePresence>
                  {yearErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {yearErr}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Gotra (required) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.gotraLabel} <span style={{ color: '#EA580C' }}>*</span>
                </label>
                <Chips
                  options={GOTRAS}
                  value={gotraSel}
                  onChange={v => { setGotraSel(v); setGotraErr('') }}
                  otherLabel={c.other}
                  isDark={isDark}
                />
                {gotraSel === OTHER && (
                  <input
                    value={gotraOther}
                    onChange={e => { setGotraOther(toTitleCase(e.target.value)); setGotraErr('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                    onFocus={() => setGotraFocus(true)}
                    onBlur={() => setGotraFocus(false)}
                    placeholder={c.gotraOtherPh}
                    autoFocus
                    style={{ ...inputStyle(gotraFocus, !!gotraErr), marginTop: 8 }}
                  />
                )}
                <AnimatePresence>
                  {gotraErr && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ margin: '6px 0 0', fontSize: 11.5, color: '#EF4444' }}>
                      {gotraErr}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Native village (optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
                  {c.villageLabel}
                </label>
                <Chips
                  options={VILLAGES}
                  value={villageSel}
                  onChange={setVillageSel}
                  otherLabel={c.other}
                  isDark={isDark}
                />
                {villageSel === OTHER && (
                  <input
                    value={villageOther}
                    onChange={e => setVillageOther(toTitleCase(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                    onFocus={() => setVillageFocus(true)}
                    onBlur={() => setVillageFocus(false)}
                    placeholder={c.villageOtherPh}
                    autoFocus
                    style={{ ...inputStyle(villageFocus, false), marginTop: 8 }}
                  />
                )}
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
                onClick={handleCreate} disabled={loading}
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 6px 22px rgba(234,88,12,0.44)' } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                style={{ ...ctaStyle(loading), marginBottom: 12 }}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                    <IconLoader2 size={18} />
                  </motion.div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
                      {c.create}
                    </motion.span>
                  </AnimatePresence>
                )}
              </motion.button>

              <button
                onClick={goBack}
                disabled={loading}
                style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 13, color: t.textMuted, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}
              >
                <IconArrowLeft size={13} />
                {c.back}
              </button>

            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* ── Footer link ─────────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.88, duration: 0.4 }}
        style={{ textAlign: 'center', marginTop: 22, fontSize: 13.5, color: t.textMuted, transition: 'color 0.35s ease' }}
      >
        <AnimatePresence mode="wait">
          <motion.span key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
            {c.haveAcct}{' '}
            <a href="/login" style={{ color: '#EA580C', fontWeight: 700, textDecoration: 'none' }}>{c.signin}</a>
          </motion.span>
        </AnimatePresence>
      </motion.p>

    </AuthLayout>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  )
}
