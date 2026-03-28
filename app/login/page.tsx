'use client'
// Chance Login v3.2 — Removed Skip button and Back to Chance link

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

var FONT = "'Outfit', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"

var preClick: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }

export default function LoginPage() {
  var [mode, setMode] = useState<'login' | 'signup'>('login')
  var [email, setEmail] = useState('')
  var [password, setPassword] = useState('')
  var [showPassword, setShowPassword] = useState(false)
  var [loading, setLoading] = useState(false)
  var [msg, setMsg] = useState('')
  var [msgType, setMsgType] = useState<'error' | 'success'>('error')
  var [checkingSession, setCheckingSession] = useState(true)
  var router = useRouter()

  function getPostLoginRoute(): string {
    try {
      var setupDone = localStorage.getItem('chance_setup_complete')
      if (setupDone === 'true') return '/profile'
    } catch (e) {}
    return '/setup'
  }

  useEffect(function () {
    supabase.auth.getUser().then(function ({ data: { user } }) {
      if (user) router.push(getPostLoginRoute())
      else setCheckingSession(false)
    })
  }, [router])

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setMsg('Email and password required'); setMsgType('error'); return }
    if (password.length < 6) { setMsg('Password must be at least 6 characters'); setMsgType('error'); return }
    setLoading(true); setMsg('')
    playClick()

    if (mode === 'signup') {
      var { data, error } = await supabase.auth.signUp({ email: email.trim(), password: password })
      if (error) { setMsg(error.message); setMsgType('error') }
      else if (data.user) {
        var oldSessionId = localStorage.getItem('chance_session_id')
        if (oldSessionId) localStorage.setItem('chance_old_session_id', oldSessionId)
        localStorage.setItem('chance_session_id', data.user.id)
        setMsg('Account created! Redirecting...'); setMsgType('success')
        setTimeout(function () { router.push(getPostLoginRoute()) }, 1000)
      }
    } else {
      var { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password })
      if (loginError) { setMsg(loginError.message); setMsgType('error') }
      else if (loginData.user) {
        var oldSid = localStorage.getItem('chance_session_id')
        if (oldSid && oldSid !== loginData.user.id) localStorage.setItem('chance_old_session_id', oldSid)
        localStorage.setItem('chance_session_id', loginData.user.id)
        setMsg('Logged in! Redirecting...'); setMsgType('success')
        setTimeout(function () { router.push(getPostLoginRoute()) }, 800)
      }
    }
    setLoading(false)
  }

  if (checkingSession) return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo-c.png" alt="Chance" style={{ width: '48px', height: '48px', margin: '0 auto 16px', display: 'block', objectFit: 'contain', opacity: 0.5 }} />
        <p style={{ color: '#565F67', fontSize: '13px' }}>Checking session…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: '360px', width: '100%', padding: '0 24px', animation: 'fadeInUp 0.5s ease-out', position: 'relative' }}>

        <img src="/logo-c.png" alt="Chance" style={{ width: '64px', height: '64px', margin: '0 auto 20px', display: 'block', objectFit: 'contain' }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['login', 'signup'] as const).map(function (m) {
            return (
              <button key={m} onClick={function () { playClick(); setMode(m); setMsg('') }} style={{ flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', background: mode === m ? 'rgba(130,141,152,0.15)' : 'transparent', color: mode === m ? '#A8B2BD' : '#565F67', border: 'none', fontFamily: FONT, fontWeight: 600, fontSize: '13px', transition: 'all 0.2s ease', touchAction: 'manipulation' }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            )
          })}
        </div>

        {/* Email */}
        <input type="email" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A8B2BD', fontSize: '14px', fontFamily: FONT, marginBottom: '10px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} placeholder="Email" value={email} onChange={function (e) { setEmail(e.target.value) }} autoFocus />

        {/* Password with show/hide toggle */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            style={{ width: '100%', padding: '10px 44px 10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A8B2BD', fontSize: '14px', fontFamily: FONT, outline: 'none', boxSizing: 'border-box', letterSpacing: showPassword ? '0' : '2px', transition: 'border-color 0.2s' }}
            placeholder="Password"
            value={password}
            onChange={function (e) { setPassword(e.target.value) }}
            onKeyDown={function (e) { if (e.key === 'Enter') handleSubmit() }}
          />
          <button
            onClick={function () { setShowPassword(function (s) { return !s }) }}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#565F67', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {/* Message */}
        {msg && <p style={{ color: msgType === 'error' ? '#f87171' : '#34d399', fontSize: '12px', marginBottom: '10px', fontWeight: 500 }}>{msg}</p>}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', cursor: loading ? 'wait' : 'pointer', background: loading ? 'rgba(130,141,152,0.08)' : 'rgba(255,255,255,0.12)', color: '#e5e5e7', border: '1px solid rgba(255,255,255,0.18)', fontFamily: FONT, fontWeight: 600, fontSize: '14px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.2s ease', opacity: loading ? 0.6 : 1, touchAction: 'manipulation' }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        <p style={{ color: '#3D444A', fontSize: '9px', marginTop: '20px', letterSpacing: '1px' }}>v3.2</p>
      </div>
    </div>
  )
}
