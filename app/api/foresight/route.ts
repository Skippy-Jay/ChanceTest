import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

var MIN_REACTIONS = 2
var EARLY_THRESHOLD = 2
var CONSENSUS_PCT = 50
var CORRECT_POINTS = 25
var INCORRECT_POINTS = -5
var CORRECT_GOLD = 3
var MIN_AGE_HOURS = 24
var MAX_BATCH = 100

var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSb() { return createClient(supabaseUrl, supabaseServiceKey) }

function isAdmin(request: Request): boolean {
  var cookies = request.headers.get('cookie') || ''
  var hasAdmin = cookies.includes('admin_auth=') || cookies.includes('chance_admin_token=')
  var authHeader = request.headers.get('authorization') || ''
  var hasToken = authHeader.replace('Bearer ', '') === (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || '')
  return hasAdmin || hasToken
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    var sb = getSb()
    var debug: string[] = []

    var { data: allReactions, error: reactErr } = await sb
      .from('url_events')
      .select('url_id, session_id, event_type, created_at')
      .in('event_type', ['mindblown', 'neutral', 'yawn'])
      .order('created_at', { ascending: true })

    if (reactErr || !allReactions) return NextResponse.json({ error: 'Query failed', detail: reactErr?.message }, { status: 500 })

    debug.push('Total reactions: ' + allReactions.length)

    var byUrl: Record<string, Array<{ session_id: string; event_type: string; created_at: string }>> = {}
    for (var i = 0; i < allReactions.length; i++) {
      var key = String(allReactions[i].url_id)
      if (!byUrl[key]) byUrl[key] = []
      byUrl[key].push({ session_id: allReactions[i].session_id, event_type: allReactions[i].event_type, created_at: allReactions[i].created_at })
    }

    var urlKeys = Object.keys(byUrl)
    debug.push('URLs with reactions: ' + urlKeys.length)

    var now = Date.now()
    var eligible: Array<{ urlId: number; uniqueEvents: Array<{ session_id: string; event_type: string; reaction_number: number }> }> = []

    for (var a = 0; a < urlKeys.length; a++) {
      var events = byUrl[urlKeys[a]]
      var seenUsers = new Set<string>()
      var uniq: Array<{ session_id: string; event_type: string; reaction_number: number }> = []
      for (var b = 0; b < events.length; b++) {
        if (!seenUsers.has(events[b].session_id)) {
          seenUsers.add(events[b].session_id)
          uniq.push({ session_id: events[b].session_id, event_type: events[b].event_type, reaction_number: uniq.length + 1 })
        }
      }
      if (uniq.length < MIN_REACTIONS) continue
      var firstTime = new Date(events[0].created_at).getTime()
      var hoursOld = (now - firstTime) / (1000 * 60 * 60)
      if (hoursOld < MIN_AGE_HOURS) continue
      eligible.push({ urlId: parseInt(urlKeys[a]), uniqueEvents: uniq })
    }

    debug.push('Eligible (2+ users, 24h+): ' + eligible.length)

    if (eligible.length === 0) {
      await sb.from('foresight_runs').insert({ urls_processed: 0, awards_given: 0, total_points_awarded: 0 })
      return NextResponse.json({ processed: 0, awards: 0, debug: debug, message: 'No eligible URLs' })
    }

    var eligIds = eligible.map(function (e) { return e.urlId })
    var { data: unproc } = await sb.from('urls').select('id').in('id', eligIds).eq('foresight_processed', false)
    var unprocSet = new Set((unproc || []).map(function (u: any) { return u.id }))
    eligible = eligible.filter(function (e) { return unprocSet.has(e.urlId) })
    debug.push('Unprocessed: ' + eligible.length)

    if (eligible.length === 0) {
      await sb.from('foresight_runs').insert({ urls_processed: 0, awards_given: 0, total_points_awarded: 0 })
      return NextResponse.json({ processed: 0, awards: 0, debug: debug, message: 'All already processed' })
    }

    var totalProcessed = 0
    var totalAwards = 0
    var totalPointsAwarded = 0
    var resultsToInsert: any[] = []
    var pointsToInsert: any[] = []
    var statsUpdates: Record<string, number> = {}
    var goldUpdates: Record<string, number> = {}

    for (var c = 0; c < Math.min(eligible.length, MAX_BATCH); c++) {
      var entry = eligible[c]
      var ue = entry.uniqueEvents
      var counts: Record<string, number> = { mindblown: 0, neutral: 0, yawn: 0 }
      for (var d = 0; d < ue.length; d++) { counts[ue[d].event_type] = (counts[ue[d].event_type] || 0) + 1 }

      var totalUnique = ue.length
      var consensusType = ''
      var consensusPct = 0
      var types = ['mindblown', 'neutral', 'yawn']
      for (var e = 0; e < types.length; e++) {
        var pct = (counts[types[e]] / totalUnique) * 100
        if (pct > consensusPct) { consensusPct = pct; consensusType = types[e] }
      }

      if (consensusPct < CONSENSUS_PCT) {
        await sb.from('urls').update({ foresight_processed: true, foresight_processed_at: new Date().toISOString() }).eq('id', entry.urlId)
        totalProcessed++
        debug.push('URL ' + entry.urlId + ': no consensus (' + Math.round(consensusPct) + '%)')
        continue
      }

      debug.push('URL ' + entry.urlId + ': ' + consensusType + ' ' + Math.round(consensusPct) + '%, ' + totalUnique + ' users')

      for (var f = 0; f < ue.length; f++) {
        if (ue[f].reaction_number > EARLY_THRESHOLD) continue
        var correct = ue[f].event_type === consensusType
        var pts = correct ? CORRECT_POINTS : INCORRECT_POINTS
        var goldEarned = correct ? CORRECT_GOLD : 0

        resultsToInsert.push({
          session_id: ue[f].session_id, url_id: entry.urlId, user_reaction: ue[f].event_type,
          consensus_reaction: consensusType, was_correct: correct, points_awarded: pts,
          reaction_number: ue[f].reaction_number, total_reactions: totalUnique,
          consensus_percentage: Math.round(consensusPct * 100) / 100, seen_by_user: false
        })

        pointsToInsert.push({
          session_id: ue[f].session_id, amount: pts, reason: 'foresight', url_id: entry.urlId,
          metadata: { was_correct: correct, user_reaction: ue[f].event_type, consensus: consensusType, consensus_pct: Math.round(consensusPct), reaction_number: ue[f].reaction_number, gold: goldEarned }
        })

        statsUpdates[ue[f].session_id] = (statsUpdates[ue[f].session_id] || 0) + pts
        if (goldEarned > 0) goldUpdates[ue[f].session_id] = (goldUpdates[ue[f].session_id] || 0) + goldEarned
        totalPointsAwarded += pts
        totalAwards++
      }

      await sb.from('urls').update({ foresight_processed: true, foresight_processed_at: new Date().toISOString() }).eq('id', entry.urlId)
      totalProcessed++
    }

    if (resultsToInsert.length > 0) {
      var { error: rErr } = await sb.from('foresight_results').insert(resultsToInsert)
      if (rErr) debug.push('Results err: ' + rErr.message)
    }
    if (pointsToInsert.length > 0) {
      var { error: pErr } = await sb.from('points_ledger').insert(pointsToInsert)
      if (pErr) debug.push('Points err: ' + pErr.message)
    }

    var sids = Object.keys(statsUpdates)
    for (var g = 0; g < sids.length; g++) {
      var { data: st } = await sb.from('user_stats').select('total_points, foresight_score, gold_coins').eq('session_id', sids[g]).single()
      if (st) {
        var goldDelta = goldUpdates[sids[g]] || 0
        await sb.from('user_stats').update({ total_points: (st.total_points || 0) + statsUpdates[sids[g]], foresight_score: (st.foresight_score || 0) + statsUpdates[sids[g]], gold_coins: (st.gold_coins || 0) + goldDelta }).eq('session_id', sids[g])
        debug.push(sids[g].slice(0, 8) + ': ' + (statsUpdates[sids[g]] > 0 ? '+' : '') + statsUpdates[sids[g]] + ' spark' + (goldDelta > 0 ? ', +' + goldDelta + ' gold' : ''))
      }
    }

    await sb.from('foresight_runs').insert({ urls_processed: totalProcessed, awards_given: totalAwards, total_points_awarded: totalPointsAwarded })

    return NextResponse.json({ processed: totalProcessed, awards: totalAwards, points_awarded: totalPointsAwarded, results: resultsToInsert.length, debug: debug, message: 'Foresight complete' })

  } catch (err: any) {
    return NextResponse.json({ error: 'Engine failed', detail: err.message, stack: err.stack }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    var url = new URL(request.url)
    var sessionId = url.searchParams.get('session_id')
    var action = url.searchParams.get('action')
    var sb = getSb()

    if (action === 'should_run') {
      var { data: lastRun } = await sb.from('foresight_runs').select('ran_at').order('ran_at', { ascending: false }).limit(1).single()
      var shouldRun = true
      if (lastRun) { var hrs = (Date.now() - new Date(lastRun.ran_at).getTime()) / (1000 * 60 * 60); shouldRun = hrs >= 6 }
      return NextResponse.json({ should_run: shouldRun })
    }

    if (sessionId) {
      var allMode = url.searchParams.get('all') === '1'
      var query = sb.from('foresight_results').select('id, url_id, user_reaction, consensus_reaction, was_correct, points_awarded, consensus_percentage, created_at').eq('session_id', sessionId).order('created_at', { ascending: false })
      if (!allMode) query = query.eq('seen_by_user', false).limit(10)
      else query = query.limit(50)
      var { data: results } = await query
      if (results && results.length > 0) {
        var fIds = results.map(function (x: any) { return x.url_id })
        var { data: uInfo } = await sb.from('urls').select('id, url, title, category').in('id', fIds)
        var uMap: Record<number, any> = {}
        if (uInfo) { for (var h = 0; h < uInfo.length; h++) { uMap[uInfo[h].id] = uInfo[h] } }
        results = results.map(function (x: any) { return Object.assign({}, x, { url_info: uMap[x.url_id] || null }) })
      }
      if (allMode) {
        var { count: totalPredictions } = await sb.from('foresight_results').select('id', { count: 'exact', head: true }).eq('session_id', sessionId)
        var { count: correctPredictions } = await sb.from('foresight_results').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('was_correct', true)
        var { data: goldData } = await sb.from('foresight_results').select('points_awarded, was_correct').eq('session_id', sessionId)
        var totalGoldEarned = 0; var totalSparkEarned = 0
        if (goldData) { for (var gi = 0; gi < goldData.length; gi++) { totalSparkEarned += goldData[gi].points_awarded; if (goldData[gi].was_correct) totalGoldEarned += 3 } }
        return NextResponse.json({ results: results || [], stats: { total: totalPredictions || 0, correct: correctPredictions || 0, accuracy: totalPredictions ? Math.round(((correctPredictions || 0) / totalPredictions) * 100) : 0, gold_earned: totalGoldEarned, spark_earned: totalSparkEarned } })
      }
      return NextResponse.json({ results: results || [] })
    }

    var { data: runs } = await sb.from('foresight_runs').select('*').order('ran_at', { ascending: false }).limit(5)
    var { count: totalR } = await sb.from('foresight_results').select('id', { count: 'exact', head: true })
    var { count: correctR } = await sb.from('foresight_results').select('id', { count: 'exact', head: true }).eq('was_correct', true)
    return NextResponse.json({ recent_runs: runs || [], total_results: totalR || 0, correct_predictions: correctR || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    var body = await request.json()
    if (!body.session_id || !body.result_ids) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    var sb = getSb()
    await sb.from('foresight_results').update({ seen_by_user: true }).in('id', body.result_ids).eq('session_id', body.session_id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
