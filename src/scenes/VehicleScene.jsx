import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  fade,
  range,
  smooth,
  truckDistance,
  truckPos,
  truckSpeed,
  truckHeading,
  ROAD_DIR,
} from '../utils/stages'
import { loadHilux, makeRadialTexture } from '../utils/hiluxTexture'

const PLANE_W = 2.5
const DASH_COUNT = 10

// ============================================================
// MODELO 3D REAL: public/hilux.glb (Ford Ranger 2023).
// Se calibra solo: detecta las ruedas por su GEOMETRÍA (el modelo
// no las nombra), las envuelve en pivotes para que giren sobre su
// propio eje, escala a la escena y las apoya en el asfalto.
// ============================================================
// Modelo optimizado: 25.9 MB -> 2.8 MB (texturas WebP 1k + geometría Draco)
const MODEL_URL = '/hilux-new.glb'
// Esta Hilux tiene el frente hacia -Z (la Ranger lo tenía a +Z): media vuelta.
const MODEL_YAW_OFFSET = Math.PI
// ESCALA REAL: 1 unidad de escena = ~62 m (2.6 km -> 42 u). Una Ranger mide
// 5.3 m, así que su largo correcto es 5.3/62 = 0.086. Se deja un pelín mayor
// para que siga leyéndose como protagonista sin romper la proporción.
const MODEL_LENGTH = 0.24
// Altura de la calzada: el vehículo rueda encima de ella, no dentro.
const ROAD_Y = 0.013
// Color de carrocería. El modelo pinta el vehículo con el material `primary`
// (barniz brillante, rugosidad 0.07); `hilux_mb01.7` es la misma pintura en
// piezas mates. Blanco ligeramente frío: el #ffffff puro se quema con el
// bloom y deja de leerse como pintura. El resto de materiales (cristales,
// faros, pilotos, llantas) se dejan intactos.
// Giro máximo de rueda por fotograma (rad). Por encima de ~0.35 la llanta
// pasa a estar por debajo del muestreo del ojo y se lee como parada.
const MAX_SPIN = 0.32
// Zona muerta. El progreso se suaviza con una interpolación asintótica: al
// soltar el scroll nunca llega a cero exacto y la rueda se quedaba reptando
// más de un segundo. Cualquier scroll real, por lento que sea, mueve la rueda
// ~0.77 rad por píxel, así que este umbral sólo corta la cola.
const MIN_SPIN = 0.02

const PAINT_MATERIALS = /^(primary|hilux_mb01\.7)$/i
const PAINT_COLOR = '#eef0f3'

function paintBody(scene, hex) {
  const seen = new Set()
  scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      if (seen.has(m) || !m.color || !PAINT_MATERIALS.test(m.name || '')) continue
      seen.add(m)
      m.color.set(hex)
    }
  })
}

// Unidad EN MARCHA: los faros y los pilotos tienen que estar encendidos.
// La emisión va por encima de 1 para cruzar el umbral del bloom, igual que
// las farolas: por debajo de 1 el halo no arranca y sólo se ve un plástico
// claro. `indicator` son los intermitentes ámbar; `taillight`, los pilotos.
const LIGHT_MATERIALS = [
  { re: /headlight/i, color: '#eaf2ff', power: 3.4 },
  { re: /indicator/i, color: '#ffb43c', power: 2.0 },
  { re: /taillight|rearlight|stoplight/i, color: '#ff2e2e', power: 2.6 },
]

function switchLightsOn(scene) {
  const seen = new Set()
  scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      if (seen.has(m) || !m.emissive) continue
      const hit = LIGHT_MATERIALS.find((l) => l.re.test(m.name || ''))
      if (!hit) continue
      seen.add(m)
      m.emissive.set(hit.color)
      m.emissiveIntensity = hit.power
      m.toneMapped = false
      m.needsUpdate = true
    }
  })
}

