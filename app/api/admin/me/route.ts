import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

async function audit(ok: boolean, req: Request) {
  try {
    const supabase = getAdminClient()
    const meta = getRequestMeta(req)
    await supabase.from('admin_audit').insert({
      action: 'me',
      ok,
      url_id: null,
      meta,
    })
  } catch {
    // best-effort only
  }
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 })
}

export async function GET(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'Admin protection not configured (missing ADMIN_API_TOKEN)' },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('chance_admin_token')?.value

  if (!token || token !== expected) {
    await audit(false, req)
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  await audit(true, req)
  return NextResponse.json({ ok: true })
}
