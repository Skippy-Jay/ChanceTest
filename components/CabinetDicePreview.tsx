'use client'
// components/CabinetDicePreview.tsx — 3D Dice preview for The Cabinet
// Uses EXACT geometry, materials, and effects from DiceRoll.tsx v4.5
// No physics — turntable rotation with velocity-based hover spin
// v2.2: setClearColor fix — prevents white flash during Three.js async init
// v2.1: Persistent renderer fix for Midnight→Ivory and Hologram→Ivory pip bleed
import { useEffect, useRef } from 'react'

export type DiceSkin = 'ivory' | 'midnight' | 'ember' | 'portal' | 'hologram' | 'matrix' | 'celestial'

// EXACT SKIN_CONFIGS from DiceRoll.tsx v4.5 — Matrix opacity boosted for visibility
var SKIN_CONFIGS: Record<DiceSkin, {
  o: number; r: number; m: number; e: number; ei: number; inn: number
  p: number; pr: number; pm: number; pe: number; pei: number
  ai: number; ac: number; trans: boolean; op: number
}> = {
  ivory:    { o:0xf5f0e8, r:0.12, m:0.06, e:0x000000, ei:0,    inn:0x4a545e, p:0x1a1d22, pr:0.3,  pm:0.1,  pe:0x000000, pei:0,    ai:0,    ac:0x000000, trans:false, op:1 },
  midnight: { o:0x0e1228, r:0.08, m:0.35, e:0x061030, ei:0.15, inn:0x060a1e, p:0xc8d0e0, pr:0.2,  pm:0.15, pe:0x5588cc, pei:0.35, ai:0.45, ac:0x4466aa, trans:false, op:1 },
  ember:    { o:0x2a0a02, r:0.15, m:0.1,  e:0xff2200, ei:0.4,  inn:0x1a0800, p:0xff6a00, pr:0.1,  pm:0.08, pe:0xff4400, pei:1.0,  ai:0.65, ac:0xff5500, trans:true,  op:0.55 },
  portal:   { o:0x1a0830, r:0.05, m:0.4,  e:0x220a44, ei:0.2,  inn:0x10062a, p:0xcc99ff, pr:0.12, pm:0.2,  pe:0xaa66ff, pei:0.65, ai:0.6,  ac:0xaa55ff, trans:false, op:1 },
  hologram: { o:0xd8d8d8, r:0.02, m:0.95, e:0x222222, ei:0.1,  inn:0x333344, p:0xffffff, pr:0.0,  pm:0.9,  pe:0xffffff, pei:0.2,  ai:0.4,  ac:0xff0066, trans:false, op:1 },
  matrix:   { o:0x0a0a0a, r:0.08, m:0.25, e:0x003300, ei:0.4,  inn:0x002200, p:0x00ff41, pr:0.1,  pm:0.1,  pe:0x00ff41, pei:1.2,  ai:0.6,  ac:0x00ff41, trans:true, op:0.65 },
  celestial:{ o:0xc9a227, r:0.12, m:0.85, e:0x8b6914, ei:0.12, inn:0x1a1408, p:0x080808, pr:0.3,  pm:0.05, pe:0x000000, pei:0,    ai:0.7,  ac:0xd4af37, trans:false, op:1 },
}

type Props = { skinId: DiceSkin; width?: number; height?: number }

