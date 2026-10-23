// Piezas compartidas de las escenas extra de la web v8 (T-142): televisor, monitores, alerta y
// tablero. Cada escena se mueve SOLA (no depende de useMomentoV8): usarEscenaV8 abre su propio
// gsap.matchMedia dentro de la escena y lo limpia al desmontar.
//   - Escena fija (pin) solo en escritorio (≥ 1024 px); en tableta y teléfono, sin pin.
//   - «Reducir movimiento»: no se crea nada; el CSS de cada escena ya pinta el estado final quieto.
//   - Solo transform, opacidad y un filtro de brillo corto mientras una pantalla se enciende.
// Regla de siempre (como los teléfonos): ningún giro acerca la pieza; cada giro 3D lleva un
// translateZ negativo para que nada se vea más grande que su tamaño real.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { fotoV8 } from './fotosV8'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const MEDIDAS_ESCENA_V8 = {
  movimiento: '(prefers-reduced-motion: no-preference)',
  escritorio: '(min-width: 1024px)',
  telefono: '(max-width: 599px)',
}

const RAD = Math.PI / 180

// Profundidad que compensa un giro (Y sobre el ancho, X sobre el alto) para que nada se acerque.
export const fondoV8 = (ancho, alto, giroY = 0, giroX = 0) =>
  -(ancho / 2 * Math.sin(Math.abs(giroY) * RAD) + alto / 2 * Math.sin(Math.abs(giroX) * RAD)) - 6

// Inicio de una escena fija: centrada en el espacio libre bajo la barra global flotante; si no
// cabe, fija por arriba (igual que la escena de teléfonos).
export const inicioCentradoV8 = (el, barra = 90) => () => {
  const libre = window.innerHeight - barra
  const alto = el.offsetHeight
  return alto < libre ? `top ${Math.round(barra + (libre - alto) / 2)}px` : `top ${barra}px`
}

// Posición (sin transform) de un punto de `el` relativo a `ref`: fx, fy = fracción del ancho y
// del alto de `el`. Recorre offsetParent, así el giro 3D de la escena no altera la medida.
export function puntoV8(el, ref, fx = 0.5, fy = 0.5) {
  let x = 0, y = 0, n = el
  while (n && n !== ref) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
  return { x: x + el.offsetWidth * fx, y: y + el.offsetHeight * fy }
}

// Mueve una escena: `momento({ el, q, gsap, ScrollTrigger, escritorio, telefono })` corre solo
// con movimiento permitido y puede devolver una función de limpieza.
export function usarEscenaV8(raiz, momento) {
  useGSAP(() => {
    const el = raiz.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(MEDIDAS_ESCENA_V8, ctx => {
      const { movimiento, escritorio, telefono } = ctx.conditions
      if (!movimiento) return
      return momento({ el, q: gsap.utils.selector(el), gsap, ScrollTrigger, escritorio, telefono })
    })
    // La letra llega después del primer pintado y cambia alturas: recalcular los tramos.
    let espera = 0
    const recalcular = () => { clearTimeout(espera); espera = setTimeout(() => ScrollTrigger.refresh(), 150) }
    document.fonts?.ready.then(recalcular)
    window.addEventListener('load', recalcular)
    return () => { clearTimeout(espera); window.removeEventListener('load', recalcular); mm.revert() }
  }, { scope: raiz })
}

const PICTURE = { display: 'contents' }
const SOURCE = { display: 'none' }

// Captura REAL del panel o de la app (src/assets/marketing/v8), nítida: AVIF primero, WebP de
// respaldo y srcset con los anchos reales. Llena su caja (la caja manda el tamaño).
export function CapturaV8({ nombre, alt = '', sizes, className = '' }) {
  const f = fotoV8(nombre)
  if (!f) return null
  return <picture style={PICTURE}>
    {f.avif && <source type="image/avif" srcSet={f.avif} sizes={sizes} style={SOURCE} />}
    <img className={className} src={f.src} srcSet={f.srcSet} sizes={sizes} width={f.width} height={f.height}
      alt={alt} loading="lazy" decoding="async" draggable="false" />
  </picture>
}
