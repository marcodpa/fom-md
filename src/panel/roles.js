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

export function rolCanonico(rol) {
  return ROL_CANONICO[rol] ?? rol ?? null
}

export function etiquetaRolSesion(rol) {
  const canonico = rolCanonico(rol)
  return canonico ? (ETIQUETA_ROL[canonico] ?? canonico) : 'Usuario de la consola'
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