// ============================================================
// VOLANTE A LA IZQUIERDA, NÚMEROS LEGIBLES
// El modelo trae el puesto de conducción a la derecha; en Venezuela va a la
// izquierda. Espejar todo el interior (scale.x = -1) lo resuelve, pero
// también voltea las TEXTURAS y el velocímetro queda con los números al
// revés. La solución va por piezas:
//   - Tablero, asientos y cristales SE ESPEJAN (no llevan texto).
//   - El cuadro de instrumentos y la columna del volante SE TRASLADAN al
//     lado izquierdo sin espejo: posición X negada y rotación reflejada
//     respecto al plano longitudinal (q' = [qx, -qy, -qz, qw]). Como el
//     volante y los relojes son simétricos, encajan en el hueco espejado
//     del tablero y sus números se leen bien.
// OJO: GLTFLoader sanea los nombres y quita los puntos ("movsteer_10_...").
// ============================================================
// ^movsteer ancla la columna suelta sin arrastrar las puertas
// (door_lf_movsteer…). Los relojes se detectan por "speedometer" en
// cualquier parte del nombre, menos su cristal (que sí se espeja).
const ESPEJAR = /^(hilux_dashboard|speedometer_glass|hilux_seat_mech|seats)/i
const TRASLADAR = /(^movsteer_1|speedometer(?!_glass))/i

function interiorIzquierda(scene) {
  const espejar = []
  const trasladar = []
  scene.traverse((o) => {
    if (!o.isMesh) return
    if (TRASLADAR.test(o.name)) trasladar.push(o)
    else if (ESPEJAR.test(o.name)) espejar.push(o)
  })
  if (!espejar.length && !trasladar.length) return 0

  scene.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert()
  const rel = new THREE.Matrix4()

  // Piezas sin texto: espejo real respecto al eje longitudinal del vehículo
  const espejo = new THREE.Group()
  espejo.name = 'interior-espejado'
  espejo.scale.x = -1
  scene.add(espejo)
  for (const o of espejar) {
    rel.multiplyMatrices(inv, o.matrixWorld)
    espejo.add(o)
    rel.decompose(o.position, o.quaternion, o.scale)
  }

  // Cuadro y volante: cruzan de lado SIN espejarse, así el texto no se voltea
  const cruce = new THREE.Group()
  cruce.name = 'interior-trasladado'
  scene.add(cruce)
  for (const o of trasladar) {
    rel.multiplyMatrices(inv, o.matrixWorld)
    cruce.add(o)
    rel.decompose(o.position, o.quaternion, o.scale)
    o.position.x = -o.position.x
    o.quaternion.set(o.quaternion.x, -o.quaternion.y, -o.quaternion.z, o.quaternion.w)
  }

  espejo.updateMatrixWorld(true)
  cruce.updateMatrixWorld(true)
  return espejar.length + trasladar.length
}

// El cristal del retrovisor y el del cuadro traen un PAISAJE horneado en su
// textura (herencia del videojuego del que salió el modelo). Un espejo que
// muestra una pradera dentro de una ciudad nocturna delata el truco: se le
// quita esa textura y se deja como vidrio oscuro con un reflejo frío, que es
// lo que se vería de noche.
const CRISTAL_INTERIOR = /^(hilux_dashboard_glass|speedometer_glass)/i
// El cristal de los retrovisores LATERALES no tiene nodo propio: vive dentro
// de door_lf / door_rf con este material, que trae fotografiada una autopista
// al atardecer. Se identifica por el material, no por el nombre del mesh.
const MATERIAL_RETROVISOR = /^hilux_mb07\.?11/i

