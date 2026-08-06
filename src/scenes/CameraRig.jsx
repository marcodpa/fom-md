import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { cameraState } from '../utils/stages'

// Suaviza el progreso crudo del scroll y mueve la cámara por la ruta
// cinematográfica. El suavizado corre con prioridad -1 para que todas las
// escenas lean el mismo valor en el mismo frame.
export function ProgressSmoother({ raw, smooth, fixed = null }) {
  useFrame((_, dt) => {
    const target = fixed !== null ? fixed : raw.current
    const k = Math.min(1, dt * 5.5)
    smooth.current += (target - smooth.current) * k
    if (Math.abs(target - smooth.current) < 0.00005) smooth.current = target
  }, -1)
  return null
}

export function CameraRig({ progress }) {
  const state = useMemo(() => new Array(8).fill(0), [])

  useFrame(({ camera }) => {
    cameraState(progress.current, state)
    camera.position.set(state[0], state[1], state[2])
    camera.lookAt(state[3], state[4], state[5])
    // El plano cercano viaja con la cámara: la toma final entra en la cabina,
    // donde el salpicadero queda a 0.023 u del ojo y un near fijo de 0.1 lo
    // recortaría entero.
    const dirty = Math.abs(camera.fov - state[6]) > 0.01 || camera.near !== state[7]
    if (dirty) {
      camera.fov = state[6]
      camera.near = state[7]
      camera.updateProjectionMatrix()
    }
  })

  return null
}
