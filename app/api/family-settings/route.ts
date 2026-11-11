import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSettingsRow, toPublicSettings, verifyPin } from '@/lib/parent'

export async function GET() {
  const supabase = createServiceClient()
  try {
    return NextResponse.json(toPublicSettings(await getSettingsRow(supabase)))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

const intOrNull = (v: unknown) => (v === null || v === '' || v === undefined ? null : Math.round(Number(v)))

// Parent-only. Accepts any subset of the editable fields.
export async function PUT(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  if (!(await verifyPin(supabase, body.pin))) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('streak_cap' in body) patch.streak_cap = intOrNull(body.streak_cap)
  if ('streak_requires_target' in body) patch.streak_requires_target = !!body.streak_requires_target
  if ('book_points_main' in body) patch.book_points_main = intOrNull(body.book_points_main) ?? 0
  if ('book_points_second' in body) patch.book_points_second = intOrNull(body.book_points_second) ?? 0
  if ('family_goal_pages' in body) patch.family_goal_pages = intOrNull(body.family_goal_pages)
  if ('family_goal_reward' in body) patch.family_goal_reward = String(body.family_goal_reward ?? '').trim() || null

  const { error } = await supabase.from('family_settings').update(patch).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(toPublicSettings(await getSettingsRow(supabase)))
}
