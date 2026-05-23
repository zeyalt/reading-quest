import type { Metadata, Viewport } from 'next'
import { Nunito, Fredoka } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import OfflineBanner from '@/components/OfflineBanner'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { UserProvider } from '@/components/UserContext'
import UserGuard from '@/components/UserGuard'
import UserSwitcher from '@/components/UserSwitcher'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
})

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-fredoka',
})

export const metadata: Metadata = {
  title: 'Reading Quest',
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
    <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen" style={{ fontFamily: 'var(--font-nunito), sans-serif' }}>
        <UserProvider>
          <OfflineBanner />
          <UserSwitcher />
          <UserGuard>
            <main className="max-w-[480px] mx-auto pb-20 min-h-screen">
              {children}
            </main>
            <BottomNav />
          </UserGuard>
          <ServiceWorkerRegistration />
        </UserProvider>
      </body>
    </html>
  )
}
