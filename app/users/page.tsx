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
    <div className="p-4 tab-content min-h-screen" style={{ background: '#FFF8F0' }}>
      {/* Header */}
      <div className="text-center pt-8 pb-6">
        <div className="flex justify-center mb-3">
          <BookOpen size={48} style={{ color: '#FF6B35' }} />
        </div>
        <h1
          className="text-3xl"
          style={{ fontFamily: 'var(--font-fredoka), cursive', color: '#FF6B35' }}
        >
          Reading Quest
        </h1>
        <p className="text-sm mt-1 font-bold" style={{ color: '#9A9A9A' }}>
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
                  className="rounded-2xl p-4 transition-all"
                  style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="w-full rounded-xl border-2 px-3 py-2 font-semibold outline-none"
                        style={{ borderColor: '#F0E8E0' }}
                        autoFocus
                      />
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: '#9A9A9A' }}>Avatar</p>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_OPTIONS.map((e) => (
                            <button
                              key={e}
                              onClick={() => setEditEmoji(e)}
                              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                              style={{
                                background: editEmoji === e ? editColor + '30' : '#F0E8E0',
                                border: editEmoji === e ? `2px solid ${editColor}` : '2px solid transparent',
                              }}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-2" style={{ color: '#9A9A9A' }}>Color</p>
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
                          className="flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1"
                          style={{ background: '#F0E8E0', color: '#9A9A9A' }}
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(u.id)}
                          disabled={saving}
                          className="flex-1 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-1"
                          style={{ background: editColor }}
                        >
                          <Check size={16} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                        style={{ background: u.avatar_color + '20', color: u.avatar_color }}
                      >
                        {getInitials(u.name) || u.avatar_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xl font-bold"
                          style={{ fontFamily: 'var(--font-fredoka), cursive', color: u.avatar_color }}
                        >
                          {u.name}
                        </div>
                        <div className="text-xs" style={{ color: '#9A9A9A' }}>Tap to continue reading</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => startEdit(u, e)}
                          className="p-2 rounded-lg"
                          style={{ color: '#9A9A9A' }}
                          aria-label="Edit reader"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(u.id, e)}
                          className="p-2 rounded-lg"
                          style={{ color: '#9A9A9A' }}
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
              className="w-full py-4 rounded-2xl font-bold text-lg"
              style={{ background: '#FFF0E8', color: '#FF6B35', border: '2px dashed #FF6B35' }}
            >
              + Add Reader
            </button>
          )}

          {/* Add reader form */}
          {showAdd && (
            <div
              className="rounded-2xl p-4"
              style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                {users.length === 0 && <Hand size={20} style={{ color: '#FF6B35' }} />}
                <h2
                  className="text-lg"
                  style={{ fontFamily: 'var(--font-fredoka), cursive' }}
                >
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
                style={{ borderColor: '#F0E8E0', background: '#FFF8F0' }}
                autoFocus
              />

              {/* Emoji picker */}
              <p className="text-xs font-bold mb-2" style={{ color: '#9A9A9A' }}>Choose avatar</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {AVATAR_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                    style={{
                      background: emoji === e ? color + '30' : '#F0E8E0',
                      border: emoji === e ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <p className="text-xs font-bold mb-2" style={{ color: '#9A9A9A' }}>Choose colour</p>
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
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: '#FFF8F0' }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: color + '20', color, border: `2px solid ${color}` }}
                >
                  {getInitials(name) || emoji}
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-fredoka), cursive', color }}
                >
                  {name || 'Preview'}
                </span>
              </div>

              {error && <p className="text-sm font-bold mb-3" style={{ color: '#EE4266' }}>{error}</p>}

              <div className="flex gap-2">
                {users.length > 0 && (
                  <button
                    onClick={() => { setShowAdd(false); setError('') }}
                    className="flex-1 py-3 rounded-xl font-bold"
                    style={{ background: '#F0E8E0', color: '#9A9A9A' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: color, boxShadow: `0 2px 12px ${color}60` }}
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
