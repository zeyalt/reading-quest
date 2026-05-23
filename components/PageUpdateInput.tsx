'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { todaySGT, clampPage } from '@/lib/utils'

interface Props {
  userId: string
  bookId: string
  currentPage: number
  totalPages: number
  onUpdate: (newPage: number) => void
  targetPages?: number
}

export default function PageUpdateInput({ userId, bookId, currentPage, totalPages, onUpdate, targetPages }: Props) {
  const [value, setValue] = useState(currentPage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const clamped = clampPage(value, totalPages)
    setSaving(true)
    try {
      await fetch('/api/reading-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, book_id: bookId, current_page: clamped, date: todaySGT() }),
      })
      onUpdate(clamped)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {targetPages && (
        <p className="text-xs font-bold" style={{ color: '#9A9A9A' }}>
          Target: {targetPages} pages today
        </p>
      )}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={totalPages}
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          className="flex-1 rounded-xl border-2 px-4 py-3 text-xl font-bold text-center outline-none focus:border-orange-400"
          style={{ borderColor: '#F0E8E0', background: '#FFF8F0', minHeight: 56 }}
          placeholder="page #"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
          style={{
            background: saved ? '#00C9A7' : '#FF6B35',
            boxShadow: '0 2px 12px #FF6B3560',
            minHeight: 56,
            minWidth: 100,
          }}
        >
          {saving
            ? <Loader2 size={18} className="animate-spin" />
            : <><Check size={16} /> {saved ? 'Saved' : 'Update'}</>}
        </button>
      </div>
    </div>
  )
}
