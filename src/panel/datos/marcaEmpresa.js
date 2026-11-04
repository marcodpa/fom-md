// ============================================================
// MARCA DE EMPRESA: qué empresa mostrar arriba y en Centro de control.
// ------------------------------------------------------------
// Una sola decisión para todos los sitios que dicen «en qué empresa estás»:
// - Quien trabaja dentro de una empresa (o el administrador FOM que «entró»
//   a una) ve esa empresa: su nombre, su id para buscar el logo.
// - El administrador FOM en las pantallas globales ve la marca FOM.
// Las iniciales del monograma salen del nombre, nunca de un dato inventado.
// ============================================================
import { iniciales } from './formato.js'
import { esAdminFom } from '../roles.js'

export const NOMBRE_FOM_GLOBAL = 'Administración global FOM'
export const NOTA_GESTION = 'Gestionando como administrador FOM'

/** @returns {{nombre: string, empresaId: string|null, esFom: boolean, nota: string, iniciales: string}} */
export function marcaDe(perfil, { global = false } = {}) {
  const gestion = perfil?.empresaGestion ?? null
  if (!gestion && global && esAdminFom(perfil)) {
    return { nombre: NOMBRE_FOM_GLOBAL, empresaId: null, esFom: true, nota: '', iniciales: 'FO' }
  }
  const nombre = String(gestion?.nombre || perfil?.empresa || '').trim() || 'FOM · Administración'
  return {
    nombre,
    empresaId: gestion?.id ?? perfil?.empresaId ?? null,
    esFom: false,
    nota: gestion ? NOTA_GESTION : '',
    iniciales: iniciales(nombre),
  }
}
