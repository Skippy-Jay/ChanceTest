'use client'
// CHANCE v40.10.3 — Fire loop audio: startFireLoop/stopFireLoop, negativeBeeps on foresight miss
// v40.10.2 — Fire system: consecutive doubles → fire → inferno
// v40.10.1: Spotlight: doubles delay (not cancel), Legendary ad-free, clearer gold reward
// v40.9.13: Dead link verification, dice tracking RPC, foresight sound fix, Comet
// v40.9.9: Fix duplicate URLs: await history insert before next roll
// v40.9.8: Fix reaction farming: no spark on emoji switch, API-driven popup only
// v40.9.7: Challenge tracking: pass dice values to /api/points for doubles/snake-eyes
// v40.9.6: Bell notification icon in top-right nav
import { useState, useEffect, useCallback, useRef, ComponentType } from 'react'
import { supabase, getEffectiveUserId, getAuthUser } from '@/lib/supabase'
import CardSkinEffects from '@/components/CardSkinEffects'
type UrlItem = { id: number; url: string; domain: string | null; title: string | null; description: string | null; category: string | null; embed_status: string | null }
type PointPopup = { id: number; amount: number; bonus?: string }
var DiceRollComponent: ComponentType<any> | null = null
var diceImportPromise: Promise<void> | null = null
function ensureDiceLoaded(): Promise<void> {
  if (DiceRollComponent) return Promise.resolve()
  if (!diceImportPromise) {
    diceImportPromise = Promise.all([import('@/components/DiceRoll'), import('three'), import('cannon-es')]).then(function (modules) { DiceRollComponent = modules[0].default }).catch(function () { return import('@/components/DiceRoll').then(function (m) { DiceRollComponent = m.default }) })
  }
  return diceImportPromise
}
var REACTIONS = [
  { type: 'yawn', label: 'Yawn', img: '/emoji/Yawning_Face.png', slot: 'negative' },
  { type: 'neutral', label: 'Neutral', img: '/emoji/unamusedface.png', slot: 'neutral' },
  { type: 'mindblown', label: 'Mindblown', img: '/emoji/Exploding_Head.png', slot: 'positive' },
] as const
var SKIN_EMOJIS: Record<string, { positive: string; neutral: string; negative: string }> = {
  ivory: { positive: '/emoji/Exploding_Head.png', neutral: '/emoji/unamusedface.png', negative: '/emoji/celestial/Sleeping Face.png' },
  midnight: { positive: '/emoji/midnight/Glowing Star.png', neutral: '/emoji/midnight/Last Quarter Moon Face.png', negative: '/emoji/midnight/Zzz.png' },
  ember: { positive: '/emoji/ember/Fire.png', neutral: '/emoji/ember/Smiling Face with Sunglasses.png', negative: '/emoji/ember/Cold Face.png' },
  portal: { positive: '/emoji/portal/Alien.png', neutral: '/emoji/portal/Alien Monster.png', negative: '/emoji/portal/Ghost.png' },
  hologram: { positive: '/emoji/hologram/Star-Struck.png', neutral: '/emoji/hologram/Mirror Ball.png', negative: '/emoji/hologram/Slightly Frowning Face.png' },
  matrix: { positive: '/emoji/matrix/redpill.png', neutral: '/emoji/matrix/Gear.png', negative: '/emoji/matrix/bluepill.png' },
  celestial: { positive: '/emoji/celestial/Ringed Planet.png', neutral: '/emoji/celestial/Compass.png', negative: '/emoji/celestial/Comet.png' },
}
var SKIN_TIER: Record<string, string> = { ivory: 'default', midnight: 'common', ember: 'uncommon', portal: 'rare', hologram: 'epic', matrix: 'legendary', celestial: 'legendary' }
var SKIN_TIER_INDEX: Record<string, number> = { ivory: 0, midnight: 1, ember: 2, portal: 3, hologram: 4, matrix: 5, celestial: 5 }
var FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLAT = '#A8B2BD'
var preClick: HTMLAudioElement | null = null; var prePop: HTMLAudioElement | null = null; var preCoin: HTMLAudioElement | null = null; var preSpark: HTMLAudioElement | null = null; var preDiceRoll: HTMLAudioElement | null = null; var preGoldCoin: HTMLAudioElement | null = null; var preSkullReport: HTMLAudioElement | null = null; var preForesight: HTMLAudioElement | null = null; var preFireWhoosh: HTMLAudioElement | null = null; var preFireLoop: HTMLAudioElement | null = null; var preNegativeBeeps: HTMLAudioElement | null = null
var audioCtx: AudioContext | null = null
var audioBuffers: Record<string, AudioBuffer> = {}
function getAudioCtx(): AudioContext | null {
  if (audioCtx) return audioCtx
  try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch (e) {}
  return audioCtx
}
function preloadBuffer(name: string, url: string) {
  fetch(url).then(function (r) { return r.arrayBuffer() }).then(function (buf) {
    var ctx = getAudioCtx(); if (!ctx) return
    return ctx.decodeAudioData(buf)
  }).then(function (decoded) { if (decoded) audioBuffers[name] = decoded }).catch(function () {})
}
if (typeof window !== 'undefined') {
  preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7
  prePop = new Audio('/pop.mp3'); prePop.preload = 'auto'; prePop.volume = 0.7
  preCoin = new Audio('/sounds/points.mp3'); preCoin.preload = 'auto'; preCoin.volume = 0.5
  preSpark = new Audio('/sounds/spark.mp3'); preSpark.preload = 'auto'; preSpark.volume = 0.6
  preDiceRoll = new Audio('/sounds/dice-roll.mp3'); preDiceRoll.preload = 'auto'; preDiceRoll.volume = 0.8
  preGoldCoin = new Audio('/sounds/gold-coin.mp3'); preGoldCoin.preload = 'auto'; preGoldCoin.volume = 0.6
  preSkullReport = new Audio('/sounds/skull-report.mp3'); preSkullReport.preload = 'auto'; preSkullReport.volume = 0.5
  preForesight = new Audio('/sounds/foresight.mp3'); preForesight.preload = 'auto'; preForesight.volume = 0.7
  preFireWhoosh = new Audio('/sounds/firewhoosh1.mp3'); preFireWhoosh.preload = 'auto'; preFireWhoosh.volume = 0.8
  preFireLoop = new Audio('/sounds/fire-loop.mp3'); preFireLoop.preload = 'auto'; preFireLoop.volume = 0.35; preFireLoop.loop = true
  preNegativeBeeps = new Audio('/sounds/negative-beeps.mp3'); preNegativeBeeps.preload = 'auto'; preNegativeBeeps.volume = 0.6
  preloadBuffer('click', '/sounds/click.mp3')
  preloadBuffer('pop', '/pop.mp3')
  preloadBuffer('coin', '/sounds/points.mp3')
  preloadBuffer('spark', '/sounds/spark.mp3')
  preloadBuffer('diceRoll', '/sounds/dice-roll.mp3')
  preloadBuffer('goldCoin', '/sounds/gold-coin.mp3')
  preloadBuffer('skullReport', '/sounds/skull-report.mp3')
  preloadBuffer('fireWhoosh', '/sounds/firewhoosh1.mp3')
}
function playViaWebAudio(name: string, volume: number) {
  var ctx = getAudioCtx(); if (!ctx) return false
  var buf = audioBuffers[name]; if (!buf) return false
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(function () {})
    var source = ctx.createBufferSource(); source.buffer = buf
    var gain = ctx.createGain(); gain.gain.value = volume
    source.connect(gain); gain.connect(ctx.destination); source.start(0); return true
  } catch (e) { return false }
}
function playPreloaded(source: HTMLAudioElement | null) { if (!source) return; try { var clone = source.cloneNode(true) as HTMLAudioElement; clone.volume = source.volume; clone.play().catch(function () {}) } catch (e) {} }
function playClick() { if (!playViaWebAudio('click', 0.7)) playPreloaded(preClick) }
function playForesight() { playPreloaded(preForesight) }
function playPop() { if (!playViaWebAudio('pop', 0.7)) playPreloaded(prePop) }
function playCoin() { if (!playViaWebAudio('coin', 0.5)) playPreloaded(preCoin) }
function playSpark() { if (!playViaWebAudio('spark', 0.6)) playPreloaded(preSpark) }
function playDiceRoll() { playViaWebAudio('diceRoll', 0.8) }
function playGoldCoin() { if (!playViaWebAudio('goldCoin', 0.6)) playPreloaded(preGoldCoin) }
function playSkullReport() { if (!playViaWebAudio('skullReport', 0.5)) playPreloaded(preSkullReport) }
function playFireWhoosh() { if (!playViaWebAudio('fireWhoosh', 0.8)) playPreloaded(preFireWhoosh) }
function playNegativeBeeps() { playPreloaded(preNegativeBeeps) }
function startFireLoop() { if (!preFireLoop) return; preFireLoop.currentTime = 0; preFireLoop.volume = 0.35; preFireLoop.play().catch(function () {}) }
function stopFireLoop() { if (!preFireLoop) return; var fadeInterval = setInterval(function () { if (!preFireLoop) { clearInterval(fadeInterval); return }; if (preFireLoop.volume > 0.05) { preFireLoop.volume = Math.max(0, preFireLoop.volume - 0.07) } else { preFireLoop.pause(); preFireLoop.currentTime = 0; clearInterval(fadeInterval) } }, 80) }
var audioUnlocked = false
function unlockAllAudio() {
  if (audioUnlocked) return; audioUnlocked = true
  var ctx = getAudioCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {})
  if (ctx) { try { var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {} }
}
var GLASS_BG = 'rgba(0,0,0,0)'; var GLASS_BLUR = 'blur(1px) saturate(126%)'; var GLASS_BORDER = '0.45px solid rgba(0,0,0,0.02)'; var GLASS_SHADOW = '3px 4px 8.1px 0px rgba(0,0,0,0.25)'; var GLASS_RADIUS = '20px'
var TXT_HEAVY = '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,1)'; var TXT_MED = '0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'; var TXT_LIGHT = '0 0 4px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.7)'
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'
var CHANCE_BTN_GRADIENT = 'linear-gradient(135deg, rgba(6,6,6,0.69), rgba(0,0,0,0.69))'
var CHANCE_BTN_BORDER = '1px solid rgba(130,141,152,0.13)'
var EMBED_TIMEOUT_MS = 6000
var ALL_RESERVED = ['legendary', 'epic', 'snake-eyes']

