import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { build } from 'vite'
import { crearCacheEventos } from '../src/panel/datos/eventosManejo.js'
import { puedeGestionarA } from '../src/panel/datos/catalogos.js'

// ============================================================
// T-160: arreglos de la revisión final
//  1. «Mover» en la demo le pasa quién lo hace (actor) y el repositorio lo acepta.
//  2. Las acciones de una cuenta respetan el rango en la demo: la lista, el perfil
//     del teléfono (solo si puede editar) y el repositorio (clave y borrado).
//  8. El 404 de una persona en manejo brusco se guarda con la misma vigencia.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const leer = (r) => readFileSync(join(raiz, r), 'utf8')
const ENTRADA = 'virtual:prueba-t160'

function almacenEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

// El repositorio de la demo, en un paquete aparte (como demo-en-tierra.test.js).
let codigoRepo = null
async function compilarRepo() {
  if (codigoRepo) return codigoRepo
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA ? `export { default as repo } from '${ruta('src/panel/datos/repoSemilla.js')}'` : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  codigoRepo = salida[0].output.find((o) => o.type === 'chunk').code
  return codigoRepo
}

// Cada carga es un módulo nuevo con su propio almacén (un comentario distinto evita la caché).
let cargas = 0
async function cargarRepo() {
  globalThis.localStorage = almacenEnMemoria()
  globalThis.location = { search: '' }
  const c = (await compilarRepo()) + `\n// carga ${++cargas}`
  try {
    return (await import('data:text/javascript;base64,' + Buffer.from(c).toString('base64'))).repo
  } finally {
    delete globalThis.location
  }
}

