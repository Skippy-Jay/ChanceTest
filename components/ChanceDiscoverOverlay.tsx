'use client'
/**
 * ChanceDiscoverOverlay
 * The floating card widget extracted from feed page.tsx (v40.7).
 * Contains: drag handle, gold icon, skull report, category pill, URL title / card-takeover,
 * emoji reactions, and Save/Share action buttons.
 * All state lives in page.tsx — this component is purely presentational.
 */

import { MutableRefObject } from 'react'
import CardSkinEffects from '@/components/CardSkinEffects'
import GoldTickUp from '@/components/GoldTickUp'

type UrlItem = { id: number; url: string; domain: string | null; title: string | null; description: string | null; category: string | null; embed_status: string | null }
type CardTakeover = { type: 'gold_earned'; fromGold: number; toGold: number } | { type: 'gold_stats' } | null

var GLASS_BG = 'rgba(255,255,255,0.08)'
var GLASS_BLUR = 'blur(1px) saturate(126%)'
var GLASS_BORDER = '1px solid rgba(255,255,255,0.11)'
var GLASS_SHADOW = '0 8px 32px rgba(0,0,0,0.12)'
var GLASS_RADIUS = '20px'
var TXT_HEAVY = '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,1)'
var TXT_MED = '0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'
var TXT_LIGHT = '0 1px 3px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.3)'
var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"

var REACTIONS = [
  { type: 'yawn', label: 'Yawn', img: '/emoji/Yawning_Face.png', slot: 'negative' },
  { type: 'neutral', label: 'Neutral', img: '/emoji/Unamused_Face.png', slot: 'neutral' },
  { type: 'mindblown', label: 'Mindblown', img: '/emoji/Exploding_Head.png', slot: 'positive' },
] as const

var SKIN_EMOJIS: Record<string, { positive: string; neutral: string; negative: string }> = {
  ivory: { positive: '/emoji/Exploding_Head.png', neutral: '/emoji/Unamused_Face.png', negative: '/emoji/Yawning_Face.png' },
  midnight: { positive: '/emoji/midnight/Glowing Star.png', neutral: '/emoji/midnight/Last Quarter Moon Face.png', negative: '/emoji/midnight/Zzz.png' },
  ember: { positive: '/emoji/ember/Fire.png', neutral: '/emoji/ember/Smiling Face with Sunglasses.png', negative: '/emoji/ember/Cold Face.png' },
  portal: { positive: '/emoji/portal/Alien.png', neutral: '/emoji/portal/Alien Monster.png', negative: '/emoji/portal/Ghost.png' },
  hologram: { positive: '/emoji/hologram/Star-Struck.png', neutral: '/emoji/hologram/Mirror Ball.png', negative: '/emoji/hologram/Slightly Frowning Face.png' },
  matrix: { positive: '/emoji/matrix/Robot.png', neutral: '/emoji/matrix/Gear.png', negative: '/emoji/matrix/X-Ray.png' },
  celestial: { positive: '/emoji/celestial/Ringed Planet.png', neutral: '/emoji/celestial/Compass.png', negative: '/emoji/celestial/Sleeping Face.png' },
}

function getDisplayTitle(item: UrlItem): string {
  if (item.title && item.title.trim()) return item.title.trim()
  try { return new URL(item.url).hostname.replace('www.', '') } catch { return item.url }
}

interface ChanceDiscoverOverlayProps {
  cardKey: number | string
  showUrlInfo: boolean
  currentUrl: UrlItem | null
  cardRevealed: boolean
  hasActivated: boolean
  isCardTakeover: boolean
  cardTakeover: CardTakeover
  goldBalance: number
  totalPoints: number
  goldShimmer: boolean
  goldIconHovered: boolean
  reportedDead: boolean
  skullHovered: boolean
  userReaction: string | null
  hoveredEmoji: string | null
  actionsVisible: boolean
  saved: boolean
  shared: boolean
  hoveredAction: number | null
  diceSkin: string
  skinEffectOpacity: number
  movedRef: MutableRefObject<boolean>
  wasDragged: () => boolean
  onDragStart: (x: number, y: number) => void
  onGoldIconTap: () => void
  onGoldIconHoverEnter: () => void
  onGoldIconHoverLeave: () => void
  onReportDead: () => void
  onSkullHoverEnter: () => void
  onSkullHoverLeave: () => void
  onReaction: (type: string) => void
  onEmojiHoverEnter: (type: string) => void
  onEmojiHoverLeave: () => void
  onSave: () => void
  onShare: () => void
  onActionHoverEnter: (i: number) => void
  onActionHoverLeave: () => void
}

