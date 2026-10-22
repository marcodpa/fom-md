// Tabla ÚNICA de rutas de la web v8 (T-104).
//
// Hoy la web nueva vive aparte, bajo /nuevo, para que Marco la apruebe sin tocar el sitio actual.
// El día que se apruebe, el cambio a las rutas reales es UNA línea: PUBLICADA = true (y retirar en
// App.jsx las rutas v7 que quedan debajo). La navegación, el pie y los enlaces de todas las
// páginas usan rutaV8(clave), así que cambian solos.
//
// Las páginas se registran SOLAS por nombre de archivo: si existe src/pages/v8/<archivo>.jsx se
// monta esa; si todavía no existe, se monta la página «En construcción». Quien crea una página
// nueva NO toca este archivo ni App.jsx.
import { lazy } from 'react'

// Publicada el 22 oct 2026 (Marco: «aplica la nueva web a la web»).
export const PUBLICADA = true
export const BASE_V8 = '/nuevo'

export const PAGINAS_V8 = [
  { clave: 'inicio', nombre: 'Inicio', archivo: 'InicioV8', nueva: '/nuevo', real: '/' },
  { clave: 'plataforma', nombre: 'Plataforma web', archivo: 'PlataformaV8', nueva: '/nuevo/plataforma', real: '/plataforma' },
  { clave: 'app', nombre: 'App del conductor', archivo: 'AppV8', nueva: '/nuevo/app', real: '/app' },
  { clave: 'funciones', nombre: 'Funciones', archivo: 'FuncionesV8', nueva: '/nuevo/funciones', real: '/funciones' },
  { clave: 'seguridad', nombre: 'Seguridad', archivo: 'SeguridadV8', nueva: '/nuevo/seguridad', real: '/seguridad' },
  { clave: 'areas', nombre: 'Áreas', archivo: 'AreasV8', nueva: '/nuevo/areas', real: '/areas' },
  { clave: 'quienes-somos', nombre: 'Quiénes somos', archivo: 'QuienesSomosV8', nueva: '/nuevo/quienes-somos', real: '/quienes-somos' },
  { clave: 'que-ofrecemos', nombre: 'Qué ofrecemos', archivo: 'QueOfrecemosV8', nueva: '/nuevo/que-ofrecemos', real: '/que-ofrecemos' },
  { clave: 'beneficios', nombre: 'Beneficios', archivo: 'BeneficiosV8', nueva: '/nuevo/beneficios', real: '/beneficios' },
  { clave: 'preguntas', nombre: 'Preguntas frecuentes', archivo: 'PreguntasV8', nueva: '/nuevo/preguntas', real: '/preguntas-frecuentes' },
  { clave: 'contacto', nombre: 'Contacto', archivo: 'ContactoV8', nueva: '/nuevo/contacto', real: '/contacto' },
]

// Rutas fuera de la web v8 que también se enlazan.
export const ENTRAR = '/entrar'
export const CORREO_FOM = 'contacto@fom.app'

const POR_CLAVE = Object.fromEntries(PAGINAS_V8.map(p => [p.clave, p]))

// rutaV8('funciones') → '/nuevo/funciones' (o '/funciones' cuando PUBLICADA = true).
// rutaV8('contacto', 'solicitud-demo') → con ancla.
export function rutaV8(clave, ancla) {
  const p = POR_CLAVE[clave]
  if (!p) throw new Error(`[v8] Página desconocida: ${clave}`)
  const base = PUBLICADA ? p.real : p.nueva
  return ancla ? `${base}#${ancla}` : base
}

export function paginaV8(clave) { return POR_CLAVE[clave] }

// ¿Esta ruta del navegador es de la web v8? (App.jsx la usa para apartar la cabecera actual).
export function esRutaV8(pathname) {
  const limpio = pathname.replace(/\/+$/, '') || '/'
  return PAGINAS_V8.some(p => (PUBLICADA ? p.real : p.nueva) === limpio)
}

const MODULOS = import.meta.glob('./*V8.jsx')
const EnConstruccion = lazy(() => import('../../components/v8/EnConstruccionV8'))

// [{ ...pagina, ruta, Componente }] para montar en <Routes>.
export const RUTAS_V8 = PAGINAS_V8.map(p => {
  const cargar = MODULOS[`./${p.archivo}.jsx`]
  return {
    ...p,
    ruta: PUBLICADA ? p.real : p.nueva,
    Componente: cargar ? lazy(cargar) : EnConstruccion,
    lista: Boolean(cargar),
  }
})
