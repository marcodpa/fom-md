// Fuerza horario de Caracas (UTC-4) para que el caso «vence hoy a las 14:00»
// sea el de verdad. Va ANTES de cualquier fecha; cada archivo de prueba corre en su proceso.
process.env.TZ = 'America/Caracas'

import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { estadoDocumento, diasPara } from '../src/panel/datos/catalogos.js'
import { vencimiento } from '../src/panel/datos/formato.js'
import {
  UMBRAL_POR_VENCER_DIAS, UMBRAL_URGENTE_DIAS, clasificarVencimiento, diasDeCalendario, esUrgente,
} from '../src/panel/datos/vencimientos.js'
import { atencionDeUnidad } from '../src/panel/datos/atencionUnidad.js'
import { fechaCortaVE, papelesPersona } from '../src/panel/modulos/reportes-datos.js'

// ============================================================
// UNA SOLA REGLA DE VENCIMIENTOS
// ------------------------------------------------------------
// Dos cosas: (1) los casos de la regla, con «ahora» fijo a las 14:00 en
// Caracas; (2) un vigilante que falla si alguien vuelve a escribir un umbral
// de 30/7 días o la división entre 86400000 de un documento fuera de
// src/panel/datos/vencimientos.js (la heurística es por líneas: ver abajo).
// ============================================================

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 4 nov 2026, 14:00 hora de Caracas. Se arma con el constructor local para que
// no dependa del huso de quien corra la prueba.
const AHORA = new Date(2026, 10, 4, 14, 0, 0)
const enDias = (n) => aISO(new Date(2026, 10, 4 + n))
// Para las funciones que leen el reloj real (vencimiento() de formato.js).
const enDiasReal = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return aISO(d)
}

test('vence hoy a las 14:00 en Caracas: «vence hoy», por vencer, nunca vencido', () => {
  assert.equal(diasDeCalendario('2026-11-04', AHORA), 0)
  assert.equal(estadoDocumento('2026-11-04', AHORA), 'por_vencer')
  assert.equal(clasificarVencimiento(diasPara('2026-11-04', AHORA)), 'por_vencer')
  assert.equal(vencimiento(enDiasReal(0)), 'vence hoy')
})

test('vence ayer: vencido', () => {
  assert.equal(diasPara('2026-11-03', AHORA), -1)
  assert.equal(estadoDocumento('2026-11-03', AHORA), 'vencido')
  assert.equal(vencimiento(enDiasReal(-1)), 'vencido hace 1 día')
})

test('vence en 30 días: por vencer; en 31: vigente', () => {
  assert.equal(estadoDocumento(enDias(30), AHORA), 'por_vencer')
  assert.equal(estadoDocumento(enDias(31), AHORA), 'vigente')
  assert.equal(clasificarVencimiento(30), 'por_vencer')
  assert.equal(clasificarVencimiento(31), 'vigente')
  assert.equal(UMBRAL_POR_VENCER_DIAS, 30)
})

test('la hora del día no mueve el resultado (madrugada o casi medianoche)', () => {
  for (const hora of [0, 1, 14, 23]) {
    const ahora = new Date(2026, 10, 4, hora, 59, 59)
    assert.equal(estadoDocumento('2026-11-04', ahora), 'por_vencer', `a las ${hora}:59`)
    assert.equal(estadoDocumento('2026-11-03', ahora), 'vencido', `a las ${hora}:59`)
  }
})

test('un ISO con hora cuenta por su día, como la app', () => {
  assert.equal(diasDeCalendario('2026-11-04T00:00:00Z', AHORA), 0)
})

test('urgente: vencido o a 7 días o menos', () => {
  assert.equal(UMBRAL_URGENTE_DIAS, 7)
  assert.equal(esUrgente(7), true)
  assert.equal(esUrgente(8), false)
  assert.equal(esUrgente(-3), true)
  assert.equal(esUrgente(null), false)
})

test('sin número no se afirma nada', () => {
  assert.equal(clasificarVencimiento(null), null)
  assert.equal(clasificarVencimiento(undefined), null)
  assert.equal(clasificarVencimiento(NaN), null)
})

test('la fecha corta del informe no se corre un día', () => {
  assert.equal(fechaCortaVE('2026-11-04'), '4 nov')
  assert.equal(fechaCortaVE('2026-11-04', true), '4 nov 2026')
})

test('papelesPersona toma el PEOR papel, no solo la licencia', () => {
  assert.equal(papelesPersona({ licenciaVence: enDias(200), cartaMedicaVence: enDias(-2) }, AHORA).estado, 'vencido')
  const r = papelesPersona({ licenciaVence: enDias(90), cartaMedicaVence: enDias(10), documentoDias: 200 }, AHORA)
  assert.equal(r.estado, 'por_vencer')
  assert.match(r.texto, /^Vence /)
  assert.equal(papelesPersona({ licenciaVence: enDias(90), documentoDias: -1 }, AHORA).estado, 'vencido')
  assert.equal(papelesPersona({ licenciaVence: enDias(90) }, AHORA).estado, 'al_dia')
  assert.equal(papelesPersona({}, AHORA).estado, null)
})

