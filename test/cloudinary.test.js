import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alCambiarFotos, cloudinaryConfigurado, configurarCloudinary, desactivarQuitarFondo, etiquetas, idVigente, ids, olvidarFotos,
  problemaDelArchivo, quitarFondoDisponible, subirImagen, ultimaVersion, urlDe, urlOriginal,
} from '../src/panel/datos/cloudinary.js'

const foto = (extra = {}) => ({ name: 'foto.jpg', type: 'image/jpeg', size: 200_000, ...extra })

/** Una nube de mentira: `existentes` son los public_id que ya hay; las subidas los agregan. */
function nubeFalsa(existentes = []) {
  const hay = new Set(existentes)
  const llamadas = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, op = {}) => {
    llamadas.push({ url: String(url), op })
    const u = String(url)
    if (op.method === 'HEAD') {
      const id = u.split('/image/upload/')[1].split('?')[0]
      return { ok: hay.has(id) }
    }
    if (u.endsWith('/image/upload')) {
      const id = op.body.get('public_id')
      if (hay.has(id)) return { ok: true, json: async () => ({ existing: true, secure_url: `https://x/${id}` }) }
      hay.add(id)
      return { ok: true, json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${id}.jpg` }) }
    }
    throw new Error(`llamada inesperada: ${u}`)
  }
  return { hay, llamadas, restaurar: () => { globalThis.fetch = original } }
}

test('sin nube configurada no se sube nada y se dice claro', async () => {
  configurarCloudinary({})
  olvidarFotos()
  assert.equal(cloudinaryConfigurado(), false)
  await assert.rejects(subirImagen(foto(), { publicId: 'fom/vehiculo/1' }), /no está configurado/)
  assert.equal(urlDe('fom/vehiculo/1'), '')
  assert.equal(await ultimaVersion('fom/vehiculo/1'), 0)
})

test('cada foto tiene una dirección base con el id de FOM', () => {
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

test('la primera foto es la versión 1 y manda dirección, etiqueta y título', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeFalsa()
  try {
    await subirImagen(foto(), { publicId: ids.vehiculo('v1'), etiqueta: etiquetas.vehiculo('v1'), titulo: 'frente|lado=1' })
    const subida = nube.llamadas.find((c) => c.url.endsWith('/image/upload'))
    assert.equal(subida.url, 'https://api.cloudinary.com/v1_1/demo/image/upload')
    assert.equal(subida.op.body.get('upload_preset'), 'sin_firma')
    assert.equal(subida.op.body.get('public_id'), 'fom/vehiculo/v1/1')
    assert.equal(subida.op.body.get('tags'), 'fom_vehiculo_v1')
    assert.equal(subida.op.body.get('context'), 'caption=frente lado 1')
    assert.equal(await idVigente('fom/vehiculo/v1'), 'fom/vehiculo/v1/1')
  } finally { nube.restaurar() }
})

test('reemplazar sube la versión siguiente y esa pasa a ser la vigente; nada se borra', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeFalsa()
  try {
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v2' })
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v2' })
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v2' })
    assert.deepEqual([...nube.hay].sort(), ['fom/vehiculo/v2/1', 'fom/vehiculo/v2/2', 'fom/vehiculo/v2/3'])
    assert.equal(await idVigente('fom/vehiculo/v2'), 'fom/vehiculo/v2/3')
  } finally { nube.restaurar() }
})

test('encuentra la vigente aunque otra persona haya subido varias (búsqueda por saltos)', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  for (const total of [0, 1, 2, 5, 9, 17, 40]) {
    olvidarFotos()
    const nube = nubeFalsa(Array.from({ length: total }, (_, i) => `fom/vehiculo/z${total}/${i + 1}`))
    try {
      assert.equal(await ultimaVersion(`fom/vehiculo/z${total}`), total, `con ${total} versiones`)
      // Son pocas consultas aunque haya muchas versiones.
      assert.ok(nube.llamadas.length <= 14, `${nube.llamadas.length} consultas`)
    } finally { nube.restaurar() }
  }
})

test('si alguien subió la misma versión a la vez, se pasa a la siguiente', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeFalsa()
  try {
    // La búsqueda no ve la 1 todavía, pero al subir ya existe: Cloudinary devuelve `existing`.
    nube.hay.add('fom/vehiculo/v3/1')
    const original = globalThis.fetch
    globalThis.fetch = async (url, op = {}) => (op.method === 'HEAD' ? { ok: false } : original(url, op))
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v3' })
    globalThis.fetch = original
    assert.ok(nube.hay.has('fom/vehiculo/v3/2'))
  } finally { nube.restaurar() }
})

test('si Cloudinary rechaza la foto, el error lo dice y no se finge éxito', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const original = globalThis.fetch
  globalThis.fetch = async (_u, op = {}) => (op.method === 'HEAD' ? { ok: false } : { ok: false, json: async () => ({ error: { message: 'Upload preset must be whitelisted for unsigned uploads' } }) })
  try {
    await assert.rejects(subirImagen(foto(), { publicId: 'fom/vehiculo/v4' }), /whitelisted/)
  } finally { globalThis.fetch = original }
})

test('subir sin saber a qué pertenece la foto se rechaza', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  await assert.rejects(subirImagen(foto(), {}), /a qué pertenece/)
})

test('la URL es directa y liviana, y el recorte de fondo se apaga solo si falla', () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  assert.match(urlDe('fom/vehiculo/v1/2', 300, 200), /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_auto,q_auto,w_300,h_200,c_fill,g_auto\/fom\/vehiculo\/v1\/2\?v=\d+$/)
  assert.match(urlDe('fom/vehiculo/v1/2', 300), /w_300,c_limit/)
  assert.match(urlOriginal('fom/vehiculo/v1/2'), /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/fom\/vehiculo\/v1\/2\?v=\d+$/)
  // Apagado por defecto (consume créditos): la foto sale normal.
  assert.equal(quitarFondoDisponible(), false)
  assert.doesNotMatch(urlDe('fom/vehiculo/v1/2', 900, 600, { sinFondo: true }), /background_removal/)
})

test('subir avisa a las pantallas para que pidan la foto nueva', async () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeFalsa()
  let avisado = 0
  const baja = alCambiarFotos(() => { avisado += 1 })
  try {
    await subirImagen(foto(), { publicId: 'fom/vehiculo/v5' })
    assert.equal(avisado, 1)
  } finally { nube.restaurar(); baja() }
})
