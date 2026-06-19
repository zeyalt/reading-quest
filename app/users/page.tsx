'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, AVATAR_OPTIONS, AVATAR_COLORS } from '@/lib/types'
import { useUser } from '@/components/UserContext'
import { BookOpen, Trash2, Hand, Pencil, Check, X } from 'lucide-react'

export default function UsersPage() {
  const router = useRouter()
  const { setUser } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👦')
  // Real hex (not a CSS var) — this value is persisted as avatar_color and is
  // also concatenated with alpha suffixes (e.g. `color + '20'`) for tints.
  const [color, setColor] = useState('#FF6B35')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')

  async function load() {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data)
    setLoading(false)
    if (data.length === 0) setShowAdd(true)
  }

  useEffect(() => { load() }, [])

  function selectUser(u: User) {
    setUser(u)
    router.push('/')
  }

  async function handleAdd() {
    if (!name.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), avatar_emoji: emoji, avatar_color: color }),
    })
    if (res.ok) {
      const newUser = await res.json()
      setUser(newUser)
      router.push('/')
    } else {
      setError('Failed to add reader.')
      setSaving(false)
    }
  }

  function startEdit(u: User, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(u.id)
    setEditName(u.name)
    setEditEmoji(u.avatar_emoji)
    setEditColor(u.avatar_color)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim(), avatar_emoji: editEmoji, avatar_color: editColor }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      setEditingId(null)
    } else {
      setError('Failed to update reader.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Remove this reader? Their reading history will be deleted.')) return
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="p-4 tab-content min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="text-center pt-6 pb-6">
        <div className="flex justify-center mb-3">
          <span
            className="flex items-center justify-center pop"
            style={{
              ['--i' as string]: 0,
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--candy-orange)',
              border: '2.5px solid var(--ink)',
              boxShadow: '4px 5px 0 0 var(--ink)',
              color: '#fff',
            }}
          >
            <BookOpen size={34} />
          </span>
        </div>
        <h1 className="text-3xl" style={{ color: 'var(--candy-orange-ink)' }}>
          ReadQuest
        </h1>
        <p className="text-sm mt-1 font-extrabold" style={{ color: 'var(--color-muted)' }}>
          Who&apos;s reading today?
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* User cards */}
          <div className="space-y-3 mb-4">
            {users.map((u) => {
              const isEditing = editingId === u.id
              return (
                <div
                  key={u.id}
                  onClick={() => !isEditing && selectUser(u)}
                  className={isEditing ? 'sticker p-4' : 'sticker sticker-press pop p-4 cursor-pointer'}
                  style={{ background: 'var(--color-card)' }}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="w-full rounded-xl border-2 px-3 py-2 font-semibold outline-none"
                        style={{ borderColor: 'var(--color-surface)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                        autoFocus
                      />
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-muted)' }}>Avatar</p>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_OPTIONS.map((e) => (
                            <button
                              key={e}
                              onClick={() => setEditEmoji(e)}
                              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                              style={{
                                background: editEmoji === e ? editColor + '30' : 'var(--color-surface)',
                                border: editEmoji === e ? `2px solid ${editColor}` : '2px solid transparent',
                              }}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-muted)' }}>Color</p>
                        <div className="flex gap-2">
                          {AVATAR_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setEditColor(c)}
                              className="w-8 h-8 rounded-full transition-all"
                              style={{
                                background: c,
                                outline: editColor === c ? `3px solid ${c}` : 'none',
                                outlineOffset: 2,
                              }}
                              aria-label={c}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="sticker-sm sticker-press flex-1 py-2 font-extrabold flex items-center justify-center gap-1"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(u.id)}
                          disabled={saving}
                          className="sticker-sm sticker-press flex-1 py-2 font-extrabold text-white flex items-center justify-center gap-1"
                          style={{ background: editColor }}
                        >
                          <Check size={16} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div
                        className="w-14 h-14 flex items-center justify-center text-2xl font-extrabold flex-shrink-0"
                        style={{ background: u.avatar_color, color: '#fff', borderRadius: 16, border: '2px solid var(--ink)', boxShadow: '2px 2px 0 0 var(--ink)' }}
                      >
                        {getInitials(u.name) || u.avatar_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xl font-bold"
                          style={{ fontFamily: 'var(--font-baloo), cursive', color: u.avatar_color }}
                        >
                          {u.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Tap to continue reading</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => startEdit(u, e)}
                          className="p-2 rounded-lg"
                          style={{ color: 'var(--color-muted)' }}
                          aria-label="Edit reader"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(u.id, e)}
                          className="p-2 rounded-lg"
                          style={{ color: 'var(--color-muted)' }}
                          aria-label="Remove reader"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add reader button */}
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="sticker-press w-full py-4 font-extrabold text-lg"
              style={{
                background: 'color-mix(in srgb, var(--candy-orange) 12%, var(--color-card))',
                color: 'var(--candy-orange-ink)',
                border: '2.5px dashed var(--candy-orange)',
                borderRadius: 'var(--sticker-radius)',
              }}
            >
              + Add Reader
            </button>
          )}

          {/* Add reader form */}
          {showAdd && (
            <div className="sticker pop p-4" style={{ background: 'var(--color-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                {users.length === 0 && <Hand size={20} style={{ color: 'var(--candy-orange)' }} />}
                <h2 className="text-lg">
                  {users.length === 0 ? 'Add your first reader!' : 'Add a reader'}
                </h2>
              </div>

              {/* Name */}
              <input
                type="text"
                placeholder="Name (e.g. Aiden)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border-2 px-4 py-3 font-bold text-lg outline-none focus:border-orange-400 mb-4"
                style={{ borderColor: 'var(--color-surface)', background: 'var(--color-bg)' }}
                autoFocus
              />

              {/* Emoji picker */}
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-muted)' }}>Choose avatar</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {AVATAR_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                    style={{
                      background: emoji === e ? color + '30' : 'var(--color-surface)',
                      border: emoji === e ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-muted)' }}>Choose colour</p>
              <div className="flex gap-2 mb-4">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{
                      background: c,
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                    aria-label={c}
                  />
                ))}
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--color-bg)' }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: color + '20', color, border: `2px solid ${color}` }}
                >
                  {getInitials(name) || emoji}
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-baloo), cursive', color }}
                >
                  {name || 'Preview'}
                </span>
              </div>

              {error && <p className="text-sm font-bold mb-3" style={{ color: 'var(--error-fg)' }}>{error}</p>}

              <div className="flex gap-2">
                {users.length > 0 && (
                  <button
                    onClick={() => { setShowAdd(false); setError('') }}
                    className="sticker-sm sticker-press flex-1 py-3 font-extrabold"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="sticker-sm sticker-press flex-1 py-3 font-extrabold text-white"
                  style={{ background: color }}
                >
                  {saving ? 'Adding...' : `Let's go! ${emoji}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
