'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  IconArrowLeft, IconEdit, IconPhone, IconBrandWhatsapp, IconMail, IconMapPin,
} from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Node } from '@xyflow/react'
import type { PersonData } from '@/types'
import { getTheme, type Theme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import { getInitials } from '@/lib/format/initials'

interface PersonProfileViewProps {
  node: Node
  /** True when viewing via ?perspective= — the "You"/relation-to-self labels
   *  are suppressed and relations are expressed against the anchor instead. */
  isPerspective?: boolean
  /** Display name of the perspective anchor, e.g. "Jonas2". */
  perspectiveName?: string
  onBack: () => void
  onEdit?: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const EASE = [0.25, 0.1, 0.25, 1] as const

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

function fmtDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PersonProfileView({ node, isPerspective = false, perspectiveName = '', onBack, onEdit }: PersonProfileViewProps) {
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const d = node.data as unknown as PersonData
  const {
    fullName, nickname, birthDate, birthYear, birthPlace, deathDate, deathYear,
    deathPlace, isDeceased, isSelf, isViewerNode, relationshipToSelf, photoUrl,
    photoThumbnailUrl, nodeState, gender, gotra, religion, bio,
    phone, whatsapp, email,
    currentAddress, currentCity, currentState, currentCountry, currentPincode,
    nativeVillage, nativeTehsil, nativeDistrict, nativeState, nativeCountry,
    occupation, occupationDetail, education,
  } = d

  // Move focus to the "Back" button after the entry animation settles.
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const id = setTimeout(() => backRef.current?.focus(), 300)
    return () => clearTimeout(id)
  }, [])

  // The "You" treatment (saffron self colour, "This is you", "You" pill) belongs
  // only to the logged-in user's node on their own home tree. In perspective mode
  // (?perspective=…) the centred person is a subject being *viewed* — never "You",
  // even if it happens to be the viewer's own node.
  const showYou = isViewerNode && !isPerspective
  // The anchor the perspective tree is centred on.
  const isAnchor = isPerspective && isSelf
  // Relations come back relative to the anchor in perspective mode, so we name
  // the anchor explicitly: "Jonas2's father" instead of an implied "your father".
  // The anchor itself has no meaningful relation (the backend returns "You"),
  // so it gets no relation label — the "Viewing" pill already conveys it.
  const relationLabel = relationshipToSelf && !isAnchor
    ? (isPerspective && perspectiveName
        ? `${perspectiveName}’s ${relationshipToSelf.toLowerCase()}`
        : relationshipToSelf)
    : ''

  // Avatar gradient (mirrors PersonNode state logic) — used for the initials fallback.
  let gFrom = '#C4A882', gTo = '#9A7B5A'
  if (showYou)                      { gFrom = 'var(--c-primary)'; gTo = 'var(--c-primary-strong)' }
  else if (isDeceased)              { gFrom = '#94A3B8'; gTo = '#64748B' }
  else if (nodeState === 'claimed') { gFrom = 'var(--c-primary-strong)'; gTo = 'var(--c-primary-deep)' }
  else if (nodeState === 'proxy')   { gFrom = 'var(--c-secondary)'; gTo = '#B45309' }

  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : '#B5956A'
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const accent   = 'var(--c-primary)'

  // nodeState pill copy. Home tree → "You" for your own node; perspective anchor
  // → "Viewing"; everyone else → their Ancestree status.
  const statePill = showYou
    ? { text: 'You', bg: 'var(--c-primary)', fg: '#fff' }
    : isAnchor
      ? { text: 'Viewing', bg: 'var(--c-primary)', fg: '#fff' }
      : nodeState === 'claimed'
        ? { text: 'On Ancestree', bg: isDark ? 'rgba(34,197,94,0.16)' : '#F0FDF4', fg: isDark ? '#4ADE80' : '#15803D' }
        : nodeState === 'invited'
          ? { text: 'Invite sent', bg: isDark ? 'rgba(234,179,8,0.16)' : '#FFFBEB', fg: isDark ? '#FCD34D' : '#B45309' }
          : { text: 'Not on Ancestree yet', bg: isDark ? 'rgba(255,255,255,0.06)' : '#F4F1EC', fg: t.textMuted }

  // ── Derived copy ──
  const subtitle = [showYou ? 'This is you' : relationLabel, occupation]
    .filter(Boolean).join('  ·  ')

  const vitals = birthYear
    ? isDeceased
      ? `${birthYear} – ${deathYear ?? '?'}${deathYear ? `  ·  lived ${deathYear - birthYear} years` : ''}`
      : `${birthYear} – present  ·  ${CURRENT_YEAR - birthYear} years old`
    : null

  const address = [currentAddress, currentCity, currentState, currentPincode, currentCountry]
    .filter(Boolean).join(', ')

  const contacts = [
    phone    && { icon: <IconPhone size={15} stroke={2.2} />,         text: phone,    href: `tel:${phone}` },
    whatsapp && { icon: <IconBrandWhatsapp size={15} stroke={2.2} />, text: whatsapp, href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` },
    email    && { icon: <IconMail size={15} stroke={2.2} />,          text: email,    href: `mailto:${email}` },
    address  && { icon: <IconMapPin size={15} stroke={2.2} />,        text: address },
  ].filter(Boolean) as { icon: ReactNode; text: string; href?: string }[]

  const born = [fmtDate(birthDate) ?? (birthYear ? String(birthYear) : null), birthPlace]
    .filter(Boolean).join('  ·  ')
  const passed = [fmtDate(deathDate) ?? (deathYear ? String(deathYear) : null), deathPlace]
    .filter(Boolean).join('  ·  ')

  const lifeRows = [
    born   && { label: 'Born',        value: born },
    isDeceased && passed && { label: 'Passed away', value: passed },
    { label: 'Status', value: isDeceased ? 'Deceased' : 'Alive' },
  ].filter(Boolean) as { label: string; value: string }[]

  const workRows = [
    occupation       && { label: 'Occupation', value: occupation },
    occupationDetail && { label: 'Works at',   value: occupationDetail },
    education        && { label: 'Education',  value: education },
  ].filter(Boolean) as { label: string; value: string }[]

  const identityRows = [
    // The anchor's relation to itself is meaningless — omit the row entirely.
    !isAnchor && { label: 'Relation', value: showYou ? 'You' : (relationLabel || '—') },
    nickname && { label: 'Nickname', value: nickname },
    gender   && { label: 'Gender',   value: cap(gender) },
    religion && { label: 'Religion', value: cap(religion) },
    gotra    && { label: 'Gotra',    value: gotra },
  ].filter(Boolean) as { label: string; value: string }[]

  const nativeRows = [
    nativeVillage  && { label: 'Village',  value: nativeVillage },
    nativeTehsil   && { label: 'Tehsil',   value: nativeTehsil },
    nativeDistrict && { label: 'District', value: nativeDistrict },
    nativeState    && { label: 'State',    value: nativeState },
    nativeCountry  && { label: 'Country',  value: nativeCountry },
  ].filter(Boolean) as { label: string; value: string }[]

  // ── Polaroid sizing — same proportions as the canvas node cards ──
  const polaroidW = isMobile ? 184 : 236
  const photoH    = Math.round(polaroidW * 1.12)
  const framePad  = isMobile ? 10 : 12
  const captionH  = isMobile ? 40 : 48
  const photoSrc  = photoUrl || photoThumbnailUrl
  const caption   = fullName.split(/\s+/)[0]

  const sections = [
    { title: 'Life', rows: lifeRows },
    workRows.length     > 0 && { title: 'Work & Education', rows: workRows },
    identityRows.length > 0 && { title: 'Identity',         rows: identityRows },
    nativeRows.length   > 0 && { title: 'Native Place',     rows: nativeRows },
  ].filter(Boolean) as { title: string; rows: { label: string; value: string }[] }[]

  return (
    <motion.div
      key="profile-view"
      initial={{ opacity: 0, filter: 'blur(24px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(18px)' }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.fullscreen,
        background: t.pageBg, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Back + Edit — sticky so they're always reachable while reading */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isMobile ? '12px 14px' : '16px 20px',
          pointerEvents: 'none',
        }}
      >
        <button ref={backRef} onClick={onBack} style={{ ...glassBtn(t, isDark, t.text), pointerEvents: 'auto' }}>
          <IconArrowLeft size={15} /> Back to tree
        </button>
        {onEdit && (
          <button onClick={onEdit} style={{ ...glassBtn(t, isDark, accent), pointerEvents: 'auto' }}>
            <IconEdit size={15} /> Edit
          </button>
        )}
      </motion.div>

      <div style={{
        maxWidth: 840, margin: '0 auto',
        padding: isMobile ? '8px 20px 56px' : '24px 32px 88px',
      }}>
        {/* ── Header: polaroid + identity ── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 24 : 48,
        }}>
          {/* Polaroid photo card — the same artifact as the node on the canvas */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: -2, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.12 }}
            whileHover={{ rotate: 0, scale: 1.02 }}
            style={{
              background: '#FFFFFF',
              padding: `${framePad}px ${framePad}px 0`,
              borderRadius: 4,
              boxShadow: '0 16px 44px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}
          >
            <div style={{ width: polaroidW, height: photoH, overflow: 'hidden', background: '#EDE6DC', position: 'relative' }}>
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoSrc} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: `linear-gradient(150deg, ${gFrom}, ${gTo})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: polaroidW * 0.3, fontWeight: 700, letterSpacing: '-0.02em',
                }}>
                  {getInitials(fullName)}
                </div>
              )}
              {isDeceased && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', mixBlendMode: 'multiply' }} />
              )}
            </div>
            {/* caption strip */}
            <div
              style={{
                height: captionH, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3A2A1A', fontSize: isMobile ? 14 : 15.5, fontWeight: 600, fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: polaroidW,
              }}
            >
              {caption}
            </div>
          </motion.div>

          {/* Name + vitals + contact */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-start',
            textAlign: isMobile ? 'center' : 'left',
          }}>
            <Reveal i={0}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? 'clamp(28px, 8.5vw, 36px)' : 'clamp(32px, 4.6vw, 44px)',
                  fontWeight: 900, color: t.text, lineHeight: 1.08, letterSpacing: '-0.02em',
                  overflowWrap: 'break-word',
                }}
              >
                {fullName}
              </h1>
            </Reveal>

            {nickname && (
              <Reveal i={1}>
                <div style={{
                  marginTop: 5, fontSize: isMobile ? 15 : 17, fontStyle: 'italic',
                  fontWeight: 600, color: t.textMuted,
                }}>
                  “{nickname}”
                </div>
              </Reveal>
            )}

            {subtitle && (
              <Reveal i={1}>
                <div style={{
                  marginTop: 9, fontSize: isMobile ? 14 : 15.5, fontWeight: 600,
                  color: isDark ? '#C4946A' : '#9A5B2C', letterSpacing: '0.01em',
                }}>
                  {subtitle}
                </div>
              </Reveal>
            )}

            {vitals && (
              <Reveal i={2}>
                <div style={{ marginTop: 7, fontSize: isMobile ? 12.5 : 13.5, color: t.textMuted }}>
                  {vitals}
                </div>
              </Reveal>
            )}

            <Reveal i={2}>
              <span style={{
                display: 'inline-block', marginTop: 14, padding: '5px 14px', borderRadius: 999,
                background: statePill.bg, color: statePill.fg,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {statePill.text}
              </span>
            </Reveal>

            {contacts.length > 0 && (
              <Reveal i={3}>
                <div style={{
                  marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9,
                  alignItems: isMobile ? 'center' : 'flex-start',
                }}>
                  {contacts.map(({ icon, text, href }) => {
                    const row = (
                      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
                        <span style={{ color: accent, flexShrink: 0, marginTop: 2 }}>{icon}</span>
                        <span style={{
                          fontSize: 13.5, fontWeight: 500, color: t.text,
                          lineHeight: 1.45, overflowWrap: 'anywhere',
                          textAlign: isMobile ? 'center' : 'left',
                        }}>
                          {text}
                        </span>
                      </span>
                    )
                    return href
                      ? <a key={text} href={href} style={{ textDecoration: 'none' }}>{row}</a>
                      : <div key={text}>{row}</div>
                  })}
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* ── About ── */}
        {bio && (
          <Reveal i={4}>
            <div style={{ marginTop: isMobile ? 36 : 52 }}>
              <SectionLabel text="About" color={labelCol} hairline={hairline} />
              <p style={{
                margin: 0, fontSize: isMobile ? 14 : 15, lineHeight: 1.7, color: t.text,
                whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
              }}>
                {bio}
              </p>
            </div>
          </Reveal>
        )}

        {/* ── Detail sections — two columns on desktop ── */}
        <div style={{
          marginTop: isMobile ? 36 : 52,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          columnGap: 56,
          rowGap: isMobile ? 32 : 40,
          alignItems: 'start',
        }}>
          {sections.map((s, i) => (
            <Reveal key={s.title} i={5 + i}>
              <section>
                <SectionLabel text={s.title} color={labelCol} hairline={hairline} />
                {s.rows.map((r) => (
                  <InfoRow key={r.label} label={r.label} value={r.value} t={t} labelCol={labelCol} hairline={hairline} />
                ))}
              </section>
            </Reveal>
          ))}
        </div>

        {/* Deceased memorial note */}
        {isDeceased && (
          <Reveal i={9}>
            <div style={{
              marginTop: isMobile ? 32 : 44, padding: '14px 18px', borderRadius: 12,
              background: isDark ? '#18100A' : '#FFF0E6',
              border: `1px solid ${isDark ? 'rgba(160,80,30,0.18)' : '#FDDCBC'}`,
              fontSize: 13, color: t.textMuted, fontStyle: 'italic',
              textAlign: 'center', letterSpacing: '0.01em',
            }}>
              In loving memory
            </div>
          </Reveal>
        )}
      </div>
    </motion.div>
  )
}

/* ── Pieces ── */

function Reveal({ i, children }: { i: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 + i * 0.06, duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ text, color, hairline }: { text: string; color: string; hairline: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color, flexShrink: 0,
      }}>
        {text}
      </span>
      <span style={{ height: 1, background: hairline, flex: 1 }} />
    </div>
  )
}

function InfoRow({ label, value, t, labelCol, hairline }: {
  label: string
  value: string
  t: Theme
  labelCol: string
  hairline: string
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 16, padding: '9px 0', borderBottom: `1px solid ${hairline}`,
    }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: labelCol, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13.5, fontWeight: 600, color: t.text,
        textAlign: 'right', overflowWrap: 'anywhere',
      }}>
        {value}
      </span>
    </div>
  )
}

function glassBtn(t: Theme, isDark: boolean, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 7,
    background: isDark ? 'rgba(10,8,6,0.55)' : 'rgba(255,251,244,0.78)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)'}`,
    borderRadius: 9, padding: '9px 15px',
    fontSize: 13, fontWeight: 600, color,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
  }
}
