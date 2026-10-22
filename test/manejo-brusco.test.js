import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PASO_EVENTOS, agruparCercanos, alCambiarUnidad, comoEventoManejo, conteoTipo, distanciaMetros, eleccionParaEvento,
  eleccionValida, enlaceEventoEnMapa, eventoDelEnlace, eventosDeHoy, filtrarEventosManejo, geojsonEventos,
  leerEnlaceEvento, metrosPorPixel, mostrarInicial, periodoIncompleto, tipoDeAlerta, ultimosEventos, verMas,
} from '../src/panel/datos/eventosManejo.js'

// «Ahora»: 21 oct 2026, 12:00 hora local.
const AHORA = new Date(2026, 9, 21, 12, 0).getTime()
const HORA = 3600000
const DIA = 86400000
const TIPO = { frenada: 'harsh_braking', aceleracion: 'harsh_acceleration', exceso: 'speeding' }
const ev = (id, tipo, hace, o = {}) => comoEventoManejo({
  id, type: TIPO[tipo], occurredAt: new Date(AHORA - hace).toISOString(), vehicleId: 'v1', vehicleCode: '01',
  lat: 10.39, lng: -71.44, speedBeforeKph: tipo === 'exceso' ? 130 : 80, speedAfterKph: tipo === 'exceso' ? null : 30, ...o,
})
/** n eventos de un tipo, uno por hora hacia atrás desde `desde`. */
const serie = (tipo, n, desde = 0) => Array.from({ length: n }, (_, i) => ev(`${tipo}-${i + 1}`, tipo, desde + i * HORA))

test('«Últimos 5» son 5 de CADA tipo, no 5 en total', () => {
  const lista = [...serie('frenada', 8), ...serie('aceleracion', 3), ...serie('exceso', 7, 30 * 60000)]
  const r = filtrarEventosManejo(lista, { periodo: 'ultimos', ahora: AHORA })
  assert.equal(r.porTipo.frenada.eventos.length, 5)
  assert.equal(r.porTipo.aceleracion.eventos.length, 3)
  assert.equal(r.porTipo.exceso.eventos.length, 5)
  assert.equal(r.visibles.length, 13)
  // Los más nuevos de cada tipo, y la mezcla del más nuevo al más viejo.
  assert.deepEqual(r.porTipo.frenada.eventos.map((e) => e.id), ['frenada-1', 'frenada-2', 'frenada-3', 'frenada-4', 'frenada-5'])
  const horas = r.visibles.map((e) => Date.parse(e.hora))
  assert.deepEqual(horas, [...horas].sort((a, b) => b - a))
  // «5 de 8» en la pastilla; si se ven todos, solo el total.
  assert.equal(conteoTipo(r.porTipo.frenada), '5 de 8')
  assert.equal(conteoTipo(r.porTipo.aceleracion), '3')
  assert.equal(r.porTipo.frenada.quedan, 3)
})

test('un tipo apagado no se pinta pero conserva su conteo; «Ocultar» no muestra ninguno', () => {
  const lista = [...serie('frenada', 2), ...serie('exceso', 4)]
  const r = filtrarEventosManejo(lista, { periodo: 'ultimos', tipos: ['exceso'], ahora: AHORA })
  assert.deepEqual(r.visibles.map((e) => e.tipo), ['exceso', 'exceso', 'exceso', 'exceso'])
  assert.equal(r.porTipo.frenada.total, 2)
  assert.equal(r.porTipo.frenada.encendido, false)
  assert.equal(conteoTipo(r.porTipo.frenada), '2')
  const oculto = filtrarEventosManejo(lista, { periodo: 'oculto', ahora: AHORA })
  assert.deepEqual(oculto.visibles, [])
  assert.equal(oculto.total, 6)
})

