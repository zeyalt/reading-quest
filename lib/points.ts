import type { SupabaseClient } from '@supabase/supabase-js'
import type { Book, FamilySettings, PointsKind, PointsTransaction, ReadingLog, ReadingPlan, User } from './types'
import { pagesByDate } from './utils'

export interface EarnedEvent {
  ref_key: string
  amount: number
  kind: PointsKind
  description: string
}

type Rules = Pick<
  FamilySettings,
  'streak_cap' | 'streak_requires_target' | 'book_points_main' | 'book_points_second' | 'points_start_date'
>

function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function dayOfWeek(date: string): number {
  const js = new Date(date + 'T00:00:00Z').getUTCDay()
  return js === 0 ? 6 : js - 1 // 0=Mon … 6=Sun
}

function shortDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// Every automatic award a reader has earned, derived purely from their logs.
// Deterministic and keyed by ref_key, so the caller can insert-if-missing and
// re-running never double-pays.
//
// Streak: day n of an unbroken run earns n points (capped at streak_cap if
// set). A day counts when pages moved forward; if streak_requires_target is on,
// it must also meet that weekday's plan target (days without a planned
// language need only some reading). Runs that started before
// points_start_date keep their length, but only days on/after it pay out.
//
// Book: finishing a book pays book_points_second if it is in the reader's
// second language, otherwise book_points_main.
export function computeEarnedEvents(
  logs: ReadingLog[],
  books: Book[],
  plan: ReadingPlan[],
  user: Pick<User, 'second_language'>,
  rules: Rules,
): EarnedEvent[] {
  const events: EarnedEvent[] = []
  const start = rules.points_start_date

  // ---- Streaks
  const planByDow = new Map(plan.map((p) => [p.day_of_week, p]))
  const pages = pagesByDate(logs)
  const qualifying = [...pages.entries()]
    .filter(([date, n]) => {
      if (n <= 0) return false
      if (!rules.streak_requires_target) return true
      const p = planByDow.get(dayOfWeek(date))
      return !p?.language || n >= p.target_pages
    })
    .map(([date]) => date)
    .sort()

  let run = 0
  let prev: string | null = null
  for (const date of qualifying) {
    run = prev !== null && nextDay(prev) === date ? run + 1 : 1
    prev = date
    if (date < start) continue
    events.push({
      ref_key: `streak:${date}`,
      amount: rules.streak_cap ? Math.min(run, rules.streak_cap) : run,
      kind: 'streak',
      description: `Day ${run} streak 🔥 (${shortDate(date)})`,
    })
  }

  // ---- Finished books
  for (const book of books) {
    if (book.total_pages <= 0) continue
    const finish = logs
      .filter((l) => l.book_id === book.id && l.current_page >= book.total_pages)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    if (!finish || finish.date < start) continue
    const second = !!user.second_language && book.language === user.second_language
    events.push({
      ref_key: `book:${book.id}`,
      amount: second ? rules.book_points_second : rules.book_points_main,
      kind: 'book',
      description: `Finished “${book.title}”${second ? ` (${book.language} · 2nd language)` : ''}`,
    })
  }

  return events.filter((e) => e.amount > 0)
}

// Recompute a reader's automatic awards and insert any that are missing.
// Returns only the rows newly inserted (so the UI can celebrate them).
export async function syncPoints(supabase: SupabaseClient, userId: string): Promise<PointsTransaction[]> {
  const [userRes, logsRes, booksRes, planRes, settingsRes] = await Promise.all([
    supabase.from('users').select('second_language').eq('id', userId).single(),
    supabase.from('reading_log').select('*').eq('user_id', userId),
    supabase.from('books').select('*'),
    supabase.from('reading_plan').select('*').eq('user_id', userId),
    supabase.from('family_settings').select('*').eq('id', 1).single(),
  ])
  const err = userRes.error ?? logsRes.error ?? booksRes.error ?? planRes.error ?? settingsRes.error
  if (err) throw new Error(err.message)

  const events = computeEarnedEvents(logsRes.data ?? [], booksRes.data ?? [], planRes.data ?? [], userRes.data ?? { second_language: null }, settingsRes.data)
  if (events.length === 0) return []

  const { data, error } = await supabase
    .from('points_transactions')
    .upsert(
      events.map((e) => ({ ...e, user_id: userId })),
      { onConflict: 'user_id,ref_key', ignoreDuplicates: true },
    )
    .select()
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBalance(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.from('points_transactions').select('amount').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data.reduce((s, r) => s + r.amount, 0)
}
