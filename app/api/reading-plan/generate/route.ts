import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { todaySGT } from '@/lib/utils'
import type { Book, ReadingLog, ReadingPlan } from '@/lib/types'

// Generate `scheduled_reading` rows for the next `weeks` weeks (1..4) based
// on the user's reading_plan template.
//
// Book selection per day follows the "stay on one book until finished" rule:
// for each language used in the plan, we pick ONE active book at the start of
// generation and assign it to every matching day. The active book is:
//   1. the unfinished book with the most recent reading_log entry, OR
//   2. fall-back to the oldest unfinished book in that language.
//
// Overwrite semantics:
//   POST { user_id, weeks }            → if any existing scheduled_reading
//                                        rows fall in the target range,
//                                        return 409 with the count and let
//                                        the client confirm.
//   POST { user_id, weeks, overwrite } → delete the conflicting rows first.
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { user_id, weeks, overwrite } = await req.json()

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  const weeksInt = parseInt(weeks)
  if (!Number.isFinite(weeksInt) || weeksInt < 1 || weeksInt > 4) {
    return NextResponse.json({ error: 'weeks must be 1..4' }, { status: 400 })
  }

  // ----- Date range: today (SGT) through today + weeks*7 - 1 -----
  const startStr = todaySGT()
  const start = new Date(startStr + 'T00:00:00Z')
  const days = weeksInt * 7
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  const endStr = dates[dates.length - 1]

  // ----- Conflict check -----
  const { data: existing, error: existingErr } = await supabase
    .from('scheduled_reading')
    .select('id, date')
    .eq('user_id', user_id)
    .gte('date', startStr)
    .lte('date', endStr)
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 })
  }
  if (existing && existing.length > 0 && !overwrite) {
    return NextResponse.json(
      {
        error: 'conflict',
        existing_count: existing.length,
        from: startStr,
        to: endStr,
      },
      { status: 409 },
    )
  }

  // ----- Load plan + books + logs in parallel -----
  const [planRes, booksRes, logsRes] = await Promise.all([
    supabase.from('reading_plan').select('*').eq('user_id', user_id),
    supabase.from('books').select('*').eq('is_active', true),
    supabase.from('reading_log').select('*').eq('user_id', user_id),
  ])
  if (planRes.error) return NextResponse.json({ error: planRes.error.message }, { status: 500 })
  if (booksRes.error) return NextResponse.json({ error: booksRes.error.message }, { status: 500 })
  if (logsRes.error) return NextResponse.json({ error: logsRes.error.message }, { status: 500 })

  const plan = (planRes.data as ReadingPlan[]) ?? []
  const books = (booksRes.data as Book[]) ?? []
  const logs = (logsRes.data as ReadingLog[]) ?? []

  const planByDow = new Map<number, ReadingPlan>()
  for (const p of plan) planByDow.set(p.day_of_week, p)

  // Per-book latest page + latest log date (for "active" / completion tests)
  type BookState = { book: Book; currentPage: number; lastReadAt: string }
  const bookState = new Map<string, BookState>()
  for (const b of books) {
    bookState.set(b.id, { book: b, currentPage: 0, lastReadAt: '' })
  }
  for (const log of logs) {
    const s = bookState.get(log.book_id)
    if (!s) continue
    if (log.current_page > s.currentPage) s.currentPage = log.current_page
    if (log.date > s.lastReadAt) s.lastReadAt = log.date
  }

  // ----- Pick the active book per language (for languages used in the plan) -----
  const langsInPlan = new Set<string>()
  for (const p of plan) if (p.language) langsInPlan.add(p.language)

  // language -> chosen book.id (or null = couldn't pick)
  const bookByLanguage = new Map<string, string | null>()

  function pickBookForLanguage(language: string): string | null {
    const candidates = Array.from(bookState.values()).filter(
      (s) => s.book.language === language && s.currentPage < s.book.total_pages,
    )
    if (candidates.length === 0) return null
    // Prefer the unfinished book with the most recent log (currently being read)
    candidates.sort((a, b) => {
      if (a.lastReadAt !== b.lastReadAt) return a.lastReadAt < b.lastReadAt ? 1 : -1
      // Tiebreaker: oldest created_at first (consistent order)
      return a.book.created_at < b.book.created_at ? -1 : 1
    })
    return candidates[0].book.id
  }

  for (const lang of langsInPlan) bookByLanguage.set(lang, pickBookForLanguage(lang))

  // ----- Build rows to insert -----
  // Day-of-week mapping: JS Date.getUTCDay() 0=Sun..6=Sat ; our plan uses 0=Mon..6=Sun.
  const toAppDow = (utcDay: number) => (utcDay === 0 ? 6 : utcDay - 1)

  const rows: { user_id: string; date: string; book_id: string | null; target_pages: number }[] = []
  for (const dateStr of dates) {
    const d = new Date(dateStr + 'T00:00:00Z')
    const dow = toAppDow(d.getUTCDay())
    const slot = planByDow.get(dow)
    const language = slot?.language ?? null
    const target = slot?.target_pages ?? 15
    const bookId = language ? bookByLanguage.get(language) ?? null : null
    rows.push({ user_id, date: dateStr, book_id: bookId, target_pages: target })
  }

  // ----- Apply: delete conflicts then insert -----
  if (existing && existing.length > 0) {
    const { error: delErr } = await supabase
      .from('scheduled_reading')
      .delete()
      .eq('user_id', user_id)
      .gte('date', startStr)
      .lte('date', endStr)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const { data: inserted, error: insErr } = await supabase
    .from('scheduled_reading')
    .insert(rows)
    .select()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({
    inserted: inserted?.length ?? 0,
    from: startStr,
    to: endStr,
    overwritten: existing?.length ?? 0,
  })
}
