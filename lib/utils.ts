import { ReadingLog, Book } from './types'

const SGT_OFFSET = 8 * 60 // minutes

export function todaySGT(): string {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const sgt = new Date(utc + SGT_OFFSET * 60000)
  return sgt.toISOString().split('T')[0]
}

export function toSGTDate(date: Date): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const sgt = new Date(utc + SGT_OFFSET * 60000)
  return sgt.toISOString().split('T')[0]
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

export function getStreak(logs: ReadingLog[]): number {
  let streak = 0
  const check = new Date()
  const utc = check.getTime() + check.getTimezoneOffset() * 60000
  const sgtNow = new Date(utc + SGT_OFFSET * 60000)

  while (true) {
    const dateStr = sgtNow.toISOString().split('T')[0]
    if (logs.some((l) => l.date === dateStr)) {
      streak++
      sgtNow.setDate(sgtNow.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function isComplete(book: Book, logs: ReadingLog[]): boolean {
  return getCurrentPage(book.id, logs) >= book.total_pages
}

// Returns 0=Mon ... 6=Sun for today in SGT
export function todayDayOfWeek(): number {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const sgt = new Date(utc + SGT_OFFSET * 60000)
  const jsDay = sgt.getDay() // 0=Sun, 1=Mon...
  return jsDay === 0 ? 6 : jsDay - 1
}

export function clampPage(page: number, totalPages: number): number {
  return Math.max(0, Math.min(page, totalPages))
}

export function progressPercent(currentPage: number, totalPages: number): number {
  if (totalPages === 0) return 0
  return Math.min(100, Math.round((currentPage / totalPages) * 100))
}
