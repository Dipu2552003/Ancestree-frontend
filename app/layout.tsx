import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
// Warm heritage serif, exposed as a CSS variable so individual pages (e.g. the
// landing page) can opt into it without changing the app-wide Inter default.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'Ancestree',
  description: 'A modern family tree & graph platform',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: the inline <head> script below sets data-dark on
    // <html> before hydration to avoid a dark-mode flash, so the server markup
    // (no data-dark) intentionally differs from the client. This suppresses the
    // mismatch warning for <html>'s own attributes only — not its subtree.
    <html lang="en" className={`${inter.className} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Runs synchronously before first paint — prevents dark-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = JSON.parse(localStorage.getItem('ancestree-ui') || '{}')
            if (s.state && s.state.isDark) {
              document.documentElement.setAttribute('data-dark', '1')
            }
          } catch(e) {}
        `}} />
      </head>
      <body>
        <div className="min-h-screen" style={{ backgroundColor: 'var(--c-page)' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
