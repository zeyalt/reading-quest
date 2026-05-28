'use client'

import { DAY_NAMES } from '@/lib/types'
import { todayDayOfWeek } from '@/lib/utils'

interface Props {
  data: number[] // 7 values, index 0=Mon
  labels?: string[] // custom labels for each bar; defaults to DAY_NAMES[i]
  highlightIdx?: number // bar index to highlight orange; -1 = none; defaults to todayDayOfWeek()
}

export default function WeekChart({ data, labels, highlightIdx }: Props) {
  const todayIdx = todayDayOfWeek()
  const max = Math.max(...data, 1)

  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {data.map((pages, i) => {
        const isToday = highlightIdx !== undefined ? i === highlightIdx : i === todayIdx
        const heightPct = (pages / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end" style={{ height: 60 }}>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: pages > 0 ? `${heightPct}%` : 4,
                  background: isToday ? '#FF6B35' : pages > 0 ? '#FFD93D' : '#F0E8E0',
                  minHeight: 4,
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold leading-none"
              style={{ color: isToday ? '#FF6B35' : '#9A9A9A' }}
            >
              {labels?.[i] ?? DAY_NAMES[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
