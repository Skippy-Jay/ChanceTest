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

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

export async function POST(req: Request) {
  const unauthorized = requireAdminCookie(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()
    const { mode } = body
    const supabase = getAdminClient()

    if (mode === 'single') {
      const { url: rawUrl, title, description, category } = body
      if (!rawUrl?.trim()) {
        return NextResponse.json({ ok: false, error: 'URL required' }, { status: 400 })
      }
      const url = rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`
      const domain = extractDomain(url)

      const { error } = await supabase.from('urls').insert({
        url, domain,
        title: title?.trim() || null,
        description: description?.trim() || null,
        category: category?.trim() || null,
        is_dead: false,
        patrol_status: category ? 'verified' : 'unverified',
      })

      if (error) {
        if (category?.trim()) {
          const { error: updateErr } = await supabase.from('urls')
            .update({ category: category.trim() })
            .eq('url', url)
          if (updateErr) {
            return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 })
          }
          return NextResponse.json({ ok: true, added: 0, updated: 1, skipped: 0 })
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true, added: 1, updated: 0, skipped: 0 })

    } else if (mode === 'bulk') {
      const { urls: lines, category } = body as { urls: string[]; category?: string }
      if (!lines?.length) {
        return NextResponse.json({ ok: false, error: 'No URLs provided' }, { status: 400 })
      }

      let added = 0, updated = 0, skipped = 0

      for (const line of lines) {
        const parts = line.split(',').map((s: string) => s.trim())
        const raw = parts[0]
        if (!raw || raw.length < 5) { skipped++; continue }

        const url = raw.startsWith('http') ? raw : `https://${raw}`
        const domain = extractDomain(url)
        const title = parts[1] || null
        const description = parts[2] || null
        const cat = category?.trim() || null

        const { error } = await supabase.from('urls').insert({
          url, domain, title, description,
          category: cat,
          is_dead: false,
          patrol_status: cat ? 'verified' : 'unverified',
        })

        if (error) {
          if (cat) {
            const { error: ue } = await supabase.from('urls')
              .update({ category: cat })
              .eq('url', url)
            if (ue) skipped++
            else updated++
          } else {
            skipped++
          }
        } else {
          added++
        }
      }

      return NextResponse.json({ ok: true, added, updated, skipped })

    } else {
      return NextResponse.json({ ok: false, error: 'Invalid mode' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
