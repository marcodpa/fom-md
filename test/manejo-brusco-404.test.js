import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { comoEventoManejo, juntarDeVarios } from '../src/panel/datos/eventosManejo.js'

// ============================================================
// T-150: Manejo brusco de una unidad con varias personas asignadas. Un 404 de
// una persona que ya no es conductor activo no tumba la ficha («Ese recurso no
// existe»): cuenta como «sin eventos» para ella y sale una nota gris.
// ============================================================

const ev = (id, hace) => comoEventoManejo({
  id, type: 'harsh_braking', occurredAt: new Date(Date.UTC(2026, 9, 23, 12) - hace).toISOString(), vehicleId: 'v1', lat: 10.4, lng: -71.4,
})
// Así llegan los errores de api.js: con el estado HTTP pegado.
const fallo = (estado, mensaje = `El servidor respondió ${estado}.`) => Promise.reject(Object.assign(new Error(mensaje), { estado }))

test('todos responden bien: se juntan sus eventos, sin notas', async () => {
  const r = await juntarDeVarios([Promise.resolve([ev('a', 1000)]), Promise.resolve([ev('b', 2000)])])
  assert.deepEqual(r.map((e) => e.id), ['a', 'b'])
  assert.equal(r.descartados, 0)
  assert.equal(r.fallidos, 0)
})

test('uno da 404: se muestran los eventos de los demás y se anota para la nota gris', async () => {
  const r = await juntarDeVarios([Promise.resolve([ev('a', 1000)]), fallo(404, 'Ese recurso no existe.')])
  assert.deepEqual(r.map((e) => e.id), ['a'])
  assert.equal(r.descartados, 1)
  assert.equal(r.fallidos, 0)
})

test('todos dan 404: lista vacía y sin error', async () => {
  const r = await juntarDeVarios([fallo(404), fallo(404)])
  assert.equal(r.length, 0)
  assert.equal(r.descartados, 2)
  assert.equal(r.fallidos, 0)
})

test('uno da 500 y otro responde: se enseña lo que llegó', async () => {
  const r = await juntarDeVarios([fallo(500), Promise.resolve([ev('a', 1000), ev('b', 2000)])])
  assert.deepEqual(r.map((e) => e.id), ['a', 'b'])
  assert.equal(r.fallidos, 1)
  assert.equal(r.descartados, 0)
})

test('si fallan todos con 500 o sin red, sí es un error', async () => {
  await assert.rejects(juntarDeVarios([fallo(500, 'caído'), fallo(0, 'sin red')]), /caído/u)
})

test('la ficha junta con allSettled (juntarDeVarios) y pone la nota gris debajo', () => {
  const src = readFileSync(new URL('../src/panel/comp/ManejoBrusco.jsx', import.meta.url), 'utf8')
  assert.match(src, /return juntarDeVarios\(userIds\.map/u)
  assert.doesNotMatch(src, /Promise\.all\(userIds/u)
  assert.match(src, /Una persona asignada ya no es conductor activo; sus eventos no se muestran\./u)
  assert.match(src, /<CuerpoListo m=\{m\} enlace=\{enlace\} \/>\{nota\}/u, 'la nota va debajo de la lista')
})
