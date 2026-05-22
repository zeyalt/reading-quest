export interface Book {
  id: string
  title: string
  author: string | null
  total_pages: number
  category: Category
  cover_color: string
  created_at: string
  is_active: boolean
}

export interface Schedule {
  id: string
  day_of_week: number // 0=Mon ... 6=Sun
  book_id: string | null
  target_pages: number
  book?: Book | null
}

export interface ReadingLog {
  id: string
  book_id: string
  date: string // YYYY-MM-DD
  current_page: number
  logged_at: string
}

export type Category =
  | 'Mystery'
  | 'Fiction'
  | 'Comic'
  | 'Singapore'
  | 'Science'
  | 'Chinese'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Mystery',
  'Fiction',
  'Comic',
  'Singapore',
  'Science',
  'Chinese',
  'Other',
]

export const CATEGORY_COLORS: Record<Category, string> = {
  Mystery: '#4A90D9',
  Fiction: '#00C9A7',
  Comic: '#FF6B35',
  Singapore: '#EE4266',
  Science: '#2EC4B6',
  Chinese: '#E85D75',
  Other: '#845EC2',
}

export const CATEGORY_EMOJIS: Record<Category, string> = {
  Mystery: '🔍',
  Fiction: '📖',
  Comic: '💥',
  Singapore: '🇸🇬',
  Science: '🔬',
  Chinese: '🈶',
  Other: '📚',
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
