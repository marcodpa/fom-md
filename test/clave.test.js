import test from 'node:test'
import assert from 'node:assert/strict'
import { validarClave, MIN_CLAVE } from '../src/lib/clave.js'

test('mínimo de 16 caracteres, el de fom-core', () => {
  assert.equal(MIN_CLAVE, 16)
  assert.equal(validarClave('Ab1!xyzwvut'), 'La contraseña debe tener al menos 16 caracteres.')
  assert.equal(validarClave('Ab1!xyzwvutsrqpo'), null)
})
test('exige mayúscula, número y símbolo', () => {
  assert.match(validarClave('ab1!xyzwvutsrqpo'), /mayúscula/)
  assert.match(validarClave('Abc!xyzwvutsrqpo'), /número/)
  assert.match(validarClave('Abc1xyzwvutsrqpo'), /símbolo/)
})
test('rechaza repeticiones y el propio correo', () => {
  assert.match(validarClave('Aaa1!xyzwvutsrqp'), /tres veces/)
  assert.match(validarClave('Marco1!xyzwvutsr', 'marco@fom.app'), /correo/)
  assert.equal(validarClave('Rt7#k-Pq2r-X9tz', 'marco@fom.app'), 'La contraseña debe tener al menos 16 caracteres.')
  assert.equal(validarClave('Rt7#k-Pq2r-X9tzW', 'marco@fom.app'), null)
})
test('una frase larga con una palabra común sí es válida', () => {
  assert.equal(validarClave('Clave-nueva-segura-2026'), null)
})
test('no admite espacios en los extremos ni claves enormes', () => {
  assert.match(validarClave(' Ab1!xyzwvutsrqpo'), /espacios/)
  assert.match(validarClave('Ab1!' + 'x'.repeat(130)), /128/)
})
