import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CABIMAS, ROAD_DIR, fade, mulberry32, range, smooth } from '../utils/stages'
import { makeRadialTexture } from '../utils/hiluxTexture'
import { hdrGlow } from '../utils/cityTextures'
import roadLaneUrl from '../assets/road-lane.webp'
import { nearestOnPath } from '../utils/corridor'
import { RIBBON_PATH } from '../utils/avenue'
import cityData from '../assets/cabimas-city.json'

const _obj = new THREE.Object3D()

// Ancho de la calzada por la que circula la unidad (0.55 u ≈ 12 m).
export const AVENUE_W = 0.55

// El generador ya entrega el lago como polígono CERRADO: la costa real de
// Maracaibo, prolongada norte-sur y cerrada mar adentro.
//
// Aquí se usa tal cual. Antes se le añadían dos vértices en x=320 para
// "cerrarlo", pero el polígono ya llegaba con vértices en x≈1207, así que esos
// dos puntos lo volvían auto-intersecante: earcut triangulaba el cruce y el
// agua acababa tapando manzanas de tierra. Los edificios nunca estuvieron
// dentro del lago — era el relleno el que se salía.
function buildWaterGeometry(water) {
  if (!water || water.length < 3) return null
  const shape = new THREE.Shape()
  // OJO CON EL SIGNO. ShapeGeometry construye en el plano XY y el rotateX de
  // abajo manda (x, y, 0) -> (x, 0, -y): la Z sale NEGADA. Si se alimenta la
  // z del dato tal cual, el lago queda espejado norte-sur respecto a la
  // ciudad y se come 602 manzanas de tierra. Se premultiplica por -1 para que
  // el par acabe siendo la identidad: (x, z) -> (x, 0, z).
  const pt = (i) => [water[i][0], -water[i][1]]
  shape.moveTo(...pt(0))
  for (let i = 1; i < water.length; i++) shape.lineTo(...pt(i))
  shape.closePath()
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2) // del plano XY al plano XZ
  return geo
}

// Ciudad REAL de Cabimas (calles, avenidas y nombres tomados de
// OpenStreetMap), en modo nocturno azul oscuro tipo mapa de navegación.
const MAP = {
  ground: '#0a1626',
  water: '#1c7591',
  street: '#26415f',
  avenueSt: '#345a80',
  intercomunal: '#4a7bb0',
  streetNear: '#3d4757', // asfalto: color de las calles dentro del corredor
  building: [0.16, 0.26, 0.38],
  buildingTop: [0.26, 0.4, 0.56],
  pinGreen: '#3DD68C',
  pinAmber: '#f5b53d',
  poi: ['#ff6b6b', '#4d9bff', '#22c7d6', '#f078c0', '#ffb020'],
}

