import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Weighted random pick from challenge types
function weightedPick(types: any[], count: number, exclude: string[]): any[] {
  var pool = types.filter(function (t: any) { return !exclude.includes(t.key) })
  var picked: any[] = []
  for (var i = 0; i < count && pool.length > 0; i++) {
    var totalWeight = pool.reduce(function (sum: number, t: any) { return sum + (t.weight || 10) }, 0)
    var r = Math.random() * totalWeight
    var cumulative = 0
    for (var j = 0; j < pool.length; j++) {
      cumulative += pool[j].weight || 10
      if (r <= cumulative) {
        picked.push(pool[j])
        pool.splice(j, 1)
        break
      }
    }
  }
  return picked
}

// Generate today's 3 challenges for a user
// Strategy: 1 easy, 1 medium, 1 hard — shuffled into random slots
async function generateDailyChallenges(sessionId: string) {
  var { data: types } = await supabaseAdmin
    .from('challenge_types')
    .select('*')
    .eq('active', true)

  if (!types || types.length === 0) return []

  var easy = types.filter(function (t: any) { return t.difficulty === 'easy' })
  var medium = types.filter(function (t: any) { return t.difficulty === 'medium' })
  var hard = types.filter(function (t: any) { return t.difficulty === 'hard' })

  var picks: any[] = []
  var usedKeys: string[] = []

  // Pick 1 easy
  var easyPick = weightedPick(easy, 1, usedKeys)
  if (easyPick.length > 0) { picks.push(easyPick[0]); usedKeys.push(easyPick[0].key) }

  // Pick 1 medium
  var medPick = weightedPick(medium, 1, usedKeys)
  if (medPick.length > 0) { picks.push(medPick[0]); usedKeys.push(medPick[0].key) }

  // Pick 1 hard
  var hardPick = weightedPick(hard, 1, usedKeys)
  if (hardPick.length > 0) { picks.push(hardPick[0]); usedKeys.push(hardPick[0].key) }

  // If we don't have 3 yet, fill from any difficulty
  while (picks.length < 3) {
    var fill = weightedPick(types, 1, usedKeys)
    if (fill.length === 0) break
    picks.push(fill[0])
    usedKeys.push(fill[0].key)
  }

  // Shuffle slot order
  for (var i = picks.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = picks[i]; picks[i] = picks[j]; picks[j] = tmp
  }

  var today = new Date().toISOString().split('T')[0]
  var rows = picks.map(function (p: any, idx: number) {
    return {
      session_id: sessionId,
      challenge_date: today,
      slot: idx + 1,
      challenge_type_key: p.key,
      requirement: p.requirement,
      spark_reward: p.spark_reward,
      gold_reward: p.gold_reward,
      progress: 0,
      completed: false,
    }
  })

  var { data: inserted, error } = await supabaseAdmin
    .from('daily_challenges')
    .insert(rows)
    .select()

  if (error) {
    console.error('Failed to generate challenges:', error)
    return []
  }

  return inserted || []
}

export async function GET(req: NextRequest) {
  var url = new URL(req.url)
  var sessionId = url.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  var today = new Date().toISOString().split('T')[0]

  // Check if today's challenges exist
  var { data: existing } = await supabaseAdmin
    .from('daily_challenges')
    .select('*, challenge_types!daily_challenges_challenge_type_key_fkey(description, icon, difficulty)')
    .eq('session_id', sessionId)
    .eq('challenge_date', today)
    .order('slot')

  if (existing && existing.length > 0) {
    var allDone = existing.every(function (c: any) { return c.completed })
    return NextResponse.json({ challenges: existing, all_complete: allDone, date: today })
  }

  // Generate new challenges for today
  var generated = await generateDailyChallenges(sessionId)

  // Re-fetch with joined type info
  var { data: fresh } = await supabaseAdmin
    .from('daily_challenges')
    .select('*, challenge_types!daily_challenges_challenge_type_key_fkey(description, icon, difficulty)')
    .eq('session_id', sessionId)
    .eq('challenge_date', today)
    .order('slot')

  var challenges = fresh || generated
  var allComplete = challenges.every(function (c: any) { return c.completed })

  return NextResponse.json({ challenges: challenges, all_complete: allComplete, date: today })
}

