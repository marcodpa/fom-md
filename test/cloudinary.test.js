import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alCambiarFotos, cloudinaryConfigurado, configurarCloudinary, etiquetas, ids, problemaDelArchivo, subirImagen, urlDe, urlOriginal } from '../src/panel/datos/cloudinary.js'

const foto = (extra = {}) => ({ name: 'foto.jpg', type: 'image/jpeg', size: 200_000, ...extra })

test('sin nube configurada no se sube nada y se dice claro', async () => {
  configurarCloudinary({})
  assert.equal(cloudinaryConfigurado(), false)
  await assert.rejects(subirImagen(foto(), { publicId: 'fom/vehiculo/1' }), /no está configurado/)
  assert.equal(urlDe('fom/vehiculo/1'), '')
})

test('cada foto tiene una dirección fija con el id de FOM', () => {
  assert.equal(ids.vehiculo('v1'), 'fom/vehiculo/v1')
  assert.equal(ids.avatar('u1'), 'fom/avatar/u1')
  assert.equal(ids.documento('d1', 'frente'), 'fom/documento/d1/frente')
  assert.equal(etiquetas.documento('d1'), 'fom_documento_d1')
})

test('solo imágenes y de hasta 10 MB', () => {
  assert.equal(problemaDelArchivo(foto()), null)
  assert.match(problemaDelArchivo(foto({ name: 'a.pdf', type: 'application/pdf' })), /no es una imagen/)
  assert.match(problemaDelArchivo(foto({ size: 11 * 1024 * 1024 })), /10 MB/)
})

test('subir manda la dirección fija, la etiqueta y el título, y devuelve la URL', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const original = globalThis.fetch
  let visto
  globalThis.fetch = async (url, op) => { visto = { url, op }; return { ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fom/vehiculo/v1.jpg' }) } }
  try {
    const url = await subirImagen(foto(), { publicId: ids.vehiculo('v1'), etiqueta: etiquetas.vehiculo('v1'), titulo: 'frente|lado=1' })
    assert.match(url, /fom\/vehiculo\/v1/)
    assert.equal(visto.url, 'https://api.cloudinary.com/v1_1/demo/image/upload')
    assert.equal(visto.op.body.get('upload_preset'), 'sin_firma')
    assert.equal(visto.op.body.get('public_id'), 'fom/vehiculo/v1')
    assert.equal(visto.op.body.get('tags'), 'fom_vehiculo_v1')
    assert.equal(visto.op.body.get('context'), 'caption=frente lado 1')
  } finally { globalThis.fetch = original }
})

test('si Cloudinary rechaza la foto, el error lo dice y no se finge éxito', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'Upload preset must be whitelisted for unsigned uploads' } }) })
  try {
    await assert.rejects(subirImagen(foto(), { publicId: 'fom/vehiculo/v1' }), /whitelisted/)
  } finally { globalThis.fetch = original }
})

test('subir sin saber a qué pertenece la foto se rechaza', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  await assert.rejects(subirImagen(foto(), {}), /a qué pertenece/)
})

test('la URL de una foto es directa, liviana y cambia de versión al reemplazarla', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const a = urlDe('fom/vehiculo/v1', 300, 200)
  assert.match(a, /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_auto,q_auto,w_300,h_200,c_fill\/fom\/vehiculo\/v1\?v=\d+$/)
  assert.match(urlDe('fom/vehiculo/v1', 300), /w_300,c_limit/)
  assert.match(urlOriginal('fom/vehiculo/v1'), /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/fom\/vehiculo\/v1\?v=\d+$/)

  let avisado = 0
  const baja = alCambiarFotos(() => { avisado += 1 })
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ secure_url: 'https://x' }) })
  try {
    await new Promise((r) => setTimeout(r, 5))
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v1' })
    assert.equal(avisado, 1)
    assert.notEqual(urlDe('fom/vehiculo/v1', 300, 200), a)
  } finally { globalThis.fetch = original; baja() }
})
