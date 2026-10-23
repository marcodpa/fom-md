import { createContext, useContext, useSyncExternalStore } from 'react'
import { esAdminFom } from '../roles'

/**
 * LA WEB EN EL TELÉFONO, igual que la app.
 *
 * Bajo 768 px la consola deja el menú lateral y la barra de arriba y usa las
 * piezas de la app: la cápsula arriba, la barra de pestañas abajo y, en las
 * pantallas que no son pestaña, el botón atrás con su título. Aquí vive lo que
 * decide QUÉ se ve; las piezas están en movil-piezas.jsx.
 */

/** El mismo corte que el CSS (movil-app.css): si no coinciden, se ven las dos navegaciones. */
const CONSULTA = '(max-width: 767px)'

function suscribir(aviso) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(CONSULTA)
  m.addEventListener('change', aviso)
  return () => m.removeEventListener('change', aviso)
}
const leer = () => typeof window !== 'undefined' && !!window.matchMedia?.(CONSULTA).matches

/** `true` cuando la ventana tiene ancho de teléfono. Cambia al girar o redimensionar. */
export function useEsMovil() {
  return useSyncExternalStore(suscribir, leer, () => false)
}

/** Mi perfil es pestaña en todos los roles, como en la app. */
const PERFIL = { a: '/panel/mi-perfil', icono: 'perfil', texto: 'Mi perfil' }

/**
 * Las pestañas de cada área: los nombres de la app (panel/_layout,
 * admin/_layout y (driver)/_layout) con los íconos del menú de la web. Solo
 * rutas que el área ya alcanza (RUTAS_POR_AREA en Consola.jsx).
 */
const PESTANAS = {
  operativo: [
    { a: '/panel', icono: 'resumen', texto: 'Resumen' },
    { a: '/panel/flota', icono: 'camion', texto: 'Vehículos' },
    { a: '/panel/personal', icono: 'gente', texto: 'Usuarios' },
    // Cinco pestañas en un teléfono no caben con el nombre entero.
    { a: '/panel/mantenimiento', icono: 'llave', texto: 'Mantenimiento', corto: 'Mantenim.' },
    PERFIL,
  ],
  // La web del admin FOM no tiene Resumen: abre en Usuarios generales.
  admin: [
    { a: '/panel/admin/empresas', icono: 'empresa', texto: 'Empresas' },
    { a: '/panel/admin/plataforma', icono: 'gente', texto: 'Usuarios', largo: 'Usuarios generales' },
    { a: '/panel/admin/vehiculos', icono: 'camion', texto: 'Vehículos', largo: 'Vehículos generales' },
    PERFIL,
  ],
  gerencial: [
    { a: '/panel/personal', icono: 'gente', texto: 'Usuarios' },
    { a: '/panel/reportes', icono: 'reporte', texto: 'Reportes' },
    PERFIL,
  ],
  // La app pone Inspección como segunda pestaña; la web del conductor no tiene
  // esa pantalla, así que va el Mapa, que sí tiene.
  conductor: [
    { a: '/panel', icono: 'camion', texto: 'Mi unidad' },
    { a: '/panel/mapa', icono: 'mapa', texto: 'Mapa' },
    { a: '/panel/mantenimiento', icono: 'llave', texto: 'Mantenimiento' },
    PERFIL,
  ],
  personal: [
    { a: '/panel/mapa', icono: 'mapa', texto: 'Mapa' },
    { a: '/panel/alertas', icono: 'alerta', texto: 'Alertas' },
    { a: '/panel/documentos', icono: 'documento', texto: 'Documentos' },
    PERFIL,
  ],
}

export function pestanasDe(perfil, area) {
  // El admin FOM dentro de una empresa la opera como su supervisor.
  if (esAdminFom(perfil) && perfil.empresaGestion) return PESTANAS.operativo
  return PESTANAS[area] ?? PESTANAS.conductor
}

/** La ruta sin la barra final: «/panel/» y «/panel» son la misma pestaña. */
export function rutaLimpia(pathname) {
  return pathname.replace(/\/+$/u, '') || '/panel'
}

export function esPestana(pathname, pestanas) {
  const ruta = rutaLimpia(pathname)
  return pestanas.some(p => p.a === ruta)
}

/** Las fichas y pantallas que no están en el menú, con su nombre corto. */
const TITULOS_SUELTOS = [
  [/^\/panel\/flota\/[^/]+/u, 'Unidad'],
  [/^\/panel\/personal\/[^/]+/u, 'Usuario'],
  [/^\/panel\/admin\/usuarios/u, 'Usuarios'],
  [/^\/panel\/configuracion/u, 'Configuración'],
  [/^\/panel\/mi-perfil/u, 'Mi perfil'],
]

/**
 * El nombre de la pantalla para la cápsula: el de la pestaña o el del menú y,
 * en las fichas, su nombre corto («Unidad», «Usuario»).
 */
export function tituloDe(pathname, menu, pestanas) {
  const ruta = rutaLimpia(pathname)
  const exacta = pestanas.find(p => p.a === ruta)
  if (exacta) return exacta.texto
  for (const [patron, titulo] of TITULOS_SUELTOS) if (patron.test(ruta)) return titulo
  const items = menu.flatMap(g => g.items)
  const delMenu = items.find(it => it.a === ruta)
    // Si no es exacta, la más larga que la contenga (Inspecciones › agenda).
    ?? items.filter(it => it.a !== '/panel' && ruta.startsWith(`${it.a}/`)).sort((x, y) => y.a.length - x.a.length)[0]
  return delMenu?.texto ?? 'FOM'
}

/**
 * Lo que no cabe en la barra de abajo, para la sección «Accesos» de Mi perfil
 * (como panel/mas.tsx de la app). Sale del MISMO menú que el lateral: lo que
 * se puede abrir en la computadora también se puede abrir en el teléfono.
 */
export function accesosDe(menu, pestanas) {
  const enBarra = new Set(pestanas.map(p => p.a))
  const vistos = new Set()
  const accesos = []
  for (const it of menu.flatMap(g => g.items)) {
    if (enBarra.has(it.a) || vistos.has(it.a)) continue
    vistos.add(it.a)
    accesos.push(it)
  }
  accesos.push({ a: '/panel/configuracion', icono: 'ajustes', texto: 'Configuración' })
  return accesos
}

/** Lo que Consola le pasa a Mi perfil en el teléfono (sus accesos y el globo de alertas). */
export const MovilContexto = createContext(null)

export function useMovil() {
  return useContext(MovilContexto)
}

/**
 * «Estoy en la vista de teléfono»: LA condición para que un módulo pinte su
 * versión de la app. Manda lo que decidió Consola —la misma que pinta la
 * cápsula y la barra de pestañas—, así nunca sale la cápsula del teléfono con
 * una pantalla de escritorio dentro. Fuera de Consola, el ancho de la ventana.
 */
export function useVistaTelefono() {
  const marco = useContext(MovilContexto)
  const ancho = useEsMovil()
  return marco ? Boolean(marco.esMovil) : ancho
}
