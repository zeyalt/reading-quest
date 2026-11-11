import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyPin } from '@/lib/parent'

// Parent's manual +/- correction or bonus.
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { user_id, amount, description, pin } = await req.json()
  if (!(await verifyPin(supabase, pin))) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }
  const n = Math.round(Number(amount))
  if (!user_id || !Number.isFinite(n) || n === 0) {
    return NextResponse.json({ error: 'Reader and a non-zero amount required' }, { status: 400 })
  }
  const reason = String(description ?? '').trim() || (n > 0 ? 'Bonus from parent' : 'Correction')
  const { data, error } = await supabase
    .from('points_transactions')
    .insert({ user_id, amount: n, kind: 'adjust', description: reason })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
