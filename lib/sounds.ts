// lib/sounds.ts — Chance App Sound Effects
// Most sounds via Web Audio API — points earned uses mp3

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// ─── Button click — soft, satisfying tap ───
export function playClick() {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  } catch {}
}

// ─── Points earned — coin sound from mp3 ───
let coinSound: HTMLAudioElement | null = null
if (typeof window !== 'undefined') {
  coinSound = new Audio('/sounds/points.mp3')
  coinSound.preload = 'auto'
  coinSound.volume = 0.5
}

export function playPointsEarned() {
  if (!coinSound) return
  try {
    const clone = coinSound.cloneNode(true) as HTMLAudioElement
    clone.volume = coinSound.volume
    clone.play().catch(() => {})
  } catch {}
}

// ─── Dice roll — tumbling randomized clicks ───
export function playDiceRoll() {
  try {
    const ctx = getCtx()
    const numClicks = 6

    for (let i = 0; i < numClicks; i++) {
      const delay = i * 0.04 + Math.random() * 0.02
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      const freq = 150 + Math.random() * 200
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)

      gain.gain.setValueAtTime(0.03, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.03)
    }

    // Landing thud
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(100, ctx.currentTime + 0.28)
    thud.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.38)
    thudGain.gain.setValueAtTime(0.07, ctx.currentTime + 0.28)
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)
    thud.connect(thudGain)
    thudGain.connect(ctx.destination)
    thud.start(ctx.currentTime + 0.28)
    thud.stop(ctx.currentTime + 0.42)
  } catch {}
}

// ─── Verdict: Alive — very subtle warm confirmation ───
export function playAlive() {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(260, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {}
}

// ─── Verdict: Dead — very subtle low thud ───
export function playDead() {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(125, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {}
}

// ─── Verdict: Sketchy — very subtle cautious wobble ───
export function playSketchy() {
  try {
    const ctx = getCtx()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.setValueAtTime(190, ctx.currentTime + 0.06)
    osc.frequency.setValueAtTime(210, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {}
}
