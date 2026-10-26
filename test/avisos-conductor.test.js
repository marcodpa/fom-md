import test from 'node:test'
import assert from 'node:assert/strict'
import {
  armarBuzonesConductor, claveAvisos, guardarEstadoAvisos, leerEstadoAvisos, rutaDeAviso,
} from '../src/panel/datos/avisosConductor.js'

// T-167c: la campana del conductor cuenta como la app (notiConductorService.ts).

const ahora = new Date(2026, 9, 26, 12)
const MIO = 'usr-002'
const UNIDAD = 'veh-1'

function almacen() {
  const datos = new Map()
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) }
}

const ordenes = [
  // Del sistema, sin atender (vencida): avisa.
  { id: 'p1', vehiculoId: UNIDAD, tipo: 'preventiva', creadorId: null, estado: 'abierta', prioridad: 'alta', descripcion: 'Cambio de aceite: 10.000 km', creadaEn: '2026-10-20T10:00:00Z' },
  // Del sistema, ya hecha: sale, pero leída.
  { id: 'p2', vehiculoId: UNIDAD, tipo: 'preventiva', creadorId: null, estado: 'cerrada', descripcion: 'Frenos: revisión', creadaEn: '2026-10-01T10:00:00Z' },
  // Del sistema, en curso: no avisa (vive en Mantenimiento).
  { id: 'p3', vehiculoId: UNIDAD, tipo: 'preventiva', creadorId: null, estado: 'en_ejecucion', descripcion: 'Correa', creadaEn: '2026-10-10T10:00:00Z' },
  // Suya, que el taller ya tomó: avisa.
  { id: 'c1', vehiculoId: UNIDAD, tipo: 'correctiva', creadorId: MIO, creadorNombre: 'Carlos Méndez', estado: 'en_revision', tipoFalla: 'frenos', descripcion: 'Chilla al frenar', creadaEn: '2026-10-22T10:00:00Z' },
  // Suya, recién reportada: nace leída.
  { id: 'c2', vehiculoId: UNIDAD, tipo: 'correctiva', creadorId: MIO, creadorNombre: 'Carlos Méndez', estado: 'abierta', descripcion: 'Luz rota', creadaEn: '2026-10-25T10:00:00Z' },
  // De otro conductor de la misma unidad: no es suya.
  { id: 'c3', vehiculoId: UNIDAD, tipo: 'correctiva', creadorId: 'usr-009', creadorNombre: 'Otro', estado: 'en_revision', descripcion: 'Ruido', creadaEn: '2026-10-24T10:00:00Z' },
  // De otra unidad: no le toca.
  { id: 'c4', vehiculoId: 'veh-2', tipo: 'correctiva', creadorId: MIO, estado: 'en_revision', descripcion: 'Otra unidad', creadaEn: '2026-10-24T10:00:00Z' },
]

const documentos = [
  { id: 'd1', ambito: 'persona', userId: MIO, tipo: 'Licencia de conducir', estado: 'por_vencer', venceEn: '2026-11-30' },
  { id: 'd2', ambito: 'persona', personaId: MIO, tipo: 'certificado_medico', estado: 'vigente', venceEn: '2027-11-30' },
  { id: 'd3', ambito: 'persona', userId: 'usr-009', tipo: 'Licencia de conducir', estado: 'vencido', venceEn: '2026-01-31' },
  { id: 'd4', ambito: 'vehiculo', vehiculoId: UNIDAD, tipo: 'Póliza RCV', estado: 'vencido', venceEn: '2026-09-30' },
  { id: 'd5', ambito: 'vehiculo', vehiculoId: 'veh-2', tipo: 'Póliza RCV', estado: 'vencido', venceEn: '2026-09-30' },
]

const base = { nombre: 'Carlos Méndez', personaId: MIO, vehiculoId: UNIDAD, ordenes, documentos, ahora }