// Construye una única geometría de cintas (ribbons) para todas las calles,
// con ancho por jerarquía. Un solo draw call para miles de segmentos.
function buildStreetGeometry(roads) {
  const pos = []
  const col = []
  const cStreet = new THREE.Color(MAP.street)
  const cAve = new THREE.Color(MAP.avenueSt)
  const cInter = new THREE.Color(MAP.intercomunal)
  // Las calles son cintas planas sin luz: desde el aire leen como un mapa de
  // navegación, pero a ras de suelo brillan como plástico azul. Cerca del
  // corredor por donde circula el vehículo se funden hacia color de asfalto.
  const cAsphalt = new THREE.Color(MAP.streetNear)
  const cTmp = new THREE.Color()
  const FADE_IN = 1.1 // totalmente asfalto
  const FADE_OUT = 3.4 // totalmente mapa
  const asphaltMix = (x, z) => {
    const d = nearestOnPath(x, z).dist
    if (d <= FADE_IN) return 1
    if (d >= FADE_OUT) return 0
    const t = (d - FADE_IN) / (FADE_OUT - FADE_IN)
    return 1 - t * t * (3 - 2 * t)
  }

  for (const r of roads) {
    const w = r.i ? 0.5 : r.l === 2 ? 0.42 : r.l === 1 ? 0.3 : 0.16
    const c = r.i ? cInter : r.l >= 1 ? cAve : cStreet
    const p = r.p
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0]
      const az = p[i][1]
      const bx = p[i + 1][0]
      const bz = p[i + 1][1]
      const len = Math.hypot(bx - ax, bz - az)
      // Guarda defensiva. Los datos actuales no traen ningún segmento así
      // (comprobado: 0 de 2324), pero `len || 1` sólo cubre len === 0: con un
      // len de 1e-9 —dos nodos OSM casi coincidentes— la normal se dispara y
      // el cuadrilátero se abriría en un abanico enorme sobre la ciudad.
      if (len < 1e-4) continue
      // normal perpendicular en el plano XZ
      const nx = (-(bz - az) / len) * w
      const nz = ((bx - ax) / len) * w
      // 2 triángulos (quad) tumbado en el plano
      // Alturas casi al ras: son calcomanías sobre el suelo. Si se elevan,
      // entierran a un vehículo a escala real (2.9 m ≈ 0.047 u).
      const y = r.i ? 0.008 : r.l >= 1 ? 0.006 : 0.004
      const v = [
        [ax + nx, y, az + nz],
        [ax - nx, y, az - nz],
        [bx + nx, y, bz + nz],
        [bx - nx, y, bz - nz],
      ]
      const tri = [v[0], v[2], v[1], v[1], v[2], v[3]]
      const mA = asphaltMix(ax, az)
      const mB = asphaltMix(bx, bz)
      // los 3 primeros vértices son del extremo a, los 3 últimos del b
      for (let k = 0; k < tri.length; k++) {
        const t = tri[k]
        pos.push(t[0], t[1], t[2])
        cTmp.copy(c).lerp(cAsphalt, k < 3 ? mA : mB)
        col.push(cTmp.r, cTmp.g, cTmp.b)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return geo
}

// Cinta a lo largo de una polilínea, con UV de CALZADA: u recorre el ancho
// (0 a 1) y v avanza con la longitud de arco. Es el mapeo que esperan las
// texturas de vía del asset: el ancho de calzada cabe justo en la textura y
// la raya discontinua queda centrada y sigue la curva sin estirarse.
// `tile` = metros de escena que cubre la textura a lo largo.
function buildRibbon(path, width, tile) {
  if (!path || path.length < 2) return null
  const pos = []
  const uv = []
  const hw = width / 2
  let acc = 0
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i][0]
    const az = path[i][1]
    const bx = path[i + 1][0]
    const bz = path[i + 1][1]
    const len = Math.hypot(bx - ax, bz - az) || 1
    const nx = (-(bz - az) / len) * hw
    const nz = ((bx - ax) / len) * hw
    const va = acc / tile
    acc += len
    const vb = acc / tile
    const q = [
      [ax + nx, 0, az + nz, 0, va],
      [ax - nx, 0, az - nz, 1, va],
      [bx + nx, 0, bz + nz, 0, vb],
      [bx - nx, 0, bz - nz, 1, vb],
    ]
    for (const t of [q[0], q[2], q[1], q[1], q[2], q[3]]) {
      pos.push(t[0], t[1], t[2])
      uv.push(t[3], t[4])
    }
  }
  if (!pos.length) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  return geo
}

// Test punto-en-polígono contra el lago, para no colocar nada sobre el agua.
function makeWaterTest(poly) {
  if (!poly || poly.length < 3) return () => false
  return (x, z) => {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0]
      const zi = poly[i][1]
      const xj = poly[j][0]
      const zj = poly[j][1]
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi) {
        inside = !inside
      }
    }
    return inside
  }
}

