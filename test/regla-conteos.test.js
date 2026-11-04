// Una sola regla para cada conteo del panel. Esta prueba falla si alguien vuelve
// a escribir su propia cuenta en vez de usar la compartida:
//  - estados de ODT  -> datos/odtGrupos.js (contarOdt, grupoOdt, estaSinResolver)
//  - alertas sin leer -> modulos/alertas-presentacion.js (estaLeida, contarSinLeer)
//  - diaria de hoy    -> datos/inspeccionesHoy.js (unidadesSinDiariaHoy)
//  - empresas         -> datos/contarEmpresas.js (contarEmpresas)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { contarOdt, grupoOdt, estaSinResolver } from '../src/panel/datos/odtGrupos.js'
import { contarSinLeer } from '../src/panel/modulos/alertas-presentacion.js'
import { unidadesSinDiariaHoy, diariasHechasHoy } from '../src/panel/datos/inspeccionesHoy.js'
import { contarEmpresas } from '../src/panel/datos/contarEmpresas.js'

// ---------- Las cuentas ----------
test('contarOdt: abierta, en revisión (los seis estados), resuelta y sin resolver', () => {
  const odts = ['abierta', 'en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad', 'cerrada', 'cancelada', 'rara'].map(estado => ({ estado }))
  assert.deepEqual(contarOdt(odts), { abierta: 1, revision: 6, resuelta: 2, sinResolver: 7 })
  assert.deepEqual(contarOdt(null), { abierta: 0, revision: 0, resuelta: 0, sinResolver: 0 })
  assert.equal(grupoOdt('pausada'), 'revision')
  assert.equal(grupoOdt('rara'), 'otro')
  assert.equal(estaSinResolver({ estado: 'en_calidad' }), true)
  assert.equal(estaSinResolver({ estado: 'cancelada' }), false)
})

test('contarSinLeer: leida, leidaEn y lista vacía', () => {
  assert.equal(contarSinLeer([{ leida: true }, { leidaEn: '2026-10-05T15:00:00Z' }, { leidaEn: null }, {}]), 2)
  assert.equal(contarSinLeer(undefined), 0)
})

test('unidadesSinDiariaHoy: unidades distintas, solo la diaria, día de hoy', () => {
  const flota = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const insp = [
    { vehiculoId: 'a', fecha: '2026-11-04', clase: 'daily' },
    { vehiculoId: 'a', fecha: '2026-11-04', clase: 'daily' }, // dos registros, una sola unidad
    { vehiculoId: 'b', fecha: '2026-11-04', clase: 'scheduled' }, // la programada no sustituye a la diaria
    { vehiculoId: 'c', fecha: '2026-11-03', clase: 'daily' }, // de ayer
    { vehiculoId: 'zz', fecha: '2026-11-04', clase: 'daily' }, // ya no está en la flota
  ]
  assert.deepEqual(unidadesSinDiariaHoy(flota, insp, '2026-11-04').map(v => v.id), ['b', 'c', 'd'])
  assert.equal(diariasHechasHoy(flota, insp, '2026-11-04'), 1) // hechas = total - faltan
  assert.deepEqual(unidadesSinDiariaHoy(flota, null, '2026-11-04').length, 4)
})

test('contarEmpresas: sin la de respaldo y sin inventar suspendidas', () => {
  const lista = [
    { id: 1, servicioActivo: true }, { id: 2, servicioActivo: false },
    { id: 3 }, // el servidor no dijo: ni activa ni suspendida
    { id: 4, respaldo: true, servicioActivo: true },
  ]
  assert.deepEqual(contarEmpresas(lista), { operativas: 3, activas: 1, suspendidas: 1 })
  assert.deepEqual(contarEmpresas(null), { operativas: 0, activas: 0, suspendidas: 0 })
})

// ---------- La regla: nadie cuenta por su cuenta ----------
const RAIZ = join(import.meta.dirname, '..', 'src')
function archivos(dir) {
  return readdirSync(dir).flatMap(n => {
    const ruta = join(dir, n)
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(js|jsx)$/.test(n) ? [ruta] : []
  })
}
const todos = archivos(RAIZ).map(ruta => ({ ruta: relative(RAIZ, ruta).split(sep).join('/'), texto: readFileSync(ruta, 'utf8') }))

/** Líneas de código (sin comentarios de línea) que cumplen el patrón, fuera de los archivos permitidos. */
function infracciones(patron, permitidos = []) {
  return todos.filter(a => !permitidos.includes(a.ruta)).flatMap(a =>
    a.texto.split('\n').map((l, i) => ({ ruta: a.ruta, n: i + 1, l: l.trim() }))
      .filter(x => !x.l.startsWith('//') && !x.l.startsWith('*') && patron.test(x.l))
      .map(x => `${x.ruta}:${x.n}  ${x.l.slice(0, 110)}`))
}

test('regla: ningún estado de ODT (abierta / en_revision) se compara fuera de odtGrupos.js', () => {
  const comparaEstado = /\bestado\s*[!=]==?\s*'(abierta|en_revision)'/
  const listaDeEstados = /\[[^\]]*'(abierta|en_revision)'[^\]]*\]\s*\.includes/
  const gruposSueltos = /\['abierta',\s*'revision'\]/
  const permitidos = [
    'panel/datos/odtGrupos.js',
    'panel/modulos/AdminGpsProbar.jsx', // el «estado» de una prueba de GPS, no de una ODT
  ]
  for (const patron of [comparaEstado, listaDeEstados, gruposSueltos]) assert.deepEqual(infracciones(patron, permitidos), [], 'Usa contarOdt / grupoOdt / estaSinResolver de datos/odtGrupos.js')
})

test('regla: «sin leer» se cuenta con estaLeida / contarSinLeer', () => {
  const sueltas = /\.filter\(.*(!\s*[\w.]+\.leida(En)?\b|\.leida(En)?\s*[=!]=)/
  const permitidos = [
    'panel/modulos/alertas-presentacion.js',
    // Los buzones del conductor (Mis avisos) tienen su propio estado local `leida`, no los avisos del servidor.
    'panel/modulos/AlertasConductor.jsx',
    'panel/datos/avisosConductor.js',
    'panel/datos/useAvisosConductor.js',
    'panel/datos/avisosSinSenal.js',
  ]
  assert.deepEqual(infracciones(sueltas, permitidos), [], 'Usa estaLeida / contarSinLeer de modulos/alertas-presentacion.js')
  assert.deepEqual(infracciones(/alertasSinLeer/, ['panel/datos/repoSemilla.js']), [], 'El número de la campana sale de contarSinLeer, no de un contador del servidor')
})

test('regla: las bandas del índice seguro y los umbrales de manejo viven en reportes-datos.js', () => {
  const sueltos = /\b(>=|<)\s*(1\.5|3\.5)\b/
  assert.deepEqual(infracciones(sueltos, ['panel/modulos/reportes-datos.js', 'panel/datos/formato.js']), [])
})