test('arma los tres buzones de la app con lo suyo y de su unidad', () => {
  const { buzones } = armarBuzonesConductor(base)
  assert.deepEqual(buzones.unidad.map((n) => n.id).sort(), ['al-doc-d4', 'u-p1', 'u-p2'])
  assert.deepEqual(buzones.odt.map((n) => n.id).sort(), ['o-c1', 'o-c2'])
  assert.deepEqual(buzones.personal.map((n) => n.id), ['al-doc-d1'])
})

test('el número cuenta solo lo pendiente: vencida del sistema, su orden tomada y sus papeles', () => {
  const { noLeidas, buzones } = armarBuzonesConductor(base)
  // u-p1 + al-doc-d4 + o-c1 + al-doc-d1 (la realizada y su reporte recién hecho nacen leídos).
  assert.equal(noLeidas, 4)
  assert.equal(buzones.unidad.find((n) => n.id === 'u-p2').leida, true)
  assert.equal(buzones.odt.find((n) => n.id === 'o-c2').leida, true)
  assert.equal(buzones.unidad.find((n) => n.id === 'u-p1').titulo, 'Cambio de aceite')
})

test('lo sin leer va primero y, dentro, lo más nuevo arriba', () => {
  const { buzones } = armarBuzonesConductor(base)
  const unidad = buzones.unidad
  assert.equal(unidad.at(-1).id, 'u-p2')
  assert.ok(unidad.slice(0, -1).every((n) => !n.leida))
  const odt = buzones.odt
  assert.deepEqual(odt.map((n) => n.id), ['o-c1', 'o-c2'])
})

test('lo leído y lo descartado se guardan por usuario y bajan el número', () => {
  const a = almacen()
  guardarEstadoAvisos(MIO, ['u-p1'], { leida: true }, a)
  guardarEstadoAvisos(MIO, ['al-doc-d1'], { leida: true, descartada: true }, a)
  const estado = leerEstadoAvisos(MIO, a)
  const { noLeidas, buzones } = armarBuzonesConductor({ ...base, estado })
  assert.equal(noLeidas, 2)
  assert.equal(buzones.personal.length, 0)
  // Otro usuario en el mismo navegador no hereda lo leído.
  assert.deepEqual(leerEstadoAvisos('usr-009', a), {})
  assert.equal(claveAvisos(MIO), 'notis:usr-002')
})

test('sin unidad no hay avisos de unidad ni de órdenes; sin id no se atribuyen papeles', () => {
  const sinUnidad = armarBuzonesConductor({ ...base, vehiculoId: null })
  assert.equal(sinUnidad.buzones.unidad.length, 0)
  assert.equal(sinUnidad.buzones.odt.length, 0)
  assert.equal(sinUnidad.buzones.personal.length, 1)
  const sinId = armarBuzonesConductor({ ...base, personaId: null })
  assert.equal(sinId.buzones.personal.length, 0)
  // Sin id, su orden se reconoce por el nombre (como la app).
  assert.deepEqual(sinId.buzones.odt.map((n) => n.id).sort(), ['o-c1', 'o-c2'])
})

test('almacén roto o vacío no rompe la cuenta', () => {
  const roto = { getItem: () => '{no es json', setItem: () => { throw new Error('lleno') } }
  assert.deepEqual(leerEstadoAvisos(MIO, roto), {})
  assert.doesNotThrow(() => guardarEstadoAvisos(MIO, ['x'], { leida: true }, roto))
  assert.deepEqual(leerEstadoAvisos(MIO, null), {})
  assert.equal(armarBuzonesConductor().noLeidas, 0)
})

test('cada aviso lleva a su pantalla', () => {
  assert.equal(rutaDeAviso({ destino: { tipo: 'documento', id: 'd1' } }), '/panel/mi-perfil?vista=documentos')
  assert.equal(rutaDeAviso({ destino: { tipo: 'orden', id: 'c1' } }), '/panel/mantenimiento')
  assert.equal(rutaDeAviso({ destino: { tipo: 'accion', id: 'p1' } }), '/panel/mantenimiento')
  assert.equal(rutaDeAviso({ destino: { tipo: 'info' } }), null)
})
