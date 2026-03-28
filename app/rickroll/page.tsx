// @ts-nocheck
'use client'
// CHANCE v38 — Nav: playClick + pointerType hover gate. Chance btn: 3px border shimmer + press flash.
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase, getEffectiveUserId, getAuthUser } from '@/lib/supabase'
type UrlItem = { id: number; url: string; domain: string | null; title: string | null; description: string | null; category: string | null; embed_status: string | null }
type PointPopup = { id: number; amount: number; bonus?: string }

var DiceRoll = dynamic(function () { return import('@/components/DiceRoll') }, { ssr: false })

var REACTIONS = [
  { type: 'yawn', label: 'Yawn', img: '/emoji/Yawning_Face.png' },
  { type: 'neutral', label: 'Neutral', img: '/emoji/Unamused_Face.png' },
  { type: 'mindblown', label: 'Mindblown', img: '/emoji/Exploding_Head.png' },
] as const
var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"

var preClick: HTMLAudioElement | null = null
var prePop: HTMLAudioElement | null = null
if (typeof window !== 'undefined') {
  preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7
  prePop = new Audio('/pop.mp3'); prePop.preload = 'auto'; prePop.volume = 0.7
}
function playPreloaded(source: HTMLAudioElement | null) { if (!source) return; try { var clone = source.cloneNode(true) as HTMLAudioElement; clone.volume = source.volume; clone.play().catch(function () {}) } catch (e) {} }
function playClick() { playPreloaded(preClick) }
function playPop() { playPreloaded(prePop) }

var GLASS_BG = 'rgba(255,255,255,0.08)'
var GLASS_BLUR = 'blur(1px) saturate(126%)'
var GLASS_BORDER = '1px solid rgba(255,255,255,0.11)'
var GLASS_SHADOW = '0 8px 32px rgba(0,0,0,0.12)'
var GLASS_RADIUS = '20px'
var TXT_HEAVY = '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,1)'
var TXT_MED = '0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'
var TXT_LIGHT = '0 1px 3px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.3)'
var BTN_TXT = '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)'
var EMBED_WEIGHT = 0.95
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'

/* ── Nav Button Component ── */
function NavBtn({ href, onClick, icon, label }: { href?: string; onClick?: () => void; icon: React.ReactNode; label: string }) {
  var [hovered, setHovered] = useState(false)
  var [pressed, setPressed] = useState(false)
  var active = hovered || pressed
  function doPress() { playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) }
  var btnStyle: React.CSSProperties = {
    position: 'relative', width: '30px', height: '30px', borderRadius: '50%',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', padding: 0, outline: 'none',
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
    transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
    transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)',
  }
  var ringStyle: React.CSSProperties = {
    position: 'absolute', inset: '-1.5px', borderRadius: '50%',
    background: PLATINUM_RING,
    opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0,
    animation: hovered ? 'navRingRotate 3s linear infinite' : 'none',
    filter: pressed ? 'brightness(1.3)' : 'none',
  }
  var innerStyle: React.CSSProperties = {
    position: 'absolute', inset: '1px', borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(14, 17, 24, 0.97), rgba(22, 28, 38, 0.95))',
    zIndex: 1,
  }
  var borderStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: '1px solid rgba(130, 141, 152, 0.22)',
    opacity: active ? 0 : 1, transition: 'opacity 0.3s ease',
    zIndex: 2, pointerEvents: 'none',
  }
  var iconStyle: React.CSSProperties = {
    position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s ease',
  }
  var tooltipStyle: React.CSSProperties = {
    position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
    transform: hovered ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4px)',
    fontSize: '9px', fontWeight: 500, letterSpacing: '0.6px', color: '#e0e4e8',
    background: 'rgba(14, 17, 24, 0.9)', border: '1px solid rgba(130, 141, 152, 0.15)',
    padding: '3px 8px', borderRadius: '5px', whiteSpace: 'nowrap',
    opacity: hovered ? 1 : 0, pointerEvents: 'none',
    transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)', zIndex: 10,
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    fontFamily: FONT,
  }
  var content = (
    <>
      <div style={ringStyle} />
      <div style={innerStyle} />
      <div style={borderStyle} />
      <div style={iconStyle}>{icon}</div>
      <div style={tooltipStyle}>{label}</div>
    </>
  )
  if (href) {
    return (
      <a href={href} style={{ ...btnStyle, textDecoration: 'none' } as React.CSSProperties}
        onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }}
        onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}>
        {content}
      </a>
    )
  }
  return (
    <button style={btnStyle} onClick={function () { doPress(); if (onClick) onClick() }}
      onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}>
      {content}
    </button>
  )
}

