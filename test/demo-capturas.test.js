import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'

// ============================================================
// T-112: la demo que sale en las capturas de la web de venta
// ------------------------------------------------------------
// Manejo, Reportes, Mi unidad y Vehículos no pueden salir vacíos ni
// contradecirse: score y km por conductor (con los mismos eventos del
// mapa), km del período anterior para comparar, la unidad del conductor
// reportando aunque pasen minutos, y los mismos contadores en el Resumen
// y en Vehículos.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const ENTRADA = 'virtual:prueba-demo-capturas'
const MIN = 60000
const DIA = 86400000

function localStorageEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

let modulo = null
async function cargar() {
  if (modulo) return modulo
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA ? [
        `export { default as repo } from '${ruta('src/panel/datos/repoSemilla.js')}'`,
        `export { restarManejo } from '${ruta('src/panel/modulos/reportes-datos.js')}'`,
      ].join('\n') : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  globalThis.localStorage = localStorageEnMemoria()
  globalThis.location = { search: '' }
  try {
    modulo = await import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
  } finally {
    delete globalThis.location
  }
  return modulo
}

const contar = (eventos, tipo) => eventos.filter((e) => e.tipo === tipo).length

test('manejo: cada conductor con unidad trae score, km, eventos y tasa por 100 km', async () => {
  const { repo } = await cargar()
  const ranking = await repo.manejo.ranking({ dias: 7 })
  const conUnidad = (await repo.vehiculos.listar({})).filter((v) => v.conductorPrincipalId)
  assert.equal(ranking.length, conUnidad.length, 'una fila por conductor con unidad')
  for (const s of ranking) {
    assert.ok(Number.isFinite(s.indice) && s.indice >= 0 && s.indice <= 100, `${s.nombre}: índice`)
    assert.ok(s.km > 0, `${s.nombre}: km del período`)
    assert.ok(Number.isFinite(s.eventosPor100), `${s.nombre}: eventos por 100 km`)
    assert.ok(['green', 'yellow', 'red'].includes(s.rating), `${s.nombre}: calificación`)
    for (const campo of ['frenadas', 'aceleraciones', 'excesos']) assert.ok(Number.isInteger(s[campo]), `${s.nombre}: ${campo}`)
    assert.equal(s.eventosPor100, Math.round(((s.frenadas + s.aceleraciones + s.excesos) / s.km) * 10000) / 100)
  }
  // Del mejor índice al peor, y el índice es el mismo de su unidad en Vehículos.
  for (let i = 1; i < ranking.length; i++) assert.ok(ranking[i - 1].indice >= ranking[i].indice)
  for (const s of ranking) assert.equal(s.indice, conUnidad.find((v) => v.conductorPrincipalId === s.id).indiceSeguro)
})

test('manejo: los conteos son los mismos eventos que pinta el mapa', async () => {
  const { repo } = await cargar()
  for (const dias of [7, 30]) {
    const ranking = await repo.manejo.ranking({ dias })
    for (const s of ranking) {
      const eventos = await repo.manejo.eventos({ userId: s.id, dias })
      assert.equal(s.frenadas, contar(eventos, 'frenada'), `${s.nombre} ${dias} d: frenadas`)
      assert.equal(s.aceleraciones, contar(eventos, 'aceleracion'), `${s.nombre} ${dias} d: aceleraciones`)
      assert.equal(s.excesos, contar(eventos, 'exceso'), `${s.nombre} ${dias} d: excesos`)
    }
  }
})

test('manejo: el conductor de la demo ve su propio score; sin unidad, nada', async () => {
  const { repo } = await cargar()
  const ranking = await repo.manejo.ranking({ dias: 7 })
  const mio = await repo.manejo.miScore({ dias: 7, userId: 'usr-002' })
  assert.deepEqual(mio, ranking.find((s) => s.id === 'usr-002'))
  assert.equal(await repo.manejo.miScore({ dias: 7, userId: 'usr-001' }), null, 'el supervisor no maneja')
})

test('reportes: hay km y eventos del período y del anterior (mes actual contra el pasado)', async () => {
  const { repo, restarManejo } = await cargar()
  // Lecturas «desde hace N días» como las pide Reportes: el período sale de restar dos cortes.
  const [desde51, desde30, desde21] = await Promise.all([51, 30, 21].map((dias) => repo.manejo.ranking({ dias })))
  const actual = restarManejo(desde21, null)
  const anterior = restarManejo(desde51, desde30)
  const suma = (lista, campo) => lista.reduce((t, x) => t + x[campo], 0)
  assert.ok(suma(actual, 'km') > 0 && suma(actual, 'eventos') > 0, 'período actual con km y eventos')
  assert.ok(suma(anterior, 'km') > 0 && suma(anterior, 'eventos') > 0, 'período anterior con km y eventos')
  assert.ok(actual.every((x) => Number.isFinite(x.eventosPor100)), 'eventos por 100 km en cada conductor')
  // Los km crecen con la ventana: más días, más km.
  for (const s of desde21) assert.ok(desde51.find((x) => x.id === s.id).km > s.km)
})

test('mi unidad: la del conductor de la demo va en marcha y reportando, también minutos después', async () => {
  const { repo } = await cargar()
  const unidadDe = async () => {
    const asignacion = (await repo.conductores()).find((a) => a.id === 'usr-002')
    return repo.vehiculos.obtener(asignacion.vehiculoId)
  }
  const ahora = await unidadDe()
  assert.equal(ahora.estadoMarcha, 'en_marcha')
  assert.equal(ahora.conexion, 'reportando')
  const original = Date.now
  try {
    const t0 = original()
    Date.now = () => t0 + 20 * MIN
    const despues = await unidadDe()
    assert.equal(despues.conexion, 'reportando', 'la señal no envejece con la pantalla abierta')
    assert.ok(Date.now() - Date.parse(despues.ultimoReporte) < 5 * MIN)
  } finally {
    Date.now = original
  }
})

test('vehículos: mismos contadores que el Resumen y toda la flota con señal', async () => {
  const { repo } = await cargar()
  const [resumen, lista] = await Promise.all([repo.resumen(), repo.vehiculos.listar({})])
  const enMarcha = lista.filter((v) => v.estadoMarcha === 'en_marcha').length
  assert.equal(lista.length, resumen.totalVehiculos)
  assert.equal(enMarcha, resumen.enMarcha)
  assert.equal(lista.length - enMarcha, resumen.detenidos)
  assert.equal(lista.length, 26)
  assert.equal(enMarcha, 15)
  assert.ok(lista.every((v) => v.conexion === 'reportando'), 'ninguna unidad de la demo sale «Sin señal»')
  assert.ok(lista.every((v) => Date.now() - Date.parse(v.ultimoReporte) < 5 * MIN))
})

test('la Unidad 18 es una Toyota Hilux, como la foto de referencia', async () => {
  const { repo } = await cargar()
  const v = (await repo.vehiculos.listar({})).find((x) => x.alias === 'Unidad 18')
  assert.equal(`${v.marca} ${v.modelo}`, 'Toyota Hilux')
})

test('eventos de manejo: los de 28 días no cambian y los viejos llegan hasta 90', async () => {
  const { repo } = await cargar()
  const eventos = await repo.manejo.eventos({ userId: 'usr-002', dias: 90 })
  const recientes = eventos.filter((e) => Date.parse(e.hora) >= Date.now() - 28 * DIA)
  assert.equal(recientes.length, 16)
  assert.ok(eventos.length > recientes.length)
})
