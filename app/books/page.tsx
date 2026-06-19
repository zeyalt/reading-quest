'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, Check, X, Camera, BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Book, ReadingLog, CATEGORIES, CATEGORY_COLORS, LANGUAGES, Category, Language } from '@/lib/types'
import { useUser } from '@/components/UserContext'
import ProgressBar from '@/components/ProgressBar'
import Toast from '@/components/Toast'
import { getCurrentPage, progressPercent, todayLocal } from '@/lib/utils'

type BookForm = {
  title: string
  author: string
  total_pages: string
  category: Category
  language: Language
}

const emptyForm = (): BookForm => ({
  title: '',
  author: '',
  total_pages: '',
  category: 'Fiction',
  language: 'English',
})

type PagesBucket = 'Any' | 'Under 50' | '50–100' | '100–200' | '200–500' | '500+'

const PAGES_BUCKETS: PagesBucket[] = ['Any', 'Under 50', '50–100', '100–200', '200–500', '500+']

type SortKey = 'recent' | 'title' | 'progress' | 'pages'

const SORT_KEYS: SortKey[] = ['recent', 'title', 'progress', 'pages']

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently added',
  title: 'Title A–Z',
  progress: 'Most progress',
  pages: 'Most pages',
}

function matchesPagesBucket(pages: number, bucket: PagesBucket): boolean {
  switch (bucket) {
    case 'Any': return true
    case 'Under 50': return pages < 50
    case '50–100': return pages >= 50 && pages <= 100
    case '100–200': return pages > 100 && pages <= 200
    case '200–500': return pages > 200 && pages <= 500
    case '500+': return pages > 500
  }
}