// Las reglas de Usuarios (accionesDeCuenta) sin la pantalla: todo lo que importa AdminUsuarios.jsx,
// salvo catalogos.js, se cambia por una pieza vacía. DIRECTORIO_REAL queda en false (demo).
const PIEZA = '\0pieza-vacia:'
let reglas = null
async function cargarReglas() {
  if (reglas) return reglas
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    plugins: [{
      name: 'piezas-vacias',
      enforce: 'pre',
      resolveId: (id, desde) => (desde?.replace(/\\/g, '/').endsWith('src/panel/modulos/AdminUsuarios.jsx') && !id.includes('catalogos') ? PIEZA + id : null),
      load: (id) => (id.startsWith(PIEZA)
        ? { code: 'export default new Proxy({}, { get: (_, k) => (k === "DIRECTORIO_REAL" ? false : () => null) })', syntheticNamedExports: true }
        : null),
    }],
    build: { write: false, minify: false, lib: { entry: join(raiz, 'src/panel/modulos/AdminUsuarios.jsx'), formats: ['es'], fileName: 'reglas' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  reglas = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
  return reglas
}

// Los perfiles de sesión de la demo (auth.js): usan los roles de roles.js, no los de la semilla.
const SUPERVISOR = { id: 'usr-001', correo: 'supervisor@fom.com.ve', rol: 'supervisor', empresaId: 'transporte-lago-sur' }
const ADMIN = { id: 'usr-000', correo: 'admin@fom.com.ve', rol: 'admin_fom', empresaId: null }
const CONDUCTOR_SESION = { id: 'usr-002', correo: 'conductor@fom.com.ve', rol: 'conductor', empresaId: 'transporte-lago-sur' }
const NO_SE_PUEDE = /No puedes gestionar a ese usuario/u

test('1. «Mover» en la demo: el modal recibe el actor y el repositorio lo acepta', async () => {
  const src = leer('src/panel/modulos/AdminUsuarios.jsx')
  assert.match(src, /<ModalMover usuario=\{moviendo\}.*actor=\{actor\} \/>/u, 'el hook monta ModalMover con actor')
  const repo = await cargarRepo()
  // Sin actor, siempre fallaba: así se veía el error en la demo.
  await assert.rejects(repo.admin.usuarios.mover('usr-003', 'transporte-sampieri'), NO_SE_PUEDE)
  // Con el supervisor de la sesión, mueve a un conductor a otra empresa estándar.
  await repo.admin.usuarios.mover('usr-003', 'transporte-sampieri', SUPERVISOR)
  const lista = await repo.admin.usuarios.listar({ empresaId: 'transporte-sampieri' })
  assert.ok(lista.some((p) => p.id === 'usr-003'))
})

test('2. el rango de la sesión de la demo cuenta como el de la semilla', () => {
  assert.equal(puedeGestionarA(SUPERVISOR, { id: 'usr-002', rol: 'conductor' }), true)
  assert.equal(puedeGestionarA(SUPERVISOR, { id: 'usr-101', rol: 'supervisor_company' }), false, 'nadie a uno de su mismo rango')
  assert.equal(puedeGestionarA(SUPERVISOR, { id: 'usr-001', rol: 'supervisor_company' }), false, 'nadie a sí mismo')
  assert.equal(puedeGestionarA(ADMIN, { id: 'usr-101', rol: 'supervisor_company' }), true)
  assert.equal(puedeGestionarA(CONDUCTOR_SESION, { id: 'usr-003', rol: 'conductor' }), false)
})

test('2. acciones de cuenta en la demo: solo sobre quien el rango deja', async () => {
  const { accionesDeCuenta } = await cargarReglas()
  const de = (p, actor) => accionesDeCuenta(p, { lista: { alcance: { administrable: true } }, actor, directorioReal: false })
  const conductor = { id: 'usr-003', rol: 'conductor', email: 'luis@x', esDesempleado: false }
  assert.deepEqual(de(conductor, SUPERVISOR), ['mover', 'clave', 'salida'])
  assert.deepEqual(de({ ...conductor, esDesempleado: true }, SUPERVISOR), ['mover', 'clave', 'eliminar'])
  assert.deepEqual(de({ id: 'usr-101', rol: 'supervisor_company' }, SUPERVISOR), [], 'otro supervisor: nada')
  assert.deepEqual(de({ id: 'usr-001', rol: 'supervisor_company' }, SUPERVISOR), [], 'uno mismo: nada')
  assert.deepEqual(de(conductor, CONDUCTOR_SESION), [], 'un conductor no administra a nadie')
  assert.deepEqual(de(conductor, null), [], 'sin sesión, nada')
})

test('2. el perfil del teléfono solo pinta las acciones si puede editar y usa la ficha que ya tiene', () => {
  const exp = leer('src/panel/modulos/ExpedienteConductor.jsx')
  assert.match(exp, /esMovil && puedeEditar && <AccionesCuentaMovil persona=\{p\}/u)
  const adm = leer('src/panel/modulos/AdminUsuarios.jsx')
  const movil = adm.slice(adm.indexOf('export function AccionesCuentaMovil'), adm.indexOf('function Contenido('))
  // Punto 3 de la revisión: no se vuelve a pedir el directorio; las empresas solo al abrir «Mover».
  assert.doesNotMatch(movil, /cargar\(/u)
  assert.doesNotMatch(movil, /useDatos\(/u)
  assert.match(movil, /a === 'mover' && !DIRECTORIO_REAL && !empresas/u)
})

test('2. el repositorio de la demo exige rango para restablecer la clave y para borrar', async () => {
  const repo = await cargarRepo()
  const u = repo.admin.usuarios
  // Clave: un conductor no restablece la de otro, un supervisor no la de otro supervisor.
  await assert.rejects(u.cambiarClave('usr-003', CONDUCTOR_SESION), NO_SE_PUEDE)
  await assert.rejects(u.cambiarClave('usr-101', SUPERVISOR), NO_SE_PUEDE)
  await assert.rejects(u.cambiarClave('usr-003'), NO_SE_PUEDE, 'sin actor, nada')
  const r = await u.cambiarClave('usr-003', SUPERVISOR)
  assert.ok(r.clave)
  // Borrado definitivo (usr-104 ya está en Desempleados C.A.).
  await assert.rejects(u.eliminarDefinitivo('usr-104', CONDUCTOR_SESION), NO_SE_PUEDE)
  await assert.rejects(u.eliminarDefinitivo('usr-104'), NO_SE_PUEDE)
  await u.eliminarDefinitivo('usr-104', SUPERVISOR)
})

test('8. manejo brusco: el 404 de una persona se guarda con la misma vigencia; otro fallo no', async () => {
  let reloj = 0
  const pedidos = []
  const cache = crearCacheEventos({
    vigenciaMs: 1000,
    ahora: () => reloj,
    pedir: async ({ userId }) => {
      pedidos.push(userId)
      if (userId === 'ya-no') throw Object.assign(new Error('Ese recurso no existe.'), { estado: 404 })
      if (userId === 'caido') throw Object.assign(new Error('caído'), { estado: 500 })
      return [{ id: `${userId}-${pedidos.length}` }]
    },
  })
  await assert.rejects(cache.pedir({ userId: 'ya-no', dias: 7 }), (e) => e.estado === 404)
  // El refresco de la pantalla (cada minuto) no vuelve a preguntar mientras no vence.
  reloj = 500
  await assert.rejects(cache.pedir({ userId: 'ya-no', dias: 7 }), (e) => e.estado === 404)
  assert.equal(pedidos.filter((p) => p === 'ya-no').length, 1)
  // Vencido, sí se pregunta otra vez.
  reloj = 1600
  await assert.rejects(cache.pedir({ userId: 'ya-no', dias: 7 }))
  assert.equal(pedidos.filter((p) => p === 'ya-no').length, 2)
  // «Actualizar» también lo vuelve a pedir.
  cache.vencer()
  await assert.rejects(cache.pedir({ userId: 'ya-no', dias: 7 }))
  assert.equal(pedidos.filter((p) => p === 'ya-no').length, 3)
  // Un 500 no se guarda: el siguiente pedido sale de verdad.
  await assert.rejects(cache.pedir({ userId: 'caido', dias: 7 }))
  await assert.rejects(cache.pedir({ userId: 'caido', dias: 7 }))
  assert.equal(pedidos.filter((p) => p === 'caido').length, 2)
})

test('9. la ficha de la intro vieja ya no existe', () => {
  assert.throws(() => leer('src/components/VehicleCard.jsx'), /ENOENT/u)
  assert.doesNotMatch(leer('src/components/CinematicIntro.jsx'), /VehicleCard/u)
})