function espejosReales(scene) {
  let arreglados = 0
  scene.traverse((o) => {
    if (!o.isMesh) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const esCristal = CRISTAL_INTERIOR.test(o.name)
    const esRetrovisor = mats.some((m) => MATERIAL_RETROVISOR.test(m?.name ?? ''))
    if (!esCristal && !esRetrovisor) return
    mats.forEach((m, i) => {
      // En las puertas solo se toca la cara del espejo, no el resto de la pieza.
      if (!esCristal && !MATERIAL_RETROVISOR.test(m?.name ?? '')) return
      const limpio = m.clone() // el material `glass` se comparte con otras piezas
      limpio.map = null
      limpio.color.set('#0d141d')
      limpio.emissive?.set('#16202e')
      if ('emissiveIntensity' in limpio) limpio.emissiveIntensity = 0.25
      if ('roughness' in limpio) limpio.roughness = 0.12
      if ('metalness' in limpio) limpio.metalness = 0.85
      limpio.needsUpdate = true
      if (Array.isArray(o.material)) o.material[i] = limpio
      else o.material = limpio
    })
    arreglados++
  })
  return arreglados
}

// Detección de ruedas en dos pasos:
//  1) por NOMBRE cuando el modelo las identifica (más fiable), y
//  2) por forma como respaldo (modelos con nodos genéricos "Object_7"...).
// En ambos casos se valida la forma para no confundirlas con puertas ni con
// el volante (que en algunos modelos también se llama "wheel").
function findWheels(scene) {
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3()
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()

  const asWheel = (o) => {
    box.setFromObject(o)
    box.getSize(size)
    box.getCenter(center)
    if (size.y < 0.2 || size.y > 1.4) return null
    const circular = Math.abs(size.y - size.z) < size.y * 0.22
    const narrow = size.x < size.y * 1.3
    const low = center.y < size.y * 1.7
    const side = Math.abs(center.x) > 0.4
    if (!(circular && narrow && low && side)) return null
    return { mesh: o, center: center.clone(), radius: size.y / 2 }
  }

  // 1) Por nombre: nodos cuyo nombre EMPIEZA por "wheel" (así se descartan
  //    mallas de puertas cuyo material se llama "wheel_rf1"), sin el volante.
  const named = []
  const namedNodes = new Set()
  scene.traverse((o) => {
    if (!/^wheel/i.test(o.name) || /steer/i.test(o.name)) return
    const w = asWheel(o)
    if (w) {
      named.push(w)
      namedNodes.add(o)
    }
  })
  // conservar solo los nodos más altos (la rueda completa, no sus piezas)
  const tops = named.filter((w) => {
    let a = w.mesh.parent
    while (a) {
      if (namedNodes.has(a)) return false
      a = a.parent
    }
    return true
  })
  if (tops.length >= 3) return tops

  // 2) Respaldo geométrico
  const found = []
  scene.traverse((o) => {
    if (!o.isMesh) return
    const w = asWheel(o)
    if (w && Math.abs(w.center.x) > 0.55) found.push(w)
  })
  return found
}

