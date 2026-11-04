import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { estadoSenal, SIN_SENAL_MS, SIN_UBICACION_MS, VEL_MARCHA_KMH } from '../src/panel/datos/sinSenal.js'
import { estadoUnidad } from '../src/panel/datos/estadoUnidad.js'

// ============================================================
// UNA SOLA REGLA PARA EL ESTADO DE LA UNIDAD (P1)
// ------------------------------------------------------------
// El mismo carro salía «Reportando» en una pantalla, «Sin señal» en otra y
// «En marcha» en una tercera: más de 20 sitios decidían cada uno por su
// cuenta. Ahora decide `estadoSenal` (sinSenal.js). Estas pruebas fallan si
// alguien vuelve a decidir la señal fuera de ahí.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const SRC = join(raiz, 'src')

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n)
    if (statSync(r).isDirectory()) return archivos(r)
    return /\.(jsx?|mjs)$/u.test(n) ? [r] : []
  })
}
const FUENTES = archivos(SRC).map((r) => ({ ruta: relative(raiz, r).replace(/\\/g, '/'), texto: readFileSync(r, 'utf8') }))

/** Las líneas de código, sin los comentarios de línea ni de bloque (los comentarios pueden nombrar la regla). */
function lineasDeCodigo(texto) {
  const sinBloques = texto.replace(/\/\*[\s\S]*?\*\//gu, (m) => m.replace(/[^\n]/gu, ' '))
  return sinBloques.split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/u, '$1'))
}

function buscar(patron, { excepto = [], permitida = () => false } = {}) {
  const hallazgos = []
  for (const f of FUENTES) {
    if (excepto.includes(f.ruta)) continue
    lineasDeCodigo(f.texto).forEach((l, i) => {
      if (patron.test(l) && !permitida(l, f.ruta)) hallazgos.push(`${f.ruta}:${i + 1}: ${l.trim().slice(0, 120)}`)
    })
  }
  return hallazgos
}

// Cachés y refrescos que duran 5 min y NO deciden la señal: se nombran y se aceptan uno por uno.
const CINCO_MIN_QUE_NO_SON_SENAL = ['GUARDADO_MS', 'REVISAR_LUZ_MS', 'SIN_POSICION_MS', 'ASIGNACIONES_MS', 'RANKING_MS', 'CINCO_MINUTOS', 'VIGENCIA_INVENTARIO_MS']

test('el umbral de 5 minutos vive solo en sinSenal.js', () => {
  const cinco = /(?<![\d.])(300000|300_000)(?![\d_])|\b5\s*\*\s*60\s*\*\s*1000\b|\b5\s*\*\s*60_000\b|\b5\s*\*\s*60000\b|\b5\s*\*\s*MIN(_MS)?\b/u
  const hallazgos = buscar(cinco, {
    excepto: ['src/panel/datos/sinSenal.js'],
    permitida: (l) => CINCO_MIN_QUE_NO_SON_SENAL.some((n) => new RegExp(`\\bconst\\s+${n}\\s*=`, 'u').test(l)),
  })
  assert.deepEqual(hallazgos, [], 'Usa SIN_SENAL_MS de sinSenal.js (o, si es una caché, nómbrala y súmala a la lista)')
})

test('lastReportAt y lastPositionAt solo se leen al traducir la API', () => {
  const hallazgos = buscar(/\.(lastReportAt|lastPositionAt)\b|\{[^}]*\b(lastReportAt|lastPositionAt)\b[^}]*\}\s*=/u, {
    excepto: ['src/panel/datos/repoApi.js', 'src/panel/datos/vehiculosPlataforma.js'],
  })
  assert.deepEqual(hallazgos, [], 'Las pantallas leen ultimoReporte y posicionEn, y la señal la decide estadoSenal')
})

test('una unidad está «Detenida», nunca «Detenido»', () => {
  const hallazgos = buscar(/\bDetenido\b/u)
  assert.deepEqual(hallazgos, [])
})

test('ninguna pantalla define su propio estado de señal o de marcha', () => {
  const propia = /\b(function|const|let)\s+(estadoApp|estadoMovil|senalDe|VIVO_MS)\b/u
  // gps.js define el `senalDe` del inventario de equipos, y delega en estadoSenal.
  const hallazgos = buscar(propia, { excepto: ['src/panel/datos/gps.js'] })
  assert.deepEqual(hallazgos, [], 'Usa estadoSenal (sinSenal.js) o estadoUnidad (estadoUnidad.js)')
})

