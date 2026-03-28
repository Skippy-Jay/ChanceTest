'use client'
// app/vault/page.tsx — Chance Vault Page v3.2
// v3.2: Prioritize celestial (gold) over matrix (green) for capacity display
// v3.1: Bell notification icon in top-right nav
// v3: CardSkinEffects on saved URL cards, card hover glow matching Library,
//     Library nav icon for Ember+ users, skin-coloured capacity display
// Ivory=10, Midnight=25, Ember=50, Portal=75, Hologram=100, Matrix/Celestial=unlimited
import { useState, useEffect } from 'react'
import { supabase, getEffectiveUserId, getAuthUser } from '@/lib/supabase'
import CardSkinEffects from '@/components/CardSkinEffects'

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)'

var SKIN_CAPACITY: Record<string, number> = { ivory: 10, midnight: 25, ember: 50, portal: 75, hologram: 100, matrix: -1, celestial: -1 }
var SKIN_COLOR: Record<string, string> = { ivory: '#f5f0e8', midnight: '#5588cc', ember: '#ff6a00', portal: '#aa55ff', hologram: '#d8d8d8', matrix: '#00ff41', celestial: '#d4af37' }
var SKIN_BORDER: Record<string, string> = { ivory: 'rgba(255,255,255,0.1)', midnight: 'rgba(85,136,204,0.3)', ember: 'rgba(255,106,0,0.3)', portal: 'rgba(170,85,255,0.35)', hologram: 'rgba(167,139,250,0.3)', matrix: 'rgba(0,255,65,0.2)', celestial: 'rgba(212,175,55,0.3)' }
var SKIN_GLOW: Record<string, string> = { ivory: 'none', midnight: '0 0 15px rgba(85,136,204,0.08), 0 0 5px rgba(85,136,204,0.05)', ember: '0 0 15px rgba(255,106,0,0.08), 0 0 5px rgba(255,106,0,0.05)', portal: '0 0 18px rgba(170,85,255,0.1), 0 0 6px rgba(170,85,255,0.06)', hologram: '0 0 15px rgba(167,139,250,0.08), 0 0 5px rgba(167,139,250,0.05)', matrix: '0 0 18px rgba(0,255,65,0.06), 0 0 6px rgba(0,255,65,0.04)', celestial: '0 0 18px rgba(212,175,55,0.08), 0 0 6px rgba(212,175,55,0.05)' }
var SKIN_GLOW_HOVER: Record<string, string> = { ivory: 'none', midnight: '0 0 30px rgba(85,136,204,0.25), 0 0 12px rgba(85,136,204,0.15)', ember: '0 0 30px rgba(255,106,0,0.25), 0 0 12px rgba(255,106,0,0.15)', portal: '0 0 35px rgba(170,85,255,0.3), 0 0 14px rgba(170,85,255,0.18)', hologram: '0 0 30px rgba(167,139,250,0.25), 0 0 12px rgba(167,139,250,0.15)', matrix: '0 0 35px rgba(0,255,65,0.2), 0 0 14px rgba(0,255,65,0.12)', celestial: '0 0 35px rgba(212,175,55,0.25), 0 0 14px rgba(212,175,55,0.15)' }

var LIBRARY_SKINS = ['ember', 'portal', 'hologram', 'matrix', 'celestial']

// v3.2: Prioritize celestial over matrix when both are owned
function getVaultCapacity(ownedSkins: string[]): { cap: number; unlimited: boolean; skinId: string } {
  var best = 10; var bestSkin = 'ivory'; var hasUnlimited = false; var unlimitedSkin = ''
  for (var i = 0; i < ownedSkins.length; i++) {
    var s = ownedSkins[i]; var c = SKIN_CAPACITY[s]
    if (c === undefined) continue
    if (c === -1) { hasUnlimited = true; unlimitedSkin = s }
    if (c > best) { best = c; bestSkin = s }
  }
  if (hasUnlimited) {
    var finalSkin = ownedSkins.includes('celestial') ? 'celestial' : unlimitedSkin
    return { cap: -1, unlimited: true, skinId: finalSkin }
  }
  return { cap: best, unlimited: false, skinId: bestSkin }
}

