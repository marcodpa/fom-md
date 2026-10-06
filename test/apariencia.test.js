import test from 'node:test'
import assert from 'node:assert/strict'
import { crearPreferenciasApariencia, cuentaApariencia, claveApariencia } from '../src/panel/apariencia-store.js'

function entorno() {
  const datos = new Map()
  const storage = { getItem: k => datos.get(k), setItem: (k, v) => datos.set(k, v) }
  let alStorage
  const store = crearPreferenciasApariencia(() => storage, { addEventListener: (_, fn) => { alStorage = fn } })
  return { store, datos, storage, evento: e => alStorage(e) }
}
test('la apariencia se guarda por identidad; cambiar de empresa no cambia la preferencia', () => {
  const e = entorno()
  const admin = { userId: 'admin-1', empresaId: null }
  const cuenta = cuentaApariencia(admin)
  assert.equal(e.store.cambiar(cuenta, 'glass'), true)
  assert.equal(e.store.leer(cuentaApariencia({ ...admin, empresaId: 'otra' })), 'glass')
  assert.equal(e.store.leer('supervisor-2'), 'azul')
  const recarga = crearPreferenciasApariencia(() => e.storage)
  assert.equal(recarga.leer(cuenta), 'glass')
  assert.equal(recarga.leer('supervisor-2'), 'azul')
})
test('storage bloqueado aplica el cambio en memoria sin fingir que se guardó', () => {
  const store = crearPreferenciasApariencia(() => { throw new Error('blocked') })
  assert.equal(store.leer('a'), 'azul')
  let avisos = 0
  store.suscribir(() => avisos++)
  assert.equal(store.cambiar('a', 'glass'), false)
  assert.equal(store.leer('a'), 'glass')
  assert.equal(store.leer('b'), 'azul')
  assert.equal(avisos, 1)
})
test('datos inválidos y sesiones sin identidad no escriben; otra pestaña actualiza la elección', () => {
  const e = entorno()
  e.datos.set(claveApariencia('a'), 'inventado')
  assert.equal(e.store.leer('a'), 'azul')
  assert.equal(e.store.cambiar('', 'glass'), false)
  assert.equal(e.store.cambiar('a', 'inventado'), false)
  e.store.cambiar('a', 'glass')
  e.datos.set(claveApariencia('a'), 'azul')
  e.evento({ key: claveApariencia('a') })
  assert.equal(e.store.leer('a'), 'azul')
})
