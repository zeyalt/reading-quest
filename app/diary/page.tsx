'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Book, ReadingLog, ReadingPlan, DAY_NAMES, LANGUAGE_FLAGS, Language } from '@/lib/types'
import { todayLocal, getPagesReadOnDate } from '@/lib/utils'
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
    <div className="p-4">
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
  const today = todayLocal()

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
    <div className="p-4 tab-content">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: 'var(--candy-grape)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 0 var(--ink)', color: '#fff' }}>
          <BookOpen size={19} />
        </span>
        <h1 className="text-2xl">{user.name}&apos;s Diary</h1>
      </div>

      {/* Date navigator */}
      <div
        className="sticker pop px-3 py-2 mb-3 flex items-center gap-2"
        style={{
          ['--i' as string]: 0,
          background: isToday ? `color-mix(in srgb, ${accent} 14%, var(--color-card))` : 'var(--color-card)',
        }}
      >
        <button
          onClick={() => setDate(shiftDate(activeDate, -1))}
          className="sticker-press w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: 'var(--color-surface)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 0 var(--ink)' }}
          aria-label="Previous day"
        >
          <ChevronLeft size={18} color="var(--color-text)" />
        </button>

        {/* Tapping anywhere on the date opens the calendar. The native date
            input is laid over the text at full size but fully transparent, so
            no browser chevron/indicator shows — the text itself is the trigger. */}
        <div className="flex-1 flex flex-col items-center relative">
          <span
            className="text-center font-extrabold"
            style={{ color: isToday ? 'var(--candy-orange-ink)' : isFuture ? 'var(--color-muted)' : 'var(--color-text)' }}
          >
            {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
          </span>
          <span
            className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5"
            style={{
              color: isToday ? '#fff' : 'var(--color-muted)',
              background: isToday ? 'var(--candy-orange)' : 'var(--color-surface)',
            }}
          >
            {isToday ? 'TODAY' : isPast ? 'PAST' : 'COMING UP'}
          </span>
          <input
            type="date"
            value={activeDate}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value)
            }}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="date-trigger absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Pick a date"
          />
        </div>

        <button
          onClick={() => setDate(shiftDate(activeDate, 1))}
          className="sticker-press w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: 'var(--color-surface)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 0 var(--ink)' }}
          aria-label="Next day"
        >
          <ChevronRight size={18} color="var(--color-text)" />
        </button>
      </div>

      {/* Today shortcut when not on today */}
      {!isToday && (
        <button
          onClick={() => setDate(today)}
          className="sticker-sm sticker-press w-full mb-3 py-2 text-sm font-extrabold text-white"
          style={{ background: 'var(--candy-orange)' }}
        >
          Jump to today
        </button>
      )}

      {/* Nice date heading */}
      <h2 className="text-lg mb-2 px-1">{niceDate}</h2>

      {/* Target line */}
      {target && (
        <div
          className="sticker-sm pop p-3 mb-3 flex items-center gap-2 font-extrabold text-sm"
          style={{
            ['--i' as string]: 1,
            background: hitTarget ? 'var(--success-bg)' : 'color-mix(in srgb, var(--candy-orange) 12%, var(--color-card))',
            color: hitTarget ? 'var(--success-fg)' : 'var(--candy-orange-ink)',
          }}
        >
          <span className="text-base">{LANGUAGE_FLAGS[target.language]}</span>
          <span className="flex-1">
            Target: {target.pages} pages of {target.language}
          </span>
          <span className="px-2 py-0.5 rounded-full" style={{ background: hitTarget ? 'color-mix(in srgb, var(--candy-teal) 22%, transparent)' : 'color-mix(in srgb, var(--candy-orange) 18%, transparent)' }}>
            {totalDelta} / {target.pages}{hitTarget ? ' ✓' : ''}
          </span>
        </div>
      )}

      {/* Log content */}
      <div
        className="sticker pop p-4"
        style={{ ['--i' as string]: 2, background: 'var(--color-card)' }}
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
