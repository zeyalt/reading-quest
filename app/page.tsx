'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Book, ReadingLog, ReadingPlan, Language, LANGUAGE_FLAGS, DAY_NAMES } from '@/lib/types'
import {
  todayLocal,
  todayDayOfWeek,
  getPagesReadOnDate,
  getReadingDates,
  getStreak,
  isComplete,
} from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import StreakBadge from '@/components/StreakBadge'
import WeekChart from '@/components/WeekChart'
import CategoryIcon from '@/components/CategoryIcon'
import {
  Trophy, Flag, Star, BarChart2, Flame, Calendar, Sprout, BookOpen, Crown, Layers, Layers3,
  ChevronRight, ChevronLeft, Award, Medal, Globe2, Target, Gem,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [plan, setPlan] = useState<ReadingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [calMonthOffset, setCalMonthOffset] = useState(0)

  const today = todayLocal()
  const todayDow = todayDayOfWeek()

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

  // ----------------------------- Derived data ---------------------------
  const todayPlan = plan.find((p) => p.day_of_week === todayDow)
  const todayTarget = todayPlan?.language
    ? { language: todayPlan.language as Language, pages: todayPlan.target_pages }
    : null

  const streak = getStreak(logs)
  const booksCompleted = books.filter((b) => isComplete(b, logs)).length

  const totalPages = useMemo(() => {
    let total = 0
    for (const book of books) {
      const bookLogs = logs
        .filter((l) => l.book_id === book.id)
        .sort((a, b) => a.date.localeCompare(b.date))
      if (bookLogs.length > 0) total += bookLogs[bookLogs.length - 1].current_page
    }
    return total
  }, [books, logs])

  const todayPagesTotal = useMemo(
    () => books.reduce((sum, book) => sum + getPagesReadOnDate(book.id, today, logs), 0),
    [books, logs, today],
  )
  const hitTodayTarget = !!todayTarget && todayPagesTotal >= todayTarget.pages


  // Past 7 days: a rolling 7-day window ending today (index 0 = today, then
  // back 6 days). Each entry tells the diary widget the target and what was logged.
  const past7 = useMemo(() => {
    const t = new Date(today + 'T00:00:00Z')
    const planByDow = new Map<number, ReadingPlan>()
    for (const p of plan) planByDow.set(p.day_of_week, p)

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(t)
      d.setUTCDate(t.getUTCDate() - i) // 0 (today), -1, ..., -6
      const dateStr = d.toISOString().split('T')[0]
      const jsDay = d.getUTCDay()
      const dow = jsDay === 0 ? 6 : jsDay - 1
      const planRow = planByDow.get(dow)
      const target = planRow?.language
        ? { language: planRow.language as Language, pages: planRow.target_pages }
        : null
      const items = books
        .map((b) => ({ book: b, delta: getPagesReadOnDate(b.id, dateStr, logs) }))
        .filter((x) => x.delta > 0)
      const totalDelta = items.reduce((s, x) => s + x.delta, 0)
      return {
        date: dateStr,
        dayLabel: DAY_NAMES[dow],
        dayOfMonth: d.getUTCDate(),
        target,
        items,
        totalDelta,
        hit: !!target && totalDelta >= target.pages,
      }
    })
  }, [today, plan, books, logs])

  // Streak calendar: every day in the calendar month (with navigation via calMonthOffset)
  const calendar = useMemo(() => {
    const cursor = new Date() // local device time
    cursor.setMonth(cursor.getMonth() + calMonthOffset)
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Green a day only if pages actually advanced (matches the Past-7 list),
    // not merely because a log row exists for that date.
    const readDates = getReadingDates(logs)
    const cells: Array<{ date: string; read: boolean; today: boolean; empty: boolean }> = []
    const firstDay = new Date(year, month, 1)
    const padStart = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = 0; i < padStart; i++) cells.push({ date: '', read: false, today: false, empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, read: readDates.has(dateStr), today: dateStr === today, empty: false })
    }
    return { cells, monthLabel: cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
  }, [today, logs, calMonthOffset])

  // Largest single-day page total ever (for the "20 pages in a day" milestone).
  const maxDailyPages = useMemo(() => {
    const dateSet = new Set<string>(logs.map((l) => l.date))
    let max = 0
    for (const date of dateSet) {
      const total = books.reduce((s, b) => s + getPagesReadOnDate(b.id, date, logs), 0)
      if (total > max) max = total
    }
    return max
  }, [logs, books])

  // Distinct languages with at least one logged book (for "X languages" milestones).
  const languagesRead = useMemo(() => {
    const langs = new Set<string>()
    for (const log of logs) {
      const book = books.find((b) => b.id === log.book_id)
      if (book?.language) langs.add(book.language)
    }
    return langs.size
  }, [logs, books])

  // Milestones, roughly ordered easiest → hardest. The horizontal scroll on
  // the dashboard naturally surfaces "what comes next" without a tier UI.
  const milestones = useMemo(() => [
    { icon: <Sprout size={18} />,   label: 'First page',      achieved: logs.length > 0 },
    { icon: <Flame size={18} />,    label: '3-day streak',    achieved: streak >= 3 },
    { icon: <BookOpen size={18} />, label: 'First book',      achieved: booksCompleted >= 1 },
    { icon: <Star size={18} />,     label: '100 pages',       achieved: totalPages >= 100 },
    { icon: <Target size={18} />,   label: '20 in a day',     achieved: maxDailyPages >= 20 },
    { icon: <Flame size={18} />,    label: '7-day streak',    achieved: streak >= 7 },
    { icon: <Globe2 size={18} />,   label: '2 languages',     achieved: languagesRead >= 2 },
    { icon: <Trophy size={18} />,   label: '500 pages',       achieved: totalPages >= 500 },
    { icon: <Layers size={18} />,   label: '3 books',         achieved: booksCompleted >= 3 },
    { icon: <Medal size={18} />,    label: '1000 pages',      achieved: totalPages >= 1000 },
    { icon: <Award size={18} />,    label: '14-day streak',   achieved: streak >= 14 },
    { icon: <Layers3 size={18} />,  label: '5 books',         achieved: booksCompleted >= 5 },
    { icon: <Crown size={18} />,    label: '30-day streak',   achieved: streak >= 30 },
    { icon: <Gem size={18} />,      label: 'All books',       achieved: books.length > 0 && booksCompleted === books.length },
  ], [logs.length, booksCompleted, streak, totalPages, maxDailyPages, languagesRead, books.length])

  // ----------------------------- Render ---------------------------------
  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-16 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-24 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-20 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const accent = user.avatar_color

  return (
    <div className="p-4 tab-content">
      {/* Hero — a big sticker banner with a sun-ray glow behind the greeting */}
      <div
        className="sticker pop relative overflow-hidden p-4 mb-5 flex items-center justify-between"
        style={{
          ['--i' as string]: 0,
          background: `linear-gradient(135deg, ${user.avatar_color} 0%, var(--candy-sun) 100%)`,
        }}
      >
        {/* Decorative bubbles for depth */}
        <div aria-hidden className="absolute rounded-full" style={{ width: 120, height: 120, top: -50, right: -30, background: 'rgba(255,255,255,0.18)' }} />
        <div aria-hidden className="absolute rounded-full" style={{ width: 70, height: 70, bottom: -30, right: 60, background: 'rgba(255,255,255,0.12)' }} />
        <div className="relative">
          <h1 className="text-2xl text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.12)' }}>
            {user.avatar_emoji} Hey, {user.name}!
          </h1>
          <p className="text-sm text-white font-extrabold" style={{ opacity: 0.95 }}>
            {booksCompleted > 0 ? (
              <span className="flex items-center gap-1.5">
                <Trophy size={14} />
                {booksCompleted} book{booksCompleted > 1 ? 's' : ''} completed!
              </span>
            ) : (
              'Start your adventure!'
            )}
          </p>
        </div>
        <div className="relative">
          <StreakBadge streak={streak} />
        </div>
      </div>

      {/* Today snapshot — tap to jump into Diary */}
      {todayTarget && (
        <Link
          href="/diary"
          className="sticker sticker-press pop block p-3.5 mb-5"
          style={{
            ['--i' as string]: 1,
            background: hitTodayTarget ? 'var(--success-bg)' : 'var(--color-card)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Today&apos;s Quest</span>
            <ChevronRight size={15} color="var(--color-muted)" />
          </div>
          <div className="flex items-center gap-2">
            <Flag size={17} style={{ color: hitTodayTarget ? 'var(--candy-teal)' : 'var(--candy-orange)' }} />
            <span className="text-sm font-bold flex-1">
              {LANGUAGE_FLAGS[todayTarget.language]} {todayTarget.pages} pages of {todayTarget.language}
            </span>
            <span
              className="text-sm font-extrabold px-2 py-0.5 rounded-full"
              style={{
                color: hitTodayTarget ? 'var(--candy-teal-ink)' : 'var(--candy-orange-ink)',
                background: hitTodayTarget ? 'color-mix(in srgb, var(--candy-teal) 22%, transparent)' : 'color-mix(in srgb, var(--candy-orange) 18%, transparent)',
              }}
            >
              {todayPagesTotal} / {todayTarget.pages}{hitTodayTarget ? ' ✓' : ''}
            </span>
          </div>
        </Link>
      )}

      {/* Stats triplet — each a coloured sticker tile */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pages Read', value: totalPages, c: 'var(--candy-grape)', ink: 'var(--candy-grape-ink)' },
          { label: 'Books Done', value: booksCompleted, c: 'var(--candy-sky)', ink: 'var(--candy-sky-ink)' },
          { label: 'Day Streak', value: streak, c: 'var(--candy-rose)', ink: 'var(--candy-rose-ink)' },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className="sticker pop p-3 text-center"
            style={{
              ['--i' as string]: 2 + idx,
              background: `color-mix(in srgb, ${stat.c} 16%, var(--color-card))`,
            }}
          >
            <div className="text-2xl font-extrabold leading-none" style={{ color: stat.ink, fontFamily: 'var(--font-baloo), cursive' }}>{stat.value}</div>
            <div className="text-[11px] font-extrabold mt-1" style={{ color: 'var(--color-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Past 7 days — chart summary + tappable detail rows */}
      <div
        className="sticker pop p-4 mb-5"
        style={{ ['--i' as string]: 5, background: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-sky) 18%, transparent)', color: 'var(--candy-sky-ink)' }}>
            <BarChart2 size={17} />
          </span>
          <h2 className="text-lg">Past 7 Days</h2>
        </div>

        {/* Mini bar chart */}
        <div className="mb-4">
          <WeekChart
            data={[...past7].reverse().map((d) => d.totalDelta)}
            labels={[...past7].reverse().map((d) => d.dayLabel)}
            highlightIdx={past7.length - 1}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-surface)', marginBottom: 12 }} />

        {/* Detail list */}
        <div className="flex flex-col gap-1.5">
          {past7.map((day) => (
            <Link
              key={day.date}
              href={`/diary?d=${day.date}`}
              className="pressable rounded-xl px-2.5 py-2 flex items-center gap-2.5"
              style={{
                background: day.hit ? 'var(--success-bg)' : 'var(--color-bg)',
                border: day.hit ? '2px solid color-mix(in srgb, var(--candy-teal) 35%, transparent)' : '2px solid var(--color-surface)',
              }}
            >
              {/* Calendar-tile badge: day name on top, day-of-month underneath. */}
              <div
                className="rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                style={{ background: day.hit ? 'var(--candy-teal)' : 'var(--color-surface)', color: day.hit ? '#fff' : undefined, width: 38, height: 40 }}
              >
                <span className="text-[9px] font-bold leading-none uppercase" style={{ color: day.hit ? 'rgba(255,255,255,0.85)' : 'var(--color-muted)' }}>
                  {day.dayLabel}
                </span>
                <span className="text-base font-extrabold leading-tight" style={{ color: day.hit ? '#fff' : 'var(--color-text)' }}>
                  {day.dayOfMonth}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {day.items.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {day.target ? 'No reading logged' : 'Rest day'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {day.items.map((x) => (
                      <div key={x.book.id} className="flex items-center gap-1 text-xs">
                        <CategoryIcon category={x.book.category} size={9} containerSize={16} />
                        {/* Delta is inline-trailing so it stays attached to the
                            last word of the title instead of flying to the far
                            right when the title wraps to a second line. */}
                        <span className="font-bold leading-snug">
                          {x.book.title}
                          <span className="font-normal" style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}> +{x.delta}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span
                className="text-[11px] font-bold flex-shrink-0"
                style={{ color: day.hit ? '#00C9A7' : day.target ? 'var(--color-muted)' : 'var(--color-subtle)' }}
              >
                {day.target ? `${day.totalDelta}/${day.target.pages}${day.hit ? ' ✓' : ''}` : '—'}
              </span>
              <ChevronRight size={12} color="var(--color-subtle)" />
            </Link>
          ))}
        </div>
      </div>

      {/* Streak calendar */}
      <div
        className="sticker pop p-4 mb-5"
        style={{ ['--i' as string]: 6, background: 'var(--color-card)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-orange) 18%, transparent)', color: 'var(--candy-orange-ink)' }}>
              <Flame size={17} className={streak > 0 ? 'flame-pulse' : undefined} />
            </span>
            <h2 className="text-lg">
              Streak · {streak} day{streak === 1 ? '' : 's'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCalMonthOffset((o) => o - 1)} className="p-1 rounded hover:opacity-70 transition-opacity">
              <ChevronLeft size={14} color="var(--color-muted)" />
            </button>
            <span className="text-xs font-bold" style={{ color: 'var(--color-muted)', minWidth: 80, textAlign: 'center' }}>
              {calendar.monthLabel}
            </span>
            <button
              onClick={() => setCalMonthOffset((o) => Math.min(0, o + 1))}
              style={{ opacity: calMonthOffset === 0 ? 0.3 : 1 }}
              disabled={calMonthOffset === 0}
              className="p-1 rounded hover:opacity-70 transition-opacity disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} color="var(--color-muted)" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold" style={{ color: 'var(--color-muted)' }}>{d}</div>
          ))}
          {calendar.cells.map((cd, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg flex items-center justify-center text-[10px] font-extrabold"
              style={{
                background: cd.empty
                  ? 'transparent'
                  : cd.today
                    ? accent
                    : cd.read
                      ? 'var(--candy-teal)'
                      : 'var(--color-surface)',
                color: cd.today || cd.read ? '#FFFFFF' : cd.empty ? 'transparent' : 'var(--color-muted)',
                border: cd.today || cd.read ? '2px solid var(--ink)' : '2px solid transparent',
                boxShadow: cd.today ? '2px 2px 0 0 var(--ink)' : 'none',
              }}
            >
              {!cd.empty && new Date(cd.date + 'T12:00:00').getDate()}
            </div>
          ))}
        </div>
      </div>

      {/* Milestones — a sticker sheet. Each earned badge gets its own candy
          colour (cycled) with a sticker outline; locked ones are faded. */}
      <div
        className="sticker pop overflow-hidden"
        style={{ ['--i' as string]: 7, background: 'var(--color-card)' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-sun) 26%, transparent)', color: 'var(--candy-sun-ink)' }}>
              <Trophy size={17} />
            </span>
            <h2 className="text-lg">Sticker Sheet</h2>
          </div>
          <span className="text-xs font-extrabold px-2 py-1 rounded-full" style={{ color: 'var(--candy-grape-ink)', background: 'color-mix(in srgb, var(--candy-grape) 16%, transparent)' }}>
            {milestones.filter((m) => m.achieved).length} / {milestones.length}
          </span>
        </div>
        <div className="px-4 pb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {milestones.map((m, idx) => {
            const candy = MILESTONE_CANDIES[idx % MILESTONE_CANDIES.length]
            return (
            <div
              key={m.label}
              className="flex flex-col items-center justify-start gap-1.5 px-1.5 pt-2.5 pb-2 rounded-2xl"
              style={{
                background: m.achieved ? `color-mix(in srgb, ${candy.c} 16%, var(--color-card))` : 'var(--color-surface)',
                border: m.achieved ? `2px solid ${candy.ink}` : '2px solid transparent',
                boxShadow: m.achieved ? `2px 2px 0 0 ${candy.ink}` : 'none',
                opacity: m.achieved ? 1 : 0.55,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  background: m.achieved ? candy.c : 'color-mix(in srgb, var(--color-muted) 22%, transparent)',
                  color: m.achieved ? '#FFFFFF' : 'var(--color-muted)',
                  width: 38,
                  height: 38,
                  boxShadow: m.achieved ? 'inset 0 -2px 0 rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {m.icon}
              </div>
              <span
                className="text-[10px] font-extrabold text-center leading-tight"
                style={{
                  color: m.achieved ? candy.ink : 'var(--color-muted)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {m.label}
              </span>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}

// Candy colour cycle for earned milestone stickers.
const MILESTONE_CANDIES = [
  { c: 'var(--candy-orange)', ink: 'var(--candy-orange-ink)' },
  { c: 'var(--candy-teal)',   ink: 'var(--candy-teal-ink)' },
  { c: 'var(--candy-grape)',  ink: 'var(--candy-grape-ink)' },
  { c: 'var(--candy-sky)',    ink: 'var(--candy-sky-ink)' },
  { c: 'var(--candy-rose)',   ink: 'var(--candy-rose-ink)' },
  { c: 'var(--candy-sun)',    ink: 'var(--candy-sun-ink)' },
]
