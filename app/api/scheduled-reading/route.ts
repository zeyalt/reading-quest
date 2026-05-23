import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Fetch materialized schedule rows for a user, optionally filtered by date
// range. Used by the /schedule page to render the upcoming calendar.
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const userId = req.nextUrl.searchParams.get('user_id')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }
  let query = supabase
    .from('scheduled_reading')
    .select('*')
    .eq('user_id', userId)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  query = query.order('date')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
