import { Flame } from 'lucide-react'

interface Props {
  streak: number
}

export default function StreakBadge({ streak }: Props) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm"
      style={{ background: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
    >
      <Flame size={15} className={streak > 0 ? 'flame-pulse' : ''} />
      <span>{streak}d</span>
    </div>
  )
}