export default function CabinetDicePreview({ skinId, width = 145, height = 210 }: Props) {
  var canvasRef = useRef<HTMLCanvasElement>(null)
  var rendererRef = useRef<any>(null)
  var sceneRef = useRef<any>(null)
  var cameraRef = useRef<any>(null)
  var baseLightsRef = useRef<boolean>(false)
  var accentLightRef = useRef<any>(null)
  var cleanupSceneRef = useRef<(() => void) | null>(null)
  var hoverRef = useRef(false)
  var animIdRef = useRef(0)
  var disposedRef = useRef(false)

  // One-time renderer + scene + camera + base lights setup
  useEffect(function () {
    if (!canvasRef.current) return
    ;(async function () {
      var THREE = await import('three')
      if (!canvasRef.current) return

      var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvasRef.current })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height)
      // v2.2: Set clear color to dark background — prevents white flash during async init
      renderer.setClearColor(0x07070c, 1)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.4
      rendererRef.current = renderer

      var scene = new THREE.Scene()
      sceneRef.current = scene

      var camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50)
      camera.position.set(0, 3, 6)
      camera.lookAt(0, 0, 0)
      cameraRef.current = camera

      // Base lights — permanent, never disposed
      var keyLight = new THREE.PointLight(0xfff8f0, 1.6); keyLight.position.set(8, 15, 8); scene.add(keyLight)
      var fillLight = new THREE.PointLight(0xc8d8ee, 0.5); fillLight.position.set(-6, 8, -2); scene.add(fillLight)
      var specLight = new THREE.PointLight(0xffffff, 0.3); specLight.position.set(3, 3, 10); scene.add(specLight)
      var rimLight = new THREE.PointLight(0xdde4ec, 0.25); rimLight.position.set(0, 5, -10); scene.add(rimLight)
      scene.add(new THREE.AmbientLight(0x151820, 0.45))
      scene.add(new THREE.HemisphereLight(0xa8b2bd, 0x07070c, 0.15))
      var accentLight = new THREE.PointLight(0x000000, 0); accentLight.position.set(-2, 5, 3); scene.add(accentLight)
      accentLightRef.current = accentLight
      baseLightsRef.current = true

      // v2.2: Immediately render one dark frame so canvas isn't blank during skin build
      renderer.render(scene, camera)
    })()

    return function () {
      disposedRef.current = true
      cancelAnimationFrame(animIdRef.current)
      if (cleanupSceneRef.current) cleanupSceneRef.current()
      if (rendererRef.current) rendererRef.current.dispose()
    }
  }, [width, height])

  // Skin-dependent: rebuild dice when skinId changes
  useEffect(function () {
    if (!baseLightsRef.current) {
      var waitId = setInterval(function () {
        if (baseLightsRef.current) { clearInterval(waitId); buildSkin() }
      }, 50)
      return function () { clearInterval(waitId) }
    }
    buildSkin()

    function buildSkin() {
      if (cleanupSceneRef.current) {
        cleanupSceneRef.current()
        cleanupSceneRef.current = null
      }

      var THREE: any = null
      var BufferGeometryUtilsMod: any = null
      var disposed = false
      var sk = SKIN_CONFIGS[skinId]

      var skinMaterials: any[] = []
      var skinGeometries: any[] = []
      var skinTextures: any[] = []
      var surfaceStars: any[] = []
      var holoPipMats: any[] = []
      var holoFaceStars: any[] = []
      var emberInnerData: { pts: any; pos: Float32Array; vel: any[]; cols: Float32Array }[] = []
      var matrixCharsData: any[] = []
      var outerMatRef: any = null
      var elapsed = 0
      var die1: any = null, die2: any = null

      ;(async function () {
        THREE = await import('three')
        BufferGeometryUtilsMod = await import('three/examples/jsm/utils/BufferGeometryUtils.js')
        if (disposed || disposedRef.current) return

        var scene = sceneRef.current
        var renderer = rendererRef.current
        var camera = cameraRef.current
        var accentLight = accentLightRef.current
        if (!scene || !renderer || !camera || !accentLight) return

        renderer.renderLists.dispose()

        accentLight.color.setHex(sk.ac)
        accentLight.intensity = sk.ai

        var extraLights: any[] = []
        if (skinId === 'hologram') {
          ;[0xff0066, 0xff44aa, 0x00ccff].forEach(function (c: number, i: number) {
            var l = new THREE.PointLight(c, i === 0 ? 0.7 : 0.4); l.position.set(i === 0 ? 3 : i === 1 ? -3 : 0, i === 0 ? 4 : i === 1 ? 3 : 6, i === 0 ? 3 : i === 1 ? -2 : -3); scene.add(l); extraLights.push(l)
          })
        }
        if (skinId === 'ember') {
          var eg1 = new THREE.PointLight(0xff3300, 0.8); eg1.position.set(0, 1, 2); scene.add(eg1); extraLights.push(eg1)
          var eg2 = new THREE.PointLight(0xff5500, 0.5); eg2.position.set(0, -1, 0); scene.add(eg2); extraLights.push(eg2)
        }
        if (skinId === 'celestial') {
          var gl1 = new THREE.PointLight(0xffc040, 1.0); gl1.position.set(4, 6, 5); scene.add(gl1); extraLights.push(gl1)
          var gl2 = new THREE.PointLight(0xffaa20, 0.6); gl2.position.set(-4, 4, -3); scene.add(gl2); extraLights.push(gl2)
          var gl3 = new THREE.PointLight(0xffd060, 0.4); gl3.position.set(0, -2, 4); scene.add(gl3); extraLights.push(gl3)
          var gl4 = new THREE.PointLight(0xffe080, 0.5); gl4.position.set(-2, 8, -5); scene.add(gl4); extraLights.push(gl4)
        }
        if (skinId === 'portal') {
          var pl1 = new THREE.PointLight(0x9933ff, 0.6); pl1.position.set(0, 3, 4); scene.add(pl1); extraLights.push(pl1)
        }
        if (skinId === 'matrix') {
          var ml1 = new THREE.PointLight(0x00ff41, 0.9); ml1.position.set(2, 4, 4); scene.add(ml1); extraLights.push(ml1)
          var ml2 = new THREE.PointLight(0x00ff41, 0.6); ml2.position.set(-2, 2, -3); scene.add(ml2); extraLights.push(ml2)
          var ml3 = new THREE.PointLight(0x00cc33, 0.5); ml3.position.set(0, -2, 2); scene.add(ml3); extraLights.push(ml3)
        }

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
          geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo.computeVertexNormals()
          skinGeometries.push(geo)
          return geo
        }

        function createInnerGeometry() {
          var base = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius); var o = 0.48
          var geo = BufferGeometryUtilsMod.mergeGeometries([base.clone().translate(0, 0, o), base.clone().translate(0, 0, -o), base.clone().rotateX(0.5 * Math.PI).translate(0, -o, 0), base.clone().rotateX(0.5 * Math.PI).translate(0, o, 0), base.clone().rotateY(0.5 * Math.PI).translate(-o, 0, 0), base.clone().rotateY(0.5 * Math.PI).translate(o, 0, 0)], false)
          skinGeometries.push(geo)
          return geo
        }

        function createPipCircles(pipMat: any, isHolo: boolean) {
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
          var pipIdx = 0
          for (var f = 0; f < faces.length; f++) {
            var fc = faces[f]; var nx = fc.normal[0], ny = fc.normal[1], nz = fc.normal[2]
            for (var pi = 0; pi < fc.positions.length; pi++) {
              var pM: any
              if (isHolo) {
                pM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.3 })
                pM._hue = pipIdx / 21
                holoPipMats.push(pM)
                skinMaterials.push(pM)
              } else { pM = pipMat }
              var cg = new THREE.CircleGeometry(radius, segments)
              skinGeometries.push(cg)
              var pip = new THREE.Mesh(cg, pM)
              var u = fc.positions[pi][0], v = fc.positions[pi][1]
              if (ny !== 0) { pip.position.set(u, ny * offset, v); pip.rotation.x = ny > 0 ? -Math.PI / 2 : Math.PI / 2 }
              else if (nx !== 0) { pip.position.set(nx * offset, u, v); pip.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2 }
              else { pip.position.set(u, v, nz * offset); if (nz < 0) pip.rotation.y = Math.PI }
              group.add(pip)
              pipIdx++
            }
          }
          return group
        }

        function addSurfaceStars(die: any, count: number) {
          var geo = new THREE.CircleGeometry(0.025, 8)
          skinGeometries.push(geo)
          var faceList = [{ a: 'y', s: 1 }, { a: 'y', s: -1 }, { a: 'x', s: 1 }, { a: 'x', s: -1 }, { a: 'z', s: 1 }, { a: 'z', s: -1 }]
          for (var si = 0; si < count; si++) {
            var fi = Math.floor(Math.random() * 6), af = faceList[fi]
            var u = (Math.random() - 0.5) * 0.65, v = (Math.random() - 0.5) * 0.65
            var mat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
            skinMaterials.push(mat)
            var star: any = new THREE.Mesh(geo.clone(), mat); var off = 0.507
            if (af.a === 'y') { star.position.set(u, af.s * off, v); star.rotation.x = af.s > 0 ? -Math.PI / 2 : Math.PI / 2 }
            else if (af.a === 'x') { star.position.set(af.s * off, u, v); star.rotation.y = af.s > 0 ? Math.PI / 2 : -Math.PI / 2 }
            else { star.position.set(u, v, af.s * off); if (af.s < 0) star.rotation.y = Math.PI }
            star._ts = 1 + Math.random() * 2.5; star._tp = Math.random() * Math.PI * 2
            die.add(star); surfaceStars.push(star)
          }
        }

        function addEmberInner(die: any) {
          var cnt = 50, pos = new Float32Array(cnt * 3), cols = new Float32Array(cnt * 3), vel: any[] = []
          for (var i = 0; i < cnt; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 0.45; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.45; pos[i * 3 + 2] = (Math.random() - 0.5) * 0.45
            var h = Math.random(); cols[i * 3] = 1; cols[i * 3 + 1] = 0.15 + h * 0.5; cols[i * 3 + 2] = h < 0.2 ? 0 : h * 0.04
            vel.push({ bx: pos[i * 3], by: pos[i * 3 + 1], bz: pos[i * 3 + 2], ph: Math.random() * Math.PI * 2, spd: 0.5 + Math.random() * 1.5 })
          }
          var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
          skinGeometries.push(geo)
          var ptsMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true })
          skinMaterials.push(ptsMat)
          var pts = new THREE.Points(geo, ptsMat)
          die.add(pts)
          emberInnerData.push({ pts: pts, pos: pos, vel: vel, cols: cols })
        }

        function addHoloFaceStars(die: any) {
          var geo = new THREE.CircleGeometry(0.012, 6)
          skinGeometries.push(geo)
          var faceList = [{ a: 'y', s: 1 }, { a: 'y', s: -1 }, { a: 'x', s: 1 }, { a: 'x', s: -1 }, { a: 'z', s: 1 }, { a: 'z', s: -1 }]
          for (var si = 0; si < 25; si++) {
            var fi = Math.floor(Math.random() * 6), af = faceList[fi]
            var u = (Math.random() - 0.5) * 0.65, v = (Math.random() - 0.5) * 0.65
            var hue = Math.random(); var c = h2c(hue, 0.9, 0.7)
            var mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
            skinMaterials.push(mat)
            var star: any = new THREE.Mesh(geo.clone(), mat); var off = 0.508
            if (af.a === 'y') { star.position.set(u, af.s * off, v); star.rotation.x = af.s > 0 ? -Math.PI / 2 : Math.PI / 2 }
            else if (af.a === 'x') { star.position.set(af.s * off, u, v); star.rotation.y = af.s > 0 ? Math.PI / 2 : -Math.PI / 2 }
            else { star.position.set(u, v, af.s * off); if (af.s < 0) star.rotation.y = Math.PI }
            star._ts = 2 + Math.random() * 4; star._tp = Math.random() * Math.PI * 2; star._hue = hue
            die.add(star); holoFaceStars.push(star)
          }
        }

        function h2c(h: number, s: number, l: number) {
          var r: number, g: number, b: number
          if (s === 0) { r = g = b = l } else {
            var f = function (p2: number, q2: number, t: number) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t; if (t < 1 / 2) return q2; if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6; return p2 }
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s; var p2 = 2 * l - q
            r = f(p2, q, h + 1 / 3); g = f(p2, q, h); b = f(p2, q, h - 1 / 3)
          }
          return new THREE.Color(r, g, b)
        }

        function addMatrixChars(die: any) {
          var chars = 'アイウエオカキクケコサシスセソタチツテト0123456789'
          var tmpCanvas = document.createElement('canvas')
          tmpCanvas.width = 64; tmpCanvas.height = 64
          var cctx = tmpCanvas.getContext('2d')!
          cctx.fillStyle = '#000'; cctx.fillRect(0, 0, 64, 64)
          cctx.font = '48px monospace'; cctx.fillStyle = '#00ff41'; cctx.textAlign = 'center'; cctx.textBaseline = 'middle'
          var cnt = 30
          for (var i = 0; i < cnt; i++) {
            cctx.fillStyle = '#000'; cctx.fillRect(0, 0, 64, 64)
            cctx.fillStyle = '#00ff41'
            cctx.fillText(chars[Math.floor(Math.random() * chars.length)], 32, 36)
            var tex = new THREE.CanvasTexture(tmpCanvas.cloneNode(true) as HTMLCanvasElement)
            ;(tex.image as HTMLCanvasElement).getContext('2d')!.drawImage(tmpCanvas, 0, 0)
            tex.needsUpdate = true
            skinTextures.push(tex)
            var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
            skinMaterials.push(mat)
            var geo = new THREE.PlaneGeometry(0.1, 0.1)
            skinGeometries.push(geo)
            var mesh: any = new THREE.Mesh(geo, mat)
            mesh.position.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
            mesh._ts = 0.5 + Math.random() * 2; mesh._tp = Math.random() * Math.PI * 2
            die.add(mesh); matrixCharsData.push(mesh)
          }
        }

        var outerMat = new THREE.MeshStandardMaterial({ color: sk.o, roughness: sk.r, metalness: sk.m, emissive: sk.e, emissiveIntensity: sk.ei, transparent: sk.trans, opacity: sk.op })
        var innerMat = new THREE.MeshStandardMaterial({ color: sk.inn, roughness: 0.08, metalness: 0.8, side: THREE.DoubleSide })
        var pipMat = new THREE.MeshStandardMaterial({ color: sk.p, roughness: sk.pr, metalness: sk.pm, emissive: sk.pe, emissiveIntensity: sk.pei })
        skinMaterials.push(outerMat, innerMat, pipMat)
        outerMatRef = outerMat
        var isHolo = skinId === 'hologram'

        function createDiceMesh() {
          var group = new THREE.Group()
          var outerMesh = new THREE.Mesh(createBoxGeometry(), outerMat)
          outerMesh.castShadow = true
          if (sk.trans) outerMesh.renderOrder = 1
          group.add(outerMesh)
          if (!sk.trans) {
            var innerMesh = new THREE.Mesh(createInnerGeometry(), innerMat)
            group.add(innerMesh)
          }
          var pipCircles = createPipCircles(pipMat, isHolo)
          group.add(pipCircles)
          if (skinId === 'midnight') addSurfaceStars(group, 30)
          if (skinId === 'ember') addEmberInner(group)
          if (skinId === 'hologram') addHoloFaceStars(group)
          if (skinId === 'matrix') addMatrixChars(group)
          return group
        }

        die1 = createDiceMesh()
        die2 = createDiceMesh()
        die1.position.set(-0.85, 0, 0)
        die2.position.set(0.85, 0, 0)
        die1.rotation.set(0.4, 0.5, 0.2)
        die2.rotation.set(0.4, 0.5, 0.2)
        scene.add(die1)
        scene.add(die2)

        var hVel = 0, hAngleX = 0, hAngleY = 0, hAngleZ = 0
        var lastTime = performance.now()
        cancelAnimationFrame(animIdRef.current)

        function animate() {
          if (disposed || disposedRef.current) return
          animIdRef.current = requestAnimationFrame(animate)
          var now = performance.now()
          var dt = Math.min((now - lastTime) / 1000, 0.1)
          lastTime = now
          elapsed += dt

          if (hoverRef.current) { hVel = Math.min(hVel + 2.0 * dt, 4.0) } else { hVel *= 0.95; if (hVel < 0.02) hVel = 0 }
          hAngleX += hVel * dt * 1.0; hAngleY += hVel * dt * 1.5; hAngleZ += hVel * dt * 0.5
          var rx = 0.4 + Math.sin(elapsed * 1.5) * 0.3 + hAngleX
          var ry = 0.5 + Math.sin(elapsed * 1.1) * 0.35 + hAngleY
          var rz = 0.2 + Math.cos(elapsed * 1.3) * 0.25 + hAngleZ
          if (die1) die1.rotation.set(rx, ry, rz)
          if (die2) die2.rotation.set(rx, ry, rz)

          surfaceStars.forEach(function (s: any) { s.material.opacity = 0.1 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * s._ts + s._tp), 2) })
          if (skinId === 'midnight') accentLight.intensity = 0.4 + 0.1 * Math.sin(elapsed * 1.2)

          if (skinId === 'ember') {
            accentLight.intensity = 0.8 + 0.35 * Math.sin(elapsed * 2.5)
            if (outerMatRef) outerMatRef.emissiveIntensity = 0.45 + 0.25 * Math.sin(elapsed * 2.0)
            emberInnerData.forEach(function (ed) {
              for (var i = 0; i < ed.vel.length; i++) {
                var v = ed.vel[i]; var sp = v.spd || 1
                ed.pos[i * 3] = v.bx + Math.sin(elapsed * 1.5 * sp + v.ph) * 0.18 + Math.cos(elapsed * 0.9 + v.ph * 2) * 0.06
                ed.pos[i * 3 + 1] = v.by + Math.cos(elapsed * 1.2 * sp + v.ph * 1.3) * 0.15 + Math.sin(elapsed * 2 + v.ph) * 0.05
                ed.pos[i * 3 + 2] = v.bz + Math.sin(elapsed * 1.1 * sp + v.ph * 0.7) * 0.15 + Math.cos(elapsed * 1.8 + v.ph * 3) * 0.04
                var flicker = 0.5 + 0.5 * Math.sin(elapsed * 4 * sp + v.ph * 5)
                ed.cols[i * 3] = 0.9 + 0.1 * flicker; ed.cols[i * 3 + 1] = 0.1 + 0.5 * flicker; ed.cols[i * 3 + 2] = 0.05 * flicker
              }
              ed.pts.geometry.attributes.position.needsUpdate = true; ed.pts.geometry.attributes.color.needsUpdate = true
            })
          }

          if (skinId === 'hologram' && outerMatRef) {
            var hue = (elapsed * 0.15) % 1
            outerMatRef.color.copy(h2c(hue, 0.3, 0.8)); outerMatRef.emissive.copy(h2c((hue + 0.33) % 1, 0.6, 0.3)); outerMatRef.emissiveIntensity = 0.15
            extraLights.forEach(function (l: any, i: number) { l.color.copy(h2c((hue + i * 0.33) % 1, 0.9, 0.5)); l.intensity = 0.3 + 0.15 * Math.sin(elapsed * 2) })
            holoPipMats.forEach(function (pm: any) { pm._hue = (pm._hue + dt * 0.12) % 1; var c = h2c(pm._hue, 0.9, 0.6); pm.color.copy(c); pm.emissive.copy(c); pm.emissiveIntensity = 0.4 + 0.2 * Math.sin(elapsed * 3 + pm._hue * 10) })
            holoFaceStars.forEach(function (s: any) { s._hue = (s._hue + dt * 0.15) % 1; s.material.color.copy(h2c(s._hue, 0.9, 0.7)); s.material.opacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(elapsed * s._ts + s._tp)) })
          }

          if (skinId === 'portal') accentLight.intensity = 0.5 + 0.2 * Math.sin(elapsed * 1.5)

          if (skinId === 'matrix') {
            accentLight.intensity = 0.5 + 0.25 * Math.sin(elapsed * 3)
            if (outerMatRef) outerMatRef.emissiveIntensity = 0.35 + 0.2 * Math.sin(elapsed * 2.5)
            matrixCharsData.forEach(function (m: any) { m.material.opacity = 0.4 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * m._ts + m._tp), 2) })
          }

          if (skinId === 'celestial') accentLight.intensity = 0.6 + 0.15 * Math.sin(elapsed * 1.8)

          renderer.render(scene, camera)
        }
        animate()

        cleanupSceneRef.current = function () {
          disposed = true
          cancelAnimationFrame(animIdRef.current)
          if (die1) scene.remove(die1)
          if (die2) scene.remove(die2)
          extraLights.forEach(function (l: any) { scene.remove(l) })
          skinTextures.forEach(function (t: any) { t.dispose() })
          skinMaterials.forEach(function (m: any) { m.dispose() })
          skinGeometries.forEach(function (g: any) { g.dispose() })
          if (rendererRef.current) rendererRef.current.renderLists.dispose()
        }
      })()
    }

    return function () {
      if (cleanupSceneRef.current) {
        cleanupSceneRef.current()
        cleanupSceneRef.current = null
      }
    }
  }, [skinId])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: width, height: height, borderRadius: 14, cursor: 'pointer', display: 'block', background: '#07070c' }}
      onPointerEnter={function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') hoverRef.current = true }}
      onPointerLeave={function () { hoverRef.current = false }}
      onTouchStart={function () { hoverRef.current = true }}
      onTouchEnd={function () { hoverRef.current = false }}
    />
  )
}
