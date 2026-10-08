import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cloudinaryConfigurado, configurarCloudinary, etiquetas, listarImagenes, miniatura, problemaDelArchivo, subirImagen } from '../src/panel/datos/cloudinary.js'

const foto = (extra = {}) => ({ name: 'foto.jpg', type: 'image/jpeg', size: 200_000, ...extra })

test('sin nube configurada no se sube nada y se dice claro', async () => {
  configurarCloudinary({})
  assert.equal(cloudinaryConfigurado(), false)
  await assert.rejects(subirImagen(foto()), /no está configurado/)
  assert.deepEqual(await listarImagenes('fom_vehiculo_1'), [])
})

test('las etiquetas son las de la app del conductor', () => {
  assert.equal(etiquetas.documento('d1'), 'fom_documento_d1')
  assert.equal(etiquetas.credencial('licencia', 'u1'), 'fom_credencial_licencia_u1')
  assert.equal(etiquetas.orden('o1'), 'fom_odt_o1')
  assert.equal(etiquetas.vehiculo('v1'), 'fom_vehiculo_v1')
  assert.equal(etiquetas.avatar('u1'), 'fom_avatar_u1')
})

test('solo imágenes y de hasta 10 MB', () => {
  assert.equal(problemaDelArchivo(foto()), null)
  assert.match(problemaDelArchivo(foto({ name: 'a.pdf', type: 'application/pdf' })), /no es una imagen/)
  assert.match(problemaDelArchivo(foto({ size: 11 * 1024 * 1024 })), /10 MB/)
})

test('subir manda carpeta, etiqueta y título, y devuelve la URL pública', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const original = globalThis.fetch
  let visto
  globalThis.fetch = async (url, op) => { visto = { url, op }; return { ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fom/x.jpg' }) } }
  try {
    const url = await subirImagen(foto(), { carpeta: 'fom/fom_vehiculo_v1', etiqueta: 'fom_vehiculo_v1', titulo: 'frente|lado=1' })
    assert.equal(url, 'https://res.cloudinary.com/demo/image/upload/v1/fom/x.jpg')
    assert.equal(visto.url, 'https://api.cloudinary.com/v1_1/demo/image/upload')
    assert.equal(visto.op.body.get('upload_preset'), 'sin_firma')
    assert.equal(visto.op.body.get('tags'), 'fom_vehiculo_v1')
    assert.equal(visto.op.body.get('folder'), 'fom/fom_vehiculo_v1')
    assert.equal(visto.op.body.get('context'), 'caption=frente lado 1')
  } finally { globalThis.fetch = original }
})

test('si Cloudinary rechaza la foto, el error lo dice y no se finge éxito', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'Upload preset not found' } }) })
  try {
    await assert.rejects(subirImagen(foto()), /Upload preset not found/)
  } finally { globalThis.fetch = original }
})

test('listar devuelve las fotos de la etiqueta, de la más nueva a la más vieja', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ resources: [
    { public_id: 'a', version: 1, format: 'jpg', created_at: '2026-10-01T10:00:00Z' },
    { public_id: 'b', version: 2, format: 'png', created_at: '2026-10-05T10:00:00Z', context: { custom: { caption: 'Frente' } } },
  ] }) })
  try {
    const fotos = await listarImagenes('fom_vehiculo_v1')
    assert.deepEqual(fotos.map((f) => f.id), ['b', 'a'])
    assert.equal(fotos[0].url, 'https://res.cloudinary.com/demo/image/upload/v2/b.png')
    assert.equal(fotos[0].titulo, 'Frente')
  } finally { globalThis.fetch = original }
})

test('la miniatura le pide a Cloudinary una versión liviana', () => {
  assert.equal(miniatura('https://res.cloudinary.com/demo/image/upload/v2/b.png', 200), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_200,c_limit/v2/b.png')
  assert.equal(miniatura('https://res.cloudinary.com/demo/image/upload/v2/b.png', 96, 96), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_96,h_96,c_fill/v2/b.png')
  assert.equal(miniatura('blob:otra'), 'blob:otra')
})
