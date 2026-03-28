import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL
  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server env')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function getCookieFromHeader(req: Request, name: string): string | null {
  var raw = req.headers.get('cookie') || ''
  var parts = raw.split(';').map(function (s) { return s.trim() })
  for (var i = 0; i < parts.length; i++) {
    var idx = parts[i].indexOf('=')
    if (idx === -1) continue
    var k = parts[i].slice(0, idx).trim()
    var v = parts[i].slice(idx + 1).trim()
    if (k === name) return decodeURIComponent(v)
  }
  return null
}

function requireAdminCookie(req: Request) {
  var expected = process.env.ADMIN_API_TOKEN
  if (!expected) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 500 })
  var cookieToken = getCookieFromHeader(req, 'chance_admin_token')
  if (!cookieToken || cookieToken !== expected) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  var unauthorized = requireAdminCookie(req)
  if (unauthorized) return unauthorized

  var supabase = getAdminClient()

  try {
    // ── Hero stats ──
    var [liveUrlsRes, deadUrlsRes, totalUsersRes, totalGoldRes, totalEventsRes] = await Promise.all([
      supabase.from('urls').select('id', { count: 'exact', head: true }).eq('is_dead', false),
      supabase.from('urls').select('id', { count: 'exact', head: true }).eq('is_dead', true),
      supabase.from('user_stats').select('id', { count: 'exact', head: true }),
      supabase.from('user_stats').select('gold_coins'),
      supabase.from('url_events').select('id', { count: 'exact', head: true }),
    ])
    // Count auth users via direct query (service role can read auth.users)
    var authUsersCount = 0
    try { var { data: allStats } = await supabase.from('user_stats').select('session_id'); if (allStats) { authUsersCount = allStats.filter(function (s: any) { return s.session_id && s.session_id.length > 30 }).length } } catch (e) {}
    var totalGold = 0
    if (totalGoldRes.data) { for (var i = 0; i < totalGoldRes.data.length; i++) { totalGold += (totalGoldRes.data[i] as any).gold_coins || 0 } }

    // ── Reactions today ──
    var todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
    var { count: reactionsToday } = await supabase.from('url_events').select('id', { count: 'exact', head: true }).in('event_type', ['mindblown', 'yawn', 'neutral']).gte('created_at', todayStart.toISOString())

    // ── Reactions over time (last 30 days) ──
    var thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    var { data: reactionTimeline } = await supabase.from('url_events').select('event_type, created_at').in('event_type', ['mindblown', 'yawn', 'neutral']).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true })

    // ── URL health ──
    var [embeddableRes, nonEmbeddableRes] = await Promise.all([
      supabase.from('urls').select('id', { count: 'exact', head: true }).eq('is_dead', false).eq('embed_status', 'embeddable'),
      supabase.from('urls').select('id', { count: 'exact', head: true }).eq('is_dead', false).neq('embed_status', 'embeddable'),
    ])

    // ── DAU last 30 days ──
    var { data: dauData } = await supabase.from('points_ledger').select('session_id, created_at').gte('created_at', thirtyDaysAgo.toISOString())

    // ── Top categories by reactions ──
    var { data: catReactions } = await supabase.from('url_events').select('url_id').in('event_type', ['mindblown', 'yawn', 'neutral']).limit(5000)
    var catUrlIds = catReactions ? [...new Set(catReactions.map(function (r: any) { return r.url_id }))] : []
    var catMap: Record<string, number> = {}
    if (catUrlIds.length > 0) {
      // Batch fetch URL categories
      for (var ci = 0; ci < catUrlIds.length; ci += 200) {
        var batch = catUrlIds.slice(ci, ci + 200)
        var { data: urlCats } = await supabase.from('urls').select('id, category').in('id', batch)
        if (urlCats) { for (var j = 0; j < urlCats.length; j++) { var cat = (urlCats[j] as any).category; if (cat) { catMap[cat] = (catMap[cat] || 0) + catReactions!.filter(function (r: any) { return r.url_id === (urlCats[j] as any).id }).length } } }
      }
    }
    var topCategories = Object.entries(catMap).sort(function (a, b) { return b[1] - a[1] }).slice(0, 15).map(function (e) { return { category: e[0], count: e[1] } })

    // ── Reaction sentiment split ──
    var sentimentRes = await Promise.all([
      supabase.from('url_events').select('id', { count: 'exact', head: true }).eq('event_type', 'mindblown'),
      supabase.from('url_events').select('id', { count: 'exact', head: true }).eq('event_type', 'neutral'),
      supabase.from('url_events').select('id', { count: 'exact', head: true }).eq('event_type', 'yawn'),
    ])

    // ── Top users by points ──
    var { data: topUsers } = await supabase.from('user_stats').select('session_id, total_points, gold_coins, current_streak, rank, total_rolls').order('total_points', { ascending: false }).limit(10)

    // ── Streak leaderboard ──
    var { data: streakLeaders } = await supabase.from('user_stats').select('session_id, current_streak, rank').order('current_streak', { ascending: false }).limit(5)

    // ── Skin ownership (from user_stats gold — approximate, no direct skin table) ──
    // This would need localStorage data which we don't have server-side
    // For now, return gold distribution

    // ── Timezone map data ──
    var { data: timezoneData } = await supabase.from('user_stats').select('timezone').not('timezone', 'is', null)

    // ── Points ledger by reason (spark economy) ──
    var { data: sparkEconomy } = await supabase.from('points_ledger').select('reason, amount, created_at').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true })

    // ── Activity heatmap (last 90 days) ──
    var ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    var { data: heatmapData } = await supabase.from('url_events').select('created_at').in('event_type', ['mindblown', 'yawn', 'neutral']).gte('created_at', ninetyDaysAgo.toISOString())

    // ── URL pool exhaustion — per user perspective ──
    // How long until a single power user has seen every URL?
    // Use the highest individual daily roll rate from last 7 days
    var recentHistoryRes = await supabase.from('user_url_history').select('id', { count: 'exact', head: true })
    var totalPoolSize = (liveUrlsRes.count || 0)
    var totalSeen = recentHistoryRes.count || 0
    var sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    var { data: recentRolls } = await supabase.from('url_events').select('session_id').eq('event_type', 'click').gte('created_at', sevenDaysAgo)
    var userRollCounts: Record<string, number> = {}
    for (var rc of (recentRolls || [])) { userRollCounts[rc.session_id] = (userRollCounts[rc.session_id] || 0) + 1 }
    var topUserWeeklyRolls = Math.max(1, ...Object.values(userRollCounts))
    var topUserDailyRolls = Math.round(topUserWeeklyRolls / 7)
    var dailyBurnRate = topUserDailyRolls

    return NextResponse.json({
      ok: true,
      hero: {
        liveUrls: liveUrlsRes.count || 0,
        deadUrls: deadUrlsRes.count || 0,
        totalUsers: totalUsersRes.count || 0,
        authUsers: authUsersCount,
        reactionsToday: reactionsToday || 0,
        totalGold: totalGold,
        totalEvents: totalEventsRes.count || 0,
      },
      urlHealth: {
        embeddable: embeddableRes.count || 0,
        nonEmbeddable: nonEmbeddableRes.count || 0,
        dead: deadUrlsRes.count || 0,
      },
      reactionTimeline: reactionTimeline || [],
      dauData: dauData || [],
      topCategories: topCategories,
      sentiment: {
        mindblown: sentimentRes[0].count || 0,
        neutral: sentimentRes[1].count || 0,
        yawn: sentimentRes[2].count || 0,
      },
      topUsers: topUsers || [],
      streakLeaders: streakLeaders || [],
      timezones: timezoneData || [],
      sparkEconomy: sparkEconomy || [],
      heatmapData: heatmapData || [],
      poolExhaustion: {
        totalPool: totalPoolSize,
        totalSeen: totalSeen,
        dailyBurnRate: dailyBurnRate,
      },
    })
  } catch (err: any) {
    console.error('Analytics API error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}
