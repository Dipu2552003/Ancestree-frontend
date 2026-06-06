import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className={inter.className}>
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
        <div className="min-h-screen" style={{ backgroundColor: '#FFF7ED' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
