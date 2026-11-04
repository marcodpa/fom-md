// Marca de empresa (logo + nombre) de la cabecera y de Centro de control.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { marcaDe, NOTA_GESTION } from '../src/panel/datos/marcaEmpresa.js'

const admin = { rol: 'admin_fom', empresa: 'FOM Operations', empresaId: 'e0' }

test('una persona de empresa ve su empresa con iniciales para el monograma', () => {
  const m = marcaDe({ rol: 'supervisor', empresa: 'Transporte Lago Sur, C.A.', empresaId: 'e1' })
  assert.deepEqual([m.nombre, m.empresaId, m.esFom, m.nota, m.iniciales], ['Transporte Lago Sur, C.A.', 'e1', false, '', 'TL'])
})

test('el administrador que entró a otra empresa ve esa empresa y la aclaración', () => {
  const m = marcaDe({ ...admin, empresaId: 'e2', empresa: 'Aguas del Sur', empresaGestion: { id: 'e2', nombre: 'Aguas del Sur' } }, { global: true })
  assert.equal(m.nombre, 'Aguas del Sur')
  assert.equal(m.empresaId, 'e2')
  assert.equal(m.esFom, false)
  assert.equal(m.nota, NOTA_GESTION)
})

test('el administrador en pantallas globales ve la marca de FOM', () => {
  const m = marcaDe(admin, { global: true })
  assert.equal(m.esFom, true)
  assert.equal(m.empresaId, null)
  assert.equal(marcaDe(admin).esFom, false)
})

test('sin sesión no inventa un nombre de empresa', () => {
  assert.equal(marcaDe(null).nombre, 'FOM · Administración')
})
