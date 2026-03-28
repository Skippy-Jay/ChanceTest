import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Points configuration
const POINTS = {
  reaction: 5,
  save: 1,
  share: 2,
  dead_report: 3,
  dead_confirmed_bonus: 5,
  submission: 3,
  patrol_alive: 8,
  patrol_dead: 15,
  patrol_sketchy: 10,
  early_discovery: 15,
  accuracy_bonus: 10,
  streak_per_day: 2,
  spam_penalty: -50,
}

async function awardPoints(
  sessionId: string,
  amount: number,
  reason: string,
  urlId?: string,
  metadata?: any
) {
  await supabase.from('points_ledger').insert({
    session_id: sessionId,
    amount,
    reason,
    url_id: urlId || null,
    metadata: metadata || {},
  })

  const { data: existing } = await supabase
    .from('user_stats')
    .select('total_points')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    await supabase
      .from('user_stats')
      .update({
        total_points: existing.total_points + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
  } else {
    await supabase.from('user_stats').insert({
      session_id: sessionId,
      total_points: amount,
    })
  }
}

async function updateReactionStats(sessionId: string, reactionType: string) {
  const { data: existing } = await supabase
    .from('user_stats')
    .select('total_reactions, total_mindblown, total_yawn')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    const updates: any = { total_reactions: (existing.total_reactions || 0) + 1 }
    if (reactionType === 'mindblown') updates.total_mindblown = (existing.total_mindblown || 0) + 1
    if (reactionType === 'yawn') updates.total_yawn = (existing.total_yawn || 0) + 1
    await supabase.from('user_stats').update(updates).eq('session_id', sessionId)
  }
}

async function checkEarlyDiscovery(sessionId: string, urlId: string): Promise<boolean> {
  const { count } = await supabase
    .from('url_events')
    .select('*', { count: 'exact', head: true })
    .eq('url_id', urlId)
    .in('event_type', ['mindblown', 'yawn'])
  return (count || 0) <= 10
}

// ── Helper: has existing reaction (count > 1 because client inserts BEFORE calling API) ──
async function hasExistingReaction(sessionId: string, urlId: string): Promise<boolean> {
  const { count } = await supabase
    .from('url_events')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('url_id', urlId)
    .in('event_type', ['mindblown', 'yawn', 'neutral'])
  return (count || 0) > 1
}

// ── Helper: extract IP from request ──
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, sessionId, urlId } = body

    if (!action || !sessionId) {
      return NextResponse.json({ error: 'Missing action or sessionId' }, { status: 400 })
    }

    // ── Redis rate limit check (replaces old Supabase count queries) ──
    const ip = getClientIP(req)
    const { allowed, retryAfter } = await checkRateLimit(sessionId, action, ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limited', message: 'Slow down! Too many actions.' },
        {
          status: 429,
          headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {},
        }
      )
    }

    let pointsAwarded = 0
    let bonuses: string[] = []

    switch (action) {
      case 'reaction': {
        // Anti-farming: count > 1 because client inserts the reaction BEFORE calling this API
        // so count === 1 means this is the first reaction (expected), count > 1 means duplicate
        if (urlId && await hasExistingReaction(sessionId, urlId)) {
          return NextResponse.json({ success: false, reason: 'already_reacted' })
        }

        pointsAwarded = POINTS.reaction
        await awardPoints(sessionId, pointsAwarded, 'reaction', urlId, { type: body.reactionType })

        if (body.reactionType) {
          await updateReactionStats(sessionId, body.reactionType)
        }

        if (urlId && body.reactionType) {
          const isEarly = await checkEarlyDiscovery(sessionId, urlId)
          await supabase.from('reaction_accuracy').insert({
            session_id: sessionId,
            url_id: urlId,
            user_reaction: body.reactionType,
            is_early: isEarly,
          })

          if (isEarly) {
            await awardPoints(sessionId, POINTS.early_discovery, 'early_discovery', urlId)
            pointsAwarded += POINTS.early_discovery
            bonuses.push('🌟 Early Discovery!')
          }
        }
        break
      }

      case 'save': {
        pointsAwarded = POINTS.save
        await awardPoints(sessionId, pointsAwarded, 'save', urlId)
        const { data: s } = await supabase.from('user_stats').select('total_saves').eq('session_id', sessionId).single()
        if (s) await supabase.from('user_stats').update({ total_saves: (s.total_saves || 0) + 1 }).eq('session_id', sessionId)
        break
      }

      case 'share': {
        pointsAwarded = POINTS.share
        await awardPoints(sessionId, pointsAwarded, 'share', urlId)
        const { data: sh } = await supabase.from('user_stats').select('total_shares').eq('session_id', sessionId).single()
        if (sh) await supabase.from('user_stats').update({ total_shares: (sh.total_shares || 0) + 1 }).eq('session_id', sessionId)
        break
      }

      case 'dead_report': {
        pointsAwarded = POINTS.dead_report
        await awardPoints(sessionId, pointsAwarded, 'dead_report', urlId)
        break
      }

      case 'submission': {
        const verdictType = body.reactionType || ''
        if (verdictType === 'patrol_dead') {
          pointsAwarded = POINTS.patrol_dead
          bonuses.push('💀 Dead link found!')
        } else if (verdictType === 'patrol_sketchy') {
          pointsAwarded = POINTS.patrol_sketchy
          bonuses.push('⚠️ Flagged for review')
        } else if (verdictType === 'patrol_alive') {
          pointsAwarded = POINTS.patrol_alive
          bonuses.push('✅ Verified alive')
        } else {
          pointsAwarded = POINTS.submission
        }
        await awardPoints(sessionId, pointsAwarded, 'submission', urlId, { verdict: verdictType })
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Update streak
    try { await supabase.rpc('update_streak', { p_session_id: sessionId }) } catch {}

    // Update rank
    const { data: stats } = await supabase.from('user_stats').select('total_points').eq('session_id', sessionId).single()

    let rank = 'newcomer'
    if (stats) {
      const pts = stats.total_points
      if (pts >= 10000) rank = 'legend'
      else if (pts >= 5000) rank = 'pioneer'
      else if (pts >= 1000) rank = 'curator'
      else if (pts >= 200) rank = 'explorer'
      await supabase.from('user_stats').update({ rank }).eq('session_id', sessionId)
    }

    return NextResponse.json({
      success: true,
      points: pointsAwarded,
      bonuses,
      rank,
      totalPoints: stats?.total_points || pointsAwarded,
    })
  } catch (err: any) {
    console.error('Points API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET — fetch user stats
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const { data: stats } = await supabase.from('user_stats').select('*').eq('session_id', sessionId).single()

  if (!stats) {
    return NextResponse.json({
      total_points: 0,
      rank: 'newcomer',
      current_streak: 0,
      longest_streak: 0,
      total_reactions: 0,
      total_mindblown: 0,
      total_yawn: 0,
      total_saves: 0,
      total_shares: 0,
      accurate_reactions: 0,
      discovery_score: 0,
      history: [],
    })
  }

  const { data: history } = await supabase
    .from('points_ledger')
    .select('amount, reason, created_at, url_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    ...stats,
    history: history || [],
  })
}
