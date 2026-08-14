// ============================================================
// ACCESO AL PANEL
// ------------------------------------------------------------
// Con la API configurada (`VITE_FOM_API`) esto es autenticación REAL contra
// `fom-core`: usuarios de `fom.users`, clave verificada con argon2 y sesión
// revocable del lado del servidor.
//
// El testigo de sesión NO vive en el navegador. La API lo emite en una cookie
// `__Host-`, que el puente de desarrollo retiene del lado del servidor y
// reenvía como cabecera en cada petición. Por eso aquí no se guarda nada: la
// pregunta "¿hay sesión?" se le hace al servidor con `GET /auth/session`.
//
// Sin API configurada, el sitio sigue funcionando con dos cuentas de
// demostración comparadas en el navegador. No es seguridad: es una vitrina.
//
// `sesionActual()` devuelve:
//   undefined -> todavía se está resolviendo (mostrar cargando)
//   null      -> no hay sesión (mandar a /entrar)
//   {perfil}  -> sesión activa
// ============================================================

import { api, HAY_API } from './datos/api'
import { iniciales as inicialesDe } from './datos/formato'

const CLAVE_SESION = 'fom.panel.sesion'

// --- Cuentas de demostración (solo sin API) --------------------------------
const CUENTAS = [
  {
    usuario: import.meta.env?.VITE_PANEL_USUARIO || 'supervisor@fom.com.ve',
    clave: import.meta.env?.VITE_PANEL_CLAVE || 'FlotaFOM2026',
    perfil: {
      id: 'usr-001',
      nombre: 'Yeison Márquez',
      correo: 'supervisor@fom.com.ve',
      rol: 'supervisor_company',
      rolNombre: 'Supervisor de empresa',
      empresa: 'Transporte Lago Sur, C.A.',
      empresaId: 'transporte-lago-sur',
      sede: 'Costa Oriental del Lago',
      iniciales: 'YM',
    },
  },
  {
    usuario: 'admin@fom.com.ve',
    clave: 'AdminFOM2026',
    perfil: {
      id: 'usr-000',
      nombre: 'Marco Pacheco',
      correo: 'admin@fom.com.ve',
      rol: 'admin',
      rolNombre: 'Administrador FOM',
      empresa: 'FOM · Administración',
      empresaId: null, // multiempresa: no pertenece a un ente
      sede: 'Todas las empresas',
      iniciales: 'MP',
    },
  },
]

const oyentes = new Set()

// `undefined` = aún resolviendo. Solo ocurre con API real, que pregunta al
// servidor antes de saberlo.
let sesion = HAY_API ? undefined : leerSesionDemo()

function avisar() {
  oyentes.forEach((fn) => fn(sesion))
}

function fijar(nueva) {
  sesion = nueva
  avisar()
}

// ============================================================
// Modo demostración
// ============================================================
function leerSesionDemo() {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const s = JSON.parse(crudo)
    if (!s?.expira || Date.now() > s.expira) {
      localStorage.removeItem(CLAVE_SESION)
      return null
    }
    return s
  } catch {
    return null
  }
}

function entrarDemo({ usuario, clave, recordar }) {
  const u = String(usuario || '').trim().toLowerCase()
  const c = String(clave || '')
  if (!u || !c) return { ok: false, error: 'Escribe tu usuario y tu clave.' }

  const cuenta = CUENTAS.find((x) => x.usuario.toLowerCase() === u && x.clave === c)
  if (!cuenta) return { ok: false, error: 'Usuario o clave incorrectos.' }

  const duracion = recordar ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 8
  const nueva = { perfil: cuenta.perfil, inicio: Date.now(), expira: Date.now() + duracion }
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva))
  } catch {
    /* almacenamiento bloqueado: la sesión vive solo en memoria */
  }
  fijar(nueva)
  return { ok: true, perfil: cuenta.perfil }
}

// ============================================================
// Modo real
// ============================================================

/**
 * Arma el perfil que consume la consola.
 *
 * `GET /auth/session` solo devuelve correo y nombre: el rol y el ente viven en
 * `tenant_memberships` y la API todavía no los expone. Hasta que lo haga, el
 * rol queda `null` — y `esAdminFom` da false, así que la capa de
 * administración multiempresa no aparece. Inventar aquí un rol de
 * administrador sería abrir una puerta que el servidor no autorizó.
 */
function armarPerfil(usuario) {
  const nombre = usuario?.displayName || usuario?.email || 'Usuario'
  return {
    id: usuario?.email || 'desconocido',
    nombre,
    correo: usuario?.email || '',
    rol: null,
    rolNombre: 'Usuario de la consola',
    empresa: 'FOM',
    empresaId: null,
    sede: 'Conectado a la base real',
    iniciales: inicialesDe(nombre),
  }
}

/** Le pregunta al servidor si hay sesión viva. */
async function resolverSesion() {
  try {
    const r = await api.sesion()
    fijar(r?.authenticated ? { perfil: armarPerfil(r.user), inicio: Date.now() } : null)
  } catch {
    // 401 o servidor caído: en ambos casos, no hay sesión utilizable.
    fijar(null)
  }
}

if (HAY_API) resolverSesion()

// ============================================================
// API pública (idéntica para los dos modos)
// ============================================================

/** Sesión activa, `null` si no hay, `undefined` mientras se resuelve. */
export function sesionActual() {
  return sesion
}

/** Perfil activo, o null. */
export function perfilActual() {
  return sesion?.perfil ?? null
}

/** Suscribe a cambios de sesión. Devuelve la función para desuscribirse. */
export function alCambiar(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/**
 * Inicia sesión. Siempre asíncrona.
 * @returns {Promise<{ok: true, perfil: object} | {ok: false, error: string}>}
 */
export async function iniciarSesion({ usuario, clave, recordar = true }) {
  if (!HAY_API) return entrarDemo({ usuario, clave, recordar })

  const email = String(usuario || '').trim().toLowerCase()
  const password = String(clave || '')
  if (!email || !password) return { ok: false, error: 'Escribe tu usuario y tu clave.' }

  try {
    const r = await api.entrar(email, password)
    const perfil = armarPerfil(r?.user)
    fijar({ perfil, inicio: Date.now() })
    return { ok: true, perfil }
  } catch (error) {
    return { ok: false, error: error.message || 'Usuario o clave incorrectos.' }
  }
}

export async function cerrarSesion() {
  if (HAY_API) {
    try {
      await api.salir()
    } catch {
      /* la sesión ya no existía del lado del servidor */
    }
    fijar(null)
    return
  }
  localStorage.removeItem(CLAVE_SESION)
  fijar(null)
}

/** ¿La sesión es del administrador de FOM? (rango 4, ve todo el sistema) */
export function esAdminFom(perfil) {
  return perfil?.rol === 'admin'
}

/** ¿El acceso está validando contra la base real? Lo muestra la pantalla de acceso. */
export const CONECTADO_A_BD = HAY_API

/** Cuentas de demostración: solo existen cuando NO hay API. */
export const CUENTAS_DEMO = HAY_API
  ? []
  : CUENTAS.map((c) => ({ usuario: c.usuario, clave: c.clave, rol: c.perfil.rolNombre }))
export const CUENTA_DEMO = CUENTAS_DEMO[0]