// Pins y POIs SOBRE LAS CALLES REALES (antes se sembraban al azar y algunos
// caían en el lago). Se toma un muestreo de puntos de la red vial en tierra.
function buildMarkers(roads, isWater) {
  const rng = mulberry32(7)
  const pool = []
  for (const r of roads) {
    for (const p of r.p) {
      const d = Math.hypot(p[0] - CABIMAS[0], p[1] - CABIMAS[2])
      if (d > 3 && d < 34 && !isWater(p[0], p[1])) pool.push(p)
    }
  }
  const pick = () => pool[Math.floor(rng() * pool.length)]

  const pins = []
  if (pool.length) {
    for (let i = 0; i < 7; i++) {
      const p = pick()
      pins.push({ x: p[0], z: p[1], kind: 'vehicle', phase: rng() * 6 })
    }
    for (let i = 0; i < 2; i++) {
      const p = pick()
      pins.push({ x: p[0], z: p[1], kind: 'base', phase: rng() * 6 })
    }
  }

  const pois = []
  for (let i = 0; i < 40 && pool.length; i++) {
    const p = pick()
    pois.push({
      x: p[0],
      z: p[1],
      color: MAP.poi[Math.floor(rng() * MAP.poi.length)],
    })
  }
  return { pins, pois }
}

