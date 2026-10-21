import { test } from 'node:test'
import assert from 'node:assert/strict'
import { instante, masNuevoPrimero, porMasNuevo } from '../src/panel/datos/orden.js'

// T-93: toda lista con fecha u hora va de lo más nuevo a lo más viejo.
const hoyA = (h, m) => new Date(2026, 9, 21, h, m).toISOString()

test('«Hoy, en orden»: la 1:05 p. m. sale antes que las 9:30 y 9:32 de la mañana', () => {
  const eventos = [
    { id: 'a', en: hoyA(9, 30) },
    { id: 'b', en: hoyA(9, 32) },
    { id: 'c', en: hoyA(9, 32) },
    { id: 'd', en: hoyA(13, 5) },
  ]
  assert.deepEqual(masNuevoPrimero(eventos, 'en').map((e) => e.id), ['d', 'b', 'c', 'a'])
})

test('no toca la lista original y acepta null o undefined', () => {
  const lista = [{ creadaEn: hoyA(8, 0) }, { creadaEn: hoyA(9, 0) }]
  const copia = masNuevoPrimero(lista)
  assert.notEqual(copia, lista)
  assert.equal(lista[0].creadaEn, hoyA(8, 0))
  assert.deepEqual(masNuevoPrimero(null), [])
  assert.deepEqual(masNuevoPrimero(undefined), [])
})

test('lo que no tiene fecha (o la tiene rota) va al final, en el orden en que llegó', () => {
  const lista = [{ id: 1 }, { id: 2, creadaEn: hoyA(7, 0) }, { id: 3, creadaEn: 'no es fecha' }, { id: 4, creadaEn: hoyA(10, 0) }]
  assert.deepEqual(masNuevoPrimero(lista).map((x) => x.id), [4, 2, 1, 3])
})

test('los empates conservan el orden de llegada', () => {
  const lista = ['x', 'y', 'z'].map((id) => ({ id, creadaEn: hoyA(9, 0) }))
  assert.deepEqual(masNuevoPrimero(lista).map((x) => x.id), ['x', 'y', 'z'])
})

test('varios campos: usa el primero que tenga valor (envío y, si falta, el día)', () => {
  const lista = [
    { id: 'solo-dia', fecha: '2026-10-20' },
    { id: 'enviada', creadaEn: hoyA(6, 0), fecha: '2026-10-19' },
  ]
  assert.deepEqual(masNuevoPrimero(lista, ['creadaEn', 'fecha']).map((x) => x.id), ['enviada', 'solo-dia'])
})

test('con una función: el período de una cuota («2026-08») como fecha', () => {
  const cuotas = [{ id: 'jul', periodo: '2026-07' }, { id: 'ago', periodo: '2026-08' }, { id: 'jun', periodo: '2026-06' }]
  const lista = masNuevoPrimero(cuotas, (p) => `${p.periodo}-01`)
  assert.deepEqual(lista.map((x) => x.id), ['ago', 'jul', 'jun'])
})

test('dentro de grupos por gravedad: primero el grupo y, dentro, lo más nuevo', () => {
  const nuevo = porMasNuevo('creadaEn')
  const lista = [
    { id: 'leve-vieja', grave: false, creadaEn: hoyA(8, 0) },
    { id: 'grave-vieja', grave: true, creadaEn: hoyA(7, 0) },
    { id: 'leve-nueva', grave: false, creadaEn: hoyA(12, 0) },
    { id: 'grave-nueva', grave: true, creadaEn: hoyA(11, 0) },
  ].sort((a, b) => Number(b.grave) - Number(a.grave) || nuevo(a, b))
  assert.deepEqual(lista.map((x) => x.id), ['grave-nueva', 'grave-vieja', 'leve-nueva', 'leve-vieja'])
})

test('un día suelto se lee en hora local, no en UTC', () => {
  assert.equal(instante('2026-10-21'), new Date(2026, 9, 21).getTime())
  assert.equal(instante(null), null)
  assert.equal(instante(''), null)
})
