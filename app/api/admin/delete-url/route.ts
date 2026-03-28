import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/delete-url
 * Auth:
 *   - Cookie: chance_admin_token (set by /api/admin/login)
 * Body:
 *   { "urlId": 123 }
 */

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

function getRequestMeta(req: Request) {
  const xfwd = req.headers.get('x-forwarded-for') || ''
  const ip =
    (xfwd.split(',')[0] || '').trim() ||
    (req.headers.get('x-real-ip') || '').trim() ||
    (req.headers.get('cf-connecting-ip') || '').trim() ||
    null

  const ua = (req.headers.get('user-agent') || '').trim() || null
  return { ip, ua }
}

function requireAdminCookie(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'Admin protection not configured (missing ADMIN_API_TOKEN)' },
      { status: 500 }
    )
  }

  const cookieToken = getCookieFromHeader(req, 'chance_admin_token')

  if (!cookieToken || cookieToken !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

async function audit(action: string, ok: boolean, req: Request, urlId?: number) {
  try {
    const supabase = getAdminClient()
    const meta = getRequestMeta(req)
    await supabase.from('admin_audit').insert({
      action,
      ok,
      url_id: urlId ?? null,
      meta,
    })
  } catch {
    // best-effort: never block
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 })
}

export async function POST(req: Request) {
  try {
    const unauthorized = requireAdminCookie(req)
    if (unauthorized) {
      // optional: log attempted access (kept minimal; remove if you don’t want noise)
      await audit('delete-url', false, req)
      return unauthorized
    }

    const body = await req.json().catch(() => ({} as any))
    const urlId = Number(body?.urlId)

    if (!Number.isFinite(urlId) || urlId <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid urlId. Expected JSON body: { "urlId": 123 } (number > 0)' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    await supabase.from('patrol_verifications').delete().eq('url_id', urlId)
    await supabase.from('dead_reports').delete().eq('url_id', urlId)

    const { error } = await supabase.from('urls').delete().eq('id', urlId)
    if (error) {
      await audit('delete-url', false, req, urlId)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    await audit('delete-url', true, req, urlId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    await audit('delete-url', false, req)
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
