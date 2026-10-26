import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionVencida, ordenSinResolver, pendientesDeMiUnidad } from '../src/panel/datos/mantenimientoPendiente.js'

const AHORA = Date.parse('2026-10-26T12:00:00Z')

test('órdenes: cuentan abiertas y en revisión (también asignada o en ejecución), no cerradas ni canceladas', () => {
  for (const estado of ['abierta', 'en_revision', 'asignada', 'aprobada', 'en_ejecucion', 'pausada', 'en_calidad']) {
    assert.equal(ordenSinResolver({ estado }), true, estado)
  }
  for (const estado of ['cerrada', 'cancelada']) assert.equal(ordenSinResolver({ estado }), false, estado)
})

test('acción programada: solo la vencida por km o por fecha, abierta y sin orden', () => {
  const base = { estado: 'pending', odtId: null, venceKm: 74000, venceEn: null }
  assert.equal(accionVencida(base, { odometroKm: 74107, ahora: AHORA }), true)
  assert.equal(accionVencida({ ...base, venceKm: 74500 }, { odometroKm: 74107, ahora: AHORA }), false, 'próxima')
  assert.equal(accionVencida({ ...base, venceKm: null, venceEn: '2026-10-20T12:00:00Z' }, { ahora: AHORA }), true)
  assert.equal(accionVencida({ ...base, estado: 'completed' }, { odometroKm: 74107, ahora: AHORA }), false)
  assert.equal(accionVencida({ ...base, odtId: 'o1' }, { odometroKm: 74107, ahora: AHORA }), false, 'la cuenta su orden')
  assert.equal(accionVencida({ ...base, estado: 'in_progress' }, { odometroKm: 74107, ahora: AHORA }), true)
  assert.equal(accionVencida(base, { odometroKm: null, ahora: AHORA }), false, 'sin odómetro no se sabe')
})

test('el total: órdenes sin resolver + programado vencido; sin órdenes leídas, null', () => {
  const odts = [{ estado: 'abierta' }, { estado: 'asignada' }, { estado: 'cerrada' }]
  const acciones = [
    { estado: 'pending', odtId: null, venceKm: 74000 },
    { estado: 'pending', odtId: null, venceKm: 74527 },
  ]
  assert.equal(pendientesDeMiUnidad({ odts, acciones, odometroKm: 74107, ahora: AHORA }), 3)
  assert.equal(pendientesDeMiUnidad({ odts, acciones: null, odometroKm: 74107, ahora: AHORA }), 2)
  assert.equal(pendientesDeMiUnidad({ odts: null, acciones }), null)
})
