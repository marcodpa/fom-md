import test from 'node:test'
import assert from 'node:assert/strict'
import { estaLeida, esDeHoy, agruparAvisos } from '../src/panel/modulos/alertas-presentacion.js'

test('lectura admite fecha de API y booleano de demostración', () => {
  assert.equal(estaLeida({ leidaEn: '2026-10-05T15:00:00Z' }), true)
  assert.equal(estaLeida({ leida: true }), true)
  assert.equal(estaLeida({ leidaEn: null }), false)
})
test('hoy respeta el día local y rechaza fechas faltantes o inválidas', () => {
  const ahora = new Date(2026, 9, 5, 12)
  assert.equal(esDeHoy(new Date(2026, 9, 5, 0).toISOString(), ahora), true)
  assert.equal(esDeHoy(new Date(2026, 9, 4, 23, 59).toISOString(), ahora), false)
  assert.equal(esDeHoy(null, ahora), false)
  assert.equal(esDeHoy('invalida', ahora), false)
})
test('agrupación conserva todos los avisos, ordena y no modifica el listado', () => {
  const ahora = new Date(2026, 9, 5, 12)
  const lista = [{ id: 'antiguo', creadaEn: new Date(2026, 9, 4, 15).toISOString() }, { id: 'sin-fecha' }, { id: 'hoy', creadaEn: new Date(2026, 9, 5, 10).toISOString() }]
  const grupos = agruparAvisos(lista, ahora)
  assert.deepEqual(grupos.map(g => [g.titulo, g.items.map(n => n.id)]), [['Hoy', ['hoy']], ['Anteriores', ['antiguo', 'sin-fecha']]])
  assert.equal(lista[0].id, 'antiguo')
  assert.deepEqual(agruparAvisos([], ahora), [])
})
