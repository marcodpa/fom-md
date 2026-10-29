// T-206: logo de empresa por Cloudinary cuando el almacén del servidor está apagado, y el responsable
// de una empresa nueva creado de una vez como supervisor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { build } from 'vite'
import {
  ROL_SUPERVISOR, armarUsuarioResponsable, generarClaveTemporal, normalizarTelefono, problemaDelResponsable,
  rolSupervisorDe, textoDeError,
} from '../src/panel/datos/responsableEmpresa.js'
import { validarClave } from '../src/lib/clave.js'

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')

/** logos.js compilado con Vite (lee `import.meta.env`), con su cloudinary.js en el mismo paquete. */
async function logosCompilado() {
  const ENTRADA = 'virtual:prueba-t206-logos'
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA
        ? `export { direccionLogo, olvidarAlmacenApagado, subirLogoDeEmpresa, urlLogoEnNube } from '${ruta('src/panel/datos/logos.js')}'
           export { configurarCloudinary, olvidarFotos } from '${ruta('src/panel/datos/cloudinary.js')}'`
        : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(`${codigo}\n// ${Math.random()}`).toString('base64'))
}

const logo = (extra = {}) => ({ name: 'logo.png', type: 'image/png', size: 40_000, ...extra })

/** Una nube de mentira: `existentes` son los public_id que ya hay; las subidas los agregan. */
function nubeFalsa(existentes = []) {
  const hay = new Set(existentes)
  const subidos = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, op = {}) => {
    const u = String(url)
    if (op.method === 'HEAD') return { ok: hay.has(u.split('/image/upload/')[1].split('?')[0]) }
    if (u.endsWith('/image/upload')) {
      const id = op.body.get('public_id')
      hay.add(id)
      subidos.push({ id, tags: op.body.get('tags') })
      return { ok: true, json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${id}.png` }) }
    }
    throw new Error(`llamada inesperada: ${u}`)
  }
  return { hay, subidos, restaurar: () => { globalThis.fetch = original } }
}

// --- Mensajes en llano ----------------------------------------------------------

test('object_storage_unavailable nunca llega a la pantalla', () => {
  for (const e of [
    new Error('object_storage_unavailable'),
    new Error('503: {"code":"object_storage_unavailable"}'),
    Object.assign(new Error('El servidor no está listo'), { codigo: 'object_storage_unavailable' }),
    'object_storage_unavailable',
  ]) {
    const texto = textoDeError(e)
    assert.doesNotMatch(texto, /object_storage|unavailable/iu)
    assert.match(texto, /no puede guardar archivos/u)
  }
})

test('los avisos del servidor en inglés salen en español y lo demás pasa tal cual', () => {
  assert.match(textoDeError(new Error('That account already has active company access')), /Ese correo ya tiene acceso/u)
  assert.match(textoDeError(new Error('phone must be + and 7 to 15 digits')), /empezar por \+/u)
  assert.equal(textoDeError(new Error('Tu sesión no es válida o expiró.')), 'Tu sesión no es válida o expiró.')
  assert.equal(textoDeError(null, 'Algo falló'), 'Algo falló')
})

// --- Responsable → supervisor --------------------------------------------------

test('el responsable necesita nombre con apellido y un correo válido', () => {
  assert.match(problemaDelResponsable({ contacto: '', email: 'a@b.co' }), /nombre y el apellido/u)
  assert.match(problemaDelResponsable({ contacto: 'Ana', email: 'a@b.co' }), /apellido/u)
  assert.match(problemaDelResponsable({ contacto: 'Ana Pérez', email: '' }), /correo del responsable/u)
  assert.match(problemaDelResponsable({ contacto: 'Ana Pérez', email: 'no-es-correo' }), /correo válido/u)
  assert.match(problemaDelResponsable({ contacto: 'Ana Pérez', email: 'ana@flota.com', telefono: '0414-1234567' }), /empezar por \+/u)
  assert.equal(problemaDelResponsable({ contacto: 'Ana Pérez', email: 'ana@flota.com' }), null)
  assert.equal(problemaDelResponsable({ contacto: ' Ana  Pérez ', email: 'ana@flota.com', telefono: '+58 414-123 4567' }), null)
})

test('el teléfono se limpia como lo pide el servidor', () => {
  assert.equal(normalizarTelefono('+58 (414) 123-4567'), '+584141234567')
  assert.equal(normalizarTelefono(''), '')
  assert.equal(normalizarTelefono(undefined), '')
})

test('el usuario del responsable es supervisor de la empresa nueva', () => {
  assert.equal(ROL_SUPERVISOR, 'supervisor')
  const real = armarUsuarioResponsable({
    responsable: { contacto: '  Ana   Pérez ', email: ' Ana@Flota.COM ' },
    empresaId: 'e-1', tipoEmpresa: 'estandar', conectado: true,
  })
  assert.equal(real.rol, 'supervisor')
  assert.equal(real.nombre, 'Ana Pérez')
  assert.equal(real.email, 'ana@flota.com')
  assert.equal(real.empresaId, 'e-1')
  assert.equal(real.empresaDestinoId, 'e-1')
  assert.equal(validarClave(real.clave, real.email), null)

  // La maqueta usa los roles de su catálogo y no manda la ruta por empresa.
  const demo = armarUsuarioResponsable({ responsable: { contacto: 'Ana Pérez', email: 'ana@flota.com' }, empresaId: 'e-1', tipoEmpresa: 'predefinida', conectado: false, clave: 'Clave-Temporal-2026!' })
  assert.equal(demo.rol, 'supervisor_company')
  assert.equal(demo.empresaDestinoId, undefined)
  assert.equal(demo.clave, 'Clave-Temporal-2026!')
  assert.equal(rolSupervisorDe('personal', false), 'supervisor_personal')
  assert.equal(rolSupervisorDe('personal', true), 'supervisor')
})

test('la clave temporal siempre cumple las reglas del servidor y no se repite', () => {
  const vistas = new Set()
  for (let i = 0; i < 200; i += 1) {
    const clave = generarClaveTemporal('ana@flota.com')
    assert.equal(validarClave(clave, 'ana@flota.com'), null)
    assert.ok(clave.length >= 16)
    vistas.add(clave)
  }
  assert.equal(vistas.size, 200)
})

// --- Logo por Cloudinary ---------------------------------------------------------

test('el logo vive en una dirección fija con el id de la empresa', async () => {
  const { direccionLogo } = await logosCompilado()
  assert.equal(direccionLogo('e-1'), 'fom/logo-empresa/e-1')
})

test('sin almacén en el servidor, el logo se sube a Cloudinary y se encuentra por el id', async () => {
  const { configurarCloudinary, olvidarAlmacenApagado, olvidarFotos, subirLogoDeEmpresa, urlLogoEnNube } = await logosCompilado()
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  olvidarAlmacenApagado()
  const nube = nubeFalsa()
  try {
    assert.equal(await urlLogoEnNube('e-1'), null)
    const r = await subirLogoDeEmpresa('e-1', logo(), { hayApi: false })
    assert.equal(r.via, 'cloudinary')
    assert.match(r.url, /fom\/logo-empresa\/e-1\/1/u)
    assert.deepEqual(nube.subidos, [{ id: 'fom/logo-empresa/e-1/1', tags: 'fom_logo_empresa_e-1' }])
    assert.match(await urlLogoEnNube('e-1'), /\/image\/upload\/.*fom\/logo-empresa\/e-1\/1\?v=/u)
    // Un logo nuevo es la versión siguiente y pasa a ser el vigente.
    await subirLogoDeEmpresa('e-1', logo(), { hayApi: false })
    assert.match(await urlLogoEnNube('e-1'), /fom\/logo-empresa\/e-1\/2/u)
  } finally {
    nube.restaurar()
  }
})

test('si el almacén responde 503, el logo se sube a Cloudinary sin mostrar el error crudo', async () => {
  const { configurarCloudinary, olvidarAlmacenApagado, olvidarFotos, subirLogoDeEmpresa } = await logosCompilado()
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  olvidarAlmacenApagado()
  const nube = nubeFalsa()
  let intentos = 0
  const alServidor = async () => {
    intentos += 1
    throw Object.assign(new Error('object_storage_unavailable'), { estado: 503 })
  }
  try {
    const r = await subirLogoDeEmpresa('e-2', logo(), { hayApi: true, alServidor })
    assert.equal(r.via, 'cloudinary')
    assert.equal(nube.subidos[0].id, 'fom/logo-empresa/e-2/1')
    // Ya se sabe que está apagado: no se le vuelve a preguntar.
    await subirLogoDeEmpresa('e-3', logo(), { hayApi: true, alServidor })
    assert.equal(intentos, 1)
  } finally {
    nube.restaurar()
  }
})

test('si el almacén funciona, el logo va al servidor y no a Cloudinary', async () => {
  const { configurarCloudinary, olvidarAlmacenApagado, olvidarFotos, subirLogoDeEmpresa } = await logosCompilado()
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  olvidarAlmacenApagado()
  const nube = nubeFalsa()
  try {
    const r = await subirLogoDeEmpresa('e-4', logo(), { hayApi: true, alServidor: async () => 'obj-9' })
    assert.deepEqual(r, { via: 'servidor', id: 'obj-9' })
    assert.equal(nube.subidos.length, 0)
  } finally {
    nube.restaurar()
  }
})

test('sin almacén y sin Cloudinary se dice claro, en español y sin el código del servidor', async () => {
  const { configurarCloudinary, olvidarAlmacenApagado, olvidarFotos, subirLogoDeEmpresa } = await logosCompilado()
  configurarCloudinary({})
  olvidarFotos()
  olvidarAlmacenApagado()
  const alServidor = async () => { throw Object.assign(new Error('object_storage_unavailable'), { estado: 503 }) }
  await assert.rejects(
    subirLogoDeEmpresa('e-5', logo(), { hayApi: true, alServidor }),
    (e) => /no hay dónde guardar el logo/iu.test(e.message) && !/object_storage_unavailable/u.test(e.message),
  )
})

test('otros fallos del servidor también salen en llano y los archivos malos se rechazan antes', async () => {
  const { configurarCloudinary, olvidarAlmacenApagado, subirLogoDeEmpresa } = await logosCompilado()
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarAlmacenApagado()
  await assert.rejects(subirLogoDeEmpresa('e-6', logo({ type: 'application/pdf' }), { hayApi: false }), /PNG, JPG o WebP/u)
  await assert.rejects(subirLogoDeEmpresa('e-6', logo({ size: 3 * 1024 * 1024 }), { hayApi: false }), /2 MB/u)
  await assert.rejects(
    subirLogoDeEmpresa('e-6', logo(), { hayApi: true, alServidor: async () => { throw new Error('Tu sesión no es válida o expiró.') } }),
    /sesión no es válida/u,
  )
})
