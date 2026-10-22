import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'
import { enAgua, enTierra, PUENTE, RUTAS_LISTAS, sobrePuente } from '../src/panel/datos/geoZulia.js'

// ============================================================
// T-103: en el modo demostración nada cae en el agua
// ------------------------------------------------------------
// Unidades, recorridos, rastros recientes, eventos de manejo, lecturas
// del GPS y las posiciones que avanzan con el reloj (flota de estrés)
// tienen que caer en tierra: sobre el Lago de Maracaibo o el golfo solo
// se admite el puente General Rafael Urdaneta, y solo rodando.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const ENTRADA = 'virtual:prueba-en-tierra'
const MIN = 60000

function localStorageEnMemoria(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) }
}

// Un solo paquete con el repositorio de la demo, la semilla y la flota de estrés.
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
        `export { default as repo } from '${ruta('src/panel/datos/repoSemilla.js')}'`,
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
async function cargar(almacen = {}) {
  globalThis.localStorage = localStorageEnMemoria(almacen)
  globalThis.location = { search: '' }
  const c = (await compilar()) + `\n// carga ${++cargas}`
  try {
    return await import('data:text/javascript;base64,' + Buffer.from(c).toString('base64'))
  } finally {
    delete globalThis.location
  }
}

/** Junta los puntos que caen al agua: `quieto` exige tierra firme (nadie se para en el puente). */
function revisor() {
  const mojados = []
  const revisar = (que, p, { quieto = false } = {}) => {
    const lat = Number(p?.lat)
    const lng = Number(p?.lng)
    const mal = quieto ? !Number.isFinite(lat) || !Number.isFinite(lng) || enAgua(lat, lng) : !enTierra(lat, lng)
    if (mal) mojados.push(`${que} (${lat}, ${lng})${quieto ? ' detenida' : ''}`)
  }
  const fallar = (donde) => assert.equal(mojados.length, 0, `${mojados.length} posiciones en el agua (${donde}):\n${mojados.slice(0, 15).join('\n')}`)
  return { revisar, fallar }
}

/** Recorrido, rastro detallado, cola reciente, eventos de manejo y lecturas del GPS de cada unidad. */
async function revisarTodo(repo, semilla, revisar) {
  for (const v of semilla.VEHICULOS) {
    revisar(`${v.id} posición`, v, { quieto: v.estadoMarcha !== 'en_marcha' })
    semilla.recorridoDe(v.id).forEach((p, i) => revisar(`${v.id} recorrido #${i}`, p))
    semilla.recorridoDetalladoDe(v.id, 24).puntos.forEach((p, i) => revisar(`${v.id} rastro #${i}`, p, { quieto: p.velocidadKmh === 0 }))
  }
  const colas = await Promise.all(semilla.VEHICULOS.map((v) => repo.colaReciente(v.id)))
  colas.forEach((cola, n) => cola.forEach((p, i) => revisar(`${semilla.VEHICULOS[n].id} cola #${i}`, p)))

  const conductores = [...new Set(semilla.VEHICULOS.map((v) => v.conductorPrincipalId).filter(Boolean))]
  const eventos = (await Promise.all(conductores.map((userId) => repo.manejo.eventos({ userId, dias: 28 })))).flat()
  assert.ok(eventos.length > 0, 'hay eventos de manejo de ejemplo')
  eventos.forEach((e) => revisar(`evento ${e.id}`, e))

  const equipos = await repo.admin.gps.listar()
  const lecturas = await Promise.all(equipos.map((g) => repo.admin.gps.posiciones(g.id, { limite: 50 })))
  // Las lecturas repiten la posición de la unidad (si va por el puente, ahí está): basta con tierra.
  lecturas.forEach((ps, n) => ps.forEach((p) => revisar(`GPS ${equipos[n].id} lectura`, p)))
}

