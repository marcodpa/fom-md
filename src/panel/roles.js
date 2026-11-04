// Fuente única de roles para FOM-WEB. Este mapa debe ser idéntico a
// fom.canonical_membership_role() y a console-api/console-roles.ts.
const ROL_CANONICO = Object.freeze({
  owner: 'supervisor',
  administrator: 'supervisor',
  fleet_manager: 'supervisor',
  operator: 'operator',
  viewer: 'usuario',
})

const ETIQUETA_ROL = Object.freeze({
  admin_fom: 'Administrador FOM',
  supervisor: 'Supervisor',
  conductor: 'Conductor',
  operator: 'Operador',
  usuario: 'Usuario',
})

// Los nombres de rol de la demostración sin servidor (semilla) llevan a los de la sesión:
// así una sola tabla de etiqueta, color y rango sirve a la demo y al servidor real.
const ROL_DE_SEMILLA = Object.freeze({
  admin: 'admin_fom',
  supervisor_company: 'supervisor',
  supervisor_personal: 'supervisor',
  usuario_personal: 'usuario',
})

// Color del tag de cada rol (clases de .pnl-tag).
const COLOR_ROL = Object.freeze({
  admin_fom: 'rojo',
  supervisor: 'azul',
  operator: 'ambar',
  conductor: 'verde',
  usuario: 'gris',
})

// Jerarquía de mando: cada quien solo gestiona a los de rango MENOR. Lo no listado vale 1.
const RANGO_ROL = Object.freeze({
  admin_fom: 4,
  supervisor: 3,
  conductor: 1,
  usuario: 1,
})

export function rolCanonico(rol) {
  return ROL_CANONICO[rol] ?? rol ?? null
}

// El rol de la sesión, también cuando viene con el nombre de la semilla.
const rolUnico = (rol) => {
  const canonico = rolCanonico(rol)
  return ROL_DE_SEMILLA[canonico] ?? canonico
}

export function etiquetaRolSesion(rol) {
  const unico = rolUnico(rol)
  return unico ? (ETIQUETA_ROL[unico] ?? unico) : 'Usuario de la consola'
}

/** Color del tag del rol; gris si no se conoce. */
export function colorRol(rol) {
  return COLOR_ROL[rolUnico(rol)] ?? 'gris'
}

/** Rango de mando del rol (admin_fom 4, supervisor 3, el resto 1). */
export function rangoRol(rol) {
  return RANGO_ROL[rolUnico(rol)] ?? 1
}

export function esAdminFom(perfil) {
  return rolCanonico(perfil?.rol) === 'admin_fom'
}

export function esGestor(perfil) {
  const rol = rolCanonico(perfil?.rol)
  return rol === 'admin_fom' || rol === 'supervisor'
}

/**
 * El tipo de ente en las palabras del panel, a partir de la categoria de la
 * base: «predefinida» es la compañia que cuelga contratistas (Chevron),
 * «estandar» es el contratista, «personal» es la cuenta de una persona.
 */
export function tipoEmpresaDe(categoria) {
  if (categoria === 'compania') return 'predefinida'
  if (categoria === 'personal') return 'personal'
  return 'estandar'
}

/**
 * EL AREA de cada quien. Copia `auth/permissions.ts` de la app, que reparte
 * la experiencia en cinco zonas y no deja que una persona vea la de otra:
 *
 *   admin      → Administrador FOM: todo, multiempresa.
 *   operativo  → supervisor de un contratista (y el operador heredado):
 *                el panel completo de SU empresa.
 *   gerencial  → supervisor de una COMPAÑIA: solo lectura sobre la gente y
 *                los reportes de sus contratistas (FOM-02 §2.1).
 *   conductor  → su unidad, su inspeccion, su mantenimiento. Nada mas.
 *   personal   → cuenta personal: mapa, alertas y documentos de lo suyo.
 *
 * Un conductor con el panel entero delante no es un problema de estetica:
 * ve la flota completa y a toda la gente de la empresa.
 */
export function areaDe(perfil) {
  const rol = rolCanonico(perfil?.rol)
  const tipo = perfil?.empresaTipo ?? 'estandar'
  if (rol === 'admin_fom') return 'admin'
  if (rol === 'supervisor') {
    if (tipo === 'predefinida') return 'gerencial'
    if (tipo === 'personal') return 'personal'
    return 'operativo'
  }
  if (rol === 'operator') return 'operativo'
  if (rol === 'conductor') return 'conductor'
  return 'personal'
}

export function esConductor(perfil) {
  return areaDe(perfil) === 'conductor'
}

export function esCuentaPersonal(perfil) {
  return areaDe(perfil) === 'personal'
}

export { ETIQUETA_ROL, ROL_CANONICO }
