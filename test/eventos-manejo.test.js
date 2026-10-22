import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CLAVES_EVENTO, EXCESO_KMH, TIPOS_EVENTO, comoEventoManejo, contarPorTipo, diasServidor, eventosParaMapa,
  excesosBajoUmbral, filtrarPorTipos, geojsonEventos, resumenEventos, textoEvento, vaEnMapa, velocidadesEvento,
} from '../src/panel/datos/eventosManejo.js'

// Forma de GET /console/drivers/:userId/driving-events (driving-insights.service.ts de fom-core).
const AHORA = new Date(2026, 9, 21, 12, 0).getTime()
const servidor = (o = {}) => ({
  id: 'e1', type: 'harsh_braking', occurredAt: new Date(2026, 9, 21, 9, 42).toISOString(),
  vehicleId: 'v1', vehicleCode: '01', lat: '10.3907', lng: '-71.4462',
  speedBeforeKph: '85.4', speedAfterKph: 30, magnitude: 9.5, source: 'derived_speed', policyVersion: 'driving-v1', ...o,
})
const ev = (o = {}) => comoEventoManejo(servidor(o))

test('el umbral del mapa es 120 km/h y hay tres tipos, cada uno con su color', () => {
  assert.equal(EXCESO_KMH, 120)
  assert.deepEqual(CLAVES_EVENTO, ['frenada', 'aceleracion', 'exceso'])
  assert.equal(new Set(TIPOS_EVENTO.map((t) => t.color)).size, 3)
})

test('el evento del servidor pasa a la forma del panel (números de texto incluidos)', () => {
  assert.deepEqual(ev(), {
    id: 'e1', tipo: 'frenada', hora: servidor().occurredAt, vehiculoId: 'v1', unidad: '01',
    lat: 10.3907, lng: -71.4462, antes: 85.4, despues: 30,
  })
  assert.equal(ev({ type: 'harsh_acceleration' }).tipo, 'aceleracion')
  assert.equal(ev({ type: 'speeding' }).tipo, 'exceso')
  assert.equal(ev({ type: 'harsh_turn' }).tipo, null)
  assert.equal(ev({ speedAfterKph: null }).despues, null)
})

test('un exceso solo va al mapa si pasa de 120 km/h; 120 justos no', () => {
  assert.equal(vaEnMapa(ev({ type: 'speeding', speedBeforeKph: 121, speedAfterKph: null })), true)
  assert.equal(vaEnMapa(ev({ type: 'speeding', speedBeforeKph: 120, speedAfterKph: null })), false)
  assert.equal(vaEnMapa(ev({ type: 'speeding', speedBeforeKph: 95, speedAfterKph: null })), false)
  assert.equal(vaEnMapa(ev({ type: 'speeding', speedBeforeKph: null, speedAfterKph: null })), false)
  // Frenadas y aceleraciones van siempre, aunque sean lentas.
  assert.equal(vaEnMapa(ev({ speedBeforeKph: 40, speedAfterKph: 10 })), true)
  // Sin posición o de un tipo que no se muestra, no.
  assert.equal(vaEnMapa(ev({ lat: null })), false)
  assert.equal(vaEnMapa(ev({ lat: 0, lng: 0 })), false)
  assert.equal(vaEnMapa(ev({ type: 'harsh_turn' })), false)
})