/* ── SVG Icons (14px, stroke only) ── */
function IconHome({ color }: { color: string }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>)
}
function IconVault({ color }: { color: string }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>)
}
function IconProfile({ color }: { color: string }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>)
}
function IconLogIn({ color }: { color: string }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>)
}
function IconLogOut({ color }: { color: string }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>)
}

export default function ChanceFeed() {
  var [currentUrl, setCurrentUrl] = useState<UrlItem | null>(null)
  var [loading, setLoading] = useState(true)
  var [userReaction, setUserReaction] = useState<string | null>(null)
  var [saved, setSaved] = useState(false)
  var [rolling, setRolling] = useState(false)
  var [reportedDead, setReportedDead] = useState(false)
  var [seenIds, setSeenIds] = useState<number[]>([])
  var [sessionId, setSessionId] = useState('')
  var [totalUrls, setTotalUrls] = useState(0)
  var [shared, setShared] = useState(false)
  var [cardKey, setCardKey] = useState(0)
  var [totalPoints, setTotalPoints] = useState(0)
  var [pointPopups, setPointPopups] = useState<PointPopup[]>([])
  var [authUser, setAuthUser] = useState<any>(null)
  var [migrationBanner, setMigrationBanner] = useState<'hidden' | 'show' | 'migrating' | 'done' | 'error'>('hidden')
  var [migrationResult, setMigrationResult] = useState('')
  var [btnPressed, setBtnPressed] = useState(false)
  var [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null)
  var [hoveredAction, setHoveredAction] = useState<number | null>(null)
  var [chanceBtnHovered, setChanceBtnHovered] = useState(false)
  var fetchRef = useRef(false)
  var popupId = useRef(0)
  var reactionBusy = useRef(false)
  var lastRollTime = useRef(0)
  var reactionAwarded = useRef(false)
  var saveAwarded = useRef(false)
  var shareAwarded = useRef(false)
  var deadAwarded = useRef(false)
  var [embedUrl, setEmbedUrl] = useState<string | null>(null)
  var [embedFailed, setEmbedFailed] = useState(false)
  var [embedLoading, setEmbedLoading] = useState(false)
  var [embedMode, setEmbedMode] = useState(true)
  var [transitionOverlay, setTransitionOverlay] = useState(false)
  var [hasActivated, setHasActivated] = useState(false)
  var iframeRef = useRef<HTMLIFrameElement>(null)
  var embedTimeoutRef = useRef<any>(null)
  var widgetRef = useRef<HTMLDivElement>(null)
  var [widgetXY, setWidgetXY] = useState<{ x: number; y: number } | null>(null)
  var draggingRef = useRef(false)
  var dragStartRef = useRef({ mx: 0, my: 0, wx: 0, wy: 0 })
  var movedRef = useRef(false)
  var [showDice, setShowDice] = useState(false)
  var [lastDiceResult, setLastDiceResult] = useState<number | null>(null)
  var pendingFetchRef = useRef(false)
  var [actionsVisible, setActionsVisible] = useState(false)
  var [skullHovered, setSkullHovered] = useState(false)
  var videoRef = useRef<HTMLVideoElement>(null)
  var [isMuted, setIsMuted] = useState(true)
  var hasUnmutedRef = useRef(false)

  function wasDragged() { return movedRef.current }
  function onDragStart(clientX: number, clientY: number) { if (!widgetRef.current) return; draggingRef.current = true; movedRef.current = false; var rect = widgetRef.current.getBoundingClientRect(); dragStartRef.current = { mx: clientX, my: clientY, wx: rect.left, wy: rect.top } }
  useEffect(function () {
    function onMouseMove(e: MouseEvent) { if (!draggingRef.current) return; var dx = e.clientX - dragStartRef.current.mx; var dy = e.clientY - dragStartRef.current.my; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true; setWidgetXY({ x: dragStartRef.current.wx + dx, y: dragStartRef.current.wy + dy }) }
    function onMouseUp() { draggingRef.current = false }
    function onTouchMove(e: TouchEvent) { if (!draggingRef.current) return; e.preventDefault(); var touch = e.touches[0]; var dx = touch.clientX - dragStartRef.current.mx; var dy = touch.clientY - dragStartRef.current.my; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true; setWidgetXY({ x: dragStartRef.current.wx + dx, y: dragStartRef.current.wy + dy }) }
    function onTouchEnd() { draggingRef.current = false }
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); window.addEventListener('touchmove', onTouchMove, { passive: false }); window.addEventListener('touchend', onTouchEnd)
    return function () { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd) }
  }, [])
  useEffect(function () {
    function handleFirstInteraction() {
      if (hasUnmutedRef.current) return
      hasUnmutedRef.current = true
      if (videoRef.current) { videoRef.current.muted = false; setIsMuted(false) }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)
    return function () { document.removeEventListener('click', handleFirstInteraction); document.removeEventListener('touchstart', handleFirstInteraction) }
  }, [])
  useEffect(function () { if (hasActivated && videoRef.current) { videoRef.current.pause() } }, [hasActivated])
  useEffect(function () {
    ;(async function () { var user = await getAuthUser(); setAuthUser(user); var userId = await getEffectiveUserId(); setSessionId(userId); if (user) { var oldSid = localStorage.getItem('chance_old_session_id'); if (oldSid && oldSid !== user.id) setMigrationBanner('show') } })()
    var sub = supabase.auth.onAuthStateChange(async function (event, session) { if (session && session.user) { setAuthUser(session.user); setSessionId(session.user.id); localStorage.setItem('chance_session_id', session.user.id); var oldSid = localStorage.getItem('chance_old_session_id'); if (oldSid && oldSid !== session.user.id) setMigrationBanner('show') } else { setAuthUser(null); var userId = await getEffectiveUserId(); setSessionId(userId) } })
    return function () { sub.data.subscription.unsubscribe() }
  }, [])
  useEffect(function () { if (!sessionId) return; fetch('/api/points?sessionId=' + sessionId).then(function (r) { return r.json() }).then(function (d) { setTotalPoints(d.total_points || 0) }).catch(function () {}) }, [sessionId])
  function showPointPopup(amount: number, bonus?: string) { var id = ++popupId.current; setPointPopups(function (prev) { return prev.concat([{ id: id, amount: amount, bonus: bonus }]) }); setTimeout(function () { setPointPopups(function (prev) { return prev.filter(function (p) { return p.id !== id }) }) }, 1800) }
  async function awardPoints(action: string, urlId?: number, extra?: any) { if (!authUser) return; try { var res = await fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action: action, sessionId: sessionId, urlId: urlId }, extra || {})) }); var data = await res.json(); if (data.success) { setTotalPoints(data.totalPoints || 0); showPointPopup(data.points, data.bonuses && data.bonuses[0]) } } catch (e) {} }
  function extractDomain(url: string) { try { return new URL(url).hostname.replace('www.', '') } catch (e) { return url } }
  function getDisplayTitle(item: UrlItem): string { if (item.title && item.title.trim()) return item.title.trim(); return item.domain || extractDomain(item.url) }
  var [embedCountdown, setEmbedCountdown] = useState(0)
  var countdownRef = useRef<any>(null)
  function loadEmbed(url: string) { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); if (countdownRef.current) clearInterval(countdownRef.current); setTransitionOverlay(true); setEmbedFailed(false); setEmbedLoading(true); setEmbedCountdown(8); countdownRef.current = setInterval(function () { setEmbedCountdown(function (c) { if (c <= 1) { clearInterval(countdownRef.current); return 0 }; return c - 1 }) }, 1000); setTimeout(function () { setEmbedUrl(url); embedTimeoutRef.current = setTimeout(function () { if (countdownRef.current) clearInterval(countdownRef.current); setEmbedFailed(true); setEmbedLoading(false); setTransitionOverlay(false) }, 8000) }, 50) }
  function onIframeLoad() { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); if (countdownRef.current) clearInterval(countdownRef.current); setEmbedLoading(false); setTimeout(function () { try { var iframe = iframeRef.current; if (iframe) { var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document); if (!doc || !doc.body || doc.body.innerHTML.length < 100) { setEmbedFailed(true); setEmbedLoading(false); setTransitionOverlay(false); return } } } catch (e) { /* cross-origin = embed loaded successfully */ }; setTransitionOverlay(false) }, 150) }
  function onIframeError() { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); if (countdownRef.current) clearInterval(countdownRef.current); setEmbedFailed(true); setEmbedLoading(false); setTransitionOverlay(false) }
  useEffect(function () { if (!currentUrl || !embedMode || !hasActivated) return; if (currentUrl.embed_status === 'blocked') { setEmbedUrl(currentUrl.url); setEmbedFailed(true); setEmbedLoading(false); setTransitionOverlay(false); return }; loadEmbed(currentUrl.url) }, [currentUrl, hasActivated]) // eslint-disable-line

  function getTier(total: number): string {
    if (total === 2) return 'cursed'
    if (total <= 5) return 'standard'
    if (total <= 8) return 'lucky'
    if (total <= 11) return 'epic'
    return 'legendary'
  }

  var fetchNextUrl = useCallback(async function (tier?: string) {
    if (fetchRef.current) return; fetchRef.current = true
    setRolling(true); setLoading(true); setUserReaction(null); setSaved(false); setReportedDead(false); setShared(false); setActionsVisible(false)
    reactionAwarded.current = false; saveAwarded.current = false; shareAwarded.current = false; deadAwarded.current = false
    try {
      // Tier-based category filter
      var tierCategory: string | null = null
      if (tier === 'cursed') tierCategory = 'snake-eyes'
      else if (tier === 'epic') tierCategory = 'epic'
      else if (tier === 'legendary') tierCategory = 'legendary'

      var preferEmbed = Math.random() < EMBED_WEIGHT

      // First try tier-filtered query
      var baseQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status', { count: 'exact', head: true }).eq('is_dead', false)
      if (tierCategory) baseQuery = baseQuery.eq('category', tierCategory)
      if (preferEmbed && !tierCategory) baseQuery = baseQuery.eq('embed_status', 'embeddable')
      var countRes = await baseQuery; var total = countRes.count || 0

      // Fallback: if tier query returned 0, fall back to standard (no category filter)
      if (total === 0 && tierCategory) {
        tierCategory = null
        baseQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status', { count: 'exact', head: true }).eq('is_dead', false)
        if (preferEmbed) baseQuery = baseQuery.eq('embed_status', 'embeddable')
        countRes = await baseQuery; total = countRes.count || 0
      }

      if (total === 0) { var fallbackCount = await supabase.from('urls').select('*', { count: 'exact', head: true }).eq('is_dead', false); total = fallbackCount.count || 0; preferEmbed = false }
      setTotalUrls(total); if (total === 0) { setCurrentUrl(null); setLoading(false); setRolling(false); fetchRef.current = false; return }
      var offset = Math.floor(Math.random() * total)
      var fetchQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status').eq('is_dead', false)
      if (tierCategory) fetchQuery = fetchQuery.eq('category', tierCategory)
      if (preferEmbed && !tierCategory) fetchQuery = fetchQuery.eq('embed_status', 'embeddable')
      var result = await fetchQuery.range(offset, offset).limit(1)
      if (result.error) throw result.error
      if (result.data && result.data.length > 0) { var item = result.data[0] as UrlItem; if (seenIds.includes(item.id) && seenIds.length < Math.min(total, 300)) { fetchRef.current = false; setRolling(false); setLoading(false); fetchNextUrl(tier); return }; if (!item.domain) item.domain = extractDomain(item.url); setCurrentUrl(item); setCardKey(function (k) { return k + 1 }); setSeenIds(function (prev) { return prev.slice(-300).concat([item.id]) }) }
      else { setSeenIds([]); fetchRef.current = false; fetchNextUrl(tier); return }
    } catch (err) { console.error('Fetch error:', err) } finally { setLoading(false); setTimeout(function () { setRolling(false) }, 400); fetchRef.current = false }
  }, [seenIds, currentUrl])

  var handleDiceResult = useCallback(function (total: number, dice: number[]) {
    setLastDiceResult(total)
    var isDouble = dice.length === 2 && dice[0] === dice[1]
    // Doubles trigger tier-based fetch
    if (isDouble) {
      if (total === 2) { fetchNextUrl('cursed') }
      else if (total === 12) { fetchNextUrl('legendary') }
      else { fetchNextUrl('epic') }
    }
  }, [fetchNextUrl])
  var fetchOnDiceRef = useRef(handleDiceResult)
  fetchOnDiceRef.current = handleDiceResult
  var stableHandleDiceResult = useCallback(function (total: number, dice: number[]) { fetchOnDiceRef.current(total, dice) }, [])
  var handleDiceFadeComplete = useCallback(function () { setShowDice(false); setLastDiceResult(null); if (pendingFetchRef.current) pendingFetchRef.current = false }, [])

  function handleChancePress() {
    if (wasDragged()) { movedRef.current = false; return }
    var now = Date.now(); if (now - lastRollTime.current < 1500) return; lastRollTime.current = now
    playClick(); setBtnPressed(true); setTimeout(function () { setBtnPressed(false) }, 150)
    if (!hasActivated) setHasActivated(true)
    if (currentUrl && sessionId) { supabase.from('url_events').insert({ url_id: currentUrl.id, event_type: 'click', session_id: sessionId }).then(function () {}) }
    if (currentUrl && (!embedMode || currentUrl.embed_status === 'blocked')) { if (currentUrl.embed_status !== 'blocked') { window.open(currentUrl.url, '_blank', 'noopener,noreferrer') } }
    setShowDice(true); pendingFetchRef.current = true; fetchNextUrl()
  }
  useEffect(function () { if (sessionId) fetchNextUrl() }, [sessionId]) // eslint-disable-line

  async function handleReaction(type: string) {
    if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId || reactionBusy.current) return
    reactionBusy.current = true; playPop()
    try {
      if (userReaction === type) { setUserReaction(null); setActionsVisible(false); await supabase.from('url_events').delete().eq('url_id', currentUrl.id).eq('session_id', sessionId).eq('event_type', type) }
      else { if (userReaction) await supabase.from('url_events').delete().eq('url_id', currentUrl.id).eq('session_id', sessionId).eq('event_type', userReaction); setUserReaction(type); setActionsVisible(true); await supabase.from('url_events').insert({ url_id: currentUrl.id, event_type: type, session_id: sessionId }); if (!reactionAwarded.current) { reactionAwarded.current = true; awardPoints('reaction', currentUrl.id, { reactionType: type }) } }
    } finally { reactionBusy.current = false }
  }
  async function handleSave() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId) return; playClick(); var next = !saved; setSaved(next); if (next) { await supabase.from('vault_saves').insert({ url_id: currentUrl.id, user_id: sessionId }); if (!saveAwarded.current) { saveAwarded.current = true; awardPoints('save', currentUrl.id) } } else { await supabase.from('vault_saves').delete().eq('url_id', currentUrl.id).eq('user_id', sessionId) } }
  async function handleShare() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl) return; playClick(); var shouldAward = !shareAwarded.current; if (shouldAward) shareAwarded.current = true; if (navigator.share) { try { await navigator.share({ title: currentUrl.title || 'Check this out', url: currentUrl.url }); setShared(true) } catch (e) { return } } else { try { await navigator.clipboard.writeText(currentUrl.url) } catch (e) {}; setShared(true); setTimeout(function () { setShared(false) }, 2000) }; if (shouldAward) awardPoints('share', currentUrl.id) }
  async function handleReportDead() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId) return; playClick(); if (reportedDead) { setReportedDead(false); await supabase.from('dead_reports').delete().eq('url_id', currentUrl.id).eq('session_id', sessionId) } else { setReportedDead(true); await supabase.from('dead_reports').insert({ url_id: currentUrl.id, session_id: sessionId }); if (!deadAwarded.current) { deadAwarded.current = true; awardPoints('dead_report', currentUrl.id) } } }
  async function handleMigrate() { var oldSid = localStorage.getItem('chance_old_session_id'); if (!oldSid || !authUser) return; setMigrationBanner('migrating'); try { var res = await fetch('/api/migrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldSessionId: oldSid, newUserId: authUser.id }) }); var data = await res.json(); if (data.success) { setMigrationResult(data.message); setMigrationBanner('done'); localStorage.removeItem('chance_old_session_id'); fetch('/api/points?sessionId=' + authUser.id).then(function (r) { return r.json() }).then(function (d) { setTotalPoints(d.total_points || 0) }).catch(function () {}) } else { setMigrationResult(data.error || 'Migration failed'); setMigrationBanner('error') } } catch (e) { setMigrationResult('Network error'); setMigrationBanner('error') } }
  async function handleLogout() { await supabase.auth.signOut(); setAuthUser(null); var newSid = crypto.randomUUID(); localStorage.setItem('chance_session_id', newSid); setSessionId(newSid) }



  var wStyle = widgetXY
    ? { position: 'fixed' as const, left: widgetXY.x + 'px', top: widgetXY.y + 'px', zIndex: 30, userSelect: 'none' as const, WebkitUserSelect: 'none' as const }
    : { position: 'fixed' as const, bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, userSelect: 'none' as const, WebkitUserSelect: 'none' as const }
  var showUrlInfo = hasActivated && currentUrl
  var iconColor = '#A8B2BD'
  var chanceActive = chanceBtnHovered || btnPressed

  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { to { opacity: 0; transform: translateY(-6px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes emojiPop { 0% { transform: scale(1); } 25% { transform: scale(1.8); } 50% { transform: scale(0.85); } 75% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 50px; } }
        @keyframes skullPulse { 0%,100% { filter: drop-shadow(0 0 0px rgba(248,113,113,0)); } 50% { filter: drop-shadow(0 0 6px rgba(248,113,113,0.5)); } }
        @keyframes navRingRotate { to { transform: rotate(360deg); } }
        @keyframes chanceBorderShimmer { 0% { border-color: rgba(168,178,189,0.7); } 25% { border-color: rgba(220,225,230,0.9); } 50% { border-color: rgba(255,255,255,1); } 75% { border-color: rgba(220,225,230,0.9); } 100% { border-color: rgba(168,178,189,0.7); } }
        *:focus { outline: none !important; }
      `}</style>

      {showDice && <DiceRoll onResult={stableHandleDiceResult} onFadeComplete={handleDiceFadeComplete} />}
      {embedUrl && !embedFailed && <iframe ref={iframeRef} src={embedUrl} onLoad={onIframeLoad} onError={onIframeError} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', border: 'none', zIndex: 1, background: '#07070c' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Embedded site" />}
      {transitionOverlay && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2, background: '#07070c', animation: 'overlayFadeIn 0.1s ease-out', pointerEvents: 'none' }} />}
      {embedUrl && embedLoading && !embedFailed && <div style={{ position: 'fixed', top: '12px', left: '16px', zIndex: 3, pointerEvents: 'none' }}><div style={{ fontSize: '11px', fontWeight: 500, color: '#3D444A', fontFamily: FONT }}>{embedCountdown > 0 ? embedCountdown + 's' : '...'}</div></div>}
      {embedUrl && embedFailed && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, background: '#07070c', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 32px', boxSizing: 'border-box', paddingTop: '18vh' }}>
          <div style={{ textAlign: 'center', maxWidth: '340px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/emoji/Globe.png" alt="" style={{ width: '64px', height: '64px', opacity: 0.8 }} /></div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#d0d4d9', marginBottom: '8px' }}>Opens in its own tab</h2>
            <p style={{ fontSize: '13px', color: '#717B85', lineHeight: 1.5, marginBottom: '20px' }}>This site can&#39;t be embedded. Press Chance to keep going, or open it directly.</p>
            <button onClick={function () { playClick(); window.open(embedUrl || '', '_blank', 'noopener,noreferrer') }} style={{ padding: '9px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', color: '#e5e5e7', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: FONT, touchAction: 'manipulation', transition: 'all 0.2s ease' }}>Open in Tab</button>
          </div>
        </div>
      )}
      <video ref={videoRef} autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, objectFit: 'cover', pointerEvents: 'none', display: hasActivated ? 'none' : 'block' }} src="/videos/kikTXNL6MvX6ZpRXM.mp4" />
      {hasActivated && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, background: '#07070c' }} />}

      {migrationBanner !== 'hidden' && (
        <div style={{ position: 'fixed', bottom: '200px', left: '50%', transform: 'translateX(-50%)', zIndex: 55, width: '260px' }}>
          <div style={{ padding: '7px 10px', borderRadius: '12px', background: migrationBanner === 'done' ? 'rgba(52,211,153,0.12)' : migrationBanner === 'error' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.08)', border: '1px solid ' + (migrationBanner === 'done' ? 'rgba(52,211,153,0.25)' : migrationBanner === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.12)'), backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', animation: 'fadeInUp 0.3s ease-out' }}>
            {migrationBanner === 'show' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}><div style={{ fontSize: '9px', fontWeight: 600, color: '#e5e5e7', textShadow: TXT_LIGHT }}>Found old data</div><div style={{ display: 'flex', gap: '4px' }}><button onClick={handleMigrate} style={{ padding: '2px 8px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#e5e5e7', border: '1px solid rgba(255,255,255,0.15)', fontFamily: FONT, fontWeight: 600, fontSize: '8px' }}>Claim</button><button onClick={function () { setMigrationBanner('hidden'); localStorage.removeItem('chance_old_session_id') }} style={{ padding: '2px 5px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', color: '#565F67', border: '1px solid rgba(255,255,255,0.08)', fontSize: '8px' }}>&#10005;</button></div></div>)}
            {migrationBanner === 'migrating' && (<div style={{ textAlign: 'center', fontSize: '9px', color: '#e5e5e7', fontWeight: 600 }}>Migrating...</div>)}
            {migrationBanner === 'done' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: '9px', color: '#34d399', fontWeight: 600 }}>{migrationResult}</div><button onClick={function () { setMigrationBanner('hidden') }} style={{ padding: '1px 4px', cursor: 'pointer', background: 'transparent', color: '#565F67', border: 'none', fontSize: '8px' }}>&#10005;</button></div>)}
            {migrationBanner === 'error' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: '9px', color: '#f87171', fontWeight: 600 }}>{migrationResult}</div><button onClick={function () { setMigrationBanner('show') }} style={{ padding: '1px 5px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: '8px', fontWeight: 600 }}>Retry</button></div>)}
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
        {pointPopups.map(function (p) { return (<div key={p.id} style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', padding: '3px 12px', borderRadius: '8px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', animation: 'fadeInUp 0.3s ease-out, fadeOut 0.5s ease-in 1.2s forwards', whiteSpace: 'nowrap', textShadow: TXT_LIGHT, backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>+{p.amount} pts{p.bonus && <span style={{ color: '#A8B2BD', marginLeft: '3px' }}>{p.bonus}</span>}</div>) })}
      </div>

      {/* Nav buttons */}
      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/" icon={<IconHome color={iconColor} />} label="Home" />
        <NavBtn href="/vault" icon={<IconVault color={iconColor} />} label="Vault" />
        <NavBtn href="/profile" icon={<IconProfile color={iconColor} />} label="Profile" />
        {authUser
          ? <NavBtn onClick={handleLogout} icon={<IconLogOut color={iconColor} />} label="Log Out" />
          : <NavBtn href="/login" icon={<IconLogIn color={iconColor} />} label="Log In" />
        }
      </div>
    </div>
  )
}
