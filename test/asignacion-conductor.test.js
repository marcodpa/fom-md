import test from 'node:test'
import assert from 'node:assert/strict'
import { miAsignacion, unidadDeAsignacion } from '../src/panel/datos/asignacion-conductor.js'

test('la identidad del conductor manda y nunca cae al nombre de otra persona', () => {
  const asignaciones = [{ id: 'otro', nombre: 'Juan', vehiculoId: 'v2' }, { id: 'yo', nombre: 'Juan', vehiculoId: 'v1' }]
  assert.equal(miAsignacion({ userId: 'yo', nombre: 'Juan' }, asignaciones).vehiculoId, 'v1')
  assert.equal(miAsignacion({ userId: 'ausente', nombre: 'Juan' }, asignaciones), null)
  assert.equal(miAsignacion({ nombre: 'Juan' }, asignaciones), null)
})

test('sin id solo se acepta un nombre inequívoco y no una identidad vacía', () => {
  const asignaciones = [{ id: 'yo', nombre: ' Juan ', vehiculoId: 'v1' }]
  assert.equal(miAsignacion({ nombre: 'juan' }, asignaciones).vehiculoId, 'v1')
  assert.equal(miAsignacion({}, asignaciones), null)
})

test('el mapa no muestra la ficha antigua al cambiar o retirar la asignación', () => {
  const unidad = { id: 'v1', lat: 10, lng: -71 }
  assert.equal(unidadDeAsignacion({ vehiculoId: 'v2' }, unidad), null)
  assert.equal(unidadDeAsignacion(null, unidad), null)
  assert.equal(unidadDeAsignacion({ vehiculoId: 'v1' }, unidad).id, 'v1')
})

test('sin coordenadas en la ficha usa la última posición de esa misma unidad', () => {
  const unidad = { id: 'v1', recorrido: [{ lat: 10, lng: -71 }, { lat: 11, lng: -72 }] }
  assert.deepEqual([unidadDeAsignacion({ vehiculoId: 'v1' }, unidad).lat, unidadDeAsignacion({ vehiculoId: 'v1' }, unidad).lng], [11, -72])
})
