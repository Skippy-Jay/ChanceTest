import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')
    const catsParam = req.nextUrl.searchParams.get('categories')

    const categories = catsParam ? catsParam.split(',').filter(Boolean) : []
    const isPotluck = categories.length === 0 || (categories.length === 1 && categories[0] === 'potluck')

    // Get URLs the user has already seen recently (last 50)
    let seenIds: number[] = []
    if (sessionId) {
      const { data: seen } = await supabase
        .from('url_events')
        .select('url_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (seen) seenIds = seen.map((s: any) => s.url_id)
    }

    // Build query: top-rated embeddable URLs from picked categories
    let query = supabase
      .from('urls')
      .select('id, url, domain, title, description, category, embed_status')
      .eq('is_dead', false)
      .eq('embed_status', 'embeddable')

    if (!isPotluck && categories.length > 0) {
      query = query.in('category', categories)
    }

    // Exclude already seen
    if (seenIds.length > 0) {
      query = query.not('id', 'in', '(' + seenIds.join(',') + ')')
    }

    // Get a pool of candidates
    const { data: candidates } = await query.limit(200)

    if (!candidates || candidates.length === 0) {
      // Fallback: any embeddable URL
      const { data: fallback } = await supabase
        .from('urls')
        .select('id, url, domain, title, description, category, embed_status')
        .eq('is_dead', false)
        .eq('embed_status', 'embeddable')
        .limit(50)

      if (!fallback || fallback.length === 0) {
        return NextResponse.json({ url: null })
      }
      const pick = fallback[Math.floor(Math.random() * fallback.length)]
      return NextResponse.json({ url: pick })
    }

    // Score candidates by reaction data
    const candidateIds = candidates.map((c: any) => c.id)
    const { data: reactions } = await supabase
      .from('url_events')
      .select('url_id, event_type')
      .in('url_id', candidateIds.slice(0, 100))
      .in('event_type', ['mindblown', 'yawn', 'neutral'])

    const scores: Record<number, number> = {}
    if (reactions) {
      for (const r of reactions) {
        if (!scores[r.url_id]) scores[r.url_id] = 0
        if (r.event_type === 'mindblown') scores[r.url_id] += 2
        else if (r.event_type === 'neutral') scores[r.url_id] += 0
        else if (r.event_type === 'yawn') scores[r.url_id] -= 1
      }
    }

    // Sort by score, take top 10, pick randomly from top 10
    const scored = candidates.map((c: any) => ({ ...c, score: scores[c.id] || 0 }))
    scored.sort((a: any, b: any) => b.score - a.score)
    const top = scored.slice(0, 10)
    const pick = top[Math.floor(Math.random() * top.length)]

    return NextResponse.json({ url: pick })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
