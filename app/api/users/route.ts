import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { name, avatar_emoji, avatar_color } = await req.json()

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, avatar_emoji, avatar_color })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create 7 blank schedule rows for this user
  const scheduleRows = Array.from({ length: 7 }, (_, i) => ({
    user_id: user.id,
    day_of_week: i,
    book_id: null,
    target_pages: 15,
  }))
  await supabase.from('schedule').insert(scheduleRows)

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient()
  const { id, name, avatar_emoji, avatar_color } = await req.json()

  const { data: user, error } = await supabase
    .from('users')
    .update({ name, avatar_emoji, avatar_color })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient()
  const { id } = await req.json()
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
