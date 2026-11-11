// Server-only helpers for the parent PIN and family settings.
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FamilySettings } from './types'

export const PIN_PATTERN = /^\d{4,6}$/

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function matches(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(pin, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

// Raw row including pin_hash — never return this to a client.
export async function getSettingsRow(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('family_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw new Error(error.message)
  return data as Omit<FamilySettings, 'has_pin'> & { pin_hash: string | null }
}

export function toPublicSettings(row: Awaited<ReturnType<typeof getSettingsRow>>): FamilySettings {
  return {
    has_pin: !!row.pin_hash,
    streak_cap: row.streak_cap,
    streak_requires_target: row.streak_requires_target,
    book_points_main: row.book_points_main,
    book_points_second: row.book_points_second,
    family_goal_pages: row.family_goal_pages,
    family_goal_reward: row.family_goal_reward,
    points_start_date: row.points_start_date,
  }
}

export async function verifyPin(supabase: SupabaseClient, pin: unknown): Promise<boolean> {
  if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) return false
  const row = await getSettingsRow(supabase)
  return !!row.pin_hash && matches(pin, row.pin_hash)
}
