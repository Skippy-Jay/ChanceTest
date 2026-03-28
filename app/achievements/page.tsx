'use client'
// app/achievements/page.tsx — Achievements v1.1
// v1.1: Fluent Fire.png for Streaks icon instead of static emoji
// Category list view with progress bars, tap to expand, Chance glass aesthetic
import { useState, useEffect } from 'react'
import { getEffectiveUserId } from '@/lib/supabase'

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'
var preClick: HTMLAudioElement | null = null
var preNotification: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7; preNotification = new Audio('/sounds/notification.mp3'); preNotification.preload = 'auto'; preNotification.volume = 0.8 }
function playPreloaded(audio: HTMLAudioElement | null) { if (!audio) return; try { var clone = audio.cloneNode(true) as HTMLAudioElement; clone.volume = audio.volume; clone.play().catch(function () {}) } catch (e) {} }
function playClick() { playPreloaded(preClick) }
function playNotification() { playPreloaded(preNotification) }

var CATEGORY_COLORS: Record<string, string> = {
  rolling: '#5E9ABB',
  reactions: '#a78bfa',
  dice: '#f59e0b',
  ranks: '#60a5fa',
  streaks: '#f97316',
  collection: '#d4af37',
  social: '#34d399'
}

var CATEGORY_ICONS: Record<string, { type: string; value: string }> = {
  rolling: { type: 'emoji', value: '\ud83c\udfb2' },
  reactions: { type: 'emoji', value: '\ud83d\udca5' },
  dice: { type: 'emoji', value: '\ud83c\udfb0' },
  ranks: { type: 'emoji', value: '\ud83c\udfc5' },
  streaks: { type: 'image', value: '/emoji/ember/Fire.png' },
  collection: { type: 'emoji', value: '\ud83d\udc8e' },
  social: { type: 'emoji', value: '\ud83c\udf10' }
}

function CategoryIcon({ catKey, size }: { catKey: string; size: number }) {
  var info = CATEGORY_ICONS[catKey] || { type: 'emoji', value: '\ud83c\udfc6' }
  if (info.type === 'image') {
    return <img src={info.value} alt="" style={{ width: size + 'px', height: size + 'px', objectFit: 'contain' }} />
  }
  return <span style={{ fontSize: size + 'px' }}>{info.value}</span>
}

