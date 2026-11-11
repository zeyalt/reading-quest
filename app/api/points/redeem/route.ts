import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyPin } from '@/lib/parent'
import { getBalance } from '@/lib/points'

// Spend points on a reward. Needs the parent PIN, entered on the spot.
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { user_id, reward_id, pin } = await req.json()
  if (!user_id || !reward_id) {
    return NextResponse.json({ error: 'user_id and reward_id required' }, { status: 400 })
  }
  if (!(await verifyPin(supabase, pin))) {
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

  const { data: reward, error: rErr } = await supabase
    .from('rewards').select('*').eq('id', reward_id).eq('is_active', true).single()
  if (rErr || !reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })

  const balance = await getBalance(supabase, user_id)
  if (balance < reward.cost) {
    return NextResponse.json({ error: `Not enough points (${balance} / ${reward.cost})` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('points_transactions')
    .insert({
      user_id,
      amount: -reward.cost,
      kind: 'redeem',
      description: `${reward.emoji} ${reward.name}`,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data, balance: balance - reward.cost }, { status: 201 })
}
