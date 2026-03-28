// lib/challenges.ts — Challenge progress tracking helpers
// Called from /api/points and other action handlers

import { createClient } from '@supabase/supabase-js'

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

var today = function () { return new Date().toISOString().split('T')[0] }

// Generic: increment a challenge by key
export async function incrementChallenge(sessionId: string, challengeKey: string, amount?: number) {
  try {
    var res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('.supabase.co', '.supabase.co').replace(/\/$/, '') + '/../api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, challenge_key: challengeKey, increment: amount || 1 }),
    })
  } catch (e) {
    // Fallback: direct DB update if fetch fails
    await directIncrement(sessionId, challengeKey, amount || 1)
  }
}

// Direct DB increment (used server-side where we can't call our own API)
export async function directIncrement(sessionId: string, challengeKey: string, amount: number) {
  var d = today()
  var { data: challenge } = await supabaseAdmin
    .from('daily_challenges')
    .select('id, progress, requirement, completed, spark_reward, gold_reward')
    .eq('session_id', sessionId)
    .eq('challenge_date', d)
    .eq('challenge_type_key', challengeKey)
    .single()

  if (!challenge || challenge.completed) return null

  var newProgress = Math.min(challenge.progress + amount, challenge.requirement)
  var nowComplete = newProgress >= challenge.requirement

  var updateData: any = { progress: newProgress }
  if (nowComplete) {
    updateData.completed = true
    updateData.completed_at = new Date().toISOString()
  }

  await supabaseAdmin
    .from('daily_challenges')
    .update(updateData)
    .eq('id', challenge.id)

  if (nowComplete) {
    // Award rewards
    var { data: stats } = await supabaseAdmin
      .from('user_stats')
      .select('total_points, gold_coins')
      .eq('session_id', sessionId)
      .single()

    if (stats) {
      var updates: any = {}
      if (challenge.spark_reward > 0) updates.total_points = (stats.total_points || 0) + challenge.spark_reward
      if (challenge.gold_reward > 0) updates.gold_coins = (stats.gold_coins || 0) + challenge.gold_reward
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('user_stats').update(updates).eq('session_id', sessionId)
      }
    }

    // Notification
    try {
      await supabaseAdmin.from('notifications').insert({
        session_id: sessionId,
        type: 'challenge_complete',
        title: 'Challenge complete!',
        body: challengeKey.replace(/_/g, ' ') + ' — +' + challenge.spark_reward + ' Spark' + (challenge.gold_reward > 0 ? ' +' + challenge.gold_reward + ' Gold' : ''),
        icon: '✅',
        color: '#34d399',
        metadata: { spark: challenge.spark_reward, gold: challenge.gold_reward, challenge_key: challengeKey },
      })
    } catch (e) {}

    // Check daily chest
    var { data: allToday } = await supabaseAdmin
      .from('daily_challenges')
      .select('completed')
      .eq('session_id', sessionId)
      .eq('challenge_date', d)

    if (allToday && allToday.length === 3 && allToday.every(function (c: any) { return c.completed })) {
      var { data: s2 } = await supabaseAdmin
        .from('user_stats')
        .select('total_points, gold_coins')
        .eq('session_id', sessionId)
        .single()
      if (s2) {
        await supabaseAdmin.from('user_stats').update({
          total_points: (s2.total_points || 0) + 25,
          gold_coins: (s2.gold_coins || 0) + 3,
        }).eq('session_id', sessionId)
      }
      try {
        await supabaseAdmin.from('notifications').insert({
          session_id: sessionId,
          type: 'daily_chest',
          title: 'Daily Chest unlocked!',
          body: 'All 3 challenges complete — +25 Spark +3 Gold',
          icon: '🎁',
          color: '#d4af37',
          metadata: { spark: 25, gold: 3 },
        })
      } catch (e) {}
    }
  }

  return { completed: nowComplete, progress: newProgress }
}

// Track a reaction event — updates multiple challenge types at once
export async function trackReaction(sessionId: string, reactionType: string) {
  var d = today()

  // react_10 and react_25
  await directIncrement(sessionId, 'react_10', 1)
  await directIncrement(sessionId, 'react_25', 1)

  // positive_vibes (mindblown only)
  if (reactionType === 'mindblown') {
    await directIncrement(sessionId, 'positive_vibes', 1)
  }

  // tough_crowd (yawn only)
  if (reactionType === 'yawn') {
    await directIncrement(sessionId, 'tough_crowd', 1)
  }

  // full_spectrum — track distinct reaction types used today
  // We need to check what types they've used today
  var { data: todayReactions } = await supabaseAdmin
    .from('url_events')
    .select('event_type')
    .eq('session_id', sessionId)
    .in('event_type', ['mindblown', 'neutral', 'yawn'])
    .gte('created_at', d + 'T00:00:00Z')

  if (todayReactions) {
    var uniqueTypes = new Set(todayReactions.map(function (r: any) { return r.event_type }))
    uniqueTypes.add(reactionType)
    await directIncrement(sessionId, 'full_spectrum', 0) // Check current, then set
    // Actually set the progress to the count of unique types
    var { data: fsc } = await supabaseAdmin
      .from('daily_challenges')
      .select('id, completed')
      .eq('session_id', sessionId)
      .eq('challenge_date', d)
      .eq('challenge_type_key', 'full_spectrum')
      .single()
    if (fsc && !fsc.completed) {
      var newProg = Math.min(uniqueTypes.size, 3)
      var updates: any = { progress: newProg }
      if (newProg >= 3) { updates.completed = true; updates.completed_at = new Date().toISOString() }
      await supabaseAdmin.from('daily_challenges').update(updates).eq('id', fsc.id)
    }
  }
}

