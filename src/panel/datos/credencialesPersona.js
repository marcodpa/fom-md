import { rolCanonico } from '../roles.js'

export const TIPOS_CREDENCIAL = [
  { valor: 'driver_license', texto: 'Licencia de conducir' },
  { valor: 'medical_certificate', texto: 'Aptitud médica' },
]

/** Mismo límite que requireCanManage del servidor. No confía en nombres. */
export function puedeEditarCredenciales(actor, persona) {
  const actorId = actor?.userId || actor?.id
  const personaId = persona?.userId || persona?.id
  if (!actorId || !personaId || actorId === personaId || persona.administrable === false || persona.estado !== 'active') return false
  const rol = rolCanonico(actor.rol)
  const objetivo = rolCanonico(persona.rol)
  if (objetivo === 'admin_fom') return false
  if (rol === 'admin_fom') return Boolean(actor.empresaId && actor.empresaId === persona.empresaId)
  return rol === 'supervisor' && objetivo !== 'supervisor' && actor.empresaId === persona.empresaId
}

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(valor)) return false
  const fecha = new Date(`${valor}T12:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

/** Reemplazo completo: nunca manda fechas inventadas ni borra campos al editar otro tipo. */
export function cuerpoCredencial(borrador) {
  const kind = borrador.tipo
  if (!TIPOS_CREDENCIAL.some(t => t.valor === kind)) throw new Error('Elige licencia de conducir o aptitud médica.')
  const number = String(borrador.numero || '').trim().toLowerCase()
  const category = String(borrador.categoria || '').trim().toLowerCase()
  const issuedAt = borrador.emitidaEn || ''
  const expiresAt = borrador.venceEn || ''
  if (kind === 'driver_license' && (!number || !category)) throw new Error('La licencia necesita número y grado o categoría.')
  if (number && !/^[a-z0-9][a-z0-9.-]{0,49}$/u.test(number)) throw new Error('El número admite hasta 50 caracteres: letras, números, puntos y guiones.')
  if (kind === 'driver_license' && !/^[a-z0-9][a-z0-9-]{0,19}$/u.test(category)) throw new Error('Revisa el grado o categoría de la licencia.')
  if (!fechaValida(expiresAt) || (issuedAt && !fechaValida(issuedAt))) throw new Error('Revisa las fechas de emisión y vencimiento.')
  if (issuedAt && issuedAt > expiresAt) throw new Error('El vencimiento no puede ser anterior a la emisión.')
  const reason = String(borrador.motivo || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9._-]{1,99}$/u.test(reason)) throw new Error('Elige un motivo administrativo para guardar.')
  return { kind, ...(number ? { number } : {}), ...(kind === 'driver_license' ? { category } : {}), ...(issuedAt ? { issuedAt } : {}), expiresAt, reason }
}

export function credencialesVigentes(items = []) {
  return (Array.isArray(items) ? items : []).filter(c => c && TIPOS_CREDENCIAL.some(t => t.valor === c.kind) && c.current !== false && !c.supersededAt)
}
