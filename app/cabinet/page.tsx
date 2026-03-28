'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase, getEffectiveUserId, getAuthUser } from '@/lib/supabase'
import CardSkinEffects from '@/components/CardSkinEffects'

const CabinetDicePreview = dynamic(() => import('@/components/CabinetDicePreview'), { ssr: false })

// ── Types ─────────────────────────────────────────────
type SkinId = 'ivory' | 'midnight' | 'ember' | 'portal' | 'hologram' | 'matrix' | 'celestial'

type SkinConfig = {
  id: SkinId
  name: string
  tier: 'default' | 'common' | 'rare' | 'epic' | 'legendary'
  rollsRequired: number
  goldPrice: number
  color: string
  borderColor: string
  glowColor: string
  diceGradient: string
  diceShadow: string
  emojiPaths: { positive: string; neutral: string; negative: string }
  frameName: string
}

const TIER_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  default:   { label: 'Default',   color: '#a8b2bd', bg: 'rgba(168,178,189,0.08)' },
  common:    { label: 'Common',    color: '#8b8b8b', bg: 'rgba(139,139,139,0.08)' },
  rare:      { label: 'Rare',      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  epic:      { label: 'Epic',      color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  legendary: { label: 'Legendary', color: '#d4af37', bg: 'rgba(212,175,55,0.08)' },
}

const SKINS: SkinConfig[] = [
  {
    id: 'ivory', name: 'Ivory',
    tier: 'default', rollsRequired: 0, goldPrice: 0,
    color: '#a8b2bd', borderColor: 'rgba(255,255,255,0.18)', glowColor: 'rgba(255,255,255,0.06)',
    diceGradient: 'linear-gradient(135deg, #F5F0E8, #e0d8c8)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4)',
    emojiPaths: {
      positive: '/emoji/Exploding_Head.png',
      neutral: '/emoji/Thinking_Face.png',
      negative: '/emoji/Yawning_Face.png',
    },
    frameName: 'Standard ring',
  },
  {
    id: 'midnight', name: 'Midnight',
    tier: 'common', rollsRequired: 100, goldPrice: 100,
    color: '#5588cc', borderColor: 'rgba(85,136,204,0.22)', glowColor: 'rgba(85,136,204,0.12)',
    diceGradient: 'linear-gradient(135deg, #0a0e2a, #1a2555)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(85,136,204,0.3)',
    emojiPaths: {
      positive: '/emoji/midnight/Glowing Star.png',
      neutral: '/emoji/midnight/Last Quarter Moon Face.png',
      negative: '/emoji/midnight/Zzz.png',
    },
    frameName: 'Midnight glow',
  },
  {
    id: 'ember', name: 'Ember',
    tier: 'common', rollsRequired: 250, goldPrice: 250,
    color: '#ff6a00', borderColor: 'rgba(255,106,0,0.22)', glowColor: 'rgba(255,106,0,0.12)',
    diceGradient: 'linear-gradient(135deg, #2a1008, #4a1a08)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(255,106,0,0.35)',
    emojiPaths: {
      positive: '/emoji/ember/Fire.png',
      neutral: '/emoji/ember/Smiling Face with Sunglasses.png',
      negative: '/emoji/ember/Cold Face.png',
    },
    frameName: 'Ember ring',
  },
  {
    id: 'portal', name: 'Portal',
    tier: 'rare', rollsRequired: 500, goldPrice: 500,
    color: '#b388ff', borderColor: 'rgba(179,136,255,0.25)', glowColor: 'rgba(179,136,255,0.12)',
    diceGradient: 'linear-gradient(135deg, #0d0618, #1a0e30)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(179,136,255,0.3)',
    emojiPaths: {
      positive: '/emoji/portal/Alien.png',
      neutral: '/emoji/portal/Alien Monster.png',
      negative: '/emoji/portal/Ghost.png',
    },
    frameName: 'Vortex ring',
  },
  {
    id: 'hologram', name: 'Hologram',
    tier: 'epic', rollsRequired: 750, goldPrice: 1000,
    color: '#a78bfa', borderColor: 'rgba(167,139,250,0.22)', glowColor: 'rgba(167,139,250,0.12)',
    diceGradient: 'linear-gradient(135deg, #d0d0d0, #a0a0a0)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(167,139,250,0.25)',
    emojiPaths: {
      positive: '/emoji/hologram/Star-Struck.png',
      neutral: '/emoji/hologram/Mirror Ball.png',
      negative: '/emoji/hologram/Slightly Frowning Face.png',
    },
    frameName: 'Prismatic ring',
  },
  {
    id: 'matrix', name: 'Matrix',
    tier: 'legendary', rollsRequired: 1000, goldPrice: 1500,
    color: '#00ff41', borderColor: 'rgba(0,255,65,0.15)', glowColor: 'rgba(0,255,65,0.1)',
    diceGradient: 'linear-gradient(135deg, #050505, #0a0a0a)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,65,0.25)',
    emojiPaths: {
      positive: '/emoji/matrix/Robot.png',
      neutral: '/emoji/matrix/Gear.png',
      negative: '/emoji/matrix/X-Ray.png',
    },
    frameName: 'Code ring',
  },
  {
    id: 'celestial', name: 'Celestial',
    tier: 'legendary', rollsRequired: 1500, goldPrice: 1500,
    color: '#d4af37', borderColor: 'rgba(212,175,55,0.2)', glowColor: 'rgba(212,175,55,0.1)',
    diceGradient: 'linear-gradient(135deg, #08061a, #120e2a)',
    diceShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.25)',
    emojiPaths: {
      positive: '/emoji/celestial/Ringed Planet.png',
      neutral: '/emoji/celestial/Compass.png',
      negative: '/emoji/celestial/Sleeping Face.png',
    },
    frameName: 'Constellation ring',
  },
]

