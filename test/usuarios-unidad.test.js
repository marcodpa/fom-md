import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarJornadas, perfilDeUsuario, principalDe } from '../src/panel/datos/usuariosUnidad.js'

test('un secundario nunca se presenta como conductor principal', () => {
  const secundario = { id: 'secundario', rol: 'secundario' }
  const principal = { id: 'principal', rol: 'principal' }
  assert.equal(principalDe([secundario]), null)
  assert.equal(principalDe([secundario, principal]), principal)
})

test('el perfil requiere el id del usuario y conserva la identidad aunque haya nombres iguales', () => {
  assert.equal(perfilDeUsuario(null), null)
  assert.equal(perfilDeUsuario('usuario/a'), '/panel/personal/usuario%2Fa')
  assert.notEqual(perfilDeUsuario('juan-1'), perfilDeUsuario('juan-2'))
})

test('el historial ordena jornadas recientes y filtra sin alterar los registros originales', () => {
  const jornadas = [
    { id: 'cerrada', conductor: 'Juan Guerra', inicio: '2026-10-08T09:00:00Z', estado: 'ended' },
    { id: 'activa', conductor: 'Marco Pacheco', inicio: '2026-10-09T08:00:00Z', estado: 'active' },
  ]
  assert.deepEqual(filtrarJornadas(jornadas).map(j => j.id), ['activa', 'cerrada'])
  assert.deepEqual(filtrarJornadas(jornadas, ' JUAN ').map(j => j.id), ['cerrada'])
  assert.equal(filtrarJornadas(jornadas, 'juan', 'active').length, 0)
  assert.equal(jornadas[0].id, 'cerrada')
})
