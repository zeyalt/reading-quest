'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ChevronDown, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUser } from './UserContext'
import { useTheme } from './ThemeContext'

// Single top app bar that replaces the two floating corner controls. Left: app
// wordmark. Right: user-switcher pill + theme toggle, grouped and styled to
// match the app's sticker language. Pinned with safe-area awareness.
export default function TopBar() {
  const { user } = useUser()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // No bar until a user exists (matches the old UserGuard-gated chrome).
  if (!user) return null

  const onUsersPage = pathname === '/users'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 max-w-[480px] mx-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'color-mix(in srgb, var(--color-bg) 86%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '2.5px solid var(--ink)',
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3" style={{ height: 52 }}>
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-1.5 pressable" aria-label="ReadQuest home">
          <span
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              background: 'var(--candy-orange)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 0 var(--ink)',
              color: '#fff',
            }}
          >
            <BookOpen size={17} />
          </span>
          <span className="text-lg" style={{ fontFamily: 'var(--font-baloo), cursive' }}>ReadQuest</span>
        </Link>

        {/* Right control group */}
        <div className="flex items-center gap-2">
          {!onUsersPage && (
            <Link
              href="/users"
              className="pressable sticker-press flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full font-extrabold text-sm"
              style={{
                background: user.avatar_color,
                color: '#FFFFFF',
                border: '2px solid var(--ink)',
                boxShadow: '2px 2px 0 0 var(--ink)',
              }}
              aria-label={`Switch reader, current: ${user.name}`}
            >
              <span className="text-base leading-none">{user.avatar_emoji}</span>
              <span className="max-w-[88px] truncate">{user.name}</span>
              <ChevronDown size={14} />
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="pressable sticker-press flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'var(--color-card)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 0 var(--ink)',
              cursor: mounted ? 'pointer' : 'default',
            }}
            aria-label="Toggle dark mode"
            disabled={!mounted}
          >
            {mounted && (theme === 'dark'
              ? <Sun size={17} color="var(--candy-sun)" />
              : <Moon size={17} color="var(--candy-grape)" />)}
          </button>
        </div>
      </div>
    </header>
  )
}