// POST — increment progress on a challenge
// body: { session_id, challenge_key, increment?, set_progress? }
export async function POST(req: NextRequest) {
  try {
    var body = await req.json()
    var { session_id, challenge_key, increment, set_progress } = body
    if (!session_id || !challenge_key) {
      return NextResponse.json({ error: 'Missing session_id or challenge_key' }, { status: 400 })
    }

    var today = new Date().toISOString().split('T')[0]

    // Find the active challenge for this user+date+key
    var { data: challenge } = await supabaseAdmin
      .from('daily_challenges')
      .select('*')
      .eq('session_id', session_id)
      .eq('challenge_date', today)
      .eq('challenge_type_key', challenge_key)
      .single()

    if (!challenge) {
      return NextResponse.json({ found: false })
    }

    if (challenge.completed) {
      return NextResponse.json({ found: true, already_complete: true })
    }

    var newProgress = set_progress !== undefined
      ? set_progress
      : challenge.progress + (increment || 1)

    var nowComplete = newProgress >= challenge.requirement
    var updateData: any = { progress: Math.min(newProgress, challenge.requirement) }
    if (nowComplete) {
      updateData.completed = true
      updateData.completed_at = new Date().toISOString()
    }

    await supabaseAdmin
      .from('daily_challenges')
      .update(updateData)
      .eq('id', challenge.id)

    // If just completed, award Spark + Gold
    var awarded = { spark: 0, gold: 0 }
    if (nowComplete) {
      awarded.spark = challenge.spark_reward
      awarded.gold = challenge.gold_reward

      // Award points via user_stats
      if (awarded.spark > 0 || awarded.gold > 0) {
        var { data: stats } = await supabaseAdmin
          .from('user_stats')
          .select('total_points, gold_coins')
          .eq('session_id', session_id)
          .single()

        if (stats) {
          var updates: any = {}
          if (awarded.spark > 0) updates.total_points = (stats.total_points || 0) + awarded.spark
          if (awarded.gold > 0) updates.gold_coins = (stats.gold_coins || 0) + awarded.gold
          await supabaseAdmin.from('user_stats').update(updates).eq('session_id', session_id)
        }
      }

      // Create notification
      try {
        await supabaseAdmin.from('notifications').insert({
          session_id: session_id,
          type: 'challenge_complete',
          title: 'Challenge complete!',
          body: challenge.challenge_type_key.replace(/_/g, ' ') + ' — +' + awarded.spark + ' Spark' + (awarded.gold > 0 ? ' +' + awarded.gold + ' Gold' : ''),
          icon: '✅',
          color: '#34d399',
          metadata: { spark: awarded.spark, gold: awarded.gold, challenge_key: challenge.challenge_type_key },
        })
      } catch (e) {}

      // Check if all 3 are now complete (daily chest — Step 25)
      var { data: allToday } = await supabaseAdmin
        .from('daily_challenges')
        .select('completed')
        .eq('session_id', session_id)
        .eq('challenge_date', today)

      if (allToday && allToday.length === 3 && allToday.every(function (c: any) { return c.completed })) {
        // Daily chest bonus — 25 Spark + 3 Gold
        var chestSpark = 25
        var chestGold = 3
        var { data: s2 } = await supabaseAdmin
          .from('user_stats')
          .select('total_points, gold_coins')
          .eq('session_id', session_id)
          .single()

        if (s2) {
          await supabaseAdmin.from('user_stats').update({
            total_points: (s2.total_points || 0) + chestSpark,
            gold_coins: (s2.gold_coins || 0) + chestGold,
          }).eq('session_id', session_id)
        }

        try {
          await supabaseAdmin.from('notifications').insert({
            session_id: session_id,
            type: 'daily_chest',
            title: 'Daily Chest unlocked!',
            body: 'All 3 challenges complete — +' + chestSpark + ' Spark +' + chestGold + ' Gold',
            icon: '🎁',
            color: '#d4af37',
            metadata: { spark: chestSpark, gold: chestGold },
          })
        } catch (e) {}

        return NextResponse.json({
          found: true,
          completed: true,
          awarded: awarded,
          daily_chest: { spark: chestSpark, gold: chestGold },
          all_complete: true,
        })
      }
    }

    return NextResponse.json({
      found: true,
      completed: nowComplete,
      progress: Math.min(newProgress, challenge.requirement),
      requirement: challenge.requirement,
      awarded: awarded,
    })
  } catch (e) {
    console.error('Challenge POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
