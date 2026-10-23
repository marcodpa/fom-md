import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PASO_EVENTOS, agruparCercanos, comoEventoManejo, conteoTipo, diasDelPeriodo, distanciaMetros, eventosParaMapa,
  filtrarEventosFlota, filtrarEventosManejo, juntarEventos, periodoIncompleto,
} from '../src/panel/datos/eventosManejo.js'

// Manejo brusco de TODA la flota y de todos los conductores de una unidad (23 oct 2026).
const AHORA = new Date(2026, 9, 23, 12, 0).getTime()
const HORA = 3600000
const DIA = 86400000
const TIPO = { frenada: 'harsh_braking', aceleracion: 'harsh_acceleration', exceso: 'speeding' }
const ev = (id, tipo, hace, o = {}) => comoEventoManejo({
  id, type: TIPO[tipo], occurredAt: new Date(AHORA - hace).toISOString(), vehicleId: 'v1', vehicleCode: '01',
  lat: 10.39, lng: -71.44, speedBeforeKph: tipo === 'exceso' ? 130 : 80, speedAfterKph: tipo === 'exceso' ? null : 30, ...o,
})
/** n eventos de un tipo en una unidad, uno por hora hacia atrás. */
const serie = (vehicleId, tipo, n) => Array.from({ length: n }, (_, i) => ev(`${vehicleId}-${tipo}-${i + 1}`, tipo, i * HORA, { vehicleId }))

test('vista de la flota: los 5 más nuevos de cada tipo POR unidad, no 5 en total', () => {
  const lista = [...serie('v1', 'aceleracion', 9), ...serie('v2', 'aceleracion', 7), ...serie('v3', 'frenada', 2)]
  const r = filtrarEventosFlota(lista, { periodo: 'ultimos', ahora: AHORA })
  const deUnidad = (v) => r.visibles.filter((e) => e.vehiculoId === v).length
  assert.equal(deUnidad('v1'), PASO_EVENTOS)
  assert.equal(deUnidad('v2'), PASO_EVENTOS)
  assert.equal(deUnidad('v3'), 2)
  assert.equal(r.porTipo.aceleracion.total, 16)
  assert.equal(conteoTipo(r.porTipo.aceleracion), '10 de 16')
  assert.equal(r.unidades, 3)
  // Los de cada unidad son sus más nuevos; la mezcla va del más nuevo al más viejo.
  assert.deepEqual(r.visibles.filter((e) => e.vehiculoId === 'v1').map((e) => e.id), [1, 2, 3, 4, 5].map((i) => `v1-aceleracion-${i}`))
  const horas = r.visibles.map((e) => Date.parse(e.hora))
  assert.deepEqual(horas, [...horas].sort((a, b) => b - a))
  // Tipo apagado y «Ocultar».
  assert.equal(filtrarEventosFlota(lista, { periodo: 'ultimos', tipos: ['frenada'], ahora: AHORA }).visibles.length, 2)
  assert.deepEqual(filtrarEventosFlota(lista, { periodo: 'oculto', ahora: AHORA }).visibles, [])
})

test('con una unidad elegida, «Hoy» y «7 días» muestran todos los del período; «Últimos 5» va de 5 en 5', () => {
  const lista = serie('v1', 'aceleracion', 12)
  assert.equal(filtrarEventosManejo(lista, { periodo: '7', todoElPeriodo: true, ahora: AHORA }).visibles.length, 12)
  assert.equal(filtrarEventosManejo(lista, { periodo: 'hoy', todoElPeriodo: true, ahora: AHORA }).visibles.length, 12)
  assert.equal(filtrarEventosManejo(lista, { periodo: 'ultimos', todoElPeriodo: true, ahora: AHORA }).visibles.length, PASO_EVENTOS)
  // Sin unidad (la lista del perfil) sigue de 5 en 5.
  assert.equal(filtrarEventosManejo(lista, { periodo: '7', ahora: AHORA }).visibles.length, PASO_EVENTOS)
})

test('se piden 7 días para «Hoy» y «7 días» y 30 para lo demás', () => {
  assert.equal(diasDelPeriodo('hoy'), 7)
  assert.equal(diasDelPeriodo('7'), 7)
  assert.equal(diasDelPeriodo('ultimos'), 30)
  assert.equal(diasDelPeriodo('30'), 30)
  assert.equal(diasDelPeriodo('oculto'), 30)
})

test('los eventos de varios conductores se juntan sin repetir y el corte en 100 se respeta', () => {
  const a = [ev('e1', 'frenada', 1 * HORA), ev('e2', 'frenada', 5 * DIA)]
  const b = [ev('e1', 'frenada', 1 * HORA), ev('e3', 'exceso', 2 * HORA)]
  b.tope = true // a b el servidor le cortó: lo suyo llega completo solo desde hace 2 h
  const juntos = juntarEventos([a, b, null])
  assert.deepEqual(juntos.map((e) => e.id), ['e1', 'e3', 'e2'])
  assert.equal(juntos.tope, true)
  assert.equal(juntos.completoDesde, AHORA - 2 * HORA)
  // Aunque lo más viejo de la lista es de hace 5 días, «7 días» puede estar incompleto.
  assert.equal(periodoIncompleto(juntos, '7', AHORA), true)
  assert.equal(juntarEventos([a]).tope, undefined)
  assert.equal(periodoIncompleto(juntarEventos([a]), '7', AHORA), false)
})

test('agrupar con la rejilla da lo mismo que comparar con todos, y aguanta la flota entera', () => {
  // Azar con semilla: siempre los mismos puntos, alrededor de Maracaibo.
  let s = 7
  const azar = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const lista = eventosParaMapa(Array.from({ length: 1500 }, (_, i) => ev(`e${i}`, ['frenada', 'aceleracion', 'exceso'][i % 3], i * 60000, {
    vehicleId: `v${i % 340}`, lat: 10.6 + (azar() - 0.5) * 0.4, lng: -71.65 + (azar() - 0.5) * 0.4,
  })), { ahora: AHORA })
  // El de siempre: cada evento contra todos los grupos ya hechos.
  const ingenuo = (metros, suelto = null) => {
    const grupos = []
    for (const e of lista) {
      const g = e.id !== suelto ? grupos.find((x) => x.id !== suelto && distanciaMetros(x, e) <= metros) : null
      if (g) g.eventos.push(e)
      else grupos.push({ id: e.id, lat: e.lat, lng: e.lng, eventos: [e] })
    }
    return grupos.map((g) => g.eventos.map((e) => e.id).join('|'))
  }
  for (const metros of [5, 80, 600, 3000, 60000]) {
    assert.deepEqual(agruparCercanos(lista, metros).map((g) => g.eventos.map((e) => e.id).join('|')), ingenuo(metros), `radio ${metros} m`)
  }
  assert.deepEqual(agruparCercanos(lista, 600, lista[10].id).map((g) => g.eventos.map((e) => e.id).join('|')), ingenuo(600, lista[10].id))
  // 340 unidades × 15 eventos: sin colgarse (antes eran millones de comparaciones).
  const grande = Array.from({ length: 5100 }, (_, i) => ({ ...lista[i % lista.length], id: `g${i}`, lat: 10.2 + (i % 71) * 0.01, lng: -72 + Math.floor(i / 71) * 0.01 }))
  const t0 = Date.now()
  agruparCercanos(grande, 30)
  assert.ok(Date.now() - t0 < 1500, 'agrupar 5.100 eventos tarda menos de 1,5 s')
})
