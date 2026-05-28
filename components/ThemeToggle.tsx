'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-3 rounded-full flex items-center justify-center"
      style={{
        left: 12,
        width: 32,
        height: 32,
        background: 'var(--color-surface)',
        zIndex: 50,
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? (
        <Sun size={16} color="#FFD93D" />
      ) : (
        <Moon size={16} color="#9A9A9A" />
      )}
    </button>
  )
}
