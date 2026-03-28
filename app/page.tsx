'use client';

import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────
   CHANCE — Landing Page (app/page.tsx)
   210 tiles • 20-col dense mosaic • C logo centre • C button bottom
   NO nav • NO text • Skippy adds text via Figma
   v4: C button routes to /login — login handles setup/profile routing
   ──────────────────────────────────────────────────────────────── */

const TILES: { file: string; size: 'large' | 'tall' | 'small' }[] = [
  { file: 'colorleap.png', size: 'small' },{ file: 'fractyl.png', size: 'small' },{ file: 'faceguesser.png', size: 'small' },{ file: 'brunosimon.png', size: 'small' },{ file: 'coneheads.png', size: 'small' },{ file: 'vintage1.png', size: 'tall' },{ file: 'zoomquilt3v2.png', size: 'large' },{ file: 'sixey.png', size: 'tall' },{ file: 'ducks.png', size: 'large' },{ file: 'lab.png', size: 'small' },
  { file: 'superbad.png', size: 'tall' },{ file: 'eyebeam.png', size: 'small' },{ file: 'perrotin.png', size: 'tall' },{ file: 'cableslarge.png', size: 'large' },{ file: 'geekculture.png', size: 'tall' },{ file: 'minecraftrtstal.png', size: 'small' },{ file: 'gls.png', size: 'small' },{ file: 'tane.png', size: 'small' },{ file: 'alongcomesmary.png', size: 'small' },{ file: 'zenphoto.png', size: 'tall' },
  { file: 'gitcity.png', size: 'small' },{ file: 'visualcinnamon.png', size: 'small' },{ file: 'vintage.png', size: 'small' },{ file: 'webgl.png', size: 'small' },{ file: 'wired.png', size: 'small' },{ file: 'samsyninja.png', size: 'small' },{ file: 'bonappetit.png', size: 'small' },{ file: 'howmanypeopleinspace.png', size: 'large' },{ file: 'cables2.png', size: 'tall' },{ file: 'nervous.png', size: 'small' },
  { file: 'sentry.png', size: 'small' },{ file: 'airpano.png', size: 'small' },{ file: 'thenicestplace.png', size: 'small' },{ file: 'melonland.png', size: 'small' },{ file: 'thibault.png', size: 'large' },{ file: 'zoomquilt2v2.png', size: 'large' },{ file: 'beta.png', size: 'tall' },{ file: 'melankorin.png', size: 'tall' },{ file: 'hosanna1.png', size: 'large' },{ file: 'dustydomains.png', size: 'small' },
  { file: 'deeperblue.png', size: 'small' },{ file: 'jreyes.png', size: 'large' },{ file: 'random.earth.png', size: 'large' },{ file: 'playfulearning.png', size: 'small' },{ file: 'clicking.png', size: 'small' },{ file: 'lineageos.png', size: 'small' },{ file: 'sandbox.png', size: 'small' },{ file: 'opticaltoys.png', size: 'small' },{ file: 'allempires.png', size: 'small' },{ file: 'geek.png', size: 'tall' },
  { file: 'babylonjs.png', size: 'small' },{ file: 'wildlife.png', size: 'small' },{ file: 'neon.png', size: 'small' },{ file: 'csh2.png', size: 'tall' },{ file: 'cameronsworld.png', size: 'small' },{ file: 'theglassroom.png', size: 'small' },{ file: 'skcld.png', size: 'small' },{ file: 'orbfarm.png', size: 'large' },{ file: 'kepler.png', size: 'small' },{ file: '10000yearclock.png', size: 'small' },
  { file: 'peanuts.png', size: 'small' },{ file: 'bitbanging.png', size: 'tall' },{ file: 'rewildingeurope.png', size: 'small' },{ file: 'red.png', size: 'small' },{ file: 'inkarnate.png', size: 'small' },{ file: 'snake.png', size: 'tall' },{ file: '27crags.png', size: 'small' },{ file: 'joshworth.png', size: 'small' },{ file: 'zoomquilt.png', size: 'large' },{ file: 'fabstart.png', size: 'small' },
  { file: 'arkmsworld.png', size: 'tall' },{ file: 'lowtechmagazine.png', size: 'small' },{ file: 'higherlower.png', size: 'small' },{ file: '404pagenotfound.png', size: 'small' },{ file: 'thecut.png', size: 'tall' },{ file: 'screamintothevoid.png', size: 'small' },{ file: 'three.png', size: 'large' },{ file: 'retrope.png', size: 'small' },{ file: 'olympicgames.png', size: 'small' },{ file: 'artic.png', size: 'small' },
  { file: 'volla.png', size: 'small' },{ file: 'openaddresses.png', size: 'small' },{ file: 'newrafael.png', size: 'small' },{ file: 'movenow.png', size: 'small' },{ file: 'newrafael2.png', size: 'small' },{ file: 'longnow.png', size: 'tall' },{ file: 'csh1.png', size: 'small' },{ file: 'thisisand.png', size: 'tall' },{ file: 'spacex.png', size: 'large' },{ file: 'aaron.png', size: 'small' },
  { file: 'madarchitects2.png', size: 'small' },{ file: 'falseknees.png', size: 'small' },{ file: 'spacex2.png', size: 'tall' },{ file: 'druidry.png', size: 'small' },{ file: 'netdisaster.png', size: 'small' },{ file: 'dogtime.png', size: 'tall' },{ file: 'ffffidget.png', size: 'tall' },{ file: 'fishfeeder.png', size: 'tall' },{ file: 'rainfor.png', size: 'large' },{ file: 'aman.png', size: 'small' },
  { file: 'oxbeef.png', size: 'tall' },{ file: 'deepsea.png', size: 'small' },{ file: 'jspaint.png', size: 'tall' },{ file: 'musiclab.png', size: 'tall' },{ file: 'nyan.png', size: 'large' },{ file: 'hillhouse.png', size: 'small' },{ file: 'hackprank.png', size: 'large' },{ file: 'pixelthoughts.png', size: 'large' },{ file: 'strangehorizon.png', size: 'tall' },{ file: 'okogame.png', size: 'large' },
  { file: 'shiznit.png', size: 'small' },{ file: 'ridiculouslyinteresting.png', size: 'small' },{ file: 'click.png', size: 'tall' },{ file: 'tildeverse.png', size: 'small' },{ file: 'exploratorium.png', size: 'small' },{ file: 'ihasabucket.png', size: 'tall' },{ file: 'hmm.png', size: 'small' },{ file: 'makeeverythingok.png', size: 'tall' },{ file: 'morphcode.png', size: 'small' },{ file: 'alpinist.png', size: 'small' },
  { file: 'silvergames.png', size: 'large' },{ file: 'natgeo.png', size: 'small' },{ file: 'designinspiration.png', size: 'small' },{ file: 'stone.png', size: 'small' },{ file: 'gocomics.com.png', size: 'small' },{ file: '29a.png', size: 'tall' },{ file: 'ncase.png', size: 'small' },{ file: 'badnews.png', size: 'small' },{ file: 'sketchfab.png', size: 'small' },{ file: 'sculpt.png', size: 'small' },
  { file: 'vizhub.png', size: 'tall' },{ file: 'dimoda.png', size: 'tall' },{ file: 'imgix.png', size: 'small' },{ file: 'theniceplace.png', size: 'tall' },{ file: 'weirdthings.png', size: 'small' },{ file: 'kira.png', size: 'tall' },{ file: 'ztype.png', size: 'tall' },{ file: 'stereogum.png', size: 'tall' },{ file: 'odds.png', size: 'small' },{ file: 'writtenrealms.png', size: 'large' },
  { file: 'paperplanes.png', size: 'small' },{ file: 'catbounce.png', size: 'large' },{ file: 'randomcolour.png', size: 'small' },{ file: 'militaryhistorynow.png', size: 'tall' },{ file: 'crtstatic.png', size: 'tall' },{ file: 'eggalone.png', size: 'tall' },{ file: 'manyland.png', size: 'large' },{ file: 'cables.png', size: 'tall' },{ file: 'clicktorelease.png', size: 'tall' },{ file: 'archiveorg.png', size: 'small' },
  { file: 'generativehut.png', size: 'large' },{ file: 'montblanc.png', size: 'small' },{ file: 'allure.png', size: 'tall' },{ file: 'madarchitects.png', size: 'small' },{ file: 'explosm.png', size: 'small' },{ file: 'fallingfalling.png', size: 'small' },{ file: 'epic.png', size: 'small' },{ file: 'dam.png', size: 'small' },{ file: 'awakin.png', size: 'small' },{ file: 'darkstarastrology.png', size: 'small' },
  { file: 'libraryofbabel.png', size: 'tall' },{ file: 'blankwindows.png', size: 'tall' },{ file: 'fieldmuseum.png', size: 'small' },{ file: 'playgroundtensor.png', size: 'small' },{ file: 'scaleofuniverse.png', size: 'small' },{ file: 'musicscore.png', size: 'small' },{ file: 'naturemixer.png', size: 'large' },{ file: 'empire.png', size: 'tall' },{ file: 'aman2.png', size: 'large' },{ file: 'awakening.png', size: 'tall' },
  { file: 'mrdoob.png', size: 'small' },{ file: 'naturemixer2.png', size: 'tall' },{ file: 'kumo.png', size: 'tall' },{ file: 'floor796.png', size: 'large' },{ file: 'chiark.png', size: 'small' },{ file: 'lunatool.png', size: 'small' },{ file: 'hooktheory.png', size: 'small' },{ file: 'rainymood.png', size: 'large' },{ file: 'luminist.png', size: 'small' },{ file: 'maproom.png', size: 'tall' },
  { file: 'scrapingbee.png', size: 'small' },{ file: 'milliondollarhomepage.png', size: 'small' },{ file: 'strawberrynose.png', size: 'small' },{ file: 'corgiorgy.png', size: 'small' },{ file: 'my2000stv.png', size: 'small' },{ file: 'symbolics.png', size: 'small' },{ file: '21.png', size: 'small' },{ file: 'artofmanliness.png', size: 'small' },{ file: 'unusualhotelsoftheworld.png', size: 'small' },{ file: 'muchbetterthanthis.png', size: 'small' },
  { file: 'chris.png', size: 'small' },{ file: 'platypus.png', size: 'small' },{ file: 'asbsurd.png', size: 'small' },{ file: 'territorial.png', size: 'large' },{ file: '98.png', size: 'small' },{ file: 'ghoulshit.png', size: 'small' },{ file: 'walletgarden.png', size: 'tall' },{ file: 'creativedevs.png', size: 'tall' },{ file: 'superrare.png', size: 'small' },{ file: 'manysome.png', size: 'small' },
  { file: 'shipmap.png', size: 'small' },{ file: 'webarchive.png', size: 'large' },{ file: 'theocean.png', size: 'large' },{ file: 'cultdeadcow.png', size: 'small' },{ file: 'illusions.png', size: 'small' },{ file: 'superbad2.png', size: 'small' },{ file: 'cube.png', size: 'small' },{ file: 'aaron2.png', size: 'small' }
];