// ── Rank config ───────────────────────────────────────
const RANKS = [
  { name: 'Newcomer', file: '/emoji/ranks/Four Leaf Clover.png', points: 0 },
  { name: 'Explorer', file: '/emoji/ranks/Globe Showing Americas.png', points: 200 },
  { name: 'Pioneer',  file: '/emoji/ranks/High Voltage.png', points: 1000 },
  { name: 'Curator',  file: '/emoji/ranks/Gem Stone.png', points: 5000 },
  { name: 'Visionary', file: '/emoji/ranks/Eye.png', points: 15000 },
  { name: 'Legend',    file: '/emoji/ranks/Star.png', points: 25000 },
]

// ── Emoji button — EXACT feed behaviour ──
function EmojiButton({ src }: { src: string }) {
  var [active, setActive] = useState(false)
  var [hovered, setHovered] = useState(false)
  var size = active ? 48 : hovered ? 34 : 28
  return (
    <button
      onClick={function () { setActive(function (a) { return !a }); try { var snd = new Audio('/pop.mp3'); snd.volume = 0.7; snd.play().catch(function () {}) } catch (e) {} }}
      onMouseEnter={function () { setHovered(true) }}
      onMouseLeave={function () { setHovered(false) }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 60, height: 46, border: 'none', background: 'transparent',
        cursor: 'pointer', outline: 'none', padding: 0,
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          width: size, height: size,
          transition: 'width 0.12s cubic-bezier(0.34,1.56,0.64,1), height 0.12s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
          animation: active ? 'emojiPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
        }}
      />
    </button>
  )
}

