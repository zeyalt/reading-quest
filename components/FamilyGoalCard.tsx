'use client'

import { useEffect, useState } from 'react'
import { Users, PartyPopper } from 'lucide-react'
import { todayLocal } from '@/lib/utils'

interface Goal {
  month: string
  target: number
  reward: string | null
  total: number
  readers: { id: string; name: string; avatar_emoji: string; avatar_color: string; pages: number }[]
}

// Shared monthly pages goal. One bar, one coloured segment per reader, so
// everyone sees their own contribution to the team total.
export default function FamilyGoalCard({ index }: { index: number }) {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch(`/api/family-goal?month=${todayLocal().slice(0, 7)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setGoal)
      .catch(() => setFailed(true))
  }, [])

  if (failed) return null
  // Same footprint as the card, so Home doesn't jump when it arrives.
  if (!goal) return <div className="skeleton h-[150px] w-full mb-5 rounded-2xl" />

  const done = goal.total >= goal.target
  const pct = (n: number) => `${Math.min(100, (n / goal.target) * 100)}%`
  const monthName = new Date(goal.month + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long' })

  return (
    <div
      className="sticker pop p-4 mb-5"
      style={{ ['--i' as string]: index, background: done ? 'var(--success-bg)' : 'var(--color-card)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-teal) 18%, transparent)', color: 'var(--candy-teal-ink)' }}>
            {done ? <PartyPopper size={17} /> : <Users size={17} />}
          </span>
          <h2 className="text-lg">Family Goal · {monthName}</h2>
        </div>
        <span className="text-xs font-extrabold" style={{ color: 'var(--color-muted)' }}>
          {goal.total} / {goal.target}
        </span>
      </div>

      {goal.reward && (
        <p className="text-sm font-bold mb-2.5">
          {done ? '🎉 You did it! ' : 'Together → '}{goal.reward}
        </p>
      )}

      {/* Stacked bar */}
      <div
        className="flex h-5 rounded-full overflow-hidden mb-2.5"
        style={{ background: 'var(--color-surface)', border: '2px solid var(--ink)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.target}
        aria-valuenow={goal.total}
        aria-label="Family pages this month"
      >
        {goal.readers.filter((r) => r.pages > 0).map((r) => (
          <div key={r.id} style={{ width: pct(r.pages), background: r.avatar_color, transition: 'width 0.6s var(--spring)' }} title={`${r.name}: ${r.pages}`} />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {goal.readers.map((r) => (
          <span key={r.id} className="flex items-center gap-1 text-xs font-bold">
            <span className="rounded-full" style={{ width: 10, height: 10, background: r.avatar_color }} />
            {r.avatar_emoji} {r.name} <span style={{ color: 'var(--color-muted)' }}>{r.pages}</span>
          </span>
        ))}
      </div>

      {!done && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--color-muted)' }}>
          {goal.target - goal.total} pages to go — cheer each other on!
        </p>
      )}
    </div>
  )
}
