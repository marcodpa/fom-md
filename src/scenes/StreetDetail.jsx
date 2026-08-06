import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { truckDistance } from '../utils/stages'
import { hdrGlow, m, makeLightPoolTexture } from '../utils/cityTextures'
import { AVENUE_HW, CURB_W, PATH_LEN, WALK_W, offsetRibbon, sampleAt } from '../utils/avenue'
import roadWalkUrl from '../assets/road-walk.webp'

// Mobiliario urbano a lo largo de la avenida por donde circula la unidad.
// Es la única zona donde la cámara baja a nivel de calle, así que el detalle
// se concentra aquí: fuera de este corredor no se dibuja nada de esto.

const _o = new THREE.Object3D()
const POLE_H = m(9)
const LAMP_EVERY = m(28)

function buildPlacements() {
  const lamps = []
  for (let d = 2, k = 0; d < PATH_LEN - 2; d += LAMP_EVERY, k++) {
    const s = sampleAt(d)
    const side = k % 2 === 0 ? 1 : -1 // alternadas a un lado y otro
    lamps.push({ s, side, off: (AVENUE_HW + CURB_W + m(0.9)) * side })
  }
  return { lamps }
}

export default function StreetDetail({ progress }) {
  const { lamps } = useMemo(buildPlacements, [])
  const poolTex = useMemo(makeLightPoolTexture, [])
  const lampGlow = useMemo(() => hdrGlow('#ffdca6', 3.2), [])
  // Acera real del asset. Material a mano: R3F marca como sRGB toda textura
  // que reciba por prop, y aquí hace falta control del wrap y la anisotropía.
  const walkMat = useMemo(() => {
    const map = new THREE.TextureLoader().load(roadWalkUrl)
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = THREE.ClampToEdgeWrapping
    map.wrapT = THREE.RepeatWrapping
    map.anisotropy = 16
    return new THREE.MeshStandardMaterial({ map, color: '#a6b3c4', roughness: 0.95, metalness: 0 })
  }, [])

  // La textura de acera es 256x1024, así que la baldosa a lo largo mide 4x el
  // ancho: las losas salen cuadradas. Se voltea la u en un lado para que el
  // bordillo de la textura quede siempre contra la calzada.
  const walkTile = WALK_W * 4
  const walkL = useMemo(
    () => offsetRibbon(AVENUE_HW + CURB_W + WALK_W / 2, WALK_W, m(0.16), walkTile, true),
    [walkTile]
  )
  const walkR = useMemo(
    () => offsetRibbon(-(AVENUE_HW + CURB_W + WALK_W / 2), WALK_W, m(0.16), walkTile, false),
    [walkTile]
  )
  const curbL = useMemo(() => offsetRibbon(AVENUE_HW + CURB_W / 2, CURB_W, m(0.17)), [])
  const curbR = useMemo(() => offsetRibbon(-(AVENUE_HW + CURB_W / 2), CURB_W, m(0.17)), [])
  const edgeL = useMemo(() => offsetRibbon(AVENUE_HW - m(0.35), m(0.12), 0.0122), [])
  const edgeR = useMemo(() => offsetRibbon(-(AVENUE_HW - m(0.35)), m(0.12), 0.0122), [])

  const poleRef = useRef()
  const armRef = useRef()
  const lampRef = useRef()
  const poolRef = useRef()
  const lightA = useRef()
  const lightB = useRef()

  useLayoutEffect(() => {
    lamps.forEach((l, i) => {
      const { s, off, side } = l
      const px = s.x + s.nx * off
      const pz = s.z + s.nz * off
      _o.position.set(px, POLE_H / 2, pz)
      _o.rotation.set(0, 0, 0)
      _o.scale.set(1, 1, 1)
      _o.updateMatrix()
      poleRef.current.setMatrixAt(i, _o.matrix)
      // brazo hacia la calzada
      const armLen = m(2.2)
      _o.position.set(px - s.nx * side * armLen * 0.5, POLE_H, pz - s.nz * side * armLen * 0.5)
      _o.rotation.set(0, s.yaw, 0)
      _o.scale.set(armLen, 1, 1)
      _o.updateMatrix()
      armRef.current.setMatrixAt(i, _o.matrix)
      // luminaria en la punta del brazo
      const lx = px - s.nx * side * armLen
      const lz = pz - s.nz * side * armLen
      _o.position.set(lx, POLE_H - m(0.25), lz)
      _o.rotation.set(0, s.yaw, 0)
      _o.scale.set(1, 1, 1)
      _o.updateMatrix()
      lampRef.current.setMatrixAt(i, _o.matrix)
      // charco de luz sobre el asfalto
      _o.position.set(lx, 0.0138, lz)
      _o.rotation.set(-Math.PI / 2, 0, 0)
      _o.scale.setScalar(m(13))
      _o.updateMatrix()
      poolRef.current.setMatrixAt(i, _o.matrix)
    })
    poleRef.current.instanceMatrix.needsUpdate = true
    armRef.current.instanceMatrix.needsUpdate = true
    lampRef.current.instanceMatrix.needsUpdate = true
    poolRef.current.instanceMatrix.needsUpdate = true
  }, [lamps])

  // Dos luces reales viajan con el vehículo: son las que hacen que la pintura
  // de la Hilux tenga reflejos que se desplazan al avanzar.
  useFrame(() => {
    const d = truckDistance(progress.current)
    const a = sampleAt(Math.min(PATH_LEN - 1, d + m(16)))
    const b = sampleAt(Math.max(0, d - m(10)))
    if (lightA.current) {
      lightA.current.position.set(a.x + a.nx * 0.3, POLE_H, a.z + a.nz * 0.3)
    }
    if (lightB.current) {
      lightB.current.position.set(b.x - b.nx * 0.3, POLE_H, b.z - b.nz * 0.3)
    }
  })

  return (
    <group>
      {/* Aceras y bordillos: separan calzada de manzana y dan espesor a la calle */}
      <mesh geometry={walkL} material={walkMat} />
      <mesh geometry={walkR} material={walkMat} />
      <mesh geometry={curbL}>
        <meshStandardMaterial color="#7d8798" roughness={0.85} metalness={0} />
      </mesh>
      <mesh geometry={curbR}>
        <meshStandardMaterial color="#7d8798" roughness={0.85} metalness={0} />
      </mesh>

      {/* Líneas blancas de borde de calzada */}
      <mesh geometry={edgeL}>
        <meshBasicMaterial color="#aebbcd" toneMapped={false} />
      </mesh>
      <mesh geometry={edgeR}>
        <meshBasicMaterial color="#aebbcd" toneMapped={false} />
      </mesh>

      {/* Farolas: poste, brazo y luminaria. Vuelven a ser geometría propia
          —el modelo del set de props se leía peor a esta escala—. */}
      <instancedMesh ref={poleRef} args={[null, null, lamps.length]}>
        <cylinderGeometry args={[m(0.11), m(0.16), POLE_H, 6]} />
        <meshStandardMaterial color="#4a5464" roughness={0.6} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[null, null, lamps.length]}>
        <boxGeometry args={[1, m(0.12), m(0.12)]} />
        <meshStandardMaterial color="#4a5464" roughness={0.6} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={lampRef} args={[null, null, lamps.length]}>
        <boxGeometry args={[m(0.55), m(0.2), m(1.1)]} />
        <meshBasicMaterial color={lampGlow} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={poolRef} args={[null, null, lamps.length]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={poolTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      <pointLight ref={lightA} color="#ffe4c4" intensity={1.4} distance={m(34)} decay={2} />
      <pointLight ref={lightB} color="#cddcf2" intensity={0.9} distance={m(28)} decay={2} />
    </group>
  )
}