// ── Nav — C button + Profile + Vault (no tooltips) ──
var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'
function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) {
  var [hovered, setHovered] = useState(false)
  var [pressed, setPressed] = useState(false)
  var active = hovered || pressed
  function doPress() { setPressed(true); setTimeout(function () { setPressed(false) }, 150) }
  var s: React.CSSProperties = { position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' }
  return (<a href={href} style={s} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>)
}
function IconVault({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>) }
function IconProfile({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>) }

export default function CabinetPage() {
  const [totalRolls, setTotalRolls] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [goldCoins, setGoldCoins] = useState(0)
  const [equippedSkin, setEquippedSkin] = useState<SkinId>('ivory')
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState<any>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [cBtnHovered, setCBtnHovered] = useState(false)
  const [cBtnPressed, setCBtnPressed] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const currentRank = RANKS.reduce((r, rank) => totalPoints >= rank.points ? rank : r, RANKS[0])

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = localStorage.getItem('chance_dice_skin')
        if (stored && SKINS.find(s => s.id === stored)) {
          setEquippedSkin(stored as SkinId)
        }
        const user = await getAuthUser()
        setAuthUser(user)
        const userId = await getEffectiveUserId()
        if (userId) {
          const { data } = await supabase
            .from('user_stats')
            .select('total_rolls, total_points, gold_coins')
            .eq('session_id', userId)
            .single()
          if (data) {
            setTotalRolls(data.total_rolls || 0)
            setTotalPoints(data.total_points || 0)
            setGoldCoins(data.gold_coins || 0)
          }
        }
      } catch (e) {
        console.error('Cabinet load error:', e)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleEquip = (skinId: SkinId) => {
    localStorage.setItem('chance_dice_skin', skinId)
    setEquippedSkin(skinId)
    try { var snd = new Audio('/sounds/equip.mp3'); snd.volume = 0.85; snd.play().catch(function () {}) } catch (e) {}
  }

  function handleStartRolling() {
    setCBtnPressed(true)
    try { var snd = new Audio('/sounds/click.mp3'); snd.volume = 0.7; snd.play().catch(function () {}) } catch (e) {}
    try {
      var ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      var buf = ctx.createBuffer(1, 1, 22050)
      var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0)
      var diceSound = new Audio('/sounds/dice-roll.mp3'); diceSound.volume = 0; diceSound.play().catch(function () {})
    } catch (e) {}
    setTimeout(function () { setCBtnPressed(false) }, 150)
    window.location.href = '/feed?first=1'
  }

  const isUnlocked = (skin: SkinConfig) => totalRolls >= skin.rollsRequired
  const unlockedCount = SKINS.filter(s => isUnlocked(s)).length
  const cActive = cBtnHovered || cBtnPressed

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-chance-text-muted text-sm animate-pulse">Loading collection...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-outfit py-8 px-4">
      <style>{`
        @keyframes emojiPop { 0% { transform: scale(1); } 25% { transform: scale(1.8); } 50% { transform: scale(0.85); } 75% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes navRingRotate { to { transform: rotate(360deg); } }
        @keyframes ringRotate { to { transform: rotate(360deg); } }
      `}</style>

      {/* Nav — CABINET PAGE: C button + Profile + Vault (no tooltips) */}
      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/feed" icon={<img src="/logo-c.png" alt="Roll" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.85 }} />} />
        <NavBtn href="/profile" icon={<IconProfile color="#A8B2BD" />} />
        <NavBtn href="/vault" icon={<IconVault color="#A8B2BD" />} />
      </div>
      <div className="max-w-[560px] mx-auto">

        {/* ── Header ──────────────────────────────────── */}
        <div className="text-center mb-10" style={{ paddingTop: '36px' }}>
          <img src="/logo-c.png" alt="Chance" style={{ width: '56px', height: '56px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '5px', textTransform: 'uppercase', color: '#A8B2BD', marginBottom: '0' }}>The Cabinet</div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="glass-elevated rounded-xl flex items-center px-4 py-4 mb-8">
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Rolls</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e0e4e8' }}>{totalRolls.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Gold</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#d4af37' }}>{goldCoins.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Unlocked</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e0e4e8' }}>{unlockedCount} / 7</div>
          </div>
        </div>

        {/* ── Section Header ──────────────────────────── */}
        <div className="flex items-center gap-2 mb-7">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
          <span className="text-[10px] font-bold tracking-[2px] uppercase text-chance-text-muted">Dice Skins</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
        </div>

        {/* ── Skin Cards ──────────────────────────────── */}
        {SKINS.map((skin) => {
          const unlocked = isUnlocked(skin)
          const equipped = equippedSkin === skin.id
          const tier = TIER_COLORS[skin.tier]
          const rollsToGo = Math.max(0, skin.rollsRequired - totalRolls)
          const progress = skin.rollsRequired > 0 ? Math.min((totalRolls / skin.rollsRequired) * 100, 100) : 100

          return (
            <div
              key={skin.id}
              className="mb-7 animate-fade-in"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(1px) saturate(126%)',
                border: `3px solid ${equipped ? 'rgba(255,255,255,0.25)' : skin.borderColor}`,
                boxShadow: `0 0 28px ${skin.glowColor}`,
                borderRadius: '18px',
                overflow: 'hidden',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = skin.color + '60' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = equipped ? 'rgba(255,255,255,0.25)' : skin.borderColor }}
            >
              {(equipped || skin.tier === 'legendary') && (
                <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${skin.color}40, transparent)` }} />
              )}

              <div style={{ padding: '16px 16px 12px' }}>
                {/* Header: Name (left) — Tier (centre) — Status (right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: '#e0e4e8', letterSpacing: '-0.3px', flex: '1' }}>{skin.name}</span>
                  <span
                    style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}30`, lineHeight: 1, textAlign: 'center' }}
                  >
                    {tier.label}
                  </span>
                  <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end' }}>
                    {unlocked && equipped ? (
                      <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: `${skin.color}15`, border: `1px solid ${skin.color}30`, color: skin.color, lineHeight: 1 }}>
                        Equipped
                      </span>
                    ) : unlocked ? (
                      <button
                        onClick={() => handleEquip(skin.id)}
                        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37', outline: 'none', lineHeight: 1 }}
                      >
                        Equip
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 500, color: tier.color, opacity: 0.8 }}>
                        {rollsToGo.toLocaleString()} rolls to go
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Layout: stacked on mobile, side by side on desktop ── */}
                <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', alignItems: 'center', gap: isDesktop ? '16px' : '6px', justifyContent: 'center' }}>
                  {/* Dice preview */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}>
                    <CabinetDicePreview skinId={skin.id} width={isDesktop ? 240 : 500} height={isDesktop ? 200 : 260} />
                  </div>

                  {/* Card preview — 260px matches feed widget */}
                  <div
                    style={{
                      background: '#0a0b10',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      position: 'relative',
                      width: '260px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden', borderRadius: '20px' }}>
                      <CardSkinEffects skinId={skin.id} />
                    </div>

                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
                        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.25)' }} />
                      </div>

                      <div style={{ height: '50px' }} />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '2px 8px', height: '46px' }}>
                        {(['negative', 'neutral', 'positive'] as const).map((type) => (
                          <EmojiButton key={type} src={skin.emojiPaths[type]} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#717B85' }}>Profile frame</div>
                  <div
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      border: `2.5px solid ${skin.color}60`,
                      boxShadow: skin.id !== 'ivory' ? `0 0 10px ${skin.color}30` : 'none',
                    }}
                  >
                    <img src={currentRank.file} alt="" style={{ width: '18px', height: '18px' }} draggable={false} />
                  </div>
                  <div style={{ fontSize: '10px', color: `${skin.color}90` }}>{skin.frameName}</div>
                </div>

                {!unlocked && skin.rollsRequired > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${skin.color}10` }}>
                    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: `${skin.color}12` }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${tier.color}, ${tier.color}80)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-chance-text-muted">
                        {totalRolls.toLocaleString()} / {skin.rollsRequired.toLocaleString()} rolls
                      </span>
                      {skin.goldPrice > 0 && (
                        <span className="text-[9px] text-chance-text-muted">or 🪙 {skin.goldPrice.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── C Button — 80px ── */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px', paddingBottom: '20px' }}>
          <button
            onClick={handleStartRolling}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setCBtnHovered(true) }}
            onPointerLeave={() => setCBtnHovered(false)}
            style={{
              position: 'relative', width: '80px', height: '80px', borderRadius: '50%',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', padding: 0, outline: 'none',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
              transform: cBtnPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, opacity: cActive ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: cActive ? 'ringRotate 3s linear infinite' : 'none', filter: cBtnPressed ? 'brightness(1.3)' : 'none' }} />
            <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14, 17, 24, 0.97), rgba(22, 28, 38, 0.95))', zIndex: 1 }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130, 141, 152, 0.22)', opacity: cActive ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} />
            <img src="/logo-c.png" alt="Roll" style={{ position: 'relative', zIndex: 3, width: '44px', height: '44px', objectFit: 'contain', pointerEvents: 'none' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
