// Catálogo de fotos y capturas de la web v8 (src/assets/marketing/v8).
// Cada imagen vive como <nombre>-<ancho>x<alto>.<ext>; aquí se agrupan por nombre estable y se
// arma el srcset con los anchos REALES de cada copia. Cambiar una foto = volver a correr
// src/assets/marketing/v8/preparar_fotos.py con el mismo nombre; este archivo no se toca.
const ARCHIVOS = import.meta.glob('../../assets/marketing/v8/*.{webp,jpg,jpeg,png,avif}', { eager: true, query: '?url', import: 'default' })

const CATALOGO = {}
for (const [ruta, url] of Object.entries(ARCHIVOS)) {
  const m = /\/([^/]+)-(\d+)x(\d+)\.\w+$/.exec(ruta)
  if (!m) continue
  const [, nombre, w, h] = m
  ;(CATALOGO[nombre] ||= []).push({ url, w: Number(w), h: Number(h) })
}
for (const copias of Object.values(CATALOGO)) copias.sort((a, b) => a.w - b.w)

// { src, srcSet, width, height } listo para <img>. width/height son los de la copia más grande
// (el tamaño real de la foto): reservan el alto antes de cargar y marcan el tope de nitidez.
export function fotoV8(nombre) {
  const copias = CATALOGO[nombre]
  if (!copias) {
    if (import.meta.env.DEV) console.warn(`[v8] No existe la foto «${nombre}» en src/assets/marketing/v8`)
    return null
  }
  const mayor = copias[copias.length - 1]
  return {
    src: mayor.url,
    srcSet: copias.map(c => `${c.url} ${c.w}w`).join(', '),
    width: mayor.w,
    height: mayor.h,
  }
}

export const NOMBRES_FOTOS_V8 = Object.keys(CATALOGO).sort()
