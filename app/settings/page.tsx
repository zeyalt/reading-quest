'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/components/UserContext'
import { AVATAR_COLORS, AVATAR_OPTIONS, LANGUAGES, LANGUAGE_FLAGS, Language, User } from '@/lib/types'
import { Settings, UserRound, ClipboardList, Lock, ChevronRight, Check } from 'lucide-react'

// Settings hub: the current reader's profile (open to the kid) plus links to
// their daily reading plan and the PIN-protected parent area.
export default function SettingsPage() {
  const { user, setUser } = useUser()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [color, setColor] = useState('')
  const [mainLang, setMainLang] = useState<Language | ''>('')
  const [secondLang, setSecondLang] = useState<Language | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // The user cached in localStorage may predate newer columns, so load fresh.
  useEffect(() => {
    if (!user) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((all: User[]) => {
        const u = all.find((x) => x.id === user.id) ?? user
        setName(u.name)
        setEmoji(u.avatar_emoji)
        setColor(u.avatar_color)
        setMainLang(u.main_language ?? '')
        setSecondLang(u.second_language ?? '')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function save() {
    if (!user) return
    if (!name.trim()) { setMessage({ ok: false, text: 'Please enter a name.' }); return }
    if (mainLang && mainLang === secondLang) {
      setMessage({ ok: false, text: 'Main and second language should be different.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        name: name.trim(),
        avatar_emoji: emoji,
        avatar_color: color,
        main_language: mainLang,
        second_language: secondLang,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setUser(await res.json())
      setMessage({ ok: true, text: 'Saved!' })
      setTimeout(() => setMessage(null), 1500)
    } else {
      const err = await res.json().catch(() => null)
      setMessage({ ok: false, text: err?.error ?? `HTTP ${res.status}` })
    }
  }

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-8 w-40 mb-4" />
        <div className="skeleton h-80 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-16 w-full mb-3 rounded-2xl" />
        <div className="skeleton h-16 w-full rounded-2xl" />
      </div>
    )
  }

  const selectCls = 'w-full rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none'
  const selectStyle = { borderColor: 'var(--color-surface)', background: 'var(--color-card)' }

  return (
    <div className="p-4 tab-content">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={24} style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-2xl">Settings</h1>
      </div>

      {/* Reader profile */}
      <section className="sticker pop p-4 mb-5" style={{ ['--i' as string]: 0, background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: `${color}30`, color }}>
            <UserRound size={17} />
          </span>
          <h2 className="text-lg">My Profile</h2>
        </div>

        <label className="block text-xs font-extrabold mb-1" style={{ color: 'var(--color-muted)' }}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-2 px-3 py-2 font-bold text-sm outline-none mb-3"
          style={selectStyle}
        />

        <label className="block text-xs font-extrabold mb-1" style={{ color: 'var(--color-muted)' }}>Avatar</label>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {AVATAR_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="aspect-square rounded-xl text-2xl flex items-center justify-center"
              style={{
                background: emoji === e ? `${color}30` : 'var(--color-bg)',
                border: emoji === e ? '2px solid var(--color-text)' : '2px solid transparent',
              }}
              aria-label={`Avatar ${e}`}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="block text-xs font-extrabold mb-1" style={{ color: 'var(--color-muted)' }}>Colour</label>
        <div className="flex gap-2 mb-4 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="rounded-full flex items-center justify-center"
              style={{ width: 44, height: 44, background: c, border: color === c ? '3px solid var(--color-text)' : '2px solid transparent' }}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
            >
              {color === c && <Check size={16} color="#fff" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-1">
          <div>
            <label className="block text-xs font-extrabold mb-1" style={{ color: 'var(--color-muted)' }}>Main language</label>
            <select value={mainLang} onChange={(e) => setMainLang(e.target.value as Language | '')} className={selectCls} style={selectStyle}>
              <option value="">Not set</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_FLAGS[l]} {l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold mb-1" style={{ color: 'var(--color-muted)' }}>Second language</label>
            <select value={secondLang} onChange={(e) => setSecondLang(e.target.value as Language | '')} className={selectCls} style={selectStyle}>
              <option value="">Not set</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_FLAGS[l]} {l}</option>)}
            </select>
          </div>
        </div>
        <p className="text-[11px] mb-4" style={{ color: 'var(--color-muted)' }}>
          Finishing a book in your second language earns bonus points.
        </p>

        <button
          onClick={save}
          disabled={saving}
          className="sticker-sm sticker-press w-full h-11 font-extrabold text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {message && (
          <p className="text-xs font-extrabold mt-2 text-center" style={{ color: message.ok ? 'var(--success-fg)' : 'var(--error-fg)' }}>
            {message.text}
          </p>
        )}
      </section>

      {/* Links */}
      {[
        { href: '/settings/plan', Icon: ClipboardList, label: 'Daily Reading Plan', sub: 'Language and page target for each day', c: 'var(--candy-teal)', ink: 'var(--candy-teal-ink)' },
        { href: '/settings/parent', Icon: Lock, label: 'Parent Area', sub: 'Rewards, points rules, family goal · PIN', c: 'var(--candy-grape)', ink: 'var(--candy-grape-ink)' },
      ].map(({ href, Icon, label, sub, c, ink }, i) => (
        <Link
          key={href}
          href={href}
          className="sticker sticker-press pop flex items-center gap-3 p-3.5 mb-3"
          style={{ ['--i' as string]: 1 + i, background: 'var(--color-card)' }}
        >
          <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: `color-mix(in srgb, ${c} 18%, transparent)`, color: ink }}>
            <Icon size={19} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm">{label}</p>
            <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{sub}</p>
          </div>
          <ChevronRight size={16} color="var(--color-muted)" />
        </Link>
      ))}
    </div>
  )
}
