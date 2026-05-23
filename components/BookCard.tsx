'use client'

import { useState } from 'react'
import { Book, ReadingLog, CATEGORY_COLORS } from '@/lib/types'
import { getCurrentPage, progressPercent } from '@/lib/utils'
import ProgressBar from './ProgressBar'
import PageUpdateInput from './PageUpdateInput'
import CategoryIcon from './CategoryIcon'
import { Check, Trash2 } from 'lucide-react'

interface Props {
  book: Book
  logs: ReadingLog[]
  userId: string
  onUpdate?: (bookId: string, newPage: number) => void
  onDelete?: (bookId: string) => void
  compact?: boolean
}

export default function BookCard({ book, logs, userId, onUpdate, onDelete, compact }: Props) {
  const [expanded, setExpanded] = useState(false)
  const currentPage = getCurrentPage(book.id, logs)
  const percent = progressPercent(currentPage, book.total_pages)
  const color = CATEGORY_COLORS[book.category] ?? '#FF6B35'
  const complete = currentPage >= book.total_pages

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => !compact && setExpanded((e) => !e)}>
        <CategoryIcon category={book.category} size={18} containerSize={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm leading-tight line-clamp-1">{book.title}</span>
            {complete && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: '#d4edda', color: '#155724' }}>
                <Check size={12} /> Done
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#9A9A9A' }}>{book.author}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#F0E8E0', color: '#9A9A9A' }}>
              {book.language}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} color={color} height={8} />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: '#9A9A9A' }}>p.{currentPage}/{book.total_pages}</span>
              <span className="text-xs font-bold" style={{ color }}>{percent}%</span>
            </div>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(book.id) }}
            className="p-1 rounded-lg hover:bg-red-50"
            style={{ color: '#9A9A9A' }}
            aria-label="Remove book"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && !compact && onUpdate && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F0E8E0' }}>
          <PageUpdateInput
            userId={userId}
            bookId={book.id}
            currentPage={currentPage}
            totalPages={book.total_pages}
            onUpdate={(newPage) => onUpdate(book.id, newPage)}
          />
        </div>
      )}
    </div>
  )
}
