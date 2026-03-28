import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, url, reason, details } = body

    if (!session_id || !url || !reason) {
      return NextResponse.json({ error: 'session_id, url, and reason required' }, { status: 400 })
    }

    const validReasons = ['offensive', 'selling_products', 'broken_experience', 'spam', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // Check if URL exists in our database
    var normalizedUrl = url.replace(/\/+$/, '')
    const { data: existing } = await supabase
      .from('urls')
      .select('id')
      .or('url.eq.' + normalizedUrl + ',url.eq.' + normalizedUrl + '/')
      .limit(1)
      .single()

    // Check for duplicate report from same user on same URL
    if (existing) {
      const { data: dupeCheck } = await supabase
        .from('site_reports')
        .select('id')
        .eq('session_id', session_id)
        .eq('url_id', existing.id)
        .eq('status', 'pending')
        .limit(1)
        .single()

      if (dupeCheck) {
        return NextResponse.json({ error: 'You already reported this site' })
      }
    }

    // Insert the report
    const { error } = await supabase
      .from('site_reports')
      .insert({
        session_id,
        url_id: existing?.id || null,
        url: normalizedUrl,
        reason,
        details: details || null,
        status: 'pending',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
