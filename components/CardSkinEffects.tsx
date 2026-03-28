'use client'
// components/CardSkinEffects.tsx — Shared canvas-based card skin effects
// Used by Cabinet page, Profile page, and Feed page
// Source: card-skins-v8-final.jsx (approved)
// FIX: opacity now controls effect density/brightness per canvas, not container opacity
// At 0% = returns null (clean glass card shows through)
// Matrix v2: 9px katakana only, columns track head position in pixels,
//   trail drawn behind head, bright head + first 30% of strand, then power-8 fade
//   to ghost. Bottom card fade 35%→70% keeps emoji bar clean. Thin pencil-line strands.
import { useState, useEffect, useRef } from 'react'

export type SkinId = 'ivory' | 'midnight' | 'ember' | 'portal' | 'hologram' | 'matrix' | 'celestial'

function StarfieldCanvas({ opacity }: { opacity: number }) {
  var ref = useRef<HTMLCanvasElement>(null)
  useEffect(function () {
    var c = ref.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return
    var w = (c.width = 400), h = (c.height = 210)
    var count = Math.max(5, Math.round(50 * opacity))
    var stars = Array.from({ length: count }, function () { return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.3, phase: Math.random() * Math.PI * 2, speed: 0.005 + Math.random() * 0.015 } })
    var f: number
    var draw = function (t: number) { ctx.clearRect(0, 0, w, h); stars.forEach(function (s) { var a = (0.3 + 0.7 * Math.abs(Math.sin(s.phase + t * s.speed))) * opacity; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(180,200,255,' + a + ')'; ctx.fill(); if (s.r > 1) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(150,180,255,' + (a * 0.08) + ')'; ctx.fill() } }); f = requestAnimationFrame(draw) }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none' }} />
}

