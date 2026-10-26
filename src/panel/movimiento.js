import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { UNSAFE_NavigationContext, useLocation } from 'react-router-dom'

/**
 * MOVIMIENTO DE LA CONSOLA (T-184). Los valores viven en
 * src/styles/movimiento.css y la tabla en src/styles/MOVIMIENTO.md; son los
 * de la app (fom-driver-juan/src/theme/movimiento.ts). Aquí, solo los que
 * JavaScript necesita.
 */
export const MOV = { rapido: 140, normal: 240, lento: 380, desplazamiento: 10, conteo: 500 }

/** CURVA.salida de la app: llega rápido y se posa (lo que entra). */
export const CURVA_SALIDA = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** La misma curva como función 0..1 → 0..1, para lo que se anima a mano (cifras). */
export function curvaSalida(t) {
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1]
  const bez = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  // Busca el s con x(s) = t (bisección: 20 pasos dan de sobra).
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (bez(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return bez(y1, y2, (lo + hi) / 2)
}

/** ¿La persona pidió menos movimiento en su equipo? Entonces nada se anima. */
export function sinMovimiento() {
  // Sin matchMedia (pruebas, navegadores muy viejos) tampoco se anima.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return !!window.matchMedia('(prefers-reduced-motion: reduce)')?.matches
}

// La transición en curso, para no pisar una con otra ni dejar la clase puesta.
let enCurso = null
let actualizando = false
let ultimaVT = 0

/**
 * Hace `cambio` dentro de una View Transition (cambio de pantalla o de tema).
 * Sin la API, con «reducir movimiento» o con la pestaña oculta, lo hace y ya.
 * `cambio` puede devolver una promesa (volver atrás espera a la pantalla nueva).
 */
export function conTransicion(cambio, tipo = 'ruta') {
  const doc = typeof document === 'undefined' ? null : document
  if (!doc?.startViewTransition || actualizando || doc.hidden || sinMovimiento()) {
    const r = cambio()
    return r
  }
  const raiz = doc.documentElement
  const clase = `mov-vt-${tipo}`
  raiz.classList.remove('mov-vt-ruta', 'mov-vt-tema')
  raiz.classList.add(clase)
  let transicion
  try {
    transicion = doc.startViewTransition(() => {
      actualizando = true
      ultimaVT = performance.now()
      try {
        let r
        flushSync(() => { r = cambio() })
        if (r && typeof r.then === 'function') return r.finally(() => { actualizando = false })
        actualizando = false
        return r
      } catch (e) {
        actualizando = false
        throw e
      }
    })
  } catch {
    raiz.classList.remove(clase)
    return cambio()
  }
  enCurso = transicion
  transicion.finished.catch(() => {}).finally(() => {
    if (enCurso === transicion) {
      enCurso = null
      raiz.classList.remove(clase)
    }
  })
  return transicion
}

// Volver atrás (history.go) cambia la pantalla más tarde, en popstate: la
// transición espera a que Consola avise que pintó la nueva.
let alPintar = []
function esperarPantallaNueva(tope = 400) {
  return new Promise((listo) => {
    const fin = () => { clearTimeout(reloj); alPintar = alPintar.filter((f) => f !== fin); listo() }
    const reloj = setTimeout(fin, tope)
    alPintar.push(fin)
  })
}

const rutaDe = (destino) => (typeof destino === 'string' ? new URL(destino, window.location.href).pathname : destino?.pathname)
const cambiaPantalla = (destino) => {
  const ruta = rutaDe(destino)
  return !!ruta && ruta !== window.location.pathname
}

/**
 * El navegador del router envuelto: TODA navegación de la consola que cambia
 * de pantalla (enlaces, menú, pestañas, navigate() de los módulos, volver)
 * pasa por una View Transition. Si solo cambian los parámetros (?vista=…),
 * la pantalla ya se encarga de su cambio y no se toca.
 *
 * Devuelve el valor para <UNSAFE_NavigationContext.Provider>.
 */
export function useNavegacionSuave() {
  const contexto = useContext(UNSAFE_NavigationContext)
  return useMemo(() => {
    const base = contexto.navigator
    const navigator = {
      ...base,
      createHref: (...a) => base.createHref(...a),
      encodeLocation: base.encodeLocation ? (...a) => base.encodeLocation(...a) : undefined,
      push: (destino, ...resto) => (cambiaPantalla(destino)
        ? conTransicion(() => base.push(destino, ...resto))
        : base.push(destino, ...resto)),
      replace: (destino, ...resto) => (cambiaPantalla(destino)
        ? conTransicion(() => base.replace(destino, ...resto))
        : base.replace(destino, ...resto)),
      go: (n) => (n
        ? conTransicion(() => { const espera = esperarPantallaNueva(); base.go(n); return espera })
        : base.go(n)),
    }
    return { ...contexto, navigator }
  }, [contexto])
}

/**
 * Cada vez que cambia la pantalla: avisa a una transición que espera (volver)
 * y, si la pantalla cambió SIN View Transition (navegador sin la API, o el
 * botón atrás del navegador), hace la misma entrada con la Web Animations
 * API: fundido y 10 px de subida. Solo opacity y transform.
 */
export function useEntradaPantalla(contenedorRef) {
  const { pathname } = useLocation()
  const primera = useRef(true)
  useLayoutEffect(() => {
    const avisos = alPintar
    alPintar = []
    avisos.forEach((f) => f())
    if (primera.current) { primera.current = false; return undefined }
    if (actualizando || enCurso || performance.now() - ultimaVT < 120 || sinMovimiento()) return undefined
    const main = contenedorRef.current
    if (!main?.animate) return undefined
    const piezas = Array.from(main.children).filter((el) => !el.matches('.pnl-topbar, .pnl-menu-btn, .mv-barra'))
    const animaciones = piezas.map((el) => el.animate(
      [{ opacity: 0, transform: `translate3d(0, ${MOV.desplazamiento}px, 0)` }, { opacity: 1, transform: 'none' }],
      { duration: MOV.normal, easing: CURVA_SALIDA },
    ))
    return () => animaciones.forEach((a) => a.cancel())
  }, [pathname, contenedorRef])
}

/**
 * Las filas de las listas entran una sola vez: al terminar su entrada se
 * marcan con `data-mov-visto` y el CSS ya no las vuelve a animar (aunque
 * React las mueva o las repinte con un refresco).
 */
export function useFilasUnaVez() {
  useEffect(() => {
    const marcar = (e) => {
      if (e.animationName === 'mov-fila-entra') e.target.setAttribute?.('data-mov-visto', '')
    }
    document.addEventListener('animationend', marcar, true)
    document.addEventListener('animationcancel', marcar, true)
    return () => {
      document.removeEventListener('animationend', marcar, true)
      document.removeEventListener('animationcancel', marcar, true)
    }
  }, [])
}
