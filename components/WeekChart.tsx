'use client'

import { DAY_NAMES } from '@/lib/types'
import { todayDayOfWeek } from '@/lib/utils'

interface Props {
  data: number[] // 7 values, index 0=Mon
  labels?: string[] // custom labels for each bar; defaults to DAY_NAMES[i]
  highlightIdx?: number // bar index to highlight orange; -1 = none; defaults to todayDayOfWeek()
}

const MAX_STEM = 72 // px height of a full-scale stem
const BUBBLE = 20 // px diameter of the value bubble
const AREA = 96 // px column height — headroom for a full bar + its bubble cap

export default function WeekChart({ data, labels, highlightIdx }: Props) {
  const todayIdx = todayDayOfWeek()
  const max = Math.max(...data, 1)

  return (
    <div className="flex items-end gap-2 w-full">
      {data.map((pages, i) => {
        const isToday = highlightIdx !== undefined ? i === highlightIdx : i === todayIdx
        const hasData = pages > 0
        const stemPx = hasData ? Math.max(8, Math.round((pages / max) * MAX_STEM)) : 0
        const dayLabel = labels?.[i] ?? DAY_NAMES[i]

        // The bubble caps the stem, overlapping its top by a few px so it reads
        // as one lollipop. With no reading it rests on the baseline.
        const bubbleBottom = hasData ? Math.max(0, stemPx - 6) : 0

        const stemBg = isToday
          ? 'linear-gradient(180deg, #FF8A5B 0%, #FF6B35 100%)'
          : 'linear-gradient(180deg, #33D6BC 0%, #00C9A7 100%)'

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2"
            role="img"
            aria-label={`${dayLabel}: ${pages} ${pages === 1 ? 'page' : 'pages'}`}
          >
            <div className="relative w-full" style={{ height: AREA }}>
              {/* Stem */}
              {hasData && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-500 motion-reduce:transition-none"
                  style={{ width: 11, height: stemPx, background: stemBg }}
                />
              )}

              {/* Value bubble — caps the stem, holds the page count */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full transition-all duration-500 motion-reduce:transition-none"
                style={{
                  bottom: bubbleBottom,
                  minWidth: BUBBLE,
                  height: BUBBLE,
                  paddingInline: 4,
                  background: isToday ? '#FF6B35' : hasData ? 'var(--color-card)' : 'var(--color-surface)',
                  border: isToday
                    ? 'none'
                    : hasData
                      ? '2px solid #00C9A7'
                      : '2px solid transparent',
                  boxShadow: hasData ? '0 3px 8px rgba(0,0,0,0.10)' : 'none',
                }}
              >
                <span
                  className="text-[10px] font-bold leading-none"
                  style={{
                    color: isToday ? '#FFFFFF' : hasData ? 'var(--color-text)' : 'var(--color-muted)',
                  }}
                >
                  {pages}
                </span>
              </div>
            </div>

            {/* Day label — a soft chip for today, plain text otherwise */}
            <span
              className="text-[10px] font-bold leading-none rounded-full px-2 py-0.5"
              style={{
                color: isToday ? '#FF6B35' : 'var(--color-muted)',
                background: isToday ? 'rgba(255,107,53,0.12)' : 'transparent',
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
