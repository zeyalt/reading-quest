'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Book, ReadingLog, ReadingPlan, DAY_NAMES, LANGUAGE_FLAGS, Language } from '@/lib/types'
import { todaySGT, getPagesReadOnDate } from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import DateLogPanel from '@/components/DateLogPanel'
import CategoryIcon from '@/components/CategoryIcon'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

// Convert JS Date.getUTCDay() (0=Sun..6=Sat) to the app's 0=Mon..6=Sun.
function appDow(date: Date): number {
  const j = date.getUTCDay()
  return j === 0 ? 6 : j - 1
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().split('T')[0]
}

// Top-level page boundary — useSearchParams() needs to be inside Suspense in
// the App Router.
export default function DiaryPage() {
  return (
    <Suspense fallback={<DiaryLoading />}>
      <DiaryContent />
    </Suspense>
  )
}

function DiaryLoading() {
  return (
    <div className="p-4 pt-12">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-16 w-full mb-4 rounded-2xl" />
      <div className="skeleton h-48 w-full rounded-2xl" />
    </div>
  )
}

function DiaryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const today = todaySGT()

  // Currently viewed date. Driven by ?d=YYYY-MM-DD; falls back to today.
  const queryDate = searchParams.get('d')
  const activeDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today

  const [books, setBooks] = useState<Book[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [plan, setPlan] = useState<ReadingPlan[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [bRes, lRes, pRes] = await Promise.all([
      fetch('/api/books'),
      fetch(`/api/reading-log?user_id=${user.id}&limit=500`),
      fetch(`/api/reading-plan?user_id=${user.id}`),
    ])
    setBooks(await bRes.json())
    setLogs(await lRes.json())
    setPlan(await pRes.json())
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function setDate(newDate: string) {
    if (newDate === today) {
      // Strip the param when we're back on today so the URL stays clean.
      router.replace('/diary')
    } else {
      router.replace(`/diary?d=${newDate}`)
    }
  }

  const isToday = activeDate === today
  const isPast = activeDate < today
  const isFuture = activeDate > today

  const dateObj = useMemo(() => new Date(activeDate + 'T00:00:00Z'), [activeDate])
  const dow = appDow(dateObj)
  const planRow = plan.find((p) => p.day_of_week === dow)
  const target = planRow?.language
    ? { language: planRow.language as Language, pages: planRow.target_pages }
    : null

  const niceDate = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

  // Pages read on this date across all books (for hit-target indicator)
  const totalDelta = books.reduce(
    (sum, b) => sum + getPagesReadOnDate(b.id, activeDate, logs),
    0,
  )
  const hitTarget = !!target && totalDelta >= target.pages

  if (!user || loading) return <DiaryLoading />
  const accent = user.avatar_color

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <BookOpen size={28} style={{ color: '#FF6B35' }} />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          {user.name}&apos;s Diary
        </h1>
      </div>

      {/* Date navigator */}
      <div
        className="rounded-2xl px-3 py-2 mb-3 flex items-center gap-2"
        style={{
          background: 'var(--color-card)',
          boxShadow: isToday ? `0 2px 16px ${accent}40` : '0 2px 12px rgba(0,0,0,0.05)',
          border: isToday ? `2px solid ${accent}` : '2px solid transparent',
        }}
      >
        <button
          onClick={() => setDate(shiftDate(activeDate, -1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Previous day"
        >
          <ChevronLeft size={18} color="var(--color-muted)" />
        </button>

        <div className="flex-1 flex flex-col items-center">
          <input
            type="date"
            value={activeDate}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value)
            }}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="date-trigger bg-transparent text-center font-bold outline-none cursor-pointer"
            style={{ color: isToday ? accent : isFuture ? 'var(--color-muted)' : 'var(--color-text)' }}
            aria-label="Pick a date"
          />
          <span className="text-[10px] font-bold" style={{ color: 'var(--color-muted)' }}>
            {isToday ? 'TODAY' : isPast ? 'PAST' : 'COMING UP'}
          </span>
        </div>

        <button
          onClick={() => setDate(shiftDate(activeDate, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Next day"
        >
          <ChevronRight size={18} color="var(--color-muted)" />
        </button>
      </div>

      {/* Today shortcut when not on today */}
      {!isToday && (
        <button
          onClick={() => setDate(today)}
          className="w-full mb-3 py-2 rounded-xl text-sm font-bold"
          style={{ background: accent + '15', color: accent }}
        >
          Jump to today ({today})
        </button>
      )}

      {/* Nice date heading */}
      <h2 className="text-lg mb-2" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
        {niceDate}
      </h2>

      {/* Target line */}
      {target && (
        <div
          className="rounded-xl p-3 mb-3 flex items-center gap-2 font-bold text-sm"
          style={{
            background: hitTarget ? 'var(--success-bg)' : 'var(--color-bg)',
            color: hitTarget ? 'var(--success-fg)' : '#FF6B35',
          }}
        >
          <span>{LANGUAGE_FLAGS[target.language]}</span>
          <span className="flex-1">
            Target: {target.pages} pages of {target.language}
          </span>
          <span>
            {totalDelta} / {target.pages}{hitTarget ? ' ✓' : ''}
          </span>
        </div>
      )}

      {/* Log content */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--color-card)', boxShadow: 'var(--color-shadow)' }}
      >
        {isFuture ? (
          <FutureDayPreview books={books} logs={logs} date={activeDate} />
        ) : books.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Add some books in the Books tab first.
          </p>
        ) : (
          <DateLogPanel
            userId={user.id}
            date={activeDate}
            books={books}
            logs={logs}
            onChanged={load}
          />
        )}
      </div>
    </div>
  )
}

// Future days are read-only — show the target only, no log UI.
// (We don't want to nudge anyone to "pre-log" a book.)
function FutureDayPreview({ books, logs, date }: { books: Book[]; logs: ReadingLog[]; date: string }) {
  // If there happen to be future logs (e.g., user typed wrong date), still
  // surface them so the data isn't invisible.
  const items = books
    .map((b) => ({ book: b, delta: getPagesReadOnDate(b.id, date, logs) }))
    .filter((x) => x.delta > 0)
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        This day is in the future. The target is shown above; you can log once it&apos;s today.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>Already logged:</p>
      {items.map((x) => (
        <div key={x.book.id} className="flex items-center gap-1.5">
          <CategoryIcon category={x.book.category} size={11} containerSize={20} />
          <span className="text-sm font-bold truncate">{x.book.title}</span>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>+{x.delta} pg</span>
        </div>
      ))}
    </div>
  )
}