var preClick: HTMLAudioElement | null = null
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }

function NavBtn({ href, icon }: { href: string; icon: React.ReactNode }) { var [hovered, setHovered] = useState(false); var [pressed, setPressed] = useState(false); var active = hovered || pressed; function doPress() { playClick(); setPressed(true); setTimeout(function () { setPressed(false) }, 150) } var btnStyle: React.CSSProperties = { position: 'relative', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.1)' : 'scale(1)', textDecoration: 'none' }; return (<a href={href} style={btnStyle} onClick={function (e) { e.preventDefault(); doPress(); setTimeout(function () { window.location.href = href }, 80) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}><div style={{ position: 'absolute', inset: '-1.5px', borderRadius: '50%', background: PLATINUM_RING, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease', zIndex: 0, animation: hovered ? 'navRingRotate 3s linear infinite' : 'none', filter: pressed ? 'brightness(1.3)' : 'none' }} /><div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} /><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(130,141,152,0.22)', opacity: active ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 2, pointerEvents: 'none' }} /><div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div></a>) }
function IconProfile({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 00-16 0"/></svg>) }
function IconLibrary({ color }: { color: string }) { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>) }
function IconBell({ color, badge }: { color: string; badge?: number }) { return (<div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>{badge && badge > 0 ? <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', fontSize: '8px', fontWeight: 800, borderRadius: '7px', padding: '1px 4px', minWidth: '12px', textAlign: 'center' as const, lineHeight: '12px' }}>{badge > 9 ? '9+' : badge}</span> : null}</div>) }

function formatCategory(cat: string): string { if (!cat) return ''; if (cat === 'ai') return 'AI'; if (cat === 'diy/making') return 'DIY / Making'; return cat.split(/[-/]/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1) }).join(' / ') }

type SavedUrl = { id: string; url_id: string; url: string; title: string | null; domain: string | null; category: string | null; created_at: string }

function SavedUrlCard({ item, onRemove, onView, diceSkin }: { item: SavedUrl; onRemove: (urlId: string) => void; onView: (url: string) => void; diceSkin: string }) {
  var [hovered, setHovered] = useState(false)
  var [removeHovered, setRemoveHovered] = useState(false)
  var [eyeHovered, setEyeHovered] = useState(false)
  var showSkinEffect = diceSkin !== 'ivory'
  return (
    <div onPointerEnter={function (e) { if (e.pointerType === 'mouse') setHovered(true) }} onPointerLeave={function () { setHovered(false) }}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid ' + (hovered ? 'rgba(130,141,152,0.18)' : 'rgba(255,255,255,0.08)'), borderRadius: '14px', padding: 0, transition: 'all 0.25s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: hovered ? '0 0 20px rgba(130,141,152,0.06)' : 'none' }}
      onClick={function () { window.open(item.url, '_blank', 'noopener,noreferrer') }}>
      {showSkinEffect && (<div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '14px' }}><CardSkinEffects skinId={diceSkin as any} opacity={1} /></div>)}
      <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#d0d4d9', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.domain || item.url}</div>
            <div style={{ fontSize: '11px', color: '#565F67', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.domain || item.url}</div>
            {item.category && (function () { var cat = item.category.toLowerCase(); var isLeg = cat === 'legendary'; var isEpic = cat === 'epic'; var isRare = cat === 'rare'; var pillColor = isLeg ? '#d4af37' : isEpic ? '#a78bfa' : isRare ? '#60a5fa' : '#828D98'; var pillBg = isLeg ? 'rgba(212,175,55,0.08)' : isEpic ? 'rgba(167,139,250,0.08)' : isRare ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.04)'; var pillBorder = isLeg ? 'rgba(212,175,55,0.25)' : isEpic ? 'rgba(167,139,250,0.2)' : isRare ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)'; return (<div style={{ marginTop: '6px', display: 'inline-block', fontSize: '10px', fontWeight: 600, color: pillColor, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: pillBg, border: '1px solid ' + pillBorder }}>{formatCategory(item.category)}</div>) })()}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button onClick={function (e) { e.stopPropagation(); onView(item.url) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setEyeHovered(true) }} onPointerLeave={function () { setEyeHovered(false) }}
              style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid ' + (eyeHovered ? 'rgba(168,178,189,0.25)' : 'rgba(255,255,255,0.06)'), background: eyeHovered ? 'rgba(168,178,189,0.08)' : 'transparent', color: eyeHovered ? '#A8B2BD' : '#3D444A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button onClick={function (e) { e.stopPropagation(); onRemove(item.url_id) }} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setRemoveHovered(true) }} onPointerLeave={function () { setRemoveHovered(false) }}
              style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid ' + (removeHovered ? 'rgba(255,100,100,0.25)' : 'rgba(255,255,255,0.06)'), background: removeHovered ? 'rgba(255,100,100,0.08)' : 'transparent', color: removeHovered ? '#ff6464' : '#3D444A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.2s ease', padding: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VaultPage() {
  var [saves, setSaves] = useState<SavedUrl[]>([])
  var [loading, setLoading] = useState(true)
  var [cBtnHovered, setCBtnHovered] = useState(false)
  var [cBtnPressed, setCBtnPressed] = useState(false)
  var cActive = cBtnHovered || cBtnPressed
  var [ownedSkins, setOwnedSkins] = useState<string[]>(['ivory'])
  var [viewingUrl, setViewingUrl] = useState<string | null>(null)
  var [statsHovered, setStatsHovered] = useState(false)
  var [diceSkin, setDiceSkin] = useState('ivory')
  var [unreadNotifCount, setUnreadNotifCount] = useState(0)

  var userHasLibrary = ownedSkins.some(function (s) { return LIBRARY_SKINS.includes(s) })

  useEffect(function () {
    var savedOwned = localStorage.getItem('chance_owned_skins')
    if (savedOwned) { try { var parsed = JSON.parse(savedOwned); if (Array.isArray(parsed)) { if (!parsed.includes('ivory')) parsed.unshift('ivory'); setOwnedSkins(parsed) } } catch (e) {} }
    var savedSkin = localStorage.getItem('chance_dice_skin'); if (savedSkin) setDiceSkin(savedSkin)
    ;(async function () {
      try {
        var userId = await getEffectiveUserId()
        if (!userId) { setLoading(false); return }
        fetch('/api/notifications?session_id=' + userId + '&count=1').then(function (r) { return r.json() }).then(function (d) { setUnreadNotifCount(d.unread_count || 0) }).catch(function () {})
        var { data, error } = await supabase.from('vault_saves').select('id, url_id, created_at, urls(url, title, domain, category)').eq('user_id', userId).order('created_at', { ascending: false })
        if (data && !error) {
          var mapped = data.map(function (row: any) {
            var u = row.urls || {}
            return { id: row.id, url_id: row.url_id, url: u.url || '', title: u.title || null, domain: u.domain || null, category: u.category || null, created_at: row.created_at }
          }).filter(function (item: SavedUrl) { return item.url })
          setSaves(mapped)
        }
      } catch (e) { console.error('Vault load error:', e) }
      setLoading(false)
    })()
  }, [])

  var vaultInfo = getVaultCapacity(ownedSkins)
  var capColor = SKIN_COLOR[vaultInfo.skinId] || '#f5f0e8'
  var atCapacity = !vaultInfo.unlimited && saves.length >= vaultInfo.cap

  async function handleRemove(urlId: string) {
    playClick()
    var userId = await getEffectiveUserId()
    if (!userId) return
    await supabase.from('vault_saves').delete().eq('url_id', urlId).eq('user_id', userId)
    setSaves(function (prev) { return prev.filter(function (s) { return s.url_id !== urlId }) })
  }

  function handleView(url: string) {
    playClick()
    setViewingUrl(url)
  }

  function handleStartRolling() {
    playClick(); setCBtnPressed(true)
    try { var ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {}
    setTimeout(function () { setCBtnPressed(false) }, 150); window.location.href = '/feed'
  }

  if (loading) return (<div style={{ minHeight: '100vh', background: '#07070c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/logo-c.png" alt="Chance" style={{ width: '48px', height: '48px', opacity: 0.3 }} /></div>)

  return (
    <div style={{ minHeight: '100vh', background: '#07070c', color: '#A8B2BD', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes vaultFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes navRingRotate { to { transform: rotate(360deg); } }
        @keyframes ringRotate { to { transform: rotate(360deg); } }
        @keyframes capShimmer { 0% { background-position: 200% 50%; } 100% { background-position: -200% 50%; } }
      `}</style>

      {viewingUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: '#07070c', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(7,7,12,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <button onClick={function () { setViewingUrl(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: '#A8B2BD', fontSize: '12px', fontWeight: 600, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <div style={{ fontSize: '11px', color: '#565F67', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%', textAlign: 'right' }}>{viewingUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</div>
          </div>
          <iframe src={viewingUrl} style={{ flex: 1, width: '100%', border: 'none', background: '#07070c' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Saved site" />
        </div>
      )}

      <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 35, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <NavBtn href="/feed" icon={<img src="/logo-c.png" alt="Roll" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.85 }} />} />
        {userHasLibrary && <NavBtn href="/library" icon={<IconLibrary color="#A8B2BD" />} />}
        <NavBtn href="/notifications" icon={<IconBell color="#A8B2BD" badge={unreadNotifCount} />} />
        <NavBtn href="/profile" icon={<IconProfile color="#A8B2BD" />} />
      </div>

      <div style={{ maxWidth: '560px', width: '100%', padding: '48px 16px 40px', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', animation: 'vaultFadeIn 0.4s ease-out', marginBottom: '24px', paddingTop: '12px' }}>
          <img src="/logo-c.png" alt="Chance" style={{ width: '56px', height: '56px', margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#A8B2BD', margin: '0 0 4px', letterSpacing: '5px', textTransform: 'uppercase' }}>The Vault</h1>
          <p style={{ fontSize: '12px', color: '#565F67', margin: 0 }}>{saves.length} saved {saves.length === 1 ? 'site' : 'sites'}</p>
        </div>

        <div onPointerEnter={function (e) { if (e.pointerType === 'mouse') setStatsHovered(true) }} onPointerLeave={function () { setStatsHovered(false) }} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(1px) saturate(126%)', border: '1px solid ' + (SKIN_BORDER[vaultInfo.skinId] || 'rgba(255,255,255,0.11)'), borderRadius: '16px', boxShadow: (atCapacity || statsHovered) ? (SKIN_GLOW_HOVER[vaultInfo.skinId] || 'none') : (SKIN_GLOW[vaultInfo.skinId] || 'none'), display: 'flex', alignItems: 'center', padding: '16px', marginBottom: '28px', animation: 'vaultFadeIn 0.4s ease-out 0.1s both', transition: 'border-color 0.3s ease, box-shadow 0.3s ease', position: 'relative', overflow: 'hidden' }}>
          {atCapacity && (<div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, ' + capColor + '15, ' + capColor + '25, ' + capColor + '15, transparent)', animation: 'capShimmer 3s ease-in-out infinite', pointerEvents: 'none' }} />)}
          <div style={{ flex: 1, textAlign: 'left', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Saved</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e0e4e8' }}>{saves.length}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#828D98', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Categories</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e0e4e8' }}>{new Set(saves.map(function (s) { return s.category }).filter(Boolean)).size}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'right', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: capColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Capacity</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: capColor }}>{vaultInfo.unlimited ? '\u221E' : atCapacity ? saves.length + '/' + vaultInfo.cap : vaultInfo.cap}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', animation: 'vaultFadeIn 0.4s ease-out 0.15s both' }}>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#828D98' }}>Your Saves</span>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
        </div>

        {saves.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'vaultFadeIn 0.4s ease-out 0.2s both' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3D444A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>
            <p style={{ color: '#565F67', fontSize: '14px', marginBottom: '8px' }}>Your vault is empty</p>
            <p style={{ color: '#3D444A', fontSize: '12px', margin: 0 }}>Save sites from the feed to find them here</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'vaultFadeIn 0.4s ease-out 0.2s both' }}>
          {saves.map(function (item) { return (<SavedUrlCard key={item.id} item={item} onRemove={handleRemove} onView={handleView} diceSkin={diceSkin} />) })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px', paddingBottom: '20px', animation: 'vaultFadeIn 0.4s ease-out 0.3s both' }}>
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
