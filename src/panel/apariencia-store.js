export const DISENOS = [
  { id: 'azul', nombre: 'Azul FOM', descripcion: 'Los colores de FOM, con tarjetas y navegación redondeadas.' },
  { id: 'glass', nombre: 'Glass gris', descripcion: 'Cristal translúcido, fondo gris y superficies de grafito.' },
]

/**
 * FONDOS DEL PANEL (docs/FONDOS.md). Una imagen o un degradado detrás de todo el
 * panel autenticado, menos el Centro de control (ahí manda el mapa).
 * - El fondo cambia SOLO la capa de atrás: tarjetas, barras, botones, colores y
 *   logo son siempre los del diseño elegido (Azul FOM / Glass gris).
 * - `tono`: si la imagen es «claro» u «oscuro». Solo decide cuánto velo lleva la
 *   letra que va directo sobre el fondo (títulos de pantalla). Sin tono = sin fondo.
 * - `imagen` / `imagenMovil` / `miniatura`: webp ya desenfocados y livianos
 *   (src/assets/fondos). Salen de fotos y recortes que ya estaban en el repo.
 *   `new URL(…, import.meta.url)` lo resuelve Vite al compilar y Node en las pruebas.
 * - Sin imagen, el fondo es solo CSS (apariencia-fondos.css, `[data-fondo="…"]`).
 */
export const FONDO_POR_DEFECTO = 'ninguno'
export const FONDOS = [
  { id: 'ninguno', nombre: 'Sin fondo', descripcion: 'El fondo liso del diseño elegido.', tono: null },
  {
    id: 'blanco-carros',
    nombre: 'Blanco con carros',
    descripcion: 'Blanco difuminado con la flota al fondo.',
    tono: 'claro',
    imagen: new URL('../assets/fondos/blanco-carros.webp', import.meta.url).href,
    imagenMovil: new URL('../assets/fondos/blanco-carros-movil.webp', import.meta.url).href,
    miniatura: new URL('../assets/fondos/blanco-carros-mini.webp', import.meta.url).href,
  },
  { id: 'perla', nombre: 'Perla', descripcion: 'Blanco y gris claro con luz azul FOM, sin foto.', tono: 'claro' },
  {
    id: 'patio-noche',
    nombre: 'Patio al anochecer',
    descripcion: 'Un patio de flota visto desde arriba, desenfocado.',
    tono: 'oscuro',
    imagen: new URL('../assets/fondos/patio-noche.webp', import.meta.url).href,
    imagenMovil: new URL('../assets/fondos/patio-noche-movil.webp', import.meta.url).href,
    miniatura: new URL('../assets/fondos/patio-noche-mini.webp', import.meta.url).href,
  },
  {
    id: 'carretera',
    nombre: 'Carretera',
    descripcion: 'Camiones en ruta al atardecer, desenfocados.',
    tono: 'oscuro',
    imagen: new URL('../assets/fondos/carretera.webp', import.meta.url).href,
    imagenMovil: new URL('../assets/fondos/carretera-movil.webp', import.meta.url).href,
    miniatura: new URL('../assets/fondos/carretera-mini.webp', import.meta.url).href,
  },
  { id: 'noche-azul', nombre: 'Noche azul', descripcion: 'Degradado azul noche con luz de marca, sin foto.', tono: 'oscuro' },
]
export const fondoPorId = id => FONDOS.find(f => f.id === id) || FONDOS[0]

/**
 * VIDRIO DE LAS TARJETAS (docs/FONDOS.md › Vidrio). Cuánto se ve el fondo a
 * través de tarjetas, barra lateral, barra de arriba y hojas, como en iOS.
 * Independiente del diseño y del fondo. `alfa`: opacidad de las tres superficies
 * del diseño [sup, sup-alta, sup-baja]; son el TOPE de transparencia que deja la
 * letra del diseño en AA aun con blanco puro detrás (lo comprueba
 * test/apariencia-vidrio.test.js). Los mismos números van en apariencia-vidrio.css.
 * Sin elección (null) manda el diseño, como hasta hoy: Azul FOM sólido, Glass medio.
 */
