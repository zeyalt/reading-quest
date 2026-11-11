import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSettingsRow, hashPin, PIN_PATTERN, verifyPin } from '@/lib/parent'

// One endpoint for the parent PIN lifecycle:
//   { action: 'setup',  new_pin }       — only while no PIN exists yet
//   { action: 'verify', pin }           — unlock check
//   { action: 'change', pin, new_pin }  — requires the current PIN
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { action, pin, new_pin } = await req.json()

  if (action === 'verify') {
    const ok = await verifyPin(supabase, pin)
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
  }

  if (action === 'setup' || action === 'change') {
    if (typeof new_pin !== 'string' || !PIN_PATTERN.test(new_pin)) {
      return NextResponse.json({ error: 'PIN must be 4–6 digits' }, { status: 400 })
    }
    const row = await getSettingsRow(supabase)
    if (action === 'setup' && row.pin_hash) {
      return NextResponse.json({ error: 'A PIN is already set' }, { status: 409 })
    }
    if (action === 'change' && !(await verifyPin(supabase, pin))) {
      return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
    }
    const { error } = await supabase
      .from('family_settings')
      .update({ pin_hash: hashPin(new_pin), updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
