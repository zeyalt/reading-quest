'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, NotebookPen, BookOpen } from 'lucide-react'

// Three tabs: Home (dashboard), Diary (per-day log), Books (library).
// Schedule + Progress were merged in: Diary handles per-day logging while
// Home absorbs the streak calendar and milestones formerly on Progress.
const tabs = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/diary', label: 'Diary', Icon: NotebookPen },
  { href: '/books', label: 'Books', Icon: BookOpen },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto"
      style={{
        background: 'var(--color-card)',
        borderTop: '2.5px solid var(--ink)',
        boxShadow: '0 -3px 0 0 color-mix(in srgb, var(--ink) 12%, transparent)',
        // 64px bar + safe-area padding so tabs clear the iOS home indicator.
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center px-2" style={{ height: 64 }}>
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1.5 mx-1 rounded-2xl"
              style={{
                color: active ? '#fff' : 'var(--color-muted)',
                background: active ? 'var(--candy-orange)' : 'transparent',
                border: active ? '2px solid var(--ink)' : '2px solid transparent',
                boxShadow: active ? '2px 2px 0 0 var(--ink)' : 'none',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              <span className="text-[10px] font-extrabold leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
