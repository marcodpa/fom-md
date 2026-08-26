import assert from 'node:assert/strict'
import test from 'node:test'

import { esAdminFom, esGestor, rolCanonico } from '../src/panel/roles.js'

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
