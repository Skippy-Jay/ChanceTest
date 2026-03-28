'use client'
// app/setup/page.tsx — v3: Skip button removed

import { useState, useEffect } from 'react'
import { supabase, getEffectiveUserId } from '@/lib/supabase'

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'
var RESERVED = ['epic', 'legendary', 'snake-eyes']

var preClick: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }

function formatCategory(cat: string): string {
  if (cat === 'ai') return 'AI'
  if (cat === 'diy/making') return 'DIY / Making'
  return cat.split(/[-/]/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1) }).join(' / ')
}

export default function SetupPage() {
  var [categories, setCategories] = useState<string[]>([])
  var [selectedCats, setSelectedCats] = useState<string[]>([])
  var [sessionId, setSessionId] = useState('')
  var [saving, setSaving] = useState(false)
  var [goPressed, setGoPressed] = useState(false)
  var [reviewMode, setReviewMode] = useState(false)
  var [catsLoaded, setCatsLoaded] = useState(false)
  var [hasPicks, setHasPicks] = useState(false)

  useEffect(function () {
    ;(async function () {
      var userId = await getEffectiveUserId()
      setSessionId(userId)
      try {
        var { data } = await supabase.from('urls').select('category').eq('is_dead', false).not('category', 'is', null)
        if (data) {
          var unique = new Set<string>()
          data.forEach(function (row: any) {
            if (row.category && !RESERVED.includes(row.category)) unique.add(row.category)
          })
          setCategories(Array.from(unique).sort())
        }
      } catch (e) {}
      setCatsLoaded(true)
    })()

    // Check existing picks
    var existingPicks: string[] = []
    try {
      var stored = localStorage.getItem('chance_picked_categories')
      if (stored) {
        var parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) { existingPicks = parsed; setHasPicks(true) }
      }
    } catch (e) {}
    // Also check selected categories
    try {
      var stored2 = localStorage.getItem('chance_selected_categories')
      if (stored2) {
        var parsed2 = JSON.parse(stored2)
        if (Array.isArray(parsed2) && parsed2.length > 0 && parsed2[0] !== 'potluck') { existingPicks = parsed2; setHasPicks(true) }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      var params = new URLSearchParams(window.location.search)
      if (params.get('cats') === '1') {
        setReviewMode(false)
      } else if (params.get('review') === '1') {
        if (existingPicks.length > 0) {
          setReviewMode(true)
        } else {
          setReviewMode(false)
        }
      }
    }
  }, [])

  useEffect(function () {
    try {
      var stored = localStorage.getItem('chance_selected_categories')
      if (stored) {
        var parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setSelectedCats(parsed)
      }
    } catch (e) {}
  }, [])

  function toggleCat(cat: string) {
    playClick()
    setSelectedCats(function (prev) {
      if (prev.includes(cat)) return prev.filter(function (c) { return c !== cat })
      if (prev.length >= 3) return prev
      return prev.concat([cat])
    })
  }

  async function handleFinish() {
    playClick()
    setGoPressed(true)
    setSaving(true)
    var cats = selectedCats.length > 0 ? selectedCats : ['potluck']
    try {
      localStorage.setItem('chance_selected_categories', JSON.stringify(cats))
      localStorage.setItem('chance_picked_categories', JSON.stringify(cats))
      localStorage.setItem('chance_setup_complete', 'true')
    } catch (e) {}
    if (sessionId) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, type: 'welcome', title: 'Welcome to Chance', body: 'Rate every site: negative \u00b7 neutral \u00b7 positive. Your reactions earn Spark and Gold. Happy rolling!', icon: '\ud83d\udc4b' }),
        })
      } catch (e) {}
    }
    setTimeout(function () { window.location.href = '/profile' }, 200)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse at 50% 0%, #151820 0%, #07070c 50%)', color: '#A8B2BD', fontFamily: FONT, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 40px' }}>
      <style>{'\
        @keyframes shimmerC { 0%, 100% { filter: brightness(0.7); } 50% { filter: brightness(1.3); } }\
      '}</style>

      <div style={{ maxWidth: '400px', width: '100%', marginTop: reviewMode ? '24px' : '16px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(1px) saturate(126%)', WebkitBackdropFilter: 'blur(1px) saturate(126%)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>

        <div style={{ textAlign: 'center', padding: '28px 20px 18px' }}>
          <img src="/logo-c.png" alt="Chance" style={{ width: '44px', height: '44px', objectFit: 'contain', margin: '0 auto 10px', display: 'block' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Welcome to Chance</h1>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Press C to Discover</div>
          <div style={{ position: 'relative', width: '42px', height: '42px', margin: '0 auto 8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, zIndex: 0, animation: 'shimmerC 2.5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} />
            <img src="/logo-c.png" alt="C" style={{ position: 'relative', zIndex: 3, width: '22px', height: '22px', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#717B85', lineHeight: 1.4 }}>Rolls the dice and serves you a new website.</div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Tap c to Go Back</div>
          <div style={{ width: '42px', height: '42px', margin: '0 auto 8px', borderRadius: '50%', border: '1px solid rgba(130,141,152,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))' }}>
            <img src="/logo-c.png" alt="c" style={{ width: '14px', height: '14px', objectFit: 'contain', opacity: 0.5 }} />
          </div>
          <div style={{ fontSize: '11px', color: '#717B85', lineHeight: 1.4 }}>Returns to your feed — same site, no new roll.</div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Rate Every Site</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '3px' }}>{'\ud83d\ude34'}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#717B85', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Negative</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '3px' }}>{'\ud83d\ude10'}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#717B85', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Neutral</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '3px' }}>{'\ud83e\udd2f'}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#717B85', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Positive</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#717B85' }}>Earns you Spark and Gold.</div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Roll Doubles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ fontSize: '11px', color: '#A8B2BD' }}>
              <span style={{ color: '#d4af37', fontWeight: 700 }}>Double Six</span>
              <span style={{ color: '#565F67' }}> {'\u2014'} </span>a legendary site appears
            </div>
            <div style={{ fontSize: '11px', color: '#A8B2BD' }}>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>Any Other Double</span>
              <span style={{ color: '#565F67' }}> {'\u2014'} </span>an epic site appears
            </div>
            <div style={{ fontSize: '11px', color: '#A8B2BD' }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>Snake Eyes</span>
              <span style={{ color: '#565F67' }}> {'\u2014'} </span>a troll site appears
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        {!reviewMode && (
          <>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />
            <div style={{ padding: '16px 20px 20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 8px', textAlign: 'center', letterSpacing: '-0.3px' }}>Pick 3 Categories</h2>
              <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '12px', fontWeight: 700, color: selectedCats.length === 3 ? '#A8B2BD' : '#565F67', transition: 'color 0.2s' }}>{selectedCats.length} / 3</div>
              {!catsLoaded ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: '#565F67' }}>Loading categories...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {categories.map(function (cat) {
                    var isSelected = selectedCats.includes(cat)
                    var isFull = selectedCats.length >= 3 && !isSelected
                    return (
                      <button key={cat} onClick={function () { toggleCat(cat) }} style={{ padding: '12px 10px', borderRadius: '12px', border: isSelected ? '1px solid rgba(168,178,189,0.4)' : '1px solid rgba(255,255,255,0.08)', background: isSelected ? 'rgba(168,178,189,0.12)' : 'rgba(255,255,255,0.03)', color: isSelected ? '#fff' : isFull ? '#3D444A' : '#A8B2BD', fontSize: '13px', fontWeight: 600, cursor: isFull ? 'default' : 'pointer', transition: 'all 0.15s ease', opacity: isFull ? 0.35 : 1, fontFamily: FONT, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', textAlign: 'center' }}>
                        {formatCategory(cat)}
                      </button>
                    )
                  })}
                </div>
              )}
              <button onClick={handleFinish} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: selectedCats.length > 0 ? '1px solid rgba(168,178,189,0.3)' : '1px solid rgba(255,255,255,0.1)', background: selectedCats.length > 0 ? 'rgba(168,178,189,0.08)' : 'rgba(255,255,255,0.03)', color: selectedCats.length > 0 ? '#fff' : '#717B85', fontSize: '15px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s', opacity: saving ? 0.4 : 1, transform: goPressed ? 'scale(0.97)' : 'scale(1)', fontFamily: FONT, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
                {saving ? 'Saving...' : selectedCats.length > 0 ? "Let's Go" : 'Go Random'}
              </button>
            </div>
          </>
        )}

        {reviewMode && (
          <div style={{ padding: '4px 20px 20px' }}>
            <button onClick={function () { playClick(); window.location.href = '/profile' }} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid rgba(168,178,189,0.3)', background: 'rgba(168,178,189,0.08)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s' }}>Back to Profile</button>
          </div>
        )}

      </div>
    </div>
  )
}
