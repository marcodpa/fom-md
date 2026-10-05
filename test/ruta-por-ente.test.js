import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aRutaPorEnte } from '../src/panel/datos/rutaPorEnte.js'

const ENTE = '10000000-0000-4000-8000-000000000002'
const V = '20000000-0000-4000-8000-000000000003'
const C = '/api/v1/console'
const por = (resto) => `${C}/tenants/${ENTE}${resto}`

test('sin empresa elegida las rutas no cambian', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles?limit=200`, 'GET', null), `${C}/vehicles?limit=200`)
})

test('lecturas operativas: llevan la empresa en la ruta, con su consulta', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles?limit=200&offset=0`, 'GET', ENTE), por('/vehicles?limit=200&offset=0'))
  assert.equal(aRutaPorEnte(`${C}/summary`, 'GET', ENTE), por('/summary'))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}`, 'GET', ENTE), por(`/vehicles/${V}`))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}/position/latest`, 'GET', ENTE), por(`/vehicles/${V}/position/latest`))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}/positions?limit=1000&from=2026-10-01T00%3A00%3A00Z`, 'GET', ENTE), por(`/vehicles/${V}/positions?limit=1000&from=2026-10-01T00%3A00%3A00Z`))
  assert.equal(aRutaPorEnte(`${C}/areas?limit=200`, 'GET', ENTE), por('/areas?limit=200'))
  assert.equal(aRutaPorEnte(`${C}/drivers?limit=200&offset=0`, 'GET', ENTE), por('/drivers?limit=200&offset=0'))
  assert.equal(aRutaPorEnte(`${C}/alert-events?status=open`, 'GET', ENTE), por('/alert-events?status=open'))
  assert.equal(aRutaPorEnte(`${C}/work-orders?limit=100`, 'GET', ENTE), por('/work-orders?limit=100'))
  assert.equal(aRutaPorEnte(`${C}/inspections`, 'GET', ENTE), por('/inspections'))
  assert.equal(aRutaPorEnte(`${C}/maintenance/plans`, 'GET', ENTE), por('/maintenance/plans'))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}/odometer`, 'GET', ENTE), por(`/vehicles/${V}/odometer`))
})

test('escrituras: crear y editar unidades, áreas, órdenes y gente van por la ruta de la empresa', () => {
  assert.equal(aRutaPorEnte(`${C}/vehicles`, 'POST', ENTE), por('/vehicles'))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}`, 'PATCH', ENTE), por(`/vehicles/${V}`))
  assert.equal(aRutaPorEnte(`${C}/areas/${V}`, 'PATCH', ENTE), por(`/areas/${V}`))
  assert.equal(aRutaPorEnte(`${C}/work-orders`, 'POST', ENTE), por('/work-orders'))
  assert.equal(aRutaPorEnte(`${C}/work-orders/${V}/assignee`, 'PUT', ENTE), por(`/work-orders/${V}/assignee`))
  assert.equal(aRutaPorEnte(`${C}/users`, 'POST', ENTE), por('/users'))
  assert.equal(aRutaPorEnte(`${C}/users/${V}`, 'PATCH', ENTE), por(`/users/${V}`))
  assert.equal(aRutaPorEnte(`${C}/users/${V}/profile`, 'PATCH', ENTE), por(`/users/${V}/profile`))
  assert.equal(aRutaPorEnte(`${C}/vehicles/${V}/drivers`, 'POST', ENTE), por(`/vehicles/${V}/drivers`))
  assert.equal(aRutaPorEnte(`${C}/maintenance/plans/${V}/vehicles/${V}`, 'DELETE', ENTE), por(`/maintenance/plans/${V}/vehicles/${V}`))
  assert.equal(aRutaPorEnte(`${C}/gps-devices`, 'POST', ENTE), por('/gps-devices'))
})

test('subidas y descargas de archivos de una empresa', () => {
  assert.equal(aRutaPorEnte(`${C}/documents/${V}/uploads`, 'POST', ENTE), por(`/documents/${V}/uploads`))
  assert.equal(aRutaPorEnte(`${C}/uploads/${V}/complete`, 'POST', ENTE), por(`/uploads/${V}/complete`))
})

test('lo que no tiene ruta por empresa se rechaza en vez de leer la empresa propia', () => {
  // Marcar leído / descartar avisos es de cada persona.
  assert.equal(aRutaPorEnte(`${C}/notifications/${V}/read`, 'PATCH', ENTE), null)
  assert.equal(aRutaPorEnte(`${C}/notifications/read-all`, 'POST', ENTE), null)
  assert.equal(aRutaPorEnte(`${C}/inexistente`, 'GET', ENTE), null)
  // Un método que no existe en ese recurso tampoco pasa.
  assert.equal(aRutaPorEnte(`${C}/summary`, 'DELETE', ENTE), null)
})

test('lo global del administrador no se toca', () => {
  for (const r of ['/auth/session', `/tenants/${ENTE}/company-context`, '/tenants?limit=50', '/platform/users', '/audit?limit=20', '/gps-devices/unpaired', '/gps-devices?limit=50']) {
    assert.equal(aRutaPorEnte(`${C}${r}`, 'GET', ENTE), `${C}${r}`)
  }
})

test('lo que no es de la consola no se reescribe', () => {
  assert.equal(aRutaPorEnte('/health', 'GET', ENTE), '/health')
})
