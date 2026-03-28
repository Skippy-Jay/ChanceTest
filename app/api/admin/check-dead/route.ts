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

async function checkAlive(url: string): Promise<{ alive: boolean; status: number; reason: string }> {
  try {
    var controller = new AbortController()
    var timeout = setTimeout(function () { controller.abort() }, 6000)

    var res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChanceBot/1.0; +https://chanceapp.io)',
      },
    })

    clearTimeout(timeout)

    var status = res.status

    // 2xx and 3xx are alive
    if (status >= 200 && status < 400) {
      return { alive: true, status: status, reason: 'ok' }
    }

    // Some sites block HEAD but allow GET — try GET for 405 Method Not Allowed
    if (status === 405) {
      try {
        var controller2 = new AbortController()
        var timeout2 = setTimeout(function () { controller2.abort() }, 6000)
        var res2 = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller2.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ChanceBot/1.0; +https://chanceapp.io)',
          },
        })
        clearTimeout(timeout2)
        if (res2.status >= 200 && res2.status < 400) {
          return { alive: true, status: res2.status, reason: 'ok (GET fallback)' }
        }
        return { alive: false, status: res2.status, reason: 'http ' + res2.status }
      } catch (e2) {
        return { alive: false, status: 405, reason: 'http 405 + GET failed' }
      }
    }

    // 403 could be bot blocking — mark as sketchy/alive since real users can access
    if (status === 403) {
      return { alive: true, status: 403, reason: 'forbidden (likely bot block)' }
    }

    // 4xx and 5xx are dead
    return { alive: false, status: status, reason: 'http ' + status }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { alive: false, status: 0, reason: 'timeout' }
    }
    var msg = (e.message || 'unknown').substring(0, 80)
    // DNS failures, connection refused, etc
    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      return { alive: false, status: 0, reason: 'dns failure' }
    }
    if (msg.includes('ECONNREFUSED')) {
      return { alive: false, status: 0, reason: 'connection refused' }
    }
    return { alive: false, status: 0, reason: 'error: ' + msg }
  }
}

export async function POST(req: Request) {
  var unauthorized = requireAdminCookie(req)
  if (unauthorized) return unauthorized

  var supabase = getAdminClient()
  var body: any = {}
  try { body = await req.json() } catch (e) {}

  var batchSize = Math.min(body.batchSize || 10, 20)

  // Fetch active URLs that haven't been dead-checked recently
  // We use the 'link_check_status' column if it exists, otherwise check all
  var { data: urls, error } = await supabase
    .from('urls')
    .select('id, url')
    .eq('is_dead', false)
    .is('link_check_status', null)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!urls || urls.length === 0) {
    return NextResponse.json({ done: true, message: 'All URLs checked', checked: 0, alive: 0, dead: 0, remaining: 0 })
  }

  var results = { checked: 0, alive: 0, dead: 0, errors: 0 }

  var checks = await Promise.all(
    urls.map(async function (u: any) {
      var result = await checkAlive(u.url)
      return { id: u.id, ...result }
    })
  )

  for (var c of checks) {
    var updateData: any = {
      link_check_status: c.alive ? 'alive' : 'dead',
      link_check_reason: c.reason,
      link_check_at: new Date().toISOString(),
    }

    // Auto-mark as dead if confirmed dead
    if (!c.alive) {
      updateData.is_dead = true
    }

    var { error: updateErr } = await supabase
      .from('urls')
      .update(updateData)
      .eq('id', c.id)

    if (updateErr) {
      results.errors++
    } else {
      results.checked++
      if (c.alive) results.alive++
      else results.dead++
    }
  }

  var { count: remaining } = await supabase
    .from('urls')
    .select('*', { count: 'exact', head: true })
    .eq('is_dead', false)
    .is('link_check_status', null)

  return NextResponse.json({
    done: (remaining || 0) === 0,
    ...results,
    remaining: remaining || 0,
  })
}

export async function GET(req: Request) {
  var supabase = getAdminClient()

  var { count: active } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false)
  var { count: alive } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false).eq('link_check_status', 'alive')
  var { count: dead } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('link_check_status', 'dead')
  var { count: unchecked } = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false).is('link_check_status', null)

  return NextResponse.json({ active: active || 0, alive: alive || 0, dead: dead || 0, unchecked: unchecked || 0 })
}