// ------------------------------------------------------------
// LA REGLA
// ------------------------------------------------------------
const AHORA = Date.UTC(2026, 10, 4, 15, 0, 0)
const hace = (min) => new Date(AHORA - min * 60_000).toISOString()

test('las constantes son las del servidor y la app', () => {
  assert.equal(SIN_SENAL_MS, 5 * 60_000)
  assert.equal(SIN_UBICACION_MS, 30 * 60_000)
  assert.equal(VEL_MARCHA_KMH, 3)
})

test('el Camry: latidos frescos y la última posición de ayer → sin ubicación (ámbar)', () => {
  const camry = { id: 'camry', ultimoReporte: hace(0.5), posicionEn: hace(26 * 60), lat: 10.64, lng: -71.61, velocidadKmh: 0 }
  const s = estadoSenal(camry, AHORA)
  assert.equal(s.clave, 'sin_ubicacion')
  assert.equal(s.color, 'ambar')
  assert.equal(s.texto, 'Sin ubicación · última hace 1 d')
  assert.equal(s.marcha, null)
  assert.equal(s.velocidadKmh, null)
  assert.equal(estadoUnidad(camry, AHORA).clave, 'sin_ubicacion')
  // Sin ninguna posición: «nunca».
  assert.equal(estadoSenal({ ultimoReporte: hace(1) }, AHORA).texto, 'Sin ubicación · nunca')
})

test('mensaje de hace 10 min → sin señal, aunque motionState diga en marcha', () => {
  const v = { ultimoReporte: hace(10), posicionEn: hace(10), estadoMarcha: 'en_marcha', velocidadKmh: 62, ignition: true }
  const s = estadoSenal(v, AHORA)
  assert.equal(s.clave, 'sin_senal')
  assert.equal(s.color, 'gris')
  assert.equal(s.texto, 'Sin señal · hace 10 min')
  // Nunca marcha ni velocidad: son viejas.
  assert.equal(s.marcha, null)
  assert.equal(s.velocidadKmh, null)
  assert.equal(estadoUnidad(v, AHORA).clave, 'sin_senal')
})

test('nunca reportó → sin GPS (gris); sin equipo, «Sin GPS»', () => {
  const s = estadoSenal({ id: 'nueva' }, AHORA)
  assert.equal(s.clave, 'sin_gps')
  assert.equal(s.texto, 'Nunca reportó')
  assert.equal(s.color, 'gris')
  assert.equal(estadoSenal({ sinGps: true }, AHORA).texto, 'Sin GPS')
})

test('en marcha a 2 km/h → Detenida; desde 3 km/h o con motionState, En marcha', () => {
  const alDia = { ultimoReporte: hace(1), posicionEn: hace(1) }
  const lenta = estadoSenal({ ...alDia, velocidadKmh: 2 }, AHORA)
  assert.equal(lenta.clave, 'reportando')
  assert.equal(lenta.marcha, 'parada')
  assert.equal(lenta.texto, 'Detenida')
  assert.equal(lenta.color, 'verde')
  assert.equal(estadoSenal({ ...alDia, velocidadKmh: 3 }, AHORA).marcha, 'en_marcha')
  assert.equal(estadoSenal({ ...alDia, estadoMarcha: 'en_marcha' }, AHORA).texto, 'En marcha')
  // El encendido no es un estado.
  assert.equal(estadoSenal({ ...alDia, ignition: true }, AHORA).texto, 'Detenida')
})

test('la salida trae lo que necesitan las pantallas', () => {
  const s = estadoSenal({ ultimoReporte: hace(2), posicionEn: hace(4), velocidadKmh: 40 }, AHORA)
  assert.deepEqual(
    { clave: s.clave, texto: s.texto, color: s.color, tono: s.tono, ultimoReporte: s.ultimoReporte, posicionEn: s.posicionEn, hace: s.hace, velocidadKmh: s.velocidadKmh },
    { clave: 'reportando', texto: 'En marcha', color: 'verde', tono: 'ok', ultimoReporte: hace(2), posicionEn: hace(4), hace: 'hace 2 min', velocidadKmh: 40 },
  )
})