test('«Hoy» es desde la medianoche local y «7 días» corta a 7 días, cada tipo por separado', () => {
  const lista = [
    ev('hoy-temprano', 'frenada', 11 * HORA), // 1:00 de hoy
    ev('anoche', 'frenada', 13 * HORA), // 23:00 de ayer
    ev('hace-3-dias', 'aceleracion', 3 * DIA),
    ev('hace-9-dias', 'exceso', 9 * DIA),
  ]
  assert.deepEqual(eventosDeHoy(lista, AHORA).map((e) => e.id), ['hoy-temprano'])
  assert.deepEqual(filtrarEventosManejo(lista, { periodo: 'hoy', ahora: AHORA }).visibles.map((e) => e.id), ['hoy-temprano'])
  assert.deepEqual(filtrarEventosManejo(lista, { periodo: '7', ahora: AHORA }).visibles.map((e) => e.id), ['hoy-temprano', 'anoche', 'hace-3-dias'])
  // «Últimos 5» mira todo lo pedido (30 días).
  assert.equal(filtrarEventosManejo(lista, { periodo: 'ultimos', ahora: AHORA }).visibles.length, 4)
  assert.deepEqual(ultimosEventos(lista, 2).map((e) => e.id), ['hoy-temprano', 'anoche'])
})

test('«Ver 5 más» suma 5 solo a ese tipo', () => {
  const lista = [...serie('frenada', 12), ...serie('exceso', 9)]
  let mostrar = mostrarInicial()
  assert.deepEqual(mostrar, { frenada: PASO_EVENTOS, aceleracion: PASO_EVENTOS, exceso: PASO_EVENTOS })
  mostrar = verMas(mostrar, 'frenada')
  let r = filtrarEventosManejo(lista, { periodo: '7', mostrar, ahora: AHORA })
  assert.equal(r.porTipo.frenada.eventos.length, 10)
  assert.equal(r.porTipo.exceso.eventos.length, 5)
  assert.equal(r.porTipo.frenada.quedan, 2)
  mostrar = verMas(mostrar, 'frenada')
  r = filtrarEventosManejo(lista, { periodo: '7', mostrar, ahora: AHORA })
  assert.equal(r.porTipo.frenada.eventos.length, 12)
  assert.equal(r.porTipo.frenada.quedan, 0)
  assert.equal(conteoTipo(r.porTipo.frenada), '12')
})

test('agrupar cercanos: casi en el mismo punto van juntos; lejos, sueltos; el elegido nunca se agrupa', () => {
  const a = ev('a', 'frenada', 1 * HORA, { lat: 10.39, lng: -71.44 })
  const b = ev('b', 'exceso', 2 * HORA, { lat: 10.39005, lng: -71.44005 }) // ~7 m
  const c = ev('c', 'aceleracion', 3 * HORA, { lat: 10.395, lng: -71.44 }) // ~550 m
  const lista = [a, b, c]
  assert.ok(distanciaMetros(a, b) < 10)
  assert.ok(distanciaMetros(a, c) > 500)
  const grupos = agruparCercanos(lista, 30)
  assert.equal(grupos.length, 2)
  assert.deepEqual(grupos[0].eventos.map((e) => e.id), ['a', 'b'])
  assert.equal(grupos[0].id, 'grupo:a|b')
  assert.equal(grupos[1].id, 'c')
  // Sin radio no se junta nada; el elegido sale del grupo.
  assert.equal(agruparCercanos(lista, 0).length, 3)
  assert.deepEqual(agruparCercanos(lista, 30, 'a').map((g) => g.id), ['a', 'b', 'c'])
  // Alejado, los tres entran en un círculo.
  assert.equal(agruparCercanos(lista, 1000).length, 1)
  // En el GeoJSON: un círculo con su número y sus ids.
  const g = geojsonEventos(lista, null, { metros: 30 })
  assert.deepEqual(g.features[0].properties, { id: 'grupo:a|b', tipo: 'grupo', cantidad: 2, ids: 'a|b', activo: false, orden: 5 })
  assert.equal(g.features[1].properties.tipo, 'aceleracion')
  // El radio en metros sale del zoom: a más zoom, menos metros por píxel.
  assert.ok(metrosPorPixel(15, 10.39) < metrosPorPixel(12, 10.39))
  assert.ok(Math.abs(metrosPorPixel(0, 0) - 78271.5) < 1)
})

