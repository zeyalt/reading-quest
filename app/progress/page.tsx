'use client'

import { useEffect, useState } from 'react'
import { getCurrentPage, getStreak, progressPercent, isComplete, todaySGT } from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import ProgressBar from '@/components/ProgressBar'
import CategoryIcon from '@/components/CategoryIcon'
import { Sprout, BookOpen, Flame, Star, Trophy, Crown, BarChart2, PenTool, Layers } from 'lucide-react'
import type { Book, ReadingLog, CATEGORY_COLORS } from '@/lib/types'

export default function ProgressPage() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const [bRes, lRes] = await Promise.all([
        fetch('/api/books'),
        fetch(`/api/reading-log?user_id=${user.id}&limit=1000`),
      ])
      setBooks(await bRes.json())
      setLogs(await lRes.json())
      setLoading(false)
    }
    load()
  }, [user])

  const today = todaySGT()
  const streak = getStreak(logs)
  const booksCompleted = books.filter((b) => isComplete(b, logs)).length
  const totalPagesRead = (() => {
    let total = 0
    for (const book of books) {
      const bookLogs = logs.filter((l) => l.book_id === book.id).sort((a, b) => a.date.localeCompare(b.date))
      if (bookLogs.length > 0) total += bookLogs[bookLogs.length - 1].current_page
    }
    return total
  })()
  const totalPossible = books.reduce((s, b) => s + b.total_pages, 0)
  const overallPercent = totalPossible > 0 ? Math.round((totalPagesRead / totalPossible) * 100) : 0

  const calendarDates = (() => {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const sgt = new Date(utc + 8 * 60 * 60000)
    const year = sgt.getFullYear()
    const month = sgt.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const readDates = new Set(logs.map((l) => l.date))
    const dates: Array<{ date: string; read: boolean; today: boolean; empty: boolean }> = []
    const firstDay = new Date(year, month, 1)
    const padStart = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = 0; i < padStart; i++) dates.push({ date: '', read: false, today: false, empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dates.push({ date: dateStr, read: readDates.has(dateStr), today: dateStr === today, empty: false })
    }
    return dates
  })()

  const recentActivity = logs.slice(0, 10)
  const sortedBooks = [...books].sort((a, b) =>
    progressPercent(getCurrentPage(b.id, logs), b.total_pages) -
    progressPercent(getCurrentPage(a.id, logs), a.total_pages)
  )

  const milestones = [
    { icon: <Sprout size={20} />, label: 'First page logged', achieved: logs.length > 0 },
    { icon: <BookOpen size={20} />, label: 'First book completed', achieved: booksCompleted >= 1 },
    { icon: <Flame size={20} />, label: '7-day streak', achieved: streak >= 7 },
    { icon: <Star size={20} />, label: '500 pages read', achieved: totalPagesRead >= 500 },
    { icon: <Trophy size={20} />, label: '1000 pages read', achieved: totalPagesRead >= 1000 },
    { icon: <Layers size={20} />, label: '5 books completed', achieved: booksCompleted >= 5 },
    { icon: <Crown size={20} />, label: 'All books completed', achieved: booksCompleted >= books.length && books.length > 0 },
  ]

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-40 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const accentColor = user.avatar_color

  return (
    <div className="p-4 pt-12 tab-content">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={28} style={{ color: '#FF6B35' }} />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          {user.name}&apos;s Progress
        </h1>
      </div>

      {/* Overall ring */}
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0E8E0" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={accentColor} strokeWidth="3"
              strokeDasharray={`${overallPercent} ${100 - overallPercent}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: accentColor }}>{overallPercent}%</span>
          </div>
        </div>
        <div>
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Overall Progress</h2>
          <p className="text-sm" style={{ color: '#9A9A9A' }}>{totalPagesRead} / {totalPossible} pages</p>
          <p className="text-sm" style={{ color: '#9A9A9A' }}>{booksCompleted} / {books.length} books</p>
        </div>
      </div>

      {/* Streak calendar */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={20} style={{ color: '#FF6B35' }} />
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
            Reading Streak — {streak} day{streak !== 1 ? 's' : ''}
          </h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-bold" style={{ color: '#9A9A9A' }}>{d}</div>
          ))}
          {calendarDates.map((cd, i) => (
            <div key={i} className="aspect-square rounded-md flex items-center justify-center text-xs font-bold"
              style={{
                background: cd.empty ? 'transparent' : cd.today ? accentColor : cd.read ? '#00C9A7' : '#F0E8E0',
                color: cd.today || cd.read ? '#FFFFFF' : cd.empty ? 'transparent' : '#9A9A9A',
              }}
            >
              {!cd.empty && new Date(cd.date + 'T12:00:00').getDate()}
            </div>
          ))}
        </div>
      </div>

      {/* Per-book progress */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={20} style={{ color: '#FF6B35' }} />
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Books Progress</h2>
        </div>
        {sortedBooks.map((book) => {
          const cp = getCurrentPage(book.id, logs)
          const pct = progressPercent(cp, book.total_pages)
          const CATEGORY_COLORS: Record<string, string> = {
            Mystery: '#4A90D9', Fiction: '#00C9A7', Comic: '#FF6B35', Singapore: '#EE4266',
            Science: '#2EC4B6', Chinese: '#E85D75', Other: '#845EC2',
          }
          const color = CATEGORY_COLORS[book.category] ?? '#FF6B35'
          return (
            <div key={book.id} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CategoryIcon category={book.category} size={12} containerSize={22} />
                  <span className="text-sm font-bold truncate">{book.title}</span>
                  <span className="text-xs px-1.5 rounded font-bold flex-shrink-0" style={{ background: '#F0E8E0', color: '#9A9A9A' }}>
                    {book.language}
                  </span>
                </div>
                <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color }}>{pct}%</span>
              </div>
              <ProgressBar percent={pct} color={color} height={8} />
              <div className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>p.{cp}/{book.total_pages}</div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <PenTool size={20} style={{ color: '#FF6B35' }} />
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Recent Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm" style={{ color: '#9A9A9A' }}>No reading logged yet.</p>
        ) : (
          recentActivity.map((log) => {
            const book = books.find((b) => b.id === log.book_id)
            if (!book) return null
            return (
              <div key={log.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #F0E8E0' }}>
                <span className="text-sm flex items-center gap-1.5">
                  <CategoryIcon category={book.category} size={11} containerSize={20} />
                  <span className="font-bold">{book.title}</span> → p.{log.current_page}
                </span>
                <span className="text-xs" style={{ color: '#9A9A9A' }}>{log.date}</span>
              </div>
            )
          })
        )}
      </div>

      {/* Milestones */}
      <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={20} style={{ color: '#FF6B35' }} />
          <h2 className="font-bold" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Milestones</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {milestones.map((m) => (
            <div key={m.label} className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: m.achieved ? accentColor + '15' : '#F7F7F7', opacity: m.achieved ? 1 : 0.5 }}
            >
              <div style={{ color: m.achieved ? accentColor : '#9A9A9A' }}>{m.icon}</div>
              <span className="text-xs font-bold" style={{ color: m.achieved ? accentColor : '#9A9A9A' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
