import test from 'node:test'
import assert from 'node:assert/strict'
import { SIN_FECHA, filtrarPorFecha, hayFiltroFecha, rangoDeFecha, textoFiltroFecha } from '../src/panel/datos/filtroFecha.js'
import { masNuevoPrimero } from '../src/panel/datos/orden.js'

// Mantenimiento: filtrar las órdenes por el día en que se reportaron (Hoy, 7 días, 30 días, Todo o un rango).
const ahora = new Date(2026, 9, 23, 15, 30).getTime()
const dia = (d, h = 10) => new Date(2026, 9, d, h).toISOString()
const ODTS = [
  { id: 'hoy-temprano', creadaEn: dia(23, 0) },
  { id: 'ayer', creadaEn: dia(22, 23) },
  { id: 'hace-6', creadaEn: dia(17, 0) },
  { id: 'hace-7', creadaEn: dia(16, 23) },
  { id: 'hace-29', creadaEn: new Date(2026, 8, 24, 8).toISOString() },
  { id: 'hace-31', creadaEn: new Date(2026, 8, 22, 8).toISOString() },
  { id: 'sin-fecha', creadaEn: null },
]
const ids = (l) => l.map((o) => o.id)

test('sin filtro pasan todas, incluso las que no traen fecha', () => {
  assert.deepEqual(ids(filtrarPorFecha(ODTS, SIN_FECHA, { ahora })), ids(ODTS))
  assert.equal(hayFiltroFecha(SIN_FECHA), false)
  assert.equal(textoFiltroFecha(SIN_FECHA), '')
})

test('los atajos cuentan días enteros en hora local', () => {
  assert.deepEqual(ids(filtrarPorFecha(ODTS, { atajo: 'hoy' }, { ahora })), ['hoy-temprano'])
  // 7 días = hoy y los 6 anteriores, desde las 00:00.
  assert.deepEqual(ids(filtrarPorFecha(ODTS, { atajo: '7d' }, { ahora })), ['hoy-temprano', 'ayer', 'hace-6'])
  assert.deepEqual(ids(filtrarPorFecha(ODTS, { atajo: '30d' }, { ahora })), ['hoy-temprano', 'ayer', 'hace-6', 'hace-7', 'hace-29'])
  assert.equal(+rangoDeFecha({ atajo: '7d' }, ahora).desde, +new Date(2026, 9, 17))
  assert.equal(textoFiltroFecha({ atajo: '30d' }), '30 días')
})

test('el rango incluye el día «hasta» entero y se da la vuelta si viene al revés', () => {
  const rango = { atajo: 'rango', desde: '2026-10-16', hasta: '2026-10-22' }
  assert.deepEqual(ids(filtrarPorFecha(ODTS, rango, { ahora })), ['ayer', 'hace-6', 'hace-7'])
  const alReves = { atajo: 'rango', desde: '2026-10-22', hasta: '2026-10-16' }
  assert.deepEqual(ids(filtrarPorFecha(ODTS, alReves, { ahora })), ['ayer', 'hace-6', 'hace-7'])
  assert.equal(textoFiltroFecha(rango), '16 oct – 22 oct')
  assert.equal(textoFiltroFecha(alReves), '16 oct – 22 oct')
})

test('un rango con un solo lado deja abierto el otro; vacío no filtra', () => {
  assert.deepEqual(ids(filtrarPorFecha(ODTS, { atajo: 'rango', desde: '2026-10-22', hasta: '' }, { ahora })), ['hoy-temprano', 'ayer'])
  assert.deepEqual(ids(filtrarPorFecha(ODTS, { atajo: 'rango', desde: '', hasta: '2026-09-22' }, { ahora })), ['hace-31'])
  assert.equal(textoFiltroFecha({ atajo: 'rango', desde: '2026-10-22', hasta: '' }), 'Desde 22 oct')
  assert.equal(hayFiltroFecha({ atajo: 'rango', desde: '', hasta: '' }), false)
  assert.equal(hayFiltroFecha({ atajo: 'rango', desde: 'mañana', hasta: '' }), false)
})

test('filtrar no cambia el orden: sigue de la más nueva a la más vieja', () => {
  const desordenadas = [ODTS[3], ODTS[0], ODTS[5], ODTS[1]]
  const lista = filtrarPorFecha(masNuevoPrimero(desordenadas, 'creadaEn'), { atajo: '30d' }, { ahora })
  assert.deepEqual(ids(lista), ['hoy-temprano', 'ayer', 'hace-7'])
})
