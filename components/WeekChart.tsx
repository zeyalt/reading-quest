'use client'

import { DAY_NAMES } from '@/lib/types'
import { todayDayOfWeek } from '@/lib/utils'

interface Props {
  data: number[] // 7 values, index 0=Mon
  labels?: string[] // custom labels for each bar; defaults to DAY_NAMES[i]
  highlightIdx?: number // bar index to highlight orange; -1 = none; defaults to todayDayOfWeek()
}

const MAX_STEM = 70 // px height of a full-scale stem
const BUBBLE = 24 // px diameter of the value bubble
const AREA = 98 // px column height — headroom for a full bar + its bubble cap
const STEM_W = 8 // px stem width — thin, so the bubble reads as a lollipop head

export default function WeekChart({ data, labels, highlightIdx }: Props) {
  const todayIdx = todayDayOfWeek()
  const max = Math.max(...data, 1)

  // Text summary so screen readers get the week's gist, not just 7 disjoint bars.
  const total = data.reduce((s, n) => s + n, 0)
  const daysRead = data.filter((n) => n > 0).length
  const summary =
    total === 0
      ? 'Pages read this week: none logged yet.'
      : `Pages read this week: ${total} across ${daysRead} ${daysRead === 1 ? 'day' : 'days'}.`

  return (
    <div className="flex items-end gap-2 w-full" role="group" aria-label={summary}>
      {data.map((pages, i) => {
        const isToday = highlightIdx !== undefined ? i === highlightIdx : i === todayIdx
        const hasData = pages > 0
        const stemPx = hasData ? Math.max(8, Math.round((pages / max) * MAX_STEM)) : 0
        const dayLabel = labels?.[i] ?? DAY_NAMES[i]

        // The bubble caps the stem, overlapping its top by a few px so it reads
        // as one lollipop. With no reading it rests on the baseline.
        const bubbleBottom = hasData ? Math.max(0, stemPx - 6) : 0

        // Today is orange, other days are teal — each with its own "ink" line
        // so the stems read as little sticker bars.
        const fill = isToday ? 'var(--candy-orange)' : 'var(--candy-teal)'
        const ink = isToday ? 'var(--candy-orange-ink)' : 'var(--candy-teal-ink)'

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2"
            role="img"
            aria-label={`${dayLabel}${isToday ? ' (today)' : ''}: ${pages} ${pages === 1 ? 'page' : 'pages'}`}
          >
            <div className="relative w-full" style={{ height: AREA }}>
              {/* Stem — a thin rounded lollipop stick (the bubble is the head) */}
              {hasData && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-500 motion-reduce:transition-none"
                  style={{
                    width: STEM_W,
                    height: stemPx,
                    background: fill,
                    border: `1.5px solid ${ink}`,
                  }}
                />
              )}

              {/* Value bubble — caps the stem, holds the page count */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full transition-all duration-500 motion-reduce:transition-none"
                style={{
                  bottom: bubbleBottom,
                  minWidth: BUBBLE,
                  height: BUBBLE,
                  paddingInline: 5,
                  background: hasData ? fill : 'var(--color-surface)',
                  border: hasData ? `2px solid ${ink}` : '2px solid transparent',
                  boxShadow: hasData ? `1.5px 2px 0 0 ${ink}` : 'none',
                }}
              >
                <span
                  className="text-[11px] font-extrabold leading-none"
                  style={{ color: hasData ? '#FFFFFF' : 'var(--color-muted)' }}
                >
                  {pages}
                </span>
              </div>
            </div>

            {/* Day label — a coloured chip for today, plain text otherwise */}
            <span
              className="text-[10px] font-extrabold leading-none rounded-full px-2 py-0.5"
              style={{
                color: isToday ? '#fff' : 'var(--color-muted)',
                background: isToday ? 'var(--candy-orange)' : 'transparent',
              }}
            >
              {dayLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
