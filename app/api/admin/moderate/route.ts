import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server env')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function getCookieFromHeader(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie') || ''
  const parts = raw.split(';').map(s => s.trim())
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx === -1) continue
    const k = p.slice(0, idx).trim()
    const v = p.slice(idx + 1).trim()
    if (k === name) return decodeURIComponent(v)
  }
  return null
}

function requireAdminCookie(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Admin protection not configured (missing ADMIN_API_TOKEN)' }, { status: 500 })
  }
  const cookieToken = getCookieFromHeader(req, 'chance_admin_token')
  if (!cookieToken || cookieToken !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: Request) {
  const unauthorized = requireAdminCookie(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()
    const { action } = body
    const supabase = getAdminClient()

    switch (action) {
      // ── Dead Reports (from main feed "Dead" button) ──
      case 'confirm-dead-report': {
        const { urlId, reportId } = body
        if (!urlId) return NextResponse.json({ ok: false, error: 'urlId required' }, { status: 400 })
        await supabase.from('urls').update({ is_dead: true }).eq('id', urlId)
        await supabase.from('dead_reports').delete().eq('url_id', urlId)
        return NextResponse.json({ ok: true })
      }

      case 'dismiss-dead-report': {
        const { reportId } = body
        if (!reportId) return NextResponse.json({ ok: false, error: 'reportId required' }, { status: 400 })
        await supabase.from('dead_reports').delete().eq('id', reportId)
        return NextResponse.json({ ok: true })
      }

      case 'bulk-confirm-dead-reports': {
        const { reports } = body as { reports: { urlId: number; reportId: number }[] }
        if (!reports?.length) return NextResponse.json({ ok: false, error: 'reports required' }, { status: 400 })
        const urlIds = [...new Set(reports.map(r => r.urlId))]
        for (let i = 0; i < urlIds.length; i += 50) {
          await supabase.from('urls').update({ is_dead: true }).in('id', urlIds.slice(i, i + 50))
        }
        for (let i = 0; i < urlIds.length; i += 50) {
          await supabase.from('dead_reports').delete().in('url_id', urlIds.slice(i, i + 50))
        }
        return NextResponse.json({ ok: true, count: reports.length })
      }

      case 'bulk-dismiss-dead-reports': {
        const { reportIds } = body as { reportIds: number[] }
        if (!reportIds?.length) return NextResponse.json({ ok: false, error: 'reportIds required' }, { status: 400 })
        for (let i = 0; i < reportIds.length; i += 50) {
          await supabase.from('dead_reports').delete().in('id', reportIds.slice(i, i + 50))
        }
        return NextResponse.json({ ok: true, count: reportIds.length })
      }

      // ── Patrol Reports (from Link Patrol verdicts) ──
      case 'confirm-patrol-dead': {
        const { urlId } = body
        if (!urlId) return NextResponse.json({ ok: false, error: 'urlId required' }, { status: 400 })
        await supabase.from('urls').update({ is_dead: true }).eq('id', urlId)
        await supabase.from('patrol_verifications').delete().eq('url_id', urlId)
        return NextResponse.json({ ok: true })
      }

      case 'dismiss-patrol-report': {
        const { reportId } = body
        if (!reportId) return NextResponse.json({ ok: false, error: 'reportId required' }, { status: 400 })
        await supabase.from('patrol_verifications').delete().eq('id', reportId)
        return NextResponse.json({ ok: true })
      }

      case 'bulk-confirm-patrol-dead': {
        const { urlIds, reportIds } = body as { urlIds: number[]; reportIds: number[] }
        if (!urlIds?.length) return NextResponse.json({ ok: false, error: 'urlIds required' }, { status: 400 })
        for (let i = 0; i < urlIds.length; i += 50) {
          await supabase.from('urls').update({ is_dead: true }).in('id', urlIds.slice(i, i + 50))
        }
        if (reportIds?.length) {
          for (let i = 0; i < reportIds.length; i += 50) {
            await supabase.from('patrol_verifications').delete().in('id', reportIds.slice(i, i + 50))
          }
        }
        return NextResponse.json({ ok: true, count: urlIds.length })
      }

      case 'bulk-dismiss-patrol': {
        const { reportIds } = body as { reportIds: number[] }
        if (!reportIds?.length) return NextResponse.json({ ok: false, error: 'reportIds required' }, { status: 400 })
        for (let i = 0; i < reportIds.length; i += 50) {
          await supabase.from('patrol_verifications').delete().in('id', reportIds.slice(i, i + 50))
        }
        return NextResponse.json({ ok: true, count: reportIds.length })
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
