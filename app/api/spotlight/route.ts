import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch a random active spotlight for the feed or library
// Feed: called every ~10 rolls. Library: called on category browse.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  const source = req.nextUrl.searchParams.get('source') || 'feed'
  const category = req.nextUrl.searchParams.get('category')

  try {
    const today = new Date().toISOString().split('T')[0]

    // Get active spotlights that haven't exceeded budget/max impressions
    // and user hasn't already seen (scoped by source so feed and library are independent)
    const { data: seen } = await supabase
      .from('spotlight_impressions')
      .select('spotlight_id')
      .eq('session_id', sessionId)
      .eq('source', source)

    const seenIds = (seen || []).map((s: any) => s.spotlight_id)

    let query = supabase
      .from('spotlight_urls')
      .select('*')
      .eq('status', 'active')

    // Filter by source placement
    if (source === 'library') {
      query = query.eq('library_enabled', true)
    } else {
      query = query.eq('feed_enabled', true)
    }

    const { data: spotlights } = await query

    if (!spotlights || spotlights.length === 0) {
      return NextResponse.json({ spotlight: null })
    }

    // Filter: within date range, not over budget, not over max impressions, not seen by user
    // Library: also filter by category targeting
    const eligible = spotlights.filter(function (s: any) {
      if (s.start_date && today < s.start_date) return false
      if (s.end_date && today > s.end_date) return false
      if (s.budget_cents > 0 && s.spent_cents >= s.budget_cents) return false
      if (s.max_impressions && s.total_impressions >= s.max_impressions) return false
      if (seenIds.includes(s.id)) return false
      // Library: match category targeting (null = any category)
      if (source === 'library' && category && s.category_target && s.category_target !== category) return false
      return true
    })

    if (eligible.length === 0) {
      return NextResponse.json({ spotlight: null })
    }

    // Pick random
    const picked = eligible[Math.floor(Math.random() * eligible.length)]

    // Calculate CPI based on source
    const cpiCents = source === 'library' ? (picked.library_cpi_cents || 3) : (picked.cost_per_impression_cents || 5)

    // Record impression with source
    await supabase.from('spotlight_impressions').insert({
      spotlight_id: picked.id,
      session_id: sessionId,
      source: source,
    })

    // Increment impression count + spend
    var updateFields: any = {
      total_impressions: (picked.total_impressions || 0) + 1,
      spent_cents: (picked.spent_cents || 0) + cpiCents,
      updated_at: new Date().toISOString(),
    }
    // Track library impressions separately
    if (source === 'library') {
      updateFields.library_impressions = (picked.library_impressions || 0) + 1
    }
    await supabase.from('spotlight_urls').update(updateFields).eq('id', picked.id)

    // Check if now exhausted
    if (picked.budget_cents > 0 && (picked.spent_cents + picked.cost_per_impression_cents) >= picked.budget_cents) {
      await supabase.from('spotlight_urls').update({ status: 'exhausted' }).eq('id', picked.id)
    }
    if (picked.max_impressions && (picked.total_impressions + 1) >= picked.max_impressions) {
      await supabase.from('spotlight_urls').update({ status: 'exhausted' }).eq('id', picked.id)
    }

    return NextResponse.json({
      spotlight: {
        id: picked.id,
        url: picked.url,
        domain: picked.domain,
        title: picked.title,
        description: picked.description,
        advertiser_name: picked.advertiser_name,
        spark_bonus: picked.spark_bonus || 3,
        category_target: picked.category_target,
      }
    })
  } catch (err: any) {
    console.error('Spotlight GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: Record reaction on a spotlight
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, spotlight_id, reaction, clicked } = body

    if (!session_id || !spotlight_id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Update impression with reaction
    if (reaction) {
      await supabase.from('spotlight_impressions').update({
        reaction,
      }).eq('spotlight_id', spotlight_id).eq('session_id', session_id)

      // Update spotlight reaction counts
      const reactionField = reaction === 'mindblown' ? 'total_mindblown' : reaction === 'yawn' ? 'total_yawn' : 'total_neutral'
      const { data: spot } = await supabase
        .from('spotlight_urls')
        .select(reactionField)
        .eq('id', spotlight_id)
        .single()

      if (spot) {
        await supabase.from('spotlight_urls').update({
          [reactionField]: ((spot as any)[reactionField] || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', spotlight_id)
      }

      // Award bonus spark to user for rating a spotlight
      const { data: spotInfo } = await supabase
        .from('spotlight_urls')
        .select('spark_bonus')
        .eq('id', spotlight_id)
        .single()

      const sparkBonus = spotInfo?.spark_bonus || 3

      // Award spark
      const { data: stats } = await supabase
        .from('user_stats')
        .select('total_points, gold_coins')
        .eq('session_id', session_id)
        .single()

      if (stats) {
        await supabase.from('user_stats').update({
          total_points: (stats.total_points || 0) + sparkBonus,
        }).eq('session_id', session_id)
      }

      // Log in points ledger
      await supabase.from('points_ledger').insert({
        session_id,
        amount: sparkBonus,
        reason: 'spotlight_reaction',
        metadata: { spotlight_id, reaction },
      })

      // Update impression spark
      await supabase.from('spotlight_impressions').update({
        spark_awarded: sparkBonus,
      }).eq('spotlight_id', spotlight_id).eq('session_id', session_id)

      return NextResponse.json({ success: true, spark_bonus: sparkBonus })
    }

    // Record click
    if (clicked) {
      await supabase.from('spotlight_impressions').update({
        clicked: true,
      }).eq('spotlight_id', spotlight_id).eq('session_id', session_id)

      const { data: spot } = await supabase
        .from('spotlight_urls')
        .select('total_clicks')
        .eq('id', spotlight_id)
        .single()

      if (spot) {
        await supabase.from('spotlight_urls').update({
          total_clicks: (spot.total_clicks || 0) + 1,
        }).eq('id', spotlight_id)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to do' }, { status: 400 })
  } catch (err: any) {
    console.error('Spotlight POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