export default function BooksPage() {
  const { user } = useUser()
  const [books, setBooks] = useState<Book[]>([])
  const [logs, setLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<BookForm>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  // Inline editing only changes the current page; the book's other fields aren't
  // editable here, so we just track the page being entered.
  const [editPage, setEditPage] = useState<string>('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Deferred delete: when a book is removed we hide it immediately and show an
  // undo toast. The real API DELETE only fires when the toast is dismissed
  // (no undo). Undo restores the row to its original position with no API call.
  const [pendingDelete, setPendingDelete] = useState<{ book: Book; index: number } | null>(null)
  // Tracks the toast-owner's settle so an unmount mid-flight still commits.
  const pendingRef = useRef<{ book: Book; index: number } | null>(null)
  pendingRef.current = pendingDelete

  // Filters
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<Category | 'All'>('All')
  const [pagesFilter, setPagesFilter] = useState<PagesBucket>('Any')
  const [sortBy, setSortBy] = useState<SortKey>('recent')

  // Pagination — show the library in pages of 20 so it never gets unwieldy.
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  const filtersActive = search.trim() !== '' || genreFilter !== 'All' || pagesFilter !== 'Any'
  function clearFilters() {
    setSearch('')
    setGenreFilter('All')
    setPagesFilter('Any')
  }

  async function load() {
    if (!user) return
    const [bRes, lRes] = await Promise.all([
      fetch('/api/books'),
      fetch(`/api/reading-log?user_id=${user.id}&limit=200`),
    ])
    setBooks(await bRes.json())
    setLogs(await lRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  // If the user leaves the page with a delete still pending, commit it on
  // unmount so the action isn't silently lost (the toast just never expired).
  useEffect(() => {
    return () => { if (pendingRef.current) commitPendingDelete() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Jump back to the first page whenever the result set changes (new search,
  // genre, length bucket, or sort) so the user isn't stranded on an empty page.
  useEffect(() => {
    setPage(1)
  }, [search, genreFilter, pagesFilter, sortBy])

  async function handleAdd() {
    if (!form.title.trim() || !form.total_pages) { setError('Title and page count are required.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        author: form.author.trim() || null,
        total_pages: parseInt(form.total_pages),
        category: form.category,
        language: form.language,
        cover_color: CATEGORY_COLORS[form.category],
      }),
    })
    if (res.ok) { setForm(emptyForm()); setShowAdd(false); await load() }
    else setError('Failed to add book.')
    setSaving(false)
  }

  function handleDelete(bookId: string) {
    const index = books.findIndex((bk) => bk.id === bookId)
    if (index === -1) return
    const book = books[index]

    // If another delete is already pending, commit it first so we never lose
    // a book by stacking deletes.
    if (pendingRef.current) commitPendingDelete()

    setBooks((b) => b.filter((bk) => bk.id !== bookId))
    if (editingId === bookId) setEditingId(null)
    setPendingDelete({ book, index })
  }

  // Fire the real API DELETE for the currently pending book and clear it.
  function commitPendingDelete() {
    const pending = pendingRef.current
    if (!pending) return
    setPendingDelete(null)
    fetch(`/api/books/${pending.book.id}`, { method: 'DELETE' }).catch(() => {
      // On failure, put the book back so the user isn't silently misled.
      setBooks((b) => {
        if (b.some((bk) => bk.id === pending.book.id)) return b
        const next = [...b]
        next.splice(Math.min(pending.index, next.length), 0, pending.book)
        return next
      })
      setError('Could not delete the book. It has been restored.')
    })
  }

  function undoPendingDelete() {
    const pending = pendingRef.current
    if (!pending) return
    setBooks((b) => {
      if (b.some((bk) => bk.id === pending.book.id)) return b
      const next = [...b]
      next.splice(Math.min(pending.index, next.length), 0, pending.book)
      return next
    })
    setPendingDelete(null)
  }

  function startEdit(book: Book) {
    setEditingId(book.id)
    setEditPage(String(getCurrentPage(book.id, logs)))
    setError('')
  }

  async function handleSaveEdit(bookId: string) {
    const book = books.find((b) => b.id === bookId)
    if (!book) return
    setSaving(true)
    setError('')
    const currentPage = Math.min(Math.max(0, parseInt(editPage) || 0), book.total_pages)

    const res = await fetch('/api/reading-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user!.id, book_id: bookId, current_page: currentPage, date: todayLocal() }),
    })
    if (!res.ok) { setError('Failed to update page.'); setSaving(false); return }

    const today = todayLocal()
    setLogs((prev) => {
      const filtered = prev.filter((l) => !(l.book_id === bookId && l.date === today))
      return [...filtered, { id: 'tmp', user_id: user!.id, book_id: bookId, date: today, current_page: currentPage, logged_at: new Date().toISOString() }]
    })
    setEditingId(null)
    setSaving(false)
  }

  // Apply filters before grouping. AND-combined: search, genre, pages bucket.
  const searchLower = search.trim().toLowerCase()
  const filteredBooks = books.filter((b) => {
    if (searchLower) {
      const title = b.title.toLowerCase()
      const author = (b.author ?? '').toLowerCase()
      if (!title.includes(searchLower) && !author.includes(searchLower)) return false
    }
    if (genreFilter !== 'All' && b.category !== genreFilter) return false
    if (!matchesPagesBucket(b.total_pages, pagesFilter)) return false
    return true
  })

  // One flat, sorted list. Genre is shown as a chip on each row instead of
  // grouping the library into per-genre sections.
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'progress': {
        const pa = progressPercent(getCurrentPage(a.id, logs), a.total_pages)
        const pb = progressPercent(getCurrentPage(b.id, logs), b.total_pages)
        return pb - pa
      }
      case 'pages':
        return b.total_pages - a.total_pages
      case 'recent':
      default:
        return b.created_at.localeCompare(a.created_at)
    }
  })

  // Paginate the sorted/filtered list. Clamp the page so it stays valid when
  // the result set shrinks (filter applied, book deleted, etc.).
  const totalPages = Math.max(1, Math.ceil(sortedBooks.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pagedBooks = sortedBooks.slice(pageStart, pageStart + PAGE_SIZE)

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14 w-full mb-2 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 tab-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl">Book Library</h1>
          <p className="text-xs font-extrabold" style={{ color: 'var(--color-muted)' }}>{books.length} books · shared collection</p>
        </div>
        <div className="flex gap-2">
          <Link href="/books/add-photo"
            className="sticker-sm sticker-press flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold"
            style={{ background: 'var(--candy-sky)', color: '#fff' }}>
            <Camera size={15} /> Scan
          </Link>
          <button onClick={() => { setShowAdd((s) => !s); setError('') }}
            className="sticker-sm sticker-press flex items-center gap-1.5 px-3 py-2 text-sm font-extrabold text-white"
            style={{ background: 'var(--candy-orange)' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="sticker pop p-4 mb-4" style={{ background: 'color-mix(in srgb, var(--candy-sun) 14%, var(--color-card))' }}>
          <h2 className="text-lg mb-3">Add a Book</h2>
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="Title *" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-xl border-2 px-3 py-2.5 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
            <input type="text" placeholder="Author" value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="rounded-xl border-2 px-3 py-2.5 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
            <input type="number" inputMode="numeric" placeholder="Total pages *" value={form.total_pages}
              onChange={(e) => setForm((f) => ({ ...f, total_pages: e.target.value }))}
              className="rounded-xl border-2 px-3 py-2.5 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
            <div className="flex gap-2">
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                className="flex-1 rounded-xl border-2 px-3 py-2.5 font-semibold text-sm outline-none"
                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as Language }))}
                className="flex-1 rounded-xl border-2 px-3 py-2.5 font-semibold text-sm outline-none"
                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {error && <p className="text-xs font-bold" style={{ color: 'var(--error-fg)' }}>{error}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={() => { setShowAdd(false); setError('') }}
                className="sticker-sm sticker-press flex-1 flex items-center justify-center gap-1.5 py-2.5 font-extrabold text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                <X size={14} /> Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="sticker-sm sticker-press flex-1 flex items-center justify-center gap-1.5 py-2.5 font-extrabold text-sm text-white"
                style={{ background: 'var(--candy-teal)' }}>
                <Check size={14} /> {saving ? 'Adding…' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters — only shown when there are books to filter */}
      {books.length > 0 && (
        <div className="mb-4">
          <div className="relative mb-2">
            <Search size={16} color="var(--color-muted)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or author…"
              className="w-full rounded-xl border-2 pl-9 pr-9 py-2.5 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-surface)' }}
                aria-label="Clear search"
              >
                <X size={12} color="var(--color-muted)" />
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value as Category | 'All')}
              className="flex-1 min-w-0 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
              aria-label="Filter by genre"
            >
              <option value="All">All genres</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={pagesFilter}
              onChange={(e) => setPagesFilter(e.target.value as PagesBucket)}
              className="flex-1 min-w-0 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
              aria-label="Filter by total pages"
            >
              {PAGES_BUCKETS.map((b) => (
                <option key={b} value={b}>{b === 'Any' ? 'Any length' : `${b} pages`}</option>
              ))}
            </select>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="w-full mt-2 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
            style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
            aria-label="Sort books"
          >
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>Sort: {SORT_LABELS[k]}</option>
            ))}
          </select>
          {filtersActive && (
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
                {filteredBooks.length} of {books.length} {books.length === 1 ? 'book' : 'books'}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: 'var(--color-primary)' }}
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination — only when the filtered list spans more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={safePage <= 1}
            className="sticker-sm sticker-press flex items-center gap-1 px-3 py-2 text-sm font-extrabold disabled:opacity-40"
            style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span className="text-xs font-extrabold" style={{ color: 'var(--color-muted)' }}>
            Page {safePage} of {totalPages}
          </span>

          <button
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={safePage >= totalPages}
            className="sticker-sm sticker-press flex items-center gap-1 px-3 py-2 text-sm font-extrabold disabled:opacity-40"
            style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Flat book list — genre shown as a chip on each row */}
      {sortedBooks.length > 0 && (
        <div className="sticker overflow-hidden" style={{ background: 'var(--color-card)' }}>
          {pagedBooks.map((book, idx) => {
            const cp = getCurrentPage(book.id, logs)
            const pct = progressPercent(cp, book.total_pages)
            const complete = cp >= book.total_pages
            const isEditing = editingId === book.id
            const color = CATEGORY_COLORS[book.category]

            return (
              <div key={book.id}>
                {idx > 0 && <div style={{ height: 1, background: 'var(--color-surface)', margin: '0 12px' }} />}

                <div className="px-3 py-2.5">
                  {/* Row 1: title + genre chip + author + actions */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--color-text)' }}>{book.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '1A', color }}>
                          {book.category}
                        </span>
                        {book.author && (
                          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{book.author}</span>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleSaveEdit(book.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity flex items-center justify-center"
                          style={{ background: 'var(--color-primary)' }}
                          aria-label="Confirm page"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1.5 rounded-lg hover:opacity-70 transition-opacity flex items-center justify-center"
                          aria-label="Cancel"
                        >
                          <X size={16} color="var(--color-muted)" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(book)}
                          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity flex items-center justify-center"
                          aria-label="Edit page"
                        >
                          <Pencil size={15} color="var(--color-primary)" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="p-1.5 rounded-lg hover:opacity-70 text-red-600 transition-opacity flex items-center justify-center"
                          aria-label="Delete book"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: page count + inline progress */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editPage}
                        onChange={(e) => setEditPage(e.target.value)}
                        max={book.total_pages}
                        className="w-16 px-2 py-1 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        style={{ color: 'var(--color-text)', borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}
                        autoFocus
                      />
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>of {book.total_pages}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                        {cp}<span className="font-normal" style={{ color: 'var(--color-muted)' }}> / {book.total_pages}</span>
                      </span>
                      <div className="flex-1">
                        <ProgressBar percent={pct} color={color} height={5} />
                      </div>
                      {complete ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                          style={{ background: 'var(--success-bg)', color: 'var(--success-fg)' }}>Done</span>
                      ) : (
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{pct}%</span>
                      )}
                    </div>
                  )}

                  {error && isEditing && (
                    <p className="text-xs font-bold mt-1.5" style={{ color: '#EE4266' }}>{error}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {books.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
          <BookOpen size={48} color="var(--color-surface)" className="mx-auto mb-3" />
          <p className="font-bold">No books yet!</p>
          <p className="text-sm">Add a book or scan your shelf.</p>
        </div>
      )}

      {books.length > 0 && filteredBooks.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <Search size={40} color="var(--color-surface)" className="mx-auto mb-3" />
          <p className="font-bold">No matches</p>
          <p className="text-sm mb-3">Try a different search or clear the filters.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <X size={14} /> Clear filters
          </button>
        </div>
      )}

      {pendingDelete && (
        <Toast
          key={pendingDelete.book.id}
          message={`Deleted “${pendingDelete.book.title}”`}
          onUndo={undoPendingDelete}
          onDismiss={commitPendingDelete}
        />
      )}
    </div>
  )
}
