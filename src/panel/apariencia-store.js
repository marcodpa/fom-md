export const DISENOS = [
  { id: 'azul', nombre: 'Azul FOM', descripcion: 'Los colores de FOM, con tarjetas y navegación redondeadas.' },
  { id: 'glass', nombre: 'Glass gris', descripcion: 'Cristal translúcido, fondo gris y superficies de grafito.' },
]

/**
 * FONDOS DEL PANEL (docs/FONDOS.md). Una imagen o un degradado detrás de todo el
 * panel autenticado, menos el Centro de control (ahí manda el mapa).
 * - `tono`: el material de las tarjetas encima. «claro» = vidrio blanco con letra
 *   oscura; «oscuro» = vidrio azul noche con letra clara. Sin tono = sin fondo.
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
    descripcion: 'Blanco difuminado con la flota al fondo. Tarjetas de vidrio claro.',
    tono: 'claro',
    imagen: new URL('../assets/fondos/blanco-carros.webp', import.meta.url).href,
    imagenMovil: new URL('../assets/fondos/blanco-carros-movil.webp', import.meta.url).href,
    miniatura: new URL('../assets/fondos/blanco-carros-mini.webp', import.meta.url).href,
  },
  { id: 'perla', nombre: 'Perla', descripcion: 'Blanco y gris claro, sin foto. Tarjetas de vidrio claro.', tono: 'claro' },
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

const disenoValido = valor => DISENOS.some(d => d.id === valor)
const fondoValido = valor => FONDOS.some(f => f.id === valor)
export const cuentaApariencia = perfil => String(perfil?.userId || perfil?.id || perfil?.correo || '')
export const claveApariencia = cuenta => `fom.apariencia.v1:${encodeURIComponent(cuenta)}`
export const claveFondo = cuenta => `fom.fondo.v1:${encodeURIComponent(cuenta)}`

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
