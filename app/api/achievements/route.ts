import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
var supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  var sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  try {
    var { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!achievements) return NextResponse.json({ achievements: [], unlocked: [], progress: {} })

    var { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_key, unlocked_at')
      .eq('session_id', sessionId)

    var unlockedKeys = new Set((userAchievements || []).map(function (a: any) { return a.achievement_key }))
    var unlockedMap: Record<string, string> = {}
    ;(userAchievements || []).forEach(function (a: any) { unlockedMap[a.achievement_key] = a.unlocked_at })

    var { data: stats } = await supabase
      .from('user_stats')
      .select('total_rolls, total_points, current_streak, max_streak, gold_coins, total_doubles, total_snake_eyes, consecutive_doubles, max_consecutive_doubles, total_gold_earned, confirmed_dead_reports')
      .eq('session_id', sessionId)
      .single()

    var s = stats || { total_rolls: 0, total_points: 0, current_streak: 0, max_streak: 0, gold_coins: 0, total_doubles: 0, total_snake_eyes: 0, consecutive_doubles: 0, max_consecutive_doubles: 0, total_gold_earned: 0, confirmed_dead_reports: 0 }

    var { count: reactionCount } = await supabase
      .from('url_events')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .in('event_type', ['mindblown', 'yawn', 'neutral'])

    var { data: reactionTypes } = await supabase
      .from('url_events')
      .select('event_type')
      .eq('session_id', sessionId)
      .in('event_type', ['mindblown', 'yawn', 'neutral'])
    var distinctReactions = new Set((reactionTypes || []).map(function (r: any) { return r.event_type })).size

    var { count: shareCount } = await supabase
      .from('url_events')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('event_type', 'share')

    var { count: vaultCount } = await supabase
      .from('vault_saves')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sessionId)

    var { count: foresightCount } = await supabase
      .from('foresight_results')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('was_correct', true)

    var { count: challengeCount } = await supabase
      .from('daily_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('completed', true)

    var ownedSkins: string[] = ['ivory']
    try {
      var { data: skinData } = await supabase
        .from('user_stats')
        .select('owned_skins')
        .eq('session_id', sessionId)
        .single()
      if (skinData && skinData.owned_skins) ownedSkins = skinData.owned_skins
    } catch (e) {}

    var hasLegendary = ownedSkins.includes('matrix') || ownedSkins.includes('celestial')

    // ── URL Submission counts (for new submission achievements) ──
    var { count: totalSubmissions } = await supabase
      .from('url_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    var { count: approvedSubmissions } = await supabase
      .from('url_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'approved')

    var { count: approvedLegendary } = await supabase
      .from('url_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'approved')
      .eq('approved_tier', 'legendary')

    var { count: approvedSnakeEyes } = await supabase
      .from('url_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'approved')
      .eq('approved_tier', 'snake-eyes')

    // ── Spotlight reaction count ──
    var { count: spotlightReactions } = await supabase
      .from('spotlight_impressions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .not('reaction', 'is', null)

    var progress: Record<string, { current: number; requirement: number }> = {}
    for (var ach of achievements) {
      var current = 0
      switch (ach.key) {
        // Rolling
        case 'first_roll': case 'getting_started': case 'regular_roller': case 'dice_addict': case 'thousand_rolls':
        case 'unstoppable': case 'five_thousand_club': case 'ten_thousand':
          current = s.total_rolls || 0; break
        // Reactions
        case 'first_reaction': case 'critic': case 'tastemaker': case 'connoisseur': case 'archivist':
          current = reactionCount || 0; break
        case 'full_spectrum_ach':
          current = distinctReactions; break
        // Dice luck — binary (first time)
        case 'lucky_doubles':
          current = (s.total_doubles || 0) >= 1 ? 1 : 0; break
        case 'snake_eyes_ach':
          current = (s.total_snake_eyes || 0) >= 1 ? 1 : 0; break
        case 'boxcars':
          current = unlockedKeys.has(ach.key) ? ach.requirement : 0; break
        // Dice luck — cumulative
        case 'double_trouble': case 'doubles_master':
          current = s.total_doubles || 0; break
        case 'snake_charmer':
          current = s.total_snake_eyes || 0; break
        case 'lucky_seven': case 'double_down':
          current = s.max_consecutive_doubles || 0; break
        // Ranks
        case 'rank_explorer': case 'rank_pioneer': case 'rank_curator': case 'rank_visionary': case 'rank_legend':
          current = s.total_points || 0; break
        // Streaks
        case 'on_fire': case 'weekly_warrior': case 'fortnight': case 'month_strong': case 'quarter_year': case 'year_one':
          current = Math.max(s.current_streak || 0, s.max_streak || 0); break
        // Collection
        case 'first_skin':
          current = Math.max(0, ownedSkins.length - 1); break
        case 'collector':
          current = ownedSkins.length; break
        case 'full_set':
          current = ownedSkins.length; break
        case 'legendary_unlock':
          current = hasLegendary ? 1 : 0; break
        case 'gold_hoarder':
          current = s.total_gold_earned || 0; break
        // Social
        case 'first_share':
          current = shareCount || 0; break
        case 'vault_started':
          current = vaultCount || 0; break
        case 'vault_collector':
          current = vaultCount || 0; break
        case 'dead_link_hunter_ach': case 'grim_reaper':
          current = s.confirmed_dead_reports || 0; break
        case 'fortune_teller': case 'oracle':
          current = foresightCount || 0; break
        case 'challenge_champion':
          current = challengeCount || 0; break
        // ── URL Submissions ──
        case 'scout': case 'pipeline':
          current = totalSubmissions || 0; break
        case 'contributor': case 'curators_eye':
          current = approvedSubmissions || 0; break
        case 'kingmaker':
          current = approvedLegendary || 0; break
        case 'snake_charmer_scout':
          current = approvedSnakeEyes || 0; break
        // ── Spotlight ──
        case 'spotlight_critic': case 'spotlight_veteran': case 'spotlight_legend':
          current = spotlightReactions || 0; break
        default:
          current = 0
      }
      progress[ach.key] = { current: Math.min(current, ach.requirement), requirement: ach.requirement }
    }

    var categories: Record<string, any[]> = {}
    for (var a of achievements) {
      if (!categories[a.category]) categories[a.category] = []
      categories[a.category].push({
        ...a,
        unlocked: unlockedKeys.has(a.key),
        unlocked_at: unlockedMap[a.key] || null,
        progress: progress[a.key]
      })
    }

    var categoryOrder = ['rolling', 'reactions', 'dice', 'ranks', 'streaks', 'collection', 'social']
    var categoryLabels: Record<string, string> = {
      rolling: 'Discovery',
      reactions: 'Reactions',
      dice: 'Dice Luck',
      ranks: 'Ranks',
      streaks: 'Streaks',
      collection: 'Collection',
      social: 'Community'
    }

    var groupedResult = categoryOrder.map(function (cat) {
      var items = categories[cat] || []
      var unlocked = items.filter(function (i: any) { return i.unlocked }).length
      return {
        key: cat,
        label: categoryLabels[cat] || cat,
        total: items.length,
        unlocked: unlocked,
        achievements: items
      }
    }).filter(function (g) { return g.total > 0 })

    var totalUnlocked = (userAchievements || []).length
    var totalAchievements = achievements.length

    return NextResponse.json({
      categories: groupedResult,
      total: totalAchievements,
      unlocked: totalUnlocked,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch achievements' }, { status: 500 })
  }
}
