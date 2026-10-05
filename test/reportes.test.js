import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularReporte, crearCsv } from '../src/panel/modulos/reportes-datos.js'

const ahora = Date.parse('2026-10-05T12:00:00Z')
const base = { vehiculos: [{ id: 'v1', km: 100, indiceSeguro: 80, estadoMarcha: 'parada', conductorPrincipalId: 'p1' }, { id: 'v2', km: null, indiceSeguro: null }], conductores: [{ id: 'p1' }, { id: 'otro' }], odts: [], eventos: [] }
test('ausencias no producen cero y los estados cubren todas las unidades', () => {
  const c = calcularReporte(base, 30, '', ahora)
  assert.equal(c.kmTotal, null); assert.equal(c.indice, null)
  assert.equal(c.enMarcha + c.detenidas + c.sinDato, 2)
  assert.equal(c.identificacion, 50); assert.equal(c.costoOdts, null)
})
test('ODT filtra alcance y fechas y conserva estados adicionales y costos explícitos', () => {
  const c = calcularReporte({ ...base, odts: [
    { vehiculoId: 'v1', creadaEn: '2026-10-01', estado: 'cerrada', costo: 0 },
    { vehiculoId: 'v1', creadaEn: '2026-10-01', estado: 'cancelada' },
    { vehiculoId: 'v1', creadaEn: '2026-10-01', estado: 'cerrada', costo: null },
    { vehiculoId: 'otra', creadaEn: '2026-10-01', estado: 'abierta', costo: 999 },
    { vehiculoId: 'v1', creadaEn: '2026-01-01', estado: 'abierta' },
    { vehiculoId: 'v1', creadaEn: '2026-12-01', estado: 'abierta' },
  ] }, 30, 'area', ahora)
  assert.equal(c.odts.length, 3); assert.equal(c.cerradas, 2)
  assert.equal(c.conCosto, 1); assert.equal(c.costoOdts, 0)
  assert.equal(c.estados.reduce((s, x) => s + x.valor, 0), 3)
  assert.deepEqual(c.conductores.map(p => p.id), ['p1'])
})
test('CSV conserva vacíos, escapa celdas y bloquea fórmulas', () => {
  const csv = crearCsv([['=HYPERLINK("url")', 'a;b', 'a"b', null, 0, -5, ' @SUM(A1)', 'texto\nsegundo']])
  assert.ok(csv.startsWith('\ufeff'))
  assert.ok(csv.includes('"\'=HYPERLINK(""url"")"'))
  assert.ok(csv.includes('"a;b";"a""b";;0;-5;\' @SUM(A1)'))
  assert.ok(csv.endsWith('"texto\nsegundo"'))
})
