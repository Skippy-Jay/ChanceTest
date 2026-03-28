import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──

/**
 * Get the effective user ID: Supabase Auth user ID if logged in,
 * otherwise falls back to the localStorage session ID.
 * This allows a smooth transition — existing sessions keep working.
 */
export async function getEffectiveUserId(): Promise<string> {
  // Try Supabase Auth first
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch {}

  // Fall back to localStorage session
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem('chance_session_id')
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem('chance_session_id', sid)
  }
  return sid
}

/**
 * Check if user is authenticated via Supabase Auth (not just localStorage)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch {
    return false
  }
}

/**
 * Get the current Supabase Auth user (or null)
 */
export async function getAuthUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}
