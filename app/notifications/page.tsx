'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, getEffectiveUserId } from '@/lib/supabase'

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'

// ── Preloaded sounds ──────────────────────────────────────
var preClick: HTMLAudioElement | null = null
var preNotification: HTMLAudioElement | null = null
var preLevelUp: HTMLAudioElement | null = null
var preForesight: HTMLAudioElement | null = null
if (typeof window !== 'undefined') {
  preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7
  preNotification = new Audio('/sounds/notification.mp3'); preNotification.preload = 'auto'; preNotification.volume = 0.8
  preLevelUp = new Audio('/sounds/levelup.mp3'); preLevelUp.preload = 'auto'; preLevelUp.volume = 0.85
  preForesight = new Audio('/sounds/foresight.mp3'); preForesight.preload = 'auto'; preForesight.volume = 0.8
}
function playPreloaded(audio: HTMLAudioElement | null) { if (!audio) return; try { var clone = audio.cloneNode(true) as HTMLAudioElement; clone.volume = audio.volume; clone.play().catch(function () {}) } catch (e) {} }
function playClick() { playPreloaded(preClick) }
function playNotification() { playPreloaded(preNotification) }
function playLevelUp() { playPreloaded(preLevelUp) }
function playForesight() { playPreloaded(preForesight) }

var audioUnlocked = false
function unlockAllAudio() {
  if (audioUnlocked) return; audioUnlocked = true;
  [preClick, preNotification, preLevelUp, preForesight].forEach(function (a) {
    if (!a) return; try { var c = a.cloneNode(true) as HTMLAudioElement; c.volume = 0; c.play().then(function () { c.pause() }).catch(function () {}) } catch (e) {}
  })
}