function getSpan(size: string): { col: number; row: number } {
  switch (size) { case 'large': return { col: 2, row: 2 }; case 'tall': return { col: 1, row: 2 }; default: return { col: 1, row: 1 }; }
}

var BG = '#07070c';
var PLATINUM_RING = 'conic-gradient(from 0deg, #828D98, #A8B2BD, #d0d4d9, #ffffff, #d0d4d9, #A8B2BD, #828D98, #6b7580, #828D98)';
var preClick: HTMLAudioElement | null = null;
var preDiceRoll: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') { preClick = new Audio('/sounds/click.mp3'); preClick.preload = 'auto'; preClick.volume = 0.7; preDiceRoll = new Audio('/sounds/dice-roll.mp3'); preDiceRoll.preload = 'auto'; preDiceRoll.volume = 0.8 }
function playClick() { if (!preClick) return; try { var clone = preClick.cloneNode(true) as HTMLAudioElement; clone.volume = preClick.volume; clone.play().catch(function () {}) } catch (e) {} }
function playDiceRoll() { if (!preDiceRoll) return; try { var clone = preDiceRoll.cloneNode(true) as HTMLAudioElement; clone.volume = 0.8; clone.play().catch(function () {}) } catch (e) {} }

export default function LandingPage() {
  var [cols, setCols] = useState(20);
  var [heroVisible, setHeroVisible] = useState(false);
  var [cHovered, setCHovered] = useState(false);
  var [cPressed, setCPressed] = useState(false);
  var cActive = cHovered || cPressed;

  useEffect(function () {
    function handleResize() { var w = window.innerWidth; if (w <= 480) setCols(6); else if (w <= 768) setCols(10); else if (w <= 1024) setCols(14); else if (w <= 1440) setCols(17); else setCols(20) }
    handleResize(); window.addEventListener('resize', handleResize); return function () { window.removeEventListener('resize', handleResize) }
  }, []);

  useEffect(function () { var t = setTimeout(function () { setHeroVisible(true) }, 300); return function () { clearTimeout(t) } }, []);

  function handleCPress() {
    playClick();
    try { var ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); var buf = ctx.createBuffer(1, 1, 22050); var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(0) } catch (e) {}
    setTimeout(function () { window.location.href = '/login' }, 80)
  }

  var gap = 2;

  return (
    <div style={{ background: BG, minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', 1fr)', gridAutoRows: 'calc((100vw - ' + ((cols - 1) * gap) + 'px) / ' + cols + ' * 0.48)', gridAutoFlow: 'dense', gap: gap, width: '100%', background: BG }}>
        {TILES.map(function (tile, i) {
          var span = getSpan(tile.size);
          return (<div key={tile.file + i} style={{ gridColumn: 'span ' + Math.min(span.col, cols), gridRow: 'span ' + span.row, borderRadius: 1, overflow: 'hidden', background: '#111318', opacity: 0, animation: 'tileIn 0.3s ease ' + (20 + i * 4) + 'ms forwards' }}><img src={'/landing/' + tile.file} alt="" loading={i < 40 ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: tile.size === 'tall' ? 'top' : 'center', display: 'block' }} /></div>);
        })}
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(3,4,8,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />
        <img src="/logo-c.png" alt="Chance" style={{ position: 'relative', width: 200, height: 200, objectFit: 'contain', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)', transition: 'opacity 0.6s ease, transform 0.6s ease', filter: 'drop-shadow(0 4px 30px rgba(0,0,0,0.8))' }} />
      </div>

      <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        <button onClick={handleCPress} onPointerEnter={function (e) { if (e.pointerType === 'mouse') setCHovered(true) }} onPointerLeave={function () { setCHovered(false); setCPressed(false) }} onPointerDown={function () { setCPressed(true) }} onPointerUp={function () { setCPressed(false) }}
          style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: 0, outline: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)', transform: cPressed ? 'scale(0.92)' : cActive ? 'scale(1.08)' : 'scale(1)' }}>
          <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: PLATINUM_RING, opacity: 1, zIndex: 0, animation: 'spin 3s linear infinite', filter: cPressed ? 'brightness(1.3)' : cActive ? 'brightness(1.15)' : 'brightness(0.7)' }} />
          <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,17,24,0.97), rgba(22,28,38,0.95))', zIndex: 1 }} />
          <img src="/logo-c.png" alt="Roll" style={{ position: 'relative', zIndex: 3, width: 44, height: 44, objectFit: 'contain', pointerEvents: 'none' }} />
        </button>
      </div>

      <style>{`
        @keyframes tileIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #07070c; overflow-x: hidden; }
      `}</style>
    </div>
  );
}