function MapPin({ x, z, color, scale = 1, innerRef }) {
  const glow = useMemo(() => hdrGlow(color, 2.1), [color])
  return (
    <group position={[x, 0, z]} ref={innerRef}>
      <group position={[0, 1.35 * scale, 0]} scale={scale}>
        <mesh position={[0, 0.32, 0]}>
          <sphereGeometry args={[0.42, 18, 18]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.28, 0]}>
          <coneGeometry args={[0.3, 0.85, 14]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <sprite position={[0, 0.34, 0]} scale={[0.32, 0.32, 1]}>
          <spriteMaterial color="#eaf6ff" depthTest={false} />
        </sprite>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.32 * scale, 18]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function CityScene({ progress }) {
  const streetGeo = useMemo(() => buildStreetGeometry(cityData.roads), [])
  const waterGeo = useMemo(() => buildWaterGeometry(cityData.water || cityData.coast), [])
  // Avenida del vehículo: 0.55 u ≈ 12 m (4 carriles). La textura de calzada
  // es cuadrada y cubre el ancho completo, así que la baldosa a lo largo mide
  // lo mismo que el ancho: el grano del asfalto queda isótropo, sin estirar.
  const avenueGeo = useMemo(() => buildRibbon(RIBBON_PATH, AVENUE_W, AVENUE_W), [])
  const { pins, pois } = useMemo(() => {
    const isWater = makeWaterTest(cityData.water)
    return buildMarkers(cityData.roads, isWater)
  }, [])
  const glowTex = useMemo(
    () => makeRadialTexture('rgba(61,214,140,0.85)', 'rgba(61,214,140,0)'),
    []
  )
  const pinGlow = useMemo(() => hdrGlow(MAP.pinGreen, 2.1), [])
  // Calzada real del asset de infraestructura urbana: asfalto fotográfico con
  // la raya discontinua ya pintada. El material se arma a mano, NO con props
  // JSX: R3F marca como sRGB toda textura que recibe por prop.
  const asphaltMat = useMemo(() => {
    const map = new THREE.TextureLoader().load(roadLaneUrl)
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = THREE.ClampToEdgeWrapping // el ancho cabe justo: no repetir
    map.wrapT = THREE.RepeatWrapping
    map.anisotropy = 16
    return new THREE.MeshStandardMaterial({
      map,
      color: '#9aa7ba', // atenúa el asfalto diurno sin aplanar su contraste
      roughness: 0.78,
      metalness: 0.04,
    })
  }, [])
  const buildings = cityData.buildings
  const labels = cityData.labels

  const buildingsRef = useRef()
  const poisRef = useRef()
  const ambientRef = useRef()
  const geofenceRefs = useRef([])
  const geofenceFillRef = useRef()
  const pinRefs = useRef([])
  const targetPinRef = useRef()
  const targetRingRef = useRef()
  const targetGlowRef = useRef()
  const labelRefs = useRef([])

  useLayoutEffect(() => {
    const bm = buildingsRef.current
    const cLow = new THREE.Color(MAP.building[0], MAP.building[1], MAP.building[2])
    const cHigh = new THREE.Color(MAP.buildingTop[0], MAP.buildingTop[1], MAP.buildingTop[2])
    const tmp = new THREE.Color()
    buildings.forEach((b, i) => {
      const [x, z, sx, sz, h, tint = 1, warm = 0] = b
      _obj.position.set(x, h / 2, z)
      _obj.scale.set(sx, h, sz)
      _obj.rotation.set(0, 0, 0)
      _obj.updateMatrix()
      bm.setMatrixAt(i, _obj.matrix)
      // color: base según altura, con variación de brillo (tint) y calidez (warm)
      tmp.copy(cLow).lerp(cHigh, Math.min(1, h / 3))
      tmp.r = Math.min(1, tmp.r * tint + warm)
      tmp.g = Math.min(1, tmp.g * tint + warm * 0.5)
      tmp.b = Math.min(1, tmp.b * tint)
      bm.setColorAt(i, tmp)
    })
    bm.instanceMatrix.needsUpdate = true
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true
    bm.computeBoundingSphere()


    const pm = poisRef.current
    const pc = new THREE.Color()
    pois.forEach((p, i) => {
      _obj.position.set(p.x, 0.6, p.z)
      _obj.scale.set(1, 1, 1)
      _obj.rotation.set(0, 0, 0)
      _obj.updateMatrix()
      pm.setMatrixAt(i, _obj.matrix)
      pc.set(p.color).multiplyScalar(1.9)
      pm.setColorAt(i, pc)
    })
    pm.instanceMatrix.needsUpdate = true
    if (pm.instanceColor) pm.instanceColor.needsUpdate = true
    pm.computeBoundingSphere()
  }, [buildings, pois])

  useFrame((state) => {
    const p = progress.current
    const t = state.clock.elapsedTime

    const focus = fade(p, 0.29, 0.36, 0.62, 0.74)
    if (ambientRef.current) ambientRef.current.intensity = 0.95 - 0.2 * focus

    const geo = fade(p, 0.3, 0.35, 0.54, 0.6)
    geofenceRefs.current.forEach((m, i) => {
      if (!m) return
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.2 - i * 1.1)
      m.material.opacity = geo * pulse * (i === 0 ? 0.9 : 0.55)
      m.scale.setScalar(1 + 0.03 * Math.sin(t * 1.6 + i))
    })
    if (geofenceFillRef.current) geofenceFillRef.current.material.opacity = geo * 0.06

    pinRefs.current.forEach((g, i) => {
      if (!g) return
      const pin = pins[i]
      if (!pin) return
      g.children[0].position.y = 1.35 + Math.sin(t * 1.8 + pin.phase) * 0.08
    })

    const grow = 1 + smooth(range(p, 0.42, 0.55)) * 0.75
    const gone = 1 - smooth(range(p, 0.55, 0.585))
    const tp = targetPinRef.current
    if (tp) {
      tp.scale.setScalar(grow * Math.max(0.0001, gone))
      tp.visible = gone > 0.001
      tp.children[0].position.y = 1.5 + Math.sin(t * 2.4) * 0.1
    }
    if (targetRingRef.current) {
      const k = (t * 1.1) % 1
      targetRingRef.current.scale.setScalar((0.6 + k * 3.2) * grow)
      targetRingRef.current.material.opacity = (1 - k) * 0.85 * gone
    }
    if (targetGlowRef.current) {
      targetGlowRef.current.material.opacity = (0.45 + 0.25 * Math.sin(t * 4)) * gone
    }

    // A ras de calle los adornos de mapa (pines de 12 m y esferas de POI
    // flotando a 13 m) se leen como globos sobre la acera.
    const mapView = p < 0.62
    if (poisRef.current) poisRef.current.visible = mapView
    pinRefs.current.forEach((g) => {
      if (g) g.visible = mapView
    })

    labelRefs.current.forEach((el, i) => {
      if (!el) return
      const main = labels[i]?.m
      const o = main ? fade(p, -1, 0, 0.55, 0.62) : fade(p, 0.02, 0.1, 0.5, 0.58)
      el.style.opacity = o.toFixed(3)
    })
  })

  return (
    <group>
      {/* Tierra base azul oscuro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[360, 48]} />
        <meshBasicMaterial color={MAP.ground} toneMapped={false} />
      </mesh>

      {/* Lago de Maracaibo con la línea de costa REAL (al este de la ciudad) */}
      {waterGeo && (
        <mesh geometry={waterGeo} position={[0, 0.005, 0]}>
          {/* doble cara: corregir el signo de la Z al construir el polígono
              invierte el sentido de las caras y, a una sola cara, el lago
              miraría hacia abajo y desaparecería visto desde arriba */}
          <meshBasicMaterial color={MAP.water} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Calles reales (una sola malla combinada) */}
      <mesh geometry={streetGeo}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>

      {/* Avenida por donde circula la unidad: se dibuja SIGUIENDO la polilínea
          real (Avenida 4 Bella Vista), así el vehículo nunca cruza manzanas. */}
      {avenueGeo && (
        <mesh geometry={avenueGeo} position={[0, 0.0105, 0]} material={asphaltMat} />
      )}
      {/* Edificios reales entre las calles */}
      <instancedMesh ref={buildingsRef} args={[null, null, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} metalness={0.05} />
      </instancedMesh>

      {/* Puntos de interés de colores */}
      <instancedMesh ref={poisRef} args={[null, null, pois.length]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      {/* Pins de flota y sedes */}
      {pins.map((m, i) => (
        <MapPin
          key={i}
          x={m.x}
          z={m.z}
          color={m.kind === 'base' ? MAP.pinAmber : MAP.pinGreen}
          scale={m.kind === 'base' ? 1.05 : 0.9}
          innerRef={(el) => (pinRefs.current[i] = el)}
        />
      ))}

      {/* Pin objetivo en el centro de Cabimas */}
      <group position={[CABIMAS[0], 0, CABIMAS[2]]}>
        <group ref={targetPinRef}>
          <group position={[0, 1.5, 0]}>
            <mesh position={[0, 0.36, 0]}>
              <sphereGeometry args={[0.5, 20, 20]} />
              <meshBasicMaterial color={pinGlow} toneMapped={false} transparent />
            </mesh>
            <mesh rotation={[Math.PI, 0, 0]} position={[0, -0.34, 0]}>
              <coneGeometry args={[0.36, 1, 16]} />
              <meshBasicMaterial color={pinGlow} toneMapped={false} transparent />
            </mesh>
            <sprite position={[0, 0.38, 0]} scale={[0.42, 0.42, 1]}>
              <spriteMaterial color="#eaf6ff" depthTest={false} />
            </sprite>
          </group>
          <sprite ref={targetGlowRef} position={[0, 1.7, 0]} scale={[4.5, 4.5, 1]}>
            <spriteMaterial map={glowTex} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
        <mesh ref={targetRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[0.7, 0.82, 40]} />
          <meshBasicMaterial color={MAP.pinGreen} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      {/* Geocercas de Cabimas */}
      <group position={[CABIMAS[0], 0.07, CABIMAS[2]]}>
        {[6, 9.5, 13].map((r, i) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} ref={(el) => (geofenceRefs.current[i] = el)}>
            <ringGeometry args={[r - 0.09, r, 72]} />
            <meshBasicMaterial
              color={i === 1 ? '#4d9bff' : '#3DD68C'}
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} ref={geofenceFillRef}>
          <circleGeometry args={[13, 64]} />
          <meshBasicMaterial color="#3DD68C" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      {/* Nombres de calles reales */}
      {labels.map((s, i) => (
        <Html
          key={s.t + i}
          position={[s.x, s.m ? 1.2 : 0.6, s.z]}
          center
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div ref={(el) => (labelRefs.current[i] = el)} className={s.m ? 'street-label main' : 'street-label'}>
            {s.t}
          </div>
        </Html>
      ))}

      {/* Etiqueta de zona */}
      <Html position={[CABIMAS[0] - 4, 7, CABIMAS[2] - 22]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="district-label active">Maracaibo</div>
      </Html>

      {/* Iluminación nocturna azul con contraste para dar caras a los edificios */}
      <ambientLight ref={ambientRef} color="#7d9cc6" intensity={0.62} />
      <directionalLight color="#cfe0f5" intensity={1.15} position={[-45, 70, 55]} />
      <directionalLight color="#3a6ba0" intensity={0.35} position={[70, 50, -40]} />
    </group>
  )
}
