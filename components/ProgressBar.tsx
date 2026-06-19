'use client'

import { useEffect, useState } from 'react'

interface Props {
  percent: number
  color?: string
  height?: number
}

export default function ProgressBar({ percent, color = 'var(--color-primary)', height = 10 }: Props) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 80)
    return () => clearTimeout(t)
  }, [percent])

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'var(--color-surface)' }}
    >
      <div
        className="h-full rounded-full progress-bar-fill"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  )
}