// Los orígenes del modelo están en el centro del vehículo, así que cada rueda
// se reparenta a un pivote colocado en SU centro; si no, orbitarían.
// Además se guarda el eje LOCAL que corresponde al eje X del mundo (el del
// semieje real): el padre puede traer rotaciones y girar sobre "rotation.x"
// no siempre coincide con el eje de la rueda.
// El modelo trae las ruedas delanteras VIRADAS (dirección girada ~16°, como
// en los renders de catálogo). Se busca el ángulo que minimiza el ancho de la
// rueda sobre el semieje: ese es el ángulo que la deja recta.
function straightenWheel(mesh, axisLocal, upLocal) {
  const geo = mesh.geometry
  const attr = geo && geo.attributes && geo.attributes.position
  if (!attr) return
  mesh.updateMatrix()
  // Muestreo de vértices REALES (la caja envolvente ya viene inflada por el
  // viraje, así que medir sobre ella no detecta nada).
  const total = attr.count
  const stride = Math.max(1, Math.floor(total / 1200))
  const pts = []
  const tmp = new THREE.Vector3()
  for (let i = 0; i < total; i += stride) {
    tmp.fromBufferAttribute(attr, i).applyMatrix4(mesh.matrix)
    pts.push(tmp.clone())
  }
  if (pts.length < 12) return

  const q = new THREE.Quaternion()
  const v = new THREE.Vector3()
  const spanAt = (a) => {
    q.setFromAxisAngle(upLocal, a)
    let lo = Infinity
    let hi = -Infinity
    for (const p of pts) {
      const d = v.copy(p).applyQuaternion(q).dot(axisLocal)
      if (d < lo) lo = d
      if (d > hi) hi = d
    }
    return hi - lo
  }

  let bestAngle = 0
  let bestSpan = Infinity
  for (let deg = -26; deg <= 26; deg += 1) {
    const s = spanAt((deg * Math.PI) / 180)
    if (s < bestSpan - 1e-6) {
      bestSpan = s
      bestAngle = (deg * Math.PI) / 180
    }
  }
  // refinado de medio grado
  for (let k = -4; k <= 4; k++) {
    const a = bestAngle + (k * 0.25 * Math.PI) / 180
    const s = spanAt(a)
    if (s < bestSpan - 1e-6) {
      bestSpan = s
      bestAngle = a
    }
  }
  if (Math.abs(bestAngle) < 0.005) return
  q.setFromAxisAngle(upLocal, bestAngle)
  mesh.position.applyQuaternion(q)
  mesh.quaternion.premultiply(q)
}

function pivotWheels(wheels) {
  const pivots = []
  const worldX = new THREE.Vector3(1, 0, 0)
  const worldY = new THREE.Vector3(0, 1, 0)
  const inv = new THREE.Matrix4()
  for (const w of wheels) {
    const parent = w.mesh.parent
    if (!parent) continue
    const local = parent.worldToLocal(w.center.clone())
    const pivot = new THREE.Group()
    pivot.position.copy(local)
    parent.add(pivot)
    parent.updateMatrixWorld(true)
    // attach() reparenta CONSERVANDO la transformación mundial de la rueda.
    // (Restar la posición a mano ignora su rotación propia y la deja torcida.)
    pivot.attach(w.mesh)
    inv.copy(pivot.matrixWorld).invert()
    const axis = worldX.clone().transformDirection(inv).normalize()
    const up = worldY.clone().transformDirection(inv).normalize()
    // endereza la dirección si el modelo la trae virada
    straightenWheel(w.mesh, axis, up)
    pivot.userData.axis = axis
    pivots.push(pivot)
  }
  return pivots
}

function useHiluxModel() {
  const [model, setModel] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok || !alive) return
        const type = res.headers.get('content-type') || ''
        // el dev server devuelve index.html para rutas inexistentes
        if (type.includes('text/html')) return
        const draco = new DRACOLoader()
        draco.setDecoderPath('/draco/')
        const loader = new GLTFLoader()
        loader.setDRACOLoader(draco)
        loader.load(
          MODEL_URL,
          (gltf) => {
            if (!alive) return
            const scene = gltf.scene

            // 1) Ruedas antes de escalar (el modelo viene en metros reales)
            const wheels = findWheels(scene)
            const rawRadius = wheels.length
              ? wheels.reduce((s, w) => s + w.radius, 0) / wheels.length
              : 0.39
            const pivots = pivotWheels(wheels)

            // 2) Escala a la escena, centra y apoya en el asfalto
            const box = new THREE.Box3().setFromObject(scene)
            const size = box.getSize(new THREE.Vector3())
            const s = MODEL_LENGTH / Math.max(size.x, size.z, 0.001)
            scene.scale.setScalar(s)
            box.setFromObject(scene)
            const center = box.getCenter(new THREE.Vector3())
            scene.position.x -= center.x
            scene.position.z -= center.z
            scene.position.y -= box.min.y

            // 3) Volante a la izquierda, retrovisor sin paisaje, color y luces
            const piezasInterior = interiorIzquierda(scene)
            const espejos = espejosReales(scene)
            paintBody(scene, PAINT_COLOR)
            switchLightsOn(scene)
            scene.traverse((o) => {
              if (!o.isMesh || !o.material) return
              o.castShadow = false
              o.receiveShadow = false
              const mats = Array.isArray(o.material) ? o.material : [o.material]
              mats.forEach((m) => {
                m.envMapIntensity = 1.15
                m.needsUpdate = true
              })
            })

            if (typeof window !== 'undefined') {
              window.__fom = {
                model: true,
                wheels: pivots.length,
                scale: s,
                espejosLimpios: espejos,
                interiorIzquierda: piezasInterior,
              }
            }
            setModel({ scene, pivots, wheelRadius: rawRadius * s })
          },
          undefined,
          (err) => {
            console.error('[FOM] error cargando el modelo 3D:', err)
            if (typeof window !== 'undefined') window.__fom = { model: false, err: String(err) }
          }
        )
      })
      .catch((e) => {
        if (typeof window !== 'undefined') window.__fom = { model: false, fetch: String(e) }
      })
    return () => {
      alive = false
    }
  }, [])

  return model
}

