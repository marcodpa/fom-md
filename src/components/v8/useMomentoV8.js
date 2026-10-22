// Movimiento de la web v8 (GSAP + ScrollTrigger). Solo transform y opacidad.
// Con «reducir movimiento» no se anima nada: todo visible y quieto desde el primer pintado.
//
// Lo que este hook hace solo, según atributos en el HTML (las piezas de la base ya los ponen):
//   data-v8-3d="hero"     → (HeroV8) entrada encadenada al cargar: kicker y titular por líneas
//                           girando desde abajo, la foto/panel entrando con profundidad 3D que se
//                           asienta, luego la bajada, los botones y la nota, SOLOS, sin bajar. Al
//                           bajar, el texto y el resplandor se mueven a distinta velocidad (capas).
//   data-v8-3d="tarjeta"  → (TarjetaVidrioV8, TarjetaCarruselV8) entran una tras otra con giro 3D
//                           (en el carrusel, como páginas que se abren desde la derecha). Con
//                           ratón: inclinación 3D y brillo que sigue al cursor.
//   data-v8-3d="captura"  → (CapturaFlotanteV8) gira levemente a su sitio mientras entra.
//   data-v8-3d="cifra"    → (BloqueCifrasV8) la cifra sube girando como una paleta.
//   data-v8-3d="seccion"  → (SeccionV8) su contenido «se acerca» desde atrás al entrar.
//   data-v8-entra         → entrada escalonada al cargar (fuera de un hero 3D: subida plana).
//   data-v8-crece         → la foto del hero pasa de 92 % a 100 % al bajar (scrub).
//   data-v8-aparece       → aparición suave al entrar en pantalla (una sola vez).
// Para apagar el 3D de una pieza: pásale data-v8-3d="" (o "no").
//
// Regla de las fotos y capturas: NUNCA se ven más grandes que su tamaño real. Todo giro 3D lleva
// un translateZ negativo que mantiene el borde más cercano por detrás del plano (escala ≤ 1).
// Momentos propios de cada página (escenas fijas, recorridos): pásalos en `momentos`, que recibe
// { q, gsap, ScrollTrigger, escritorio } y solo corre con movimiento permitido. Las escenas fijas
// (pin) van SOLO cuando escritorio === true (≥ 1024 px). Las piezas 3D dentro de una escena fija
// no hacen su entrada propia (la escena manda). Todo se limpia solo al desmontar.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const MEDIDAS_V8 = {
  movimiento: '(prefers-reduced-motion: no-preference)',
  escritorio: '(min-width: 1024px)',
  raton: '(hover: hover) and (pointer: fine)',
}

const RAD = Math.PI / 180
// Ángulo máximo (grados) para que una pieza de `alto` px girada sobre su centro no sobresalga más
// de `margen` px hacia quien mira.
const anguloSeguro = (mitad, margen, tope) => Math.min(tope, Math.asin(Math.min(1, margen / Math.max(mitad, 1))) / RAD)

