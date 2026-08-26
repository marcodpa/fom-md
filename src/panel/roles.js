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

export { ETIQUETA_ROL, ROL_CANONICO }
