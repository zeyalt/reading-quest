import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { CATEGORY_COLORS } from '@/lib/types'

const BOOKS = [
  { title: 'The Naval Treaty', author: 'Arthur Conan Doyle', total_pages: 40, category: 'Mystery', language: 'English' },
  { title: 'The Sign of Four', author: 'Arthur Conan Doyle', total_pages: 100, category: 'Mystery', language: 'English' },
  { title: 'The Veiled Lodger', author: 'Arthur Conan Doyle', total_pages: 30, category: 'Mystery', language: 'English' },
  { title: 'The Speckled Band', author: 'Arthur Conan Doyle', total_pages: 40, category: 'Mystery', language: 'English' },
  { title: 'The Three Students', author: 'Arthur Conan Doyle', total_pages: 35, category: 'Mystery', language: 'English' },
  { title: 'The Sussex Vampire', author: 'Arthur Conan Doyle', total_pages: 30, category: 'Mystery', language: 'English' },
  { title: 'The Red-Headed League', author: 'Arthur Conan Doyle', total_pages: 40, category: 'Mystery', language: 'English' },
  { title: 'The Reigate Squire', author: 'Arthur Conan Doyle', total_pages: 35, category: 'Mystery', language: 'English' },
  { title: 'A Study in Scarlet', author: 'Arthur Conan Doyle', total_pages: 96, category: 'Mystery', language: 'English' },
  { title: 'Dog Man', author: 'Dav Pilkey', total_pages: 240, category: 'Comic', language: 'English' },
  { title: 'Gangsta Granny', author: 'David Walliams', total_pages: 296, category: 'Fiction', language: 'English' },
  { title: 'The Academy', author: 'T.Z. Layton', total_pages: 200, category: 'Fiction', language: 'English' },
  { title: 'The Witches', author: 'Roald Dahl', total_pages: 208, category: 'Fiction', language: 'English' },
  { title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', total_pages: 176, category: 'Fiction', language: 'English' },
  { title: 'The Magic Finger', author: 'Roald Dahl', total_pages: 56, category: 'Fiction', language: 'English' },
  { title: 'Spectacular Sports', author: 'Angele Lee', total_pages: 48, category: 'Singapore', language: 'English' },
  { title: 'Secrets of Singapore', author: 'Various', total_pages: 64, category: 'Singapore', language: 'English' },
  { title: 'Sherlock Sam: Burgled Book in Kampong Glam', author: 'A.J. Low', total_pages: 144, category: 'Singapore', language: 'English' },
  { title: "Harry Potter and the Philosopher's Stone", author: 'J.K. Rowling', total_pages: 223, category: 'Fiction', language: 'English' },
] as const

export async function POST() {
  const supabase = createServiceClient()

  const booksWithColors = BOOKS.map((b) => ({
    ...b,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cover_color: (CATEGORY_COLORS as any)[b.category] ?? '#FF6B35',
  }))

  const titles = booksWithColors.map((b) => b.title)
  const { data: existing, error: fetchError } = await supabase
    .from('books')
    .select('id, title')
    .in('title', titles)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const existingByTitle = new Map((existing ?? []).map((b) => [b.title, b.id]))
  const toInsert = booksWithColors.filter((b) => !existingByTitle.has(b.title))

  let inserted = 0
  let updated = 0

  if (toInsert.length > 0) {
    const { data, error } = await supabase.from('books').insert(toInsert).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = data?.length ?? 0
  }

  for (const book of booksWithColors) {
    const id = existingByTitle.get(book.title)
    if (!id) continue
    const { error } = await supabase
      .from('books')
      .update({
        author: book.author,
        total_pages: book.total_pages,
        category: book.category,
        language: book.language,
        cover_color: book.cover_color,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updated++
  }

  return NextResponse.json({ inserted, updated })
}