test('la función «está en tierra» distingue el lago, el golfo, el puente y las ciudades', () => {
  // Ciudades de la demo, en tierra.
  for (const [nombre, lat, lng] of [
    ['Maracaibo', 10.6545, -71.6405], ['San Francisco', 10.56, -71.65], ['Cabimas', 10.3907, -71.4462],
    ['Tía Juana', 10.268, -71.362], ['Ciudad Ojeda', 10.2006, -71.2889], ['Lagunillas', 10.1295, -71.2329],
    ['Bachaquero', 9.9617, -71.1137], ['Mene Grande', 9.822, -70.93],
  ]) assert.equal(enTierra(lat, lng), true, `${nombre} está en tierra`)
  // Agua: el centro del lago, el estrecho, El Tablazo y el golfo.
  for (const [nombre, lat, lng] of [
    ['centro del lago', 9.8, -71.6], ['frente a Cabimas', 10.36, -71.55], ['estrecho', 10.65, -71.56],
    ['El Tablazo', 10.85, -71.55], ['Golfo de Venezuela', 11.5, -71.0],
  ]) assert.equal(enTierra(lat, lng), false, `${nombre} es agua`)
  // El puente cuenta como carretera; a un kilómetro de él ya es lago.
  const medio = PUENTE[1]
  assert.equal(enAgua(...medio), true)
  assert.equal(sobrePuente(...medio), true)
  assert.equal(enTierra(...medio), true)
  assert.equal(enTierra(medio[0] + 0.01, medio[1]), false)
  // Sin coordenadas no hay tierra.
  assert.equal(enTierra(null, -71.6), false)
  assert.equal(enTierra(Number.NaN, Number.NaN), false)
})

test('las vías de la demo van por tierra (el puente solo como carretera)', () => {
  const { revisar, fallar } = revisor()
  for (const [area, rutas] of Object.entries(RUTAS_LISTAS)) {
    for (const r of rutas) {
      // Cada tramo, muestreado cada ~50 m.
      for (let i = 1; i < r.puntos.length; i++) {
        const [a, b] = [r.puntos[i - 1], r.puntos[i]]
        const pasos = Math.max(1, Math.ceil((r.acumulado[i] - r.acumulado[i - 1]) / 0.05))
        for (let k = 0; k <= pasos; k++) {
          revisar(`${area} ${r.via} tramo ${i}`, { lat: a[0] + ((b[0] - a[0]) * k) / pasos, lng: a[1] + ((b[1] - a[1]) * k) / pasos })
        }
      }
    }
  }
  fallar('vías')
})

test('demo normal: unidades, recorridos, rastros, eventos y lecturas GPS en tierra', async () => {
  const { repo, base } = await cargar()
  const { revisar, fallar } = revisor()
  base.AREAS.forEach((a) => revisar(`base de ${a.nombre}`, a.base, { quieto: true }))
  assert.equal(base.VEHICULOS.length, 26)
  await revisarTodo(repo, base, revisar)
  fallar('demo normal')
})

test('flota de estrés: las 340 unidades y lo que dibujan quedan en tierra', async () => {
  const { repo, base, estres } = await cargar({ 'fom.demo.estres': '1' })
  const { revisar, fallar } = revisor()
  const flota = await repo.vehiculos.listar({})
  assert.equal(flota.length, 340)
  // La misma flota que sirve el repositorio (semilla fija): de aquí salen recorridos y rastros.
  const semilla = estres.crearSemillaEstres(base)
  await revisarTodo(repo, semilla, revisar)
  flota.forEach((v) => revisar(`${v.id} listado`, v, { quieto: v.estadoMarcha !== 'en_marcha' }))
  fallar('flota de estrés')
})

test('flota de estrés: las posiciones que avanzan con el reloj no se meten al lago en todo un día', async () => {
  const { base, estres } = await cargar()
  const ahora = Date.parse('2026-10-21T15:00:00Z')
  const semilla = estres.crearSemillaEstres(base, { ahora })
  const { revisar, fallar } = revisor()
  const original = Date.now
  try {
    // Cada 7 minutos durante 24 h, y el punto medio entre dos lecturas de 15 s (lo que anima el mapa).
    for (let t = ahora; t < ahora + 24 * 60 * MIN; t += 7 * MIN) {
      Date.now = () => t
      const antes = semilla.VEHICULOS.map((v) => ({ lat: v.lat, lng: v.lng, quieto: v.estadoMarcha !== 'en_marcha', id: v.id }))
      Date.now = () => t + 15000
      semilla.VEHICULOS.forEach((v, i) => {
        const a = antes[i]
        revisar(`${a.id} a las ${new Date(t).toISOString()}`, a, { quieto: a.quieto })
        revisar(`${a.id} animando`, { lat: (a.lat + v.lat) / 2, lng: (a.lng + v.lng) / 2 }, { quieto: a.quieto })
      })
    }
  } finally {
    Date.now = original
  }
  fallar('flota de estrés en movimiento')
})
