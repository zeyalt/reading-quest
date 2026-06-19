'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Book } from '@/lib/types'

interface BookOption {
  book: Book
  prevPage: number
}

interface BookPickerDropdownProps {
  options: BookOption[]
  value: string
  onChange: (bookId: string) => void
  placeholder?: string
}

export default function BookPickerDropdown({
  options,
  value,
  onChange,
  placeholder = 'Pick a book…',
}: BookPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.book.id === value)
  const selectedBook = selectedOption?.book

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return
      switch (e.key) {
        case 'Escape':
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0) {
            onChange(options[highlightedIndex].book.id)
            setIsOpen(false)
          }
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, options, onChange])

  const getProgressPercent = (option: BookOption) => {
    return Math.round((option.prevPage / option.book.total_pages) * 100)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full rounded-lg border-2 px-3 py-2 font-bold text-sm outline-none flex items-center justify-between gap-2 cursor-pointer transition-all"
        style={{
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-surface)',
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          boxShadow: isOpen ? '0 0 0 3px rgba(255, 107, 53, 0.15)' : 'none',
        }}
      >
        <span className="flex-1 text-left font-bold text-sm" style={{ color: 'var(--color-text)', opacity: selectedBook ? 1 : 0.5 }}>
          {selectedBook ? selectedBook.title : placeholder}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--color-muted)',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--color-card)',
            border: '2px solid var(--color-primary)',
            borderRadius: 12,
            boxShadow: 'var(--color-shadow), 0 12px 32px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: 380,
            overflowY: 'auto',
            padding: 4,
            animation: 'bookPickerSlideDown 0.2s ease',
          }}
        >
          <style>{`
            @keyframes bookPickerSlideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {options.map((option, idx) => {
            const progressPercent = getProgressPercent(option)
            const isHighlighted = highlightedIndex === idx
            return (
              <div
                key={option.book.id}
                role="option"
                aria-selected={value === option.book.id}
                onClick={() => {
                  onChange(option.book.id)
                  setIsOpen(false)
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: '10px 10px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background 0.15s ease',
                  userSelect: 'none',
                  background: isHighlighted ? 'var(--color-surface)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      lineHeight: 1.3,
                      flex: 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {option.book.title}
                  </div>
                  {option.book.language && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        flexShrink: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      {option.book.language}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    background: 'var(--color-surface)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #00C9A7 0%, #4FD9C4 100%)',
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 11,
                    color: 'var(--color-muted)',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    p.{option.prevPage} / {option.book.total_pages}
                  </span>
                  <span>{progressPercent}% read</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
