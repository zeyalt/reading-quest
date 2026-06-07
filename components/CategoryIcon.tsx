import {
  Search,
  BookOpen,
  GraduationCap,
  Zap,
  MapPin,
  FlaskConical,
  Languages,
  Archive,
} from 'lucide-react'
import { Category, CATEGORY_COLORS } from '@/lib/types'

const ICONS: Record<Category, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  Mystery: Search,
  Fiction: BookOpen,
  'Non-Fiction': GraduationCap,
  Comic: Zap,
  Singapore: MapPin,
  Science: FlaskConical,
  Chinese: Languages,
  Other: Archive,
}

interface Props {
  category: Category
  size?: number
  containerSize?: number
}

export default function CategoryIcon({ category, size = 18, containerSize = 40 }: Props) {
  const Icon = ICONS[category]
  const color = CATEGORY_COLORS[category] ?? '#FF6B35'

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: containerSize,
        height: containerSize,
        background: color + '18',
        border: `1.5px solid ${color}35`,
      }}
    >
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  )
}
