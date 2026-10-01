import test from 'node:test'
import assert from 'node:assert/strict'
import { validarClave, MIN_CLAVE } from '../src/lib/clave.js'

test('mínimo de 5 caracteres, no 16', () => {
  assert.equal(MIN_CLAVE, 5)
  assert.equal(validarClave('Ab1!'), 'La contraseña debe tener al menos 5 caracteres.')
  assert.equal(validarClave('Ab1!x'), null)
})
test('exige mayúscula, número y símbolo', () => {
  assert.match(validarClave('ab1!x'), /mayúscula/)
  assert.match(validarClave('Abc!x'), /número/)
  assert.match(validarClave('Abc1x'), /símbolo/)
})
test('rechaza repeticiones, claves comunes y el propio correo', () => {
  assert.match(validarClave('Aaa1!x'), /tres veces/)
  assert.match(validarClave('Admin1!'), /común/)
  assert.match(validarClave('Marco1!x', 'marco@fom.app'), /correo/)
  assert.equal(validarClave('Rt7#k', 'marco@fom.app'), null)
})
test('no admite espacios en los extremos ni claves enormes', () => {
  assert.match(validarClave(' Ab1!x'), /espacios/)
  assert.match(validarClave('Ab1!' + 'x'.repeat(130)), /128/)
})