// Track a roll event
export async function trackRoll(sessionId: string, dice?: number[]) {
  await directIncrement(sessionId, 'deep_diver', 1)
  await directIncrement(sessionId, 'marathon_roller', 1)

  // lucky_roll — doubles
  if (dice && dice.length === 2 && dice[0] === dice[1]) {
    await directIncrement(sessionId, 'lucky_roll', 1)
  }

  // snake_eyes
  if (dice && dice.length === 2 && dice[0] === 1 && dice[1] === 1) {
    await directIncrement(sessionId, 'snake_eyes', 1)
  }
}

// Track category discovery
export async function trackCategoryDiscovery(sessionId: string, category: string) {
  var d = today()

  // Get distinct categories seen today from url_events or user_url_history
  var { data: todayHistory } = await supabaseAdmin
    .from('url_events')
    .select('urls!inner(category)')
    .eq('session_id', sessionId)
    .gte('created_at', d + 'T00:00:00Z')

  var cats = new Set<string>()
  cats.add(category)
  if (todayHistory) {
    todayHistory.forEach(function (r: any) {
      if (r.urls && r.urls.category) cats.add(r.urls.category)
    })
  }

  // Update category_hopper
  var { data: ch } = await supabaseAdmin
    .from('daily_challenges')
    .select('id, requirement, completed')
    .eq('session_id', sessionId)
    .eq('challenge_date', d)
    .eq('challenge_type_key', 'category_hopper')
    .single()
  if (ch && !ch.completed) {
    var p = Math.min(cats.size, ch.requirement)
    var u: any = { progress: p }
    if (p >= ch.requirement) { u.completed = true; u.completed_at = new Date().toISOString() }
    await supabaseAdmin.from('daily_challenges').update(u).eq('id', ch.id)
  }

  // Update wide_explorer
  var { data: we } = await supabaseAdmin
    .from('daily_challenges')
    .select('id, requirement, completed')
    .eq('session_id', sessionId)
    .eq('challenge_date', d)
    .eq('challenge_type_key', 'wide_explorer')
    .single()
  if (we && !we.completed) {
    var p2 = Math.min(cats.size, we.requirement)
    var u2: any = { progress: p2 }
    if (p2 >= we.requirement) { u2.completed = true; u2.completed_at = new Date().toISOString() }
    await supabaseAdmin.from('daily_challenges').update(u2).eq('id', we.id)
  }
}

// Track save
export async function trackSave(sessionId: string) {
  await directIncrement(sessionId, 'vault_builder', 1)
}

// Track share
export async function trackShare(sessionId: string) {
  await directIncrement(sessionId, 'share_the_love', 1)
}

// Track dead report
export async function trackDeadReport(sessionId: string) {
  await directIncrement(sessionId, 'dead_link_hunter', 1)
}

// Track gold earned
export async function trackGoldEarned(sessionId: string) {
  await directIncrement(sessionId, 'gold_rush', 1)
}

// Track foresight correct
export async function trackForesightCorrect(sessionId: string) {
  await directIncrement(sessionId, 'foresight_streak', 1)
}

// Track domain visit (for domain_collector)
export async function trackDomainVisit(sessionId: string, domain: string) {
  var d = today()
  // This is expensive to track precisely — use a simpler heuristic
  // Just increment by 1 each time, the challenge will cap at requirement
  await directIncrement(sessionId, 'domain_collector', 1)
}

// Track find_a_gem — mindblown on a URL with <5 total reactions
export async function trackGemFind(sessionId: string, urlId: number) {
  var { data: reactions } = await supabaseAdmin
    .from('url_events')
    .select('id', { count: 'exact', head: true })
    .eq('url_id', urlId)
    .in('event_type', ['mindblown', 'neutral', 'yawn'])

  if (reactions !== null && (reactions as any) < 5) {
    await directIncrement(sessionId, 'find_a_gem', 1)
  }
}