function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) {
  var [hovered, setHovered] = useState(false); var [pressed, setPressed] = useState(false); var active = hovered || pressed
  function doPress() { playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) }
  return (<a href={href} style={{ position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' }} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>)
}
function IconProfile({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>) }
function IconVault({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>) }
function IconBell({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>) }

function NotifIcon({ src, size = 24 }: { src: string; size?: number }) {
  var [failed, setFailed] = useState(false)
  if (failed) return <span style={{ fontSize: size + 'px' }}>{'\ud83c\udfc6'}</span>
  return <img src={src} alt="" style={{ width: size + 'px', height: size + 'px', objectFit: 'contain' }} onError={function () { setFailed(true) }} />
}

type Achievement = {
  id: number; key: string; name: string; description: string; icon: string
  category: string; requirement: number; spark_reward: number; gold_reward: number
  unlocked: boolean; unlocked_at: string | null
  progress: { current: number; requirement: number }
}

type Category = {
  key: string; label: string; total: number; unlocked: number
  achievements: Achievement[]
}

export default function AchievementsPage() {
  var [categories, setCategories] = useState<Category[]>([])
  var [totalAch, setTotalAch] = useState(0)
  var [totalUnlocked, setTotalUnlocked] = useState(0)
  var [loading, setLoading] = useState(true)
  var [expandedCat, setExpandedCat] = useState<string | null>(null)
  var [sessionId, setSessionId] = useState('')
  var [cBtnHovered, setCBtnHovered] = useState(false)
  var [cBtnPressed, setCBtnPressed] = useState(false)
  var cActive = cBtnHovered || cBtnPressed

  useEffect(function () {
    ;(async function () {
      var userId = await getEffectiveUserId()
      setSessionId(userId)
      try {
        var res = await fetch('/api/achievements?session_id=' + userId)
        var data = await res.json()
        if (data.categories) {
          setCategories(data.categories)
          setTotalAch(data.total || 0)
          setTotalUnlocked(data.unlocked || 0)
        }
      } catch (e) {}
      setLoading(false)
    })()
  }, [])

  function handleCatTap(catKey: string) {
    playClick()
    if (expandedCat === catKey) setExpandedCat(null)
    else setExpandedCat(catKey)
  }

  function handleStartRolling() { playClick(); setCBtnPressed(true); setTimeout(function () { setCBtnPressed(false) }, 150); window.location.href = '/feed?first=1' }

  var overallPct = totalAch > 0 ? Math.round((totalUnlocked / totalAch) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes achFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes navRingRotate { to { transform: rotate(360deg); } }
        @keyframes ringRotate { to { transform: rotate(360deg); } }
        @keyframes achItemIn { from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; } to { opacity: 1; max-height: 120px; padding-top: 12px; padding-bottom: 12px; } }
        @keyframes achUnlockedGlow { 0%,100% { box-shadow: 0 0 0px rgba(52,211,153,0); } 50% { box-shadow: 0 0 12px rgba(52,211,153,0.15); } }`}</style>

      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/feed" icon={<img src="/logo-c.png" alt="Roll" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.85 }} />} />
        <NavBtn href="/notifications" icon={<IconBell color="#A8B2BD" />} />
        <NavBtn href="/profile" icon={<IconProfile color="#A8B2BD" />} />
        <NavBtn href="/vault" icon={<IconVault color="#A8B2BD" />} />
      </div>

      <div style={{ maxWidth: '560px', width: '100%', padding: '48px 16px 40px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', animation: 'achFadeIn 0.4s ease-out', marginBottom: '20px', paddingTop: '12px' }}>
          <img src="/logo-c.png" alt="Chance" style={{ width: '56px', height: '56px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#A8B2BD', margin: '0 0 4px', letterSpacing: '5px', textTransform: 'uppercase' }}>Achievements</h1>
          <p style={{ fontSize: '12px', color: '#565F67', margin: 0 }}>{totalUnlocked} of {totalAch} unlocked</p>
        </div>

        {/* Overall progress */}
        <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(1px) saturate(126%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '14px', padding: '14px', marginBottom: '20px', animation: 'achFadeIn 0.4s ease-out 0.1s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e0e4e8' }}>Overall Progress</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: overallPct === 100 ? '#34d399' : '#A8B2BD' }}>{overallPct}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: overallPct === 100 ? 'linear-gradient(90deg, #34d399, #22c55e)' : 'linear-gradient(90deg, #828D98, #A8B2BD)', width: overallPct + '%', transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {loading && (<div style={{ textAlign: 'center', padding: '60px 0' }}><p style={{ fontSize: '12px', color: '#3D444A' }}>Loading...</p></div>)}

        {/* Category list */}
        {!loading && categories.map(function (cat, catIdx) {
          var isExpanded = expandedCat === cat.key
          var catColor = CATEGORY_COLORS[cat.key] || '#A8B2BD'
          var catPct = cat.total > 0 ? Math.round((cat.unlocked / cat.total) * 100) : 0
          var isComplete = cat.unlocked === cat.total

          return (
            <div key={cat.key} style={{ marginBottom: '10px', animation: 'achFadeIn 0.4s ease-out ' + (0.12 + catIdx * 0.04) + 's both' }}>
              {/* Category header — tappable */}
              <button onClick={function () { handleCatTap(cat.key) }} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(1px) saturate(126%)', border: '1px solid ' + (isExpanded ? catColor + '40' : 'rgba(255,255,255,0.08)'), borderRadius: isExpanded ? '14px 14px 0 0' : '14px', padding: '14px 16px', cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', textAlign: 'left', display: 'block', fontFamily: FONT }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CategoryIcon catKey={cat.key} size={20} />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#e0e4e8', flex: 1 }}>{cat.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isComplete ? '#34d399' : '#828D98' }}>{cat.unlocked}/{cat.total}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565F67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: isComplete ? 'linear-gradient(90deg, #34d399, #22c55e)' : 'linear-gradient(90deg, ' + catColor + ', ' + catColor + 'cc)', width: catPct + '%', transition: 'width 0.5s ease' }} />
                </div>
              </button>

              {/* Expanded achievements list */}
              {isExpanded && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid ' + catColor + '40', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                  {cat.achievements.map(function (ach, achIdx) {
                    var pct = ach.progress.requirement > 0 ? Math.round((ach.progress.current / ach.progress.requirement) * 100) : 0
                    var isUnlocked = ach.unlocked
                    var hasBorder = achIdx < cat.achievements.length - 1

                    return (
                      <div key={ach.key} style={{ padding: '12px 16px', borderBottom: hasBorder ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: isUnlocked ? 1 : 0.6, background: isUnlocked ? 'rgba(52,211,153,0.03)' : 'transparent', animation: 'achItemIn 0.25s ease-out ' + (achIdx * 0.05) + 's both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Icon */}
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isUnlocked ? catColor + '20' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (isUnlocked ? catColor + '40' : 'rgba(255,255,255,0.06)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <NotifIcon src={ach.icon} size={22} />
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: isUnlocked ? '#e0e4e8' : '#828D98' }}>{ach.name}</span>
                              {isUnlocked && (<span style={{ fontSize: '10px', fontWeight: 700, color: '#34d399' }}>{'\u2713'}</span>)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#565F67', marginBottom: '6px', lineHeight: 1.3 }}>{ach.description}</div>

                            {/* Progress bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '2px', background: isUnlocked ? '#34d399' : catColor, width: pct + '%', transition: 'width 0.4s ease', opacity: isUnlocked ? 0.5 : 1 }} />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: 600, color: isUnlocked ? '#34d399' : '#565F67', flexShrink: 0, minWidth: '28px', textAlign: 'right' as const }}>{ach.progress.current}/{ach.progress.requirement}</span>
                            </div>

                            {/* Rewards */}
                            {(ach.spark_reward > 0 || ach.gold_reward > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                {ach.spark_reward > 0 && (
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: isUnlocked ? '#565F67' : '#828D98' }}>+{ach.spark_reward} Spark</span>
                                )}
                                {ach.gold_reward > 0 && (
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: isUnlocked ? '#565F67' : '#d4af37' }}>+{ach.gold_reward} Gold</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Bottom C button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '24px', paddingBottom: '20px', animation: 'achFadeIn 0.4s ease-out 0.5s both' }}>
          <button onClick={handleStartRolling} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setCBtnHovered(true) }} onPointerLeave={function () { setCBtnHovered(false) }} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: cBtnPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)' }}>
            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, opacity: cActive ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: cActive ? 'ringRotate 3s linear infinite' : 'none', filter: cBtnPressed ? 'brightness(1.3)' : 'none' }} />
            <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: cActive ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} />
            <img src="/logo-c.png" alt="Roll" style={{ position: 'relative', zIndex: 3, width: '44px', height: '44px', objectFit: 'contain', pointerEvents: 'none' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
