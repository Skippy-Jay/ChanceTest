'use client'
// app/profile/page.tsx — Chance Profile Page v22
// v22: Card preview exactly matches feed — GoldTickUp, goldShimmer overlay, goldIconPop, goldWavePulse, isCardTakeover, gold_earned type
// v18: Reorder sections — Foresight → Challenges → Submit → Report a Site → Log Out → C
//      New ReportSiteSection component (posts to /api/report-site)
// v17: Submit a Link section below Achievements — URL submissions with tier picker + duplicate check
// v16.8: Achievements after Library, streak bar, Comet, Full Library
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
var CabinetDicePreview = dynamic(function () { return import('@/components/CabinetDicePreview') }, { ssr: false })
import CardSkinEffects from '@/components/CardSkinEffects'
import { supabase, getEffectiveUserId, getAuthUser } from '@/lib/supabase'
var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'
var SKIN_ORDER = ['ivory', 'midnight', 'ember', 'portal', 'hologram', 'matrix', 'celestial'] as const
var SKIN_LABELS: Record<string, { name: string; color: string; tier: string; borderColor: string; glowColor: string; hoverGlowColor: string }> = {
  ivory: { name: 'Ivory', color: '#f5f0e8', tier: 'Default', borderColor: 'rgba(255,255,255,0.1)', glowColor: 'none', hoverGlowColor: 'none' },
  midnight: { name: 'Midnight', color: '#5588cc', tier: 'Common', borderColor: 'rgba(85,136,204,0.3)', glowColor: '0 0 15px rgba(85,136,204,0.08), 0 0 5px rgba(85,136,204,0.05)', hoverGlowColor: '0 0 30px rgba(85,136,204,0.25), 0 0 12px rgba(85,136,204,0.15)' },
  ember: { name: 'Ember', color: '#ff6a00', tier: 'Uncommon', borderColor: 'rgba(255,106,0,0.3)', glowColor: '0 0 15px rgba(255,106,0,0.08), 0 0 5px rgba(255,106,0,0.05)', hoverGlowColor: '0 0 30px rgba(255,106,0,0.25), 0 0 12px rgba(255,106,0,0.15)' },
  portal: { name: 'Portal', color: '#aa55ff', tier: 'Rare', borderColor: 'rgba(170,85,255,0.35)', glowColor: '0 0 18px rgba(170,85,255,0.1), 0 0 6px rgba(170,85,255,0.06)', hoverGlowColor: '0 0 35px rgba(170,85,255,0.3), 0 0 14px rgba(170,85,255,0.18)' },
  hologram: { name: 'Hologram', color: '#d8d8d8', tier: 'Epic', borderColor: 'rgba(167,139,250,0.3)', glowColor: '0 0 15px rgba(167,139,250,0.08), 0 0 5px rgba(167,139,250,0.05)', hoverGlowColor: '0 0 30px rgba(167,139,250,0.25), 0 0 12px rgba(167,139,250,0.15)' },
  matrix: { name: 'Matrix', color: '#00ff41', tier: 'Legendary', borderColor: 'rgba(0,255,65,0.2)', glowColor: '0 0 18px rgba(0,255,65,0.06), 0 0 6px rgba(0,255,65,0.04)', hoverGlowColor: '0 0 35px rgba(0,255,65,0.2), 0 0 14px rgba(0,255,65,0.12)' },
  celestial: { name: 'Celestial', color: '#d4af37', tier: 'Legendary', borderColor: 'rgba(212,175,55,0.3)', glowColor: '0 0 18px rgba(212,175,55,0.08), 0 0 6px rgba(212,175,55,0.05)', hoverGlowColor: '0 0 35px rgba(212,175,55,0.25), 0 0 14px rgba(212,175,55,0.15)' }
}
var SKIN_EMOJIS: Record<string, { positive: string; neutral: string; negative: string }> = { ivory: { positive: '/emoji/Exploding_Head.png', neutral: '/emoji/unamusedface.png', negative: '/emoji/Sleeping_Face.png' }, midnight: { positive: '/emoji/midnight/Glowing Star.png', neutral: '/emoji/midnight/Last Quarter Moon Face.png', negative: '/emoji/midnight/Zzz.png' }, ember: { positive: '/emoji/ember/Fire.png', neutral: '/emoji/ember/Smiling Face with Sunglasses.png', negative: '/emoji/ember/Cold Face.png' }, portal: { positive: '/emoji/portal/Alien.png', neutral: '/emoji/portal/Alien Monster.png', negative: '/emoji/portal/Ghost.png' }, hologram: { positive: '/emoji/hologram/Star-Struck.png', neutral: '/emoji/hologram/Mirror Ball.png', negative: '/emoji/hologram/Slightly Frowning Face.png' }, matrix: { positive: '/emoji/matrix/redpill.png', neutral: '/emoji/matrix/Gear.png', negative: '/emoji/matrix/bluepill.png' }, celestial: { positive: '/emoji/celestial/Ringed Planet.png', neutral: '/emoji/celestial/Compass.png', negative: '/emoji/celestial/Comet.png' } }
var SKIN_TIER_TYPE: Record<string, string> = { ivory: 'basic', midnight: 'basic', ember: 'basic', portal: 'toggle', hologram: 'toggle', matrix: 'slider', celestial: 'slider' }
var SKIN_MAX_CATS: Record<string, number> = { ivory: 3, midnight: 6, ember: 9, portal: 9, hologram: 999, matrix: 999, celestial: 999 }
var SKIN_PRICES: Record<string, number> = { ivory: 0, midnight: 100, ember: 250, portal: 500, hologram: 1000, matrix: 1500, celestial: 1500 }
var SKIN_BENEFITS: Record<string, string> = { ivory: '3 categories \u00b7 Embeddable sites', midnight: '+3 categories (total 6)', ember: '+3 categories (total 9) \u00b7 Library access', portal: 'Toggle categories \u00b7 Library categories', hologram: 'All categories \u00b7 Library search', matrix: 'Full curate \u00b7 Slider \u00b7 Epic+Legendary \u00b7 Unlimited vault \u00b7 Full Library', celestial: 'Full curate \u00b7 Slider \u00b7 Epic+Legendary \u00b7 Unlimited vault \u00b7 Full Library' }
var TIER_STYLE: Record<string, { bg: string; color: string; border: string }> = { Default: { bg: 'rgba(255,255,255,0.04)', color: '#565F67', border: 'rgba(255,255,255,0.06)' }, Common: { bg: 'rgba(130,141,152,0.08)', color: '#828D98', border: 'rgba(130,141,152,0.2)' }, Uncommon: { bg: 'rgba(52,211,153,0.08)', color: '#34d399', border: 'rgba(52,211,153,0.2)' }, Rare: { bg: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' }, Epic: { bg: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' }, Legendary: { bg: 'rgba(212,175,55,0.08)', color: '#d4af37', border: 'rgba(212,175,55,0.25)' } }
var BASE_CATEGORIES = ['ai','architecture','archives','art','astrology','business','career','community','creative-code','crypto','culture/history','data/research','design','diy/making','earth-science','education','fashion','film/animation','finance/money','food/drink','fun/weird','games','health/wellness','language','life-hacks','maps/geography','memes','music/audio','nature','news/journalism','outdoors','parenting','pets','philosophy','podcasts','pop/culture','privacy/security','rabbit-holes','reading/writing','relationships','retro/web','science','space','sports','tech','tools/utilities','transport','travel']
var preClick: HTMLAudioElement | null = null; var preEquip: HTMLAudioElement | null = null; var preDiceRoll: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7; preEquip = new Audio('/sounds/equip.mp3'); preEquip.preload = 'auto'; preEquip.volume = 0.85; preDiceRoll = new Audio('/sounds/dice-roll.mp3'); preDiceRoll.preload = 'auto'; preDiceRoll.volume = 0.8 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }
var preGoldCoin: HTMLAudioElement | null = null; var preSkullReport: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preGoldCoin = new Audio('/sounds/gold-coin.mp3'); preGoldCoin.preload = 'auto'; preGoldCoin.volume = 0.6; preSkullReport = new Audio('/sounds/skull-report.mp3'); preSkullReport.preload = 'auto'; preSkullReport.volume = 0.5 }
function playGoldCoin() { if (!preGoldCoin) return; try { var clone = preGoldCoin.cloneNode(true) as HTMLAudioElement; clone.volume = 0.6; clone.play().catch(function () {}) } catch (e) {} }
function playSkullReport() { if (!preSkullReport) return; try { var clone = preSkullReport.cloneNode(true) as HTMLAudioElement; clone.volume = 0.5; clone.play().catch(function () {}) } catch (e) {} }
function GoldTickUp({ from, to }: { from: number; to: number }) {
  var [display, setDisplay] = useState(from)
  useEffect(function () {
    var diff = to - from; if (diff <= 0) { setDisplay(to); return }
    var steps = Math.min(diff, 15); var step = 0; var interval = setInterval(function () { step++; var progress = step / steps; var eased = 1 - Math.pow(1 - progress, 3); setDisplay(Math.round(from + diff * eased)); if (step >= steps) { clearInterval(interval); setDisplay(to) } }, 60)
    return function () { clearInterval(interval) }
  }, [from, to])
  return <>{display}</>
}
function playEquip() { if (!preEquip) return; try { var clone = preEquip.cloneNode(true) as HTMLAudioElement; clone.volume = 0.85; clone.play().catch(function () {}) } catch (e) {} }
function playDiceRoll() { if (!preDiceRoll) return; try { var clone = preDiceRoll.cloneNode(true) as HTMLAudioElement; clone.volume = 0.8; clone.play().catch(function () {}) } catch (e) {} }
function EmojiButton({ src }: { src: string }) { var [active, setActive] = useState(false); var [hovered, setHovered] = useState(false); var size = active ? 48 : hovered ? 34 : 28; return (<button onClick={function () { setActive(function (a) { return !a }); try { var snd = new Audio('/pop.mp3'); snd.volume = 0.7; snd.play().catch(function () {}) } catch (e) {} }} onMouseEnter={function () { setHovered(true) }} onMouseLeave={function () { setHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 46, border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', padding: 0, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}><img src={src} alt="" draggable={false} style={{ width: size, height: size, transition: 'width 0.12s cubic-bezier(0.34,1.56,0.64,1), height 0.12s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents: 'none', animation: active ? 'emojiPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} /></button>) }
function formatCategory(cat: string): string { if (cat === 'ai') return 'AI'; if (cat === 'diy/making') return 'DIY / Making'; if (cat === 'snake-eyes') return 'Snake Eyes'; return cat.split(/[-/]/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1) }).join(' / ') }
function getRank(points: number): { name: string; next: number | null } { if (points >= 25000) return { name: 'Legend', next: null }; if (points >= 15000) return { name: 'Visionary', next: 25000 }; if (points >= 5000) return { name: 'Curator', next: 15000 }; if (points >= 1000) return { name: 'Pioneer', next: 5000 }; if (points >= 200) return { name: 'Explorer', next: 1000 }; return { name: 'Newcomer', next: 200 } }
function SectionDivider({ label }: { label: string }) { return (<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} /><span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#828D98' }}>{label}</span><div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} /></div>) }
function SkinPill({ skinId, name, color, unlocked, isActive, isPreviewing, onTap }: { skinId: string; name: string; color: string; unlocked: boolean; isActive: boolean; isPreviewing: boolean; onTap: (id: string) => void }) { var [hovered, setHovered] = useState(false); var highlighted = isActive || isPreviewing; var activeBg = skinId === 'ivory' ? 'rgba(245,240,232,0.1)' : color + '18'; var activeBorder = skinId === 'ivory' ? 'rgba(245,240,232,0.25)' : color + '55'; var previewBorder = color + '88'; return (<button onClick={function () { onTap(skinId) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }} style={{ padding: '8px 0', borderRadius: '10px', background: highlighted ? activeBg : hovered ? 'rgba(255,255,255,0.07)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: isPreviewing ? '2px solid ' + previewBorder : '1px solid ' + (isActive ? activeBorder : hovered ? 'rgba(255,255,255,0.14)' : unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'), color: highlighted ? color : unlocked ? '#828D98' : '#565F67', fontSize: '11px', fontWeight: highlighted ? 700 : 600, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', opacity: unlocked ? 1 : hovered ? 0.7 : 0.5 }}>{!unlocked && (<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>)}{name}</button>) }
function MysteryPill() { var [hovered, setHovered] = useState(false); return (<div onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }} style={{ padding: '8px 0', borderRadius: '10px', background: hovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)', border: '1px solid ' + (hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'), color: hovered ? '#565F67' : '#3D444A', fontSize: '12px', fontWeight: 700, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px', transition: 'all 0.2s ease', opacity: hovered ? 0.7 : 0.4, cursor: 'default' }}>???</div>) }
function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) { var [hovered, setHovered] = useState(false); var [pressed, setPressed] = useState(false); var active = hovered || pressed; function doPress() { playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) } return (<a href={href} style={{ position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' } as React.CSSProperties} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>) }
function IconVault({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>) }
function IconLibrary({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>) }
function IconBell({ color, badge }: { color: string; badge?: number }) { return (<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>{badge && badge > 0 ? <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', fontSize: '8px', fontWeight: 800, borderRadius: '7px', padding: '1px 4px', minWidth: '12px', textAlign: 'center' as const, lineHeight: '12px' }}>{badge > 9 ? '9+' : badge}</span> : null}</div>) }
function getDailyGoldBonus(streak: number): number { var s = Math.max(streak, 1); return Math.min(2 + Math.floor((s - 1) * 3 / 6), 5) }
var LIBRARY_SKINS = ['ember', 'portal', 'hologram', 'matrix', 'celestial']
function hasLibraryAccess(ownedSkins: string[]): boolean { return ownedSkins.some(function (s) { return LIBRARY_SKINS.includes(s) }) }

// ── Submit a Link Section ────────────────────────────────
var SUBMISSION_TIERS = [
  { key: 'regular', label: 'Regular', gold: 2, color: '#A8B2BD', desc: 'A cool website' },
  { key: 'snake-eyes', label: 'Snake Eyes', gold: 8, color: '#8B2D2D', desc: 'Ultra rare find' },
  { key: 'epic', label: 'Epic', gold: 5, color: '#a78bfa', desc: 'Truly impressive' },
  { key: 'legendary', label: 'Legendary', gold: 10, color: '#d4af37', desc: 'Jaw-dropping' },
] as const

function SubmitLinkSection({ sessionId }: { sessionId: string }) {
  var [submitUrl, setSubmitUrl] = useState('')
  var [selectedTier, setSelectedTier] = useState<string>('regular')
  var [submitting, setSubmitting] = useState(false)
  var [submitResult, setSubmitResult] = useState<any>(null)
  var [submitHovered, setSubmitHovered] = useState(false)
  var [recentSubs, setRecentSubs] = useState<any[]>([])
  var [showHistory, setShowHistory] = useState(false)
  var [historyHovered, setHistoryHovered] = useState(false)

  useEffect(function () {
    if (!sessionId) return
    fetch('/api/submissions?session_id=' + sessionId).then(function (r) { return r.json() }).then(function (d) {
      if (d.submissions) setRecentSubs(d.submissions)
    }).catch(function () {})
  }, [sessionId])

  async function handleSubmit() {
    if (!submitUrl.trim() || submitting || !sessionId) return
    playClick()
    setSubmitting(true)
    setSubmitResult(null)
    try {
      var res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, url: submitUrl.trim(), suggested_tier: selectedTier })
      })
      var data = await res.json()
      setSubmitResult(data)
      if (data.success) {
        setSubmitUrl('')
        setSelectedTier('regular')
        fetch('/api/submissions?session_id=' + sessionId).then(function (r) { return r.json() }).then(function (d) {
          if (d.submissions) setRecentSubs(d.submissions)
        }).catch(function () {})
      }
    } catch (e) {
      setSubmitResult({ error: 'Failed to submit. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  var tierInfo = SUBMISSION_TIERS.find(function (t) { return t.key === selectedTier }) || SUBMISSION_TIERS[0]
  var pendingCount = recentSubs.filter(function (s) { return s.status === 'pending' }).length
  var approvedCount = recentSubs.filter(function (s) { return s.status === 'approved' }).length

  return (
    <div style={{ marginBottom: '28px', animation: 'profileFadeIn 0.4s ease-out 0.36s both' }}>
      <SectionDivider label="Submit a Link" />
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <input type="url" value={submitUrl} onChange={function (e) { setSubmitUrl(e.target.value); setSubmitResult(null) }} placeholder="Paste a URL..." style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '13px', fontFamily: FONT, fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s ease' }} onFocus={function (e) { e.target.style.borderColor = 'rgba(168,178,189,0.3)' }} onBlur={function (e) { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px', marginBottom: '10px' }}>
          {SUBMISSION_TIERS.map(function (tier) {
            var isSelected = selectedTier === tier.key
            return (<button key={tier.key} onClick={function () { playClick(); setSelectedTier(tier.key) }} style={{ padding: '8px 2px', borderRadius: '10px', cursor: 'pointer', background: isSelected ? (tier.key === 'legendary' ? 'rgba(212,175,55,0.1)' : tier.key === 'snake-eyes' ? 'rgba(139,45,45,0.1)' : tier.key === 'epic' ? 'rgba(167,139,250,0.1)' : 'rgba(168,178,189,0.1)') : 'rgba(255,255,255,0.02)', border: '1px solid ' + (isSelected ? (tier.key === 'legendary' ? 'rgba(212,175,55,0.35)' : tier.key === 'snake-eyes' ? 'rgba(139,45,45,0.35)' : tier.key === 'epic' ? 'rgba(167,139,250,0.3)' : 'rgba(168,178,189,0.25)') : 'rgba(255,255,255,0.06)'), fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600, color: isSelected ? tier.color : (tier.key === 'regular' ? '#565F67' : tier.color), opacity: isSelected ? 1 : 0.45, transition: 'all 0.15s ease' }}>{tier.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, color: isSelected ? '#d4af37' : '#3D444A', transition: 'color 0.15s ease' }}><img src="/emoji/Coin.png" alt="" style={{ width: '10px', height: '10px', opacity: isSelected ? 1 : 0.4 }} />+{tier.gold}</span>
            </button>)
          })}
        </div>
        <button onClick={handleSubmit} disabled={!submitUrl.trim() || submitting} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setSubmitHovered(true) }} onPointerLeave={function () { setSubmitHovered(false) }} style={{ width: '100%', padding: '11px 0', borderRadius: '10px', cursor: !submitUrl.trim() || submitting ? 'default' : 'pointer', background: submitHovered && submitUrl.trim() ? 'rgba(168,178,189,0.18)' : 'rgba(168,178,189,0.08)', border: '1px solid ' + (submitHovered && submitUrl.trim() ? 'rgba(168,178,189,0.35)' : 'rgba(168,178,189,0.15)'), color: !submitUrl.trim() || submitting ? '#3D444A' : (submitHovered ? '#ffffff' : '#e0e4e8'), fontSize: '13px', fontWeight: 700, fontFamily: FONT, letterSpacing: '0.5px', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', opacity: submitting ? 0.5 : 1, transform: submitHovered && submitUrl.trim() ? 'scale(1.02)' : 'scale(1)' }}>{submitting ? 'Checking...' : 'Submit for Review'}</button>
        {submitResult && (<div style={{ marginTop: '10px', animation: 'profileFadeIn 0.3s ease-out' }}>
          {submitResult.success && (<div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '16px' }}>&#10003;</span><div><div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>Submitted for review</div><div style={{ fontSize: '10px', color: '#828D98', marginTop: '2px' }}>You'll earn <img src="/emoji/Coin.png" alt="" style={{ width: '10px', height: '10px', display: 'inline', verticalAlign: 'middle' }} /> {tierInfo.gold} Gold if approved as {tierInfo.label}</div></div></div>)}
          {submitResult.duplicate && (<div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: '3px' }}>Already in the Library</div><div style={{ fontSize: '11px', color: '#828D98' }}>{submitResult.existing.category ? ('Category: ' + formatCategory(submitResult.existing.category)) : 'Uncategorized'}{submitResult.existing.is_dead ? ' (marked dead)' : ''}</div></div>)}
          {submitResult.already_submitted && (<div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{submitResult.by_other ? 'Someone already submitted this' : 'You already submitted this'}</div><div style={{ fontSize: '11px', color: '#828D98', marginTop: '2px' }}>Status: {submitResult.status === 'pending' ? 'Pending review' : submitResult.status === 'approved' ? 'Approved' : 'Not accepted'}</div></div>)}
          {submitResult.error && (<div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>{submitResult.error}</div></div>)}
        </div>)}
        {recentSubs.length > 0 && (<div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
          <button onClick={function () { playClick(); setShowHistory(function (h) { return !h }) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHistoryHovered(true) }} onPointerLeave={function () { setHistoryHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: historyHovered ? '#A8B2BD' : '#828D98', letterSpacing: '0.5px', transition: 'color 0.15s ease' }}>Your Submissions</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {pendingCount > 0 && (<span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{pendingCount} pending</span>)}
              {approvedCount > 0 && (<span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>{approvedCount} approved</span>)}
              <span style={{ fontSize: '12px', color: '#565F67', transform: showHistory ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>&#9660;</span>
            </div>
          </button>
          {showHistory && (<div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'none' as any, animation: 'catSlideIn 0.2s ease-out' }}>
            {recentSubs.map(function (sub: any) {
              var statusColor = sub.status === 'approved' ? '#34d399' : sub.status === 'rejected' ? '#ef4444' : '#fbbf24'
              var statusLabel = sub.status === 'approved' ? 'Approved' : sub.status === 'rejected' ? 'Not accepted' : 'Pending'
              var tierColor = sub.suggested_tier === 'legendary' ? '#d4af37' : sub.suggested_tier === 'epic' ? '#a78bfa' : '#A8B2BD'
              var displayUrl = sub.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
              return (<div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e4e8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: tierColor, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>{sub.suggested_tier}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
                {sub.status === 'approved' && sub.gold_awarded > 0 && (<span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}><img src="/emoji/Coin.png" alt="" style={{ width: '10px', height: '10px' }} /><span style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37' }}>+{sub.gold_awarded}</span></span>)}
              </div>)
            })}
          </div>)}
        </div>)}
      </div>
    </div>
  )
}

// ── Report a Site Section (v18) ────────────────────────────────
function ReportSiteSection({ sessionId }: { sessionId: string }) {
  var [reportUrl, setReportUrl] = useState('')
  var [reportReason, setReportReason] = useState<string>('offensive')
  var [reportDetails, setReportDetails] = useState('')
  var [reporting, setReporting] = useState(false)
  var [reportResult, setReportResult] = useState<any>(null)
  var [reportHovered, setReportHovered] = useState(false)

  var REASONS = [
    { key: 'offensive', label: 'Offensive', color: '#f87171' },
    { key: 'selling_products', label: 'Selling', color: '#fbbf24' },
    { key: 'broken_experience', label: 'Broken', color: '#828D98' },
    { key: 'spam', label: 'Spam', color: '#a78bfa' },
    { key: 'other', label: 'Other', color: '#565F67' },
  ]

  async function handleReport() {
    if (!reportUrl.trim() || reporting || !sessionId) return
    playClick()
    setReporting(true)
    setReportResult(null)
    try {
      var res = await fetch('/api/report-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, url: reportUrl.trim(), reason: reportReason, details: reportDetails.trim() || null })
      })
      var data = await res.json()
      setReportResult(data)
      if (data.success) { setReportUrl(''); setReportDetails(''); setReportReason('offensive') }
    } catch (e) {
      setReportResult({ error: 'Failed to submit. Try again.' })
    } finally { setReporting(false) }
  }

  return (
    <div style={{ marginBottom: '28px', animation: 'profileFadeIn 0.4s ease-out 0.38s both' }}>
      <SectionDivider label="Report a Site" />
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', overflow: 'hidden' }}>
        <input type="url" value={reportUrl} onChange={function (e) { setReportUrl(e.target.value); setReportResult(null) }} placeholder="Paste the URL..." style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '13px', fontFamily: FONT, fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', marginBottom: '10px' }}>
          {REASONS.map(function (r) {
            var isSelected = reportReason === r.key
            return (<button key={r.key} onClick={function () { playClick(); setReportReason(r.key) }} style={{ padding: '8px 2px', borderRadius: '10px', cursor: 'pointer', background: isSelected ? r.color + '15' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (isSelected ? r.color + '40' : 'rgba(255,255,255,0.06)'), fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 600, color: isSelected ? r.color : '#565F67', transition: 'all 0.15s ease' }}>{r.label}</span>
            </button>)
          })}
        </div>
        <input value={reportDetails} onChange={function (e) { setReportDetails(e.target.value) }} placeholder="Details (optional)" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e4e8', fontSize: '13px', fontFamily: FONT, fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' }} />
        <button onClick={handleReport} disabled={!reportUrl.trim() || reporting} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setReportHovered(true) }} onPointerLeave={function () { setReportHovered(false) }} style={{ width: '100%', padding: '11px 0', borderRadius: '10px', cursor: !reportUrl.trim() || reporting ? 'default' : 'pointer', background: reportHovered && reportUrl.trim() ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.06)', border: '1px solid ' + (reportHovered && reportUrl.trim() ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.15)'), color: !reportUrl.trim() || reporting ? '#3D444A' : '#f87171', fontSize: '13px', fontWeight: 700, fontFamily: FONT, letterSpacing: '0.5px', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', opacity: reporting ? 0.5 : 1 }}>{reporting ? 'Reporting...' : 'Report Site'}</button>
        {reportResult && reportResult.success && (<div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', animation: 'profileFadeIn 0.3s ease-out' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>Report submitted — we'll review it</div></div>)}
        {reportResult && reportResult.error && (<div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', animation: 'profileFadeIn 0.3s ease-out' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>{reportResult.error}</div></div>)}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  var [authUser, setAuthUser] = useState<any>(null); var [sessionId, setSessionId] = useState(''); var [picks, setPicks] = useState<string[]>([]); var [totalPoints, setTotalPoints] = useState(0); var [totalRolls, setTotalRolls] = useState(0); var [loading, setLoading] = useState(true); var [cBtnHovered, setCBtnHovered] = useState(false); var [cBtnPressed, setCBtnPressed] = useState(false); var [signUpHovered, setSignUpHovered] = useState(false); var [logoutHovered, setLogoutHovered] = useState(false); var [potLuck, setPotLuck] = useState(false); var [potLuckHovered, setPotLuckHovered] = useState(false); var [diceSkin, setDiceSkin] = useState('ivory'); var cActive = cBtnHovered || cBtnPressed
  var [goldBalance, setGoldBalance] = useState(0); var [ownedSkins, setOwnedSkins] = useState<string[]>(['ivory']); var [editingCats, setEditingCats] = useState(false); var [skinCategories, setSkinCategories] = useState<string[]>([]); var [skinSlider, setSkinSlider] = useState(70); var [previewSkin, setPreviewSkin] = useState<string | null>(null); var [buying, setBuying] = useState(false); var [currentStreak, setCurrentStreak] = useState(0); var [lastLoginGoldDate, setLastLoginGoldDate] = useState<string | null>(null)
  var [diceHovered, setDiceHovered] = useState(false)
  var [showGoldFlash, setShowGoldFlash] = useState(false)
  var [libraryHovered, setLibraryHovered] = useState(false)
  var [foresightData, setForesightData] = useState<any>(null)
  var [unreadNotifCount, setUnreadNotifCount] = useState(0)
  var [challengesData, setChallengesData] = useState<any[]>([])
  var [challengesAllDone, setChallengesAllDone] = useState(false)
  var [challengesLoaded, setChallengesLoaded] = useState(false)
  var [achievementsHovered, setAchievementsHovered] = useState(false)
  var [goldIconHovered, setGoldIconHovered] = useState(false)
  var [skullHovered, setSkullHovered] = useState(false)
  var [profileCardTakeover, setProfileCardTakeover] = useState<{ type: 'gold_earned'; fromGold: number; toGold: number } | { type: 'gold_stats' } | null>(null)
  var [goldShimmer, setGoldShimmer] = useState(false)
  var profileCardTakeoverTimer = useRef<any>(null)
  var displaySkin = previewSkin || diceSkin; var displayInfo = SKIN_LABELS[displaySkin] || SKIN_LABELS.ivory
  function loadSkinCurate(skinId: string, basePicks: string[]) { var maxCats = SKIN_MAX_CATS[skinId] || 3; var savedRaw = localStorage.getItem('chance_curate_' + skinId + '_categories'); var savedCats: string[] = []; if (savedRaw) { try { savedCats = JSON.parse(savedRaw); if (!Array.isArray(savedCats)) savedCats = [] } catch (e) { savedCats = [] } }; if (savedCats.length === 0) savedCats = basePicks.slice(0, Math.min(basePicks.length, maxCats)); setSkinCategories(savedCats); var tierType = SKIN_TIER_TYPE[skinId] || 'basic'; if (tierType === 'slider') { var sliderRaw = localStorage.getItem('chance_curate_' + skinId + '_slider'); setSkinSlider(sliderRaw ? parseInt(sliderRaw) || 70 : 70) } }
  function saveSkinCurate(skinId: string, cats: string[], slider: number) { localStorage.setItem('chance_curate_' + skinId + '_categories', JSON.stringify(cats)); var tierType = SKIN_TIER_TYPE[skinId] || 'basic'; if (tierType === 'toggle' || tierType === 'slider') { localStorage.setItem('chance_curate_' + skinId + '_enabled', JSON.stringify(cats)) }; if (tierType === 'slider') { localStorage.setItem('chance_curate_' + skinId + '_slider', String(slider)) }; var activeSkin = localStorage.getItem('chance_dice_skin') || 'ivory'; if (skinId === activeSkin && activeSkin !== 'ivory') { localStorage.setItem('chance_curate_categories', JSON.stringify(cats)); if (tierType === 'slider') { localStorage.setItem('chance_curate_slider', String(slider)) } } }
  useEffect(function () {
    var saved = localStorage.getItem('chance_dice_skin'); if (saved) setDiceSkin(saved)
    var savedPotLuck = localStorage.getItem('chance_pot_luck'); if (savedPotLuck === 'true') setPotLuck(true)
    import('three').catch(function () {}); import('cannon-es').catch(function () {}); import('@/components/DiceRoll').catch(function () {})
    ;(async function () {
      var user = await getAuthUser(); setAuthUser(user); var userId = await getEffectiveUserId(); setSessionId(userId)
      var localPicks: string[] = []; var raw = localStorage.getItem('chance_picked_categories'); if (raw) { try { var p = JSON.parse(raw); if (Array.isArray(p)) localPicks = p } catch (e) {} }
      if (user) { var { data } = await supabase.from('users').select('picked_categories').eq('id', user.id).single(); if (data && data.picked_categories && data.picked_categories.length > 0) { setPicks(data.picked_categories); localPicks = data.picked_categories } else if (localPicks.length > 0) { setPicks(localPicks) } } else { setPicks(localPicks) }
      try { var { data: statsData } = await supabase.from('user_stats').select('total_points, total_rolls, gold_coins, current_streak, last_login_gold_date, owned_skins').eq('session_id', userId).single(); if (statsData) { setTotalPoints(statsData.total_points || 0); setTotalRolls(statsData.total_rolls || 0); setGoldBalance(statsData.gold_coins || 0); setCurrentStreak(statsData.current_streak || 0); setLastLoginGoldDate(statsData.last_login_gold_date || null); var dbSkins = statsData.owned_skins; if (dbSkins && Array.isArray(dbSkins) && dbSkins.length > 0) { if (!dbSkins.includes('ivory')) dbSkins.unshift('ivory'); setOwnedSkins(dbSkins); localStorage.setItem('chance_owned_skins', JSON.stringify(dbSkins)) } else { setOwnedSkins(['ivory']); localStorage.setItem('chance_owned_skins', JSON.stringify(['ivory'])) } } } catch (e) {}
      fetch('/api/notifications?session_id=' + userId + '&count=1').then(function (r) { return r.json() }).then(function (d) { setUnreadNotifCount(d.unread_count || 0) }).catch(function () {})
      fetch('/api/challenges?session_id=' + userId).then(function (r) { return r.json() }).then(function (d) { if (d.challenges) { setChallengesData(d.challenges); setChallengesAllDone(d.all_complete || false) }; setChallengesLoaded(true) }).catch(function () { setChallengesLoaded(true) })
      var activeSkin = localStorage.getItem('chance_dice_skin') || 'ivory'; loadSkinCurate(activeSkin, localPicks); setLoading(false)
      fetch('/api/foresight?session_id=' + userId + '&all=1').then(function (r) { return r.json() }).then(function (d) { if (d.stats) setForesightData(d) }).catch(function () {})
      setTimeout(function () { setShowGoldFlash(true); setTimeout(function () { setShowGoldFlash(false) }, 2000) }, 100)
    })()
  }, [])
  var rank = getRank(totalPoints); var progressPercent = rank.next ? Math.min(100, (totalPoints / rank.next) * 100) : 100
  function isSkinUnlocked(skinId: string): boolean { return ownedSkins.includes(skinId) }
  function handleSkinPillTap(skinId: string) {
    if (skinId === diceSkin) { setPreviewSkin(null); playClick(); return }
    if (ownedSkins.includes(skinId)) { setPreviewSkin(null); playEquip(); setDiceSkin(skinId); localStorage.setItem('chance_dice_skin', skinId); setEditingCats(false); loadSkinCurate(skinId, picks); var tt = SKIN_TIER_TYPE[skinId] || 'basic'; if (skinId !== 'ivory') { var sr = localStorage.getItem('chance_curate_' + skinId + '_categories'); if (sr) { localStorage.setItem('chance_curate_categories', sr) }; if (tt === 'slider') { var slr = localStorage.getItem('chance_curate_' + skinId + '_slider'); if (slr) { localStorage.setItem('chance_curate_slider', slr) } } } else { localStorage.removeItem('chance_curate_categories'); localStorage.removeItem('chance_curate_slider') }; return }
    if (previewSkin === skinId) { setPreviewSkin(null); playClick() } else { setPreviewSkin(skinId); playClick() }
  }
  async function handleBuySkin() { if (!previewSkin || buying) return; var price = SKIN_PRICES[previewSkin] || 0; if (goldBalance < price) return; setBuying(true); try { var newOwned = ownedSkins.concat([previewSkin]); if (sessionId) { await supabase.from('user_stats').update({ gold_coins: goldBalance - price, owned_skins: newOwned }).eq('session_id', sessionId) }; setGoldBalance(function (g) { return g - price }); setOwnedSkins(newOwned); localStorage.setItem('chance_owned_skins', JSON.stringify(newOwned)); setDiceSkin(previewSkin); localStorage.setItem('chance_dice_skin', previewSkin); loadSkinCurate(previewSkin, picks); if (previewSkin !== 'ivory') { var sr = localStorage.getItem('chance_curate_' + previewSkin + '_categories'); if (sr) { localStorage.setItem('chance_curate_categories', sr) } }; setPreviewSkin(null); playEquip() } catch (e) { console.error('Buy failed:', e) } finally { setBuying(false) } }
  function handleAddCategory(cat: string) { var mc = SKIN_MAX_CATS[diceSkin] || 3; if (skinCategories.length >= mc || skinCategories.includes(cat)) return; playClick(); var nc = skinCategories.concat([cat]); setSkinCategories(nc); saveSkinCurate(diceSkin, nc, skinSlider) }
  function handleRemoveCategory(cat: string) { if (SKIN_TIER_TYPE[diceSkin] === 'basic' && picks.includes(cat)) return; playClick(); var nc = skinCategories.filter(function (c) { return c !== cat }); setSkinCategories(nc); saveSkinCurate(diceSkin, nc, skinSlider) }
  function handleSliderChange(val: number) { setSkinSlider(val); saveSkinCurate(diceSkin, skinCategories, val) }
  async function handleLogout() { playClick(); await supabase.auth.signOut(); localStorage.removeItem('chance_picked_categories'); localStorage.removeItem('chance_session_id'); window.location.href = '/' }
  function handlePotLuck() { playClick(); var next = !potLuck; setPotLuck(next); if (next) { localStorage.setItem('chance_pot_luck', 'true') } else { localStorage.removeItem('chance_pot_luck') } }
  function handleGoldIconTap() { playGoldCoin(); if (profileCardTakeoverTimer.current) clearTimeout(profileCardTakeoverTimer.current); setProfileCardTakeover(null); setTimeout(function () { setProfileCardTakeover({ type: 'gold_stats' }) }, 10); profileCardTakeoverTimer.current = setTimeout(function () { setProfileCardTakeover(null) }, 2000) }
  // v19: fetch recommended URL and preload into feed
  async function handleStartRolling() { playClick(); playDiceRoll(); setCBtnPressed(true); try { var ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {}; setTimeout(function () { setCBtnPressed(false) }, 150); try { var cats = localStorage.getItem('chance_selected_categories'); var catList = ''; if (cats) { try { var parsed = JSON.parse(cats); if (Array.isArray(parsed)) catList = parsed.join(',') } catch (e) {} }; var sid = localStorage.getItem('chance_session_id') || ''; var res = await fetch('/api/recommended?session_id=' + sid + '&categories=' + catList); var data = await res.json(); if (data.url) { localStorage.setItem('chance_preloaded_url', JSON.stringify(data.url)); window.location.href = '/feed?preload=1'; return } } catch (e) {}; window.location.href = '/feed?first=1' }
  if (loading) return (<div style={{ minHeight: '100vh', background: '#07070c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/logo-c.png" alt="Chance" style={{ width: '48px', height: '48px', opacity: 0.3 }} /></div>)
  var tierType = SKIN_TIER_TYPE[diceSkin] || 'basic'; var maxCats = SKIN_MAX_CATS[diceSkin] || 3
  var extraCats: string[] = []
  var skinTierName = (SKIN_LABELS[diceSkin] || SKIN_LABELS.ivory).tier
  if (skinTierName === 'Legendary') extraCats = ['legendary', 'epic', 'snake-eyes']
  else if (skinTierName === 'Epic') extraCats = ['epic']
  var fullCatList = extraCats.concat(BASE_CATEGORIES)
  var availableCats = fullCatList.filter(function (c) { return !skinCategories.includes(c) })
  var isPreviewingLocked = previewSkin !== null && !ownedSkins.includes(previewSkin); var previewPrice = previewSkin ? (SKIN_PRICES[previewSkin] || 0) : 0; var canAfford = goldBalance >= previewPrice
  var dailyBonus = getDailyGoldBonus(currentStreak)
  var dTierStyle = TIER_STYLE[displayInfo.tier] || TIER_STYLE.Default
  var diceActiveSkin = isPreviewingLocked ? displaySkin : diceSkin
  var diceActiveInfo = SKIN_LABELS[diceActiveSkin] || SKIN_LABELS.ivory
  var diceBorderColor = isPreviewingLocked ? displayInfo.borderColor : (diceHovered ? diceActiveInfo.borderColor : diceActiveInfo.borderColor)
  var diceBoxShadow = isPreviewingLocked ? displayInfo.hoverGlowColor : (diceHovered ? diceActiveInfo.hoverGlowColor : diceActiveInfo.glowColor)
  var userHasLibrary = hasLibraryAccess(ownedSkins)
  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`@keyframes profileFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes navRingRotate { to { transform: rotate(360deg); } } @keyframes ringRotate { to { transform: rotate(360deg); } } @keyframes emojiPop { 0% { transform: scale(1); } 25% { transform: scale(1.8); } 50% { transform: scale(0.85); } 75% { transform: scale(1.15); } 100% { transform: scale(1); } } @keyframes catSlideIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 800px; } } @keyframes priceSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes goldFlashFade { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } } @keyframes dayFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } } @keyframes cardTakeoverAnim { 0% { opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } } @keyframes goldShimmerSweep { 0% { transform: translateX(-100%) skewX(-12deg); } 100% { transform: translateX(200%) skewX(-12deg); } } @keyframes goldWavePulse { 0% { opacity: 0; } 15% { opacity: 1; } 60% { opacity: 1; } 100% { opacity: 0; } } @keyframes goldIconPop { 0% { transform: scale(1); } 30% { transform: scale(1.4); } 100% { transform: scale(1); } }
        canvas { background: transparent !important; }
        .cat-pill { transition: all 0.15s ease; } .cat-pill:hover { background: rgba(168,178,189,0.18) !important; border-color: rgba(168,178,189,0.35) !important; transform: scale(1.03); }
        .cat-avail { transition: all 0.15s ease; } .cat-avail:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.15) !important; transform: scale(1.03); color: #e0e4e8 !important; }
        .cat-premium:hover { transform: scale(1.03); filter: brightness(1.2); }
        .prof-btn { transition: all 0.15s ease; } .prof-btn:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(168,178,189,0.25) !important; transform: scale(1.02); }
        .submit-input::placeholder { color: #3D444A; }`}</style>
      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/feed" icon={<img src="/logo-c.png" alt="Roll" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.85 }} />} />
        {userHasLibrary && <NavBtn href="/library" icon={<IconLibrary color="#A8B2BD" />} />}
        <NavBtn href="/notifications" icon={<IconBell color="#A8B2BD" badge={unreadNotifCount} />} />
        <NavBtn href="/vault" icon={<IconVault color="#A8B2BD" />} />
      </div>
      <div style={{ maxWidth: '560px', width: '100%', padding: '48px 16px 40px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', animation: 'profileFadeIn 0.4s ease-out', marginBottom: '16px', paddingTop: '12px' }}>
          <img src="/logo-c.png" alt="Chance" style={{ width: '56px', height: '56px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#A8B2BD', margin: '0 0 3px', letterSpacing: '5px', textTransform: 'uppercase' }}>{rank.name}</h1>
          {authUser && authUser.email ? <p style={{ fontSize: '11px', color: '#565F67', margin: 0 }}>{authUser.email}</p> : <p style={{ fontSize: '11px', color: '#565F67', margin: 0 }}>Anonymous explorer</p>}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(1px) saturate(126%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', animation: 'profileFadeIn 0.4s ease-out 0.1s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
            <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Rolls</div><div style={{ fontSize: '17px', fontWeight: 800, color: '#e0e4e8' }}>{totalRolls.toLocaleString()}</div></div>
            <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Spark</div><div style={{ fontSize: '17px', fontWeight: 800, color: '#e0e4e8' }}>{totalPoints.toLocaleString()}</div></div>
            <div style={{ flex: 1, textAlign: 'right' }}><div style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Gold</div><div style={{ fontSize: '17px', fontWeight: 800, color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}><img src="/emoji/Coin.png" alt="" style={{ width: '14px', height: '14px' }} />{goldBalance.toLocaleString()}</div></div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: showGoldFlash ? '#f59e0b' : '#828D98', transition: 'color 0.3s ease', display: 'flex', alignItems: 'center', gap: '4px' }}><img src="/emoji/ember/Fire.png" alt="" style={{ width: '14px', height: '14px' }} />{currentStreak + ' day streak'}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37' }}>+{dailyBonus} Gold/day</span>
            </div>
            <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #f59e0b, #d4af37)', width: Math.min(100, (dailyBonus - 2) / 3 * 100) + '%', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
              <span style={{ fontSize: '9px', color: '#565F67' }}>+2</span>
              <span style={{ fontSize: '9px', color: dailyBonus >= 3 ? '#828D98' : '#565F67' }}>+3</span>
              <span style={{ fontSize: '9px', color: dailyBonus >= 4 ? '#828D98' : '#565F67' }}>+4</span>
              <span style={{ fontSize: '9px', color: dailyBonus >= 5 ? '#d4af37' : '#565F67', fontWeight: dailyBonus >= 5 ? 700 : 400 }}>+5 max</span>
            </div>
          </div>
        </div>
        {rank.next && (<div style={{ marginBottom: '10px', animation: 'profileFadeIn 0.4s ease-out 0.12s both' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '10px', color: '#565F67' }}>{totalPoints.toLocaleString()} pts</span><span style={{ fontSize: '10px', color: '#565F67' }}>{rank.next.toLocaleString()} pts</span></div><div style={{ width: '100%', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #828D98, #A8B2BD)', width: progressPercent + '%', transition: 'width 0.5s ease' }} /></div></div>)}
        <div style={{ animation: 'profileFadeIn 0.4s ease-out 0.16s both', marginBottom: '16px' }}>
          <SectionDivider label="Your Emojis and Card Effect" />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#0a0b10', backdropFilter: 'blur(1px) saturate(126%)', WebkitBackdropFilter: 'blur(1px) saturate(126%)', border: '1px solid ' + (isPreviewingLocked ? displayInfo.borderColor : 'rgba(255,255,255,0.11)'), borderRadius: '20px', overflow: 'hidden', position: 'relative', width: '260px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}>
              {goldShimmer && (<div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden', borderRadius: '20px', animation: 'goldWavePulse 1.2s ease-out forwards' }}><div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.15), rgba(212,175,55,0.06), transparent 70%)' }} /><div style={{ position: 'absolute', top: 0, left: 0, width: '80%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), rgba(255,255,255,0.12), rgba(212,175,55,0.18), transparent)', animation: 'goldShimmerSweep 0.9s ease-out forwards' }} /></div>)}
              {displaySkin !== 'ivory' && (<div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden', borderRadius: '20px' }}><CardSkinEffects skinId={displaySkin as any} opacity={1} /></div>)}
              {(() => { var isCardTakeover = profileCardTakeover !== null; return (
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.25)' }} /></div>
                <button onClick={handleGoldIconTap} onMouseEnter={function () { setGoldIconHovered(true) }} onMouseLeave={function () { setGoldIconHovered(false) }} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}><img src="/emoji/Coin.png" alt="Gold" style={{ width: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px', height: isCardTakeover ? '20px' : goldIconHovered ? '18px' : '15px', opacity: isCardTakeover ? 1 : goldIconHovered ? 0.8 : 0.4, transition: 'all 0.15s ease', animation: goldShimmer ? 'goldIconPop 0.5s ease-out' : 'none', pointerEvents: 'none' }} /></button>
                <button onClick={function () { playSkullReport() }} onMouseEnter={function () { setSkullHovered(true) }} onMouseLeave={function () { setSkullHovered(false) }} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}><img src="/emoji/Skull.png" alt="Dead" style={{ width: skullHovered ? '20px' : '16px', height: skullHovered ? '20px' : '16px', opacity: skullHovered ? 0.8 : 0.4, transition: 'all 0.15s ease', pointerEvents: 'none' }} /></button>
                <div style={{ padding: '6px 14px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, height: '56px' }}>
                  {isCardTakeover ? (
                    <div style={{ animation: 'cardTakeoverAnim 2.2s ease-out forwards', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '17px', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', whiteSpace: 'nowrap', textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,1)' }}>
                      {profileCardTakeover!.type === 'gold_earned' ? (
                        <><img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /> <span style={{ color: '#d4af37' }}><GoldTickUp from={(profileCardTakeover as any).fromGold} to={(profileCardTakeover as any).toGold} /></span></>
                      ) : (
                        <><img src="/emoji/Coin.png" alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /> <span style={{ color: '#d4af37' }}>{goldBalance}</span> <span style={{ color: '#565F67', margin: '0 2px' }}>&middot;</span> <span style={{ color: '#A8B2BD' }}>&#9889; {totalPoints.toLocaleString()}</span></>
                      )}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '2px 8px', height: '46px' }}>{(() => { var emojis = SKIN_EMOJIS[displaySkin] || SKIN_EMOJIS.ivory; return (<><EmojiButton src={emojis.negative} /><EmojiButton src={emojis.neutral} /><EmojiButton src={emojis.positive} /></>) })()}</div>
              </div>
              )})()}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px', animation: 'profileFadeIn 0.4s ease-out 0.18s both' }}>
          {SKIN_ORDER.map(function (skinId) { var info = SKIN_LABELS[skinId]; var unlocked = isSkinUnlocked(skinId); var isActive = diceSkin === skinId; var isPreviewing = previewSkin === skinId; return (<SkinPill key={skinId} skinId={skinId} name={info.name} color={info.color} unlocked={unlocked} isActive={isActive} isPreviewing={isPreviewing} onTap={handleSkinPillTap} />) })}
          <MysteryPill />
        </div>
        <div style={{ animation: 'profileFadeIn 0.4s ease-out 0.2s both', marginBottom: '24px' }}>
          <SectionDivider label="Your Dice" />
          <div style={{ border: '1px solid ' + diceBorderColor, borderRadius: '18px', overflow: 'hidden', transition: 'border-color 0.3s ease, box-shadow 0.3s ease', boxShadow: diceBoxShadow }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setDiceHovered(true) }} onPointerLeave={function () { setDiceHovered(false) }}>
            <div style={{ width: '100%', height: '260px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}><CabinetDicePreview skinId={displaySkin as any} width={420} height={260} /></div>
            <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize: '15px', fontWeight: 700, color: displayInfo.color, flex: '1' }}>{displayInfo.name}</span><span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', background: dTierStyle.bg, color: dTierStyle.color, border: '1px solid ' + dTierStyle.border, lineHeight: 1 }}>{displayInfo.tier}</span></div>
            {SKIN_BENEFITS[displaySkin] && (<div style={{ padding: '6px 16px ' + (isPreviewingLocked ? '10px' : '10px'), display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#565F67', flex: 1, lineHeight: 1.3 }}>{SKIN_BENEFITS[displaySkin]}</span>
              {isPreviewingLocked && (<button onClick={handleBuySkin} disabled={!canAfford || buying} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: canAfford ? 'pointer' : 'default', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', opacity: buying ? 0.3 : canAfford ? 1 : 0.25, transition: 'opacity 0.2s ease', flexShrink: 0 }}><img src="/emoji/Coin.png" alt="" style={{ width: '14px', height: '14px' }} /><span style={{ fontSize: '15px', fontWeight: 800, color: '#d4af37' }}>{previewPrice.toLocaleString()}</span></button>)}
            </div>)}
          </div>
        </div>
        <div style={{ marginBottom: '24px', animation: 'profileFadeIn 0.4s ease-out 0.24s both' }}>
          <SectionDivider label="Your Categories" />
          {picks.length === 0 && (<div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#828D98', margin: '0 0 12px', fontWeight: 500, lineHeight: 1.5 }}>Pick 3 categories to personalise your feed</p><button className="prof-btn" onClick={function () { playClick(); window.location.href = '/setup?cats=1' }} style={{ fontSize: '12px', padding: '8px 20px', borderRadius: '10px', border: '1px solid rgba(168,178,189,0.2)', background: 'rgba(168,178,189,0.08)', color: '#A8B2BD', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>Choose Categories</button></div>)}
          {picks.length > 0 && (<><button onClick={handlePotLuck} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setPotLuckHovered(true) }} onPointerLeave={function () { setPotLuckHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px 0', borderRadius: '12px', marginBottom: '10px', background: potLuck ? 'rgba(130,141,152,0.12)' : potLuckHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (potLuck ? 'rgba(168,178,189,0.25)' : potLuckHovered ? 'rgba(168,178,189,0.2)' : 'rgba(130,141,152,0.1)'), color: potLuck ? '#e0e4e8' : potLuckHovered ? '#d0d4d9' : '#828D98', fontSize: '12px', fontWeight: 600, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', letterSpacing: '0.3px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 5.5L5 3.5h14l1.5 2"/><path d="M3.5 5.5v13a2 2 0 002 2h13a2 2 0 002-2v-13"/><path d="M12 10v8"/><path d="M9 13l3-3 3 3"/></svg>{potLuck ? 'Pot Luck ON \u2014 Full Random' : 'Pot Luck \u2014 Go Full Random'}</button>
          <div style={{ opacity: potLuck ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: potLuck ? 'none' : 'auto' }}>
            {!editingCats && (<div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>{skinCategories.length > 0 ? (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>{skinCategories.map(function (cat) { return (<div key={cat} className="cat-pill" style={{ fontSize: '12px', fontWeight: 700, padding: '8px 4px', borderRadius: '8px', border: '1px solid rgba(168,178,189,0.25)', background: 'rgba(168,178,189,0.1)', color: '#e0e4e8', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>{formatCategory(cat)}</div>) })}</div>) : (<p style={{ fontSize: '12px', color: '#565F67', marginBottom: '8px' }}>No categories selected. Tap Edit to choose.</p>)}<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '10px', color: '#565F67' }}>{skinCategories.length}{maxCats < 999 ? ' of ' + maxCats : ''} active</span>{diceSkin !== 'ivory' && (<button className="prof-btn" onClick={function () { playClick(); setEditingCats(true) }} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '8px', border: '1px solid rgba(168,178,189,0.15)', background: 'rgba(255,255,255,0.04)', color: '#A8B2BD', cursor: 'pointer', fontFamily: FONT, fontWeight: 500, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>Edit</button>)}{diceSkin === 'ivory' && (<button className="prof-btn" onClick={function () { playClick(); window.location.href = '/setup?review=1' }} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '8px', border: '1px solid rgba(168,178,189,0.15)', background: 'rgba(255,255,255,0.04)', color: '#A8B2BD', cursor: 'pointer', fontFamily: FONT, fontWeight: 500, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>How to Play</button>)}</div></div>)}
            {editingCats && (<div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', animation: 'catSlideIn 0.25s ease-out' }}><div style={{ fontSize: '11px', color: '#828D98', marginBottom: '6px', fontWeight: 600 }}>Your categories (tap to remove):</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>{skinCategories.map(function (cat) { var isLocked = SKIN_TIER_TYPE[diceSkin] === 'basic' && picks.includes(cat); return (<button key={cat} className="cat-pill" onClick={function () { if (!isLocked) handleRemoveCategory(cat) }} style={{ fontSize: '12px', fontWeight: 700, padding: '8px 4px', borderRadius: '8px', border: '1px solid rgba(168,178,189,0.25)', background: 'rgba(168,178,189,0.1)', color: '#e0e4e8', cursor: isLocked ? 'default' : 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.12s ease', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{formatCategory(cat)}{isLocked ? (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3D444A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>) : (<span style={{ color: '#565F67', fontSize: '14px', lineHeight: 1 }}>&times;</span>)}</button>) })}{maxCats < 999 && Array.from({ length: Math.max(0, maxCats - skinCategories.length) }).map(function (_, i) { return (<div key={'slot-' + i} style={{ fontSize: '12px', fontWeight: 600, padding: '8px 4px', borderRadius: '8px', border: '1px dashed ' + (SKIN_LABELS[diceSkin] || SKIN_LABELS.ivory).color + '30', color: (SKIN_LABELS[diceSkin] || SKIN_LABELS.ivory).color + '50', textAlign: 'center' }}>empty slot</div>) })}</div><div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} /><div style={{ fontSize: '11px', color: '#828D98', marginBottom: '6px', fontWeight: 600 }}>Available (tap to add):</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '10px', maxHeight: '300px', overflowY: 'auto' }}>{availableCats.map(function (cat) { var isPremium = cat === 'legendary' || cat === 'epic' || cat === 'snake-eyes'; return (<button key={cat} className={isPremium ? 'cat-premium' : 'cat-avail'} onClick={function () { handleAddCategory(cat) }} style={{ fontSize: '12px', fontWeight: isPremium ? 700 : 600, padding: '8px 4px', borderRadius: '8px', border: '1px solid ' + (isPremium ? (cat === 'legendary' ? 'rgba(212,175,55,0.25)' : cat === 'snake-eyes' ? 'rgba(139,45,45,0.25)' : 'rgba(167,139,250,0.2)') : 'rgba(255,255,255,0.08)'), background: isPremium ? (cat === 'legendary' ? 'rgba(212,175,55,0.06)' : cat === 'snake-eyes' ? 'rgba(139,45,45,0.06)' : 'rgba(167,139,250,0.06)') : 'rgba(255,255,255,0.02)', color: isPremium ? (cat === 'legendary' ? '#d4af37' : cat === 'snake-eyes' ? '#8B2D2D' : '#a78bfa') : '#828D98', cursor: skinCategories.length >= maxCats && maxCats < 999 ? 'not-allowed' : 'pointer', fontFamily: FONT, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.12s ease', opacity: skinCategories.length >= maxCats && maxCats < 999 ? 0.3 : 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCategory(cat)}</button>) })}</div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '10px', color: '#565F67' }}>{skinCategories.length}{maxCats < 999 ? ' of ' + maxCats + ' slots' : ' selected'}</span><button className="prof-btn" onClick={function () { playClick(); setEditingCats(false) }} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '8px', border: '1px solid rgba(168,178,189,0.2)', background: 'rgba(168,178,189,0.08)', color: '#d0d4d9', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}>Done</button></div></div>)}
            {tierType === 'slider' && (<div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}><input type="range" min="0" max="100" value={skinSlider} onChange={function (e) { handleSliderChange(parseInt(e.target.value)) }} style={{ width: '100%', accentColor: '#A8B2BD', height: '4px', cursor: 'pointer' }} /><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px' }}><span style={{ color: '#565F67' }}>Discovery</span><span style={{ color: '#d0d4d9', fontWeight: 700 }}>{skinSlider}%</span><span style={{ color: '#565F67' }}>Curated</span></div><div style={{ fontSize: '9px', color: '#3D444A', textAlign: 'center', marginTop: '3px' }}>{skinSlider}% from your picks, {100 - skinSlider}% full random</div></div>)}
          </div></>)}
        </div>
        <div style={{ marginBottom: '28px', animation: 'profileFadeIn 0.4s ease-out 0.26s both' }}>
          {userHasLibrary ? (
            <a href="/library" onClick={function (e: any) { e.preventDefault(); playClick(); setTimeout(function () { window.location.href = '/library' }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setLibraryHovered(true) }} onPointerLeave={function () { setLibraryHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0', width: '100%', borderRadius: '14px', textDecoration: 'none', background: libraryHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (libraryHovered ? 'rgba(168,178,189,0.2)' : 'rgba(255,255,255,0.08)'), color: libraryHovered ? '#d0d4d9' : '#A8B2BD', fontSize: '13px', fontWeight: 600, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', boxSizing: 'border-box' as const }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={libraryHovered ? '#d0d4d9' : '#828D98'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s ease' }}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>Library</a>
          ) : (
            <div onPointerEnter={function (e) { if (e.pointerType === 'mouse') setLibraryHovered(true) }} onPointerLeave={function () { setLibraryHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', width: '100%', borderRadius: '14px', background: libraryHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (libraryHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'), color: libraryHovered ? '#828D98' : '#565F67', fontSize: '13px', fontWeight: 600, fontFamily: FONT, cursor: 'default', transition: 'all 0.2s ease', boxSizing: 'border-box' as const }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={libraryHovered ? '#828D98' : '#565F67'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s ease', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span>5,000+ Hidden Sites</span>
              <span style={{ color: '#ff6a00', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>Unlock with Ember</span>
            </div>
          )}
        </div>
        <div style={{ marginBottom: '28px', animation: 'profileFadeIn 0.4s ease-out 0.28s both' }}>
          <a href="/achievements" onClick={function (e: any) { e.preventDefault(); playClick(); setTimeout(function () { window.location.href = '/achievements' }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setAchievementsHovered(true) }} onPointerLeave={function () { setAchievementsHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0', width: '100%', borderRadius: '14px', textDecoration: 'none', background: achievementsHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (achievementsHovered ? 'rgba(168,178,189,0.2)' : 'rgba(255,255,255,0.08)'), color: achievementsHovered ? '#d0d4d9' : '#A8B2BD', fontSize: '13px', fontWeight: 600, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', boxSizing: 'border-box' as const }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={achievementsHovered ? '#d0d4d9' : '#828D98'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.2s ease' }}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>
            Achievements
          </a>
        </div>
        {foresightData && foresightData.stats && foresightData.stats.total > 0 && (<div style={{ marginBottom: '24px', animation: 'profileFadeIn 0.4s ease-out 0.3s both' }}>
          <SectionDivider label="Foresight" />
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 800, color: '#e0e4e8' }}>{foresightData.stats.total}</div><div style={{ fontSize: '9px', fontWeight: 700, color: '#565F67', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Predictions</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{foresightData.stats.accuracy}%</div><div style={{ fontSize: '9px', fontWeight: 700, color: '#565F67', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accuracy</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: 800, color: '#d4af37' }}>{foresightData.stats.gold_earned}</div><div style={{ fontSize: '9px', fontWeight: 700, color: '#565F67', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gold Earned</div></div>
            </div>
            {foresightData.results && foresightData.results.length > 0 && (<div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#828D98', marginBottom: '6px', letterSpacing: '0.5px' }}>Recent Predictions</div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', scrollbarWidth: 'none' as any }}>
              {foresightData.results.map(function (fr: any, idx: number) { var labelMap: Record<string, string> = { mindblown: 'positive', neutral: 'neutral', yawn: 'negative' }; return (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: idx < foresightData.results.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>{fr.was_correct ? '\u2713' : '\u2717'}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e4e8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fr.url_info ? (fr.url_info.title || fr.url_info.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) : 'URL'}</span>
                <span style={{ fontSize: '10px', color: '#565F67', flexShrink: 0 }}>{labelMap[fr.user_reaction] || fr.user_reaction}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: fr.was_correct ? '#34d399' : '#f87171', width: '35px', textAlign: 'right', flexShrink: 0 }}>{fr.points_awarded > 0 ? '+' : ''}{fr.points_awarded}</span>
              </div>) })}
              </div>
            </div>)}
          </div>
        </div>)}
        {challengesLoaded && challengesData.length > 0 && (<div style={{ marginBottom: '24px', animation: 'profileFadeIn 0.4s ease-out 0.32s both' }}>
          <SectionDivider label="Daily Challenges" />
          {challengesAllDone && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', marginBottom: '10px', borderRadius: '12px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <span style={{ fontSize: '18px' }}>&#127873;</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d4af37' }}>Daily Chest Unlocked — +25 Spark +3 Gold</span>
          </div>)}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {challengesData.map(function (ch: any, idx: number) {
              var typeInfo = ch.challenge_types || {}
              var icon = typeInfo.icon || '&#11088;'
              var desc = typeInfo.description || ch.challenge_type_key.replace(/_/g, ' ')
              var progress = ch.progress || 0
              var requirement = ch.requirement || 1
              var pct = Math.min(100, Math.round((progress / requirement) * 100))
              var done = ch.completed
              var barColor = done ? '#34d399' : '#A8B2BD'
              var hasBorder = idx < challengesData.length - 1
              return (<div key={ch.id || idx} style={{ padding: '10px 12px', borderBottom: hasBorder ? '1px solid rgba(255,255,255,0.04)' : 'none', background: done ? 'rgba(52,211,153,0.03)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, width: '20px', textAlign: 'center' as const }}>{done ? '\u2714' : icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: done ? '#34d399' : '#e0e4e8', flex: 1, lineHeight: 1.3 }}>{desc}</span>
                  {done ? (<span style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', flexShrink: 0 }}>&#10003;</span>) : (<span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}><span style={{ fontSize: '10px', fontWeight: 700, color: '#A8B2BD', letterSpacing: '0.3px' }}>{ch.spark_reward} Spark</span>{ch.gold_reward > 0 && (<><span style={{ color: '#3D444A' }}>&#183;</span><span style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37', letterSpacing: '0.3px' }}>{ch.gold_reward} Gold</span></>)}</span>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '28px' }}>
                  <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: '2px', background: barColor, width: pct + '%', transition: 'width 0.4s ease', opacity: done ? 0.5 : 1 }} /></div>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: done ? '#34d399' : '#565F67', flexShrink: 0, minWidth: '24px', textAlign: 'right' as const }}>{progress}/{requirement}</span>
                </div>
              </div>)
            })}
          </div>
        </div>)}
        {sessionId && <SubmitLinkSection sessionId={sessionId} />}
        {sessionId && <ReportSiteSection sessionId={sessionId} />}
        <div style={{ marginBottom: '28px', animation: 'profileFadeIn 0.4s ease-out 0.4s both' }}>
          {!authUser && (<a href="/login" onClick={function (e: any) { e.preventDefault(); playClick(); setTimeout(function () { window.location.href = '/login' }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setSignUpHovered(true) }} onPointerLeave={function () { setSignUpHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', width: '100%', borderRadius: '14px', textDecoration: 'none', background: signUpHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (signUpHovered ? 'rgba(168,178,189,0.25)' : 'rgba(255,255,255,0.1)'), color: '#A8B2BD', fontSize: '13px', fontWeight: 700, fontFamily: FONT, letterSpacing: '0.5px', cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.25s ease', boxSizing: 'border-box' as const }}>Sign Up to Keep Progress</a>)}
          {authUser && (<button onClick={handleLogout} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setLogoutHovered(true) }} onPointerLeave={function () { setLogoutHovered(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', width: '100%', borderRadius: '14px', background: logoutHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (logoutHovered ? 'rgba(168,178,189,0.25)' : 'rgba(255,255,255,0.1)'), color: '#A8B2BD', fontSize: '13px', fontWeight: 700, fontFamily: FONT, letterSpacing: '0.5px', cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.25s ease', boxSizing: 'border-box' as const }}>Log Out</button>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'profileFadeIn 0.4s ease-out 0.42s both' }}>
          <button onClick={handleStartRolling} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setCBtnHovered(true) }} onPointerLeave={function () { setCBtnHovered(false) }} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: cBtnPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)' }}>
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
