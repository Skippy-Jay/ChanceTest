'use client'
// app/debug/page.tsx — Shows localStorage values for debugging
// Visit chanceapp.io/debug to see what the feed is reading
import { useState, useEffect } from 'react'

var KEYS = [
  'chance_dice_skin',
  'chance_curate_categories',
  'chance_curate_ivory_categories',
  'chance_curate_midnight_categories',
  'chance_curate_ember_categories',
  'chance_curate_portal_categories',
  'chance_curate_hologram_categories',
  'chance_curate_matrix_categories',
  'chance_curate_celestial_categories',
  'chance_curate_matrix_slider',
  'chance_curate_celestial_slider',
  'chance_picked_categories',
  'chance_owned_skins',
  'chance_pot_luck',
  'chance_session_id',
  'chance_last_url',
]

export default function DebugPage() {
  var [values, setValues] = useState<Record<string, string | null>>({})

  useEffect(function () {
    var v: Record<string, string | null> = {}
    for (var i = 0; i < KEYS.length; i++) {
      v[KEYS[i]] = localStorage.getItem(KEYS[i])
    }
    setValues(v)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: 'monospace', padding: '20px', fontSize: '13px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#e0e4e8' }}>Chance Debug — localStorage</h1>
      {KEYS.map(function (key) {
        var val = values[key]
        return (
          <div key={key} style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#828D98', fontSize: '11px', marginBottom: '2px' }}>{key}</div>
            <div style={{ color: val ? '#e0e4e8' : '#3D444A', wordBreak: 'break-all' }}>{val || '(empty)'}</div>
          </div>
        )
      })}
      <div style={{ marginTop: '20px' }}>
        <a href="/feed" style={{ color: '#5E9ABB', fontSize: '12px' }}>← Back to feed</a>
      </div>
    </div>
  )
}
