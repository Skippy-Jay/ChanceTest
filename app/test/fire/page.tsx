'use client'
// app/test/fire/page.tsx — Fire Dice 3D Test Page
// Standalone test for the double-streak fire system
// Deploy to chanceapp.io/test/fire to visually verify
// v1: Three.js particle fire + atmosphere glow + inferno escalation
import { useState, useEffect, useRef, useCallback } from 'react'

var FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif"

export default function FireTestPage() {
  var canvasRef = useRef<HTMLCanvasElement>(null)
  var cleanupRef = useRef<(() => void) | null>(null)
  var fireStateRef = useRef<'none' | 'fire' | 'inferno'>('none')
  var transitionRef = useRef<'idle' | 'igniting' | 'petering'>('idle')
  var fireIntensityRef = useRef(0) // 0 = off, 1 = full fire, 2 = inferno
  var [fireState, setFireState] = useState<'none' | 'fire' | 'inferno'>('none')
  var [info, setInfo] = useState('Press Fire to ignite')

  var setFire = useCallback(function (state: 'none' | 'fire' | 'inferno') {
    fireStateRef.current = state
    setFireState(state)
    if (state === 'none') {
      transitionRef.current = 'petering'
      setInfo('Fire petering out...')
    } else if (state === 'fire') {
      transitionRef.current = 'igniting'
      setInfo('FIRE — 2nd consecutive double!')
    } else {
      transitionRef.current = 'igniting'
      setInfo('INFERNO — Triple double!')
    }
  }, [])

  useEffect(function () {
    if (!canvasRef.current) return
    var disposed = false
    var canvas = canvasRef.current

    ;(async function () {
      var THREE = await import('three')
      var BufferGeometryUtils = await import('three/examples/jsm/utils/BufferGeometryUtils.js')

      // ── Renderer ──
      var renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, canvas: canvas })
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.4
      renderer.setClearColor(0x07070c)

      var scene = new THREE.Scene()
      var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.set(0, 4, 10)
      camera.lookAt(0, 0, 0)

      function updateSize() {
        if (disposed) return
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
      updateSize()
      window.addEventListener('resize', updateSize)

      // ── Lighting ──
      var keyLight = new THREE.PointLight(0xfff8f0, 1.6)
      keyLight.position.set(8, 15, 8)
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(2048, 2048)
      scene.add(keyLight)

      var fillLight = new THREE.PointLight(0xc8d8ee, 0.5)
      fillLight.position.set(-6, 8, -2)
      scene.add(fillLight)

      scene.add(new THREE.AmbientLight(0x151820, 0.45))
      scene.add(new THREE.HemisphereLight(0xa8b2bd, 0x07070c, 0.15))

      // Fire-specific lights
      var fireLight1 = new THREE.PointLight(0xff4400, 0)
      fireLight1.position.set(0, 2, 3)
      scene.add(fireLight1)

      var fireLight2 = new THREE.PointLight(0xff6600, 0)
      fireLight2.position.set(-2, 1, -1)
      scene.add(fireLight2)

      var fireLight3 = new THREE.PointLight(0xff2200, 0)
      fireLight3.position.set(2, 3, -2)
      scene.add(fireLight3)

      // Inferno extra glow
      var infernoLight = new THREE.PointLight(0xff8800, 0)
      infernoLight.position.set(0, 0, 0)
      scene.add(infernoLight)

      // Floor
      var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.ShadowMaterial({ opacity: 0.2 })
      )
      floor.receiveShadow = true
      floor.position.y = -1.5
      floor.rotation.x = -Math.PI / 2
      scene.add(floor)

      // ── Dice Geometry (EXACT from DiceRoll.tsx) ──
      var params = { segments: 40, edgeRadius: 0.12, notchRadius: 0.17, notchDepth: 0.1 }

      function createBoxGeometry() {
        var geo: any = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments)
        var pos = geo.attributes.position; var half = 0.5 - params.edgeRadius
        var nw = function (v: number) { v = (1 / params.notchRadius) * v; v = Math.PI * Math.max(-1, Math.min(1, v)); return params.notchDepth * (Math.cos(v) + 1) }
        var n = function (xy: [number, number]) { return nw(xy[0]) * nw(xy[1]) }; var o = 0.23
        for (var i = 0; i < pos.count; i++) {
          var ox = pos.getX(i), oy = pos.getY(i), oz = pos.getZ(i)
          var face = -1
          if (oy === 0.5) face = 0; else if (oy === -0.5) face = 5; else if (ox === 0.5) face = 1; else if (ox === -0.5) face = 4; else if (oz === 0.5) face = 2; else if (oz === -0.5) face = 3
          var p = new THREE.Vector3(ox, oy, oz); var sub = new THREE.Vector3(Math.sign(p.x), Math.sign(p.y), Math.sign(p.z)).multiplyScalar(half); var add = new THREE.Vector3().subVectors(p, sub)
          if (Math.abs(ox) > half && Math.abs(oy) > half && Math.abs(oz) > half) { add.normalize().multiplyScalar(params.edgeRadius); p = sub.add(add) }
          else if (Math.abs(ox) > half && Math.abs(oy) > half) { add.z = 0; add.normalize().multiplyScalar(params.edgeRadius); p.x = sub.x + add.x; p.y = sub.y + add.y }
          else if (Math.abs(ox) > half && Math.abs(oz) > half) { add.y = 0; add.normalize().multiplyScalar(params.edgeRadius); p.x = sub.x + add.x; p.z = sub.z + add.z }
          else if (Math.abs(oy) > half && Math.abs(oz) > half) { add.x = 0; add.normalize().multiplyScalar(params.edgeRadius); p.y = sub.y + add.y; p.z = sub.z + add.z }
          if (face === 0) { p.y -= n([ox, oz]) }
          else if (face === 1) { p.x -= n([oy + o, oz + o]); p.x -= n([oy - o, oz - o]) }
          else if (face === 2) { p.z -= n([ox - o, oy + o]); p.z -= n([ox, oy]); p.z -= n([ox + o, oy - o]) }
          else if (face === 3) { p.z += n([ox + o, oy + o]); p.z += n([ox + o, oy - o]); p.z += n([ox - o, oy + o]); p.z += n([ox - o, oy - o]) }
          else if (face === 4) { p.x += n([oy + o, oz + o]); p.x += n([oy + o, oz - o]); p.x += n([oy, oz]); p.x += n([oy - o, oz + o]); p.x += n([oy - o, oz - o]) }
          else if (face === 5) { p.y += n([ox + o, oz + o]); p.y += n([ox + o, oz]); p.y += n([ox + o, oz - o]); p.y += n([ox - o, oz + o]); p.y += n([ox - o, oz]); p.y += n([ox - o, oz - o]) }
          pos.setXYZ(i, p.x, p.y, p.z)
        }
        geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo.computeVertexNormals(); return geo
      }

      function createInnerGeometry() {
        var base = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius); var off = 0.48
        return BufferGeometryUtils.mergeGeometries([base.clone().translate(0, 0, off), base.clone().translate(0, 0, -off), base.clone().rotateX(0.5 * Math.PI).translate(0, -off, 0), base.clone().rotateX(0.5 * Math.PI).translate(0, off, 0), base.clone().rotateY(0.5 * Math.PI).translate(-off, 0, 0), base.clone().rotateY(0.5 * Math.PI).translate(off, 0, 0)], false)
      }

      function createPipCircles(pipMat: any) {
        var group = new THREE.Group()
        var radius = 0.075, segments = 24, offset = 0.505, o = 0.23
        var faces = [
          { positions: [[0, 0]], normal: [0, 1, 0] },
          { positions: [[o, o], [-o, -o]], normal: [1, 0, 0] },
          { positions: [[-o, o], [0, 0], [o, -o]], normal: [0, 0, 1] },
          { positions: [[o, o], [o, -o], [-o, o], [-o, -o]], normal: [0, 0, -1] },
          { positions: [[o, o], [o, -o], [0, 0], [-o, o], [-o, -o]], normal: [-1, 0, 0] },
          { positions: [[o, o], [o, 0], [o, -o], [-o, o], [-o, 0], [-o, -o]], normal: [0, -1, 0] },
        ]
        for (var f = 0; f < faces.length; f++) {
          var face = faces[f]; var nx = face.normal[0], ny = face.normal[1], nz = face.normal[2]
          for (var pi = 0; pi < face.positions.length; pi++) {
            var cg = new THREE.CircleGeometry(radius, segments)
            var pip = new THREE.Mesh(cg, pipMat)
            var u = face.positions[pi][0], v = face.positions[pi][1]
            if (ny !== 0) { pip.position.set(u, ny * offset, v); pip.rotation.x = ny > 0 ? -Math.PI / 2 : Math.PI / 2 }
            else if (nx !== 0) { pip.position.set(nx * offset, u, v); pip.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2 }
            else { pip.position.set(u, v, nz * offset); if (nz < 0) pip.rotation.y = Math.PI }
            group.add(pip)
          }
        }
        return group
      }

      // Use ivory skin as base for testing
      var outerMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.12, metalness: 0.06 })
      var innerMat = new THREE.MeshStandardMaterial({ color: 0x4a545e, roughness: 0.08, metalness: 0.8, side: THREE.DoubleSide })
      var pipMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.1 })

      function createDie() {
        var group = new THREE.Group()
        var outerMesh = new THREE.Mesh(createBoxGeometry(), outerMat.clone())
        outerMesh.castShadow = true
        group.add(outerMesh)
        group.add(new THREE.Mesh(createInnerGeometry(), innerMat))
        group.add(createPipCircles(pipMat))
        return group
      }

      var die1 = createDie()
      die1.position.set(-1.1, 0, 0)
      die1.rotation.set(0.3, 0.7, 0.2)
      scene.add(die1)

      var die2 = createDie()
      die2.position.set(1.1, 0, 0)
      die2.rotation.set(0.5, -0.4, 0.8)
      scene.add(die2)

      var dice = [die1, die2]

      // ═══════════════════════════════════════════════════════════════
      // 3D FIRE PARTICLE SYSTEM
      // ═══════════════════════════════════════════════════════════════

      // Create flame sprite texture — elongated teardrop, not round
      var flameTexSize = 64
      var flameCanvas = document.createElement('canvas')
      flameCanvas.width = flameTexSize
      flameCanvas.height = flameTexSize * 2 // taller canvas
      var fCtx = flameCanvas.getContext('2d')!
      // Teardrop: bright core at bottom-center, fading upward
      var grad = fCtx.createRadialGradient(32, 90, 0, 32, 64, 55)
      grad.addColorStop(0, 'rgba(255,255,220,1)')
      grad.addColorStop(0.1, 'rgba(255,220,100,0.95)')
      grad.addColorStop(0.25, 'rgba(255,140,30,0.7)')
      grad.addColorStop(0.45, 'rgba(255,80,10,0.4)')
      grad.addColorStop(0.65, 'rgba(200,40,0,0.15)')
      grad.addColorStop(0.85, 'rgba(120,20,0,0.05)')
      grad.addColorStop(1, 'rgba(60,10,0,0)')
      fCtx.fillStyle = grad
      fCtx.beginPath()
      // Teardrop path — wide at bottom, narrow at top
      fCtx.moveTo(32, 5)
      fCtx.bezierCurveTo(10, 50, 2, 85, 32, 125)
      fCtx.bezierCurveTo(62, 85, 54, 50, 32, 5)
      fCtx.fill()
      var flameTexture = new THREE.CanvasTexture(flameCanvas)

      // Ember sprite texture (smaller, sharper)
      var emberCanvas = document.createElement('canvas')
      emberCanvas.width = 32
      emberCanvas.height = 32
      var eCtx = emberCanvas.getContext('2d')!
      var eGrad = eCtx.createRadialGradient(16, 16, 0, 16, 16, 14)
      eGrad.addColorStop(0, 'rgba(255,255,200,1)')
      eGrad.addColorStop(0.3, 'rgba(255,160,40,0.8)')
      eGrad.addColorStop(0.7, 'rgba(255,80,0,0.3)')
      eGrad.addColorStop(1, 'rgba(200,40,0,0)')
      eCtx.fillStyle = eGrad
      eCtx.fillRect(0, 0, 32, 32)
      var emberTexture = new THREE.CanvasTexture(emberCanvas)

      // Fire particles per die — sprites that rise from surfaces
      var PARTICLES_PER_DIE = 200
      var EMBERS_PER_DIE = 40

      type FireParticle = {
        sprite: any
        life: number
        maxLife: number
        velocity: any // THREE.Vector3
        basePos: any // THREE.Vector3
        size: number
        dieIndex: number
      }

      var fireParticles: FireParticle[] = []
      var emberParticles: FireParticle[] = []

      // Pre-create sprite pool for flames
      var flameGroup = new THREE.Group()
      scene.add(flameGroup)

      var flameMaterial = new THREE.SpriteMaterial({
        map: flameTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0
      })

      for (var fi = 0; fi < PARTICLES_PER_DIE * 2; fi++) {
        var sprite = new THREE.Sprite(flameMaterial.clone())
        sprite.scale.set(0.01, 0.01, 1)
        sprite.visible = false
        flameGroup.add(sprite)
        fireParticles.push({
          sprite: sprite,
          life: 0,
          maxLife: 0,
          velocity: new THREE.Vector3(),
          basePos: new THREE.Vector3(),
          size: 0,
          dieIndex: fi < PARTICLES_PER_DIE ? 0 : 1
        })
      }

      // Pre-create ember pool
      var emberGroup = new THREE.Group()
      scene.add(emberGroup)

      var emberMaterial = new THREE.SpriteMaterial({
        map: emberTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0
      })

      for (var ei = 0; ei < EMBERS_PER_DIE * 2; ei++) {
        var eSprite = new THREE.Sprite(emberMaterial.clone())
        eSprite.scale.set(0.01, 0.01, 1)
        eSprite.visible = false
        emberGroup.add(eSprite)
        emberParticles.push({
          sprite: eSprite,
          life: 0,
          maxLife: 0,
          velocity: new THREE.Vector3(),
          basePos: new THREE.Vector3(),
          size: 0,
          dieIndex: ei < EMBERS_PER_DIE ? 0 : 1
        })
      }

      // Heat distortion mesh — a large plane in front of camera with subtle vertex animation
      var heatGeo = new THREE.PlaneGeometry(12, 12, 1, 1)
      var heatMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      var heatMesh = new THREE.Mesh(heatGeo, heatMat)
      heatMesh.position.set(0, 0, 4)
      scene.add(heatMesh)

      // Second heat layer for inferno
      var heat2Mat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      var heat2Mesh = new THREE.Mesh(heatGeo.clone(), heat2Mat)
      heat2Mesh.position.set(0, 0.5, 3.5)
      scene.add(heat2Mesh)

      // Third heat layer for triple inferno
      var heat3Mat = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      var heat3Mesh = new THREE.Mesh(heatGeo.clone(), heat3Mat)
      heat3Mesh.position.set(0, -0.3, 3)
      scene.add(heat3Mesh)

      function spawnFlameParticle(dieIdx: number) {
        var die = dice[dieIdx]
        for (var i = 0; i < fireParticles.length; i++) {
          var fp = fireParticles[i]
          if (fp.dieIndex === dieIdx && fp.life <= 0) {
            // Bias spawns toward top and sides (more visible faces)
            var faceWeights = [0.35, 0.15, 0.15, 0.1, 0.15, 0.1] // top, right, front, back, left, bottom
            var roll = Math.random(), cumulative = 0, faceIdx = 0
            for (var fi2 = 0; fi2 < 6; fi2++) { cumulative += faceWeights[fi2]; if (roll < cumulative) { faceIdx = fi2; break } }

            // Tighter spawn — stay close to surface
            var u = (Math.random() - 0.5) * 0.55
            var v = (Math.random() - 0.5) * 0.55
            var localPos = new THREE.Vector3()
            var localVel = new THREE.Vector3()

            if (faceIdx === 0) { localPos.set(u, 0.52, v); localVel.set(0, 1, 0) }
            else if (faceIdx === 1) { localPos.set(0.52, u, v); localVel.set(0.5, 0.8, 0) }
            else if (faceIdx === 2) { localPos.set(u, v, 0.52); localVel.set(0, 0.8, 0.3) }
            else if (faceIdx === 3) { localPos.set(u, v, -0.52); localVel.set(0, 0.8, -0.3) }
            else if (faceIdx === 4) { localPos.set(-0.52, u, v); localVel.set(-0.5, 0.8, 0) }
            else { localPos.set(u, -0.52, v); localVel.set(0, 0.3, 0) }

            var worldPos = localPos.applyMatrix4(die.matrixWorld)
            localVel.applyQuaternion(die.quaternion).normalize()

            // Slower rise — flames stay closer to dice
            var speed = 0.8 + Math.random() * 1.4
            localVel.y += 1.5
            localVel.x += (Math.random() - 0.5) * 0.4
            localVel.z += (Math.random() - 0.5) * 0.4
            localVel.normalize().multiplyScalar(speed)

            fp.sprite.position.copy(worldPos)
            fp.velocity.copy(localVel)
            fp.life = 1
            fp.maxLife = 0.3 + Math.random() * 0.6

            // Mix of sizes: 70% small detail, 20% medium, 10% big background
            var sizeRoll = Math.random()
            if (sizeRoll < 0.7) fp.size = 0.15 + Math.random() * 0.25 // small
            else if (sizeRoll < 0.9) fp.size = 0.35 + Math.random() * 0.35 // medium
            else fp.size = 0.6 + Math.random() * 0.5 // big background flame

            fp.sprite.visible = true

            var hue = Math.random()
            if (hue < 0.3) (fp.sprite.material as any).color.setHex(0xffffaa) // yellow-white hot
            else if (hue < 0.55) (fp.sprite.material as any).color.setHex(0xffcc44) // yellow
            else if (hue < 0.8) (fp.sprite.material as any).color.setHex(0xff6600) // orange
            else (fp.sprite.material as any).color.setHex(0xff2200) // deep red
            return
          }
        }
      }

      function spawnEmber(dieIdx: number) {
        var die = dice[dieIdx]
        for (var i = 0; i < emberParticles.length; i++) {
          var ep = emberParticles[i]
          if (ep.dieIndex === dieIdx && ep.life <= 0) {
            var worldPos = new THREE.Vector3(
              (Math.random() - 0.5) * 0.6,
              0.5 + Math.random() * 0.3,
              (Math.random() - 0.5) * 0.6
            ).applyMatrix4(die.matrixWorld)

            ep.sprite.position.copy(worldPos)
            ep.velocity.set(
              (Math.random() - 0.5) * 1.5,
              2 + Math.random() * 3,
              (Math.random() - 0.5) * 1.5
            )
            ep.life = 1
            ep.maxLife = 1.5 + Math.random() * 2
            ep.size = 0.04 + Math.random() * 0.08
            ep.sprite.visible = true
            ;(ep.sprite.material as any).color.setHex(
              Math.random() < 0.3 ? 0xffdd66 : Math.random() < 0.6 ? 0xff8800 : 0xff4400
            )
            return
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // ANIMATION LOOP
      // ═══════════════════════════════════════════════════════════════
      var elapsed = 0
      var cameraShakeAmount = 0
      var baseCamPos = camera.position.clone()

      function render() {
        if (disposed) return
        var dt = 0.016
        elapsed += dt

        // ── Smooth fire intensity transitions ──
        var targetIntensity = fireStateRef.current === 'inferno' ? 2 : fireStateRef.current === 'fire' ? 1 : 0
        var rampSpeed = transitionRef.current === 'igniting' ? 3.0 : transitionRef.current === 'petering' ? 0.8 : 2.0
        fireIntensityRef.current += (targetIntensity - fireIntensityRef.current) * dt * rampSpeed

        if (transitionRef.current === 'petering' && fireIntensityRef.current < 0.02) {
          fireIntensityRef.current = 0
          transitionRef.current = 'idle'
        }
        if (transitionRef.current === 'igniting' && Math.abs(fireIntensityRef.current - targetIntensity) < 0.05) {
          transitionRef.current = 'idle'
        }

        var intensity = fireIntensityRef.current
        var isOnFire = intensity > 0.05

        // ── Gentle dice rotation ──
        die1.rotation.y += dt * 0.3
        die2.rotation.y -= dt * 0.25
        die1.updateMatrixWorld()
        die2.updateMatrixWorld()

        // ── Spawn fire particles ──
        if (isOnFire) {
          var spawnRate = Math.round(6 + intensity * 14)
          for (var si = 0; si < spawnRate; si++) {
            spawnFlameParticle(si % 2)
          }
          if (Math.random() < 0.25 * intensity) {
            spawnEmber(Math.random() < 0.5 ? 0 : 1)
          }
        }

        // ── Update fire particles ──
        for (var i = 0; i < fireParticles.length; i++) {
          var fp = fireParticles[i]
          if (fp.life <= 0) { fp.sprite.visible = false; continue }

          fp.life -= dt / fp.maxLife
          fp.sprite.position.add(fp.velocity.clone().multiplyScalar(dt))

          // Flames decelerate and wobble gently
          fp.velocity.y -= dt * 0.3
          fp.velocity.x += (Math.random() - 0.5) * dt * 1.2
          fp.velocity.z += (Math.random() - 0.5) * dt * 1.2

          // Size: quick grow then slow shrink — elongated tall shape
          var lifeFrac = 1 - fp.life
          var sizeMultiplier = lifeFrac < 0.15 ? lifeFrac / 0.15 : 1 - Math.pow((lifeFrac - 0.15) / 0.85, 0.7)
          var s = fp.size * sizeMultiplier * Math.min(intensity, 1.2)
          fp.sprite.scale.set(s * 0.7, s * 1.8, 1) // much taller than wide

          // Opacity: fast in, smooth out
          var alpha = fp.life > 0.8 ? (1 - fp.life) / 0.2 : Math.pow(fp.life / 0.8, 0.5)
          ;(fp.sprite.material as any).opacity = alpha * 0.65 * Math.min(intensity, 1)

          if (fp.life <= 0) fp.sprite.visible = false
        }

        // ── Update embers ──
        for (var j = 0; j < emberParticles.length; j++) {
          var ep = emberParticles[j]
          if (ep.life <= 0) { ep.sprite.visible = false; continue }

          ep.life -= dt / ep.maxLife
          ep.sprite.position.add(ep.velocity.clone().multiplyScalar(dt))
          ep.velocity.y -= dt * 0.3 // gentle gravity
          ep.velocity.x += (Math.random() - 0.5) * dt * 3 // wind wobble

          var es = ep.size * ep.life
          ep.sprite.scale.set(es, es, 1)
          ;(ep.sprite.material as any).opacity = ep.life * 0.8 * Math.min(intensity, 1)

          if (ep.life <= 0) ep.sprite.visible = false
        }

        // ── Fire lights ──
        var flicker = Math.sin(elapsed * 8) * 0.15 + Math.sin(elapsed * 13) * 0.1 + Math.sin(elapsed * 21) * 0.05
        fireLight1.intensity = intensity * (0.8 + flicker) * 1.2
        fireLight2.intensity = intensity * (0.5 + flicker * 0.7) * 1.0
        fireLight3.intensity = intensity * (0.6 - flicker * 0.5) * 0.8

        // ── Dice emissive glow — heat the dice body ──
        var heatGlow = Math.min(intensity * 0.4, 0.8)
        dice.forEach(function (die) {
          var outerMesh = die.children[0] as any
          if (outerMesh && outerMesh.material) {
            outerMesh.material.emissive = outerMesh.material.emissive || new THREE.Color()
            outerMesh.material.emissive.setHex(0xff2200)
            outerMesh.material.emissiveIntensity = heatGlow + flicker * 0.1 * intensity
          }
        })

        // ── Heat wash layers (atmosphere) ──
        var breathe = Math.sin(elapsed * 1.5) * 0.3 + Math.sin(elapsed * 2.5) * 0.15
        // Layer 1: fire warmth
        heatMat.opacity = Math.max(0, (intensity - 0.3) * 0.04 + breathe * 0.01 * intensity)
        heatMesh.position.x = Math.sin(elapsed * 0.3) * 0.5
        heatMesh.position.y = Math.cos(elapsed * 0.4) * 0.3

        // Layer 2: inferno pulse
        if (intensity > 1) {
          var i2 = intensity - 1
          heat2Mat.opacity = i2 * 0.03 + breathe * 0.015 * i2
          heat2Mesh.position.x = Math.sin(elapsed * 0.5 + 2) * 0.8
          heat2Mesh.position.y = Math.cos(elapsed * 0.35 + 1) * 0.5
        } else {
          heat2Mat.opacity = 0
        }

        // Layer 3: triple inferno chaos
        if (intensity > 1.5) {
          var i3 = intensity - 1.5
          heat3Mat.opacity = i3 * 0.025 + Math.sin(elapsed * 3) * 0.01 * i3
          heat3Mesh.position.x = Math.cos(elapsed * 0.7 + 4) * 1
          heat3Mesh.position.y = Math.sin(elapsed * 0.45 + 3) * 0.7
        } else {
          heat3Mat.opacity = 0
        }

        // Inferno-specific extra glow
        infernoLight.intensity = Math.max(0, (intensity - 1)) * (1.5 + flicker)
        infernoLight.position.set(
          Math.sin(elapsed * 0.8) * 2,
          1 + Math.sin(elapsed * 1.2) * 0.5,
          Math.cos(elapsed * 0.6) * 2
        )

        // ── Camera shake — intensity-proportional ──
        var targetShake = intensity > 1 ? (intensity - 1) * 0.04 : intensity * 0.01
        cameraShakeAmount += (targetShake - cameraShakeAmount) * dt * 5
        camera.position.x = baseCamPos.x + (Math.random() - 0.5) * cameraShakeAmount
        camera.position.y = baseCamPos.y + (Math.random() - 0.5) * cameraShakeAmount
        camera.lookAt(0, 0, 0)

        renderer.render(scene, camera)
        requestAnimationFrame(render)
      }
      render()

      cleanupRef.current = function () {
        disposed = true
        window.removeEventListener('resize', updateSize)
        renderer.dispose()
        outerMat.dispose()
        innerMat.dispose()
        pipMat.dispose()
        flameTexture.dispose()
        emberTexture.dispose()
        scene.clear()
      }
    })()

    return function () { if (cleanupRef.current) cleanupRef.current() }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#07070c', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Controls overlay */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: fireState === 'inferno' ? '#ff4400' : fireState === 'fire' ? '#ff8800' : '#828D98', fontFamily: FONT, letterSpacing: '0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.8)', transition: 'color 0.3s ease' }}>{info}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={function () { setFire('fire') }} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(255,106,0,0.3)', background: fireState === 'fire' ? 'rgba(255,106,0,0.2)' : 'rgba(255,255,255,0.06)', color: '#ff6a00', fontSize: '14px', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s ease' }}>
            🔥 Fire
          </button>
          <button onClick={function () { setFire('inferno') }} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(255,68,0,0.3)', background: fireState === 'inferno' ? 'rgba(255,68,0,0.25)' : 'rgba(255,255,255,0.06)', color: '#ff4400', fontSize: '14px', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s ease' }}>
            🌋 Inferno
          </button>
          <button onClick={function () { setFire('none') }} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(130,141,152,0.2)', background: 'rgba(255,255,255,0.06)', color: '#828D98', fontSize: '14px', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s ease' }}>
            💨 Peter Out
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#3D444A', fontFamily: FONT }}>
          Fire = 2nd double · Inferno = 3rd double · Peter Out = streak breaks
        </div>
      </div>

      {/* Title */}
      <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#A8B2BD', fontFamily: FONT, letterSpacing: '3px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.8)', margin: 0 }}>Fire Dice Test</h1>
      </div>
    </div>
  )
}
