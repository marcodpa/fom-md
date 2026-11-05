/**
 * LA LETRA QUE VA DIRECTO SOBRE EL FONDO (docs/FONDOS.md).
 *
 * Con un fondo de tono claro, toda letra del contenido (.pnl-main) que NO tiene
 * detrás una superficie que pinte (tarjeta, barra, chip, campo, botón, hoja…)
 * pasa a tinta oscura; la de las superficies sigue con los colores del diseño.
 *
 * En vez de una lista de clases (que siempre se queda corta), se mira lo que de
 * verdad pinta el navegador: un elemento «pinta» si su fondo calculado tiene
 * opacidad ≥ 0,35 o una imagen/degradado. Se marcan:
 *   - data-fondo-letra="suelta": elemento con texto propio y nada pintado entre
 *     él y .pnl-main → apariencia-fondos.css le pone los tokens de tinta;
 *   - data-fondo-letra="tinta": además, su color propio es claro (un color fijo
 *     del diseño, como un rojo de estado) → se oscurece el MISMO tono hasta AA;
 *   - data-fondo-sup: toda superficie; si cuelga de una letra suelta, vuelve al diseño.
 * Se recalcula con cada cambio del contenido (antes de pintar: MutationObserver)
 * y al cambiar de tamaño, diseño o vidrio. Sin fondo claro no hace nada.
 */

const ALFA_MINIMA = 0.35
/** Luminancia máxima de la tinta: AA (4,5:1) sobre el punto más oscuro del fondo claro (L 0,45). */
const L_TINTA = 0.06

const lin = c => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
export const luminancia = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

/** [r, g, b, a] de un color calculado (`rgb(…)`, `rgba(…)` o `color(srgb …)`); null si no se entiende. */
export function leerColor(valor) {
  if (!valor || valor === 'transparent') return valor === 'transparent' ? [0, 0, 0, 0] : null
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/u.exec(valor)
  if (srgb) return [srgb[1] * 255, srgb[2] * 255, srgb[3] * 255, srgb[4] === undefined ? 1 : Number(srgb[4])]
  const n = valor.match(/[\d.]+/gu)
  if (!n || n.length < 3) return null
  return [Number(n[0]), Number(n[1]), Number(n[2]), n.length > 3 ? Number(n[3]) : 1]
}

/** ¿Este estilo calculado pinta una superficie? */
export function pinta(estilo) {
  if (estilo.backgroundImage && estilo.backgroundImage !== 'none') return true
  const c = leerColor(estilo.backgroundColor)
  return Boolean(c && c[3] >= ALFA_MINIMA)
}

