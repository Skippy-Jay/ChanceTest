import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL
  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server env')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function getCookieFromHeader(req: Request, name: string): string | null {
  var raw = req.headers.get('cookie') || ''
  var parts = raw.split(';').map(function (s) { return s.trim() })
  for (var p of parts) {
    var idx = p.indexOf('=')
    if (idx === -1) continue
    var k = p.slice(0, idx).trim()
    var v = p.slice(idx + 1).trim()
    if (k === name) return decodeURIComponent(v)
  }
  return null
}

function requireAdminCookie(req: Request) {
  var expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Admin protection not configured' }, { status: 500 })
  }
  var cookieToken = getCookieFromHeader(req, 'chance_admin_token')
  if (!cookieToken || cookieToken !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

async function checkEmbeddable(url: string): Promise<{ embeddable: boolean; reason: string }> {
  try {
    var controller = new AbortController()
    var timeout = setTimeout(function () { controller.abort() }, 5000)

    var res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChanceBot/1.0; +https://chanceapp.io)',
      },
    })

    clearTimeout(timeout)

    var xfo = (res.headers.get('x-frame-options') || '').toLowerCase()
    if (xfo === 'deny' || xfo === 'sameorigin') {
      return { embeddable: false, reason: 'x-frame-options: ' + xfo }
    }

    var csp = (res.headers.get('content-security-policy') || '').toLowerCase()
    if (csp.includes('frame-ancestors')) {
      var match = csp.match(/frame-ancestors\s+([^;]+)/)
      if (match) {
        var ancestors = match[1].trim()
        if (ancestors === "'none'" || ancestors === "'self'") {
          return { embeddable: false, reason: 'csp frame-ancestors: ' + ancestors }
        }
        if (!ancestors.includes('*') && !ancestors.includes('chanceapp.io')) {
          return { embeddable: false, reason: 'csp frame-ancestors restricted' }
        }
      }
    }

    return { embeddable: true, reason: 'no restrictions found' }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { embeddable: false, reason: 'timeout' }
    }
    return { embeddable: false, reason: 'fetch error' }
  }
}

export async function POST(req: Request) {
  var unauthorized = requireAdminCookie(req)
  if (unauthorized) return unauthorized

  var supabase = getAdminClient()
  var body: any = {}
  try { body = await req.json() } catch (e) {}

  var batchSize = Math.min(body.batchSize || 10, 20)

  var { data: urls, error } = await supabase
    .from('urls')
    .select('id, url')
    .eq('is_dead', false)
    .is('embed_status', null)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!urls || urls.length === 0) {
    return NextResponse.json({ done: true, message: 'All URLs checked', checked: 0, embeddable: 0, blocked: 0, remaining: 0 })
  }

  var results = { checked: 0, embeddable: 0, blocked: 0, errors: 0 }

  var checks = await Promise.all(
    urls.map(async function (u: any) {
      var result = await checkEmbeddable(u.url)
      return { id: u.id, ...result }
    })
  )

  for (var c of checks) {
    var { error: updateErr } = await supabase
      .from('urls')
      .update({
        embed_status: c.embeddable ? 'embeddable' : 'blocked',
        embed_reason: c.reason,
      })
      .eq('id', c.id)

    if (updateErr) {
      results.errors++
    } else {
      results.checked++
      if (c.embeddable) results.embeddable++
      else results.blocked++
    }
  }

  var { count: remaining } = await supabase
    .from('urls')
    .select('*', { count: 'exact', head: true })
    .eq('is_dead', false)
    .is('embed_status', null)

  return NextResponse.json({
    done: (remaining || 0) === 0,
    ...results,
    remaining: remaining || 0,
  })
}

export async function GET(req: Request) {
  var supabase = getAdminClient()

  var { count: total } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false)
  var { count: embeddable } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false).eq('embed_status', 'embeddable')
  var { count: blocked } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false).eq('embed_status', 'blocked')
  var { count: unchecked } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false).is('embed_status', null)

  return NextResponse.json({ total: total || 0, embeddable: embeddable || 0, blocked: blocked || 0, unchecked: unchecked || 0 })
}
