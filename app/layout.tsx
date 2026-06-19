import type { Metadata, Viewport } from 'next'
import { Nunito, Baloo_2 } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import OfflineBanner from '@/components/OfflineBanner'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { UserProvider } from '@/components/UserContext'
import UserGuard from '@/components/UserGuard'
import TopBar from '@/components/TopBar'
import { ThemeProvider } from '@/components/ThemeContext'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
})

// Chunky rounded display face for the "Quest Arcade" look — characterful and
// game-like where Fredoka was softer/thinner.
const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
})

export const metadata: Metadata = {
  title: 'ReadQuest',
  description: 'Track your reading adventure!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ReadQuest',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF6B35',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${baloo.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen" style={{ fontFamily: 'var(--font-nunito), sans-serif' }}>
        {/* Set the saved theme before React hydrates so there's no flash of the
            wrong theme and no hydration mismatch on the <html> data-theme attr.
            next/script with beforeInteractive is injected into <head> and runs
            before hydration; rendering a raw <script> in the tree instead causes
            React hydration warnings and won't execute on the client. */}
        <Script id="rq-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('rq_theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <UserProvider>
            <OfflineBanner />
            <TopBar />
            <UserGuard>
              {/* Top padding clears the fixed TopBar (52px) + safe-area inset. */}
              <main
                className="max-w-[480px] mx-auto pb-20 min-h-screen"
                style={{ paddingTop: 'calc(52px + env(safe-area-inset-top))' }}
              >
                {children}
              </main>
              <BottomNav />
            </UserGuard>
            <ServiceWorkerRegistration />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