export default function ChanceDiscoverOverlay({
  cardKey, showUrlInfo, currentUrl, cardRevealed, hasActivated,
  isCardTakeover, cardTakeover, goldBalance, totalPoints, goldShimmer, goldIconHovered,
  reportedDead, skullHovered, userReaction, hoveredEmoji, actionsVisible,
  saved, shared, hoveredAction, diceSkin, skinEffectOpacity,
  movedRef, wasDragged, onDragStart,
  onGoldIconTap, onGoldIconHoverEnter, onGoldIconHoverLeave,
  onReportDead, onSkullHoverEnter, onSkullHoverLeave,
  onReaction, onEmojiHoverEnter, onEmojiHoverLeave,
  onSave, onShare, onActionHoverEnter, onActionHoverLeave,
}: ChanceDiscoverOverlayProps) {
  var actionBtns = [
    { label: saved ? '\u2713 Saved' : 'Save', fn: onSave, active: saved, color: '#34d399' },
    { label: shared ? '\u2713 Shared' : 'Share', fn: onShare, active: shared, color: '#60a5fa' },
  ]

  return (
    <div
      key={showUrlInfo ? cardKey : 'empty'}
      style={{
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: GLASS_RADIUS,
        border: GLASS_BORDER,
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: GLASS_SHADOW,
        position: 'relative',
        animation: showUrlInfo ? 'cardReveal 0.3s ease-out' : 'none',
      }}
    >
      {/* Gold shimmer sweep */}
      {goldShimmer && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden', borderRadius: GLASS_RADIUS }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), rgba(212,175,55,0.2), rgba(212,175,55,0.12), transparent)', animation: 'goldShimmerSweep 0.8s ease-out forwards' }} />
        </div>
      )}

      {/* Skin effect layer */}
      {skinEffectOpacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: GLASS_RADIUS }}>
          <CardSkinEffects skinId={diceSkin as any} opacity={skinEffectOpacity} />
        </div>
      )}

      {/* Drag handle */}
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px', cursor: 'grab', touchAction: 'none', position: 'relative', zIndex: 1 }}
        onMouseDown={function (e) { e.preventDefault(); onDragStart(e.clientX, e.clientY) }}
        onTouchStart={function (e) { onDragStart(e.touches[0].clientX, e.touches[0].clientY) }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.25)' }} />
      </div>

      {/* Gold coin icon */}
      {showUrlInfo && (
        <button
          onClick={onGoldIconTap}
          onMouseEnter={onGoldIconHoverEnter}
          onMouseLeave={onGoldIconHoverLeave}
          style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <img
            src="/emoji/Coin.png"
            alt="Gold"
            style={{
              width: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px',
              height: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px',
              opacity: isCardTakeover ? 1 : goldIconHovered ? 0.8 : 0.4,
              transition: 'all 0.15s ease',
              animation: goldShimmer ? 'goldIconPop 0.5s ease-out' : 'none',
              pointerEvents: 'none',
            }}
          />
        </button>
      )}

      {/* Skull / dead report icon */}
      {showUrlInfo && (
        <button
          onClick={function () { if (!wasDragged()) onReportDead() }}
          onMouseEnter={onSkullHoverEnter}
          onMouseLeave={onSkullHoverLeave}
          style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: reportedDead ? 'rgba(248,113,113,0.15)' : 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s ease', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <img
            src="/emoji/Skull.png"
            alt="Report dead"
            style={{
              width: reportedDead ? '22px' : skullHovered ? '20px' : '16px',
              height: reportedDead ? '22px' : skullHovered ? '20px' : '16px',
              opacity: reportedDead ? 1 : skullHovered ? 0.8 : 0.4,
              transition: 'all 0.15s ease',
              animation: reportedDead ? 'skullPulse 1.5s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }}
          />
        </button>
      )}

      {/* Main content area */}
      {showUrlInfo ? (
        <div style={{ padding: '6px 14px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, minHeight: '48px' }}>
          {currentUrl!.category && (
            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)', color: '#ffffff', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', textShadow: TXT_MED }}>
              {currentUrl!.category}
            </div>
          )}
          {isCardTakeover ? (
            <div style={{ animation: 'cardTakeoverAnim 2.2s ease-out forwards', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '17px', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', whiteSpace: 'nowrap', textShadow: TXT_HEAVY }}>
              {cardTakeover!.type === 'gold_earned' ? (
                <>
                  <img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} />
                  <span style={{ color: '#d4af37' }}>
                    <GoldTickUp from={(cardTakeover as any).fromGold} to={(cardTakeover as any).toGold} />
                  </span>
                </>
              ) : (
                <>
                  <img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} />
                  <span style={{ color: '#d4af37' }}>{goldBalance}</span>
                  <span style={{ color: '#565F67', margin: '0 2px' }}>·</span>
                  <span style={{ color: '#34d399' }}>⚡ {totalPoints.toLocaleString()}</span>
                </>
              )}
            </div>
          ) : (
            <a
              href={currentUrl!.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={function (e) { if (wasDragged()) { e.preventDefault(); movedRef.current = false } }}
              style={{ display: 'block', fontSize: '17px', fontWeight: 700, lineHeight: 1.3, color: '#ffffff', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: TXT_HEAVY, textDecoration: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: '0', touchAction: 'manipulation', letterSpacing: '-0.3px', width: '100%' }}
            >
              {getDisplayTitle(currentUrl!)}
            </a>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50px', position: 'relative', zIndex: 1 }}>
          {!cardRevealed && hasActivated
            ? <div style={{ minHeight: '30px' }} />
            : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0', fontWeight: 400, textShadow: TXT_LIGHT }}>Press Chance to discover</p>
          }
        </div>
      )}

      {/* Emoji reaction buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '2px 8px 8px', height: '46px', position: 'relative', zIndex: 1 }}>
        {REACTIONS.map(function (r) {
          var isActive = userReaction === r.type
          var isHovered = hoveredEmoji === r.type
          var dimmed = !!(showUrlInfo && userReaction && !isActive)
          var size = isActive ? 48 : isHovered ? 34 : 28
          return (
            <button
              key={r.type}
              onClick={function () { if (showUrlInfo) onReaction(r.type) }}
              onMouseEnter={function () { onEmojiHoverEnter(r.type) }}
              onMouseLeave={onEmojiHoverLeave}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '46px', border: 'none', background: 'transparent', cursor: showUrlInfo ? 'pointer' : 'default', opacity: dimmed ? 0.2 : 1, transition: 'opacity 0.15s ease', outline: 'none', WebkitTapHighlightColor: 'transparent', padding: '0', touchAction: 'manipulation' }}
            >
              <img
                src={(SKIN_EMOJIS[diceSkin] || SKIN_EMOJIS.ivory)[r.slot as keyof typeof SKIN_EMOJIS['ivory']]}
                alt={r.label}
                style={{ width: size + 'px', height: size + 'px', transition: 'width 0.12s cubic-bezier(0.34,1.56,0.64,1), height 0.12s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents: 'none', animation: isActive ? 'emojiPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
              />
            </button>
          )
        })}
      </div>

      {/* Save / Share action buttons */}
      {actionsVisible && showUrlInfo && !isCardTakeover && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 10px', animation: 'slideDown 0.25s ease-out', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          {actionBtns.map(function (b, i) {
            var isHov = hoveredAction === i
            return (
              <button
                key={i}
                onClick={b.fn}
                onMouseEnter={function () { onActionHoverEnter(i) }}
                onMouseLeave={onActionHoverLeave}
                style={{ padding: '5px 0', borderRadius: '8px', border: '1px solid ' + (b.active ? b.color + '40' : isHov ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'), background: b.active ? b.color + '15' : isHov ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)', color: b.active ? b.color : '#ffffff', cursor: 'pointer', fontSize: '11px', fontFamily: FONT, fontWeight: 500, outline: 'none', width: '90px', textAlign: 'center', transition: 'all 0.15s ease', touchAction: 'manipulation', textShadow: TXT_MED }}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
