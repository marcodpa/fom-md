import assert from 'node:assert/strict'
import test from 'node:test'

import { areaDe, esAdminFom, esGestor, rolCanonico } from '../src/panel/roles.js'

test('solo admin_fom obtiene alcance global', () => {
  assert.equal(esAdminFom({ rol: 'admin_fom' }), true)
  for (const rol of ['owner', 'administrator', 'fleet_manager', 'operator', 'viewer']) {
    assert.equal(esAdminFom({ rol }), false, `${rol} no puede escalar a admin_fom`)
  }
})

test('los roles heredados coinciden con fom.canonical_membership_role', () => {
  assert.equal(rolCanonico('owner'), 'supervisor')
  assert.equal(rolCanonico('administrator'), 'supervisor')
  assert.equal(rolCanonico('fleet_manager'), 'supervisor')
  assert.equal(rolCanonico('operator'), 'operator')
  assert.equal(rolCanonico('viewer'), 'usuario')
})

test('solo administradores FOM y supervisores son gestores', () => {
  for (const rol of ['admin_fom', 'supervisor', 'owner', 'administrator']) {
    assert.equal(esGestor({ rol }), true, `${rol} debe gestionar su alcance`)
  }
  for (const rol of ['conductor', 'operator', 'usuario', 'viewer']) {
    assert.equal(esGestor({ rol }), false, `${rol} no gestiona directorios`)
  }
})

test('cada rol cae en su area, como en permissions.ts de la app', () => {
  // Un conductor con el panel entero delante ve la flota completa y a toda la
  // gente de la empresa. Esta es la reparticion que lo impide.
  assert.equal(areaDe({ rol: 'admin_fom' }), 'admin')
  assert.equal(areaDe({ rol: 'fleet_manager', empresaTipo: 'estandar' }), 'operativo')
  assert.equal(areaDe({ rol: 'supervisor', empresaTipo: 'estandar' }), 'operativo')
  assert.equal(areaDe({ rol: 'supervisor', empresaTipo: 'predefinida' }), 'gerencial')
  assert.equal(areaDe({ rol: 'supervisor', empresaTipo: 'personal' }), 'personal')
  assert.equal(areaDe({ rol: 'operator' }), 'operativo')
  assert.equal(areaDe({ rol: 'conductor' }), 'conductor')
  assert.equal(areaDe({ rol: 'usuario' }), 'personal')
  assert.equal(areaDe({ rol: 'viewer' }), 'personal')
  // Sin tipo de ente resuelto, un supervisor cae en el panel operativo, que
  // es el caso mas comun; nunca en gerencial ni personal por accidente.
  assert.equal(areaDe({ rol: 'supervisor' }), 'operativo')
  // Sin perfil, nada: la zona mas restringida.
  assert.equal(areaDe(null), 'personal')
})
