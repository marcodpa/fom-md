// ============================================================
// ACCESO AL PANEL
// ------------------------------------------------------------
// IMPORTANTE (leer antes de publicar):
// Esto es una PUERTA DE DEMOSTRACIÓN, no seguridad real. Al ser un sitio
// estático, cualquier credencial que se compare aquí viaja en el bundle y es
// visible para quien abra las herramientas de desarrollo. Sirve para que el
// supervisor entre y use el panel mientras no hay backend.
//
// La sustitución por Supabase Auth (que ya usa la app móvil) es directa:
// basta reimplementar estas cuatro funciones contra supabase.auth y dejar
// igual el resto del panel, que solo consume esta interfaz.
//   iniciarSesion  -> supabase.auth.signInWithPassword({ email, password })
//   cerrarSesion   -> supabase.auth.signOut()
//   sesionActual   -> supabase.auth.getSession() + perfil desde la tabla
//   alCambiar      -> supabase.auth.onAuthStateChange
// ============================================================

const CLAVE_SESION = 'fom.panel.sesion'

// Cuentas de demostración: el supervisor de una empresa y el administrador
// de FOM (rango 4, ve todo el sistema). El supervisor es configurable con
// VITE_PANEL_USUARIO / VITE_PANEL_CLAVE en un archivo .env
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

function leerSesion() {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const sesion = JSON.parse(crudo)
    if (!sesion?.expira || Date.now() > sesion.expira) {
      localStorage.removeItem(CLAVE_SESION)
      return null
    }
    return sesion
  } catch {
    return null
  }
}

function avisar() {
  const sesion = leerSesion()
  oyentes.forEach((fn) => fn(sesion))
}

/** Devuelve la sesión activa o null. */
export function sesionActual() {
  return leerSesion()
}

/** Suscribe a cambios de sesión. Devuelve la función para desuscribirse. */
export function alCambiar(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/**
 * Valida credenciales contra las cuentas de demostración.
 * Mismo mensaje genérico que la app: no revela si el correo existe.
 * @returns {{ok: true, perfil: object} | {ok: false, error: string}}
 */
export function iniciarSesion({ usuario, clave, recordar = true }) {
  const u = String(usuario || '').trim().toLowerCase()
  const c = String(clave || '')

  if (!u || !c) {
    return { ok: false, error: 'Escribe tu usuario y tu clave.' }
  }
  const cuenta = CUENTAS.find((x) => x.usuario.toLowerCase() === u && x.clave === c)
  if (!cuenta) {
    return { ok: false, error: 'Usuario o clave incorrectos.' }
  }

  const duracion = recordar ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 8
  const sesion = {
    perfil: cuenta.perfil,
    inicio: Date.now(),
    expira: Date.now() + duracion,
  }
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  avisar()
  return { ok: true, perfil: cuenta.perfil }
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
  avisar()
}

/** ¿La sesión es del administrador de FOM? (rango 4, ve todo el sistema) */
export function esAdminFom(perfil) {
  return perfil?.rol === 'admin'
}

/** Cuentas de demostración, para mostrarlas en la pantalla de acceso. */
export const CUENTAS_DEMO = CUENTAS.map((c) => ({
  usuario: c.usuario,
  clave: c.clave,
  rol: c.perfil.rolNombre,
}))
export const CUENTA_DEMO = CUENTAS_DEMO[0]
