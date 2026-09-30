import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarCodigoPlan, validarCodigoPlan } from '../src/panel/datos/codigoPlan.js'
test('plan: convierte espacios, acentos y mayúsculas al contrato del servidor', () => {
  assert.equal(validarCodigoPlan(normalizarCodigoPlan('  Revisión de Aceite 5.000 KM  ')), 'revision-de-aceite-5.000-km')
  assert.equal(validarCodigoPlan(normalizarCodigoPlan('motor_v2.1')), 'motor_v2.1')
})
test('plan: rechaza códigos vacíos, demasiado cortos o largos sin truncarlos', () => {
  for (const codigo of ['', 'a', '!!!', 'a'.repeat(81)]) assert.throws(() => validarCodigoPlan(normalizarCodigoPlan(codigo)))
  assert.equal(validarCodigoPlan('a'.repeat(80)).length, 80)
})
