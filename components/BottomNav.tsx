'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/schedule', label: 'Schedule', emoji: '📅' },
  { href: '/books', label: 'Books', emoji: '📚' },
  { href: '/progress', label: 'Progress', emoji: '📊' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid #F0E8E0',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        height: 60,
      }}
    >
      <div className="flex h-full">
        {tabs.map((tab) => {
          const active = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
              style={{ color: active ? '#FF6B35' : '#9A9A9A' }}
            >
              <span className="text-xl leading-none">{tab.emoji}</span>
              <span
                className="text-[10px] leading-none font-bold"
                style={{ color: active ? '#FF6B35' : '#9A9A9A' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
