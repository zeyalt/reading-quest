import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyPin } from '@/lib/parent'

// GET /api/rewards        → active rewards (the shop)
// GET /api/rewards?all=1  → including hidden ones (parent editor)
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  let query = supabase.from('rewards').select('*').order('cost').order('created_at')
  if (!req.nextUrl.searchParams.get('all')) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function clean(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  if ('name' in body) out.name = String(body.name ?? '').trim()
  if ('emoji' in body) out.emoji = String(body.emoji ?? '').trim() || '🎁'
  if ('cost' in body) out.cost = Math.round(Number(body.cost))
  if ('is_active' in body) out.is_active = !!body.is_active
  return out
}

async function guard(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const ok = await verifyPin(supabase, body.pin)
  return { supabase, body, ok }
}

const wrongPin = () => NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })

export async function POST(req: NextRequest) {
  const { supabase, body, ok } = await guard(req)
  if (!ok) return wrongPin()
  const row = clean(body)
  if (!row.name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await supabase.from('rewards').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { supabase, body, ok } = await guard(req)
  if (!ok) return wrongPin()
  const { data, error } = await supabase.from('rewards').update(clean(body)).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// Safe to hard-delete: past redemptions keep their own description text.
export async function DELETE(req: NextRequest) {
  const { supabase, body, ok } = await guard(req)
  if (!ok) return wrongPin()
  const { error } = await supabase.from('rewards').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
