import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server env')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
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

async function auditLogin(ok: boolean, req: Request) {
  try {
    const supabase = getAdminClient()
    const meta = getRequestMeta(req)
    await supabase.from('admin_audit').insert({
      action: 'login',
      ok,
      url_id: null,
      meta,
    })
  } catch {
    // best-effort only
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 })
}

export async function POST(req: Request) {
  try {
    const expectedPassword = process.env.ADMIN_PASSWORD
    const token = process.env.ADMIN_API_TOKEN

    if (!expectedPassword || !token) {
      return NextResponse.json(
        { ok: false, error: 'Admin env not configured (missing ADMIN_PASSWORD or ADMIN_API_TOKEN)' },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => ({} as any))
    const password = String(body?.password ?? '')

    if (!password || password !== expectedPassword) {
      await auditLogin(false, req)
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })

    res.cookies.set('chance_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    await auditLogin(true, req)
    return res
  } catch (e: any) {
    await auditLogin(false, req)
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
