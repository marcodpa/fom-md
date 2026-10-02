import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aRutaPorEnte } from '../src/panel/datos/rutaPorEnte.js'

const ENTE = '10000000-0000-4000-8000-000000000002'
const VEH = '20000000-0000-4000-8000-000000000003'
const C = '/api/v1/console'

test('sin empresa elegida las rutas no cambian', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles?limit=200`, 'GET', null), `${C}/vehicles?limit=200`)
})

test('la flota y la gente de otra empresa llevan la empresa en la ruta, con su consulta', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles?limit=200&offset=0`, 'GET', ENTE), `${C}/tenants/${ENTE}/vehicles?limit=200&offset=0`)
  assert.equal(aRutaPorEnte(`${C}/directory?limit=50`, 'GET', ENTE), `${C}/tenants/${ENTE}/directory?limit=50`)
  assert.equal(aRutaPorEnte(`${C}/vehicles/${VEH}/daily-metrics?from=2026-10-01`, 'GET', ENTE), `${C}/tenants/${ENTE}/vehicles/${VEH}/daily-metrics?from=2026-10-01`)
})

test('crear y editar usuarios de otra empresa van por la ruta explícita', () => {
  assert.equal(aRutaPorEnte(`${C}/users`, 'POST', ENTE), `${C}/tenants/${ENTE}/users`)
  assert.equal(aRutaPorEnte(`${C}/users/${VEH}`, 'PATCH', ENTE), `${C}/tenants/${ENTE}/users/${VEH}`)
})

test('lo que aún no tiene ruta por empresa se rechaza en vez de leer la empresa propia', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles/${VEH}`, 'GET', ENTE), null)
  assert.equal(aRutaPorEnte(`${C}/vehicles/${VEH}/positions?limit=300`, 'GET', ENTE), null)
  assert.equal(aRutaPorEnte(`${C}/work-orders`, 'POST', ENTE), null)
  assert.equal(aRutaPorEnte(`${C}/alert-rules`, 'GET', ENTE), null)
  // Un POST a /vehicles no es la lectura de la flota: crearía la unidad en la empresa propia.
  assert.equal(aRutaPorEnte(`${C}/vehicles`, 'POST', ENTE), null)
})

test('lo global del administrador no se toca', () => {
  for (const r of ['/auth/session', `/tenants/${ENTE}/company-context`, '/tenants?limit=50', '/platform/users', '/audit?limit=20', '/gps-devices/unpaired']) {
    assert.equal(aRutaPorEnte(`${C}${r}`, 'GET', ENTE), `${C}${r}`)
  }
})

test('lo que no es de la consola no se reescribe', () => {
  assert.equal(aRutaPorEnte('/health', 'GET', ENTE), '/health')
})
