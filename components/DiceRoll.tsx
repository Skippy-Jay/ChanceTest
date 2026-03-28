'use client'
// components/DiceRoll.tsx — Chance 3D Dice
// v5: Fire system — 3D flame sprites on double streaks (fireMode prop)
//   fireMode='none' (default), 'fire' (2nd consecutive double), 'inferno' (3rd)
//   Flame sprites, ember particles, fire lights, heat wash, camera shake
//   All existing skin effects UNCHANGED from v4.2
// v4.2: Removed internal AudioContext — sound now handled by parent (feed page)
// v4.1: Matrix dice brightness fix — matched to CabinetDicePreview v2 config
import { useEffect, useRef, useCallback } from 'react'

export type DiceSkin = 'ivory' | 'midnight' | 'ember' | 'portal' | 'hologram' | 'matrix' | 'celestial'

type DiceRollProps = {
  onResult: (total: number, dice: number[]) => void
  onFadeComplete: () => void
  skin?: DiceSkin
  fireMode?: 'none' | 'fire' | 'inferno'
}

// Skin material configs — unchanged from v4.2
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

export default function DiceRoll({ onResult, onFadeComplete, skin = 'ivory', fireMode = 'none' }: DiceRollProps) {
  var canvasRef = useRef<HTMLCanvasElement>(null)
  var resultRef = useRef<HTMLDivElement>(null)
  var containerRef = useRef<HTMLDivElement>(null)
  var overlayRef = useRef<HTMLCanvasElement>(null)
  var cleanupRef = useRef<(() => void) | null>(null)
  var hasRolled = useRef(false)
  var fireModeRef = useRef(fireMode)
  var prevFireModeRef = useRef(fireMode)

  // Keep fireMode ref in sync with prop changes + play whoosh on fire ignition
  useEffect(function () {
    fireModeRef.current = fireMode
    if (fireMode === 'fire' && prevFireModeRef.current === 'none') {
      try { var whoosh = new Audio('/sounds/firewhoosh1.mp3'); whoosh.volume = 0.8; whoosh.play().catch(function () {}) } catch (e) {}
    }
    prevFireModeRef.current = fireMode
  }, [fireMode])

  var init = useCallback(async function () {
    if (!canvasRef.current) return

    var THREE = await import('three')
    var BufferGeometryUtils = await import('three/examples/jsm/utils/BufferGeometryUtils.js')
    var CANNON = await import('cannon-es')

    var canvasEl = canvasRef.current
    var resultEl = resultRef.current
    var overlayEl = overlayRef.current
    if (!canvasEl || !resultEl) return

    var sk = SKIN_CONFIGS[skin]

    var params = { numberOfDice: 2, segments: 40, edgeRadius: 0.12, notchRadius: 0.17, notchDepth: 0.1 }
    var diceArray: { mesh: any; body: any; value: number }[] = []
    var FLOOR_Y = -3
    var diceSettled = 0
    var disposed = false
    var isNarrow = window.innerWidth < 500
    var elapsed = 0

    // Skin effect state
    var surfaceStars: any[] = []
    var holoPipMats: any[] = []
    var holoFaceStars: any[] = []
    var emberInnerData: { pts: any; pos: Float32Array; vel: any[]; cols: Float32Array }[] = []
    var portalPts: any = null, ppPos: Float32Array, ppVel: any[] = []
    var matrixCols: any[] = []
    var celestial2D: any[] = []
    var extraLights: any[] = []
    var outerMatRef: any = null
    var ovCtx: CanvasRenderingContext2D | null = null

    // v5: Fire effect state
    var fireIntensity = 0
    type FireParticle = { sprite: any; life: number; maxLife: number; velocity: any; size: number; dieIndex: number }
    var fireParticles: FireParticle[] = []
    var emberFireParticles: FireParticle[] = []
    var fireLight1: any = null, fireLight2: any = null, fireLight3: any = null, infernoLight: any = null
    var heatMat: any = null, heat2Mat: any = null, heat3Mat: any = null
    var heatMesh: any = null, heat2Mesh: any = null, heat3Mesh: any = null
    var flameGroup: any = null, emberFireGroup: any = null
    var baseCamX = 0, baseCamY = 0
    var cameraShakeAmount = 0
    var baseEmissiveHex = sk.e
    var baseEmissiveIntensity = sk.ei

    // Setup 2D overlay for Matrix/Celestial
    if (overlayEl) {
      overlayEl.width = window.innerWidth
      overlayEl.height = window.innerHeight
      ovCtx = overlayEl.getContext('2d')
    }

    var physicsWorld = new CANNON.World({ allowSleep: true, gravity: new CANNON.Vec3(0, -60, 0) })
    physicsWorld.defaultContactMaterial.restitution = 0.3

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvasEl })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4

    var scene = new THREE.Scene()
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 8, 13)
    camera.lookAt(0, FLOOR_Y, 0)
    baseCamX = camera.position.x
    baseCamY = camera.position.y

    function updateSize() { if (disposed) return; camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); if (overlayEl) { overlayEl.width = window.innerWidth; overlayEl.height = window.innerHeight } }
    updateSize()

    // ── Lighting (unchanged from v4.2) ──
    var keyLight = new THREE.PointLight(0xfff8f0, 1.6); keyLight.position.set(8, 15, 8); keyLight.castShadow = true; keyLight.shadow.mapSize.width = 2048; keyLight.shadow.mapSize.height = 2048; keyLight.shadow.camera.near = 2; keyLight.shadow.camera.far = 50; keyLight.shadow.radius = 3; scene.add(keyLight)
    var fillLight = new THREE.PointLight(0xc8d8ee, 0.5); fillLight.position.set(-6, 8, -2); scene.add(fillLight)
    var specLight = new THREE.PointLight(0xffffff, 0.3); specLight.position.set(3, 3, 10); scene.add(specLight)
    var rimLight = new THREE.PointLight(0xdde4ec, 0.25); rimLight.position.set(0, 5, -10); scene.add(rimLight)
    scene.add(new THREE.AmbientLight(0x151820, 0.45))
    scene.add(new THREE.HemisphereLight(0xa8b2bd, 0x07070c, 0.15))

    var accentLight = new THREE.PointLight(sk.ac, sk.ai); accentLight.position.set(-2, 5, 3); scene.add(accentLight)

    // Skin-specific extra lights (unchanged)
    if (skin === 'hologram') { ;[0xff0066, 0xff44aa, 0x00ccff].forEach(function (c: number, i: number) { var l = new THREE.PointLight(c, i === 0 ? 0.7 : 0.4); l.position.set(i === 0 ? 3 : i === 1 ? -3 : 0, i === 0 ? 4 : i === 1 ? 3 : 6, i === 0 ? 3 : i === 1 ? -2 : -3); scene.add(l); extraLights.push(l) }) }
    if (skin === 'ember') { var eg1 = new THREE.PointLight(0xff3300, 0.8); eg1.position.set(0, 1, 2); scene.add(eg1); extraLights.push(eg1); var eg2 = new THREE.PointLight(0xff5500, 0.5); eg2.position.set(0, -1, 0); scene.add(eg2); extraLights.push(eg2) }
    if (skin === 'celestial') { var gl1 = new THREE.PointLight(0xffc040, 1.0); gl1.position.set(4, 6, 5); scene.add(gl1); extraLights.push(gl1); var gl2 = new THREE.PointLight(0xffaa20, 0.6); gl2.position.set(-4, 4, -3); scene.add(gl2); extraLights.push(gl2); var gl3 = new THREE.PointLight(0xffd060, 0.4); gl3.position.set(0, -2, 4); scene.add(gl3); extraLights.push(gl3); var gl4 = new THREE.PointLight(0xffe080, 0.5); gl4.position.set(-2, 8, -5); scene.add(gl4); extraLights.push(gl4) }
    if (skin === 'portal') { var pl1 = new THREE.PointLight(0x9933ff, 0.6); pl1.position.set(0, 3, 4); scene.add(pl1); extraLights.push(pl1) }
    if (skin === 'matrix') { var ml1 = new THREE.PointLight(0x00ff41, 0.9); ml1.position.set(2, 4, 4); scene.add(ml1); extraLights.push(ml1); var ml2 = new THREE.PointLight(0x00ff41, 0.6); ml2.position.set(-2, 2, -3); scene.add(ml2); extraLights.push(ml2); var ml3 = new THREE.PointLight(0x00cc33, 0.5); ml3.position.set(0, -2, 2); scene.add(ml3); extraLights.push(ml3) }

    // v5: Fire lights — skin-aware colours
    var fireLightColors: Record<string, [number, number, number]> = {
      ivory: [0xff4400, 0xff6600, 0xff2200],
      midnight: [0x2244aa, 0x334488, 0x1a3377],       // subtle blue light
      ember: [0xff4400, 0xff6600, 0xff2200],
      portal: [0x6633aa, 0x552299, 0x441188],          // deep purple light
      hologram: [0xcc2266, 0xaa1155, 0x881144],        // deep pink light
      matrix: [0x118822, 0x22aa33, 0x0d6618],          // dark green light
      celestial: [0xcc8811, 0xaa7700, 0x886600],       // warm gold light
    }
    var fLC = fireLightColors[skin] || fireLightColors.ivory
    fireLight1 = new THREE.PointLight(fLC[0], 0); fireLight1.position.set(0, 2, 3); scene.add(fireLight1)
    fireLight2 = new THREE.PointLight(fLC[1], 0); fireLight2.position.set(-2, 1, -1); scene.add(fireLight2)
    fireLight3 = new THREE.PointLight(fLC[2], 0); fireLight3.position.set(2, 3, -2); scene.add(fireLight3)
    infernoLight = new THREE.PointLight(fLC[0], 0); infernoLight.position.set(0, 0, 0); scene.add(infernoLight)

    // Floor (unchanged)
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.ShadowMaterial({ opacity: 0.15 }))
    floor.receiveShadow = true; floor.position.y = FLOOR_Y; floor.quaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * 0.5); scene.add(floor)
    var floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() }); floorBody.position.set(floor.position.x, floor.position.y, floor.position.z); floorBody.quaternion.set(floor.quaternion.x, floor.quaternion.y, floor.quaternion.z, floor.quaternion.w); physicsWorld.addBody(floorBody)

    if (isNarrow) {
      var wallShape = new CANNON.Plane()
      var leftWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape }); leftWall.position.set(-4, 0, 0); leftWall.quaternion.setFromEuler(0, Math.PI * 0.5, 0); physicsWorld.addBody(leftWall)
      var rightWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape }); rightWall.position.set(4, 0, 0); rightWall.quaternion.setFromEuler(0, -Math.PI * 0.5, 0); physicsWorld.addBody(rightWall)
      var backWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape }); backWall.position.set(0, 0, -4); backWall.quaternion.setFromEuler(0, 0, 0); physicsWorld.addBody(backWall)
      var frontWall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape }); frontWall.position.set(0, 0, 6); frontWall.quaternion.setFromEuler(0, Math.PI, 0); physicsWorld.addBody(frontWall)
    }

    // ── Geometry (UNCHANGED from v4.2) ──
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
      var base = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius); var o = 0.48
      return BufferGeometryUtils.mergeGeometries([base.clone().translate(0, 0, o), base.clone().translate(0, 0, -o), base.clone().rotateX(0.5 * Math.PI).translate(0, -o, 0), base.clone().rotateX(0.5 * Math.PI).translate(0, o, 0), base.clone().rotateY(0.5 * Math.PI).translate(-o, 0, 0), base.clone().rotateY(0.5 * Math.PI).translate(o, 0, 0)], false)
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
        var face = faces[f]; var nx = face.normal[0], ny = face.normal[1], nz = face.normal[2]
        for (var pi = 0; pi < face.positions.length; pi++) {
          var pM: any
          if (isHolo) { pM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.3 }); pM._hue = pipIdx / 21; holoPipMats.push(pM) } else { pM = pipMat }
          var cg = new THREE.CircleGeometry(radius, segments)
          var pip = new THREE.Mesh(cg, pM)
          var u = face.positions[pi][0], v = face.positions[pi][1]
          if (ny !== 0) { pip.position.set(u, ny * offset, v); pip.rotation.x = ny > 0 ? -Math.PI / 2 : Math.PI / 2 }
          else if (nx !== 0) { pip.position.set(nx * offset, u, v); pip.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2 }
          else { pip.position.set(u, v, nz * offset); if (nz < 0) pip.rotation.y = Math.PI }
          group.add(pip); pipIdx++
        }
      }
      return group
    }

    // ── Materials (unchanged) ──
    var outerMat = new THREE.MeshStandardMaterial({ color: sk.o, roughness: sk.r, metalness: sk.m, emissive: sk.e, emissiveIntensity: sk.ei, transparent: sk.trans, opacity: sk.op })
    var innerMat = new THREE.MeshStandardMaterial({ color: sk.inn, roughness: 0.08, metalness: 0.8, side: THREE.DoubleSide })
    var pipMat = new THREE.MeshStandardMaterial({ color: sk.p, roughness: sk.pr, metalness: sk.pm, emissive: sk.pe, emissiveIntensity: sk.pei })
    outerMatRef = outerMat
    baseEmissiveHex = sk.e
    baseEmissiveIntensity = sk.ei
    var isHolo = skin === 'hologram'

    function createDiceMesh() {
      var group = new THREE.Group()
      var outerMesh = new THREE.Mesh(createBoxGeometry(), outerMat); outerMesh.castShadow = true; if (sk.trans) outerMesh.renderOrder = 1; group.add(outerMesh)
      if (!sk.trans) { group.add(new THREE.Mesh(createInnerGeometry(), innerMat)) }
      group.add(createPipCircles(pipMat, isHolo))
      if (skin === 'midnight') addSurfaceStars(group, 30, THREE)
      if (skin === 'ember') addEmberInner(group, THREE)
      if (skin === 'hologram') addHoloFaceStars(group, THREE)
      return group
    }

    // ── Skin effects (ALL UNCHANGED from v4.2) ──
    function addSurfaceStars(die: any, count: number, T: any) { var geo = new T.CircleGeometry(0.025, 8); var faceList = [{ a: 'y', s: 1 }, { a: 'y', s: -1 }, { a: 'x', s: 1 }, { a: 'x', s: -1 }, { a: 'z', s: 1 }, { a: 'z', s: -1 }]; for (var si = 0; si < count; si++) { var fi = Math.floor(Math.random() * 6), af = faceList[fi]; var u = (Math.random() - 0.5) * 0.65, v = (Math.random() - 0.5) * 0.65; var mat = new T.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false }); var star = new T.Mesh(geo.clone(), mat); var off = 0.507; if (af.a === 'y') { star.position.set(u, af.s * off, v); star.rotation.x = af.s > 0 ? -Math.PI / 2 : Math.PI / 2 } else if (af.a === 'x') { star.position.set(af.s * off, u, v); star.rotation.y = af.s > 0 ? Math.PI / 2 : -Math.PI / 2 } else { star.position.set(u, v, af.s * off); if (af.s < 0) star.rotation.y = Math.PI }; star._ts = 1 + Math.random() * 2.5; star._tp = Math.random() * Math.PI * 2; die.add(star); surfaceStars.push(star) } }
    function addEmberInner(die: any, T: any) { var cnt = 50, pos = new Float32Array(cnt * 3), cols = new Float32Array(cnt * 3), vel: any[] = []; for (var i = 0; i < cnt; i++) { pos[i * 3] = (Math.random() - 0.5) * 0.45; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.45; pos[i * 3 + 2] = (Math.random() - 0.5) * 0.45; var h = Math.random(); cols[i * 3] = 1; cols[i * 3 + 1] = 0.15 + h * 0.5; cols[i * 3 + 2] = h < 0.2 ? 0 : h * 0.04; vel.push({ bx: pos[i * 3], by: pos[i * 3 + 1], bz: pos[i * 3 + 2], ph: Math.random() * Math.PI * 2, spd: 0.5 + Math.random() * 1.5 }) }; var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(cols, 3)); var pts = new T.Points(geo, new T.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true })); die.add(pts); emberInnerData.push({ pts: pts, pos: pos, vel: vel, cols: cols }) }
    function addHoloFaceStars(die: any, T: any) { var geo = new T.CircleGeometry(0.012, 6); var faceList = [{ a: 'y', s: 1 }, { a: 'y', s: -1 }, { a: 'x', s: 1 }, { a: 'x', s: -1 }, { a: 'z', s: 1 }, { a: 'z', s: -1 }]; for (var si = 0; si < 25; si++) { var fi = Math.floor(Math.random() * 6), af = faceList[fi]; var u = (Math.random() - 0.5) * 0.65, v = (Math.random() - 0.5) * 0.65; var hue = Math.random(); var c = h2c(hue, 0.9, 0.7, T); var mat = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false }); var star = new T.Mesh(geo.clone(), mat); var off = 0.508; if (af.a === 'y') { star.position.set(u, af.s * off, v); star.rotation.x = af.s > 0 ? -Math.PI / 2 : Math.PI / 2 } else if (af.a === 'x') { star.position.set(af.s * off, u, v); star.rotation.y = af.s > 0 ? Math.PI / 2 : -Math.PI / 2 } else { star.position.set(u, v, af.s * off); if (af.s < 0) star.rotation.y = Math.PI }; star._ts = 2 + Math.random() * 4; star._tp = Math.random() * Math.PI * 2; star._hue = hue; die.add(star); holoFaceStars.push(star) } }
    function buildPortalVortex(T: any) { var cnt = 80; ppPos = new Float32Array(cnt * 3); var cols = new Float32Array(cnt * 3); ppVel = []; for (var i = 0; i < cnt; i++) { var a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.5; ppPos[i * 3] = Math.cos(a) * r; ppPos[i * 3 + 1] = (Math.random() - 0.5) * 0.6; ppPos[i * 3 + 2] = Math.sin(a) * r; cols[i * 3] = 0.6; cols[i * 3 + 1] = 0.25; cols[i * 3 + 2] = 0.95; ppVel.push({ a: a, r: r, speed: 0.3 + Math.random() * 0.6, drift: (Math.random() - 0.5) * 0.05, maxR: 1.5 + Math.random() * 1.5 }) }; var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(ppPos, 3)); geo.setAttribute('color', new T.BufferAttribute(cols, 3)); portalPts = new T.Points(geo, new T.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true })); scene.add(portalPts) }
    function initMatrixRain() { matrixCols = []; var chars = '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2\u30E4\u30E6\u30E8\u30E9\u30EA\u30EB\u30EC\u30ED\u30EF\u30F2\u30F3'; var colW = 14, numCols = Math.ceil(window.innerWidth / colW); for (var i = 0; i < numCols; i++) { var len = 5 + Math.floor(Math.random() * 10), trail: string[] = []; for (var j = 0; j < len; j++) trail.push(chars[Math.floor(Math.random() * chars.length)]); matrixCols.push({ x: (i + 0.5) * colW, y: -Math.random() * window.innerHeight * 1.5, speed: 35 + Math.random() * 30, trail: trail, swapTimer: 0, swapInterval: 0.08 + Math.random() * 0.25 }) } }
    function initCelestial2D() { celestial2D = []; for (var i = 0; i < 80; i++) { celestial2D.push({ x: -999, y: -999, vx: 0, vy: 0, life: Math.random() * 3, maxLife: 2 + Math.random() * 3, size: 0.4 + Math.random() * 1.0 }) } }
    function h2c(h: number, s: number, l: number, T: any) { var r: number, g: number, b: number; if (s === 0) { r = g = b = l } else { var f = function (p2: number, q2: number, t: number) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t; if (t < 1 / 2) return q2; if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6; return p2 }; var q = l < 0.5 ? l * (1 + s) : l + s - l * s; var p2 = 2 * l - q; r = f(p2, q, h + 1 / 3); g = f(p2, q, h); b = f(p2, q, h - 1 / 3) }; return new T.Color(r, g, b) }

    if (skin === 'portal') buildPortalVortex(THREE)
    if (skin === 'matrix') initMatrixRain()
    if (skin === 'celestial') initCelestial2D()

    // ═══════════════════════════════════════════════════════════════
    // v5: FIRE PARTICLE SYSTEM INIT
    // ═══════════════════════════════════════════════════════════════
    var FIRE_PARTICLES_PER_DIE = 200
    var FIRE_EMBERS_PER_DIE = 40

    // Flame teardrop texture
    var flameTexSize = 64
    var flameCanvas = document.createElement('canvas')
    flameCanvas.width = flameTexSize
    flameCanvas.height = flameTexSize * 2
    var fCtx = flameCanvas.getContext('2d')!
    var fGrad = fCtx.createRadialGradient(32, 90, 0, 32, 64, 55)
    fGrad.addColorStop(0, 'rgba(255,255,220,1)')
    fGrad.addColorStop(0.1, 'rgba(255,220,100,0.95)')
    fGrad.addColorStop(0.25, 'rgba(255,140,30,0.7)')
    fGrad.addColorStop(0.45, 'rgba(255,80,10,0.4)')
    fGrad.addColorStop(0.65, 'rgba(200,40,0,0.15)')
    fGrad.addColorStop(0.85, 'rgba(120,20,0,0.05)')
    fGrad.addColorStop(1, 'rgba(60,10,0,0)')
    fCtx.fillStyle = fGrad
    fCtx.beginPath()
    fCtx.moveTo(32, 5)
    fCtx.bezierCurveTo(10, 50, 2, 85, 32, 125)
    fCtx.bezierCurveTo(62, 85, 54, 50, 32, 5)
    fCtx.fill()
    var flameTexture = new THREE.CanvasTexture(flameCanvas)

    // Ember texture
    var emberCanvas = document.createElement('canvas')
    emberCanvas.width = 32; emberCanvas.height = 32
    var eCtx = emberCanvas.getContext('2d')!
    var eGrad = eCtx.createRadialGradient(16, 16, 0, 16, 16, 14)
    eGrad.addColorStop(0, 'rgba(255,255,200,1)'); eGrad.addColorStop(0.3, 'rgba(255,160,40,0.8)'); eGrad.addColorStop(0.7, 'rgba(255,80,0,0.3)'); eGrad.addColorStop(1, 'rgba(200,40,0,0)')
    eCtx.fillStyle = eGrad; eCtx.fillRect(0, 0, 32, 32)
    var emberTexture = new THREE.CanvasTexture(emberCanvas)

    // Flame sprite pool
    flameGroup = new THREE.Group(); scene.add(flameGroup)
    var flameMat = new THREE.SpriteMaterial({ map: flameTexture, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })
    for (var fi = 0; fi < FIRE_PARTICLES_PER_DIE * 2; fi++) {
      var fSprite = new THREE.Sprite(flameMat.clone()); fSprite.scale.set(0.01, 0.01, 1); fSprite.visible = false; flameGroup.add(fSprite)
      fireParticles.push({ sprite: fSprite, life: 0, maxLife: 0, velocity: new THREE.Vector3(), size: 0, dieIndex: fi < FIRE_PARTICLES_PER_DIE ? 0 : 1 })
    }

    // Ember sprite pool
    emberFireGroup = new THREE.Group(); scene.add(emberFireGroup)
    var eFireMat = new THREE.SpriteMaterial({ map: emberTexture, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })
    for (var ei = 0; ei < FIRE_EMBERS_PER_DIE * 2; ei++) {
      var eSprite = new THREE.Sprite(eFireMat.clone()); eSprite.scale.set(0.01, 0.01, 1); eSprite.visible = false; emberFireGroup.add(eSprite)
      emberFireParticles.push({ sprite: eSprite, life: 0, maxLife: 0, velocity: new THREE.Vector3(), size: 0, dieIndex: ei < FIRE_EMBERS_PER_DIE ? 0 : 1 })
    }

    // Heat wash meshes — skin-aware colours
    var heatColors: Record<string, [number, number, number]> = {
      ivory: [0xff4400, 0xff6600, 0xff8800],
      midnight: [0x112244, 0x1a3366, 0x223388],       // very subtle dark blue wash
      ember: [0xff4400, 0xff6600, 0xff8800],
      portal: [0x331155, 0x441177, 0x552299],          // deep purple wash
      hologram: [0x661133, 0x882255, 0xaa3377],        // deep pink wash
      matrix: [0x0a3311, 0x114422, 0x1a5533],          // dark green wash
      celestial: [0x664400, 0x886611, 0xaa7722],       // warm dark gold wash
    }
    var hC = heatColors[skin] || heatColors.ivory
    var heatGeo = new THREE.PlaneGeometry(12, 12, 1, 1)
    heatMat = new THREE.MeshBasicMaterial({ color: hC[0], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    heatMesh = new THREE.Mesh(heatGeo, heatMat); heatMesh.position.set(0, 0, 8); scene.add(heatMesh)
    heat2Mat = new THREE.MeshBasicMaterial({ color: hC[1], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    heat2Mesh = new THREE.Mesh(heatGeo.clone(), heat2Mat); heat2Mesh.position.set(0, 0.5, 7.5); scene.add(heat2Mesh)
    heat3Mat = new THREE.MeshBasicMaterial({ color: hC[2], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    heat3Mesh = new THREE.Mesh(heatGeo.clone(), heat3Mat); heat3Mesh.position.set(0, -0.3, 7); scene.add(heat3Mesh)

    function spawnFlame(dieIdx: number) {
      var die = diceArray[dieIdx]?.mesh; if (!die) return
      for (var i = 0; i < fireParticles.length; i++) {
        var fp = fireParticles[i]; if (fp.dieIndex !== dieIdx || fp.life > 0) continue
        var fWeights = [0.35, 0.15, 0.15, 0.1, 0.15, 0.1], roll = Math.random(), cum = 0, fIdx = 0
        for (var fi2 = 0; fi2 < 6; fi2++) { cum += fWeights[fi2]; if (roll < cum) { fIdx = fi2; break } }
        var u = (Math.random() - 0.5) * 0.55, v = (Math.random() - 0.5) * 0.55
        var lp = new THREE.Vector3(), lv = new THREE.Vector3()
        if (fIdx === 0) { lp.set(u, 0.52, v); lv.set(0, 1, 0) }
        else if (fIdx === 1) { lp.set(0.52, u, v); lv.set(0.5, 0.8, 0) }
        else if (fIdx === 2) { lp.set(u, v, 0.52); lv.set(0, 0.8, 0.3) }
        else if (fIdx === 3) { lp.set(u, v, -0.52); lv.set(0, 0.8, -0.3) }
        else if (fIdx === 4) { lp.set(-0.52, u, v); lv.set(-0.5, 0.8, 0) }
        else { lp.set(u, -0.52, v); lv.set(0, 0.3, 0) }
        var wp = lp.applyMatrix4(die.matrixWorld)
        lv.applyQuaternion(die.quaternion).normalize()
        var spd = 0.8 + Math.random() * 1.4
        lv.y += 1.5; lv.x += (Math.random() - 0.5) * 0.4; lv.z += (Math.random() - 0.5) * 0.4
        lv.normalize().multiplyScalar(spd)
        fp.sprite.position.copy(wp); fp.velocity.copy(lv); fp.life = 1; fp.maxLife = 0.3 + Math.random() * 0.6
        var sr = Math.random(); fp.size = sr < 0.7 ? 0.15 + Math.random() * 0.25 : sr < 0.9 ? 0.35 + Math.random() * 0.35 : 0.6 + Math.random() * 0.5
        fp.sprite.visible = true
        // Skin-aware flame colours
        var flameColorSets: Record<string, number[]> = {
          ivory: [0xffffaa, 0xffcc44, 0xff6600, 0xff2200],
          midnight: [0x6688cc, 0x3355aa, 0x223388, 0x112266],       // deep blues, not light
          ember: [0xffffaa, 0xffcc44, 0xff6600, 0xff2200],
          portal: [0xbb88ee, 0x8855cc, 0x6633aa, 0x441188],         // cooler purples
          hologram: [0xffaadd, 0xff66aa, 0xdd3388, 0xaa1166],       // hot pinks
          matrix: [0x88ff88, 0x44dd44, 0x22aa22, 0x117711],         // deeper greens
          celestial: [0xffe8aa, 0xffcc66, 0xddaa33, 0xbb8811],      // warm golds, not orange
        }
        var fColors = flameColorSets[skin] || flameColorSets.ivory
        var hh = Math.random()
        if (hh < 0.3) (fp.sprite.material as any).color.setHex(fColors[0])
        else if (hh < 0.55) (fp.sprite.material as any).color.setHex(fColors[1])
        else if (hh < 0.8) (fp.sprite.material as any).color.setHex(fColors[2])
        else (fp.sprite.material as any).color.setHex(fColors[3])
        return
      }
    }

    function spawnFireEmber(dieIdx: number) {
      var die = diceArray[dieIdx]?.mesh; if (!die) return
      for (var i = 0; i < emberFireParticles.length; i++) {
        var ep = emberFireParticles[i]; if (ep.dieIndex !== dieIdx || ep.life > 0) continue
        var wp = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6).applyMatrix4(die.matrixWorld)
        ep.sprite.position.copy(wp)
        ep.velocity.set((Math.random() - 0.5) * 1.5, 2 + Math.random() * 3, (Math.random() - 0.5) * 1.5)
        ep.life = 1; ep.maxLife = 1.5 + Math.random() * 2; ep.size = 0.04 + Math.random() * 0.08; ep.sprite.visible = true
        ;(ep.sprite.material as any).color.setHex(Math.random() < 0.3 ? 0xffdd66 : Math.random() < 0.6 ? 0xff8800 : 0xff4400)
        return
      }
    }
    // ═══════════════════════════════════════════════════════════════

    function createDice() { var mesh = createDiceMesh(); mesh.position.set(0, 50, 0); scene.add(mesh); var body = new CANNON.Body({ mass: 0.3, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)), sleepTimeLimit: 0.08, angularDamping: 0.3, linearDamping: 0.1 }); body.position.set(0, 50, 0); physicsWorld.addBody(body); return { mesh: mesh, body: body, value: 0 } }
    for (var i = 0; i < params.numberOfDice; i++) { diceArray.push(createDice()) }

    function showResult(total: number, values: number[]) { if (!resultEl) return; var isDouble = values.length === 2 && values[0] === values[1]; var isSnakeEyes = total === 2 && isDouble; var isLegendary = total === 12 && isDouble; if (isSnakeEyes) { resultEl.innerHTML = '<div class="dice-special-snake">Snake Eyes</div>'; resultEl.className = 'dice-result-show' } else if (isLegendary) { resultEl.innerHTML = '<div class="dice-special-legendary">Legendary</div>'; resultEl.className = 'dice-result-show' } else if (isDouble) { resultEl.innerHTML = '<div class="dice-special-double">Double</div>'; resultEl.className = 'dice-result-show' } else { resultEl.innerHTML = ''; resultEl.className = 'dice-result-show' } }
    function startFadeOut() { setTimeout(function () { if (disposed) return; if (resultEl) resultEl.className = 'dice-result-hide'; if (containerRef.current) { containerRef.current.style.transition = 'opacity 0.5s ease-out'; containerRef.current.style.opacity = '0' }; setTimeout(function () { if (!disposed) onFadeComplete() }, 550) }, 2200) }
    function addDiceEvents(dice: any) { dice.body.addEventListener('sleep', function (e: any) { if (disposed) return; dice.body.allowSleep = false; var euler = new CANNON.Vec3(); e.target.quaternion.toEuler(euler); var eps = 0.2; var isZ = function (a: number) { return Math.abs(a) < eps }; var isHP = function (a: number) { return Math.abs(a - 0.5 * Math.PI) < eps }; var isMHP = function (a: number) { return Math.abs(0.5 * Math.PI + a) < eps }; var isPi = function (a: number) { return (Math.abs(Math.PI - a) < eps || Math.abs(Math.PI + a) < eps) }; var r = 0; if (isZ(euler.z)) { if (isZ(euler.x)) r = 1; else if (isHP(euler.x)) r = 4; else if (isMHP(euler.x)) r = 3; else if (isPi(euler.x)) r = 6; else { dice.body.allowSleep = true; return } } else if (isHP(euler.z)) r = 2; else if (isMHP(euler.z)) r = 5; else { dice.body.allowSleep = true; return }; dice.value = r; diceSettled++; if (diceSettled === params.numberOfDice) { var total = 0; var values: number[] = []; for (var j = 0; j < diceArray.length; j++) { var v = diceArray[j].value || 0; total += v; values.push(v) }; showResult(total, values); onResult(total, values); startFadeOut() } }) }
    for (var j = 0; j < diceArray.length; j++) { addDiceEvents(diceArray[j]) }

    // ── Render loop ──
    var animId = 0
    function render() {
      if (disposed) return
      var dt = 0.016
      elapsed += dt
      physicsWorld.fixedStep()
      for (var k = 0; k < diceArray.length; k++) { diceArray[k].mesh.position.copy(diceArray[k].body.position); diceArray[k].mesh.quaternion.copy(diceArray[k].body.quaternion) }

      // ── Skin effect updates (ALL UNCHANGED from v4.2) ──
      surfaceStars.forEach(function (s: any) { s.material.opacity = 0.1 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * s._ts + s._tp), 2) })
      if (skin === 'midnight') accentLight.intensity = 0.4 + 0.1 * Math.sin(elapsed * 1.2)
      if (skin === 'ember') { accentLight.intensity = 0.8 + 0.35 * Math.sin(elapsed * 2.5); if (outerMatRef) outerMatRef.emissiveIntensity = 0.45 + 0.25 * Math.sin(elapsed * 2.0); emberInnerData.forEach(function (ed) { for (var i = 0; i < ed.vel.length; i++) { var v = ed.vel[i]; var sp = v.spd || 1; ed.pos[i * 3] = v.bx + Math.sin(elapsed * 1.5 * sp + v.ph) * 0.18 + Math.cos(elapsed * 0.9 + v.ph * 2) * 0.06; ed.pos[i * 3 + 1] = v.by + Math.cos(elapsed * 1.2 * sp + v.ph * 1.3) * 0.15 + Math.sin(elapsed * 2 + v.ph) * 0.05; ed.pos[i * 3 + 2] = v.bz + Math.sin(elapsed * 1.1 * sp + v.ph * 0.7) * 0.15 + Math.cos(elapsed * 1.8 + v.ph * 3) * 0.04; var flicker = 0.5 + 0.5 * Math.sin(elapsed * 4 * sp + v.ph * 5); ed.cols[i * 3] = 0.9 + 0.1 * flicker; ed.cols[i * 3 + 1] = 0.1 + 0.5 * flicker; ed.cols[i * 3 + 2] = 0.05 * flicker }; ed.pts.geometry.attributes.position.needsUpdate = true; ed.pts.geometry.attributes.color.needsUpdate = true }) }
      if (skin === 'portal' && portalPts && ppPos) { accentLight.intensity = 0.5 + 0.2 * Math.sin(elapsed * 1.5); var avgPX = 0, avgPY = 0, avgPZ = 0; for (var di = 0; di < diceArray.length; di++) { avgPX += diceArray[di].mesh.position.x; avgPY += diceArray[di].mesh.position.y; avgPZ += diceArray[di].mesh.position.z }; avgPX /= diceArray.length; avgPY /= diceArray.length; avgPZ /= diceArray.length; portalPts.position.set(avgPX, avgPY, avgPZ); for (var i = 0; i < ppVel.length; i++) { var v = ppVel[i]; v.a += v.speed * dt; v.r += 0.15 * dt; if (v.r > v.maxR) { v.r = 0.3 + Math.random() * 0.5; v.a = Math.random() * Math.PI * 2; v.maxR = 1.5 + Math.random() * 1.5 }; ppPos[i * 3] = Math.cos(v.a) * v.r; ppPos[i * 3 + 1] += v.drift * dt; if (Math.abs(ppPos[i * 3 + 1]) > 0.5) ppPos[i * 3 + 1] *= 0.99; ppPos[i * 3 + 2] = Math.sin(v.a) * v.r; var br = Math.max(0, 1 - v.r / v.maxR); var co = portalPts.geometry.attributes.color.array; co[i * 3] = 0.5 + br * 0.35; co[i * 3 + 1] = 0.15 + br * 0.3; co[i * 3 + 2] = 0.7 + br * 0.3 }; portalPts.geometry.attributes.position.needsUpdate = true; portalPts.geometry.attributes.color.needsUpdate = true }
      if (skin === 'hologram' && outerMatRef) { var hue = (elapsed * 0.15) % 1; outerMatRef.color.copy(h2c(hue, 0.3, 0.8, THREE)); outerMatRef.emissive.copy(h2c((hue + 0.33) % 1, 0.6, 0.3, THREE)); outerMatRef.emissiveIntensity = 0.15; extraLights.forEach(function (l: any, i: number) { l.color.copy(h2c((hue + i * 0.33) % 1, 0.9, 0.5, THREE)); l.intensity = 0.3 + 0.15 * Math.sin(elapsed * 2) }); holoPipMats.forEach(function (pm: any) { pm._hue = (pm._hue + dt * 0.12) % 1; var c = h2c(pm._hue, 0.9, 0.6, THREE); pm.color.copy(c); pm.emissive.copy(c); pm.emissiveIntensity = 0.4 + 0.2 * Math.sin(elapsed * 3 + pm._hue * 10) }); holoFaceStars.forEach(function (s: any) { s._hue = (s._hue + dt * 0.15) % 1; s.material.color.copy(h2c(s._hue, 0.9, 0.7, THREE)); s.material.opacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(elapsed * s._ts + s._tp)) }) }
      if (skin === 'matrix') { accentLight.intensity = 0.5 + 0.25 * Math.sin(elapsed * 3); if (outerMatRef) outerMatRef.emissiveIntensity = 0.35 + 0.2 * Math.sin(elapsed * 2.5) }
      if (skin === 'celestial') accentLight.intensity = 0.6 + 0.15 * Math.sin(elapsed * 1.8)

      // ═══════════════════════════════════════════════════════════════
      // v5: FIRE EFFECT UPDATE
      // ═══════════════════════════════════════════════════════════════
      var fTarget = fireModeRef.current === 'inferno' ? 2 : fireModeRef.current === 'fire' ? 1 : 0
      var fRamp = fTarget > fireIntensity ? 3.0 : 0.8
      fireIntensity += (fTarget - fireIntensity) * dt * fRamp
      if (fireIntensity < 0.02 && fTarget === 0) fireIntensity = 0
      var fI = fireIntensity
      var isOnFire = fI > 0.05

      if (isOnFire) {
        var spawnRate = Math.round(6 + fI * 14)
        for (var si = 0; si < spawnRate; si++) spawnFlame(si % 2)
        if (Math.random() < 0.25 * fI) spawnFireEmber(Math.random() < 0.5 ? 0 : 1)
      }

      // Update flame particles
      for (var fi2 = 0; fi2 < fireParticles.length; fi2++) {
        var fp = fireParticles[fi2]; if (fp.life <= 0) { fp.sprite.visible = false; continue }
        fp.life -= dt / fp.maxLife
        fp.sprite.position.add(fp.velocity.clone().multiplyScalar(dt))
        fp.velocity.y -= dt * 0.3; fp.velocity.x += (Math.random() - 0.5) * dt * 1.2; fp.velocity.z += (Math.random() - 0.5) * dt * 1.2
        var lf = 1 - fp.life; var sm = lf < 0.15 ? lf / 0.15 : 1 - Math.pow((lf - 0.15) / 0.85, 0.7)
        var ss = fp.size * sm * Math.min(fI, 1.2); fp.sprite.scale.set(ss * 0.7, ss * 1.8, 1)
        var al = fp.life > 0.8 ? (1 - fp.life) / 0.2 : Math.pow(fp.life / 0.8, 0.5)
        ;(fp.sprite.material as any).opacity = al * 0.65 * Math.min(fI, 1)
        if (fp.life <= 0) fp.sprite.visible = false
      }

      // Update ember particles
      for (var ej = 0; ej < emberFireParticles.length; ej++) {
        var ep = emberFireParticles[ej]; if (ep.life <= 0) { ep.sprite.visible = false; continue }
        ep.life -= dt / ep.maxLife
        ep.sprite.position.add(ep.velocity.clone().multiplyScalar(dt))
        ep.velocity.y -= dt * 0.3; ep.velocity.x += (Math.random() - 0.5) * dt * 3
        var ess = ep.size * ep.life; ep.sprite.scale.set(ess, ess, 1)
        ;(ep.sprite.material as any).opacity = ep.life * 0.8 * Math.min(fI, 1)
        if (ep.life <= 0) ep.sprite.visible = false
      }

      // Fire lights
      var flk = Math.sin(elapsed * 8) * 0.15 + Math.sin(elapsed * 13) * 0.1 + Math.sin(elapsed * 21) * 0.05
      fireLight1.intensity = fI * (0.8 + flk) * 1.2
      fireLight2.intensity = fI * (0.5 + flk * 0.7)
      fireLight3.intensity = fI * (0.6 - flk * 0.5) * 0.8

      // Dice emissive override when on fire — skin-appropriate warm glow
      if (isOnFire && outerMatRef) {
        var hg = Math.min(fI * 0.45, 0.9)
        // Each skin gets a warm fire tint that complements its base colour
        var fireEmissiveMap: Record<string, { fire: number; inferno: number }> = {
          ivory: { fire: 0xff2200, inferno: 0xff3300 },
          midnight: { fire: 0x112244, inferno: 0x1a3366 },     // subtle deep blue, not washing out
          ember: { fire: 0xff2200, inferno: 0xff4400 },
          portal: { fire: 0x440066, inferno: 0x550088 },        // deep purple, not pink
          hologram: { fire: 0x661144, inferno: 0x882266 },      // deep magenta, subtle
          matrix: { fire: 0x004400, inferno: 0x006600 },        // deep green
          celestial: { fire: 0x886611, inferno: 0xaa8822 },     // warm gold, not orange
        }
        var fireColors = fireEmissiveMap[skin] || fireEmissiveMap.ivory
        outerMatRef.emissive.setHex(fI > 1.2 ? fireColors.inferno : fireColors.fire)
        // Non-warm skins get less emissive intensity to preserve their identity
        var skinEmissiveScale: Record<string, number> = { ivory: 1.0, midnight: 0.5, ember: 1.0, portal: 0.55, hologram: 0.45, matrix: 0.5, celestial: 0.6 }
        var eScale = skinEmissiveScale[skin] || 1.0
        outerMatRef.emissiveIntensity = Math.max(baseEmissiveIntensity, (hg + flk * 0.12 * fI) * eScale)
      } else if (outerMatRef && skin !== 'ember' && skin !== 'hologram' && skin !== 'matrix') {
        // Reset to skin default when fire is off (ember/holo/matrix handle their own)
        outerMatRef.emissive.setHex(baseEmissiveHex)
        outerMatRef.emissiveIntensity = baseEmissiveIntensity
      }

      // Heat wash
      var breathe = Math.sin(elapsed * 1.5) * 0.3 + Math.sin(elapsed * 2.5) * 0.15
      heatMat.opacity = Math.max(0, (fI - 0.3) * 0.04 + breathe * 0.01 * fI)
      heatMesh.position.x = Math.sin(elapsed * 0.3) * 0.5; heatMesh.position.y = Math.cos(elapsed * 0.4) * 0.3
      if (fI > 1) { var i2 = fI - 1; heat2Mat.opacity = i2 * 0.045 + breathe * 0.02 * i2; heat2Mesh.position.x = Math.sin(elapsed * 0.5 + 2) * 0.9; heat2Mesh.position.y = Math.cos(elapsed * 0.35 + 1) * 0.6 } else { heat2Mat.opacity = 0 }
      if (fI > 1.5) { var i3 = fI - 1.5; heat3Mat.opacity = i3 * 0.035 + Math.sin(elapsed * 3) * 0.015 * i3; heat3Mesh.position.x = Math.cos(elapsed * 0.7 + 4) * 1.2; heat3Mesh.position.y = Math.sin(elapsed * 0.45 + 3) * 0.8 } else { heat3Mat.opacity = 0 }
      infernoLight.intensity = Math.max(0, (fI - 1)) * (1.8 + flk)
      infernoLight.position.set(Math.sin(elapsed * 0.8) * 2, 1 + Math.sin(elapsed * 1.2) * 0.5, Math.cos(elapsed * 0.6) * 2)

      // Camera shake
      var tShake = fI > 1 ? (fI - 1) * 0.055 : fI * 0.01
      cameraShakeAmount += (tShake - cameraShakeAmount) * dt * 5
      if (cameraShakeAmount > 0.001) { camera.position.x = baseCamX + (Math.random() - 0.5) * cameraShakeAmount; camera.position.y = baseCamY + (Math.random() - 0.5) * cameraShakeAmount; camera.lookAt(0, FLOOR_Y, 0) }
      // ═══════════════════════════════════════════════════════════════

      renderer.render(scene, camera)

      // ── 2D overlay (Matrix rain + Celestial dust — UNCHANGED) ──
      if (ovCtx) {
        ovCtx.clearRect(0, 0, ovCtx.canvas.width, ovCtx.canvas.height)
        if (skin === 'matrix' && matrixCols.length > 0) { var chars = '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2\u30E4\u30E6\u30E8\u30E9\u30EA\u30EB\u30EC\u30ED\u30EF\u30F2\u30F3'; var fontSize = 9; ovCtx.font = fontSize + 'px monospace'; for (var ci = 0; ci < matrixCols.length; ci++) { var col = matrixCols[ci]; col.y += col.speed * dt; col.swapTimer += dt; if (col.swapTimer > col.swapInterval) { col.swapTimer = 0; col.trail[Math.floor(Math.random() * col.trail.length)] = chars[Math.floor(Math.random() * chars.length)] }; var len = col.trail.length; for (var jj = 0; jj < len; jj++) { var cy = col.y - jj * fontSize; if (cy < -fontSize || cy > ovCtx.canvas.height + fontSize) continue; var isHead = (jj === 0); var posInTrail = jj / len; var trailAlpha: number; if (isHead) { trailAlpha = 0.9 } else if (posInTrail < 0.3) { trailAlpha = 0.55 * (1 - posInTrail * 0.4) } else { var tailPos = (posInTrail - 0.3) / 0.7; trailAlpha = 0.55 * 0.88 * Math.pow(1 - tailPos, 8) }; var alpha = trailAlpha * 0.12; if (alpha < 0.01) continue; if (isHead) { ovCtx.fillStyle = 'rgba(180,255,180,' + alpha + ')' } else { var g = Math.round(100 + (1 - posInTrail) * 120); ovCtx.fillStyle = 'rgba(0,' + g + ',30,' + alpha + ')' }; ovCtx.fillText(col.trail[jj], col.x, cy) }; if (col.y - len * fontSize > ovCtx.canvas.height) { col.y = -Math.random() * ovCtx.canvas.height * 0.5; col.speed = 35 + Math.random() * 30; var newLen = 5 + Math.floor(Math.random() * 10); col.trail = []; for (var kk = 0; kk < newLen; kk++) col.trail.push(chars[Math.floor(Math.random() * chars.length)]) } } }
        if (skin === 'celestial' && celestial2D.length > 0 && diceArray.length > 0) { var avgY = 0; for (var di = 0; di < diceArray.length; di++) { avgY += diceArray[di].mesh.position.y }; avgY /= diceArray.length; if (avgY < 5) { for (var ci2 = 0; ci2 < celestial2D.length; ci2++) { var pp = celestial2D[ci2]; pp.life += dt; if (pp.life > pp.maxLife) { var spawnDie = diceArray[Math.floor(Math.random() * diceArray.length)]; var dieScreenPos = spawnDie.mesh.position.clone().project(camera); var sx = (dieScreenPos.x * 0.5 + 0.5) * ovCtx.canvas.width; var sy = (-dieScreenPos.y * 0.5 + 0.5) * ovCtx.canvas.height; pp.x = sx + (Math.random() - 0.5) * 20; pp.y = sy + (Math.random() - 0.5) * 20; pp.life = 0; var aa = Math.random() * Math.PI * 2; var spd = 18 + Math.random() * 45; pp.vx = Math.cos(aa) * spd; pp.vy = Math.sin(aa) * spd - 10; pp.maxLife = 2 + Math.random() * 3; pp.size = 0.4 + Math.random() * 1.0 }; pp.x += pp.vx * dt; pp.y += pp.vy * dt; pp.vy += 6 * dt; var fade = Math.max(0, 1 - pp.life / pp.maxLife); if (fade > 0.01) { ovCtx.beginPath(); ovCtx.arc(pp.x, pp.y, pp.size * fade, 0, Math.PI * 2); ovCtx.fillStyle = 'rgba(212,175,55,' + (fade * 0.4) + ')'; ovCtx.fill() } } } }
      }

      animId = requestAnimationFrame(render)
    }
    render(); window.addEventListener('resize', updateSize)

    function throwDice() {
      diceSettled = 0; if (resultEl) { resultEl.className = ''; resultEl.textContent = ''; resultEl.innerHTML = ''; resultEl.style.opacity = '0' }
      diceArray.forEach(function (d: any, idx: number) {
        d.value = 0; d.body.velocity.setZero(); d.body.angularVelocity.setZero()
        var xSpread = isNarrow ? 0.6 : 1.2; var xRandom = isNarrow ? 0.4 : 1.0; var xOffset = (idx === 0) ? -xSpread : xSpread
        var sx = xOffset + (Math.random() - 0.5) * xRandom; var sy = 5 + Math.random() * 3; var sz = (Math.random() - 0.5) * (isNarrow ? 0.8 : 1.5)
        d.body.position = new CANNON.Vec3(sx, sy, sz); d.mesh.position.set(sx, sy, sz)
        d.mesh.rotation.set(2 * Math.PI * Math.random(), 2 * Math.PI * Math.random(), 2 * Math.PI * Math.random())
        d.body.quaternion.set(d.mesh.quaternion.x, d.mesh.quaternion.y, d.mesh.quaternion.z, d.mesh.quaternion.w)
        var force = 2 + Math.random() * 2; var lateralForce = isNarrow ? 0.3 : 0.5
        d.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * force * lateralForce, 0, -(Math.random() * force * 0.3)), new CANNON.Vec3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3))
        d.body.allowSleep = true
      })
    }
    setTimeout(throwDice, 100)

    setTimeout(function () { if (disposed || diceSettled === params.numberOfDice) return; var total = 0; var values: number[] = []; for (var s = 0; s < diceArray.length; s++) { if (!diceArray[s].value) diceArray[s].value = 1 + Math.floor(Math.random() * 6); total += diceArray[s].value; values.push(diceArray[s].value) }; diceSettled = params.numberOfDice; showResult(total, values); onResult(total, values); startFadeOut() }, 6000)

    cleanupRef.current = function () {
      disposed = true; window.removeEventListener('resize', updateSize); cancelAnimationFrame(animId)
      renderer.dispose(); outerMat.dispose(); innerMat.dispose(); pipMat.dispose()
      holoPipMats.forEach(function (m: any) { m.dispose() })
      if (portalPts) { scene.remove(portalPts); portalPts.geometry.dispose(); portalPts.material.dispose() }
      extraLights.forEach(function (l: any) { scene.remove(l) })
      // v5: fire cleanup
      flameTexture.dispose(); emberTexture.dispose()
      if (flameGroup) scene.remove(flameGroup)
      if (emberFireGroup) scene.remove(emberFireGroup)
      if (heatMesh) scene.remove(heatMesh)
      if (heat2Mesh) scene.remove(heat2Mesh)
      if (heat3Mesh) scene.remove(heat3Mesh)
      scene.remove(fireLight1); scene.remove(fireLight2); scene.remove(fireLight3); scene.remove(infernoLight)
      scene.clear()
    }
  }, [onResult, onFadeComplete, skin])

  useEffect(function () { if (hasRolled.current) return; hasRolled.current = true; init(); return function () { if (cleanupRef.current) cleanupRef.current() } }, [init])

  return (
    <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 4, pointerEvents: 'none' }}>
      <style>{`
        .dice-result-show { animation: diceResultIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .dice-result-hide { animation: diceResultOut 0.4s ease-in forwards; }
        @keyframes diceResultIn { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.2); } 40% { opacity: 0.8; transform: translate(-50%,-50%) scale(1.15); } 70% { opacity: 1; transform: translate(-50%,-50%) scale(0.95); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        @keyframes diceResultOut { 0% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(0.8) translateY(-20px); } }
        .dice-special-snake { font-size: 48px; font-weight: 800; letter-spacing: -1.5px; color: #8B2D2D; text-shadow: 0 0 12px rgba(180,50,50,0.3), 0 2px 4px rgba(0,0,0,0.8); text-align: center; }
        .dice-special-legendary { font-size: 44px; font-weight: 800; letter-spacing: -1.5px; background: linear-gradient(135deg, #d4af37, #f5e6a3, #d4af37, #a08520); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: none; filter: drop-shadow(0 0 20px rgba(212,175,55,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
        .dice-special-double { font-size: 42px; font-weight: 700; letter-spacing: -1px; color: #A8B2BD; text-shadow: 0 2px 4px rgba(0,0,0,0.7); }
        .dice-number-regular { position: fixed; top: 14px; left: 16px; font-size: 14px; font-weight: 600; letter-spacing: -0.3px; color: #3D444A; background: linear-gradient(135deg, #3D444A 0%, #717B85 40%, #A8B2BD 50%, #717B85 60%, #3D444A 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: diceNumberShimmer 2s ease-in-out infinite, diceNumberSlideIn 0.4s ease-out; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }
        @keyframes diceNumberShimmer { 0% { background-position: 100% 50%; } 50% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes diceNumberSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <canvas ref={overlayRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 5 }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }} />
      <div ref={resultRef} style={{ position: 'fixed', top: '18%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '90vw', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif", color: 'rgba(255,255,255,0.85)', fontSize: '72px', fontWeight: 800, letterSpacing: '-2px', opacity: 0, pointerEvents: 'none', textShadow: '0 0 40px rgba(130,141,152,0.4), 0 0 80px rgba(130,141,152,0.15)', zIndex: 6 }} />
    </div>
  )
}
