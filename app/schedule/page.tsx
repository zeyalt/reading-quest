'use client'

import { useEffect, useState } from 'react'
import { Book, Schedule, ReadingLog, DAY_NAMES, CATEGORY_COLORS, CATEGORIES, Category } from '@/lib/types'
import { todayDayOfWeek, progressPercent, getCurrentPage, isComplete } from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import ProgressBar from '@/components/ProgressBar'
import CategoryIcon from '@/components/CategoryIcon'
import { Pencil, Sparkles, Calendar, Star } from 'lucide-react'

export default function SchedulePage() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editDay, setEditDay] = useState<number | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const todayDow = todayDayOfWeek()

  async function load() {
    if (!user) return
    const [bRes, sRes, lRes] = await Promise.all([
      fetch('/api/books'),
      fetch(`/api/schedule?user_id=${user.id}`),
      fetch(`/api/reading-log?user_id=${user.id}&limit=500`),
    ])
    setBooks(await bRes.json())
    setSchedule(await sRes.json())
    setLogs(await lRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function updateSchedule(dow: number, bookId: string | null, targetPages?: number) {
    if (!user) return
    setSaving(dow)
    const current = schedule.find((s) => s.day_of_week === dow)
    const res = await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        day_of_week: dow,
        book_id: bookId,
        target_pages: targetPages ?? current?.target_pages ?? 15,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSchedule((prev) => prev.map((s) => (s.day_of_week === dow ? updated : s)))
      setEditDay(null)
    }
    setSaving(null)
  }

  async function autoFill() {
    if (!user) return
    const unfinished = books.filter((b) => !isComplete(b, logs))
    const categoryOrder: Category[] = ['Mystery', 'Fiction', 'Comic', 'Singapore', 'Science', 'Chinese', 'Other']
    const byCategory: Record<string, Book[]> = {}
    for (const cat of categoryOrder) byCategory[cat] = unfinished.filter((b) => b.category === cat)
    const catQueue = categoryOrder.filter((c) => byCategory[c].length > 0)
    const catIndexes: Record<string, number> = {}
    for (const c of catQueue) catIndexes[c] = 0

    let catCursor = 0
    for (let dow = 0; dow < 7; dow++) {
      let bookId: string | null = null
      if (catQueue.length > 0) {
        const cat = catQueue[catCursor % catQueue.length]
        const idx = catIndexes[cat] % byCategory[cat].length
        bookId = byCategory[cat][idx].id
        catIndexes[cat]++
        catCursor++
      }
      await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, day_of_week: dow, book_id: bookId, target_pages: 15 }),
      })
    }
    await load()
  }

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="skeleton h-20 w-full mb-3 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 pt-12 tab-content">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={28} style={{ color: '#FF6B35' }} />
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
            {user.name}&apos;s Schedule
          </h1>
        </div>
        <button
          onClick={autoFill}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#00C9A7' }}
        >
          <Sparkles size={14} /> Auto-fill
        </button>
      </div>

      {schedule.map((slot) => {
        const book = books.find((b) => b.id === slot.book_id)
        const isToday = slot.day_of_week === todayDow
        const currentPage = book ? getCurrentPage(book.id, logs) : 0
        const percent = book ? progressPercent(currentPage, book.total_pages) : 0
        const color = book ? (CATEGORY_COLORS[book.category] ?? '#FF6B35') : '#9A9A9A'
        const isEditing = editDay === slot.day_of_week

        return (
          <div
            key={slot.day_of_week}
            className="rounded-2xl p-4 mb-3"
            style={{
              background: '#FFFFFF',
              boxShadow: isToday ? `0 2px 16px ${user.avatar_color}40` : '0 2px 16px rgba(0,0,0,0.06)',
              border: isToday ? `2px solid ${user.avatar_color}` : '2px solid transparent',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isToday ? user.avatar_color : '#F0E8E0',
                    color: isToday ? '#FFFFFF' : '#9A9A9A',
                  }}
                >
                  {DAY_NAMES[slot.day_of_week]}
                </span>
                {isToday && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: user.avatar_color + '20', color: user.avatar_color }}>
                    Today
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditDay(isEditing ? null : slot.day_of_week)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: isEditing ? user.avatar_color + '20' : '#F0E8E0' }}
                aria-label="Edit day"
              >
                <Pencil size={14} color={isEditing ? user.avatar_color : '#9A9A9A'} />
              </button>
            </div>

            {book ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CategoryIcon category={book.category} size={13} containerSize={24} />
                  <span className="font-bold text-sm">{book.title}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#F0E8E0', color: '#9A9A9A' }}>
                    {book.language}
                  </span>
                </div>
                <ProgressBar percent={percent} color={color} height={6} />
                <div className="text-xs mt-1" style={{ color: '#9A9A9A' }}>
                  p.{currentPage}/{book.total_pages} · target {slot.target_pages} pages/day
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Star size={14} style={{ color: '#FFD93D' }} />
                <p className="text-sm font-bold" style={{ color: '#9A9A9A' }}>Rest day</p>
              </div>
            )}

            {isEditing && (
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #F0E8E0' }}>
                <select
                  defaultValue={slot.book_id ?? ''}
                  onChange={(e) => updateSchedule(slot.day_of_week, e.target.value || null)}
                  className="rounded-xl border-2 px-3 py-2 font-semibold outline-none"
                  style={{ borderColor: '#F0E8E0', background: '#FFF8F0' }}
                  disabled={saving === slot.day_of_week}
                >
                  <option value="">☆ Rest day</option>
                  {books.filter((b) => !isComplete(b, logs)).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold" style={{ color: '#9A9A9A' }}>Pages/day:</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={slot.target_pages}
                    min={1}
                    max={100}
                    className="w-20 rounded-xl border-2 px-3 py-2 font-bold text-center outline-none"
                    style={{ borderColor: '#F0E8E0', background: '#FFF8F0' }}
                    onBlur={(e) => updateSchedule(slot.day_of_week, slot.book_id, parseInt(e.target.value) || 15)}
                  />
                </div>
                {saving === slot.day_of_week && (
                  <p className="text-xs font-bold" style={{ color: '#FF6B35' }}>Saving...</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
