import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Crea un ScrollTrigger con scrub sobre el contenedor de la intro y expone el
// progreso (0–1) en un ref, sin provocar re-renders de React por frame.
export function useScrollProgress(triggerRef, onUpdate, enabled = true) {
  const progressRef = useRef(0)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!enabled || !triggerRef.current) return undefined

    const st = ScrollTrigger.create({
      trigger: triggerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress
        onUpdateRef.current?.(self.progress)
      },
    })

    // estado inicial correcto si la página carga con scroll previo
    progressRef.current = st.progress
    onUpdateRef.current?.(st.progress)

    return () => st.kill()
  }, [triggerRef, enabled])

  return progressRef
}

export { gsap, ScrollTrigger }