test('atencionDeUnidad: una sola respuesta para tabla, teléfono e informe', () => {
  const base = { conductorPrincipalId: 'c1' }
  assert.equal(atencionDeUnidad({ ...base, docsVencidos: 0, docsPorVencer: 0 }).requiere, false)
  assert.equal(atencionDeUnidad({ ...base, docsVencidos: 2, docsPorVencer: 1 }).novedad.t, '2 vencidos')
  assert.equal(atencionDeUnidad({ ...base, docsVencidos: 1, docsPorVencer: 0 }).novedad.grupo, 'no-salen')
  assert.equal(atencionDeUnidad({ ...base, docsVencidos: 0, docsPorVencer: 3 }).novedad.t, '3 por vencer')
  assert.equal(atencionDeUnidad({ docsVencidos: 0, docsPorVencer: 0 }).novedad.t, 'Sin conductor')
  // Sin datos de papeles no se inventan papeles en riesgo.
  const sinDatos = atencionDeUnidad({ ...base, docsVencidos: null, docsPorVencer: null })
  assert.equal(sinDatos.requiere, false)
  assert.equal(sinDatos.sinDatoPapeles, true)
})

// --- el vigilante ----------------------------------------------------------

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const REGLA = 'src/panel/datos/vencimientos.js'

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(js|jsx)$/u.test(nombre) ? [ruta] : []
  })
}

/** Código sin comentarios de línea ni de bloque (aproximado, de sobra para vigilar). */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//gu, (m) => m.replace(/[^\n]/gu, ''))
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/u, '$1'))
}

const DE_DOCUMENTO = /venc|expir|document|licenc|papel|vigen|diasPara|daysTo/iu
const PATRONES = [
  // dias <= 30, documentoDias > 7, daysToExpiry <= 30…
  { nombre: 'umbral de días fijo', re: /\b\w*(?:dias|días|days)\w*\s*(?:<=?|>=?)\s*(?:30|7)\b/iu, ademas: DE_DOCUMENTO },
  { nombre: 'umbral de días fijo (al revés)', re: /\b(?:30|7)\s*(?:>=?|<=?)\s*\w*(?:dias|días|days)\w*/iu, ademas: DE_DOCUMENTO },
  // un 86400000 en una línea que habla de documentos o vencimientos
  { nombre: 'cálculo de días con 86400000', re: /86_?400_?000/u, ademas: DE_DOCUMENTO },
  // «30 días» / «7 días» escritos a mano junto a vencer o vigencia
  { nombre: 'umbral escrito en texto', re: /\b(?:30|7) días\b/iu, ademas: /venc|vigen/iu },
]

test('ningún archivo del panel repite el umbral de 30/7 días ni el cálculo de días de un documento', () => {
  const hallazgos = []
  for (const ruta of archivos(join(raiz, 'src'))) {
    const rel = relative(raiz, ruta).replaceAll('\\', '/')
    if (rel === REGLA) continue
    sinComentarios(readFileSync(ruta, 'utf8')).forEach((linea, i) => {
      for (const { nombre, re, ademas } of PATRONES) {
        if (re.test(linea) && (!ademas || ademas.test(linea))) hallazgos.push(`${rel}:${i + 1} (${nombre}): ${linea.trim().slice(0, 120)}`)
      }
    })
  }
  assert.deepEqual(hallazgos, [], `Estos usan una regla propia en vez de datos/vencimientos.js:\n${hallazgos.join('\n')}`)
})

// Estos archivos solo tratan documentos y fechas de vencimiento: allí no cabe ningún 86400000.
const SIN_MILISEGUNDOS_DE_DIA = [
  'src/panel/datos/catalogos.js',
  'src/panel/datos/formato.js',
  'src/panel/modulos/Documentos.jsx',
  'src/panel/comp/PerfilUsuario.jsx',
  'src/panel/comp/CredencialesPersona.jsx',
]

test('los archivos de documentos no cuentan días por su cuenta', () => {
  for (const rel of SIN_MILISEGUNDOS_DE_DIA) {
    const codigo = sinComentarios(readFileSync(join(raiz, rel), 'utf8')).join('\n')
    assert.ok(!/86_?400_?000/u.test(codigo), `${rel} cuenta días con milisegundos: usa diasDeCalendario() de datos/vencimientos.js`)
  }
})

test('el vigilante sí detecta lo que busca', () => {
  assert.ok(PATRONES[0].re.test('const porVencer = documentoDias <= 30'))
  assert.ok(PATRONES[2].re.test('Math.floor((new Date(venceEn) - hoy) / 86400000)'))
  assert.ok(!PATRONES[2].re.test('const corte = Date.now() - dias * 3600000'))
})