// La Hilux real: la fotografía (con el fondo eliminado por flood-fill) se
// proyecta sobre un plano con billboard amortiguado hacia la cámara, sombra de
// contacto, reflejo cálido sobre el asfalto, luces de acento y parallax.
export default function VehicleScene({ progress }) {
  const [hilux, setHilux] = useState(null)
  const model = useHiluxModel()

  useEffect(() => {
    let alive = true
    loadHilux().then((r) => alive && setHilux(r))
    return () => {
      alive = false
    }
  }, [])

  const group = useRef()
  const modelGroup = useRef()
  const planeGroup = useRef()
  const planeMat = useRef()
  const redTintMat = useRef()
  const blueTintMat = useRef()
  const shadowMat = useRef()
  const reflectMat = useRef()
  const headGlowMat = useRef()
  const dashesRef = useRef()
  const yaw = useRef(0)
  const lastDist = useRef(0)

  const shadowTex = useMemo(
    () => makeRadialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'),
    []
  )
  // Rebote de la pintura sobre el asfalto: sigue al color de carrocería
  // (blanco frío, así que la mancha es clara y neutra, no azul).
  const reflectTex = useMemo(
    () => makeRadialTexture('rgba(195,210,232,0.4)', 'rgba(195,210,232,0)'),
    []
  )
  const headTex = useMemo(
    () => makeRadialTexture('rgba(220,238,255,0.95)', 'rgba(120,180,255,0)'),
    []
  )

  const dashData = useMemo(
    () =>
      Array.from({ length: DASH_COUNT }, (_, i) => ({
        offset: (i / DASH_COUNT) * 1.2,
        side: i % 2 === 0 ? 0.055 : -0.055,
      })),
    []
  )

  const _obj = useMemo(() => new THREE.Object3D(), [])
  const _tp = useMemo(() => [0, 0, 0], [])

  const planeH = hilux ? PLANE_W * hilux.aspect : PLANE_W * 0.64

  useFrame((state, dt) => {
    const p = progress.current
    const t = state.clock.elapsedTime
    const g = group.current
    if (!g) return

    const visible = p > 0.545 && (model || hilux)
    g.visible = !!visible
    if (!visible) return

    // Posición sobre la Avenida Intercomunal
    truckPos(p, _tp)
    g.position.set(_tp[0], 0, _tp[2])

    // Aparición: fundido + escala progresiva reemplazando al marcador GPS
    const appear = smooth(range(p, 0.552, 0.615))
    const scale = 0.55 + 0.45 * appear
    g.scale.setScalar(scale)

    if (planeMat.current) planeMat.current.opacity = appear
    if (redTintMat.current)
      redTintMat.current.opacity = appear * (0.1 + 0.05 * Math.sin(t * 1.7))
    if (blueTintMat.current)
      blueTintMat.current.opacity = appear * (0.06 + 0.03 * Math.sin(t * 1.1 + 2))
    if (shadowMat.current) shadowMat.current.opacity = appear * 0.62
    if (reflectMat.current)
      reflectMat.current.opacity = appear * (0.16 + 0.04 * Math.sin(t * 2.3))
    if (headGlowMat.current)
      headGlowMat.current.opacity = appear * fade(p, 0.6, 0.66, 1.01, 1.02) * 0.5

    // Modelo 3D real: orientado a la vía, ruedas girando a la velocidad real
    const mg = modelGroup.current
    if (model && mg) {
      const heading = truckHeading(p) + MODEL_YAW_OFFSET
      // Firme sobre el asfalto: nada de rebote. La sensación de velocidad la
      // dan las ruedas girando y las marcas de la vía pasando.
      mg.rotation.y = heading
      mg.rotation.z = 0
      mg.rotation.x = 0
      // Se apoya SOBRE el asfalto (la calzada está a 0.011; el radio de rueda
      // escalado es ~0.011, así que a y=0 quedaba enterrada hasta el eje).
      mg.position.y = ROAD_Y
      // Las ruedas giran EXACTAMENTE lo que avanza el vehículo: ángulo =
      // distancia recorrida / radio. Si el scroll se detiene, el avance es
      // cero y las ruedas se paran solas; al reanudar, vuelven a girar.
      // (Ojo: hay que integrar el avance, no truckSpeed(p), que es la
      // derivada respecto al PROGRESO y vale ~88 aunque estés quieto.)
      const d = truckDistance(p)
      const advance = d - lastDist.current
      lastDist.current = d
      let spin = advance / Math.max(model.wheelRadius, 1e-5)
      // El recorrido son 572 m repartidos en ~1900 px de scroll, así que el
      // giro exacto da ~12 vueltas por muesca de rueda del ratón: por aliasing
      // la llanta volvería a verse quieta. Se acota a lo que el ojo sigue,
      // conservando sentido de giro y parada en seco al soltar el scroll.
      if (spin > MAX_SPIN) spin = MAX_SPIN
      else if (spin < -MAX_SPIN) spin = -MAX_SPIN
      else if (spin > -MIN_SPIN && spin < MIN_SPIN) spin = 0
      if (spin !== 0) {
        model.pivots.forEach((pv) => {
          pv.rotateOnAxis(pv.userData.axis, -spin)
        })
      }
    }

    // Fotografía (fallback): billboard amortiguado + oscilación suave
    const pg = planeGroup.current
    if (!model && pg) {
      const cam = state.camera.position
      const targetYaw = Math.atan2(cam.x - g.position.x, cam.z - g.position.z)
      let dy = targetYaw - yaw.current
      while (dy > Math.PI) dy -= Math.PI * 2
      while (dy < -Math.PI) dy += Math.PI * 2
      yaw.current += dy * 0.08
      pg.rotation.y = yaw.current + Math.sin(t * 0.7) * 0.02
      pg.rotation.z = Math.sin(t * 0.9) * 0.014
      pg.rotation.x = -0.015 + Math.sin(t * 1.3) * 0.008
      pg.position.y = planeH / 2 - 0.06
    }

    // Marcas de velocidad sobre el asfalto (sensación de ruedas en movimiento)
    const dm = dashesRef.current
    if (dm) {
      const spd = truckSpeed(p)
      const strength = Math.min(1, spd / 25) * appear
      dashData.forEach((d, i) => {
        const travel = 1.2 - ((d.offset + t * 0.6) % 1.2)
        _obj.position.set(
          -ROAD_DIR[0] * travel + ROAD_DIR[2] * d.side,
          0.03,
          -ROAD_DIR[2] * travel - ROAD_DIR[0] * d.side
        )
        _obj.position.y = ROAD_Y + 0.0006
        _obj.rotation.set(-Math.PI / 2, 0, -Math.atan2(ROAD_DIR[2], ROAD_DIR[0]))
        // estelas finas de velocidad, no bloques tipo paso de cebra
        const s = Math.max(0.0001, strength * (1 - travel / 1.2))
        _obj.scale.set(0.16 * s, 0.008, 1)
        _obj.updateMatrix()
        dm.setMatrixAt(i, _obj.matrix)
      })
      dm.instanceMatrix.needsUpdate = true
    }
  })

  if (!hilux && !model) return null

  return (
    <group ref={group} visible={false}>
      {/* Sombra de contacto y reflejo de la pintura sobre el asfalto.
          Ambas calcomanías se dimensionan con MODEL_LENGTH, no con PLANE_W:
          PLANE_W (2.5 u) era el ancho del billboard fotográfico, o sea 55 m —
          la sombra tapaba media manzana y el reflejo rojo teñía toda la
          calzada visible en el plano cercano. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROAD_Y + 0.0004, 0]} renderOrder={2}>
        <planeGeometry args={[MODEL_LENGTH * 1.5, MODEL_LENGTH * 0.78]} />
        <meshBasicMaterial
          ref={shadowMat}
          map={shadowTex}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROAD_Y + 0.0008, 0]} renderOrder={3}>
        <planeGeometry args={[MODEL_LENGTH * 1.7, MODEL_LENGTH * 0.9]} />
        <meshBasicMaterial
          ref={reflectMat}
          map={reflectTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Modelo 3D real (public/hilux.glb) cuando está disponible */}
      {model && (
        <group ref={modelGroup}>
          <primitive object={model.scene} />
          {/* Clave y relleno del vehículo. Las distancias van en unidades de
              escena (1 u ≈ 22 m): la camioneta mide 0.24 u, así que un radio
              de 18 u alumbraría 400 m de ciudad. */}
          <pointLight color="#dceaff" intensity={0.5} position={[0.3, 0.42, 0.3]} distance={1.8} decay={1.6} />
          <pointLight color="#8fb8e8" intensity={0.2} position={[-0.3, 0.24, -0.26]} distance={1.4} decay={1.8} />
        </group>
      )}

      {/* Fallback: plano con la fotografía de la Hilux */}
      {!model && hilux && (
      <group ref={planeGroup} position={[0, planeH / 2 - 0.06, 0]}>
        <mesh renderOrder={4}>
          <planeGeometry args={[PLANE_W, planeH]} />
          <meshBasicMaterial
            ref={planeMat}
            map={hilux.texture}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Iluminación roja sobre la carrocería (aditiva, enmascarada por el alfa) */}
        <mesh position={[0, 0, 0.012]} renderOrder={5}>
          <planeGeometry args={[PLANE_W, planeH]} />
          <meshBasicMaterial
            ref={redTintMat}
            map={hilux.texture}
            color="#C3151C"
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Luz azul ambiental sobre el vehículo */}
        <mesh position={[0, 0, 0.024]} renderOrder={6}>
          <planeGeometry args={[PLANE_W, planeH]} />
          <meshBasicMaterial
            ref={blueTintMat}
            map={hilux.texture}
            color="#3D9BF5"
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Brillo de faros */}
        <sprite position={[-PLANE_W * 0.31, -planeH * 0.12, 0.05]} scale={[1.5, 0.8, 1]}>
          <spriteMaterial
            ref={headGlowMat}
            map={headTex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      )}

      {/* Marcas de velocidad en la vía (azul sobre asfalto oscuro) */}
      <instancedMesh ref={dashesRef} args={[null, null, DASH_COUNT]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#4d9bff"
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Acento frío de marca, ceñido al vehículo. NO se pone una luz roja
          aquí: por muy tenue que sea, su radio cubre toda la calzada visible
          en el plano cercano y el asfalto deja de leerse como asfalto. */}
      <pointLight color="#3D9BF5" position={[0.26, 0.32, -0.2]} distance={1.1} decay={1.8} intensity={0.16} />
    </group>
  )
}
