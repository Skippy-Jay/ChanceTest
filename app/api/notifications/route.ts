import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// GET: Fetch notifications for a user
// ?session_id=xxx              → unread notifications (default)
// ?session_id=xxx&all=1        → all notifications (last 50)
// ?session_id=xxx&count=1      → just unread count
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    const all = searchParams.get('all')
    const countOnly = searchParams.get('count')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    // Count-only mode — lightweight for bell badge
    if (countOnly) {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_read', false)

      return NextResponse.json({ unread_count: count || 0 })
    }

    // Full fetch
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!all) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: data || [],
      unread_count: count || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// POST: Create a notification (used by other API routes internally)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, type, title, body: notifBody, icon, color, metadata } = body

    if (!session_id || !type || !title) {
      return NextResponse.json({ error: 'session_id, type, and title required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        session_id,
        type,
        title,
        body: notifBody || null,
        icon: icon || null,
        color: color || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, notification: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// PATCH: Mark notifications as read
// { action: 'mark_read', id: 'xxx' }           → mark single as read
// { action: 'mark_all_read', session_id: 'xxx' } → mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'mark_read') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'mark_all_read') {
      const { session_id } = body
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('session_id', session_id)
        .eq('is_read', false)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
