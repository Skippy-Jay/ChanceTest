import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
var supabase = createClient(supabaseUrl, supabaseKey)

var DAILY_REPORT_LIMIT = 10
var GOLD_REWARD = 1
var FETCH_TIMEOUT_MS = 5000

async function isUrlDead(url: string): Promise<boolean> {
  try {
    var controller = new AbortController()
    var timeout = setTimeout(function () { controller.abort() }, FETCH_TIMEOUT_MS)

    var res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChanceBot/1.0; +https://chanceapp.io)',
        'Accept': 'text/html,application/xhtml+xml,*/*'
      }
    })
    clearTimeout(timeout)

    // 4xx and 5xx = dead
    if (res.status >= 400) return true

    // Some servers block HEAD but allow GET — try GET if HEAD returns weird status
    if (res.status === 405 || res.status === 0) {
      var controller2 = new AbortController()
      var timeout2 = setTimeout(function () { controller2.abort() }, FETCH_TIMEOUT_MS)
      try {
        var res2 = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ChanceBot/1.0; +https://chanceapp.io)',
            'Accept': 'text/html,application/xhtml+xml,*/*'
          }
        })
        clearTimeout(timeout2)
        return res2.status >= 400
      } catch (e) {
        clearTimeout(timeout2)
        return true
      }
    }

    return false
  } catch (e: any) {
    // Network error, DNS failure, timeout = dead
    if (e.name === 'AbortError') return true
    return true
  }
}

export async function POST(request: NextRequest) {
  try {
    var body = await request.json()
    var { session_id, url_id, url } = body

    if (!session_id || !url_id || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check daily report count
    var today = new Date().toISOString().split('T')[0]
    var { count: todayCount } = await supabase
      .from('dead_reports')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .gte('created_at', today + 'T00:00:00Z')

    if ((todayCount || 0) >= DAILY_REPORT_LIMIT) {
      return NextResponse.json({
        success: false,
        dead: false,
        message: 'Daily report limit reached',
        gold_awarded: 0
      })
    }

    // Check if already reported by this user
    var { data: existing } = await supabase
      .from('dead_reports')
      .select('id')
      .eq('url_id', url_id)
      .eq('session_id', session_id)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: false,
        dead: false,
        message: 'Already reported',
        gold_awarded: 0
      })
    }

    // Verify the URL
    var dead = await isUrlDead(url)

    if (dead) {
      // Mark URL as dead
      await supabase.from('urls').update({ is_dead: true }).eq('id', url_id)

      // Insert dead report
      await supabase.from('dead_reports').insert({
        url_id: url_id,
        session_id: session_id,
        verified: true
      })

      // Award gold
      try {
        var { data: gStats } = await supabase
          .from('user_stats')
          .select('gold_coins')
          .eq('session_id', session_id)
          .single()
        if (gStats) {
          await supabase.from('user_stats')
            .update({ gold_coins: (gStats.gold_coins || 0) + GOLD_REWARD })
            .eq('session_id', session_id)
        }
      } catch (e) {}

      // Use raw SQL-style increment
      try {
        await supabase.rpc('increment_dead_reports', { p_session_id: session_id })
      } catch (e) {
        // Fallback: manual increment
        var { data: st } = await supabase.from('user_stats')
          .select('confirmed_dead_reports, total_gold_earned')
          .eq('session_id', session_id).single()
        if (st) {
          await supabase.from('user_stats').update({
            confirmed_dead_reports: (st.confirmed_dead_reports || 0) + 1,
            total_gold_earned: (st.total_gold_earned || 0) + GOLD_REWARD
          }).eq('session_id', session_id)
        }
      }

      // Check achievements
      var achievements_unlocked: string[] = []
      var { data: userStats } = await supabase.from('user_stats')
        .select('confirmed_dead_reports')
        .eq('session_id', session_id).single()
      var deadCount = userStats?.confirmed_dead_reports || 0

      var { data: allDeadAchs } = await supabase.from('achievements')
        .select('key, requirement')
        .in('key', ['dead_link_hunter_ach', 'grim_reaper'])
        .eq('active', true)

      if (allDeadAchs) {
        for (var ach of allDeadAchs) {
          if (deadCount >= ach.requirement) {
            var { data: existing_ach } = await supabase.from('user_achievements')
              .select('id').eq('session_id', session_id).eq('achievement_key', ach.key).limit(1)
            if (!existing_ach || existing_ach.length === 0) {
              await supabase.from('user_achievements').insert({
                session_id: session_id,
                achievement_key: ach.key
              })
              achievements_unlocked.push(ach.key)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        dead: true,
        message: 'Dead link confirmed',
        gold_awarded: GOLD_REWARD,
        achievements_unlocked: achievements_unlocked
      })
    } else {
      // URL is alive — no reward, no report saved
      return NextResponse.json({
        success: true,
        dead: false,
        message: 'Link appears to be working',
        gold_awarded: 0
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
