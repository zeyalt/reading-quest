'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/UserContext'
import { DAY_NAMES, LANGUAGES, Language, ReadingPlan } from '@/lib/types'
import { ChevronLeft, ClipboardList, Sparkles } from 'lucide-react'

type DraftRow = {
  day_of_week: number
  language: Language | ''       // '' = Any
  target_pages: number
  saving?: boolean
}

const emptyDraft = (dow: number): DraftRow => ({
  day_of_week: dow,
  language: '',
  target_pages: 15,
})

export default function ReadingPlanPage() {
  const router = useRouter()
  const { user } = useUser()
  const [rows, setRows] = useState<DraftRow[]>(
    Array.from({ length: 7 }, (_, i) => emptyDraft(i)),
  )
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<1 | 2 | 3 | 4>(2)
  const [generating, setGenerating] = useState(false)
  const [confirmCount, setConfirmCount] = useState<number | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  // Hydrate from API on load
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
    }
  }

  async function generate(overwrite = false) {
    if (!user) return
    setGenerating(true)
    setMessage(null)
    const res = await fetch('/api/reading-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, weeks, overwrite }),
    })
    setGenerating(false)
    if (res.status === 409) {
      const body = await res.json()
      setConfirmCount(body.existing_count)
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setMessage({ kind: 'error', text: `Couldn't generate: ${err?.error ?? 'unknown'}` })
      return
    }
    const body = await res.json()
    setMessage({
      kind: 'ok',
      text: `Generated ${body.inserted} days${body.overwritten > 0 ? ` (replaced ${body.overwritten})` : ''}.`,
    })
    setConfirmCount(null)
    // Bounce to the schedule view so the user sees the result
    setTimeout(() => router.push('/schedule'), 800)
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

  const accent = user.avatar_color

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl"
          style={{ background: '#F0E8E0' }}
          aria-label="Back"
        >
          <ChevronLeft size={18} color="#9A9A9A" />
        </button>
        <ClipboardList size={24} style={{ color: '#FF6B35' }} />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          Reading Plan
        </h1>
      </div>

      <p className="text-sm mb-4" style={{ color: '#9A9A9A' }}>
        Pick a language for each day. We&apos;ll keep {user.name} on one matching book at a time
        until it&apos;s finished.
      </p>

      {/* 7-row plan editor */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {rows.map((row, idx) => (
          <div key={row.day_of_week}>
            {idx > 0 && <div style={{ height: 1, background: '#F5EFE8', margin: '0 12px' }} />}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: '#F0E8E0', color: '#9A9A9A' }}
              >
                {DAY_NAMES[row.day_of_week]}
              </span>
              <select
                value={row.language}
                onChange={(e) => saveRow(row.day_of_week, { language: e.target.value as Language | '' })}
                className="flex-1 min-w-0 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
                style={{ borderColor: '#F0E8E0', background: '#FFFFFF' }}
                aria-label={`Language for ${DAY_NAMES[row.day_of_week]}`}
              >
                <option value="">Any / Rest day</option>
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
                className="w-16 rounded-xl border-2 px-2 py-2 font-bold text-sm text-center outline-none"
                style={{ borderColor: '#F0E8E0', background: '#FFFFFF' }}
                aria-label={`Target pages for ${DAY_NAMES[row.day_of_week]}`}
              />
              <span className="text-[10px] font-bold w-6" style={{ color: '#9A9A9A' }}>
                pg{row.saving ? '…' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Duration picker + Generate */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <p className="text-xs font-bold mb-2" style={{ color: '#9A9A9A' }}>Generate for…</p>
        <div className="flex gap-2 mb-4">
          {([1, 2, 3, 4] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className="flex-1 py-2 rounded-xl font-bold text-sm"
              style={{
                background: weeks === w ? accent : '#F0E8E0',
                color: weeks === w ? '#FFFFFF' : '#9A9A9A',
                border: weeks === w ? `2px solid ${accent}` : '2px solid transparent',
              }}
            >
              {w} wk
            </button>
          ))}
        </div>
        <button
          onClick={() => generate(false)}
          disabled={generating}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white"
          style={{ background: '#FF6B35', boxShadow: '0 2px 12px #FF6B3560' }}
        >
          <Sparkles size={16} /> {generating ? 'Generating…' : `Generate ${weeks * 7}-day schedule`}
        </button>
      </div>

      {/* Confirm-overwrite dialog */}
      {confirmCount !== null && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFF8F0', border: '2px solid #FFD93D' }}>
          <p className="font-bold mb-2">Replace existing schedule?</p>
          <p className="text-sm mb-3" style={{ color: '#9A9A9A' }}>
            You already have <strong>{confirmCount}</strong> day{confirmCount === 1 ? '' : 's'} planned in this
            window. Generating will overwrite them.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmCount(null)}
              className="flex-1 py-2 rounded-xl font-bold text-sm"
              style={{ background: '#F0E8E0', color: '#9A9A9A' }}
            >
              Cancel
            </button>
            <button
              onClick={() => generate(true)}
              disabled={generating}
              className="flex-1 py-2 rounded-xl font-bold text-sm text-white"
              style={{ background: '#FF6B35' }}
            >
              {generating ? 'Replacing…' : 'Replace'}
            </button>
          </div>
        </div>
      )}

      {/* Inline status message */}
      {message && (
        <div
          className="rounded-xl p-3 text-sm font-bold"
          style={{
            background: message.kind === 'ok' ? '#d4edda' : '#fde8e8',
            color: message.kind === 'ok' ? '#155724' : '#c0392b',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
