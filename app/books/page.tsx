'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, Check, X, Camera, ChevronDown, ChevronUp, BookOpen, Search } from 'lucide-react'
import { Book, ReadingLog, CATEGORIES, CATEGORY_COLORS, LANGUAGES, Category, Language } from '@/lib/types'
import { useUser } from '@/components/UserContext'
import CategoryIcon from '@/components/CategoryIcon'
import ProgressBar from '@/components/ProgressBar'
import { getCurrentPage, progressPercent, todaySGT } from '@/lib/utils'

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
  const [editForm, setEditForm] = useState<BookForm & { current_page: string }>({ ...emptyForm(), current_page: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<Category | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<Category | 'All'>('All')
  const [pagesFilter, setPagesFilter] = useState<PagesBucket>('Any')
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

  async function handleDelete(bookId: string) {
    await fetch(`/api/books/${bookId}`, { method: 'DELETE' })
    setBooks((b) => b.filter((bk) => bk.id !== bookId))
    if (editingId === bookId) setEditingId(null)
  }

  function startEdit(book: Book) {
    const cp = getCurrentPage(book.id, logs)
    setEditingId(book.id)
    setEditForm({ title: book.title, author: book.author ?? '', total_pages: String(book.total_pages), category: book.category, language: book.language, current_page: String(cp) })
    setError('')
  }

  async function handleSaveEdit(bookId: string) {
    if (!editForm.title.trim() || !editForm.total_pages) { setError('Title and page count are required.'); return }
    setSaving(true)
    setError('')
    const totalPages = parseInt(editForm.total_pages)
    const currentPage = Math.min(Math.max(0, parseInt(editForm.current_page) || 0), totalPages)

    const res = await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title.trim(), author: editForm.author.trim() || null,
        total_pages: totalPages, category: editForm.category,
        language: editForm.language, cover_color: CATEGORY_COLORS[editForm.category],
      }),
    })
    if (!res.ok) { setError('Failed to update book.'); setSaving(false); return }
    const updated = await res.json()
    setBooks((prev) => prev.map((b) => (b.id === bookId ? updated : b)))

    await fetch('/api/reading-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user!.id, book_id: bookId, current_page: currentPage, date: todaySGT() }),
    })
    const today = todaySGT()
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

  const grouped = CATEGORIES.reduce<Record<Category, Book[]>>(
    (acc, cat) => { acc[cat] = filteredBooks.filter((b) => b.category === cat); return acc },
    {} as Record<Category, Book[]>,
  )

  if (!user || loading) {
    return (
      <div className="p-4 pt-12">
        <div className="skeleton h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14 w-full mb-2 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 pt-12 tab-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Book Library</h1>
          <p className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>{books.length} books · shared collection</p>
        </div>
        <div className="flex gap-2">
          <Link href="/books/add-photo"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--color-bg)', color: '#FF6B35' }}>
            <Camera size={15} /> Scan
          </Link>
          <button onClick={() => { setShowAdd((s) => !s); setError('') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#FF6B35' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--color-bg)', border: '2px solid #FFD93D' }}>
          <h2 className="font-bold mb-3" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>Add a Book</h2>
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
            {error && <p className="text-xs font-bold" style={{ color: '#EE4266' }}>{error}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={() => { setShowAdd(false); setError('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
                <X size={14} /> Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: '#FF6B35' }}>
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
            <Search size={16} color="#9A9A9A" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <X size={12} color="#9A9A9A" />
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
          {filtersActive && (
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
                {filteredBooks.length} of {books.length} {books.length === 1 ? 'book' : 'books'}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: '#FF6B35' }}
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Books grouped by category */}
      {CATEGORIES.map((cat) => {
        const catBooks = grouped[cat]
        if (catBooks.length === 0) return null
        const color = CATEGORY_COLORS[cat]
        const isOpen = expandedCategory === cat || expandedCategory === null

        return (
          <div key={cat} className="mb-3">
            {/* Category header */}
            <button
              className="w-full flex items-center justify-between px-1 py-1.5 mb-1"
              onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
            >
              <div className="flex items-center gap-2">
                <CategoryIcon category={cat} size={14} containerSize={26} />
                <span className="text-sm font-bold" style={{ color }}>{cat}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: color + '18', color }}>{catBooks.length}</span>
              </div>
              {expandedCategory === cat
                ? <ChevronUp size={16} color="#C0B8B0" />
                : <ChevronDown size={16} color="#C0B8B0" />}
            </button>

            {/* Book rows */}
            {(expandedCategory === null || expandedCategory === cat) && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                {catBooks.map((book, idx) => {
                  const cp = getCurrentPage(book.id, logs)
                  const pct = progressPercent(cp, book.total_pages)
                  const complete = cp >= book.total_pages
                  const isEditing = editingId === book.id

                  return (
                    <div key={book.id}>
                      {idx > 0 && <div style={{ height: 1, background: 'var(--color-surface)', margin: '0 12px' }} />}

                      {/* Main row */}
                      <div className="px-3 pt-3 pb-2">
                        <div className="flex items-center gap-2.5">
                          <CategoryIcon category={book.category} size={16} containerSize={34} />

                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold leading-tight truncate max-w-[160px]">{book.title}</span>
                              {complete && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                                  style={{ background: '#d4edda', color: '#155724' }}>Done</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {book.author && (
                                <span className="text-[11px] truncate max-w-[130px]" style={{ color: 'var(--color-muted)' }}>{book.author}</span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>{book.language}</span>
                            </div>
                          </div>

                          {/* Progress % */}
                          <span className="text-sm font-bold flex-shrink-0" style={{ color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>

                          {/* Actions */}
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => isEditing ? setEditingId(null) : startEdit(book)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: isEditing ? color + '20' : '#F5EFE8' }}
                              aria-label="Edit">
                              <Pencil size={13} color={isEditing ? color : '#9A9A9A'} />
                            </button>
                            <button onClick={() => handleDelete(book.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: 'var(--color-surface)' }}
                              aria-label="Delete">
                              <Trash2 size={13} color="#C0B8B0" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 pl-[46px]">
                          <ProgressBar percent={pct} color={color} height={5} />
                          <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--color-subtle)' }}>
                            p.{cp} / {book.total_pages}
                          </span>
                        </div>
                      </div>

                      {/* Edit panel */}
                      {isEditing && (
                        <div className="mx-3 mb-3 p-3 rounded-xl flex flex-col gap-2"
                          style={{ background: 'var(--color-bg)', border: `1.5px solid ${color}30` }}>
                          <input type="text" value={editForm.title}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Title *"
                            className="rounded-lg border-2 px-3 py-2 text-sm font-semibold outline-none"
                            style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
                          <input type="text" value={editForm.author}
                            onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))}
                            placeholder="Author"
                            className="rounded-lg border-2 px-3 py-2 text-sm font-semibold outline-none"
                            style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--color-muted)' }}>Total pages</label>
                              <input type="number" inputMode="numeric" value={editForm.total_pages}
                                onChange={(e) => setEditForm((f) => ({ ...f, total_pages: e.target.value }))}
                                className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold outline-none"
                                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--color-muted)' }}>Current page</label>
                              <input type="number" inputMode="numeric" value={editForm.current_page}
                                onChange={(e) => setEditForm((f) => ({ ...f, current_page: e.target.value }))}
                                className="w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold outline-none"
                                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <select value={editForm.category}
                              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as Category }))}
                              className="flex-1 rounded-lg border-2 px-2 py-2 text-sm font-semibold outline-none"
                              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}>
                              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={editForm.language}
                              onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value as Language }))}
                              className="flex-1 rounded-lg border-2 px-2 py-2 text-sm font-semibold outline-none"
                              style={{ borderColor: 'var(--color-surface)', background: 'var(--color-card)' }}>
                              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          {error && <p className="text-xs font-bold" style={{ color: '#EE4266' }}>{error}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-sm"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
                              <X size={13} /> Cancel
                            </button>
                            <button onClick={() => handleSaveEdit(book.id)} disabled={saving}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-sm text-white"
                              style={{ background: color }}>
                              <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {books.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
          <BookOpen size={48} color="#F0E8E0" className="mx-auto mb-3" />
          <p className="font-bold">No books yet!</p>
          <p className="text-sm">Add a book or scan your shelf.</p>
        </div>
      )}

      {books.length > 0 && filteredBooks.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <Search size={40} color="#F0E8E0" className="mx-auto mb-3" />
          <p className="font-bold">No matches</p>
          <p className="text-sm mb-3">Try a different search or clear the filters.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white"
            style={{ background: '#FF6B35' }}
          >
            <X size={14} /> Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
