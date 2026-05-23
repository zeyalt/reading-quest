import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Read a user's entire 7-day plan (may return fewer rows if the user
// hasn't picked values for every day yet).
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('reading_plan')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Upsert one day of the plan. Idempotent on (user_id, day_of_week).
export async function PUT(req: NextRequest) {
  const supabase = createServiceClient()
  const { user_id, day_of_week, language, target_pages } = await req.json()
  if (!user_id || day_of_week === undefined || day_of_week === null) {
    return NextResponse.json(
      { error: 'user_id and day_of_week required' },
      { status: 400 },
    )
  }
  const { data, error } = await supabase
    .from('reading_plan')
    .upsert(
      {
        user_id,
        day_of_week,
        language: language ?? null,
        target_pages: target_pages ?? 15,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,day_of_week' },
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
