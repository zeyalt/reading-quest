'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Book, ReadingLog, ScheduledReading, DAY_NAMES, CATEGORY_COLORS } from '@/lib/types'
import { todaySGT, progressPercent, getCurrentPage } from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import ProgressBar from '@/components/ProgressBar'
import CategoryIcon from '@/components/CategoryIcon'
import { Calendar, ClipboardList, Star, Sparkles } from 'lucide-react'

export default function SchedulePage() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [schedule, setSchedule] = useState<ScheduledReading[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)
  const today = todaySGT()

  useEffect(() => {
    if (!user) return
    async function load() {
      const [bRes, sRes, lRes] = await Promise.all([
        fetch('/api/books'),
        fetch(`/api/scheduled-reading?user_id=${user!.id}&from=${today}`),
        fetch(`/api/reading-log?user_id=${user!.id}&limit=500`),
      ])
      setBooks(await bRes.json())
      setSchedule(await sRes.json())
      setLogs(await lRes.json())
      setLoading(false)
    }
    load()
  }, [user, today])

  if (!user || loading) {
    return (
      <div className="p-4 pt-12">
        <div className="skeleton h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="skeleton h-20 w-full mb-3 rounded-2xl" />
        ))}
      </div>
    )
  }

  const accent = user.avatar_color

  // ----- Group schedule rows by ISO week so we can render section headers ----
  // Note: we use the simple Mon-based week of the date string.
  function weekStartOf(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    const jsDay = d.getUTCDay() // 0=Sun..6=Sat
    const appDow = jsDay === 0 ? 6 : jsDay - 1 // 0=Mon..6=Sun
    d.setUTCDate(d.getUTCDate() - appDow)
    return d.toISOString().split('T')[0]
  }

  const groups: { weekStart: string; rows: ScheduledReading[] }[] = []
  for (const row of schedule) {
    const wk = weekStartOf(row.date)
    const bucket = groups.find((g) => g.weekStart === wk)
    if (bucket) bucket.rows.push(row)
    else groups.push({ weekStart: wk, rows: [row] })
  }

  function dayLabelOf(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    const jsDay = d.getUTCDay()
    const appDow = jsDay === 0 ? 6 : jsDay - 1
    return DAY_NAMES[appDow]
  }

  function shortDateOf(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={28} style={{ color: '#FF6B35' }} />
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
            {user.name}&apos;s Schedule
          </h1>
        </div>
        <Link
          href="/schedule/plan"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
          style={{ background: '#FFF0E8', color: '#FF6B35' }}
        >
          <ClipboardList size={14} /> Plan
        </Link>
      </div>

      {/* Empty state — no schedule generated yet */}
      {schedule.length === 0 && (
        <div className="text-center py-12">
          <Sparkles size={48} color="#F0E8E0" className="mx-auto mb-3" />
          <p className="font-bold mb-1">No schedule yet</p>
          <p className="text-sm mb-4" style={{ color: '#9A9A9A' }}>
            Set up a reading plan and generate {user.name}&apos;s schedule for the next few weeks.
          </p>
          <Link
            href="/schedule/plan"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl font-bold text-white"
            style={{ background: '#FF6B35', boxShadow: '0 2px 12px #FF6B3560' }}
          >
            <ClipboardList size={16} /> Set up Reading Plan
          </Link>
        </div>
      )}

      {/* Per-week sections */}
      {groups.map((grp, gi) => (
        <div key={grp.weekStart} className="mb-4">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-xs font-bold" style={{ color: '#9A9A9A' }}>
              Week of {shortDateOf(grp.weekStart)}
            </span>
            <span className="text-xs font-bold" style={{ color: '#9A9A9A' }}>
              {gi === 0 ? 'This week' : `+${gi} week${gi === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            {grp.rows.map((row, idx) => {
              const isToday = row.date === today
              const book = row.book_id ? books.find((b) => b.id === row.book_id) : null
              const color = book ? (CATEGORY_COLORS[book.category] ?? '#FF6B35') : '#9A9A9A'
              const currentPage = book ? getCurrentPage(book.id, logs) : 0
              const percent = book ? progressPercent(currentPage, book.total_pages) : 0

              return (
                <div key={row.id}>
                  {idx > 0 && <div style={{ height: 1, background: '#F5EFE8', margin: '0 12px' }} />}
                  <div
                    className="px-3 py-3"
                    style={{
                      background: isToday ? `${accent}10` : 'transparent',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Day badge */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-12">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: isToday ? accent : '#F0E8E0',
                            color: isToday ? '#FFFFFF' : '#9A9A9A',
                          }}
                        >
                          {dayLabelOf(row.date)}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: isToday ? accent : '#9A9A9A' }}>
                          {shortDateOf(row.date)}
                        </span>
                      </div>

                      {/* Book info */}
                      <div className="flex-1 min-w-0 pt-1">
                        {book ? (
                          <>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <CategoryIcon category={book.category} size={12} containerSize={22} />
                              <span className="text-sm font-bold truncate">{book.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#F0E8E0', color: '#9A9A9A' }}>
                                {book.language}
                              </span>
                            </div>
                            <ProgressBar percent={percent} color={color} height={5} />
                            <div className="text-[11px] mt-0.5" style={{ color: '#9A9A9A' }}>
                              p.{currentPage}/{book.total_pages} · target {row.target_pages} pages
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 py-2">
                            <Star size={14} style={{ color: '#FFD93D' }} />
                            <p className="text-sm font-bold" style={{ color: '#9A9A9A' }}>Rest day</p>
                          </div>
                        )}
                      </div>

                      {isToday && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                          style={{ background: accent, color: '#FFFFFF' }}
                        >
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
