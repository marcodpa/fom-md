/**
 * Permisos y capacidades por rol — fuente única.
 *
 * Conviven dos modelos (FOM-02 §7 + legado del brief §5) mientras dura la
 * migración, por eso las preguntas se hacen por CAPACIDAD y no por rol: aquí
 * viven los "¿qué puede hacer este usuario?" para no repetir checks de rol
 * sueltos por las pantallas.
 */

import type { CompanyTipo, Role, User } from '@/types';

/** Roles con acceso al panel OPERATIVO de una empresa (tabs de `panel/`). */
const ROLES_PANEL_OPERATIVO: ReadonlySet<Role> = new Set<Role>([
  // Legado
  'companyAdmin',
  'generalAdmin',
  'superAdmin',
  // FOM-02
  'admin',
  'supervisor_company',
]);

/** Roles que administran VARIAS empresas (menú de empresas + comparativas). */
const ROLES_MULTIEMPRESA: ReadonlySet<Role> = new Set<Role>([
  'generalAdmin',
  'superAdmin',
  'admin',
]);

/** Roles de conductor de empresa (con inspección, ODT y jornada). */
const ROLES_CONDUCTOR: ReadonlySet<Role> = new Set<Role>(['driver', 'conductor']);

/** Roles de cuenta personal (FOM-02 §5–§6: Ale, Santi, Sofi). */
const ROLES_PERSONAL: ReadonlySet<Role> = new Set<Role>([
  'supervisor_personal',
  'usuario_personal',
]);

/**
 * ¿Tiene acceso al panel operativo de empresa (FOM-WEB)? OJO: el supervisor de
 * predefinida (Lino) NO — su vista es gerencial de solo lectura (FOM-02 §2.1);
 * cualquier pantalla operativa (panel, reportes, OT, comparativas) se protege
 * con esta capacidad.
 */
export function esAdmin(user: Pick<User, 'role'>): boolean {
  return ROLES_PANEL_OPERATIVO.has(user.role);
}

/** ¿Opera un vehículo? Entonces obtiene el área de conductor (las tabs). */
export function puedeConducir(user: Pick<User, 'drives'>): boolean {
  return user.drives === true;
}

/** ¿Es conductor puro (solo conduce, sin panel)? */
export function esConductorPuro(user: Pick<User, 'role'>): boolean {
  return ROLES_CONDUCTOR.has(user.role);
}

/**
 * ¿Administra varias empresas? Ve el menú multiempresa y las comparativas
 * (Admin General y Super Admin legados + Admin del FOM-02).
 */
export function esMultiempresa(user: Pick<User, 'role'>): boolean {
  return ROLES_MULTIEMPRESA.has(user.role);
}

/**
 * ¿Es una cuenta personal (FOM-02 §5–§6)? Su experiencia es la flota doméstica
 * (mapa + alertas + documentos), no el panel corporativo.
 */
export function esCuentaPersonal(user: Pick<User, 'role'>): boolean {
  return ROLES_PERSONAL.has(user.role);
}

/**
 * JERARQUÍA DE MANDO. Cada quien solo administra a los de rango MENOR: el admin
 * FOM está por encima de todo, el operativo de una ente por encima de su gente,
 * y conductores/usuarios no administran a nadie.
 */
const RANGO: Partial<Record<Role, number>> = {
  // Administración FOM
  admin: 4,
  superAdmin: 4,
  generalAdmin: 4,
  // Operativo de una ente (compañía, contratista o cuenta personal)
  supervisor_company: 3,
  companyAdmin: 3,
  supervisor_personal: 3,
  // Sin gente a cargo
  conductor: 1,
  driver: 1,
  usuario_personal: 1,
};

/** Rango de mando del rol (a mayor número, más alcance). */
export function rangoDe(role: Role): number {
  return RANGO[role] ?? 1;
}

/**
 * ¿El actor puede GESTIONAR a esa persona (ver su ficha en el manejo de
 * usuarios, cambiarle el rol, moverla de ente o eliminarla)?
 *
 * Dos reglas y ninguna excepción:
 *  1. NUNCA a uno mismo — los datos propios se editan en "Mi perfil", y nadie
 *     se cambia su propio rol ni se elimina de su ente.
 *  2. Solo a rangos MENORES: un administrador no administra a otro de su mismo
 *     nivel, y un admin FOM no administra a otro admin FOM.
 *
 * OJO: esto es el mando sobre OTROS. No limita lo que cada quien hace con su
 * propia cuenta ni el resto de funciones (crear, asignar, etc.).
 */
export function puedeGestionarA(
  actor: Pick<User, 'id' | 'role'>,
  objetivo: Pick<User, 'id' | 'role'>,
): boolean {
  if (actor.id === objetivo.id) return false;
  return rangoDe(objetivo.role) < rangoDe(actor.role);
}

/** Etiqueta base de cada rol (sin contexto de ente). */
const ETIQUETA_ROL: Partial<Record<Role, string>> = {
  admin: 'Administrador FOM',
  superAdmin: 'Administrador FOM',
  generalAdmin: 'Supervisor',
  companyAdmin: 'Administrador',
  supervisor_company: 'Administrador',
  conductor: 'Conductor',
  driver: 'Conductor',
  supervisor_personal: 'Supervisor',
  usuario_personal: 'Usuario',
};

/**
 * Etiqueta legible del rol según el TIPO de ente. En una COMPAÑÍA (predefinida)
 * administrador y supervisor son lo mismo: el rol operativo se llama
 * "Supervisor". En contratistas/empresas ese mismo rol se llama "Administrador".
 */
export function etiquetaRol(role: Role, companyTipo?: CompanyTipo): string {
  if (role === 'supervisor_company' && companyTipo === 'predefinida') return 'Supervisor';
  return ETIQUETA_ROL[role] ?? role;
}
