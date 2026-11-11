import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// A reader's balance + full transaction history (newest first).
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const balance = data.reduce((s, r) => s + r.amount, 0)
  return NextResponse.json({ balance, transactions: data })
}
