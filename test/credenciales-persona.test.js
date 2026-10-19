import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cuerpoCredencial, puedeEditarCredenciales, credencialesVigentes } from '../src/panel/datos/credencialesPersona.js'
import { aRutaPorEnte } from '../src/panel/datos/rutaPorEnte.js'

const conductor = { id: 'persona', empresaId: 'empresa', rol: 'conductor', estado: 'active' }
const supervisor = { id: 'supervisor', empresaId: 'empresa', rol: 'supervisor' }
const licencia = { tipo: 'driver_license', numero: 'V-1234', categoria: '5', emitidaEn: '2026-01-01', venceEn: '2027-01-01', motivo: 'renovacion' }
test('permiso limita identidad, jerarquía, estado y empresa', () => {
  assert.equal(puedeEditarCredenciales(supervisor, conductor), true)
  for (const p of [{ ...conductor, id: supervisor.id }, { ...conductor, rol: 'supervisor' }, { ...conductor, rol: 'admin_fom' }, { ...conductor, empresaId: 'otra' }, { ...conductor, administrable: false }, { ...conductor, estado: 'suspended' }]) assert.equal(puedeEditarCredenciales(supervisor, p), false)
  assert.equal(puedeEditarCredenciales({ ...supervisor, rol: 'admin_fom' }, { ...conductor, rol: 'supervisor' }), true)
  assert.equal(puedeEditarCredenciales({ ...supervisor, rol: 'conductor' }, conductor), false)
  assert.equal(puedeEditarCredenciales({ rol: 'admin_fom' }, conductor), false)
})
test('reemplazo exige número/categoría de licencia y conserva fechas exactas', () => {
  assert.deepEqual(cuerpoCredencial(licencia), { kind: 'driver_license', number: 'v-1234', category: '5', issuedAt: '2026-01-01', expiresAt: '2027-01-01', reason: 'renovacion' })
  assert.throws(() => cuerpoCredencial({ ...licencia, numero: '' }))
  assert.throws(() => cuerpoCredencial({ ...licencia, categoria: '' }))
  assert.throws(() => cuerpoCredencial({ ...licencia, venceEn: '2027-02-30' }))
  assert.throws(() => cuerpoCredencial({ ...licencia, emitidaEn: '2028-01-01' }))
  assert.throws(() => cuerpoCredencial({ ...licencia, motivo: 'motivo con datos' }))
})
test('aptitud médica no manda grado de una licencia ni fechas vacías', () => {
  const c = cuerpoCredencial({ ...licencia, tipo: 'medical_certificate', numero: '', emitidaEn: '' })
  assert.deepEqual(c, { kind: 'medical_certificate', expiresAt: '2027-01-01', reason: 'renovacion' })
})
test('vigentes excluye versiones reemplazadas y tipos ajenos', () => {
  const lista = [{ id: 'a', kind: 'driver_license', current: true }, { id: 'b', kind: 'driver_license', current: false }, { id: 'c', kind: 'medical_certificate', supersededAt: '2026-01-01' }, { id: 'd', kind: 'password' }]
  assert.deepEqual(credencialesVigentes(lista).map(c => c.id), ['a'])
  assert.equal(lista.length, 4)
  assert.deepEqual(credencialesVigentes(null), [])
})
test('credenciales solo reescribe PATCH al ente elegido', () => {
  const ruta = '/api/v1/console/users/persona/credentials'
  assert.equal(aRutaPorEnte(ruta, 'PATCH', 'empresa'), '/api/v1/console/tenants/empresa/users/persona/credentials')
  assert.equal(aRutaPorEnte(ruta, 'GET', 'empresa'), null)
  assert.equal(aRutaPorEnte(ruta, 'PATCH', null), ruta)
})
