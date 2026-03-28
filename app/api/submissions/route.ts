import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOLD_REWARDS: Record<string, number> = {
  regular: 2,
  epic: 5,
  'snake-eyes': 8,
  legendary: 10,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, url, suggested_tier } = body

    if (!session_id || !url) {
      return NextResponse.json({ error: 'Missing session_id or url' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    // Remove trailing slash for consistency
    normalizedUrl = normalizedUrl.replace(/\/+$/, '')

    const tier = ['regular', 'epic', 'snake-eyes', 'legendary'].includes(suggested_tier) ? suggested_tier : 'regular'

    // Check if URL already exists in the main urls table
    const { data: existingUrl } = await supabase
      .from('urls')
      .select('id, url, category, is_dead')
      .or(`url.eq.${normalizedUrl},url.eq.${normalizedUrl}/`)
      .limit(1)
      .single()

    if (existingUrl) {
      // Determine the tier of the existing URL based on category
      let existingTier = 'regular'
      if (existingUrl.category === 'legendary') existingTier = 'legendary'
      else if (existingUrl.category === 'snake-eyes') existingTier = 'snake-eyes'
      else if (existingUrl.category === 'epic') existingTier = 'epic'

      return NextResponse.json({
        duplicate: true,
        existing: {
          category: existingUrl.category,
          tier: existingTier,
          is_dead: existingUrl.is_dead,
        }
      })
    }

    // Check if user already submitted this URL
    const { data: existingSub } = await supabase
      .from('url_submissions')
      .select('id, status, suggested_tier')
      .eq('session_id', session_id)
      .eq('url', normalizedUrl)
      .single()

    if (existingSub) {
      return NextResponse.json({
        already_submitted: true,
        status: existingSub.status,
        suggested_tier: existingSub.suggested_tier,
      })
    }

    // Also check if anyone else already submitted this URL
    const { data: otherSub } = await supabase
      .from('url_submissions')
      .select('id, status')
      .eq('url', normalizedUrl)
      .limit(1)
      .single()

    if (otherSub) {
      return NextResponse.json({
        already_submitted: true,
        status: otherSub.status,
        by_other: true,
      })
    }

    // Insert submission
    const { data: newSub, error } = await supabase
      .from('url_submissions')
      .insert({
        session_id,
        url: normalizedUrl,
        suggested_tier: tier,
      })
      .select()
      .single()

    if (error) {
      console.error('Submission insert error:', error)
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }

    return NextResponse.json({ success: true, submission: newSub })

  } catch (err) {
    console.error('Submissions API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET: Check submission status for a user, or check for approved submissions (notification)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const session_id = url.searchParams.get('session_id')
  const check_approved = url.searchParams.get('check_approved')

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // Check for newly approved submissions that haven't been seen
  if (check_approved === '1') {
    const { data } = await supabase
      .from('url_submissions')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'approved')
      .eq('gold_awarded', 0)
      .order('reviewed_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ pending_rewards: data || [] })
  }

  // Get user's submission history
  const { data } = await supabase
    .from('url_submissions')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ submissions: data || [] })
}
