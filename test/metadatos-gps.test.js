import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cambiosGps } from '../src/panel/datos/metadatosGps.js'

test('GPS no borra campos que no cambiaron ni envía propiedades ajenas', () => {
  assert.deepEqual(cambiosGps({ carrier: 'Movistar', transport: 'tcp', ajeno: 'x' }, { carrier: 'Movistar', transport: 'tcp' }), {})
  assert.deepEqual(cambiosGps({ carrier: 'Digitel' }, { carrier: 'Movistar', transport: 'tcp', simStatus: 'active', apn: 'internet' }), { carrier: 'Digitel' })
})
test('GPS limpia texto explícitamente y valida ICCID y enumeraciones', () => {
  assert.deepEqual(cambiosGps({ carrier: '' }, { carrier: 'Movistar' }), { carrier: null })
  assert.throws(() => cambiosGps({ iccid: '123' }))
  assert.throws(() => cambiosGps({ transport: 'http' }))
  assert.throws(() => cambiosGps({ simStatus: 'verified' }))
  assert.throws(() => cambiosGps({ apn: 'a'.repeat(121) }))
  assert.deepEqual(cambiosGps({ iccid: '123456789012345678', simStatus: 'active', transport: 'udp' }), { iccid: '123456789012345678', simStatus: 'active', transport: 'udp' })
})