function EmberCanvas({ opacity }: { opacity: number }) {
  var ref = useRef<HTMLCanvasElement>(null)
  useEffect(function () {
    var c = ref.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return
    var w = (c.width = 400), h = (c.height = 210)
    var particles: any[] = []
    var maxParticles = Math.max(3, Math.round(25 * opacity))
    var spawn = function () { return { x: Math.random() * w, y: h + 5, vx: (Math.random() - 0.5) * 0.6, vy: -(0.4 + Math.random() * 1.2), r: 0.8 + Math.random() * 2, life: 1, decay: 0.002 + Math.random() * 0.005, hue: 15 + Math.random() * 30, wobblePhase: Math.random() * Math.PI * 2, wobbleSpeed: 0.02 + Math.random() * 0.03 } }
    for (var i = 0; i < maxParticles; i++) { var p: any = spawn(); p.y = Math.random() * h; p.life = Math.random(); particles.push(p) }
    var f: number
    var draw = function (t: number) { ctx.clearRect(0, 0, w, h); for (var i = particles.length - 1; i >= 0; i--) { var p = particles[i]; p.x += p.vx + Math.sin(p.wobblePhase + t * p.wobbleSpeed) * 0.3; p.y += p.vy; p.life -= p.decay; if (p.life <= 0 || p.y < -10) { particles[i] = spawn(); continue } var a = p.life * 0.9 * opacity; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 60%, ' + a + ')'; ctx.fill(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life * 2.5, 0, Math.PI * 2); ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 50%, ' + (a * 0.2) + ')'; ctx.fill() } f = requestAnimationFrame(draw) }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none' }} />
}

function PortalCanvas({ opacity }: { opacity: number }) {
  var ref = useRef<HTMLCanvasElement>(null)
  useEffect(function () {
    var c = ref.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return
    var w = (c.width = 400), h = (c.height = 210)
    var cx = w * 0.5, cy = h * 0.45
    var count = Math.max(5, Math.round(40 * opacity))
    var particles = Array.from({ length: count }, function () { var angle = Math.random() * Math.PI * 2; var dist = 30 + Math.random() * 100; return { angle: angle, dist: dist, origDist: dist, speed: 0.004 + Math.random() * 0.008, pullSpeed: 0.15 + Math.random() * 0.3, size: 0.5 + Math.random() * 2, hue: 250 + Math.random() * 40, brightness: 50 + Math.random() * 30, alpha: 0.3 + Math.random() * 0.5, trail: [] as { x: number; y: number }[] } })
    var f: number
    var draw = function (t: number) {
      ctx.clearRect(0, 0, w, h)
      for (var ring = 0; ring < 4; ring++) { var radius = 10 + ring * 16; var wobble = Math.sin(t * 0.001 + ring * 0.8) * 2; var alpha = (0.05 - ring * 0.008) * opacity; if (alpha <= 0) continue; ctx.beginPath(); ctx.arc(cx, cy, radius + wobble, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(140, 80, 255, ' + alpha + ')'; ctx.lineWidth = 6 - ring; ctx.stroke() }
      var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25); coreGrad.addColorStop(0, 'rgba(180,120,255,' + (0.15 * opacity) + ')'); coreGrad.addColorStop(0.4, 'rgba(120,60,255,' + (0.06 * opacity) + ')'); coreGrad.addColorStop(1, 'rgba(80,20,200,0)'); ctx.fillStyle = coreGrad; ctx.fillRect(0, 0, w, h)
      particles.forEach(function (p: any) {
        p.angle += p.speed; p.dist -= p.pullSpeed
        if (p.dist < 5) { p.dist = 40 + Math.random() * 100; p.origDist = p.dist; p.angle = Math.random() * Math.PI * 2; p.trail = [] }
        var x = cx + Math.cos(p.angle) * p.dist; var y = cy + Math.sin(p.angle) * p.dist * 0.7
        p.trail.push({ x: x, y: y }); if (p.trail.length > 6) p.trail.shift()
        var lifeRatio = p.dist / p.origDist; var al = p.alpha * (0.3 + lifeRatio * 0.7) * opacity
        ctx.beginPath(); ctx.arc(x, y, p.size * (0.5 + lifeRatio * 0.5), 0, Math.PI * 2); ctx.fillStyle = 'hsla(' + p.hue + ', 80%, ' + p.brightness + '%, ' + al + ')'; ctx.fill()
      })
      f = requestAnimationFrame(draw)
    }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none' }} />
}

function HologramOverlay({ opacity }: { opacity: number }) {
  var [pos, setPos] = useState({ x: 50, y: 50 })
  var sparkleRef = useRef<HTMLCanvasElement>(null)
  useEffect(function () { var t = 0; var i = setInterval(function () { t += 0.025; setPos({ x: 50 + 38 * Math.sin(t * 0.6), y: 50 + 32 * Math.cos(t * 0.8) }) }, 40); return function () { clearInterval(i) } }, [])
  useEffect(function () {
    var c = sparkleRef.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return; var w = (c.width = 400), h = (c.height = 210)
    var sparkles = Array.from({ length: 20 }, function () { return { x: Math.random() * w, y: Math.random() * h, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.003 } })
    var f: number
    var draw = function (t: number) { ctx.clearRect(0, 0, w, h); sparkles.forEach(function (s) { var b = Math.pow(Math.max(0, Math.sin(s.phase + t * s.speed)), 12); if (b < 0.1) return; ctx.globalAlpha = b * 0.6 * opacity; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 0.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = b * 0.15 * opacity; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }); f = requestAnimationFrame(draw) }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  var angle = 105 + pos.x * 1.0
  var gradOp = 0.18 * opacity
  var highlightOp = 0.12 * opacity
  var radialOp = 0.09 * opacity
  return (<>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', background: 'linear-gradient(' + angle + 'deg, rgba(255,30,100,' + gradOp + ') 0%, rgba(255,180,0,' + (gradOp * 0.83) + ') 15%, rgba(50,255,100,' + gradOp + ') 30%, rgba(0,180,255,' + (gradOp * 1.22) + ') 48%, rgba(140,30,255,' + gradOp + ') 62%, rgba(255,50,180,' + (gradOp * 0.83) + ') 78%, rgba(255,200,50,' + gradOp + ') 100%)', mixBlendMode: 'color-dodge' as any }} />
    <div style={{ position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', background: 'linear-gradient(' + (angle + 80) + 'deg, transparent 25%, rgba(255,255,255,' + (0.06 * opacity) + ') 40%, rgba(255,255,255,' + highlightOp + ') 50%, rgba(255,255,255,' + (0.06 * opacity) + ') 60%, transparent 75%)', mixBlendMode: 'overlay' as any }} />
    <div style={{ position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 40% at ' + pos.x + '% ' + (pos.y * 0.7) + '%, rgba(255,255,255,' + radialOp + ') 0%, transparent 55%)' }} />
    <canvas ref={sparkleRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none', mixBlendMode: 'screen' as any }} />
  </>)
}

function MatrixCanvas({ opacity }: { opacity: number }) {
  var ref = useRef<HTMLCanvasElement>(null)
  useEffect(function () {
    var c = ref.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return
    var w = (c.width = 400), h = (c.height = 210)
    var fontSize = 9
    var chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    var colCount = Math.max(3, Math.round(14 * opacity))
    var baseSpeed = 50
    var fadeStartPct = 0.35
    var fadeEndPct = 0.70

    type MatrixCol = { x: number; y: number; speed: number; trail: string[]; swapTimer: number; swapInterval: number }
    var columns: MatrixCol[] = []

    for (var i = 0; i < colCount; i++) {
      var trailLen = 5 + Math.floor(Math.random() * 10)
      var trail: string[] = []
      for (var j = 0; j < trailLen; j++) {
        trail.push(chars[Math.floor(Math.random() * chars.length)])
      }
      columns.push({
        x: (i + 0.5) * (w / colCount),
        y: -Math.random() * h * 1.5,
        speed: (baseSpeed * 0.7) + Math.random() * (baseSpeed * 0.6),
        trail: trail,
        swapTimer: 0,
        swapInterval: 0.08 + Math.random() * 0.25,
      })
    }

    var f: number
    var lastTime = performance.now()

    var draw = function (now: number) {
      var dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      var fadeStart = h * fadeStartPct
      var fadeEnd = h * fadeEndPct

      ctx.clearRect(0, 0, w, h)
      ctx.font = fontSize + 'px monospace'

      for (var i = 0; i < columns.length; i++) {
        var col = columns[i]
        col.y += col.speed * dt

        col.swapTimer += dt
        if (col.swapTimer > col.swapInterval) {
          col.swapTimer = 0
          var si = Math.floor(Math.random() * col.trail.length)
          col.trail[si] = chars[Math.floor(Math.random() * chars.length)]
        }

        var len = col.trail.length

        for (var j = 0; j < len; j++) {
          var cy = col.y - j * fontSize
          if (cy < -fontSize || cy > h + fontSize) continue

          var isHead = (j === 0)
          var posInTrail = j / len

          // Bright head, first 30% stays strong, then power-8 fade to ghost
          var trailAlpha: number
          if (isHead) {
            trailAlpha = 0.9
          } else if (posInTrail < 0.3) {
            trailAlpha = 0.55 * (1 - posInTrail * 0.4)
          } else {
            var tailPos = (posInTrail - 0.3) / 0.7
            trailAlpha = 0.55 * 0.88 * Math.pow(1 - tailPos, 8)
          }

          // Bottom-of-card fade zone
          var bottomFade = 1.0
          if (cy > fadeStart) bottomFade = Math.max(0, 1 - (cy - fadeStart) / (fadeEnd - fadeStart))

          var alpha = trailAlpha * bottomFade * opacity
          if (alpha < 0.01) continue

          if (isHead) {
            ctx.fillStyle = 'rgba(180,255,180,' + alpha + ')'
          } else {
            var g = Math.round(100 + (1 - posInTrail) * 120)
            ctx.fillStyle = 'rgba(0,' + g + ',30,' + alpha + ')'
          }
          ctx.fillText(col.trail[j], col.x, cy)
        }

        // When tail passes bottom, respawn at top
        if (col.y - len * fontSize > h) {
          col.y = -Math.random() * h * 0.5
          col.speed = (baseSpeed * 0.7) + Math.random() * (baseSpeed * 0.6)
          var newLen = 5 + Math.floor(Math.random() * 10)
          col.trail = []
          for (var k = 0; k < newLen; k++) {
            col.trail.push(chars[Math.floor(Math.random() * chars.length)])
          }
        }
      }

      f = requestAnimationFrame(draw)
    }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none' }} />
}

function ConstellationCanvas({ opacity }: { opacity: number }) {
  var ref = useRef<HTMLCanvasElement>(null)
  useEffect(function () {
    var c = ref.current; if (!c) return
    var ctx = c.getContext('2d'); if (!ctx) return; var w = (c.width = 400), h = (c.height = 210)
    var count = Math.max(4, Math.round(18 * opacity))
    var nodes = Array.from({ length: count }, function () { return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.8, phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.01, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15 } })
    var f: number
    var draw = function (t: number) { ctx.clearRect(0, 0, w, h); nodes.forEach(function (n) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1 }); for (var i = 0; i < nodes.length; i++) { for (var j = i + 1; j < nodes.length; j++) { var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y; var dist = Math.sqrt(dx * dx + dy * dy); if (dist < 80) { ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.strokeStyle = 'rgba(212,175,55,' + ((1 - dist / 80) * 0.35 * opacity) + ')'; ctx.lineWidth = 0.6; ctx.stroke() } } } nodes.forEach(function (n) { var a = (0.5 + 0.5 * Math.abs(Math.sin(n.phase + t * n.speed))) * opacity; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(212,175,55,' + a + ')'; ctx.fill(); ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(212,175,55,' + (a * 0.12) + ')'; ctx.fill() }); f = requestAnimationFrame(draw) }
    f = requestAnimationFrame(draw); return function () { cancelAnimationFrame(f) }
  }, [opacity])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, pointerEvents: 'none' }} />
}

export default function CardSkinEffects({ skinId, opacity = 1 }: { skinId: SkinId; opacity?: number }) {
  if (opacity <= 0) return null
  switch (skinId) {
    case 'midnight': return <StarfieldCanvas opacity={opacity} />
    case 'ember': return <EmberCanvas opacity={opacity} />
    case 'portal': return <PortalCanvas opacity={opacity} />
    case 'hologram': return <HologramOverlay opacity={opacity} />
    case 'matrix': return <MatrixCanvas opacity={opacity} />
    case 'celestial': return <ConstellationCanvas opacity={opacity} />
    default: return null
  }
}
