'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/UserContext'
import { DAY_NAMES, LANGUAGES, Language, ReadingPlan } from '@/lib/types'
import { ChevronLeft, ClipboardList } from 'lucide-react'

type DraftRow = {
  day_of_week: number
  language: Language | ''       // '' = Any / Rest
  target_pages: number
  saving?: boolean
}

const emptyDraft = (dow: number): DraftRow => ({
  day_of_week: dow,
  language: '',
  target_pages: 15,
})

// Goal-based plan editor: for each day of week, pick a target language and
// a daily page target. There's no "generate" step anymore — the schedule
// view simply derives the goal for each calendar date from this template.
export default function ReadingPlanPage() {
  const router = useRouter()
  const { user } = useUser()
  const [rows, setRows] = useState<DraftRow[]>(
    Array.from({ length: 7 }, (_, i) => emptyDraft(i)),
  )
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const res = await fetch(`/api/reading-plan?user_id=${user!.id}`)
      const data: ReadingPlan[] = await res.json()
      const next = Array.from({ length: 7 }, (_, i) => emptyDraft(i))
      for (const p of data) {
        next[p.day_of_week] = {
          day_of_week: p.day_of_week,
          language: (p.language as Language) ?? '',
          target_pages: p.target_pages,
        }
      }
      setRows(next)
      setLoading(false)
    }
    load()
  }, [user])

  async function saveRow(dow: number, patch: Partial<DraftRow>) {
    if (!user) return
    setMessage(null)
    setRows((prev) => prev.map((r) => (r.day_of_week === dow ? { ...r, ...patch, saving: true } : r)))
    const row = { ...rows[dow], ...patch }
    const res = await fetch('/api/reading-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        day_of_week: dow,
        language: row.language || null,
        target_pages: row.target_pages,
      }),
    })
    setRows((prev) => prev.map((r) => (r.day_of_week === dow ? { ...r, saving: false } : r)))
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setMessage({ kind: 'error', text: `Couldn't save ${DAY_NAMES[dow]}: ${err?.error ?? 'unknown'}` })
    } else {
      setMessage({ kind: 'ok', text: 'Saved.' })
      setTimeout(() => setMessage(null), 1500)
    }
  }

  if (!user || loading) {
    return (
      <div className="p-4 pt-12">
        <div className="skeleton h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="skeleton h-14 w-full mb-2 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color="var(--color-muted)" />
        </button>
        <ClipboardList size={24} style={{ color: '#FF6B35' }} />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          Reading Plan
        </h1>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
        Pick a language and page target for each day. {user.name} picks the book at log time —
        these are just the daily goals.
      </p>

      {/* 7-row editor */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: 'var(--color-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {rows.map((row, idx) => (
          <div key={row.day_of_week}>
            {idx > 0 && <div style={{ height: 1, background: 'var(--color-surface)', margin: '0 12px' }} />}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
              >
                {DAY_NAMES[row.day_of_week]}
              </span>
              <select
                value={row.language}
                onChange={(e) => saveRow(row.day_of_week, { language: e.target.value as Language | '' })}
                className="flex-1 min-w-0 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
                aria-label={`Language for ${DAY_NAMES[row.day_of_week]}`}
              >
                <option value="">Rest day</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={row.target_pages}
                onChange={(e) => {
                  const n = parseInt(e.target.value)
                  setRows((prev) => prev.map((r) => (r.day_of_week === row.day_of_week ? { ...r, target_pages: isNaN(n) ? 0 : n } : r)))
                }}
                onBlur={(e) => {
                  const n = Math.max(1, Math.min(200, parseInt(e.target.value) || 15))
                  saveRow(row.day_of_week, { target_pages: n })
                }}
                disabled={!row.language}
                className="w-16 rounded-xl border-2 px-2 py-2 font-bold text-sm text-center outline-none disabled:opacity-40"
                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
                aria-label={`Target pages for ${DAY_NAMES[row.day_of_week]}`}
              />
              <span className="text-[10px] font-bold w-6" style={{ color: 'var(--color-muted)' }}>
                pg{row.saving ? '…' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div
          className="rounded-xl p-3 text-sm font-bold"
          style={{
            background: message.kind === 'ok' ? 'var(--success-bg)' : 'var(--error-bg)',
            color: message.kind === 'ok' ? 'var(--success-fg)' : 'var(--error-fg)',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
