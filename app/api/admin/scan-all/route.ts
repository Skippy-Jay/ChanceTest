import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get('chance_admin_token')
    if (!cookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { phase } = body

    const baseUrl = req.nextUrl.origin
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cookie': 'chance_admin_token=' + cookie.value }

    let currentPhase = phase || 'auto'

    if (currentPhase === 'auto' || currentPhase === 'dead_done' || currentPhase === 'categorize_done') {
      // Detect next phase
      try {
        const deadStats = await fetch(baseUrl + '/api/admin/check-dead', { headers }).then(r => r.json())
        if (deadStats && deadStats.unchecked > 0) { currentPhase = 'dead' }
        else {
          const catStats = await fetch(baseUrl + '/api/admin/auto-categorize', { headers }).then(r => r.json())
          if (catStats && catStats.uncategorized > 0) { currentPhase = 'categorize' }
          else {
            const embedStats = await fetch(baseUrl + '/api/admin/check-embeds', { headers }).then(r => r.json())
            if (embedStats && embedStats.unchecked > 0) { currentPhase = 'embed' }
            else {
              return NextResponse.json({ done: true, phase: 'complete', message: 'All scans complete!' })
            }
          }
        }
      } catch (e) {
        return NextResponse.json({ done: true, phase: 'complete', message: 'Scan finished (with errors)' })
      }
    }

    if (currentPhase === 'dead') {
      const r = await fetch(baseUrl + '/api/admin/check-dead', { method: 'POST', headers, body: JSON.stringify({ batchSize: 10 }) })
      const d = await r.json()
      if (d.done || d.remaining === 0) {
        return NextResponse.json({ done: false, phase: 'dead_done', phaseLabel: '\ud83d\udc80 Dead Check complete \u2014 next: categorize', checked: d.checked || 0, alive: d.alive || 0, dead: d.dead || 0, remaining: 0 })
      }
      return NextResponse.json({ done: false, phase: 'dead', checked: d.checked || 0, alive: d.alive || 0, dead: d.dead || 0, remaining: d.remaining || 0, phaseLabel: '\ud83d\udc80 Dead Check' })
    }

    if (currentPhase === 'categorize') {
      const r = await fetch(baseUrl + '/api/admin/auto-categorize', { method: 'POST', headers, body: JSON.stringify({ batchSize: 50 }) })
      const d = await r.json()
      if (d.done || d.remaining === 0 || (d.categorized === 0 && d.skipped > 0)) {
        return NextResponse.json({ done: false, phase: 'categorize_done', phaseLabel: '\ud83c\udff7\ufe0f Categorize complete \u2014 next: embeds', categorized: d.categorized || 0, skipped: d.skipped || 0, remaining: 0 })
      }
      return NextResponse.json({ done: false, phase: 'categorize', categorized: d.categorized || 0, skipped: d.skipped || 0, remaining: d.remaining || 0, phaseLabel: '\ud83c\udff7\ufe0f Categorize' })
    }

    if (currentPhase === 'embed') {
      const r = await fetch(baseUrl + '/api/admin/check-embeds', { method: 'POST', headers, body: JSON.stringify({ batchSize: 10 }) })
      const d = await r.json()
      if (d.done || d.remaining === 0) {
        return NextResponse.json({ done: true, phase: 'complete', message: 'All scans complete!', checked: d.checked || 0, embeddable: d.embeddable || 0, blocked: d.blocked || 0 })
      }
      return NextResponse.json({ done: false, phase: 'embed', checked: d.checked || 0, embeddable: d.embeddable || 0, blocked: d.blocked || 0, remaining: d.remaining || 0, phaseLabel: '\ud83c\udf10 Embed Check' })
    }

    return NextResponse.json({ error: 'Unknown phase: ' + currentPhase }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
