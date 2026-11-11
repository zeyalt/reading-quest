'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lock, Gift, Star, Users, Sparkles, KeyRound, Trash2, Plus, Eye, EyeOff, Check } from 'lucide-react'
import type { FamilySettings, Reward, User } from '@/lib/types'
import PinPad from '@/components/PinPad'
import Toast from '@/components/Toast'

type Api = { ok: boolean; data: any; error?: string } // eslint-disable-line @typescript-eslint/no-explicit-any

// PIN-gated parent controls. The PIN is held in memory only while this page is
// open and is re-sent (and re-verified server-side) with every change.
export default function ParentAreaPage() {
  const router = useRouter()
  const [pin, setPin] = useState<string | null>(null)
  const [settings, setSettings] = useState<FamilySettings | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!pin) return
    Promise.all([
      fetch('/api/family-settings').then((r) => r.json()),
      fetch('/api/rewards?all=1').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([s, r, u]) => { setSettings(s); setRewards(r); setUsers(u) })
  }, [pin])

  async function call(url: string, method: string, body: object): Promise<Api> {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, pin }),
    })
    const data = await res.json().catch(() => null)
    const result = { ok: res.ok, data, error: res.ok ? undefined : data?.error ?? `HTTP ${res.status}` }
    if (!res.ok) setToast(result.error!)
    return result
  }

  if (!pin) {
    return (
      <div className="p-4">
        <PinPad
          title="Parent Area"
          subtitle="Enter the parent PIN to continue."
          onSuccess={setPin}
          onClose={() => router.push('/settings')}
        />
      </div>
    )
  }

  return (
    <div className="p-4 tab-content">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/settings')} className="w-11 h-11 flex items-center justify-center rounded-xl" style={{ background: 'var(--color-surface)' }} aria-label="Back to Settings">
          <ChevronLeft size={18} color="var(--color-muted)" />
        </button>
        <Lock size={22} style={{ color: 'var(--candy-grape)' }} />
        <h1 className="text-2xl">Parent Area</h1>
      </div>

      {!settings ? (
        <>
          <div className="skeleton h-56 w-full mb-4 rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </>
      ) : (
        <>
          <RewardsEditor rewards={rewards} setRewards={setRewards} call={call} onDone={setToast} />
          <PointsRules settings={settings} setSettings={setSettings} call={call} onDone={setToast} />
          <FamilyGoal settings={settings} setSettings={setSettings} call={call} onDone={setToast} />
          <AdjustPoints users={users} call={call} onDone={setToast} />
          <ChangePin call={call} onChanged={(p) => { setPin(p); setToast('PIN changed') }} />
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// ----------------------------------------------------------------- shared UI
type Call = (url: string, method: string, body: object) => Promise<Api>

function Section({ i, Icon, title, c, ink, children }: { i: number; Icon: typeof Lock; title: string; c: string; ink: string; children: React.ReactNode }) {
  return (
    <section className="sticker pop p-4 mb-5" style={{ ['--i' as string]: i, background: 'var(--color-card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: `color-mix(in srgb, ${c} 18%, transparent)`, color: ink }}>
          <Icon size={17} />
        </span>
        <h2 className="text-lg">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const inputCls = 'rounded-xl border-2 px-3 min-h-[44px] font-bold text-sm outline-none min-w-0'
const inputStyle = { borderColor: 'var(--color-surface)', background: 'var(--color-card)' }
const labelCls = 'block text-xs font-extrabold mb-1'
const labelStyle = { color: 'var(--color-muted)' }

function SaveButton({ onClick, busy, label = 'Save' }: { onClick: () => void; busy: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="sticker-sm sticker-press w-full h-11 font-extrabold text-white disabled:opacity-50"
      style={{ background: 'var(--candy-grape)' }}
    >
      {busy ? 'Saving…' : label}
    </button>
  )
}

// ------------------------------------------------------------------ rewards
function RewardsEditor({ rewards, setRewards, call, onDone }: { rewards: Reward[]; setRewards: (r: Reward[]) => void; call: Call; onDone: (m: string) => void }) {
  const [draft, setDraft] = useState({ emoji: '🎁', name: '', cost: '' })

  async function add() {
    if (!draft.name.trim() || !(Number(draft.cost) > 0)) { onDone('Enter a name and a cost above 0'); return }
    const r = await call('/api/rewards', 'POST', { ...draft, cost: Number(draft.cost) })
    if (r.ok) { setRewards([...rewards, r.data].sort((a, b) => a.cost - b.cost)); setDraft({ emoji: '🎁', name: '', cost: '' }) }
  }

  return (
    <Section i={0} Icon={Gift} title="Reward Shop" c="var(--candy-rose)" ink="var(--candy-rose-ink)">
      <div className="flex flex-col gap-2 mb-3">
        {rewards.map((r) => (
          <RewardRow
            key={r.id}
            reward={r}
            call={call}
            onSaved={(u) => setRewards(rewards.map((x) => (x.id === u.id ? u : x)))}
            onDeleted={() => setRewards(rewards.filter((x) => x.id !== r.id))}
          />
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)', border: '1.5px dashed var(--color-subtle)' }}>
        <p className="text-xs font-extrabold mb-2">Add a reward</p>
        <RewardFields
          emoji={draft.emoji} name={draft.name} cost={draft.cost}
          onEmoji={(v) => setDraft({ ...draft, emoji: v })}
          onName={(v) => setDraft({ ...draft, name: v })}
          onCost={(v) => setDraft({ ...draft, cost: v })}
          namePlaceholder="e.g. Movie night"
        />
        <button onClick={add} className="sticker-sm sticker-press w-full h-11 mt-2.5 flex items-center justify-center gap-1.5 font-extrabold text-white" style={{ background: 'var(--candy-grape)' }}>
          <Plus size={16} /> Add reward
        </button>
      </div>
    </Section>
  )
}

function RewardRow({ reward, call, onSaved, onDeleted }: { reward: Reward; call: Call; onSaved: (r: Reward) => void; onDeleted: () => void }) {
  const [emoji, setEmoji] = useState(reward.emoji)
  const [name, setName] = useState(reward.name)
  const [cost, setCost] = useState(String(reward.cost))
  const dirty = emoji !== reward.emoji || name !== reward.name || cost !== String(reward.cost)

  async function save(patch: Partial<Reward> = {}) {
    const r = await call('/api/rewards', 'PATCH', { id: reward.id, emoji, name, cost: Number(cost), ...patch })
    if (r.ok) onSaved(r.data)
  }
  async function remove() {
    if (!confirm(`Delete "${reward.name}"? (Past redemptions stay in history.)`)) return
    const r = await call('/api/rewards', 'DELETE', { id: reward.id })
    if (r.ok) onDeleted()
  }

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)', border: '2px solid var(--color-surface)' }}>
      <RewardFields
        emoji={emoji} name={name} cost={cost}
        onEmoji={setEmoji} onName={setName} onCost={setCost}
        dimmed={!reward.is_active}
      />
      <div className="flex items-center gap-2 mt-2.5">
        <button
          onClick={() => save({ is_active: !reward.is_active })}
          disabled={dirty}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{ background: 'var(--color-surface)' }}
          aria-pressed={reward.is_active}
        >
          {reward.is_active ? <><Eye size={15} /> In shop</> : <><EyeOff size={15} /> Hidden</>}
        </button>
        {dirty && (
          <button onClick={() => save()} className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold text-white" style={{ background: 'var(--candy-grape)' }}>
            <Check size={15} /> Save
          </button>
        )}
        <button
          onClick={remove}
          className="w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: 'var(--error-bg)', color: 'var(--error-fg)' }}
          aria-label={`Delete ${reward.name}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// Name / icon / cost inputs with visible labels, shared by edit + add. The
// name gets the full width and wraps onto more lines for longer rewards.
function RewardFields({ emoji, name, cost, onEmoji, onName, onCost, dimmed, namePlaceholder }: {
  emoji: string; name: string; cost: string
  onEmoji: (v: string) => void; onName: (v: string) => void; onCost: (v: string) => void
  dimmed?: boolean; namePlaceholder?: string
}) {
  return (
    <div className="flex flex-col gap-2" style={{ opacity: dimmed ? 0.55 : 1 }}>
      <label className="flex flex-col">
        <span className={labelCls} style={labelStyle}>Reward</span>
        <textarea
          value={name}
          onChange={(e) => onName(e.target.value.replace(/\n/g, ' '))}
          placeholder={namePlaceholder}
          rows={2}
          className={`${inputCls} py-2.5 resize-none leading-snug`}
          style={{ ...inputStyle, fieldSizing: 'content', minHeight: 64 } as React.CSSProperties}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          <span className={labelCls} style={labelStyle}>Icon</span>
          <input value={emoji} onChange={(e) => onEmoji(e.target.value)} className={`${inputCls} text-center text-lg`} style={inputStyle} />
        </label>
        <label className="flex flex-col">
          <span className={labelCls} style={labelStyle}>Points</span>
          <input value={cost} onChange={(e) => onCost(e.target.value)} type="number" inputMode="numeric" className={`${inputCls} text-center`} style={inputStyle} />
        </label>
      </div>
    </div>
  )
}

// ------------------------------------------------------------- points rules
function PointsRules({ settings, setSettings, call, onDone }: { settings: FamilySettings; setSettings: (s: FamilySettings) => void; call: Call; onDone: (m: string) => void }) {
  const [main, setMain] = useState(String(settings.book_points_main))
  const [second, setSecond] = useState(String(settings.book_points_second))
  const [cap, setCap] = useState(settings.streak_cap == null ? '' : String(settings.streak_cap))
  const [needTarget, setNeedTarget] = useState(settings.streak_requires_target)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const r = await call('/api/family-settings', 'PUT', {
      book_points_main: main, book_points_second: second, streak_cap: cap, streak_requires_target: needTarget,
    })
    setBusy(false)
    if (r.ok) { setSettings(r.data); onDone('Points rules saved') }
  }

  return (
    <Section i={1} Icon={Star} title="Points Rules" c="var(--candy-sun)" ink="var(--candy-sun-ink)">
      <p className="text-xs font-extrabold mb-2">Finishing a book</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls} style={labelStyle}>Main language</label>
          <input value={main} onChange={(e) => setMain(e.target.value)} type="number" inputMode="numeric" className={`${inputCls} w-full`} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Second language</label>
          <input value={second} onChange={(e) => setSecond(e.target.value)} type="number" inputMode="numeric" className={`${inputCls} w-full`} style={inputStyle} />
        </div>
      </div>

      <p className="text-xs font-extrabold mb-1">Streaks</p>
      <p className="text-[11px] mb-2" style={{ color: 'var(--color-muted)' }}>Day 1 earns 1, day 2 earns 2, day 3 earns 3… Missing a day starts over at 1.</p>
      <label className={labelCls} style={labelStyle}>Max points per day (blank = no cap)</label>
      <input value={cap} onChange={(e) => setCap(e.target.value)} type="number" inputMode="numeric" placeholder="No cap" className={`${inputCls} w-full mb-3`} style={inputStyle} />
      <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
        <input type="checkbox" checked={needTarget} onChange={(e) => setNeedTarget(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--candy-grape)]" />
        <span className="text-sm font-bold leading-snug">
          A streak day must hit the daily page target
          <span className="block text-[11px] font-semibold" style={{ color: 'var(--color-muted)' }}>Off: any reading counts. Applies to points from now on.</span>
        </span>
      </label>
      <SaveButton onClick={save} busy={busy} />
    </Section>
  )
}

// --------------------------------------------------------------- family goal
function FamilyGoal({ settings, setSettings, call, onDone }: { settings: FamilySettings; setSettings: (s: FamilySettings) => void; call: Call; onDone: (m: string) => void }) {
  const [pages, setPages] = useState(String(settings.family_goal_pages))
  const [reward, setReward] = useState(settings.family_goal_reward ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!(Number(pages) > 0)) { onDone('Pages must be above 0'); return }
    setBusy(true)
    const r = await call('/api/family-settings', 'PUT', { family_goal_pages: pages, family_goal_reward: reward })
    setBusy(false)
    if (r.ok) { setSettings(r.data); onDone('Family goal saved') }
  }

  return (
    <Section i={2} Icon={Users} title="Family Goal" c="var(--candy-teal)" ink="var(--candy-teal-ink)">
      <label className={labelCls} style={labelStyle}>Pages together each month</label>
      <input value={pages} onChange={(e) => setPages(e.target.value)} type="number" inputMode="numeric" className={`${inputCls} w-full mb-3`} style={inputStyle} />
      <label className={labelCls} style={labelStyle}>Reward when you get there</label>
      <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. Family trip to the zoo 🦁" className={`${inputCls} w-full mb-4`} style={inputStyle} />
      <SaveButton onClick={save} busy={busy} />
    </Section>
  )
}

// ------------------------------------------------------------ manual adjust
function AdjustPoints({ users, call, onDone }: { users: User[]; call: Call; onDone: (m: string) => void }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const n = Math.round(Number(amount))
    if (!userId || !n) { onDone('Pick a reader and a non-zero amount'); return }
    setBusy(true)
    const r = await call('/api/points/adjust', 'POST', { user_id: userId, amount: n, description: reason })
    setBusy(false)
    if (r.ok) {
      const name = users.find((u) => u.id === userId)?.name
      onDone(`${n > 0 ? '+' : ''}${n} points for ${name}`)
      setAmount('')
      setReason('')
    }
  }

  return (
    <Section i={3} Icon={Sparkles} title="Add / Remove Points" c="var(--candy-grape)" ink="var(--candy-grape-ink)">
      <div className="grid grid-cols-[1fr_96px] gap-2 mb-3">
        <label className="flex flex-col min-w-0">
          <span className={labelCls} style={labelStyle}>Reader</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Pick reader…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.avatar_emoji} {u.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col">
          <span className={labelCls} style={labelStyle}>Points</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="numeric" placeholder="+10 / -5" className={`${inputCls} text-center`} style={inputStyle} />
        </label>
      </div>
      <label className={labelCls} style={labelStyle}>Reason <span className="font-semibold">(shown in their history)</span></label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Great reading effort" className={`${inputCls} w-full mb-3`} style={inputStyle} />
      <SaveButton onClick={submit} busy={busy} label="Apply" />
    </Section>
  )
}

// --------------------------------------------------------------- change PIN
function ChangePin({ call, onChanged }: { call: Call; onChanged: (pin: string) => void }) {
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    if (!/^\d{4,6}$/.test(next)) { setError('PIN must be 4–6 digits'); return }
    if (next !== again) { setError("PINs don't match"); return }
    setBusy(true)
    const r = await call('/api/parent/pin', 'POST', { action: 'change', new_pin: next })
    setBusy(false)
    if (r.ok) { onChanged(next); setNext(''); setAgain('') }
  }

  return (
    <Section i={4} Icon={KeyRound} title="Change PIN" c="var(--candy-sky)" ink="var(--candy-sky-ink)">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="flex flex-col min-w-0">
          <span className={labelCls} style={labelStyle}>New PIN</span>
          <input value={next} onChange={(e) => setNext(e.target.value)} type="password" inputMode="numeric" autoComplete="new-password" className={inputCls} style={inputStyle} />
        </label>
        <label className="flex flex-col min-w-0">
          <span className={labelCls} style={labelStyle}>Type it again</span>
          <input value={again} onChange={(e) => setAgain(e.target.value)} type="password" inputMode="numeric" autoComplete="new-password" className={inputCls} style={inputStyle} />
        </label>
      </div>
      {error && <p className="text-xs font-extrabold mb-2" style={{ color: 'var(--error-fg)' }}>{error}</p>}
      <SaveButton onClick={submit} busy={busy} label="Change PIN" />
    </Section>
  )
}
