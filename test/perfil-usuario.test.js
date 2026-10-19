import assert from 'node:assert/strict'
import test from 'node:test'
import { cambiosDatosUsuario, coleccionDePersona, indiceDePersona, registrosDePersona } from '../src/panel/datos/perfilUsuario.js'

test('el expediente nunca atribuye registros por un nombre repetido', () => {
  const filas = [
    { conductorId: 'otro', conductorNombre: 'Carlos Mendoza' },
    { conductorId: 'propio', conductorNombre: 'Carlos Mendoza' },
    { conductorNombre: 'Carlos Mendoza' },
  ]
  assert.deepEqual(registrosDePersona(filas, 'propio', ['conductorId']), [filas[1]])
  const coleccion = coleccionDePersona({ status: 'fulfilled', value: filas }, 'propio', ['conductorId'])
  assert.equal(coleccion.disponible, false)
  assert.deepEqual(coleccion.registros, [filas[1]])
})

test('los documentos pertenecen al identificador del titular, no al vehículo o nombre', () => {
  const propios = { personaId: 'propio', titularId: 'propio', ambito: 'persona' }
  const ajenos = { personaId: 'otro', titularId: 'otro', titular: 'Mismo nombre' }
  assert.deepEqual(registrosDePersona([propios, ajenos], 'propio', ['personaId', 'titularId']), [propios])
})

test('una consulta fallida no se presenta como un historial vacío confirmado', () => {
  const fallida = coleccionDePersona({ status: 'rejected', reason: new Error('Sin permiso') }, 'propio', ['conductorId'])
  assert.equal(fallida.disponible, false)
  assert.equal(fallida.error, 'Sin permiso')
  const vacia = coleccionDePersona({ status: 'fulfilled', value: [] }, 'propio', ['conductorId'])
  assert.equal(vacia.disponible, true)
  assert.deepEqual(vacia.registros, [])
})

test('el índice ausente, inválido o no disponible no se convierte en cero', () => {
  for (const indice of [null, undefined, '', '82', NaN, Infinity, -1, 101]) {
    assert.equal(indiceDePersona({ indice }), null)
  }
  assert.equal(indiceDePersona({ indice: 0, rating: 'unavailable' }), null)
  assert.equal(indiceDePersona({ indice: 0 }), 0)
  assert.equal(indiceDePersona({ indice: 82 }), 82)
})

test('editar datos conserva los campos personales que la lectura no devuelve', () => {
  const persona = { cedula: 'v-12345678', telefono: null, direccion: null, fechaNacimiento: null }
  assert.deepEqual(cambiosDatosUsuario({ cedula: 'v-12345678', telefono: '0414-1234567', direccion: '', nacimiento: '' }, persona), { telefono: '0414-1234567' })
  assert.deepEqual(cambiosDatosUsuario({ cedula: 'v-12345678', telefono: '', direccion: '', nacimiento: '' }, persona), {})
  assert.throws(() => cambiosDatosUsuario({ cedula: '', telefono: '', direccion: '', nacimiento: '' }, persona), /nuevo valor/)
  assert.throws(() => cambiosDatosUsuario({ cedula: 'v-12345678', nacimiento: '2026-02-30' }, persona), /fecha de nacimiento/)
})