test('al cambiar de unidad se suelta el elegido y «Ver más» vuelve a 5', () => {
  const inicio = alCambiarUnidad(null, 'v1')
  assert.deepEqual(inicio, { vehiculoId: 'v1', activo: null, mostrar: mostrarInicial() })
  const usado = { ...inicio, activo: 'e1', mostrar: verMas(inicio.mostrar, 'frenada') }
  // Misma unidad: no cambia nada (el mismo objeto, sin repintar).
  assert.equal(alCambiarUnidad(usado, 'v1'), usado)
  const otra = alCambiarUnidad(usado, 'v2')
  assert.equal(otra.activo, null)
  assert.equal(otra.mostrar.frenada, PASO_EVENTOS)
  // Sin unidad (se deseleccionó): nada elegido.
  assert.equal(alCambiarUnidad(usado, null).activo, null)
})

test('la elección de la sesión se revisa al leerla', () => {
  assert.deepEqual(eleccionValida(null), { periodo: 'ultimos', tipos: ['frenada', 'aceleracion', 'exceso'] })
  assert.deepEqual(eleccionValida({ periodo: 'oculto', tipos: ['exceso', 'otro'] }), { periodo: 'oculto', tipos: ['exceso'] })
  assert.deepEqual(eleccionValida({ periodo: '30', tipos: [] }), { periodo: 'ultimos', tipos: [] })
})

test('enlace al mapa: ida y vuelta, y el evento se encuentra por id o por la hora', () => {
  const url = enlaceEventoEnMapa({ vehiculoId: 'v 1', eventoId: 'e9', conductorId: 'u3' })
  assert.equal(url, '/panel/mapa?unidad=v+1&evento=e9&conductor=u3')
  assert.equal(enlaceEventoEnMapa({}), '/panel/mapa')
  const leido = leerEnlaceEvento(new URLSearchParams(url.split('?')[1]))
  assert.deepEqual(leido, { unidad: 'v 1', evento: 'e9', conductor: 'u3', hora: null, tipo: null })
  assert.equal(leerEnlaceEvento(new URLSearchParams('evento=e9')), null)
  assert.equal(leerEnlaceEvento(new URLSearchParams('unidad=v1&tipo=raro')).tipo, null)

  const lista = [ev('f1', 'frenada', 1 * HORA), ev('x1', 'exceso', 1 * HORA + 4 * 60000), ev('x2', 'exceso', 3 * HORA)]
  assert.equal(eventoDelEnlace(lista, { evento: 'x2' }).id, 'x2')
  // Una alerta de velocidad: sin id del evento, el exceso más cercano a su hora (± 10 min).
  const hora = new Date(AHORA - HORA).toISOString()
  assert.equal(eventoDelEnlace(lista, { hora, tipo: tipoDeAlerta('exceso_velocidad') }).id, 'x1')
  assert.equal(eventoDelEnlace(lista, { hora }).id, 'f1')
  assert.equal(eventoDelEnlace(lista, { hora: new Date(AHORA - 2 * HORA).toISOString(), tipo: 'exceso' }), null)
  assert.equal(tipoDeAlerta('curva_agresiva'), null)
})

test('el enlace deja los filtros para ver el evento (período corto, su tipo encendido, «Ver más»)', () => {
  const lista = [...serie('frenada', 12)]
  // El 3.º más nuevo cabe en «Últimos 5».
  assert.deepEqual(eleccionParaEvento(lista, 'frenada-3', { ahora: AHORA, tipos: [] }),
    { periodo: 'ultimos', tipos: ['frenada'], mostrar: { ...mostrarInicial(), frenada: 5 } })
  // El 8.º no: se abre «Ver más» hasta él.
  const r = eleccionParaEvento(lista, 'frenada-8', { ahora: AHORA })
  assert.equal(r.mostrar.frenada, 10)
  assert.ok(filtrarEventosManejo(lista, { ...r, ahora: AHORA }).visibles.some((e) => e.id === 'frenada-8'))
  assert.equal(eleccionParaEvento(lista, 'no-existe', { ahora: AHORA }), null)
})

test('aviso de corte en 100: solo si lo más viejo que llegó es más nuevo que el período', () => {
  // 15 eventos, uno por hora: el más viejo es de anoche (22:00).
  const lista = serie('frenada', 15)
  assert.equal(periodoIncompleto(lista, '7', AHORA), false)
  lista.tope = true
  assert.equal(periodoIncompleto(lista, '7', AHORA), true)
  // Lo de hoy llegó completo: lo más viejo es de antes de la medianoche.
  assert.equal(periodoIncompleto(lista, 'hoy', AHORA), false)
})
