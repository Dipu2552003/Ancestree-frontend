'use client'

import { useEffect } from 'react'

// The Khandelwal community site is a separate Vite SPA that shares this origin
// via a reverse proxy (see the parivar app's vercel.json / vite proxy). Opening
// a tree boots THIS Next app's router on the shared origin, so a later client
// navigation back to /parivar (e.g. the browser Back button) is handled here and
// 404s — Next doesn't own /parivar. A full reload lets the proxy/rewrite serve
// the community SPA instead. Guarded by a short-lived timestamp so it can never
// loop (a reload of /parivar is served by the SPA, not Next, so it won't recur).
const SIBLING_PREFIX = '/parivar'
const RELOAD_KEY = 'parivar-reload-at'

export default function NotFound() {
  useEffect(() => {
    const path = window.location.pathname
    const isSibling = path === SIBLING_PREFIX || path.startsWith(SIBLING_PREFIX + '/')
    if (!isSibling) return
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last > 4000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: 'system-ui, sans-serif', background: '#FFF7ED', color: '#1A0A00',
    }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>This page could not be found.</h1>
      <a href="/graph" style={{ color: '#EA580C', fontWeight: 600 }}>Go to your tree</a>
    </div>
  )
}
