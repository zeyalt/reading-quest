import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('schedule')
    .select('*, book:books(*)')
    .order('day_of_week')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { day_of_week, book_id, target_pages } = body
  const { data, error } = await supabase
    .from('schedule')
    .upsert({ day_of_week, book_id, target_pages }, { onConflict: 'day_of_week' })
    .select('*, book:books(*)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