/** El mismo tono, más oscuro, hasta quedar en AA sobre el fondo claro. */
export function oscurecer([r, g, b]) {
  let k = 1
  while (k > 0.05 && luminancia([r * k, g * k, b * k]) > L_TINTA) k -= 0.02
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`
}

/** ¿El color de la letra es claro (se perdería sobre el fondo claro)? */
export const letraClara = color => { const c = leerColor(color); return Boolean(c && c[3] > 0.2 && luminancia(c) > L_TINTA) }

const tieneTextoPropio = el => {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true
  return false
}

/**
 * Recorre `main` y marca lo suelto. `estiloDe` se inyecta para poder probarlo.
 * Devuelve cuántos elementos quedaron como letra suelta.
 */
export function marcarLetra(main, estiloDe = el => getComputedStyle(el)) {
  const cache = new Map()
  const pintaEl = el => {
    if (!cache.has(el)) cache.set(el, pinta(estiloDe(el)))
    return cache.get(el)
  }
  const sueltos = new Set()
  const superficies = new Set()
  for (const el of main.querySelectorAll('*')) {
    if (el.closest('svg, .mapboxgl-map, .leaflet-container')) continue
    if (pintaEl(el)) { superficies.add(el); continue }
    if (!tieneTextoPropio(el)) continue
    // ¿Hay algo que pinte entre el elemento y .pnl-main?
    let n = el.parentElement
    let tapado = false
    while (n && n !== main) {
      if (pintaEl(n)) { tapado = true; break }
      n = n.parentElement
    }
    if (!tapado) sueltos.add(el)
  }
  // Escribir después de leer, y solo lo que cambia: un solo recálculo de estilos.
  for (const el of main.querySelectorAll('[data-fondo-letra], [data-fondo-sup]')) {
    if (!sueltos.has(el) && el.hasAttribute('data-fondo-letra')) { el.removeAttribute('data-fondo-letra'); el.style.removeProperty('--fondo-tinta-propia') }
    if (!superficies.has(el) && el.hasAttribute('data-fondo-sup')) el.removeAttribute('data-fondo-sup')
  }
  // Cada superficie lleva su marca: si cuelga de una letra suelta, recupera los tokens del diseño.
  for (const el of superficies) if (!el.hasAttribute('data-fondo-sup')) el.setAttribute('data-fondo-sup', '')
  const nuevos = []
  for (const el of sueltos) if (!el.hasAttribute('data-fondo-letra')) { el.setAttribute('data-fondo-letra', 'suelta'); nuevos.push(el) }
  // Con la tinta puesta, lo que siga claro es un color fijo: se oscurece su mismo tono.
  for (const el of nuevos) {
    const color = estiloDe(el).color
    if (letraClara(color)) {
      el.style.setProperty('--fondo-tinta-propia', oscurecer(leerColor(color)))
      el.setAttribute('data-fondo-letra', 'tinta')
    }
  }
  return sueltos.size
}

/** Quita todas las marcas (al salir del fondo claro). */
export function limpiarLetra(raiz) {
  for (const el of raiz.querySelectorAll('[data-fondo-letra], [data-fondo-sup]')) {
    el.removeAttribute('data-fondo-letra')
    el.removeAttribute('data-fondo-sup')
    el.style.removeProperty('--fondo-tinta-propia')
  }
}

/**
 * Vigila `.pnl-main` dentro de `pnl` y mantiene las marcas al día. Devuelve la
 * función para dejar de vigilar (y limpiar).
 */
export function vigilarLetra(pnl) {
  if (!pnl || typeof MutationObserver === 'undefined') return () => {}
  let pendiente = false
  let ultima = 0
  let diferida = 0
  const correr = () => {
    pendiente = false
    ultima = performance.now()
    const main = pnl.querySelector('.pnl-main')
    if (main) marcarLetra(main)
  }
  // Antes de pintar (microtarea), así no se ve la letra clara ni un instante; si el
  // contenido cambia muy seguido (animaciones), como mucho cada 120 ms.
  const pedir = () => {
    if (pendiente) return
    pendiente = true
    const falta = 120 - (performance.now() - ultima)
    if (falta <= 0) queueMicrotask(correr)
    else diferida = setTimeout(correr, falta)
  }
  // Solo lo que cambia el contenido o su material: nuestras propias marcas no se observan.
  const contenido = new MutationObserver(registros => {
    if (registros.some(r => r.type !== 'attributes' || r.attributeName === 'class' || r.attributeName === 'hidden' || r.attributeName === 'open')) pedir()
  })
  contenido.observe(pnl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] })
  const material = new MutationObserver(pedir)
  material.observe(pnl, { attributes: true, attributeFilter: ['data-diseno', 'data-vidrio', 'data-fondo-tono', 'data-movil', 'data-screen'] })
  let espera = 0
  const alCambiarTamano = () => { clearTimeout(espera); espera = setTimeout(pedir, 120) }
  window.addEventListener('resize', alCambiarTamano)
  // Un fondo que entra con transición o animación (botones, chips, hover) se mira al terminar.
  pnl.addEventListener('transitionend', pedir)
  pnl.addEventListener('animationend', pedir)
  correr()
  return () => {
    contenido.disconnect()
    material.disconnect()
    window.removeEventListener('resize', alCambiarTamano)
    pnl.removeEventListener('transitionend', pedir)
    pnl.removeEventListener('animationend', pedir)
    clearTimeout(espera)
    clearTimeout(diferida)
    limpiarLetra(pnl)
  }
}