function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) {
  var [hovered, setHovered] = useState(false); var [pressed, setPressed] = useState(false); var active = hovered || pressed
  function doPress() { playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) }
  return (<a href={href} style={{ position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' }} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>)
}
function IconVault({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>) }
function IconProfile({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>) }
function IconLibrary({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>) }
function IconBell({ color, badge }: { color: string; badge?: number }) { return (<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>{badge && badge > 0 ? <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', fontSize: '8px', fontWeight: 800, borderRadius: '7px', padding: '1px 4px', minWidth: '12px', textAlign: 'center' as const, lineHeight: '12px' }}>{badge > 9 ? '9+' : badge}</span> : null}</div>) }

function GoldTickUp({ from, to }: { from: number; to: number }) {
  var [display, setDisplay] = useState(from)
  useEffect(function () {
    var diff = to - from; if (diff <= 0) { setDisplay(to); return }
    var steps = Math.min(diff, 15); var step = 0; var interval = setInterval(function () { step++; var progress = step / steps; var eased = 1 - Math.pow(1 - progress, 3); setDisplay(Math.round(from + diff * eased)); if (step >= steps) { clearInterval(interval); setDisplay(to) } }, 60)
    return function () { clearInterval(interval) }
  }, [from, to])
  return <>{display}</>
}

function getExcludedCategories(skinId: string): string[] {
  var tier = SKIN_TIER[skinId] || 'default'
  if (tier === 'legendary') return ['snake-eyes']
  if (tier === 'epic') return ['legendary', 'snake-eyes']
  return ALL_RESERVED
}

function hasLibraryAccess(): boolean {
  try { var owned = localStorage.getItem('chance_owned_skins'); if (!owned) return false; var skins = JSON.parse(owned); if (!Array.isArray(skins)) return false; var max = 0; for (var i = 0; i < skins.length; i++) { var t = SKIN_TIER_INDEX[skins[i]] || 0; if (t > max) max = t }; return max >= 2 } catch (e) { return false }
}
export default function ChanceFeed() {
  var [feedAuthed, setFeedAuthed] = useState(true); var [feedPw, setFeedPw] = useState(''); var [feedPwError, setFeedPwError] = useState(false)
  var [currentUrl, setCurrentUrl] = useState<UrlItem | null>(null); var [loading, setLoading] = useState(true); var [userReaction, setUserReaction] = useState<string | null>(null)
  var [saved, setSaved] = useState(false); var [rolling, setRolling] = useState(false); var [reportedDead, setReportedDead] = useState(false); var [deadChecking, setDeadChecking] = useState(false)
  var [seenIds, setSeenIds] = useState<number[]>([]); var [sessionId, setSessionId] = useState(''); var [totalUrls, setTotalUrls] = useState(0)
  var [shared, setShared] = useState(false); var [cardKey, setCardKey] = useState(0); var [totalPoints, setTotalPoints] = useState(0); var [totalRolls, setTotalRolls] = useState(0)
  var [goldBalance, setGoldBalance] = useState(0)
  var [pointPopups, setPointPopups] = useState<PointPopup[]>([])
  var [cardTakeover, setCardTakeover] = useState<{ type: 'gold_earned'; fromGold: number; toGold: number } | { type: 'gold_stats' } | null>(null)
  var [goldIconHovered, setGoldIconHovered] = useState(false)
  var [goldShimmer, setGoldShimmer] = useState(false)
  var cardTakeoverTimer = useRef<any>(null)
  var [authUser, setAuthUser] = useState<any>(null)
  var [migrationBanner, setMigrationBanner] = useState<'hidden' | 'show' | 'migrating' | 'done' | 'error'>('hidden'); var [migrationResult, setMigrationResult] = useState('')
  var [foresightResults, setForesightResults] = useState<any[]>([]); var [foresightVisible, setForesightVisible] = useState(false); var [foresightIdx, setForesightIdx] = useState(0); var [foresightPeekUrl, setForesightPeekUrl] = useState<string | null>(null); var [foresightPeeking, setForesightPeeking] = useState(false)
  var [btnPressed, setBtnPressed] = useState(false); var [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null); var [hoveredAction, setHoveredAction] = useState<number | null>(null); var [chanceBtnHovered, setChanceBtnHovered] = useState(false)
  var fetchRef = useRef(false); var popupId = useRef(0); var reactionBusy = useRef(false); var lastRollTime = useRef(0)
  var [embedUrl, setEmbedUrl] = useState<string | null>(null); var [embedLoading, setEmbedLoading] = useState(false); var [hasActivated, setHasActivated] = useState(true)
  var iframeRef = useRef<HTMLIFrameElement>(null); var embedTimeoutRef = useRef<any>(null)
  var widgetRef = useRef<HTMLDivElement>(null); var [widgetXY, setWidgetXY] = useState<{ x: number; y: number } | null>(null)
  var draggingRef = useRef(false); var dragStartRef = useRef({ mx: 0, my: 0, wx: 0, wy: 0 }); var movedRef = useRef(false)
  var [showDice, setShowDice] = useState(false); var [diceReady, setDiceReady] = useState(false)
  useEffect(function () { if (!showDice) return; var t = setTimeout(function () { setShowDice(false); setDiceReady(false); diceHasLanded.current = true; revealCard() }, 10000); return function () { clearTimeout(t) } }, [showDice])
  useEffect(function () { if (!showDice) { setDiceReady(false); return }; ensureDiceLoaded().then(function () { setDiceReady(true) }) }, [showDice])
  var [actionsVisible, setActionsVisible] = useState(false); var [skullHovered, setSkullHovered] = useState(false); var [cardRevealed, setCardRevealed] = useState(true)
  var [failedDomains] = useState<Set<string>>(() => new Set()); var [recentDomains, setRecentDomains] = useState<string[]>([])
  var embedRetryCount = useRef(0); var diceHasLanded = useRef(false); var embedReadyRef = useRef(false); var initialLoadDone = useRef(false)
  var [diceSkin, setDiceSkin] = useState('ivory'); var seenUrlIds = useRef<Set<number>>(new Set())
  // ── Spotlight state ──
  var [isSpotlight, setIsSpotlight] = useState(false); var [spotlightId, setSpotlightId] = useState<string | null>(null); var [spotlightBonusSpark, setSpotlightBonusSpark] = useState(0); var spotlightRollCounter = useRef(0)
  // ── v40.10.2: Fire system state ──
  var consecutiveDoublesRef = useRef(0)
  var [fireMode, setFireMode] = useState<'none' | 'fire' | 'inferno'>('none')
  var authUserRef = useRef<any>(null)
  var [showLibNav, setShowLibNav] = useState(false)
  var [unreadNotifCount, setUnreadNotifCount] = useState(0)
  useEffect(function () { authUserRef.current = authUser }, [authUser])
  useEffect(function () { setShowLibNav(hasLibraryAccess()) }, [])
  useEffect(function () { if (!sessionId) return; fetch('/api/notifications?session_id=' + sessionId + '&count=1').then(function (r) { return r.json() }).then(function (d) { setUnreadNotifCount(d.unread_count || 0) }).catch(function () {}) }, [sessionId])

  function handleGoldIconTap() {
    playGoldCoin()
    if (cardTakeoverTimer.current) clearTimeout(cardTakeoverTimer.current)
    setCardTakeover(null)
    setTimeout(function () { setCardTakeover({ type: 'gold_stats' }) }, 10)
    cardTakeoverTimer.current = setTimeout(function () { setCardTakeover(null) }, 2000)
  }
  function triggerGoldEarned(amount: number) {
    var prevGold = goldBalance
    setGoldBalance(function (b) { return b + amount })
    setGoldShimmer(true)
    playCoin()
    if (cardTakeoverTimer.current) clearTimeout(cardTakeoverTimer.current)
    setCardTakeover({ type: 'gold_earned', fromGold: prevGold, toGold: prevGold + amount })
    setTimeout(function () { setGoldShimmer(false) }, 1200)
    cardTakeoverTimer.current = setTimeout(function () { setCardTakeover(null) }, 2500)
  }
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
  function handleFeedLogin() { if (feedPw === 'mission') { playClick(); setFeedAuthed(true); sessionStorage.setItem('chance_feed_auth', 'true'); setFeedPwError(false) } else setFeedPwError(true) }
  useEffect(function () {
    if (!feedAuthed) return; var savedSkin = localStorage.getItem('chance_dice_skin'); if (savedSkin) setDiceSkin(savedSkin)
    ;(async function () { var user = await getAuthUser(); setAuthUser(user); var userId = await getEffectiveUserId(); setSessionId(userId); if (user) { var oldSid = localStorage.getItem('chance_old_session_id'); if (oldSid && oldSid !== user.id) setMigrationBanner('show'); var localPicks = localStorage.getItem('chance_picked_categories'); if (!localPicks) { try { var { data: ud } = await supabase.from('users').select('picked_categories').eq('id', user.id).single(); if (ud && ud.picked_categories && ud.picked_categories.length === 3) { localStorage.setItem('chance_picked_categories', JSON.stringify(ud.picked_categories)) } } catch (e) {} } } })()
    var sub = supabase.auth.onAuthStateChange(async function (event, session) { if (session && session.user) { setAuthUser(session.user); setSessionId(session.user.id); localStorage.setItem('chance_session_id', session.user.id); var oldSid = localStorage.getItem('chance_old_session_id'); if (oldSid && oldSid !== session.user.id) setMigrationBanner('show') } else { setAuthUser(null); var userId = await getEffectiveUserId(); setSessionId(userId) } })
    return function () { sub.data.subscription.unsubscribe() }
  }, [feedAuthed])
  useEffect(function () { if (!sessionId || !feedAuthed) return; fetch('/api/points?sessionId=' + sessionId).then(function (r) { return r.json() }).then(function (d) { setTotalPoints(d.total_points || 0); setGoldBalance(d.gold_coins || 0) }).catch(function () {}) }, [sessionId, feedAuthed])
  useEffect(function () { if (!sessionId || !feedAuthed) return; supabase.from('user_stats').select('total_rolls').eq('session_id', sessionId).single().then(function (res) { if (res.data) setTotalRolls(res.data.total_rolls || 0) }) }, [sessionId, feedAuthed])
  useEffect(function () { if (!sessionId || !feedAuthed) return; try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz) { supabase.from('user_stats').update({ timezone: tz }).eq('session_id', sessionId).then(function () {}) } } catch (e) {} }, [sessionId, feedAuthed])

  useEffect(function () { if (!sessionId || !feedAuthed) return
    fetch('/api/foresight?session_id=' + sessionId).then(function (r) { return r.json() }).then(function (d) {
      if (d.results && d.results.length > 0) { setForesightResults(d.results); setForesightIdx(0); setForesightVisible(true); setTimeout(function () { if (d.results[0] && d.results[0].was_correct) { playForesight() } else { playNegativeBeeps() } }, 300) }
    }).catch(function () {})
    fetch('/api/foresight?action=should_run').then(function (r) { return r.json() }).then(function (d) {
      if (d.should_run) { fetch('/api/foresight', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (document.cookie.match(/chance_admin_token=([^;]+)/)?.[1] || '') } }).catch(function () {}) }
    }).catch(function () {})
  }, [sessionId, feedAuthed])
  function dismissForesight() {
    if (foresightResults.length === 0) return
    var current = foresightResults[foresightIdx]
    if (current) { fetch('/api/foresight', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, result_ids: [current.id] }) }).catch(function () {}) }
    if (foresightIdx < foresightResults.length - 1) { setForesightIdx(function (i) { return i + 1 }) }
    else { playClick(); setForesightVisible(false) }
  }

  function showPointPopup(amount: number, bonus?: string) { var id = ++popupId.current; setPointPopups(function (prev) { return prev.concat([{ id: id, amount: amount, bonus: bonus }]) }); setTimeout(function () { setPointPopups(function (prev) { return prev.filter(function (p) { return p.id !== id }) }) }, 1800) }
  async function awardPoints(action: string, urlId?: number, extra?: any) { if (!sessionId) return; try { var res = await fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action: action, sessionId: sessionId, urlId: urlId }, extra || {})) }); var data = await res.json(); if (data.success) { setTotalPoints(data.totalPoints || 0); if (data.points > 0) { setPointPopups([]); playSpark(); showPointPopup(data.points, data.bonuses && data.bonuses.length > 0 ? data.bonuses[0] : undefined) }; if (data.gold > 0) triggerGoldEarned(data.gold) } } catch (e) {} }
  function clawbackPoints(action: string, urlId?: number, extra?: any) { if (!authUserRef.current) return; try { fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action: action, sessionId: sessionId, urlId: urlId }, extra || {})) }).then(function (r) { return r.json() }).then(function (d) { if (d.success && d.totalPoints !== undefined) setTotalPoints(d.totalPoints) }) } catch (e) {} }
  function extractDomain(url: string) { try { return new URL(url).hostname.replace('www.', '') } catch (e) { return url } }
  function getDisplayTitle(item: UrlItem): string { if (item.title && item.title.trim()) return item.title.trim(); return item.domain || extractDomain(item.url) }
  function loadEmbed(url: string) { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); setEmbedLoading(true); setEmbedUrl(url); embedReadyRef.current = false; embedTimeoutRef.current = setTimeout(function () { handleEmbedFailure(url) }, EMBED_TIMEOUT_MS) }
  function onIframeLoad() { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); setEmbedLoading(false); embedReadyRef.current = true; embedRetryCount.current = 0; if (diceHasLanded.current) { revealCard() } }
  function onIframeError() { if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current); handleEmbedFailure(embedUrl || '') }
  function handleEmbedFailure(url: string) { var domain = extractDomain(url); failedDomains.add(domain); setEmbedLoading(false); revealCard() }
  function revealCard() { setCardRevealed(true); diceHasLanded.current = false }
  useEffect(function () { if (!currentUrl || !hasActivated) return; loadEmbed(currentUrl.url) }, [currentUrl, hasActivated]) // eslint-disable-line
  function getTier(total: number, dice: number[]): string { var isDouble = dice.length === 2 && dice[0] === dice[1]; if (isDouble) { if (total === 2) return 'cursed'; if (total === 12) return 'legendary'; return 'epic' }; if (total <= 5) return 'standard'; if (total <= 8) return 'lucky'; return 'standard' }

  var fetchNextUrl = useCallback(async function (tier?: string) {
    if (fetchRef.current) return; fetchRef.current = true
    setRolling(true); setLoading(true); setUserReaction(null); setSaved(false); setReportedDead(false); setShared(false); setActionsVisible(false)
    try {
      var tierCategory: string | null = null
      if (tier === 'cursed') tierCategory = 'snake-eyes'; else if (tier === 'epic') tierCategory = 'epic'; else if (tier === 'legendary') tierCategory = 'legendary'
      var curateRaw = localStorage.getItem('chance_curate_categories'); var curateList: string[] | null = null
      var activeSkin = localStorage.getItem('chance_dice_skin') || 'ivory'
      if (curateRaw && !tierCategory && activeSkin !== 'ivory') { try { curateList = JSON.parse(curateRaw); if (!Array.isArray(curateList) || curateList.length === 0) curateList = null } catch (e) { curateList = null } }
      if (curateList && !tierCategory) {
        var skinTier = SKIN_TIER[activeSkin] || 'default'
        if (skinTier === 'legendary') { if (!curateList.includes('epic')) curateList = curateList.concat(['epic']); if (!curateList.includes('legendary')) curateList = curateList.concat(['legendary']) }
        else if (skinTier === 'epic') { if (!curateList.includes('epic')) curateList = curateList.concat(['epic']) }
      }
      var potLuck = localStorage.getItem('chance_pot_luck') === 'true'; var pickedCategories: string[] | null = null
      if (!tierCategory && !curateList && !potLuck) { var pickedRaw = localStorage.getItem('chance_picked_categories'); if (pickedRaw) { try { var pp = JSON.parse(pickedRaw); if (Array.isArray(pp) && pp.length === 3) pickedCategories = pp } catch (e) {} }; if (pickedCategories && totalRolls >= 150 && Math.random() < 0.2) pickedCategories = null }
      var excludedCats = getExcludedCategories(activeSkin)
      var overseenIds: number[] = []
      if (sessionId) { try { var seenThreshold = (!tierCategory && totalRolls < 300) ? 1 : 2; var { data: histData } = await supabase.from('user_url_history').select('url_id').eq('user_id', sessionId).gte('seen_count', seenThreshold); if (histData && histData.length > 0) overseenIds = histData.map(function (h: any) { return h.url_id }) } catch (e) {} }
      var baseQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status', { count: 'exact', head: true }).eq('is_dead', false)
      if (!tierCategory) baseQuery = baseQuery.eq('embed_status', 'embeddable')
      if (overseenIds.length > 0 && overseenIds.length <= 1000) baseQuery = baseQuery.not('id', 'in', '(' + overseenIds.join(',') + ')')
      if (tierCategory) { baseQuery = baseQuery.eq('category', tierCategory) } else if (curateList) { baseQuery = baseQuery.in('category', curateList) } else if (pickedCategories) { baseQuery = baseQuery.in('category', pickedCategories) } else { baseQuery = baseQuery.not('category', 'in', '(' + excludedCats.join(',') + ')') }
      var countRes = await baseQuery; var total = countRes.count || 0
      if (total === 0 && tierCategory) { overseenIds = []; baseQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status', { count: 'exact', head: true }).eq('is_dead', false).eq('category', tierCategory); countRes = await baseQuery; total = countRes.count || 0 }
      if (total === 0 && curateList) { overseenIds = []; baseQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status', { count: 'exact', head: true }).eq('is_dead', false).eq('embed_status', 'embeddable').in('category', curateList); countRes = await baseQuery; total = countRes.count || 0 }
      setTotalUrls(total); if (total === 0) { setCurrentUrl(null); setLoading(false); setRolling(false); fetchRef.current = false; revealCard(); return }
      var offset = Math.floor(Math.random() * total)
      var fetchQuery = supabase.from('urls').select('id, url, domain, title, description, category, embed_status').eq('is_dead', false)
      if (!tierCategory) fetchQuery = fetchQuery.eq('embed_status', 'embeddable')
      if (overseenIds.length > 0 && overseenIds.length <= 1000) fetchQuery = fetchQuery.not('id', 'in', '(' + overseenIds.join(',') + ')')
      if (tierCategory) { fetchQuery = fetchQuery.eq('category', tierCategory) } else if (curateList) { fetchQuery = fetchQuery.in('category', curateList) } else if (pickedCategories) { fetchQuery = fetchQuery.in('category', pickedCategories) } else { fetchQuery = fetchQuery.not('category', 'in', '(' + excludedCats.join(',') + ')') }
      var result = await fetchQuery.range(offset, offset).limit(1); if (result.error) throw result.error
      if (result.data && result.data.length > 0) {
        var item = result.data[0] as UrlItem; if (!item.domain) item.domain = extractDomain(item.url); var itemDomain = extractDomain(item.url)
        if (seenUrlIds.current.has(item.id) || failedDomains.has(itemDomain) || recentDomains.includes(itemDomain)) { fetchRef.current = false; setRolling(false); setLoading(false); fetchNextUrl(tier); return }
        setCurrentUrl(item); setCardKey(function (k) { return k + 1 }); try { localStorage.setItem('chance_last_url', JSON.stringify(item)) } catch (e) {}; seenUrlIds.current.add(item.id)
        setSeenIds(function (prev) { return prev.slice(-300).concat([item.id]) }); setRecentDomains(function (prev) { return prev.slice(-19).concat([itemDomain]) })
        if (sessionId) { try { await supabase.rpc('upsert_url_history', { p_user_id: sessionId, p_url_id: item.id }) } catch (e) {} }
      } else { setSeenIds([]); fetchRef.current = false; fetchNextUrl(tier); return }
    } catch (err) { console.error('Fetch error:', err); revealCard() } finally { setLoading(false); setTimeout(function () { setRolling(false) }, 400); fetchRef.current = false }
  }, [seenIds, currentUrl, recentDomains, failedDomains, totalRolls])

  // ── SPOTLIGHT-AWARE handleDiceResult + v40.10.2 FIRE SYSTEM ──
  var handleDiceResult = useCallback(function (total: number, dice: number[]) {
    // v40.10.2: Admin force-doubles debug toggle
    if (typeof window !== 'undefined' && localStorage.getItem('chance_force_doubles') === 'true') {
      var forcedVal = dice[0] || (1 + Math.floor(Math.random() * 6))
      dice = [forcedVal, forcedVal]
      total = forcedVal * 2
    }
    var tier = getTier(total, dice)
    var isDouble = dice.length === 2 && dice[0] === dice[1]
    // v40.10.2: Fire system — track consecutive doubles
    if (isDouble) {
      consecutiveDoublesRef.current++
      if (consecutiveDoublesRef.current === 2) {
        setFireMode('fire')
        console.log('[FIRE] 2nd double — fire ignited, playing whoosh')
        playFireWhoosh()
      } else if (consecutiveDoublesRef.current >= 3) {
        setFireMode('inferno')
        startFireLoop()
        console.log('[FIRE] 3rd+ double — INFERNO')
      }
    } else {
      if (consecutiveDoublesRef.current >= 2) { setFireMode('none'); stopFireLoop(); console.log('[FIRE] streak broken — peter out') }
      consecutiveDoublesRef.current = 0
    }
    if (sessionId && authUserRef.current) { ;(async function () { try { var res = await fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'roll', sessionId: sessionId, dice: dice }) }); var data = await res.json(); if (data.success && data.gold > 0) triggerGoldEarned(data.gold) } catch (e) {}; try { await supabase.rpc('track_dice_roll', { p_session_id: sessionId, p_dice1: dice[0], p_dice2: dice[1] }) } catch (e) {} })() }
    setTotalRolls(function (r) { return r + 1 })
    // Spotlight: sliding scale based on skin tier — Legendary users never see ads
    spotlightRollCounter.current++
    var activeSkinForAds = localStorage.getItem('chance_dice_skin') || 'ivory'
    var SPOTLIGHT_INTERVAL: Record<string, number> = { ivory: 7, midnight: 9, ember: 11, portal: 13, hologram: 15, matrix: 0, celestial: 0 }
    var spotInterval = SPOTLIGHT_INTERVAL[activeSkinForAds] || 7
    var isLegendaryUser = spotInterval === 0
    if (!isLegendaryUser && spotlightRollCounter.current >= spotInterval && !isDouble && sessionId) {
      fetch('/api/spotlight?session_id=' + sessionId).then(function (r) { return r.json() }).then(function (d) {
        if (d.spotlight) {
          spotlightRollCounter.current = 0
          var s = d.spotlight
          setIsSpotlight(true); setSpotlightId(s.id); setSpotlightBonusSpark(s.spark_bonus || 3)
          setCurrentUrl({ id: 0, url: s.url, domain: s.domain || s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], title: s.domain || s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], description: s.title, category: s.category_target || 'spotlight', embed_status: 'embeddable' })
          setCardKey(function (k) { return k + 1 }); setLoading(false); setRolling(false); fetchRef.current = false
        } else { spotlightRollCounter.current = 0; setIsSpotlight(false); setSpotlightId(null); setSpotlightBonusSpark(0); fetchNextUrl(tier) }
      }).catch(function () { spotlightRollCounter.current = 0; setIsSpotlight(false); setSpotlightId(null); setSpotlightBonusSpark(0); fetchNextUrl(tier) })
    } else {
      if (isLegendaryUser) spotlightRollCounter.current = 0
      setIsSpotlight(false); setSpotlightId(null); setSpotlightBonusSpark(0); fetchNextUrl(tier)
    }
  }, [fetchNextUrl, sessionId])
  var fetchOnDiceRef = useRef(handleDiceResult); fetchOnDiceRef.current = handleDiceResult
  var stableHandleDiceResult = useCallback(function (total: number, dice: number[]) { fetchOnDiceRef.current(total, dice) }, [])
  var handleDiceFadeComplete = useCallback(function () { setShowDice(false); diceHasLanded.current = true; stopFireLoop(); if (embedReadyRef.current) { revealCard() }; setTimeout(function () { if (!embedReadyRef.current) { revealCard() } }, EMBED_TIMEOUT_MS) }, [])

  function handleChancePress() {
    if (wasDragged()) { movedRef.current = false; return }
    var now = Date.now(); if (now - lastRollTime.current < 1500) return; lastRollTime.current = now
    unlockAllAudio(); playClick(); setTimeout(function () { playDiceRoll() }, 800); setBtnPressed(true); setTimeout(function () { setBtnPressed(false) }, 150)
    if (!hasActivated) setHasActivated(true)
    if (currentUrl && sessionId) { supabase.from('url_events').insert({ url_id: currentUrl.id, event_type: 'click', session_id: sessionId }).then(function () {}) }
    stopFireLoop()
    setUserReaction(null); setHoveredEmoji(null); setCardTakeover(null)
    setEmbedUrl(null); setEmbedLoading(false); if (embedTimeoutRef.current) clearTimeout(embedTimeoutRef.current)
    setCardRevealed(false); diceHasLanded.current = false; embedReadyRef.current = false; embedRetryCount.current = 0; setShowDice(true)
  }

  useEffect(function () {
    if (!feedAuthed) return; if (initialLoadDone.current) return; initialLoadDone.current = true
    var previewId = localStorage.getItem('chance_admin_preview_id')
    if (previewId) { localStorage.removeItem('chance_admin_preview_id'); setLoading(true); supabase.from('urls').select('id, url, domain, title, description, category, embed_status').eq('id', parseInt(previewId)).single().then(function (result) { if (result.data) { var item = result.data as UrlItem; if (!item.domain) item.domain = extractDomain(item.url); setCurrentUrl(item); setCardKey(function (k) { return k + 1 }); setLoading(false); try { localStorage.setItem('chance_last_url', JSON.stringify(item)) } catch (e) {} } else { fetchNextUrl() } }) }
    else {
      var params = new URLSearchParams(window.location.search)
      if (params.get('preload') === '1') { try { var preloaded = localStorage.getItem('chance_preloaded_url'); if (preloaded) { var preUrl = JSON.parse(preloaded); localStorage.removeItem('chance_preloaded_url'); setCurrentUrl(preUrl); setLoading(false); revealCard(); window.history.replaceState({}, '', '/feed'); return } } catch (e) {} } if (params.get('first') === '1') {
        window.history.replaceState({}, '', '/feed'); setHasActivated(false); setCardRevealed(true)
        setLoading(false); setCurrentUrl(null)
        ensureDiceLoaded().catch(function () {})
      } else {
        var lastUrlRaw = localStorage.getItem('chance_last_url')
        if (lastUrlRaw) { try { var lastUrl = JSON.parse(lastUrlRaw) as UrlItem; if (lastUrl && lastUrl.id && lastUrl.url) { setCurrentUrl(lastUrl); setCardKey(function (k) { return k + 1 }); setLoading(false); setCardRevealed(true); return } } catch (e) {} }
        setLoading(false); setCardRevealed(true)
      }
    }
  }, [feedAuthed]) // eslint-disable-line

  async function handleReaction(type: string) { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId || reactionBusy.current) return; reactionBusy.current = true; playPop(); try { if (userReaction === type) { setUserReaction(null); setActionsVisible(false); if (!isSpotlight) { await supabase.from('url_events').delete().eq('url_id', currentUrl.id).eq('session_id', sessionId).eq('event_type', type); clawbackPoints('unreact', currentUrl.id, { reactionType: type }) } } else { var wasSwitch = !!userReaction; if (userReaction && !isSpotlight) await supabase.from('url_events').delete().eq('url_id', currentUrl.id).eq('session_id', sessionId).eq('event_type', userReaction); setUserReaction(type); setActionsVisible(true); if (!isSpotlight) { await supabase.from('url_events').insert({ url_id: currentUrl.id, event_type: type, session_id: sessionId }) }; if (!wasSwitch) { if (!isSpotlight) { awardPoints('reaction', currentUrl.id, { reactionType: type }) }; if (isSpotlight && spotlightId) { fetch('/api/spotlight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, spotlight_id: spotlightId, reaction: type }) }).then(function (r) { return r.json() }).then(function (d) { if (d.spark_bonus) { playSpark(); showPointPopup(d.spark_bonus, '\u2728 Spotlight bonus!') } }).catch(function () {}) } } } } finally { reactionBusy.current = false } }
  async function handleSave() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId) return; playClick(); var next = !saved; setSaved(next); if (next) { await supabase.from('vault_saves').insert({ url_id: currentUrl.id, user_id: sessionId }); awardPoints('save', currentUrl.id) } else { await supabase.from('vault_saves').delete().eq('url_id', currentUrl.id).eq('user_id', sessionId); clawbackPoints('unsave', currentUrl.id) } }
  async function handleShare() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl) return; playClick(); if (navigator.share) { try { await navigator.share({ title: currentUrl.title || 'Check this out', url: currentUrl.url }); setShared(true) } catch (e) { return } } else { try { await navigator.clipboard.writeText(currentUrl.url) } catch (e) {}; setShared(true); setTimeout(function () { setShared(false) }, 2000) }; awardPoints('share', currentUrl.id) }
  async function handleReportDead() { if (wasDragged()) { movedRef.current = false; return }; if (!currentUrl || !sessionId || deadChecking || reportedDead) return; playSkullReport(); setDeadChecking(true); try { var res = await fetch('/api/dead-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, url_id: currentUrl.id, url: currentUrl.url }) }); var data = await res.json(); if (data.dead) { setReportedDead(true); if (data.gold_awarded > 0) triggerGoldEarned(data.gold_awarded) } } catch (e) {} finally { setDeadChecking(false) } }
  async function handleMigrate() { var oldSid = localStorage.getItem('chance_old_session_id'); if (!oldSid || !authUser) return; setMigrationBanner('migrating'); try { var res = await fetch('/api/migrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldSessionId: oldSid, newUserId: authUser.id }) }); var data = await res.json(); if (data.success) { setMigrationResult(data.message); setMigrationBanner('done'); localStorage.removeItem('chance_old_session_id'); fetch('/api/points?sessionId=' + authUser.id).then(function (r) { return r.json() }).then(function (d) { setTotalPoints(d.total_points || 0); setGoldBalance(d.gold_coins || 0) }).catch(function () {}) } else { setMigrationResult(data.error || 'Migration failed'); setMigrationBanner('error') } } catch (e) { setMigrationResult('Network error'); setMigrationBanner('error') } }

  if (!feedAuthed) return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes loginRingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .login-enter-btn { position: relative; width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; margin: 0 auto; transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1); } .login-enter-btn:hover { transform: scale(1.1); } .login-enter-btn:active { transform: scale(0.92); } .login-enter-btn:hover .login-ring { opacity: 1; } .login-enter-btn:active .login-ring { opacity: 1; filter: brightness(1.3); } .login-enter-btn:hover .login-border { opacity: 0; }
        .login-ring { position: absolute; inset: -1.5px; border-radius: 50%; background: ${PLATINUM_RING}; opacity: 0; transition: opacity 0.4s ease; z-index: 0; animation: loginRingRotate 3s linear infinite; } .login-inner { position: absolute; inset: 1px; border-radius: 50%; background: linear-gradient(135deg, rgba(14, 17, 24, 0.97), rgba(22, 28, 38, 0.95)); z-index: 1; } .login-border { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(130, 141, 152, 0.22); transition: opacity 0.3s ease; z-index: 2; pointer-events: none; } .login-label { position: relative; z-index: 3; font-size: 11px; font-weight: 600; color: #A8B2BD; letter-spacing: 0.3px; pointer-events: none; }`}</style>
      <div style={{ textAlign: 'center', maxWidth: '360px', width: '100%', padding: '0 24px' }}>
        <img src="/logo-c.png" alt="Chance" style={{ width: '64px', height: '64px', margin: '0 auto 20px', display: 'block', objectFit: 'contain' }} />
        <p style={{ color: '#565F67', fontSize: '13px', marginBottom: '28px', fontWeight: 400 }}>Enter password to continue</p>
        <input type="password" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A8B2BD', fontSize: '16px', fontFamily: FONT, textAlign: 'center', letterSpacing: '2px', marginBottom: '14px', outline: 'none', boxSizing: 'border-box' }} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} value={feedPw} onChange={function (e) { setFeedPw(e.target.value); setFeedPwError(false) }} onKeyDown={function (e) { if (e.key === 'Enter') handleFeedLogin() }} autoFocus />
        {feedPwError && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>Wrong password</p>}
        <button className="login-enter-btn" onClick={handleFeedLogin}><div className="login-ring" /><div className="login-inner" /><div className="login-border" /><span className="login-label">Enter</span></button>
        <p style={{ color: '#3D444A', fontSize: '9px', marginTop: '14px', letterSpacing: '1px' }}>v40.10.3</p>
      </div>
    </div>
  )
  var wStyle = widgetXY ? { position: 'fixed' as const, left: widgetXY.x + 'px', top: widgetXY.y + 'px', zIndex: 30, userSelect: 'none' as const, WebkitUserSelect: 'none' as const } : { position: 'fixed' as const, bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, userSelect: 'none' as const, WebkitUserSelect: 'none' as const }
  var showUrlInfo = hasActivated && currentUrl && cardRevealed
  var iconColor = '#A8B2BD'; var chanceActive = chanceBtnHovered || btnPressed; var skinEffectOpacity = diceSkin !== 'ivory' ? 1 : 0
  var isCardTakeover = cardTakeover !== null && showUrlInfo
  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { to { opacity: 0; transform: translateY(-6px); } }
        @keyframes emojiPop { 0% { transform: scale(1); } 25% { transform: scale(1.8); } 50% { transform: scale(0.85); } 75% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 50px; } }
        @keyframes skullPulse { 0%,100% { filter: drop-shadow(0 0 0px rgba(248,113,113,0)); } 50% { filter: drop-shadow(0 0 6px rgba(248,113,113,0.5)); } }
        @keyframes navRingRotate { to { transform: rotate(360deg); } }
        @keyframes cardReveal { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes goldShimmerSweep { 0% { transform: translateX(-100%) skewX(-12deg); } 100% { transform: translateX(200%) skewX(-12deg); } }
        @keyframes goldWavePulse { 0% { opacity: 0; } 15% { opacity: 1; } 60% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes cardTakeoverAnim { 0% { opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes goldIconPop { 0% { transform: scale(1); } 30% { transform: scale(1.4); } 100% { transform: scale(1); } }
        *:focus { outline: none !important; }`}</style>
      {showDice && diceReady && DiceRollComponent && <DiceRollComponent onResult={stableHandleDiceResult} onFadeComplete={handleDiceFadeComplete} skin={(localStorage.getItem('chance_dice_skin') as any) || 'ivory'} fireMode={fireMode} />}
      {embedUrl && <iframe ref={iframeRef} src={embedUrl} onLoad={onIframeLoad} onError={onIframeError} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', border: 'none', zIndex: 1, background: '#07070c' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Embedded site" />}
      {!embedUrl && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, background: '#07070c' }} />}
      {!hasActivated && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: '20px' }}><img src="/logo-c.png" alt="Chance" style={{ width: '200px', height: '200px', objectFit: 'contain', opacity: 0.5 }} /></div>)}
      {migrationBanner !== 'hidden' && (<div style={{ position: 'fixed', bottom: '200px', left: '50%', transform: 'translateX(-50%)', zIndex: 55, width: '260px' }}><div style={{ padding: '7px 10px', borderRadius: '12px', background: migrationBanner === 'done' ? 'rgba(168,178,189,0.12)' : migrationBanner === 'error' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.08)', border: '1px solid ' + (migrationBanner === 'done' ? 'rgba(168,178,189,0.25)' : migrationBanner === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.12)'), backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', animation: 'fadeInUp 0.3s ease-out' }}>{migrationBanner === 'show' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}><div style={{ fontSize: '9px', fontWeight: 600, color: '#e5e5e7', textShadow: TXT_LIGHT }}>Found old data</div><div style={{ display: 'flex', gap: '4px' }}><button onClick={handleMigrate} style={{ padding: '2px 8px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#e5e5e7', border: '1px solid rgba(255,255,255,0.15)', fontFamily: FONT, fontWeight: 600, fontSize: '8px' }}>Claim</button><button onClick={function () { setMigrationBanner('hidden'); localStorage.removeItem('chance_old_session_id') }} style={{ padding: '2px 5px', borderRadius: '6px', cursor: 'pointer', background: 'transparent', color: '#565F67', border: '1px solid rgba(255,255,255,0.08)', fontSize: '8px' }}>{'\u2715'}</button></div></div>)}{migrationBanner === 'migrating' && (<div style={{ textAlign: 'center', fontSize: '9px', color: '#e5e5e7', fontWeight: 600 }}>Migrating...</div>)}{migrationBanner === 'done' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: '9px', color: PLAT, fontWeight: 600 }}>{migrationResult}</div><button onClick={function () { setMigrationBanner('hidden') }} style={{ padding: '1px 4px', cursor: 'pointer', background: 'transparent', color: '#565F67', border: 'none', fontSize: '8px' }}>{'\u2715'}</button></div>)}{migrationBanner === 'error' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: '9px', color: '#f87171', fontWeight: 600 }}>{migrationResult}</div><button onClick={function () { setMigrationBanner('show') }} style={{ padding: '1px 5px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: '8px', fontWeight: 600 }}>Retry</button></div>)}</div></div>)}
      <div style={{ position: 'fixed', top: '12px', left: '12px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
        {foresightVisible && foresightResults.length > 0 && foresightResults[foresightIdx] && (function () { var fr = foresightResults[foresightIdx]; var correct = fr.was_correct; var title = fr.url_info ? (fr.url_info.title || fr.url_info.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) : 'URL'; var labelMap: Record<string, string> = { mindblown: 'positive', neutral: 'neutral', yawn: 'negative' }; var userLabel = labelMap[fr.user_reaction] || fr.user_reaction; var crowdLabel = labelMap[fr.consensus_reaction] || fr.consensus_reaction; return (<div style={{ padding: '12px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(1px) saturate(126%)', WebkitBackdropFilter: 'blur(1px) saturate(126%)', border: '1px solid rgba(255,255,255,0.11)', animation: 'fadeInUp 0.4s ease-out', maxWidth: '280px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: correct ? '#34d399' : '#f87171', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{'\ud83d\udd2e'} {correct ? 'Correct' : 'Missed'}</span>
            <button onClick={function () { playClick(); if (foresightPeeking) { setEmbedUrl(foresightPeekUrl); setForesightPeeking(false); setForesightPeekUrl(null) }; setForesightVisible(false); var ids = foresightResults.map(function (r: any) { return r.id }); fetch('/api/foresight', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, result_ids: ids }) }).catch(function () {}) }} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A8B2BD', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>{'\u00d7'}</button>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e0e4e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#e0e4e8', fontWeight: 600, marginBottom: '4px' }}>You: <span style={{ fontWeight: 700 }}>{userLabel}</span> {'\u00b7'} Crowd: <span style={{ fontWeight: 700 }}>{crowdLabel}</span> ({Math.round(fr.consensus_percentage)}%)</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: correct ? '#34d399' : '#f87171', marginBottom: '8px' }}>{fr.points_awarded > 0 ? '+' : ''}{fr.points_awarded} Foresight{correct ? <span style={{ color: '#d4af37', marginLeft: '8px' }}>+3 Gold</span> : ''}</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {fr.url_info && !foresightPeeking && (<button onClick={function () { playClick(); setForesightPeekUrl(embedUrl); setForesightPeeking(true); setEmbedUrl(fr.url_info.url) }} onMouseOver={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }} onMouseOut={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View</button>)}
            {foresightPeeking && (<button onClick={function () { playClick(); setEmbedUrl(foresightPeekUrl); setForesightPeeking(false); setForesightPeekUrl(null) }} onMouseOver={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }} onMouseOut={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>Back</button>)}
            {foresightIdx > 0 && (<button onClick={function () { setForesightIdx(function (i) { return i - 1 }) }} onMouseOver={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }} onMouseOut={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>Back</button>)}
            {foresightIdx < foresightResults.length - 1 && (<button onClick={function () { var current = foresightResults[foresightIdx]; if (current) { fetch('/api/foresight', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, result_ids: [current.id] }) }).catch(function () {}) }; setForesightIdx(function (i) { return i + 1 }) }} onMouseOver={function (e) { (e.currentTarget as HTMLElement).style.background = correct ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.12)' }} onMouseOut={function (e) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid ' + (correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.15)'), color: correct ? '#34d399' : '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>Next</button>)}
            {foresightResults.length > 1 && <span style={{ fontSize: '10px', color: '#565F67', fontWeight: 600, marginLeft: 'auto' }}>{foresightIdx + 1}/{foresightResults.length}</span>}
          </div>
        </div>) }())}
        {pointPopups.map(function (p) { return (<div key={p.id} style={{ fontSize: '11px', fontWeight: 600, color: PLAT, padding: '3px 12px', borderRadius: '8px', background: 'rgba(14,17,24,0.85)', border: '1px solid rgba(168,178,189,0.25)', animation: 'fadeInUp 0.3s ease-out, fadeOut 0.5s ease-in 1.2s forwards', whiteSpace: 'nowrap', textShadow: TXT_LIGHT, backdropFilter: 'blur(8px) saturate(180%)', WebkitBackdropFilter: 'blur(8px) saturate(180%)' }}>+{p.amount} Spark{p.bonus && <span style={{ color: '#828D98', marginLeft: '3px' }}>{p.bonus}</span>}</div>) })}
      </div>
      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: hasActivated && currentUrl ? 'flex' : 'none', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/notifications" icon={<IconBell color={iconColor} badge={unreadNotifCount} />} />
        {showLibNav && <NavBtn href="/library" icon={<IconLibrary color={iconColor} />} />}
        <NavBtn href="/profile" icon={<IconProfile color={iconColor} />} />
        <NavBtn href="/vault" icon={<IconVault color={iconColor} />} />
      </div>
      <div ref={widgetRef} style={wStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'min(260px, calc(100vw - 32px))' }}>
          <div key={showUrlInfo ? cardKey : 'empty'} style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderRadius: GLASS_RADIUS, border: GLASS_BORDER, overflow: 'hidden', width: '100%', boxSizing: 'border-box', boxShadow: GLASS_SHADOW, position: 'relative', animation: showUrlInfo ? 'cardReveal 0.3s ease-out' : 'none' }}>
            {goldShimmer && (<div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden', borderRadius: GLASS_RADIUS, animation: 'goldWavePulse 1.2s ease-out forwards' }}><div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.15), rgba(212,175,55,0.06), transparent 70%)' }} /><div style={{ position: 'absolute', top: 0, left: 0, width: '80%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), rgba(255,255,255,0.12), rgba(212,175,55,0.18), transparent)', animation: 'goldShimmerSweep 0.9s ease-out forwards' }} /></div>)}
            {skinEffectOpacity > 0 && (<div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: GLASS_RADIUS }}><CardSkinEffects skinId={diceSkin as any} opacity={skinEffectOpacity} /></div>)}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px', cursor: 'grab', touchAction: 'none', position: 'relative', zIndex: 1 }} onMouseDown={function (e) { e.preventDefault(); onDragStart(e.clientX, e.clientY) }} onTouchStart={function (e) { onDragStart(e.touches[0].clientX, e.touches[0].clientY) }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.25)' }} /></div>
            {showUrlInfo && !isSpotlight && (<button onClick={handleGoldIconTap} onMouseEnter={function () { setGoldIconHovered(true) }} onMouseLeave={function () { setGoldIconHovered(false) }} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}><img src="/emoji/Coin.png" alt="Gold" style={{ width: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px', height: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px', opacity: isCardTakeover ? 1 : goldIconHovered ? 0.8 : 0.4, transition: 'all 0.15s ease', animation: goldShimmer ? 'goldIconPop 0.5s ease-out' : 'none', pointerEvents: 'none' }} /></button>)}
            {showUrlInfo && !isSpotlight && (<button onClick={function () { if (!wasDragged()) handleReportDead() }} onMouseEnter={function () { setSkullHovered(true) }} onMouseLeave={function () { setSkullHovered(false) }} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: reportedDead ? 'rgba(248,113,113,0.15)' : 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s ease', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}><img src="/emoji/Skull.png" alt="Report dead" style={{ width: reportedDead ? '22px' : skullHovered ? '20px' : '16px', height: reportedDead ? '22px' : skullHovered ? '20px' : '16px', opacity: deadChecking ? 0.3 : reportedDead ? 1 : skullHovered ? 0.8 : 0.4, transition: 'all 0.15s ease', animation: deadChecking ? 'skullPulse 0.5s ease-in-out infinite' : reportedDead ? 'skullPulse 1.5s ease-in-out infinite' : 'none', pointerEvents: 'none' }} /></button>)}
            {showUrlInfo ? (
              <div style={{ padding: '6px 14px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, minHeight: '48px' }}>
                {isSpotlight && (<div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', marginBottom: '4px', pointerEvents: 'none' as const }}><span style={{ fontSize: '10px' }}>{'\u2728'}</span><span style={{ fontSize: '9px', fontWeight: 700, color: '#d4af37', letterSpacing: '1px', textTransform: 'uppercase' }}>Spotlight</span></div>)}
                {currentUrl!.category && !isSpotlight && (<div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)', color: '#ffffff', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' as const, textShadow: TXT_MED }}>{currentUrl!.category}</div>)}
                {isCardTakeover ? (
                  <div style={{ animation: 'cardTakeoverAnim 2.2s ease-out forwards', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '17px', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', whiteSpace: 'nowrap', textShadow: TXT_HEAVY }}>
                    {cardTakeover!.type === 'gold_earned' ? (
                      <><img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /> <span style={{ color: '#d4af37' }}><GoldTickUp from={(cardTakeover as any).fromGold} to={(cardTakeover as any).toGold} /></span></>
                    ) : (
                      <><img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /> <span style={{ color: '#d4af37' }}>{goldBalance}</span> <span style={{ color: '#565F67', margin: '0 2px' }}>{'\u00b7'}</span> <span style={{ color: PLAT }}>{'\u26a1'} {totalPoints.toLocaleString()}</span></>
                    )}
                  </div>
                ) : (
                  <a href={currentUrl!.url} target="_blank" rel="noopener noreferrer" onClick={function (e) { if (wasDragged()) { e.preventDefault(); movedRef.current = false } }} style={{ display: 'block', fontSize: '17px', fontWeight: 700, lineHeight: 1.3, color: isSpotlight ? '#1a1a2e' : '#ffffff', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: isSpotlight ? 'none' : TXT_HEAVY, textDecoration: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: '0', touchAction: 'manipulation', letterSpacing: '-0.3px', width: '100%' }}>{getDisplayTitle(currentUrl!)}</a>
                )}
              </div>
            ) : (
              <div style={{ padding: '0 14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50px', position: 'relative', zIndex: 1 }}>
                {!cardRevealed && hasActivated ? (<div style={{ minHeight: '30px' }} />) : (<p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11.3px', margin: '0', fontWeight: 400, textShadow: TXT_LIGHT }}>Press Chance to discover</p>)}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '2px 8px 8px', height: '46px', position: 'relative', zIndex: 1 }}>
              {REACTIONS.map(function (r) {
                var isActive = userReaction === r.type; var isHovered = hoveredEmoji === r.type; var dimmed = !!(showUrlInfo && userReaction && !isActive); var size = isActive ? 48 : isHovered ? 34 : 28
                return (<button key={r.type} onClick={function () { if (showUrlInfo) handleReaction(r.type) }} onMouseEnter={function () { setHoveredEmoji(r.type) }} onMouseLeave={function () { setHoveredEmoji(null) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '46px', border: 'none', background: 'transparent', cursor: showUrlInfo ? 'pointer' : 'default', opacity: dimmed ? 0.2 : 1, transition: 'opacity 0.15s ease', outline: 'none', WebkitTapHighlightColor: 'transparent', padding: '0', touchAction: 'manipulation' }}><img src={(SKIN_EMOJIS[diceSkin] || SKIN_EMOJIS.ivory)[r.slot as keyof typeof SKIN_EMOJIS['ivory']]} alt={r.label} style={{ width: size + 'px', height: size + 'px', transition: 'width 0.12s cubic-bezier(0.34,1.56,0.64,1), height 0.12s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents: 'none', animation: isActive ? 'emojiPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} /></button>)
              })}
            </div>
            {isSpotlight && showUrlInfo && !userReaction && (<div style={{ textAlign: 'center', fontSize: '11px', color: '#d4af37', fontWeight: 700, padding: '2px 0 6px', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><img src="/emoji/Coin.png" alt="" style={{ width: '12px', height: '12px' }} />+{spotlightBonusSpark} bonus Spark for rating</div>)}
            {actionsVisible && showUrlInfo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 10px', animation: isCardTakeover ? 'none' : 'slideDown 0.25s ease-out', overflow: 'hidden', position: 'relative', zIndex: 1, opacity: isCardTakeover ? 0 : 1, pointerEvents: isCardTakeover ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}>
                {[{ label: saved ? '\u2713 Saved' : 'Save', fn: handleSave, active: saved }, { label: shared ? '\u2713 Shared' : 'Share', fn: handleShare, active: shared }].map(function (b, i) {
                  var isHov = hoveredAction === i
                  return (<button key={i} onClick={function () { b.fn() }} onMouseEnter={function () { setHoveredAction(i) }} onMouseLeave={function () { setHoveredAction(null) }} style={{ padding: '5px 0', borderRadius: '8px', border: '1px solid ' + (b.active ? 'rgba(168,178,189,0.4)' : isHov ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'), background: b.active ? 'rgba(168,178,189,0.12)' : isHov ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)', color: b.active ? PLAT : '#ffffff', cursor: 'pointer', fontSize: '11px', fontFamily: FONT, fontWeight: 500, outline: 'none', width: '90px', textAlign: 'center', transition: 'all 0.15s ease', touchAction: 'manipulation', textShadow: TXT_MED }}>{b.label}</button>)
                })}
              </div>
            )}
          </div>
          <div style={{ padding: '10px 0 0' }}>
            <button onClick={handleChancePress} disabled={showDice} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setChanceBtnHovered(true) }} onPointerLeave={function () { setChanceBtnHovered(false) }} style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: showDice ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: btnPressed ? 'scale(0.92)' : chanceActive ? 'scale(1.1)' : 'scale(1)', opacity: showDice ? 0.5 : 1 }}>
              <div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: chanceActive ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: chanceBtnHovered ? 'navRingRotate 3s linear infinite' : 'none', filter: btnPressed ? 'brightness(1.3)' : 'none' }} />
              <div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: CHANCE_BTN_GRADIENT, zIndex: 1 }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: CHANCE_BTN_BORDER, opacity: chanceActive ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} />
              <img src="/logo-c.png" alt="Chance" style={{ position: 'relative', zIndex: 3, width: '30px', height: '30px', objectFit: 'contain', pointerEvents: 'none' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