function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) {
  var [hovered, setHovered] = useState(false); var [pressed, setPressed] = useState(false); var active = hovered || pressed
  function doPress() { unlockAllAudio(); playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) }
  return (<a href={href} style={{ position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' }} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>)
}
function IconProfile({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>) }
function IconVault({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>) }
function IconLibrary({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>) }

function NotifIcon({ icon, fallback, size = 18 }: { icon: string; fallback: string; size?: number }) {
  const isImage = /\.(png|jpg|jpeg|svg|webp)$/i.test(icon) || icon.includes('/')
  if (isImage) {
    const src = icon.startsWith('/') ? icon : `/${icon}`
    return (
      <img src={src} alt="" style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
        onError={(e) => { const parent = (e.target as HTMLImageElement).parentElement; if (parent) { parent.innerHTML = fallback } }} />
    )
  }
  return <>{icon}</>
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; sound: 'click' | 'notification' | 'levelup' | 'foresight' }> = {
  foresight_correct:   { icon: '🔮', color: '#a78bfa', label: 'Foresight',   sound: 'foresight' },
  foresight_incorrect: { icon: '❌', color: '#ef4444', label: 'Foresight',   sound: 'foresight' },
  streak_milestone:    { icon: '🔥', color: '#f59e0b', label: 'Streak',      sound: 'notification' },
  rank_up:             { icon: '⬆️', color: '#60a5fa', label: 'Rank Up',     sound: 'levelup' },
  achievement_unlock:  { icon: '🏆', color: '#d4af37', label: 'Achievement', sound: 'notification' },
  challenge_complete:  { icon: '✅', color: '#22c55e', label: 'Challenge',   sound: 'notification' },
  daily_chest:         { icon: '🎁', color: '#d4af37', label: 'Reward',      sound: 'notification' },
  welcome:             { icon: '👋', color: '#5E9ABB', label: 'Welcome',     sound: 'click' },
  system:              { icon: '📢', color: '#828D98', label: 'System',      sound: 'click' },
}

type Notification = {
  id: string
  session_id: string
  type: string
  title: string
  body: string | null
  icon: string | null
  color: string | null
  metadata: any
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  var [cBtnHovered, setCBtnHovered] = useState(false)
  var [cBtnPressed, setCBtnPressed] = useState(false)
  var cActive = cBtnHovered || cBtnPressed
  function handleStartRolling() { unlockAllAudio(); playClick(); setCBtnPressed(true); try { var ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {}; setTimeout(function () { setCBtnPressed(false) }, 150); window.location.href = '/feed?first=1' }

  useEffect(() => {
    ;(async () => { const userId = await getEffectiveUserId(); setSessionId(userId) })()
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?session_id=${sessionId}&all=1`)
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unread_count || 0)
      }
    } catch {}
    setLoading(false)
  }, [sessionId])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // ── Mark read + dismiss (slide away) ────────────────────
  async function dismissNotif(id: string) {
    // Add to dismissed set — triggers exit animation
    setDismissed(prev => new Set(prev).add(id))
    // Update unread count
    const notif = notifications.find(n => n.id === id)
    if (notif && !notif.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    // Remove from list after animation completes
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 350)
    // Mark as read on server
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      })
    } catch {}
  }

  async function markAllRead() {
    setMarkingAll(true)
    // Dismiss all unread
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    unreadIds.forEach(id => setDismissed(prev => new Set(prev).add(id)))
    setUnreadCount(0)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => !unreadIds.includes(n.id)))
      setMarkingAll(false)
    }, 350)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read', session_id: sessionId }),
      })
    } catch {}
  }

  function handleTap(notif: Notification) {
    unlockAllAudio()
    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
    if (config.sound === 'notification') playNotification()
    else if (config.sound === 'levelup') playLevelUp()
    else if (config.sound === 'foresight') playForesight()
    else playClick()
    dismissNotif(notif.id)
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read && !dismissed.has(n.id))
    : notifications.filter(n => !dismissed.has(n.id))

  const grouped: { label: string; items: Notification[] }[] = []
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  for (const notif of filtered) {
    const d = new Date(notif.created_at).toDateString()
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : new Date(notif.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    const existing = grouped.find(g => g.label === label)
    if (existing) existing.items.push(notif)
    else grouped.push({ label, items: [notif] })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #151820 0%, #07070c 50%)',
      color: '#A8B2BD',
      fontFamily: FONT,
      paddingBottom: '40px',
    }}>
      <style>{`@keyframes navRingRotate { to { transform: rotate(360deg); } } @keyframes ringRotate { to { transform: rotate(360deg); } }`}</style>

      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 55, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/feed" icon={<img src="/logo-c.png" alt="Roll" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.85 }} />} />
        <NavBtn href="/library" icon={<IconLibrary color="#A8B2BD" />} />
        <NavBtn href="/profile" icon={<IconProfile color="#A8B2BD" />} />
        <NavBtn href="/vault" icon={<IconVault color="#A8B2BD" />} />
      </div>

      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: '#07070c',
        borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#A8B2BD', fontSize: '20px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>←</button>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Notifications</h1>
            {unreadCount > 0 && (
              <span style={{ background: '#5E9ABB', color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '10px', padding: '2px 8px', minWidth: '20px', textAlign: 'center' }}>{unreadCount}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? 'rgba(94,154,187,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f ? 'rgba(94,154,187,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '20px', padding: '5px 14px',
                color: filter === f ? '#5E9ABB' : '#717B85',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={markingAll} style={{
              background: 'none', border: 'none', color: '#5E9ABB', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', opacity: markingAll ? 0.5 : 1, padding: '4px 0', whiteSpace: 'nowrap',
            }}>Mark all read</button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#565F67', fontSize: '14px' }}>Loading...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔔</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#717B85', marginBottom: '8px' }}>
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </div>
            <div style={{ fontSize: '13px', color: '#565F67' }}>
              {filter === 'unread' ? 'You\'ve read everything. Keep discovering!' : 'Roll some dice and your activity will show up here.'}
            </div>
          </div>
        )}

        {!loading && grouped.map(group => (
          <div key={group.label} style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#565F67', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 4px 8px' }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <AnimatePresence>
                {group.items.map((notif, i) => {
                  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
                  const accentColor = notif.color || config.color
                  const iconStr = notif.icon || config.icon

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0, x: -300, transition: { duration: 0.3, ease: 'easeIn' } }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      layout
                      onClick={() => handleTap(notif)}
                      style={{
                        background: notif.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(1px) saturate(126%)',
                        WebkitBackdropFilter: 'blur(1px) saturate(126%)',
                        border: `1px solid ${notif.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.11)'}`,
                        borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                        transition: 'background 0.2s, border 0.2s',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {!notif.is_read && (
                        <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', borderRadius: '0 2px 2px 0', background: accentColor }} />
                      )}

                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: `${accentColor}15`, border: `1px solid ${accentColor}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                      }}>
                        <NotifIcon icon={iconStr} fallback={config.icon} size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '14px', fontWeight: notif.is_read ? 500 : 700, color: notif.is_read ? '#A8B2BD' : '#fff', lineHeight: 1.3 }}>
                            {notif.title}
                          </span>
                        </div>
                        {notif.body && (
                          <div style={{ fontSize: '12px', color: '#717B85', lineHeight: 1.4, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                            {notif.body}
                          </div>
                        )}
                        {notif.metadata?.points && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px',
                            fontSize: '11px', fontWeight: 700,
                            color: notif.metadata.points > 0 ? '#22c55e' : '#ef4444',
                            background: notif.metadata.points > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${notif.metadata.points > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: '6px', padding: '2px 8px',
                          }}>
                            {notif.metadata.points > 0 ? '+' : ''}{notif.metadata.points} Spark
                            {notif.metadata.gold > 0 && (
                              <span style={{ color: '#d4af37', marginLeft: '4px' }}>+{notif.metadata.gold} Gold</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: '#565F67', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>
                        {timeAgo(notif.created_at)}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '24px', paddingBottom: '40px' }}>
        <button onClick={handleStartRolling} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setCBtnHovered(true) }} onPointerLeave={function () { setCBtnHovered(false) }} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: cBtnPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)' }}>
          <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, opacity: cActive ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: cActive ? 'ringRotate 3s linear infinite' : 'none', filter: cBtnPressed ? 'brightness(1.3)' : 'none' }} />
          <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: cActive ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} />
          <img src="/logo-c.png" alt="Roll" style={{ position: 'relative', zIndex: 3, width: '44px', height: '44px', objectFit: 'contain', pointerEvents: 'none' }} />
        </button>
      </div>
    </div>
  )
}
