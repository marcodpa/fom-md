import { useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { AVENUE_HW, CURB_W, PATH_LEN, sampleAt } from '../utils/avenue'
import { m } from '../utils/cityTextures'

// Semáforos del set de props de calle. Las farolas volvieron a ser geometría
// propia (ver StreetDetail): el modelo del set se leía peor a esta escala.

const MODEL_URL = '/props.glb'
const _o = new THREE.Object3D()

// El set trae 10 props, una malla cada uno, con el eje Z hacia arriba (la
// raíz viene rotada -90° en X). Ojo con los nombres: GLTFLoader los sanea
// —"metal street props low poly.011" llega como "..._low_poly011_..."—, así
// que los patrones van sobre el nombre YA saneado.
const SIGNAL_MESH = /_low_poly011_/ // semáforo de tres luces, 3.55 m

const SIGNAL_H = m(3.6)
const SIGNAL_EVERY = m(150)

// El set viene con metalness alta ("metal street props"). Sin mapa de entorno
// un material metálico no recibe componente difusa y el poste sale negro: se
// baja a dieléctrico y se sube la emisión, que es la que enciende la
// luminaria y las lentes del semáforo.
const _matCache = new Map()
function propMaterial(src) {
  if (_matCache.has(src)) return _matCache.get(src)
  const mat = src.clone()
  mat.metalness = 0.18
  mat.roughness = 0.72
  mat.emissive = new THREE.Color('#ffffff')
  mat.emissiveIntensity = 2.4
  _matCache.set(src, mat)
  return mat
}

// Normaliza una malla del set: hornea la transformación de mundo, la centra
// sobre su huella y la apoya en y=0, para poder escalarla y plantarla.
function normalize(gltf, match) {
  const scene = gltf.scene
  scene.updateWorldMatrix(true, true)
  let found = null
  scene.traverse((o) => {
    if (found || !o.isMesh || !match.test(o.name)) return
    const geo = o.geometry.clone()
    geo.applyMatrix4(o.matrixWorld)
    geo.computeBoundingBox()
    const bb = geo.boundingBox
    geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
    geo.computeBoundingSphere()
    found = { geo, material: propMaterial(o.material), height: bb.max.y - bb.min.y }
  })
  return found
}

function buildPlacements() {
  const signals = []
  for (let d = 8; d < PATH_LEN - 8; d += SIGNAL_EVERY) {
    const s = sampleAt(d)
    signals.push({ s, off: AVENUE_HW + CURB_W + m(0.8) })
  }
  return signals
}

export default function StreetLights() {
  const gltf = useGLTF(MODEL_URL, '/draco/')
  const signal = useMemo(() => normalize(gltf, SIGNAL_MESH), [gltf])
  const signals = useMemo(buildPlacements, [])
  const signalRef = useRef()

  useLayoutEffect(() => {
    if (!signal) return
    const scale = SIGNAL_H / signal.height
    signals.forEach((g, i) => {
      const { s, off } = g
      _o.position.set(s.x + s.nx * off, 0, s.z + s.nz * off)
      _o.rotation.set(0, s.yaw + Math.PI, 0) // mirando al tráfico que llega
      _o.scale.setScalar(scale)
      _o.updateMatrix()
      signalRef.current.setMatrixAt(i, _o.matrix)
    })
    signalRef.current.instanceMatrix.needsUpdate = true
    signalRef.current.computeBoundingSphere()
  }, [signal, signals])

  return (
    <group>
      {signal && signals.length > 0 && (
        <instancedMesh
          ref={signalRef}
          args={[signal.geo, signal.material, signals.length]}
        />
      )}
    </group>
  )
}

useGLTF.preload(MODEL_URL, '/draco/')