export const VIDRIOS = [
  { id: 'solido', nombre: 'Sólido', alfa: { azul: [1, 1, 1], glass: [1, 1, 1] } },
  { id: 'suave', nombre: 'Suave', alfa: { azul: [0.97, 0.98, 0.97], glass: [0.94, 0.97, 0.88] } },
  { id: 'medio', nombre: 'Medio', alfa: { azul: [0.94, 0.96, 0.94], glass: [0.88, 0.94, 0.78] } },
  { id: 'intenso', nombre: 'Intenso', alfa: { azul: [0.91, 0.95, 0.91], glass: [0.74, 0.84, 0.72] } },
]
export const VIDRIO_POR_DEFECTO = null
export const VIDRIO_DEL_DISENO = { azul: 'solido', glass: 'medio' }
const vidrioValido = valor => VIDRIOS.some(v => v.id === valor)
/** El paso que se ve: «reducir transparencia» manda Sólido; sin elección, el del diseño. */
export const vidrioEfectivo = (diseno, elegido, reducirTransparencia = false) =>
  reducirTransparencia ? 'solido' : vidrioValido(elegido) ? elegido : VIDRIO_DEL_DISENO[diseno] || 'solido'
/** data-vidrio de .pnl: solo con una elección (o «reducir transparencia»); sin él, el CSS de siempre. */
export const atributoVidrio = (elegido, reducirTransparencia = false) =>
  reducirTransparencia ? 'solido' : vidrioValido(elegido) ? elegido : undefined

const disenoValido = valor => DISENOS.some(d => d.id === valor)
const fondoValido = valor => FONDOS.some(f => f.id === valor)
export const cuentaApariencia = perfil => String(perfil?.userId || perfil?.id || perfil?.correo || '')
export const claveApariencia = cuenta => `fom.apariencia.v1:${encodeURIComponent(cuenta)}`
export const claveFondo = cuenta => `fom.fondo.v1:${encodeURIComponent(cuenta)}`
export const claveVidrio = cuenta => `fom.vidrio.v1:${encodeURIComponent(cuenta)}`

/** Una preferencia personal en este navegador; nunca se usa la empresa como identidad. */
function crearPreferencia(obtenerStorage, eventos, { clave, prefijo, valido, defecto }) {
  const memoria = new Map()
  const oyentes = new Set()
  const notificar = () => oyentes.forEach(fn => fn())
  const leer = cuenta => {
    if (!cuenta) return defecto
    if (memoria.has(cuenta)) return memoria.get(cuenta)
    try {
      const valor = obtenerStorage()?.getItem(clave(cuenta))
      return valido(valor) ? valor : defecto
    } catch { return defecto }
  }
  const cambiar = (cuenta, valor) => {
    if (!cuenta || !valido(valor)) return false
    memoria.set(cuenta, valor)
    let guardado = false
    try {
      const storage = obtenerStorage()
      if (storage) { storage.setItem(clave(cuenta), valor); guardado = true }
    } catch { /* La elección sigue disponible durante esta sesión. */ }
    notificar()
    return guardado
  }
  eventos?.addEventListener('storage', e => {
    if (e.key === null || e.key?.startsWith(prefijo)) {
      memoria.clear()
      notificar()
    }
  })
  return { leer, cambiar, suscribir: fn => { oyentes.add(fn); return () => oyentes.delete(fn) } }
}

export function crearPreferenciasApariencia(obtenerStorage, eventos) {
  return crearPreferencia(obtenerStorage, eventos, { clave: claveApariencia, prefijo: 'fom.apariencia.v1:', valido: disenoValido, defecto: 'azul' })
}

export function crearPreferenciasFondo(obtenerStorage, eventos) {
  return crearPreferencia(obtenerStorage, eventos, { clave: claveFondo, prefijo: 'fom.fondo.v1:', valido: fondoValido, defecto: FONDO_POR_DEFECTO })
}

export function crearPreferenciasVidrio(obtenerStorage, eventos) {
  return crearPreferencia(obtenerStorage, eventos, { clave: claveVidrio, prefijo: 'fom.vidrio.v1:', valido: vidrioValido, defecto: VIDRIO_POR_DEFECTO })
}
