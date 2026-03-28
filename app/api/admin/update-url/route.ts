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
      case 'toggle-dead': {
        const { urlId, isDead } = body
        if (!urlId) return NextResponse.json({ ok: false, error: 'urlId required' }, { status: 400 })
        const { error } = await supabase.from('urls')
          .update({ is_dead: isDead })
          .eq('id', urlId)
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      case 'edit-category': {
        const { urlId, category } = body
        if (!urlId) return NextResponse.json({ ok: false, error: 'urlId required' }, { status: 400 })
        const { error } = await supabase.from('urls')
          .update({ category: category || null })
          .eq('id', urlId)
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      case 'edit-title': {
        const { urlId, title } = body
        if (!urlId) return NextResponse.json({ ok: false, error: 'urlId required' }, { status: 400 })
        const { error } = await supabase.from('urls')
          .update({ title: title?.trim() || null })
          .eq('id', urlId)
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      case 'remove-from-category': {
        const { urlIds } = body as { urlIds: number[] }
        if (!urlIds?.length) return NextResponse.json({ ok: false, error: 'urlIds required' }, { status: 400 })
        for (let i = 0; i < urlIds.length; i += 50) {
          const batch = urlIds.slice(i, i + 50)
          const { error } = await supabase.from('urls')
            .update({ category: null })
            .in('id', batch)
          if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        }
        return NextResponse.json({ ok: true, count: urlIds.length })
      }

      case 'recategorize': {
        const { urlId, category } = body
        if (!urlId || !category) return NextResponse.json({ ok: false, error: 'urlId and category required' }, { status: 400 })
        const { error } = await supabase.from('urls')
          .update({ category })
          .eq('id', urlId)
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      case 'bulk-mark-dead': {
        const { urlIds } = body as { urlIds: number[] }
        if (!urlIds?.length) return NextResponse.json({ ok: false, error: 'urlIds required' }, { status: 400 })
        for (let i = 0; i < urlIds.length; i += 50) {
          const batch = urlIds.slice(i, i + 50)
          const { error } = await supabase.from('urls')
            .update({ is_dead: true })
            .in('id', batch)
          if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
        }
        return NextResponse.json({ ok: true, count: urlIds.length })
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
