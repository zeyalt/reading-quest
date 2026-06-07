export interface User {
  id: string
  name: string
  avatar_emoji: string
  avatar_color: string
  created_at: string
}

export interface Book {
  id: string
  title: string
  author: string | null
  total_pages: number
  category: Category
  language: Language
  cover_color: string
  created_at: string
  is_active: boolean
}

export interface ReadingLog {
  id: string
  user_id: string
  book_id: string
  date: string // YYYY-MM-DD
  current_page: number
  logged_at: string
}

export interface ReadingPlan {
  user_id: string
  day_of_week: number // 0=Mon ... 6=Sun
  language: Language | null
  target_pages: number
  updated_at: string
}

export type Category =
  | 'Mystery'
  | 'Fiction'
  | 'Non-Fiction'
  | 'Comic'
  | 'Singapore'
  | 'Science'
  | 'Chinese'
  | 'Other'

export type Language =
  | 'English'
  | 'Chinese'
  | 'Malay'
  | 'Tamil'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Mystery',
  'Fiction',
  'Non-Fiction',
  'Comic',
  'Singapore',
  'Science',
  'Chinese',
  'Other',
]

export const LANGUAGES: Language[] = [
  'English',
  'Chinese',
  'Malay',
  'Tamil',
  'Other',
]

export const CATEGORY_COLORS: Record<Category, string> = {
  Mystery: '#4A90D9',
  Fiction: '#00C9A7',
  'Non-Fiction': '#5C6BC0',
  Comic: '#FF6B35',
  Singapore: '#EE4266',
  Science: '#2EC4B6',
  Chinese: '#E85D75',
  Other: '#845EC2',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  English: '🇬🇧',
  Chinese: '🇨🇳',
  Malay: '🇲🇾',
  Tamil: '🇮🇳',
  Other: '🌐',
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const AVATAR_OPTIONS = ['🦊', '🐰', '🐻', '🦝', '🐸', '🦋', '🦉', '🐢', '🦦', '🦁', '🐼', '🦜', '🦆', '🐱', '🐶', '🦇', '🐙', '🦈']

export const AVATAR_COLORS = [
  '#FF6B35', '#FFD93D', '#00C9A7', '#4A90D9',
  '#EE4266', '#845EC2', '#2EC4B6', '#E85D75',
]
