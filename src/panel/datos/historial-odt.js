import { etiqueta } from './catalogos.js'

// La ODT se muestra con 3 estados, igual que la app: Abierta / En revisión /
// Resuelta. Es SOLO presentación: el servidor sigue con sus nueve estados y
// lo que se le envía no cambia. Cancelada cuenta como resuelta porque ya no
// espera nada (la app hace lo mismo).
export const ESTADOS_VISIBLES = [
  { clave: 'abierta', etiqueta: 'Abierta', plural: 'Abiertas', color: 'ambar', estados: ['abierta'] },
  { clave: 'revision', etiqueta: 'En revisión', plural: 'En revisión', color: 'azul', estados: ['en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad'] },
  { clave: 'resuelta', etiqueta: 'Resuelta', plural: 'Resueltas', color: 'verde', estados: ['cerrada', 'cancelada'] },
]

/** El estado visible (de los 3) de un estado del servidor. Uno desconocido se enseña tal cual, en gris. */
export function estadoVisible(estado) {
  return ESTADOS_VISIBLES.find(g => g.estados.includes(estado))
    ?? { clave: estado, etiqueta: etiqueta('odt_estado', estado), plural: etiqueta('odt_estado', estado), color: 'gris', estados: [estado] }
}

const TITULOS = {
  abierta: 'Falla reportada', en_revision: 'Enviada a revisión', aprobada: 'Trabajo aprobado',
  asignada: 'Responsable asignado', en_ejecucion: 'Trabajo iniciado', pausada: 'Trabajo pausado',
  en_calidad: 'Trabajo entregado para revisión de calidad', cerrada: 'Orden resuelta', cancelada: 'Orden cancelada',
}
const ESTADO_EVENTO = { inicio: 'en_ejecucion', pausa: 'pausada', reanudacion: 'en_ejecucion', entrega: 'en_calidad' }
const TITULO_EVENTO = { inicio: 'Trabajo iniciado', pausa: 'Trabajo pausado', reanudacion: 'Trabajo reanudado', entrega: TITULOS.en_calidad }
const instante = en => en ? new Date(en).getTime() : NaN
const nombre = valor => valor && valor !== '—' ? valor : null
const mismaOperacion = (a, b) => a.de === b.de && a.a === b.a
  && nombre(a.actor) && nombre(a.actor) === nombre(b.actor)
  && Number.isFinite(instante(a.en)) && Math.abs(instante(a.en) - instante(b.en)) <= 1500

/** Combina las dos lecturas de UNA operación; conserva sus notas y no fusiona ciclos distintos. */
export function presentarHistorial(odt, cambios = [], ejecucion = null) {
  const hitos = cambios.map(c => ({
    titulo: !c.de ? 'Falla reportada' : c.a === 'en_revision' && c.de === 'cerrada' ? 'Orden reabierta'
      : c.a === 'en_ejecucion' && c.de === 'pausada' ? 'Trabajo reanudado'
      : c.a === 'en_ejecucion' && c.de === 'en_calidad' ? 'Trabajo devuelto al taller'
      : TITULOS[c.a] || `Estado registrado: ${estadoVisible(c.a).etiqueta}`,
    actor: nombre(c.actor) || (!c.de ? nombre(odt.creadorNombre) : null),
    en: c.en, de: c.de, a: c.a, notas: c.nota ? [c.nota] : [], registros: [c],
  }))
  if (!hitos.length) {
    hitos.push({ titulo: 'Falla reportada', actor: nombre(odt.creadorNombre), en: odt.creadaEn, notas: [], registros: [] })
    if (odt.estado === 'cerrada' && odt.resueltaEn) hitos.push({ titulo: TITULOS.cerrada, actor: null, en: odt.resueltaEn, notas: odt.notaSolucion ? [odt.notaSolucion] : [], registros: [] })
  }
  for (const e of ejecucion?.eventos ?? []) {
    const a = e.a ?? ESTADO_EVENTO[e.tipo]
    const existente = hitos.find(h => mismaOperacion(h, { ...e, a }))
    if (existente) {
      existente.titulo = TITULO_EVENTO[e.tipo] || existente.titulo
      if (e.nota && !existente.notas.includes(e.nota)) existente.notas.push(e.nota)
      existente.registros.push(e)
    } else hitos.push({ titulo: TITULO_EVENTO[e.tipo] || 'Actividad registrada', actor: nombre(e.actor), en: e.en, de: e.de, a, notas: e.nota ? [e.nota] : [], registros: [e] })
  }
  const responsable = ejecucion?.responsable
  if (responsable?.desde) {
    const asignada = hitos.find(h => h.a === 'asignada' && Number.isFinite(instante(h.en)) && Math.abs(instante(h.en) - instante(responsable.desde)) <= 1500)
    if (asignada) asignada.responsable = responsable.nombre
    else hitos.push({ titulo: 'Responsable asignado', actor: null, responsable: responsable.nombre, en: responsable.desde, notas: [], registros: [] })
  }
  return hitos.sort((a, b) => (instante(a.en) || 0) - (instante(b.en) || 0)).map(h => ({
    ...h, estado: h.a ? estadoVisible(h.a).etiqueta : null,
    fechaValida: Number.isFinite(instante(h.en)),
  }))
}
