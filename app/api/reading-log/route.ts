import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { todaySGT } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('user_id')
  const bookId = searchParams.get('book_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = searchParams.get('limit')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  let query = supabase
    .from('reading_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('logged_at', { ascending: false })

  if (bookId) query = query.eq('book_id', bookId)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (limit) query = query.limit(parseInt(limit))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { user_id, book_id, current_page, date } = await req.json()

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const logDate = date ?? todaySGT()

  const { data, error } = await supabase
    .from('reading_log')
    .upsert(
      { user_id, book_id, current_page, date: logDate },
      { onConflict: 'user_id,book_id,date' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
