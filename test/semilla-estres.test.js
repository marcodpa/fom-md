import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// T-80: flota de estrés del modo demostración
// ------------------------------------------------------------
// 1. Con `fom.demo.estres` (o `?estres=…`) la demo trae una empresa grande:
//    340 unidades, 340 conductores, ~3.000 ODT con los 9 estados y ~30.000
//    inspecciones, siempre las mismas (semilla fija).
// 2. Las unidades en marcha avanzan con el reloj.
// 3. Sin el parámetro la demo queda EXACTAMENTE igual.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const ENTRADA = 'virtual:prueba-estres'

function localStorageEnMemoria(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

// Un solo paquete con el repositorio, la semilla y la flota de estrés.
let codigo = null
async function compilar() {
  if (codigo) return codigo
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA ? [
        `export { repo } from '${ruta('src/panel/datos/repo.js')}'`,
        `export * as base from '${ruta('src/panel/datos/semilla.js')}'`,
        `export * as estres from '${ruta('src/panel/datos/semillaEstres.js')}'`,
      ].join('\n') : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return codigo
}

// Cada carga es un módulo nuevo (un comentario distinto evita la caché de import).
let cargas = 0
async function cargar(almacen = {}, busqueda = '') {
  globalThis.localStorage = localStorageEnMemoria(almacen)
  globalThis.location = { search: busqueda }
  const c = (await compilar()) + `\n// carga ${++cargas}`
  try {
    return await import('data:text/javascript;base64,' + Buffer.from(c).toString('base64'))
  } finally {
    delete globalThis.location
  }
}

test('con fom.demo.estres la demo trae la empresa grande', async () => {
  const { repo } = await cargar({ 'fom.demo.estres': '1' })
  const vehiculos = await repo.vehiculos.listar({})
  assert.equal(vehiculos.length, 340)
  assert.equal(new Set(vehiculos.map((v) => v.placa)).size, 340, 'placas únicas')
  const conductores = await repo.personal.listar({ soloConductores: true })
  assert.equal(conductores.length, 340)
  assert.equal(new Set(conductores.map((p) => p.email)).size, 340, 'un correo por usuario')
  assert.ok(vehiculos.every((v) => v.conductorNombre !== 'Sin asignar'))
  assert.equal((await repo.areas()).length, 4)
  // 300 en las tres zonas y 40 del contrato.
  assert.equal(vehiculos.filter((v) => v.areaId === 'area-4').length, 40)

  const enMarcha = vehiculos.filter((v) => v.estadoMarcha === 'en_marcha').length / vehiculos.length
  assert.ok(enMarcha > 0.78 && enMarcha < 0.92, `en marcha ${Math.round(enMarcha * 100)} %`)
  // Todas en el Zulia, alrededor de Maracaibo, Cabimas y Ciudad Ojeda.
  assert.ok(vehiculos.every((v) => v.lat > 9.7 && v.lat < 11 && v.lng > -71.9 && v.lng < -70.8))

  const odts = await repo.odts.listar({})
  assert.ok(odts.length > 2800 && odts.length < 3200, `${odts.length} ODT`)
  const estados = new Set(odts.map((o) => o.estado))
  for (const e of ['abierta', 'en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad', 'cerrada', 'cancelada']) assert.ok(estados.has(e), `falta el estado ${e}`)
  const haceUnAno = Date.now() - 366 * 86400000
  assert.ok(odts.every((o) => Date.parse(o.creadaEn) >= haceUnAno && Date.parse(o.creadaEn) <= Date.now()))

  const inspecciones = await repo.inspecciones.listar({})
  assert.ok(inspecciones.length > 25000 && inspecciones.length < 36000, `${inspecciones.length} inspecciones`)
  assert.equal(new Set(inspecciones.map((i) => i.id)).size, inspecciones.length, 'sin ids repetidos')
  assert.ok((await repo.documentos.listar({})).length >= 340 * 4)
  assert.ok((await repo.alertas.eventos({ dias: 28 })).length > 500)
  const resumen = await repo.resumen()
  assert.equal(resumen.totalVehiculos, 340)
  assert.equal(resumen.conductores, 340)
})

test('la flota de estrés es siempre la misma y las unidades en marcha avanzan', async () => {
  const { base, estres } = await cargar()
  const ahora = Date.parse('2026-10-21T15:00:00Z')
  const a = estres.crearSemillaEstres(base, { ahora })
  const b = estres.crearSemillaEstres(base, { ahora })
  assert.deepEqual(a.VEHICULOS.map((v) => v.placa), b.VEHICULOS.map((v) => v.placa))
  assert.deepEqual(a.ODTS.map((o) => o.estado + o.vehiculoId), b.ODTS.map((o) => o.estado + o.vehiculoId))
  assert.equal(a.INSPECCIONES.length, b.INSPECCIONES.length)

  const v = a.VEHICULOS.find((x) => x.estadoMarcha === 'en_marcha')
  const quieta = a.VEHICULOS.find((x) => x.estadoMarcha === 'parada')
  const original = Date.now
  try {
    Date.now = () => ahora
    const antes = { ...v }
    const parada = { ...quieta }
    Date.now = () => ahora + 60000
    const despues = { ...v }
    const km = Math.hypot((despues.lat - antes.lat) * 110.6, (despues.lng - antes.lng) * 109.4)
    assert.ok(km > 0.3 && km < 2, `en un minuto avanzó ${km.toFixed(2)} km`)
    assert.deepEqual({ ...quieta }, parada, 'la detenida no se mueve')
    // El recorrido termina donde está la unidad.
    const { puntos } = a.recorridoDetalladoDe(v.id, 24)
    const ultimo = puntos.at(-1)
    assert.ok(Math.abs(ultimo.lat - despues.lat) < 0.01 && Math.abs(ultimo.lng - despues.lng) < 0.01)
  } finally {
    Date.now = original
  }
})

test('la URL lo enciende y lo deja guardado; ?estres=0 lo apaga', async () => {
  const { estres } = await cargar()
  globalThis.localStorage = localStorageEnMemoria()
  try {
    globalThis.location = { search: '?estres=120' }
    assert.equal(estres.leerEstres(), 120)
    globalThis.location = { search: '' } // al navegar dentro del panel la URL ya no lo trae
    assert.equal(estres.leerEstres(), 120)
    globalThis.location = { search: '?estres=1' }
    assert.equal(estres.leerEstres(), 340)
    globalThis.location = { search: '?estres=0' }
    assert.equal(estres.leerEstres(), 0)
    globalThis.location = { search: '' }
    assert.equal(estres.leerEstres(), 0)
  } finally {
    delete globalThis.location
  }
})

test('sin el parámetro la demo queda exactamente igual', async () => {
  const { repo, base, estres } = await cargar()
  assert.equal(estres.semillaActiva(base), base, 'la semilla activa es la de siempre, el mismo objeto')
  const vehiculos = await repo.vehiculos.listar({})
  assert.equal(vehiculos.length, base.VEHICULOS.length)
  assert.deepEqual(vehiculos.map((v) => v.placa).sort(), base.VEHICULOS.map((v) => v.placa).sort())
  assert.equal((await repo.odts.listar({})).length, base.ODTS.length)
  const conductores = await repo.personal.listar({ soloConductores: true })
  assert.deepEqual(conductores.map((p) => p.id).sort(), base.PERFILES.filter((p) => p.conduce && p.empresaId === base.EMPRESA.id).map((p) => p.id).sort())
  // El historial de 50 días de la demo normal sigue ahí.
  assert.ok((await repo.inspecciones.listar({})).some((i) => i.id.startsWith('insp-h-')))
  assert.equal(globalThis.localStorage.getItem('fom.demo.estres'), null, 'no guarda nada')
})
