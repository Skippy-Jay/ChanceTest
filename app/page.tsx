'use client';

import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────
   CHANCE — Landing Page (app/page.tsx)
   Full-width scrollable background • C logo centre • C button at bottom
   NO nav • NO text • Skippy adds text via Figma
   v6: Image locks to browser width, scrolls vertically, button at bottom
   ──────────────────────────────────────────────────────────────── */

var BG = '#07070c';
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)';
var preClick: HTMLAudioElement | null = null;
var preDiceRoll: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7; preDiceRoll = new Audio('/sounds/dice-roll.mp3'); preDiceRoll.preload = 'auto'; preDiceRoll.volume = 0.8 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }
function playDiceRoll() { if (!preDiceRoll) return; try { var clone = preDiceRoll.cloneNode(true) as HTMLAudioElement; clone.volume = 0.8; clone.play().catch(function () {}) } catch (e) {} }

export default function LandingPage() {
  var [heroVisible, setHeroVisible] = useState(false);
  var [cHovered, setCHovered] = useState(false);
  var [cPressed, setCPressed] = useState(false);
  var cActive = cHovered || cPressed;

  useEffect(function () { var t = setTimeout(function () { setHeroVisible(true) }, 300); return function () { clearTimeout(t) } }, []);

  function handleCPress() {
    playClick();
    try { var ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {}
    setTimeout(function () { window.location.href = '/login' }, 80)
  }

  return (
    <div style={{ background: BG, overflowX: 'hidden', position: 'relative' }}>

      {/* ── Full-width scrollable background image ── */}
      <img
        src="/landing/Group 2.png"
        alt=""
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />

      {/* ── C button positioned at bottom of image ── */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20,
      }}>
        <button onClick={handleCPress} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setCHovered(true) }} onPointerLeave={function () { setCHovered(false); setCPressed(false) }} onPointerDown={function () { setCPressed(true) }} onPointerUp={function () { setCPressed(false) }}
          style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: cPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)' }}>
          <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, opacity: 1, zIndex: 0, animation: 'spin 3s linear infinite', filter: cPressed ? 'brightness(1.3)' : cActive ? 'brightness(1.15)' : 'brightness(0.7)' }} />
          <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} />
          <img src="/logo-c.png" alt="Roll" style={{ position: 'relative', zIndex: 3, width: 44, height: 44, objectFit: 'contain', pointerEvents: 'none' }} />
        </button>
      </div>

      {/* ── C logo hero (centered in viewport, stays visible while scrolling) ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(3,4,8,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />
        <img src="/logo-c.png" alt="Chance" style={{ position: 'relative', width: 200, height: 200, objectFit: 'contain', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)', transition: 'opacity 0.6s ease, transform 0.6s ease', filter: 'drop-shadow(0 4px 30px rgba(0,0,0,0.8))' }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #07070c; overflow-x: hidden; }
      `}</style>
    </div>
  );
}
