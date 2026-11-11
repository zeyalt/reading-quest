'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Gift, History, Star, Flame, BookCheck, Sparkles, ShoppingBag, Lightbulb, HelpCircle, X } from 'lucide-react'
import type { FamilySettings, PointsKind, PointsTransaction, Reward, User } from '@/lib/types'
import { useUser } from '@/components/UserContext'
import PinPad from '@/components/PinPad'
import Toast from '@/components/Toast'

const KIND_STYLE: Record<PointsKind, { Icon: typeof Star; c: string; ink: string }> = {
  streak: { Icon: Flame,       c: 'var(--candy-orange)', ink: 'var(--candy-orange-ink)' },
  book:   { Icon: BookCheck,   c: 'var(--candy-teal)',   ink: 'var(--candy-teal-ink)' },
  redeem: { Icon: ShoppingBag, c: 'var(--candy-rose)',   ink: 'var(--candy-rose-ink)' },
  adjust: { Icon: Sparkles,    c: 'var(--candy-grape)',  ink: 'var(--candy-grape-ink)' },
}

export default function RewardsPage() {
  const { user } = useUser()
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<PointsTransaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<Reward | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [rules, setRules] = useState<FamilySettings | null>(null)
  const [langs, setLangs] = useState<Pick<User, 'main_language' | 'second_language'> | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const [pRes, rRes, sRes, uRes] = await Promise.all([
      fetch(`/api/points?user_id=${user.id}`),
      fetch('/api/rewards'),
      fetch('/api/family-settings'),
      fetch('/api/users'),
    ])
    if (sRes.ok) setRules(await sRes.json())
    if (uRes.ok) {
      const me = (await uRes.json() as User[]).find((u) => u.id === user.id)
      if (me) setLangs({ main_language: me.main_language, second_language: me.second_language })
    }
    const p = await pRes.json()
    setBalance(p.balance ?? 0)
    setHistory(p.transactions ?? [])
    const r = await rRes.json()
    setRewards(Array.isArray(r) ? r : [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function redeem(reward: Reward, pin: string) {
    setRedeeming(null)
    setBusy(true)
    setToast(`Redeeming ${reward.emoji} ${reward.name}…`)
    const res = await fetch('/api/points/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user!.id, reward_id: reward.id, pin }),
    })
    const body = await res.json().catch(() => null)
    await load()
    setBusy(false)
    setToast(null)
    // Next tick so the new toast mounts fresh (its timer starts on mount).
    setTimeout(() => setToast(res.ok ? `${reward.emoji} ${reward.name} — enjoy!` : body?.error ?? `HTTP ${res.status}`), 0)
  }

  if (!user || loading) {
    return (
      <div className="p-4">
        <div className="skeleton h-24 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-40 w-full mb-4 rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-4 tab-content">
      {/* Balance hero */}
      <div
        className="sticker pop relative overflow-hidden p-4 mb-5 flex items-center justify-between"
        style={{ ['--i' as string]: 0, background: 'linear-gradient(135deg, var(--candy-sun) 0%, #FFB13C 100%)', color: '#1A1A1A' }}
      >
        <div aria-hidden className="absolute rounded-full" style={{ width: 110, height: 110, top: -45, right: -25, background: 'rgba(255,255,255,0.3)' }} />
        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-wide">
            {user.avatar_emoji} {user.name}&apos;s points
          </p>
          <p className="flex items-center gap-2 text-5xl leading-none mt-1" style={{ fontFamily: 'var(--font-baloo), cursive' }}>
            {balance}
            <Star size={34} color="#1A1A1A" fill="rgba(255,255,255,0.6)" strokeWidth={2.2} aria-hidden />
          </p>
        </div>
        {rules && (
          <button
            onClick={() => setShowHelp(true)}
            className="relative self-start sticker-press w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: '#FFFFFF', color: '#1A1A1A', border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 0 #1A1A1A' }}
            aria-label="How to earn points"
            aria-haspopup="dialog"
          >
            <HelpCircle size={22} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Shop */}
      <section className="sticker pop p-4 mb-5" style={{ ['--i' as string]: 1, background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-rose) 18%, transparent)', color: 'var(--candy-rose-ink)' }}>
            <Gift size={17} />
          </span>
          <h2 className="text-lg">Reward Shop</h2>
        </div>
        {rewards.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            No rewards yet — ask a parent to add some in Settings.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((r) => {
              const affordable = balance >= r.cost
              return (
                <button
                  key={r.id}
                  onClick={() => affordable && setRedeeming(r)}
                  disabled={!affordable || busy}
                  className="sticker-sm sticker-press p-3 flex flex-col items-center text-center gap-1 disabled:cursor-not-allowed"
                  style={{
                    background: affordable ? 'color-mix(in srgb, var(--candy-sun) 14%, var(--color-card))' : 'var(--color-surface)',
                    opacity: affordable ? 1 : 0.7,
                  }}
                >
                  <span className="text-3xl leading-none">{r.emoji}</span>
                  <span className="text-sm font-extrabold leading-tight">{r.name}</span>
                  <span className="flex items-center gap-1 text-xs font-extrabold" style={{ color: 'var(--candy-sun-ink)' }}>
                    <Star size={12} fill="currentColor" /> {r.cost}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-muted)' }}>
                    {affordable ? 'Tap to redeem' : `${r.cost - balance} more to go`}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section className="sticker pop p-4" style={{ ['--i' as string]: 2, background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-sky) 18%, transparent)', color: 'var(--candy-sky-ink)' }}>
            <History size={17} />
          </span>
          <h2 className="text-lg">History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Read today to start earning points! Each day of a streak earns more, and finishing a book earns a big bonus.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {history.map((t) => {
              const k = KIND_STYLE[t.kind]
              return (
                <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'var(--color-bg)' }}>
                  <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: `color-mix(in srgb, ${k.c} 18%, transparent)`, color: k.ink }}>
                    <k.Icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug">{t.description}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold flex-shrink-0" style={{ color: t.amount > 0 ? 'var(--success-fg)' : 'var(--error-fg)' }}>
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {redeeming && (
        <PinPad
          title={`Redeem ${redeeming.emoji} ${redeeming.name}?`}
          subtitle={`Parent PIN needed · costs ${redeeming.cost} points`}
          onSuccess={(pin) => redeem(redeeming, pin)}
          onClose={() => setRedeeming(null)}
        />
      )}
      {showHelp && rules && <HowToEarnDialog rules={rules} langs={langs} onClose={() => setShowHelp(false)} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// Plain-language summary of the earning rules, driven by the live parent
// settings so it never drifts from what the points engine actually pays.
function HowToEarnDialog({ rules, langs, onClose }: {
  rules: FamilySettings
  langs: Pick<User, 'main_language' | 'second_language'> | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const main = langs?.main_language ? `${langs.main_language} (main language)` : 'Main language'
  const second = langs?.second_language ? `${langs.second_language} (second language)` : 'Second language'
  const rows = [
    {
      kind: 'streak' as const,
      title: 'Read every day',
      points: rules.streak_cap ? `1 → ${rules.streak_cap} pts a day` : '+1 more each day',
      detail: [
        'Day 1 of your streak = 1 point, day 2 = 2, day 3 = 3, and so on.',
        rules.streak_cap ? `Tops out at ${rules.streak_cap} points a day.` : null,
        rules.streak_requires_target ? 'A day counts when you hit your daily page target.' : 'Any reading counts.',
        'Miss a day and it starts again at 1.',
      ].filter(Boolean).join(' '),
    },
    {
      kind: 'book' as const,
      title: 'Finish a book',
      points: `${rules.book_points_main} / ${rules.book_points_second} pts`,
      detail: `${main}: ${rules.book_points_main} points. ${second}: ${rules.book_points_second} points.`,
    },
    {
      kind: 'adjust' as const,
      title: 'Bonus from a parent',
      points: 'Surprise!',
      detail: 'Parents can add bonus points for great effort.',
    },
  ]
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-earn-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      onClick={(e) => e.stopPropagation()}
      className="sticker pop w-full max-w-[400px] p-4 outline-none max-h-[85dvh] overflow-y-auto"
      style={{ background: 'var(--color-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-sun) 26%, transparent)', color: 'var(--candy-sun-ink)' }}>
            <Lightbulb size={17} />
          </span>
          <h2 id="how-to-earn-title" className="text-lg">How to Earn Points</h2>
        </div>
        <button onClick={onClose} className="-m-2 w-11 h-11 flex items-center justify-center rounded-xl" aria-label="Close">
          <X size={18} color="var(--color-muted)" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const k = KIND_STYLE[r.kind]
          return (
            <div key={r.title} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2.5" style={{ background: 'var(--color-bg)' }}>
              <span className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5" style={{ width: 30, height: 30, background: `color-mix(in srgb, ${k.c} 18%, transparent)`, color: k.ink }}>
                <k.Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-extrabold">{r.title}</p>
                  <span className="text-xs font-extrabold flex-shrink-0" style={{ color: k.ink }}>{r.points}</span>
                </div>
                <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--color-muted)' }}>{r.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}
