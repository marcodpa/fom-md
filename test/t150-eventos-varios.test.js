import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comoEventoManejo, juntarDeVarios } from '../src/panel/datos/eventosManejo.js'

// ============================================================
// T-150: los eventos de una unidad con varios conductores. Quien ya no es
// conductor activo (404 «Driver not found») no tumba la ficha: cuenta como
// «sin eventos». Los demás errores solo fallan si no llegó nada de nadie.
// ============================================================

const ev = (id, hace) => comoEventoManejo({
  id, type: 'harsh_braking', occurredAt: new Date(Date.UTC(2026, 9, 23, 12) - hace).toISOString(), vehicleId: 'v1', lat: 10.4, lng: -71.4,
})
const conEstado = (estado, mensaje = 'falló') => Object.assign(new Error(mensaje), { estado })

test('un 404 cuenta como sin eventos y se anota en `descartados`', async () => {
  const r = await juntarDeVarios([Promise.resolve([ev('a', 1000)]), Promise.reject(conEstado(404, 'Driver not found'))])
  assert.deepEqual(r.map((e) => e.id), ['a'])
  assert.equal(r.descartados, 1)
  assert.equal(r.fallidos, 0)
})

test('si todos dan 404 no es un error: lista vacía con su nota', async () => {
  const r = await juntarDeVarios([Promise.reject(conEstado(404)), Promise.reject(conEstado(404))])
  assert.equal(r.length, 0)
  assert.equal(r.descartados, 2)
})

test('otro error con algo leído: se enseña lo leído y se cuenta en `fallidos`', async () => {
  const r = await juntarDeVarios([Promise.resolve([ev('a', 1000), ev('b', 2000)]), Promise.reject(conEstado(500))])
  assert.equal(r.length, 2)
  assert.equal(r.fallidos, 1)
  assert.equal(r.descartados, 0)
})

test('si fallan todos (sin 404) sale el error, como antes', async () => {
  await assert.rejects(juntarDeVarios([Promise.reject(conEstado(500, 'caído')), Promise.reject(conEstado(503))]), /caído/u)
})

test('sin fallos junta y quita repetidos, de lo más nuevo a lo más viejo', async () => {
  const r = await juntarDeVarios([Promise.resolve([ev('a', 3000), ev('b', 1000)]), Promise.resolve([ev('b', 1000), ev('c', 2000)])])
  assert.deepEqual(r.map((e) => e.id), ['b', 'c', 'a'])
  assert.equal(r.descartados, 0)
  assert.equal(r.fallidos, 0)
})
