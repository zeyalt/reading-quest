import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSettingsRow } from '@/lib/parent'
import { pagesByDate } from '@/lib/utils'
import type { ReadingLog } from '@/lib/types'

// GET /api/family-goal?month=YYYY-MM
// The client sends its own month (device clock), matching how the rest of the
// app treats dates. Returns the target and each reader's pages that month.
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month=YYYY-MM required' }, { status: 400 })
  }
  const supabase = createServiceClient()
  // First day of the following month (exclusive upper bound).
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  // Logs before the month are needed as the baseline for each book's delta.
  const [usersRes, logsRes, settings] = await Promise.all([
    supabase.from('users').select('id, name, avatar_emoji, avatar_color').order('created_at'),
    supabase.from('reading_log').select('*').lt('date', nextMonth),
    getSettingsRow(supabase),
  ])
  const err = usersRes.error ?? logsRes.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  const logsByUser = new Map<string, ReadingLog[]>()
  for (const l of logsRes.data as ReadingLog[]) {
    const arr = logsByUser.get(l.user_id)
    if (arr) arr.push(l)
    else logsByUser.set(l.user_id, [l])
  }

  const readers = (usersRes.data ?? []).map((u) => {
    let pages = 0
    for (const [date, n] of pagesByDate(logsByUser.get(u.id) ?? [])) {
      if (date.startsWith(month)) pages += n
    }
    return { ...u, pages }
  })

  return NextResponse.json({
    month,
    target: settings.family_goal_pages,
    reward: settings.family_goal_reward,
    total: readers.reduce((s, r) => s + r.pages, 0),
    readers,
  })
}
