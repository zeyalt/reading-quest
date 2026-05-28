'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Check, Loader2 } from 'lucide-react'
import type { Book, ReadingLog } from '@/lib/types'
import CategoryIcon from '@/components/CategoryIcon'

interface Props {
  userId: string
  date: string                  // YYYY-MM-DD; the date being logged against
  books: Book[]                 // user's active books (any language)
  logs: ReadingLog[]            // ALL the user's logs; used to compute deltas
  onChanged: () => void         // called after any successful add/edit/delete so parent can refetch
}

// One block for logging reading against a single date. Used inline on the
// home page (date = today) and inside a modal on the schedule diary (date =
// any past date). Treats `reading_log.current_page` as the source of truth
// and displays the implied "pages read on this date" delta.
export default function DateLogPanel({ userId, date, books, logs, onChanged }: Props) {
  const [addBookId, setAddBookId] = useState<string>('')
  const [addPage, setAddPage] = useState<string>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  // ---------------- Build per-book state for this date ------------------
  // For each book we know:
  //   - logForDate:  the (book, date) reading_log row, if any
  //   - prevPage:    the latest current_page strictly before `date` (for delta)
  type Row = {
    book: Book
    logId?: string
    currentPage: number | null
    prevPage: number
    deltaPages: number
  }

  const rows: Row[] = useMemo(() => {
    return books.map((book) => {
      const bookLogs = logs.filter((l) => l.book_id === book.id).sort((a, b) => a.date.localeCompare(b.date))
      const logForDate = bookLogs.find((l) => l.date === date)
      const prevLog = [...bookLogs].reverse().find((l) => l.date < date)
      const prevPage = prevLog?.current_page ?? 0
      const currentPage = logForDate?.current_page ?? null
      return {
        book,
        logId: logForDate?.id,
        currentPage,
        prevPage,
        deltaPages: currentPage == null ? 0 : Math.max(0, currentPage - prevPage),
      }
    })
  }, [books, logs, date])

  const existing = rows.filter((r) => r.currentPage != null)
  const eligibleForAdd = rows.filter((r) => r.currentPage == null)

  // ---------------------------- Mutations ----------------------------
  async function upsertLog(bookId: string, currentPage: number) {
    setBusy(bookId)
    setError('')
    const res = await fetch('/api/reading-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, book_id: bookId, current_page: currentPage, date }),
    })
    setBusy(null)
    if (!res.ok) {
      const e = await res.json().catch(() => null)
      setError(e?.error ?? 'Save failed')
      return
    }
    onChanged()
  }

  async function deleteLog(bookId: string) {
    if (!confirm('Remove this log entry?')) return
    setBusy(bookId)
    setError('')
    const res = await fetch('/api/reading-log', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, book_id: bookId, date }),
    })
    setBusy(null)
    if (!res.ok) {
      const e = await res.json().catch(() => null)
      setError(e?.error ?? 'Delete failed')
      return
    }
    onChanged()
  }

  async function handleAdd() {
    if (!addBookId) { setError('Pick a book.'); return }
    const book = books.find((b) => b.id === addBookId)
    if (!book) return
    const page = parseInt(addPage)
    if (!Number.isFinite(page) || page < 0 || page > book.total_pages) {
      setError(`Page must be 0–${book.total_pages}.`)
      return
    }
    await upsertLog(addBookId, page)
    setAddBookId('')
    setAddPage('')
  }

  // ----------------------------- UI ----------------------------------

  return (
    <div className="flex flex-col gap-3">
      {existing.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          No reading logged yet for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {existing.map((row) => (
            <ExistingLogRow
              key={row.book.id}
              row={row}
              busy={busy === row.book.id}
              onSave={(p) => upsertLog(row.book.id, p)}
              onDelete={() => deleteLog(row.book.id)}
            />
          ))}
        </div>
      )}

      {/* Add new log */}
      {eligibleForAdd.length > 0 && (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--color-bg)', border: '1.5px dashed #FFD93D' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
            {existing.length === 0 ? 'Log a book' : '+ Add another book'}
          </p>
          <select
            value={addBookId}
            onChange={(e) => setAddBookId(e.target.value)}
            className="rounded-lg border-2 px-3 py-2 font-semibold text-sm outline-none"
            style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
            aria-label="Pick a book"
          >
            <option value="">Pick a book…</option>
            {eligibleForAdd.map((r) => (
              <option key={r.book.id} value={r.book.id}>
                {r.book.title} {r.book.language && `(${r.book.language})`} — p.{r.prevPage}/{r.book.total_pages}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Page reached"
              min={0}
              value={addPage}
              onChange={(e) => setAddPage(e.target.value)}
              className="flex-1 rounded-lg border-2 px-3 py-2 font-bold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!addBookId || !addPage || busy === addBookId}
              className="flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-sm text-white disabled:opacity-50"
              style={{ background: '#FF6B35' }}
            >
              {busy === addBookId ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Log
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold" style={{ color: '#EE4266' }}>{error}</p>
      )}
    </div>
  )
}

// One existing log row: editable page input, derived delta hint, delete button.
function ExistingLogRow({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: { book: Book; currentPage: number | null; prevPage: number; deltaPages: number }
  busy: boolean
  onSave: (page: number) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<string>(String(row.currentPage ?? ''))
  const dirty = draft !== String(row.currentPage ?? '')

  function commit() {
    if (!dirty) return
    const p = parseInt(draft)
    if (!Number.isFinite(p) || p < 0 || p > row.book.total_pages) {
      setDraft(String(row.currentPage ?? ''))
      return
    }
    onSave(p)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-surface)' }}>
      <CategoryIcon category={row.book.category} size={12} containerSize={26} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{row.book.title}</p>
        <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
          {row.deltaPages > 0 ? `+${row.deltaPages} pages from p.${row.prevPage}` : `no change from p.${row.prevPage}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold" style={{ color: 'var(--color-muted)' }}>p.</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={row.book.total_pages}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-16 rounded-lg border-2 px-2 py-1 font-bold text-sm text-center outline-none"
          style={{ borderColor: dirty ? '#FF6B35' : '#F0E8E0', background: dirty ? '#FFF8F0' : '#FFFFFF' }}
        />
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : dirty ? (
          <Check size={14} color="#FF6B35" />
        ) : null}
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Delete log"
        >
          <Trash2 size={12} color="#9A9A9A" />
        </button>
      </div>
    </div>
  )
}
