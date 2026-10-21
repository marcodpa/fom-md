import test from 'node:test'
import assert from 'node:assert/strict'
import { armarModelo, crearPeriodo, nombrarPeriodo } from '../src/panel/modulos/reportes-datos.js'
import { chipsDe, graficosDe, marchaAhora, rangoIndice, serieDiaria, seriesDe, tableroDe, textoCifras } from '../src/panel/modulos/reportes-tablero-datos.js'

const ahora = new Date(2026, 9, 20, 9, 40)
const dia = (d, mes = 9) => new Date(2026, mes, d, 10).toISOString()

function datos(extra = {}) {
  return {
    vehiculos: [
      { id: 'v1', alias: 'Unidad 01', estadoMarcha: 'en_marcha', indiceSeguro: 90, conductorPrincipalId: 'p1', docsVencidos: 0, docsPorVencer: 0 },
      { id: 'v2', alias: 'Unidad 02', estadoMarcha: 'parada', indiceSeguro: 60, conductorPrincipalId: null, docsVencidos: 1, docsPorVencer: 0 },
      { id: 'v3', alias: 'Unidad 03', estadoMarcha: 'en_marcha', conectado: false, indiceSeguro: 70, conductorPrincipalId: 'p2', docsVencidos: 0, docsPorVencer: 0 },
      { id: 'v4', alias: 'Unidad 04', estadoMarcha: null, indiceSeguro: 85, conductorPrincipalId: null, docsVencidos: 0, docsPorVencer: 1 },
    ],
    conductores: [
      { id: 'p1', nombre: 'Pedro', unidad: 'v1', licenciaEstado: 'vigente', indiceSeguro: 92 },
      { id: 'p2', nombre: 'Ana', unidad: 'v3', licenciaEstado: 'vencido', indiceSeguro: 55 },
      { id: 'p3', nombre: 'Luis', licenciaEstado: 'por_vencer', licenciaVence: dia(30), indiceSeguro: 70 },
      { id: 'p4', nombre: 'Rosa' },
    ],
    odts: [
      { id: 'o1', vehiculoId: 'v2', estado: 'abierta', creadaEn: dia(5) },
      { id: 'o2', vehiculoId: 'v2', estado: 'en_ejecucion', creadaEn: dia(5) },
      { id: 'o3', vehiculoId: 'v1', estado: 'cerrada', costo: 120, creadaEn: dia(2), resueltaEn: dia(3) },
      { id: 'o4', vehiculoId: 'v1', estado: 'cerrada', creadaEn: dia(8) },
      { id: 'o5', vehiculoId: 'v1', estado: 'abierta', creadaEn: dia(25, 8) },
    ],
    eventos: [
      { vehiculoId: 'v1', clave: 'exceso_velocidad', nombre: 'Exceso de velocidad', creadaEn: dia(4) },
      { vehiculoId: 'v1', clave: 'exceso_velocidad', nombre: 'Exceso de velocidad', creadaEn: dia(4) },
      { vehiculoId: 'v2', clave: 'frenada_brusca', nombre: 'Frenada brusca', creadaEn: dia(9) },
    ],
    manejo: {
      actual: [
        { id: 'p1', nombre: 'Pedro', km: 1000, eventos: 10, eventosPor100: 1 },
        { id: 'p2', nombre: 'Ana', km: 500, eventos: 20, eventosPor100: 4 },
        { id: 'p3', nombre: 'Luis', km: 200, eventos: 4, eventosPor100: 2 },
      ],
      anterior: [{ id: 'p1', nombre: 'Pedro', km: 900, eventos: 9, eventosPor100: 1 }],
    },
    costos: {
      actual: { total: 1500, movimientos: 6, porCategoria: [{ categoria: 'combustible', monto: 1000 }, { categoria: 'peajes', monto: 500 }] },
      anterior: { total: 1200, movimientos: 5, porCategoria: [{ categoria: 'combustible', monto: 1200 }] },
    },
    ...extra,
  }
}

const p = crearPeriodo({}, ahora)
const nombre = nombrarPeriodo(p)
const modelo = (formato, extra) => armarModelo(datos(extra), p, { tipo: 'empresa' }, formato)

test('serie por día: un valor por día de la ventana; lo de fuera no cuenta', () => {
  const serie = serieDiaria([{ fecha: dia(1) }, { fecha: dia(1) }, { fecha: dia(3), valor: 5 }, { fecha: dia(30, 8) }, { fecha: 'mal' }], p.desde, p.hasta)
  assert.equal(serie.length, 20) // 1–20 oct
  assert.deepEqual(serie.slice(0, 4), [2, 0, 5, 0])
  assert.equal(serie.reduce((s, x) => s + x, 0), 7)
})

test('líneas solo en las cifras con fecha por registro; sin datos, sin línea', () => {
  assert.deepEqual(Object.keys(seriesDe('vehiculos', modelo('vehiculos'), p)), ['odt'])
  assert.equal(seriesDe('vehiculos', modelo('vehiculos'), p).odt[4], 2) // dos ODT el 5 oct
  assert.equal(seriesDe('estadistico', modelo('estadistico'), p).alertas[3], 2)
  assert.equal(seriesDe('costos', modelo('costos'), p).odtCosto[1], 120) // la resuelta con costo, por su día de creación
  assert.deepEqual(seriesDe('usuarios', modelo('usuarios'), p), {})
  // Sin ODT en el período: no se dibuja una raya plana.
  assert.equal(seriesDe('vehiculos', modelo('vehiculos', { odts: [] }), p).odt, null)
  const t = tableroDe('vehiculos', modelo('vehiculos'), p, nombre)
  assert.deepEqual(t.cifras.map(c => c.clave), ['km', 'indice', 'ev100', 'odt'])
  assert.deepEqual(t.cifras.map(c => !!c.serie), [false, false, false, true])
})