export default function useMomentoV8(raiz, momentos) {
  useGSAP(() => {
    const q = gsap.utils.selector(raiz)
    const mm = gsap.matchMedia()
    mm.add(MEDIDAS_V8, ctx => {
      const { movimiento, escritorio, raton } = ctx.conditions
      if (!movimiento) return
      const f = escritorio ? 1 : 0.55 // en el teléfono y la tableta, todo más suave
      const ahora = () => performance.now()
      // Lo que entra al cargar espera a que el hero termine de presentarse (encadenado).
      let finIntro = 0
      const espera = () => Math.max(0, (finIntro - ahora()) / 1000)

      // 1 · Hero 3D: entrada encadenada al cargar.
      const heroes = q('[data-v8-3d="hero"]')
      heroes.forEach(hero => {
        const tl = gsap.timeline({ delay: 0.08, defaults: { ease: 'expo.out' } })
        const entra = [...hero.querySelectorAll('[data-v8-entra]')]
        const kicker = entra.filter(el => el.classList.contains('v8-kick'))
        let lineas = entra.filter(el => el.classList.contains('v8-linea'))
        // En el teléfono las líneas corren seguidas (inline): se anima el titular entero.
        if (lineas.length && getComputedStyle(lineas[0]).display === 'inline') lineas = [lineas[0].closest('h1') || lineas[0]]
        const resto = entra.filter(el => !kicker.includes(el) && !el.classList.contains('v8-linea'))
        const medio = hero.querySelector('.v8-hero-medio')
        const nota = medio?.querySelector('.v8-nota-vidrio')

        if (kicker.length) tl.from(kicker, { opacity: 0, y: 18 * f, rotationX: -45 * f, transformPerspective: 700, transformOrigin: '50% 0%', duration: 1.1, clearProps: 'transform,opacity' }, 0)
        if (lineas.length) tl.from(lineas, { opacity: 0, yPercent: 55, rotationX: -70 * f, transformPerspective: 900, transformOrigin: '50% 0%', duration: 1.35, stagger: 0.13, clearProps: 'transform,opacity' }, 0.08)
        if (medio) {
          // La caja de la foto comparte el transform con data-v8-crece (escala): aquí solo giro,
          // profundidad y subida, que terminan en 0. El origen es arriba (el de «crece»): el giro
          // adelanta el borde de abajo, así que la profundidad lo compensa (escala ≤ 1).
          const alto = medio.offsetHeight || 600
          const giro = 15 * f
          const z = -(alto * Math.sin(giro * RAD) + 120 * f)
          tl.fromTo(medio, { opacity: 0, y: 110 * f, rotationX: giro, z, transformPerspective: 1800 },
            { opacity: 1, y: 0, rotationX: 0, z: 0, duration: 2, ease: 'expo.out', clearProps: 'opacity' }, 0.3)
        }
        if (resto.length) tl.from(resto, { opacity: 0, y: 26 * f, rotationX: -35 * f, transformPerspective: 800, transformOrigin: '50% 0%', duration: 1.1, stagger: 0.12, clearProps: 'transform,opacity' }, 0.72)
        if (nota) tl.from(nota, { opacity: 0, y: 30 * f, rotationX: -55 * f, transformPerspective: 800, transformOrigin: '50% 100%', duration: 1.2, clearProps: 'transform,opacity' }, 1.25)
        finIntro = Math.max(finIntro, ahora() + 1450)

        // Capas al bajar: el texto se va más rápido que la página y el resplandor más lento.
        const texto = hero.querySelector(':scope > .v8-c')
        if (texto) gsap.to(texto, { y: -90 * f, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      })
      if (heroes.length) {
        const brillo = q('.v8-glow')
        if (brillo.length) gsap.to(brillo, { y: 240 * f, ease: 'none', scrollTrigger: { trigger: heroes[0], start: 'top top', end: '+=1100', scrub: true } })
      }

      // 1b · Entradas sueltas fuera de un hero 3D (composiciones propias): subida plana.
      const entraSuelta = q('[data-v8-entra]').filter(el => !el.closest('[data-v8-3d="hero"]'))
      if (entraSuelta.length) {
        gsap.from(entraSuelta, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.05, clearProps: 'transform,opacity' })
        finIntro = Math.max(finIntro, ahora() + 600)
      }

      // 2 · Foto del hero: de 92 % a 100 % con el desplazamiento. Se anima la caja, nunca más
      //     allá de 1 (no se agranda la imagen por encima de su tamaño).
      q('[data-v8-crece]').forEach(caja => {
        gsap.fromTo(caja, { scale: 0.92, transformOrigin: '50% 0%' }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: caja, start: 'top 95%', end: 'top 15%', scrub: true },
        })
      })

      // 3 · Aparición suave al entrar (opacidad + 24 px), una sola vez. Lo que ya está en pantalla
      //     al cargar sale después del hero, solo.
      const aparece = q('[data-v8-aparece]').filter(el => !el.matches('[data-v8-3d="tarjeta"], [data-v8-3d="cifra"]'))
      if (aparece.length) {
        gsap.set(aparece, { opacity: 0, y: 24 })
        ScrollTrigger.batch(aparece, {
          start: 'top 90%', once: true,
          onEnter: lote => gsap.to(lote, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.07, delay: espera(), overwrite: true, clearProps: 'transform,opacity' }),
        })
      }

      // 4 · Momentos propios de la página (antes del 3D, para saber qué escenas quedan fijas).
      const limpiarPagina = momentos?.({ q, gsap, ScrollTrigger, escritorio })
      const fijas = ScrollTrigger.getAll().map(st => st.pin).filter(Boolean)
      const enFija = el => fijas.some(p => p.contains(el) || el.contains(p))

      // 5 · Tarjetas: entran una tras otra con giro 3D.
      const listas = new WeakSet() // ya asentadas: pueden inclinarse con el ratón
      const tarjetas = q('[data-v8-3d="tarjeta"]').filter(el => {
        if (enFija(el) || el.closest('[data-v8-3d="hero"]')) { listas.add(el); return false }
        return true
      })
      if (tarjetas.length) {
        const centro = window.innerWidth / 2
        tarjetas.forEach(el => {
          if (el.closest('.v8-carrusel-pista')) {
            // Carrusel: cada tarjeta gira sobre su borde izquierdo desde la derecha (como una
            // página que se abre). Giro positivo con origen a la izquierda = todo queda detrás.
            gsap.set(el, { opacity: 0, x: 150 * f, z: -220 * f, rotationY: 42 * f, transformOrigin: '0% 50%', transformPerspective: 1400 })
          } else {
            // Rejilla: suben inclinadas hacia atrás y miran hacia el centro de la pantalla.
            const r = el.getBoundingClientRect()
            const lado = Math.abs(r.left + r.width / 2 - centro) < 60 ? 0 : Math.sign(r.left + r.width / 2 - centro)
            const giroY = -lado * 14 * f
            const z = -((r.width / 2) * Math.sin(Math.abs(giroY) * RAD) + 140 * f)
            gsap.set(el, { opacity: 0, y: 70 * f, z, rotationX: 20 * f, rotationY: giroY, transformOrigin: '50% 100%', transformPerspective: 1200 })
          }
        })
        ScrollTrigger.batch(tarjetas, {
          start: 'top 88%', once: true,
          onEnter: lote => {
            const base = espera()
            lote.forEach((el, i) => gsap.to(el, {
              opacity: 1, x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, duration: 1.5, ease: 'power3.out',
              delay: base + i * 0.16, overwrite: true, clearProps: 'transform,opacity',
              onComplete: () => listas.add(el),
            }))
          },
        })
      }

      // 6 · Cifras: la cifra sube girando (como una paleta) y luego su etiqueta.
      const cifras = q('[data-v8-3d="cifra"]').filter(el => !enFija(el))
      if (cifras.length) {
        cifras.forEach(el => {
          gsap.set(el.querySelector('strong'), { opacity: 0, y: 22 * f, rotationX: 85 * f, transformOrigin: '50% 100%', transformPerspective: 500 })
          gsap.set(el.querySelector('span'), { opacity: 0, y: 12 })
        })
        ScrollTrigger.batch(cifras, {
          start: 'top 90%', once: true,
          onEnter: lote => {
            const base = espera()
            lote.forEach((el, i) => {
              const d = base + i * 0.14
              gsap.to(el.querySelector('strong'), { opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: 'expo.out', delay: d, overwrite: true, clearProps: 'transform,opacity' })
              gsap.to(el.querySelector('span'), { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', delay: d + 0.25, overwrite: true, clearProps: 'transform,opacity' })
            })
          },
        })
      }

      // 7 · Capturas: giran levemente a su sitio mientras entran (atadas al desplazamiento).
      //     Las de dentro de una tarjeta o del hero ya se mueven con su contenedor.
      q('[data-v8-3d="captura"]').filter(el => !enFija(el) && !el.closest('[data-v8-3d="tarjeta"], [data-v8-3d="hero"]')).forEach(el => {
        const telefono = el.classList.contains('is-telefono')
        const desde = telefono
          ? { rotationY: -22 * f, rotationX: 8 * f, y: 70 * f, z: -170 * f, transformOrigin: '50% 50%' }
          : { rotationX: 18 * f, y: 90 * f, z: -150 * f, transformOrigin: '50% 100%' }
        gsap.fromTo(el, { ...desde, transformPerspective: 1800 }, {
          rotationX: 0, rotationY: 0, y: 0, z: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'clamp(top 55%)', scrub: 0.9 },
        })
      })

      // 8 · Secciones que «se acercan»: sus bloques llegan desde atrás al entrar (una vez). Se
      //     saltan los que tienen escena fija o tarjetas (las tarjetas ya hacen su propia entrada).
      q('[data-v8-3d="seccion"]').forEach(sec => {
        const bloques = [...sec.children].filter(el => !enFija(el) && !el.querySelector('[data-v8-3d="tarjeta"]') && el.offsetHeight > 0)
        bloques.forEach(el => {
          const alto = el.offsetHeight
          const giro = anguloSeguro(alto, 110 * f, 6 * f)
          gsap.set(el, { y: 44 * f, z: -(alto * Math.sin(giro * RAD) + 40 * f), rotationX: giro, transformOrigin: '50% 0%', transformPerspective: 1600 })
          ScrollTrigger.create({
            trigger: el, start: 'top 92%', once: true,
            onEnter: () => gsap.to(el, { y: 0, z: 0, rotationX: 0, duration: 1.5, ease: 'power3.out', delay: espera(), overwrite: true, clearProps: 'transform' }),
          })
        })
      })

      // 9 · Inclinación 3D con brillo que sigue al cursor (solo con ratón, ya asentadas).
      let quitarInclinacion = null
      if (raton && raiz.current) {
        const nodo = raiz.current
        let actual = null
        let datos = null
        let cuadro = 0
        let ultimo = null
        const soltar = () => {
          if (!actual) return
          const el = actual
          actual = null
          el.classList.remove('is-brillo')
          gsap.to(el, { rotationX: 0, rotationY: 0, z: 0, duration: 0.8, ease: 'power3.out', overwrite: true, clearProps: 'transform' })
        }
        const tomar = el => {
          const r = el.getBoundingClientRect()
          // Piezas enormes o con campos de formulario: sin inclinación.
          if (r.width > 760 || el.querySelector('input, textarea, select')) return false
          const mitad = Math.max(r.width, r.height) / 2
          const ang = anguloSeguro(mitad, 24, 7)
          datos = { ang, z: -mitad * Math.sin(ang * RAD) * 1.4 }
          actual = el
          el.classList.add('is-brillo')
          gsap.set(el, { transformPerspective: 900, transformOrigin: '50% 50%' })
          return true
        }
        const pintar = () => {
          cuadro = 0
          const e = ultimo
          if (!e || !actual) return
          const r = actual.getBoundingClientRect()
          const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
          const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
          actual.style.setProperty('--v8-brillo-x', `${(nx * 100).toFixed(1)}%`)
          actual.style.setProperty('--v8-brillo-y', `${(ny * 100).toFixed(1)}%`)
          gsap.to(actual, { rotationY: (nx - 0.5) * 2 * datos.ang, rotationX: (0.5 - ny) * 2 * datos.ang, z: datos.z, duration: 0.6, ease: 'power3.out', overwrite: 'auto' })
        }
        const mover = e => {
          if (e.pointerType && e.pointerType !== 'mouse') return
          const el = e.target.closest?.('[data-v8-3d="tarjeta"]')
          const valida = el && nodo.contains(el) && listas.has(el) ? el : null
          if (valida !== actual) { soltar(); if (valida && !tomar(valida)) return }
          if (!actual) return
          ultimo = e
          if (!cuadro) cuadro = requestAnimationFrame(pintar)
        }
        const salir = () => soltar()
        nodo.addEventListener('pointermove', mover, { passive: true })
        nodo.addEventListener('pointerleave', salir)
        window.addEventListener('blur', salir)
        quitarInclinacion = () => {
          cancelAnimationFrame(cuadro)
          nodo.removeEventListener('pointermove', mover)
          nodo.removeEventListener('pointerleave', salir)
          window.removeEventListener('blur', salir)
          if (actual) { actual.classList.remove('is-brillo'); actual = null }
        }
      }

      return () => {
        quitarInclinacion?.()
        if (typeof limpiarPagina === 'function') limpiarPagina()
      }
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
