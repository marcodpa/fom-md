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

// ---- La entrada «Tus planillas de hoy» (T-202), igual que inspeccion-planillas.tsx ----

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** «Martes 27 de octubre». */
export function fechaLarga(d = new Date()) {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** Cuántos puntos, secciones y críticos tiene una planilla. */
export function medidaDePlanilla(plantilla) {
  const items = itemsDe(plantilla)
  return { puntos: items.length, secciones: plantilla?.categorias?.length ?? 0, criticos: items.filter((i) => i.critico).length }
}

/** «14 puntos · 5 secciones · 6 críticos», con el plural bien puesto. */
export function textoMedida({ puntos, secciones, criticos }) {
  return [
    `${puntos} ${puntos === 1 ? 'punto' : 'puntos'}`,
    `${secciones} ${secciones === 1 ? 'sección' : 'secciones'}`,
    criticos > 0 ? `${criticos} ${criticos === 1 ? 'crítico' : 'críticos'}` : null,
  ].filter(Boolean).join(' · ')
}

/** Bien / Observación / Falla contados, para el resumen de «ya está hecha». */
export function cuentaRespuestas(respuestas = []) {
  return {
    bien: respuestas.filter((r) => r.estado === 'conforme').length,
    observacion: respuestas.filter((r) => r.estado === 'observacion').length,
    falla: respuestas.filter((r) => r.estado === 'falla').length,
  }
}

// ---- Varias planillas por día (T-200) ----
// Cada planilla de la lista llega como `{ id, plantilla, dueToday, hecha }`;
// `hecha` es `null` o `{ inspeccion, detalle }` (la inspección que la llenó hoy).

/** Las que se ven en «Tus planillas de hoy»: las que tocan hoy y, si ya está llena, aunque no toque. */
export function planillasVisibles(planillas = []) {
  return planillas.filter((p) => p.dueToday || p.hecha)
}

/** Cuántas van hechas y cuántas son, de las que se ven. */
export function cuentaPlanillas(planillas = []) {
  const vistas = planillasVisibles(planillas)
  return { hechas: vistas.filter((p) => p.hecha).length, total: vistas.length }
}

/** La unidad queda «Lista para salir» solo cuando TODAS las de hoy están hechas (y hay al menos una). */
export function todasHechas(planillas = []) {
  const { hechas, total } = cuentaPlanillas(planillas)
  return total > 0 && hechas === total
}

/** ¿Alguna de hoy salió bloqueada? Entonces la unidad no sale, estén hechas o no las demás. */
export function hayBloqueada(planillas = []) {
  return planillasVisibles(planillas).some((p) => p.hecha?.inspeccion?.resultado === 'bloqueada')
}

/** Cómo se ve la unidad arriba de la lista: pastilla con su tono. `enCurso`: puntos ya respondidos sin enviar. */
export function estadoDeUnidad(planillas = [], enCurso = 0) {
  const { hechas, total } = cuentaPlanillas(planillas)
  if (hayBloqueada(planillas)) return { tono: 'peligro', texto: 'Bloqueada' }
  if (total > 0 && hechas === total) return { tono: 'exito', texto: 'Lista para salir' }
  return hechas > 0 || enCurso > 0 ? { tono: 'primario', texto: 'En curso' } : { tono: 'aviso', texto: 'Pendiente' }
}

/** «Lo hiciste a las 08:30», «La hizo Ana a las 08:30» o, sin saber quién, «Se hizo a las 08:30». */
export function textoDeQuien(inspeccion, yo, hora) {
  const cuando = hora ? `a las ${hora}` : 'hoy'
  if (!inspeccion) return null
  // La hora ya puede terminar en punto («1:11 p. m.»): un solo punto al final.
  const frase = esMia(inspeccion, yo) ? `La hiciste ${cuando}`
    : inspeccion.conductor && inspeccion.conductor !== 'Sin conductor' ? `La hizo ${inspeccion.conductor} ${cuando}`
      : `Se hizo ${cuando}`
  return frase.replace(/\.?$/u, '.')
}
