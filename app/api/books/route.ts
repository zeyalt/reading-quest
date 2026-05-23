import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const active = req.nextUrl.searchParams.get('active')
  let query = supabase.from('books').select('*').order('category').order('title')
  if (active !== 'false') query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { title, author, total_pages, category, language, cover_color } = await req.json()
  const { data, error } = await supabase
    .from('books')
    .insert({ title, author, total_pages, category, language: language ?? 'English', cover_color })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
