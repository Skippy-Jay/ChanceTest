'use client'
// app/spotlight/[id]/page.tsx — Advertiser-facing Spotlight stats dashboard
// Read-only page. Share the URL with the client. No auth required (UUID = unguessable).

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"

export default function SpotlightStatsPage() {
  var params = useParams()
  var spotlightId = params.id as string
  var [spot, setSpot] = useState<any>(null)
  var [loading, setLoading] = useState(true)
  var [error, setError] = useState(false)

  useEffect(function () {
    if (!spotlightId) return
    ;(async function () {
      try {
        var { data, error: err } = await supabase
          .from('spotlight_urls')
          .select('*')
          .eq('id', spotlightId)
          .single()
        if (err || !data) { setError(true) } else { setSpot(data) }
      } catch (e) { setError(true) }
      setLoading(false)
    })()
  }, [spotlightId])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/logo-c.png" alt="" style={{ width: '40px', height: '40px', opacity: 0.2, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.5; } }`}</style>
    </div>
  )

  if (error || !spot) return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <img src="/logo-c.png" alt="Chance" style={{ width: '48px', height: '48px', opacity: 0.3 }} />
      <p style={{ fontSize: '14px', color: '#565F67' }}>Spotlight not found</p>
    </div>
  )

  var totalReactions = (spot.total_mindblown || 0) + (spot.total_yawn || 0) + (spot.total_neutral || 0)
  var score = totalReactions > 0 ? Math.round(((spot.total_mindblown - spot.total_yawn) / totalReactions) * 100) : 0
  var scoreColor = score > 30 ? '#34d399' : score > 0 ? '#5E9ABB' : score > -30 ? '#fbbf24' : '#f87171'
  var scoreLabel = score > 30 ? 'Excellent' : score > 0 ? 'Good' : score > -30 ? 'Mixed' : 'Poor'
  var spentDollars = ((spot.spent_cents || 0) / 100).toFixed(2)
  var budgetDollars = spot.budget_cents > 0 ? ((spot.budget_cents) / 100).toFixed(2) : '\u221e'
  var budgetPercent = spot.budget_cents > 0 ? Math.min(100, (spot.spent_cents / spot.budget_cents) * 100) : 0
  var statusColor = spot.status === 'active' ? '#34d399' : spot.status === 'paused' ? '#fbbf24' : spot.status === 'exhausted' ? '#f87171' : '#565F67'
  var feedImpressions = (spot.total_impressions || 0) - (spot.library_impressions || 0)
  var libImpressions = spot.library_impressions || 0
  var reactionRate = spot.total_impressions > 0 ? Math.round((totalReactions / spot.total_impressions) * 100) : 0
  var ctr = spot.total_impressions > 0 ? ((spot.total_clicks || 0) / spot.total_impressions * 100).toFixed(1) : '0.0'
  var domain = spot.domain || spot.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #151820 0%, #07070c 50%)', color: '#A8B2BD', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 60px' }}>
      <style>{`
        @keyframes statsFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', animation: 'statsFadeIn 0.4s ease-out', marginBottom: '28px' }}>
        <img src="/logo-c.png" alt="Chance" style={{ width: '44px', height: '44px', margin: '0 auto 12px', display: 'block', objectFit: 'contain' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px' }}>{'\u2728'}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', letterSpacing: '1px', textTransform: 'uppercase' }}>Spotlight</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#e0e4e8', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{domain}</h1>
        {spot.title && <p style={{ fontSize: '13px', color: '#828D98', margin: '0 0 4px' }}>{spot.title}</p>}
        {spot.advertiser_name && <p style={{ fontSize: '11px', color: '#565F67', margin: 0 }}>by {spot.advertiser_name}</p>}
      </div>

      <div style={{ maxWidth: '520px', width: '100%' }}>
        {/* Status + Score */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.05s both' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Status</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              <span style={{ fontSize: '18px', fontWeight: 800, color: statusColor, textTransform: 'capitalize' }}>{spot.status}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Audience Score</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: scoreColor }}>{score > 0 ? '+' : ''}{score}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: scoreColor, opacity: 0.7 }}>{scoreLabel}</div>
          </div>
        </div>

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.1s both' }}>
          {[
            { value: (spot.total_impressions || 0).toLocaleString(), label: 'Total views', color: '#e0e4e8' },
            { value: totalReactions.toLocaleString(), label: 'Reactions', color: '#A064F0' },
            { value: reactionRate + '%', label: 'Reaction rate', color: '#5E9ABB' },
            { value: (spot.total_clicks || 0).toLocaleString(), label: 'Clicks', color: '#34d399' },
          ].map(function (m, i) {
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#565F67', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{m.label}</div>
              </div>
            )
          })}
        </div>

        {/* Reactions breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.15s both' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', textAlign: 'center' }}>Reaction breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { emoji: '\ud83e\udd2f', label: 'Positive', count: spot.total_mindblown || 0, color: '#34d399', pct: totalReactions > 0 ? Math.round((spot.total_mindblown || 0) / totalReactions * 100) : 0 },
              { emoji: '\ud83d\ude10', label: 'Neutral', count: spot.total_neutral || 0, color: '#828D98', pct: totalReactions > 0 ? Math.round((spot.total_neutral || 0) / totalReactions * 100) : 0 },
              { emoji: '\ud83e\udd71', label: 'Negative', count: spot.total_yawn || 0, color: '#f87171', pct: totalReactions > 0 ? Math.round((spot.total_yawn || 0) / totalReactions * 100) : 0 },
            ].map(function (r, i) {
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{r.emoji}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: r.color }}>{r.count}</div>
                  <div style={{ fontSize: '11px', color: '#565F67', fontWeight: 600 }}>{r.pct}%</div>
                  <div style={{ fontSize: '9px', color: '#3D444A', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{r.label}</div>
                </div>
              )
            })}
          </div>
          {/* Reaction bar */}
          {totalReactions > 0 && (
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '16px', gap: '2px' }}>
              {(spot.total_mindblown || 0) > 0 && <div style={{ flex: spot.total_mindblown, background: '#34d399', borderRadius: '3px' }} />}
              {(spot.total_neutral || 0) > 0 && <div style={{ flex: spot.total_neutral, background: '#828D98', borderRadius: '3px' }} />}
              {(spot.total_yawn || 0) > 0 && <div style={{ flex: spot.total_yawn, background: '#f87171', borderRadius: '3px' }} />}
            </div>
          )}
        </div>

        {/* Placement breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.2s both' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{'\ud83c\udfb2'} Feed views</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#5E9ABB' }}>{feedImpressions.toLocaleString()}</div>
            <div style={{ fontSize: '10px', color: '#565F67', marginTop: '4px' }}>{spot.cost_per_impression_cents || 5}{'\u00a2'} per view</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{'\ud83d\udcda'} Library views</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{libImpressions.toLocaleString()}</div>
            <div style={{ fontSize: '10px', color: '#565F67', marginTop: '4px' }}>{spot.library_cpi_cents || 3}{'\u00a2'} per view</div>
          </div>
        </div>

        {/* Budget */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.25s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px' }}>Budget</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#d4af37' }}>${spentDollars} <span style={{ color: '#3D444A' }}>/</span> ${budgetDollars}</div>
          </div>
          {spot.budget_cents > 0 && (
            <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ width: budgetPercent + '%', height: '100%', borderRadius: '4px', background: budgetPercent > 80 ? '#f87171' : '#d4af37', transition: 'width 0.5s ease' }} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: '#565F67' }}>CTR: {ctr}%</span>
            {spot.max_impressions && <span style={{ fontSize: '10px', color: '#565F67' }}>{spot.total_impressions || 0} / {spot.max_impressions} max views</span>}
          </div>
        </div>

        {/* Category + Dates */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', marginBottom: '16px', animation: 'statsFadeIn 0.4s ease-out 0.3s both' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
            {spot.category_target && (
              <div><span style={{ color: '#565F67' }}>Target: </span><span style={{ color: '#A8B2BD', fontWeight: 600 }}>{spot.category_target}</span></div>
            )}
            {spot.start_date && (
              <div><span style={{ color: '#565F67' }}>Start: </span><span style={{ color: '#A8B2BD', fontWeight: 600 }}>{spot.start_date}</span></div>
            )}
            {spot.end_date && (
              <div><span style={{ color: '#565F67' }}>End: </span><span style={{ color: '#A8B2BD', fontWeight: 600 }}>{spot.end_date}</span></div>
            )}
            <div><span style={{ color: '#565F67' }}>Created: </span><span style={{ color: '#A8B2BD', fontWeight: 600 }}>{new Date(spot.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', animation: 'statsFadeIn 0.4s ease-out 0.35s both' }}>
          <a href={spot.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#5E9ABB', textDecoration: 'none', fontWeight: 600 }}>View site {'\u2197'}</a>
          <p style={{ fontSize: '9px', color: '#3D444A', marginTop: '16px', letterSpacing: '0.5px' }}>Powered by Chance {'\u00b7'} chanceapp.io</p>
        </div>
      </div>
    </div>
  )
}