test('vehículos: ODT por estado y unidades ahora (sin señal manda sobre la marcha)', () => {
  assert.equal(marchaAhora({ conectado: false, estadoMarcha: 'en_marcha' }), 'sin_senal')
  assert.equal(marchaAhora({ estadoMarcha: null }), 'sin_dato')
  const [odt, unidades] = graficosDe('vehiculos', modelo('vehiculos'), nombre)
  assert.deepEqual(odt.partes.map(x => [x.etiqueta, x.valor, x.tono]), [['Abiertas', 1, 'warn'], ['En revisión', 1, 'azul'], ['Resueltas', 2, 'ok']])
  assert.equal(odt.vacio, null)
  assert.equal(odt.pie, '4 ODT creadas del 1–20 oct 2026')
  assert.equal(unidades.ahora, true)
  assert.deepEqual(unidades.partes.map(x => [x.clave, x.valor]), [['en_marcha', 1], ['parada', 1], ['sin_senal', 1], ['sin_dato', 1]])
  assert.equal(unidades.total, 4)
  const [vacio] = graficosDe('vehiculos', modelo('vehiculos', { odts: [] }), nombre)
  assert.equal(vacio.vacio, 'No se crearon ODT en este período.')
})

test('usuarios: índice por rangos y documentos al día, por vencer y vencidos', () => {
  assert.deepEqual([rangoIndice(59), rangoIndice(60), rangoIndice(79), rangoIndice(80), rangoIndice(100), rangoIndice(null), rangoIndice(120)], ['bajo', 'medio', 'medio', 'alto', 'alto', null, null])
  const [indice, docs] = graficosDe('usuarios', modelo('usuarios'), nombre)
  assert.deepEqual(indice.partes.map(x => [x.etiqueta, x.valor]), [['Menos de 60', 1], ['60 a 79', 1], ['80 a 100', 1]])
  assert.equal(indice.pie, '3 conductores con índice · 1 sin dato')
  assert.deepEqual(docs.partes.map(x => [x.etiqueta, x.valor, x.tono]), [['Al día', 1, 'ok'], ['Por vencer', 1, 'warn'], ['Vencidos', 1, 'bad']])
  assert.equal(docs.pie, '3 conductores con documentos con fecha · 1 sin dato')
})

test('costos: categorías y el período anterior al lado de este; sin costos, vacío con frase', () => {
  const [cats, tiempo] = graficosDe('costos', modelo('costos'), nombre)
  assert.deepEqual(cats.partes.map(x => [x.etiqueta, x.texto, x.detalle]), [['Combustible', '$1.000', '67 % · P'], ['Peajes', '$500', '33 % · S']])
  assert.deepEqual(tiempo.partes.map(x => [x.etiqueta, x.texto, x.detalle]), [['Período anterior', '$1.200', '1–20 sep 2026'], ['Este período', '$1.500', '1–20 oct 2026']])
  const [c2, t2] = graficosDe('costos', modelo('costos', { costos: { actual: null, anterior: null } }), nombre)
  assert.equal(c2.vacio, 'El servidor todavía no entrega los costos de operación.')
  assert.equal(t2.vacio, c2.vacio)
})

test('estadístico: eventos por tipo y los 5 conductores con más eventos por 100 km', () => {
  const [tipos, top] = graficosDe('estadistico', modelo('estadistico'), nombre)
  assert.deepEqual(tipos.partes.map(x => [x.etiqueta, x.valor]), [['Exceso de velocidad', 2], ['Frenada brusca', 1]])
  assert.deepEqual(top.partes.map(x => [x.etiqueta, x.texto, x.tono]), [['Ana', '4,00', 'bad'], ['Luis', '2,00', 'warn'], ['Pedro', '1,00', 'ok']])
  const [, sin] = graficosDe('estadistico', modelo('estadistico', { manejo: { actual: null, anterior: null } }), nombre)
  assert.equal(sin.vacio, 'El servidor no entregó km ni eventos de manejo de este período.')
})

test('chips de atención con su destino, y ninguno cuando no hay nada', () => {
  const v = chipsDe('vehiculos', modelo('vehiculos'))
  assert.deepEqual(v.map(c => c.texto), ['2 ODT sin resolver', '1 unidad con papeles vencidos', '2 unidades sin conductor', '2 unidades piden atención'])
  assert.deepEqual(v[0].ir, { ruta: '/panel/mantenimiento' })
  assert.deepEqual(v[1].ir, { tabla: true })
  const u = chipsDe('usuarios', modelo('usuarios'))
  assert.deepEqual(u.map(c => c.texto).slice(0, 3), ['1 papel vencido', '1 papel por vencer', '2 unidades sin conductor'])
  assert.deepEqual(chipsDe('costos', modelo('costos')).map(c => c.texto), ['1 ODT resuelta sin costo'])
  const e = chipsDe('estadistico', modelo('estadistico'))
  assert.deepEqual(e.map(c => [c.texto, c.tono]), [['2 conductores pasan de 1,5', 'bad']])
  assert.deepEqual(chipsDe('costos', modelo('costos', { odts: [] })), [])
})

test('compartir sin frase: las 4 cifras en una línea', () => {
  const t = tableroDe('costos', modelo('costos'), p, nombre)
  assert.match(textoCifras(t.cifras), /^Gasto del período: \$1\.500 · Gastos registrados: 6 · /)
})
