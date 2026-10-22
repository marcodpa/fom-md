// Animación con medida para la web v8 (GSAP + ScrollTrigger).
//
// Regla de los tableros: SOLO los momentos anotados en la nota azul de cada página. Todo lo demás,
// quieto o con una aparición suave al entrar (opacidad + 24 px). Solo transform y opacidad.
// Con «reducir movimiento» no se anima nada: todo visible y quieto desde el primer pintado.
//
// Lo que este hook hace solo, según atributos en el HTML:
//   data-v8-entra    → entrada escalonada del hero al cargar (kicker, titular por líneas, bajada,
//                      botones). Lo ponen HeroV8 y EncabezadoV8 cuando se les pide.
//   data-v8-crece    → la foto del hero pasa de 92 % a 100 % al bajar (scrub). La pone HeroV8.
//   data-v8-aparece  → aparición suave al entrar en pantalla (una sola vez).
// Momentos propios de cada página (escenas fijas, recorridos): pásalos en `momentos`, que recibe
// { q, gsap, ScrollTrigger, escritorio } y solo corre con movimiento permitido. Las escenas fijas
// (pin) van SOLO cuando escritorio === true (≥ 1024 px): en el teléfono no hay escenas fijas.
// Todo se limpia solo al desmontar (useGSAP + matchMedia revierten estilos y ScrollTriggers).
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const MEDIDAS_V8 = {
  movimiento: '(prefers-reduced-motion: no-preference)',
  escritorio: '(min-width: 1024px)',
}

export default function useMomentoV8(raiz, momentos) {
  useGSAP(() => {
    const q = gsap.utils.selector(raiz)
    const mm = gsap.matchMedia()
    mm.add(MEDIDAS_V8, ctx => {
      const { movimiento, escritorio } = ctx.conditions
      if (!movimiento) return

      // 1 · Hero: entrada escalonada. clearProps devuelve el elemento a su estado sin transform
      //     para que el texto y las fotos queden nítidos al terminar.
      const entra = q('[data-v8-entra]')
      if (entra.length) {
        gsap.from(entra, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.05, clearProps: 'transform,opacity' })
      }

      // 2 · Foto del hero: de 92 % a 100 % con el desplazamiento. Se anima la caja, nunca más
      //     allá de 1 (no se agranda la imagen por encima de su tamaño).
      q('[data-v8-crece]').forEach(caja => {
        gsap.fromTo(caja, { scale: 0.92, transformOrigin: '50% 0%' }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: caja, start: 'top 95%', end: 'top 15%', scrub: true },
        })
      })

      // 3 · Aparición suave al entrar (opacidad + 24 px), una sola vez.
      const aparece = q('[data-v8-aparece]')
      if (aparece.length) {
        gsap.set(aparece, { opacity: 0, y: 24 })
        ScrollTrigger.batch(aparece, {
          start: 'top 90%', once: true,
          onEnter: lote => gsap.to(lote, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.06, overwrite: true, clearProps: 'transform,opacity' }),
        })
      }

      // 4 · Momentos propios de la página.
      return momentos?.({ q, gsap, ScrollTrigger, escritorio })
    })

    // La letra Inter llega después del primer pintado y cambia alturas: recalcular los tramos
    // cuando cargue y cuando la página cambie de alto (con espera, para no encadenar).
    let espera = 0
    let alto = 0
    const recalcular = () => { clearTimeout(espera); espera = setTimeout(() => ScrollTrigger.refresh(), 150) }
    document.fonts?.ready.then(recalcular)
    window.addEventListener('load', recalcular)
    const observador = new ResizeObserver(([e]) => {
      const nuevo = Math.round(e.contentRect.height)
      if (Math.abs(nuevo - alto) > 2) { alto = nuevo; recalcular() }
    })
    if (raiz.current) observador.observe(raiz.current)
    return () => { clearTimeout(espera); observador.disconnect(); window.removeEventListener('load', recalcular); mm.revert() }
  }, { scope: raiz })
}