test('los eventos del mapa: del período, de la unidad y el más nuevo primero', () => {
  const dia = 86400000
  const lista = [
    ev({ id: 'viejo', occurredAt: new Date(AHORA - 10 * dia).toISOString() }),
    ev({ id: 'nuevo', occurredAt: new Date(AHORA - 1000).toISOString() }),
    ev({ id: 'medio', occurredAt: new Date(AHORA - 2 * dia).toISOString(), vehicleId: 'v2' }),
    ev({ id: 'lento', type: 'speeding', speedBeforeKph: 110, speedAfterKph: null }),
  ]
  assert.deepEqual(eventosParaMapa(lista, { dias: 7, ahora: AHORA }).map((e) => e.id), ['nuevo', 'medio'])
  assert.deepEqual(eventosParaMapa(lista, { dias: 28, ahora: AHORA }).map((e) => e.id), ['nuevo', 'medio', 'viejo'])
  assert.deepEqual(eventosParaMapa(lista, { vehiculoId: 'v1', desde: AHORA - 3 * dia, ahora: AHORA }).map((e) => e.id), ['nuevo'])
  assert.deepEqual(eventosParaMapa(null), [])
  assert.equal(excesosBajoUmbral(lista, { dias: 7, ahora: AHORA }), 1)
})

test('el servidor solo acepta 7, 30 o 90 días: 28 se pide como 30', () => {
  assert.equal(diasServidor(7), 7)
  assert.equal(diasServidor(28), 30)
  assert.equal(diasServidor(30), 30)
  assert.equal(diasServidor(200), 90)
})

test('conteos y filtro por tipo de la leyenda', () => {
  const lista = [ev({ id: 'a' }), ev({ id: 'b' }), ev({ id: 'c', type: 'speeding', speedBeforeKph: 134, speedAfterKph: null })]
  assert.deepEqual(contarPorTipo(lista), { frenada: 2, aceleracion: 0, exceso: 1 })
  assert.deepEqual(filtrarPorTipos(lista, new Set(['exceso'])).map((e) => e.id), ['c'])
  assert.deepEqual(filtrarPorTipos(lista, []), [])
  assert.equal(resumenEventos(contarPorTipo(lista)), '2 frenadas y 1 exceso')
  assert.equal(resumenEventos({ frenada: 1, aceleracion: 3, exceso: 2 }), '1 frenada, 3 aceleraciones y 2 excesos')
  assert.equal(resumenEventos({}), 'Sin eventos')
})

test('GeoJSON de la capa: un punto [lng, lat] por evento y el elegido encima', () => {
  const lista = [ev({ id: 'a' }), ev({ id: 'b', type: 'speeding', speedBeforeKph: 100, speedAfterKph: null }), ev({ id: 'c', type: 'harsh_acceleration' })]
  const g = geojsonEventos(lista, 'c')
  assert.equal(g.type, 'FeatureCollection')
  // El exceso de 100 km/h no entra.
  assert.deepEqual(g.features.map((x) => x.properties.id), ['a', 'c'])
  assert.deepEqual(g.features[0].geometry, { type: 'Point', coordinates: [-71.4462, 10.3907] })
  assert.deepEqual(g.features.map((x) => [x.properties.tipo, x.properties.activo]), [['frenada', false], ['aceleracion', true]])
  assert.ok(g.features[1].properties.orden > g.features[0].properties.orden)
})

test('el texto del globo: tipo, velocidades, fecha y hora, unidad', () => {
  assert.equal(textoEvento(ev({ speedBeforeKph: 85, speedAfterKph: 30 })), 'Frenada brusca · 85 → 30 km/h · 21 oct, 9:42 a. m. · Unidad 01')
  assert.equal(textoEvento(ev({ type: 'speeding', speedBeforeKph: 134.6, speedAfterKph: null, vehicleCode: 'Unidad 07' })),
    'Exceso de velocidad · 135 km/h · 21 oct, 9:42 a. m. · Unidad 07')
  assert.equal(velocidadesEvento(ev({ type: 'harsh_acceleration', speedBeforeKph: 12, speedAfterKph: 52 })), '12 → 52 km/h')
  assert.equal(velocidadesEvento(ev({ speedBeforeKph: null, speedAfterKph: null })), '')
  assert.equal(textoEvento(ev({ speedBeforeKph: null, speedAfterKph: null, vehicleCode: null })), 'Frenada brusca · 21 oct, 9:42 a. m.')
})
