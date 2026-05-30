'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-3 rounded-full flex items-center justify-center"
      style={{
        left: 12,
        width: 32,
        height: 32,
        background: mounted ? 'var(--color-surface)' : 'transparent',
        zIndex: 50,
        border: 'none',
        cursor: mounted ? 'pointer' : 'default',
      }}
      aria-label="Toggle dark mode"
      disabled={!mounted}
    >
      {mounted && (
        theme === 'dark' ? (
          <Sun size={16} color="#FFD93D" />
        ) : (
          <Moon size={16} color="#9A9A9A" />
        )
      )}
    </button>
  )
}
