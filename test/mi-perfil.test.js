import assert from 'node:assert/strict'
import test from 'node:test'
import { cambiosDePerfil, personaPropia } from '../src/panel/datos/perfilValidation.js'

const perfil = { nombre: 'María Rojas', cedula: 'v-12345678', telefono: '+584141234567', direccion: 'Maracaibo', fechaNacimiento: '1990-03-14' }

test('Mi perfil resuelve el correo exacto y nunca toma al primer compañero', () => {
  const lista = [{ userId: 'otro', email: 'maria+otra@example.com' }, { userId: 'propio', email: 'maria@example.com' }]
  assert.equal(personaPropia(lista, ' MARIA@example.com ').userId, 'propio')
  assert.equal(personaPropia(lista, 'maria'), null)
  assert.equal(personaPropia(lista, ''), null)
  assert.equal(personaPropia([{ email: '' }], ''), null)
})

test('guardar el perfil solo envía cambios personales y conserva campos desconocidos', () => {
  assert.deepEqual(cambiosDePerfil(perfil, perfil), {})
  const anterior = { nombre: perfil.nombre, cedula: perfil.cedula }
  const draft = { ...anterior, telefono: '+58 414-1234567', direccion: '', fechaNacimiento: '', rol: 'admin_fom', userId: 'otro', email: 'otro@example.com' }
  assert.deepEqual(cambiosDePerfil(draft, anterior), { phone: '+584141234567' })
  assert.deepEqual(cambiosDePerfil({ ...perfil, cedula: 'V 22.333.444' }, perfil), { nationalId: 'v-22333444' })
})

test('el perfil rechaza fechas imposibles y datos vaciados antes de escribir', () => {
  for (const fechaNacimiento of ['2025-02-30', '2999-01-01', 'no-fecha']) assert.throws(() => cambiosDePerfil({ ...perfil, fechaNacimiento }, perfil), /fecha de nacimiento válida/)
  assert.throws(() => cambiosDePerfil({ ...perfil, telefono: '' }, perfil), /Completa los datos/)
  assert.throws(() => cambiosDePerfil({ ...perfil, telefono: '4141234567' }, perfil), /código de país/)
  assert.throws(() => cambiosDePerfil({ ...perfil, cedula: 'sin cedula' }, perfil), /cédula válida/)
})
