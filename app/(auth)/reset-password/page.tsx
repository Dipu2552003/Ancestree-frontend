'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconLoader2, IconEye, IconEyeOff, IconArrowRight, IconCheck } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import AuthLayout, { type AuthLang } from '@/components/auth/AuthLayout'
import { api } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1] as const

const COPY = {
  en: {
    lines:     ['Set a new', 'password.'],
    sub:       'Pick something memorable and at least 8 characters long.',
    newLabel:  'New password',
    newPh:     'At least 8 characters',
    confLabel: 'Confirm new password',
    confPh:    'Re-enter new password',
    submit:    'Save new password',
    backLogin: '← Back to sign in',
    successTitle: 'Password updated',
    successSub:   'You can sign in with your new password now.',
    signin:    'Sign in',
    errShort:   'Must be at least 8 characters',
    errMatch:   "Passwords don't match",
    errMissing: 'This reset link is missing its token. Request a new one from the sign-in page.',
    errNetwork: 'Could not reach the server. Please try again.',
  },
  hi: {
    lines:     ['नया पासवर्ड', 'सेट करें।'],
    sub:       'कुछ यादगार चुनें — कम से कम 8 अक्षरों का।',
    newLabel:  'नया पासवर्ड',
    newPh:     'कम से कम 8 अक्षर',
    confLabel: 'नया पासवर्ड पुष्टि करें',
    confPh:    'पासवर्ड फिर से दर्ज करें',
    submit:    'नया पासवर्ड सहेजें',
    backLogin: '← साइन इन पर वापस',
    successTitle: 'पासवर्ड अपडेट हो गया',
    successSub:   'अब आप अपने नए पासवर्ड से साइन इन कर सकते हैं।',
    signin:    'साइन इन',
    errShort:   'कम से कम 8 अक्षर होने चाहिए',
    errMatch:   'पासवर्ड मेल नहीं खाते',
    errMissing: 'इस लिंक में टोकन नहीं है। साइन-इन पेज से नया अनुरोध करें।',
    errNetwork: 'सर्वर तक नहीं पहुँच सका। पुनः प्रयास करें।',
  },
} as const

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const [lang, setLang] = useState<AuthLang>('en')
  const c = COPY[lang]

  const [next,        setNext]        = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showNext,    setShowNext]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [nextFocus,    setNextFocus]    = useState(false)
  const [confirmFocus, setConfirmFocus] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  const tooShort = next.length > 0 && next.length < 8
  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const isValid  = !!token && next.length >= 8 && next === confirm

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

  const inputStyle = (focused: boolean, hasError: boolean) => ({
    width: '100%', height: 50, padding: '0 48px 0 16px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${hasError ? '#EF4444' : focused ? 'var(--c-primary)' : lv.inputBorder}`,
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

  const submit = async () => {
    if (!isValid || loading) return
    setLoading(true); setError('')
    try {
      await api.auth.resetPassword({ token, new_password: next })
      setDone(true)
    } catch (err) {
      setError((err as Error).message || c.errNetwork)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout lang={lang} onLangChange={setLang} preview={null}>

      <AnimatePresence mode="wait">
        <motion.div
          key={lang}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                      fontSize: lang === 'hi' ? 46 : 52, fontWeight: 800, letterSpacing: '-0.03em',
                      color: li === 1 ? 'var(--c-primary)' : t.text,
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
            transition={{ delay: 0.40, duration: 0.40, ease: EASE }}
            style={{ margin: '0 0 36px', fontSize: 15.5, color: t.textMuted, lineHeight: 1.65, fontWeight: 400 }}
          >
            {c.sub}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.36, duration: 0.60, type: 'spring', stiffness: 255, damping: 24 }}
        style={{
          background: lv.cardBg, borderRadius: 20, padding: '30px 28px 26px',
          border: `1px solid ${lv.cardBorder}`, boxShadow: lv.cardShadow,
        }}
      >
        {!token ? (
          <p style={{ margin: 0, fontSize: 13.5, color: '#EF4444', lineHeight: 1.6 }}>
            {c.errMissing}
          </p>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 22px rgba(22,163,74,0.40)',
            }}>
              <IconCheck size={26} strokeWidth={2.5} color="#fff" />
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>
              {c.successTitle}
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: t.textMuted, lineHeight: 1.6 }}>
              {c.successSub}
            </p>
            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' }}
              whileTap={{ scale: 0.985 }}
              style={ctaStyle(false)}
            >
              {c.signin}
              <IconArrowRight size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                {c.newLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={e => { setNext(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') { if (next && confirm) submit(); else (document.querySelector('input[autocomplete=new-password][data-confirm]') as HTMLInputElement)?.focus() } }}
                  onFocus={() => setNextFocus(true)}
                  onBlur={() => setNextFocus(false)}
                  placeholder={c.newPh}
                  autoComplete="new-password"
                  autoFocus
                  style={inputStyle(nextFocus, tooShort)}
                />
                <button type="button" onClick={() => setShowNext(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 0 }}>
                  {showNext ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
              {tooShort && (
                <p style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>{c.errShort}</p>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }}>
                {c.confLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  data-confirm
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') submit() }}
                  onFocus={() => setConfirmFocus(true)}
                  onBlur={() => setConfirmFocus(false)}
                  placeholder={c.confPh}
                  autoComplete="new-password"
                  style={inputStyle(confirmFocus, mismatch)}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 0 }}>
                  {showConfirm ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
              {mismatch && (
                <p style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>{c.errMatch}</p>
              )}
            </div>

            {error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#EF4444', lineHeight: 1.5 }}>{error}</p>
            )}

            <motion.button
              onClick={submit} disabled={!isValid || loading}
              whileHover={isValid && !loading ? { scale: 1.015, boxShadow: '0 6px 22px rgb(var(--c-primary-rgb) / 0.44)' } : {}}
              whileTap={isValid && !loading ? { scale: 0.985 } : {}}
              style={ctaStyle(!isValid || loading)}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}>
                  <IconLoader2 size={18} />
                </motion.div>
              ) : (
                c.submit
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                marginTop: 14, width: '100%',
                background: 'none', border: 'none', padding: 0,
                fontSize: 13, fontWeight: 600, color: 'var(--c-primary)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {c.backLogin}
            </button>
          </>
        )}
      </motion.div>

    </AuthLayout>
  )
}
