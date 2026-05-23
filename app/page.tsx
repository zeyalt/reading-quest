'use client'

import { useEffect, useState, useCallback } from 'react'
import { Book, ReadingLog, Schedule, CATEGORY_COLORS } from '@/lib/types'
import {
  todaySGT,
  todayDayOfWeek,
  getCurrentPage,
  getPagesReadOnDate,
  getStreak,
  progressPercent,
  isComplete,
} from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import ProgressBar from '@/components/ProgressBar'
import StreakBadge from '@/components/StreakBadge'
import WeekChart from '@/components/WeekChart'
import PageUpdateInput from '@/components/PageUpdateInput'
import CategoryIcon from '@/components/CategoryIcon'
import { Trophy, Calendar, Flag, Check, Star, BarChart2 } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function Dashboard() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrated, setCelebrated] = useState(false)

  const today = todaySGT()
  const todayDow = todayDayOfWeek()

  const load = useCallback(async () => {
    if (!user) return
    const [bRes, lRes, sRes] = await Promise.all([
      fetch('/api/books'),
      fetch(`/api/reading-log?user_id=${user.id}&limit=500`),
      fetch(`/api/schedule?user_id=${user.id}`),
    ])
    setBooks(await bRes.json())
    setLogs(await lRes.json())
    setSchedule(await sRes.json())
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const todaySchedule = schedule.find((s) => s.day_of_week === todayDow)
  const todayBook = books.find((b) => b.id === todaySchedule?.book_id)
  const targetPages = todaySchedule?.target_pages ?? 15
  const currentPage = todayBook ? getCurrentPage(todayBook.id, logs) : 0
  const todayPages = todayBook ? getPagesReadOnDate(todayBook.id, today, logs) : 0
  const percent = todayBook ? progressPercent(currentPage, todayBook.total_pages) : 0
  const complete = todayBook ? isComplete(todayBook, logs) : false
  const streak = getStreak(logs)
  const booksCompleted = books.filter((b) => isComplete(b, logs)).length

  const totalPages = (() => {
    let total = 0
    for (const book of books) {
      const bookLogs = logs
        .filter((l) => l.book_id === book.id)
        .sort((a, b) => a.date.localeCompare(b.date))
      if (bookLogs.length > 0) total += bookLogs[bookLogs.length - 1].current_page
    }
    return total
  })()

  const weekData = Array.from({ length: 7 }, (_, dow) => {
    const d = new Date()
    const utcD = d.getTime() + d.getTimezoneOffset() * 60000
    const sgt = new Date(utcD + 8 * 60 * 60000)
    sgt.setDate(sgt.getDate() + (dow - todayDow))
    const date = sgt.toISOString().split('T')[0]
    return books.reduce((sum, book) => sum + getPagesReadOnDate(book.id, date, logs), 0)
  })

  function handlePageUpdate(bookId: string, newPage: number) {
    const prevPage = currentPage
    setLogs((prev) => {
      const filtered = prev.filter((l) => !(l.book_id === bookId && l.date === today))
      return [
        ...filtered,
        { id: 'tmp', user_id: user!.id, book_id: bookId, date: today, current_page: newPage, logged_at: new Date().toISOString() },
      ]
    })
    if (!celebrated && todayBook) {
      const nowComplete = newPage >= todayBook.total_pages
      const hitTarget = !complete && newPage - prevPage >= targetPages
      if (nowComplete || hitTarget) {
        setCelebrated(true)
        confetti({ particleCount: nowComplete ? 150 : 80, spread: nowComplete ? 80 : 60, origin: { y: 0.6 } })
        setTimeout(() => setCelebrated(false), 5000)
      }
    }
  }

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-16 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-48 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-20 w-full rounded-2xl" />
      </div>
    )
  }

  const color = todayBook ? (CATEGORY_COLORS[todayBook.category] ?? '#FF6B35') : '#FF6B35'

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Header banner */}
      <div
        className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${user.avatar_color}, #FFD93D)` }}
      >
        <div>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: 'var(--font-fredoka), cursive' }}
          >
            {user.avatar_emoji} Hey, {user.name}!
          </h1>
          <p className="text-sm text-white font-bold" style={{ opacity: 0.9 }}>
            {booksCompleted > 0 && (
              <span className="flex items-center gap-1.5">
                <Trophy size={14} />
                {booksCompleted} book{booksCompleted > 1 ? 's' : ''} completed!
              </span>
            )}
            {booksCompleted === 0 && 'Start your adventure!'}
          </p>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {/* Today's Reading */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={20} style={{ color: '#FF6B35' }} />
          <h2 className="text-lg" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
            Today&apos;s Reading
          </h2>
        </div>

        {todayBook ? (
          <>
            {complete && (
              <div className="rounded-xl p-3 mb-3 text-center font-bold flex items-center justify-center gap-2" style={{ background: '#d4edda', color: '#155724' }}>
                <Trophy size={18} />
                Book Complete! Amazing work!
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <CategoryIcon category={todayBook.category} size={22} containerSize={48} />
              <div className="flex-1 min-w-0">
                <div className="font-bold leading-tight">{todayBook.title}</div>
                <div className="text-sm" style={{ color: '#9A9A9A' }}>{todayBook.author}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: color + '20', color }}>
                    {todayBook.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#F0E8E0', color: '#9A9A9A' }}>
                    {todayBook.language}
                  </span>
                </div>
              </div>
            </div>

            <ProgressBar percent={percent} color={color} height={12} />
            <div className="flex justify-between mt-1 mb-3">
              <span className="text-sm" style={{ color: '#9A9A9A' }}>p.{currentPage} / {todayBook.total_pages}</span>
              <span className="text-sm font-bold" style={{ color }}>{percent}%</span>
            </div>

            <div className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#9A9A9A' }}>
              <Flag size={14} style={{ color: '#FF6B35', flexShrink: 0 }} />
              <span>Read {targetPages} pages today! {todayPages > 0 && <span style={{ color: '#00C9A7' }}><Check size={14} className="inline" /> {todayPages} so far</span>}</span>
            </div>

            <PageUpdateInput
              userId={user.id}
              bookId={todayBook.id}
              currentPage={currentPage}
              totalPages={todayBook.total_pages}
              onUpdate={(p) => handlePageUpdate(todayBook.id, p)}
              targetPages={targetPages}
            />
          </>
        ) : (
          <div className="text-center py-6" style={{ color: '#9A9A9A' }}>
            <div className="flex justify-center mb-2">
              <Star size={40} style={{ color: '#FFD93D' }} fill="#FFD93D" />
            </div>
            <p className="font-bold">Rest day!</p>
            <p className="text-sm">No book scheduled for today.</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Pages Read', value: totalPages },
          { label: 'Books Done', value: booksCompleted },
          { label: 'Day Streak', value: streak },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 text-center"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
          >
            <div className="text-lg font-bold" style={{ color: user.avatar_color }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* This Week chart */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={20} style={{ color: '#FF6B35' }} />
          <h2 className="text-lg" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
            This Week
          </h2>
        </div>
        <WeekChart data={weekData} />
      </div>
    </div>
  )
}
