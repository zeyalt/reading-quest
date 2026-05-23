'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, BarChart2 } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/schedule', label: 'Schedule', Icon: Calendar },
  { href: '/books', label: 'Books', Icon: BookOpen },
  { href: '/progress', label: 'Progress', Icon: BarChart2 },
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
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
              style={{ color: active ? '#FF6B35' : '#C0B8B0' }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
