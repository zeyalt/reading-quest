import { ReadingLog, Book } from './types'

// Today's date (YYYY-MM-DD) in the device's local timezone. We deliberately use
// the device clock rather than a fixed offset so "Today" always matches the
// calendar day the user is actually living in, wherever they are.
export function todayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getCurrentPage(bookId: string, logs: ReadingLog[]): number {
  const latest = logs
    .filter((l) => l.book_id === bookId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return latest?.current_page ?? 0
}

export function getPagesReadOnDate(
  bookId: string,
  date: string,
  logs: ReadingLog[],
): number {
  const todayLog = logs.find((l) => l.book_id === bookId && l.date === date)
  if (!todayLog) return 0
  const prevLog = logs
    .filter((l) => l.book_id === bookId && l.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return Math.max(0, todayLog.current_page - (prevLog?.current_page ?? 0))
}

// The set of dates (YYYY-MM-DD) on which the reader made *forward progress* on
// at least one book — i.e. some book's page count went up that day. A re-log at
// the same or a lower page (e.g. correcting a number, or page going backwards)
// has a zero/negative delta and is NOT a reading day. This mirrors the per-book
// delta used by getPagesReadOnDate, so the streak calendar, the streak count,
// and the "Past 7 Days" list all agree on what counts as reading.
export function getReadingDates(logs: ReadingLog[]): Set<string> {
  const byBook = new Map<string, ReadingLog[]>()
  for (const l of logs) {
    const arr = byBook.get(l.book_id)
    if (arr) arr.push(l)
    else byBook.set(l.book_id, [l])
  }

  const dates = new Set<string>()
  for (const bookLogs of byBook.values()) {
    bookLogs.sort((a, b) => a.date.localeCompare(b.date))
    let prevPage = 0
    for (const l of bookLogs) {
      if (l.current_page - prevPage > 0) dates.add(l.date)
      prevPage = l.current_page
    }
  }
  return dates
}

export function getStreak(logs: ReadingLog[]): number {
  const readDates = getReadingDates(logs)
  let streak = 0
  const cursor = new Date() // local device time

  while (true) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    if (readDates.has(dateStr)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function isComplete(book: Book, logs: ReadingLog[]): boolean {
  return getCurrentPage(book.id, logs) >= book.total_pages
}

// Returns 0=Mon ... 6=Sun for today in the device's local timezone.
export function todayDayOfWeek(): number {
  const jsDay = new Date().getDay() // 0=Sun, 1=Mon... (local)
  return jsDay === 0 ? 6 : jsDay - 1
}

export function clampPage(page: number, totalPages: number): number {
  return Math.max(0, Math.min(page, totalPages))
}

export function progressPercent(currentPage: number, totalPages: number): number {
  if (totalPages === 0) return 0
  return Math.min(100, Math.round((currentPage / totalPages) * 100))
}
