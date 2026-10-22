// Catálogo de fotos y capturas de la web v8 (src/assets/marketing/v8).
// Cada imagen vive como <nombre>-<ancho>x<alto>.avif|webp; aquí se agrupan por nombre estable y
// se arma un srcset por formato con los anchos REALES de cada copia. La versión para teléfono es
// la entrada <nombre>-movil (recorte vertical o cuadrado). Cambiar una foto = volver a correr
// src/assets/marketing/v8/preparar_fotos.py con el mismo nombre; este archivo no se toca.
const ARCHIVOS = import.meta.glob('../../assets/marketing/v8/*.{avif,webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' })

// Corte del teléfono de la web v8 (LEEME: teléfono ≤ 599 px).
export const MEDIA_MOVIL_V8 = '(max-width: 599px)'

const CATALOGO = {}
for (const [ruta, url] of Object.entries(ARCHIVOS)) {
  const m = /\/([^/]+)-(\d+)x(\d+)\.(\w+)$/.exec(ruta)
  if (!m) continue
  const [, nombre, w, h, ext] = m
  const formato = ext === 'jpeg' ? 'jpg' : ext
  ;((CATALOGO[nombre] ||= {})[formato] ||= []).push({ url, w: Number(w), h: Number(h) })
}
for (const formatos of Object.values(CATALOGO)) for (const copias of Object.values(formatos)) copias.sort((a, b) => a.w - b.w)

const srcSetDe = copias => copias.map(c => `${c.url} ${c.w}w`).join(', ')

function armar(nombre) {
  const formatos = CATALOGO[nombre]
  if (!formatos) return null
  // Respaldo para <img>: WebP (o el formato que haya). AVIF va en <source> primero.
  const base = formatos.webp || formatos.jpg || formatos.png || formatos.avif
  const mayor = base[base.length - 1]
  // src del <img> (solo lo usan navegadores sin srcset): la copia de ~1280 px, no la mayor.
  const media = base.find(c => c.w >= 1280) || mayor
  return {
    src: media.url,
    srcSet: srcSetDe(base),
    avif: formatos.avif && base !== formatos.avif ? srcSetDe(formatos.avif) : null,
    width: mayor.w,
    height: mayor.h,
  }
}

// { src, srcSet, avif, width, height, movil } para <picture>. width/height son los de la copia
// más grande (el tamaño real de la foto): reservan el alto antes de cargar y marcan el tope de
// nitidez. `avif` = srcset AVIF (null si no hay). `movil` = lo mismo para el recorte de teléfono
// (<nombre>-movil) o null si esa foto no lo tiene.
export function fotoV8(nombre) {
  const f = armar(nombre)
  if (!f) {
    if (import.meta.env.DEV) console.warn(`[v8] No existe la foto «${nombre}» en src/assets/marketing/v8`)
    return null
  }
  return { ...f, movil: nombre.endsWith('-movil') ? null : armar(`${nombre}-movil`) }
}

export const NOMBRES_FOTOS_V8 = Object.keys(CATALOGO).filter(n => !n.endsWith('-movil')).sort()
