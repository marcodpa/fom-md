// ============================================================
// INSPECCIÓN DEL CONDUCTOR — las reglas, sin pantalla (T-167a)
// ------------------------------------------------------------
// Lo que decide la pantalla de inspeccion.tsx de la app, separado para que se
// pueda probar sin navegador: qué falta para enviar, cómo se cuenta lo
// respondido y la pregunta de sábado y domingo (inspeccion-fin-de-semana.tsx).
// ============================================================

/** Fecha local AAAA-MM-DD (no UTC: en Venezuela la noche ya sería mañana). */
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** «sábado» o «domingo» si la fecha cae en fin de semana; si no, `null`. */
export function diaDeFinDeSemana(d = new Date()) {
  const n = d.getDay()
  return n === 6 ? 'sábado' : n === 0 ? 'domingo' : null
}

/** Por persona: en una computadora compartida cada conductor responde lo suyo. */
const claveFinDeSemana = (userId) => `fom:inspeccion-fin-de-semana:${userId}`

/**
 * Lo que dijo hoy sobre si trabaja: 'trabajo' | 'no_trabajo' | null.
 * La respuesta de otro día ya no vale: cada sábado y cada domingo se pregunta.
 */
export function leerFinDeSemana(userId, fecha = fechaLocal(), almacen = globalThis.localStorage) {
  try {
    const g = JSON.parse(almacen?.getItem(claveFinDeSemana(userId)) || 'null')
    return g?.fecha === fecha && (g.respuesta === 'trabajo' || g.respuesta === 'no_trabajo') ? g.respuesta : null
  } catch {
    return null
  }
}

export function guardarFinDeSemana(userId, respuesta, fecha = fechaLocal(), almacen = globalThis.localStorage) {
  try {
    almacen?.setItem(claveFinDeSemana(userId), JSON.stringify({ fecha, respuesta }))
  } catch {
    // Sin almacenamiento solo se pierde el recuerdo: se vuelve a preguntar.
  }
}

/** Los ítems del formato en una sola lista, en su orden. */
export function itemsDe(plantilla) {
  return (plantilla?.categorias ?? []).flatMap((c) => c.items)
}

/**
 * Por qué todavía no se puede enviar, con el texto de la app; `null` si se puede.
 * Mismo orden que onSubmit de inspeccion.tsx: todo respondido, foto en las
 * fallas críticas y la decisión «¿crear ODT?» en las demás fallas.
 */
export function problemaParaEnviar(items, respuestas) {
  const faltan = items.filter((it) => !respuestas[it.id]).length
  if (faltan > 0) return `Responde todos los ítems antes de enviar (faltan ${faltan}).`
  const enFalla = (it) => respuestas[it.id]?.estado === 'falla'
  if (items.some((it) => it.critico && enFalla(it) && !(respuestas[it.id].fotos?.length))) {
    return 'Adjunta una foto en las fallas críticas para generar la ODT.'
  }
  if (items.some((it) => !it.critico && enFalla(it) && respuestas[it.id].crearOdt === undefined)) {
    return 'En cada falla, responde si quieres crear la ODT o solo registrarla.'
  }
  return null
}

/**
 * Cambiar la respuesta de un ítem conserva lo que sigue teniendo sentido
 * (setEstado de inspection-item.tsx): la nota se va al marcar Conforme y la
 * foto y la decisión de la ODT solo acompañan a una falla.
 */
export function conEstado(previa, itemId, estado) {
  return {
    itemId,
    estado,
    nota: estado === 'conforme' ? undefined : previa?.nota,
    fotos: estado === 'falla' ? previa?.fotos : undefined,
    crearOdt: estado === 'falla' ? previa?.crearOdt : undefined,
  }
}

/** Misma regla que la web y la app: falla en punto crítico = falla crítica; lo demás no conforme, observación. */
export function contarFallas(respuestas = []) {
  const malas = respuestas.filter((r) => r.estado !== 'conforme')
  const criticas = malas.filter((r) => r.critico && r.estado === 'falla').length
  return { criticas, observaciones: malas.length - criticas }
}

/** «1 falla crítica · 2 observaciones», con el plural bien puesto. */
export function textoFallas({ criticas, observaciones }) {
  return `${criticas} ${criticas === 1 ? 'falla crítica' : 'fallas críticas'} · ${observaciones} ${observaciones === 1 ? 'observación' : 'observaciones'}`
}

/** Lo que se le dice al conductor bajo la tarjeta, según cómo salió (HechaHoyView). */
export function textoDeResultado(resultado) {
  if (resultado === 'bloqueada') {
    return 'Encontramos una falla crítica. Por tu seguridad, no puedes salir. Avisamos a tu supervisor para reasignarte otra unidad o esperar la reparación.'
  }
  if (resultado === 'aprobada_con_observaciones') {
    return 'Puedes salir, pero registramos observaciones para darles seguimiento. Maneja con cuidado y que llegues bien.'
  }
  if (resultado === 'aprobada') return 'Tu unidad está lista. Maneja con cuidado y que llegues bien.'
  return null
}

/** Nombre corto y tono de cada resultado (VISTA_INSPECCION de la app). */
export const VISTA_RESULTADO = {
  pendiente: { corto: 'Pendiente', largo: 'Pendiente', tono: 'neutro' },
  aprobada: { corto: 'Aprobada', largo: 'Aprobada', tono: 'exito' },
  aprobada_con_observaciones: { corto: 'Con observaciones', largo: 'Aprobada con observaciones', tono: 'aviso' },
  bloqueada: { corto: 'Bloqueada', largo: 'Bloqueada', tono: 'peligro' },
}

/** Sin tildes ni mayúsculas, para comparar nombres. */
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/gu, '').trim().toLowerCase()

/** ¿La hizo quien mira? Con el id se sabe seguro; sin él (servidor viejo), por el nombre. */
export function esMia(inspeccion, yo) {
  if (!inspeccion || !yo) return false
  return inspeccion.conductorId ? inspeccion.conductorId === yo.id : plano(inspeccion.conductor) === plano(yo.nombre)
}
